import { NextResponse } from 'next/server';
import { fetchWorldCupMatch, fetchWorldCupStandings } from '@/lib/liveData';
import { clientIdentifier, rateLimit, verifyAIAccess } from '@/lib/security';

type OpenAIResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

type ModelPrediction = {
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  predictedOutcome: 'home' | 'draw' | 'away';
  confidence: number;
  predictedScore: { home: number; away: number };
  summary: string;
  factors: string[];
};

const predictionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['homeWinPct', 'drawPct', 'awayWinPct', 'predictedOutcome', 'confidence', 'predictedScore', 'summary', 'factors'],
  properties: {
    homeWinPct: { type: 'number', minimum: 0, maximum: 100 },
    drawPct: { type: 'number', minimum: 0, maximum: 100 },
    awayWinPct: { type: 'number', minimum: 0, maximum: 100 },
    predictedOutcome: { type: 'string', enum: ['home', 'draw', 'away'] },
    confidence: { type: 'number', minimum: 0, maximum: 100 },
    predictedScore: {
      type: 'object',
      additionalProperties: false,
      required: ['home', 'away'],
      properties: {
        home: { type: 'integer', minimum: 0, maximum: 12 },
        away: { type: 'integer', minimum: 0, maximum: 12 },
      },
    },
    summary: { type: 'string', minLength: 20, maxLength: 500 },
    factors: {
      type: 'array',
      minItems: 2,
      maxItems: 5,
      items: { type: 'string', minLength: 3, maxLength: 140 },
    },
  },
} as const;

export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const quota = rateLimit(`prediction:${clientIdentifier(request)}`, 5, 60_000);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: 'Too many AI requests. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(quota.retryAfter) } },
    );
  }
  const [match, standings] = await Promise.all([
    fetchWorldCupMatch(matchId),
    fetchWorldCupStandings(),
  ]);
  if (!match) {
    return NextResponse.json({ error: 'Live match not found.' }, { status: 404 });
  }
  if (/final|full time/i.test(match.status)) {
    return NextResponse.json({ error: 'Predictions are only available before full time.' }, { status: 409 });
  }

  const homeStanding = standings.find((team) => team.teamId === match.homeTeamId);
  const awayStanding = standings.find((team) => team.teamId === match.awayTeamId);
  const fallback = deterministicPrediction(match.id, match.homeTeam, match.awayTeam, homeStanding, awayStanding);
  const access = verifyAIAccess(request);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !access.allowed) {
    return NextResponse.json({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      generatedAt: new Date().toISOString(),
      model: 'live-data-forecast',
      ...fallback,
    });
  }

  const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
  const context = {
    match: {
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoff: `${match.date} ${match.kickoff}`,
      venue: match.venue,
      stage: match.group || match.round,
      status: match.status,
    },
    liveStandings: {
      home: homeStanding ?? 'No group-table row available',
      away: awayStanding ?? 'No group-table row available',
    },
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'You are a cautious football forecasting analyst. Use only the supplied live tournament data. Probabilities must sum to exactly 100. Clearly reflect uncertainty and never imply certainty.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Forecast this FIFA World Cup match from the following live data:\n${JSON.stringify(context)}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'match_prediction',
          strict: true,
          schema: predictionSchema,
        },
      },
    }),
    cache: 'no-store',
  });

  const payload = (await response.json()) as OpenAIResponse;
  if (!response.ok) {
    return NextResponse.json({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      generatedAt: new Date().toISOString(),
      model: 'live-data-forecast',
      ...fallback,
      summary: `${fallback.summary} OpenAI was unavailable, so this fallback forecast used the live table model.`,
      factors: [...fallback.factors, payload.error?.message ? `OpenAI fallback reason: ${payload.error.message.slice(0, 90)}` : 'OpenAI fallback reason: prediction service unavailable'].slice(0, 5),
    });
  }

  const outputText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === 'output_text')
    ?.text;
  if (!outputText) {
    return NextResponse.json({ error: 'The AI returned no prediction.' }, { status: 502 });
  }

  let prediction: ModelPrediction;
  try {
    prediction = JSON.parse(outputText) as ModelPrediction;
  } catch {
    return NextResponse.json({ error: 'The AI returned an invalid prediction.' }, { status: 502 });
  }

  const total = prediction.homeWinPct + prediction.drawPct + prediction.awayWinPct;
  if (!Number.isFinite(total) || total <= 0) {
    return NextResponse.json({ error: 'The AI returned invalid probabilities.' }, { status: 502 });
  }
  const normalized = {
    homeWinPct: Number(((prediction.homeWinPct / total) * 100).toFixed(1)),
    drawPct: Number(((prediction.drawPct / total) * 100).toFixed(1)),
    awayWinPct: Number(((prediction.awayWinPct / total) * 100).toFixed(1)),
  };
  normalized.awayWinPct = Number((100 - normalized.homeWinPct - normalized.drawPct).toFixed(1));

  return NextResponse.json({
    matchId: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    generatedAt: new Date().toISOString(),
    model,
    ...prediction,
    ...normalized,
  });
}

function deterministicPrediction(
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  homeStanding: Awaited<ReturnType<typeof fetchWorldCupStandings>>[number] | undefined,
  awayStanding: Awaited<ReturnType<typeof fetchWorldCupStandings>>[number] | undefined,
): ModelPrediction {
  const homeStrength = standingStrength(homeStanding) + 4;
  const awayStrength = standingStrength(awayStanding);
  const diff = Math.max(-20, Math.min(20, homeStrength - awayStrength));
  const homeWinPct = Math.round(Math.max(24, Math.min(64, 42 + diff)));
  const awayWinPct = Math.round(Math.max(18, Math.min(54, 32 - diff * 0.7)));
  const drawPct = Math.max(12, 100 - homeWinPct - awayWinPct);
  const normalizedHome = 100 - awayWinPct - drawPct;
  const predictedOutcome = normalizedHome >= awayWinPct && normalizedHome >= drawPct ? 'home' : awayWinPct >= drawPct ? 'away' : 'draw';
  const homeGoals = predictedOutcome === 'home' ? 2 : predictedOutcome === 'draw' ? 1 : 1;
  const awayGoals = predictedOutcome === 'away' ? 2 : predictedOutcome === 'draw' ? 1 : 0;

  return {
    homeWinPct: normalizedHome,
    drawPct,
    awayWinPct,
    predictedOutcome,
    confidence: Math.max(normalizedHome, drawPct, awayWinPct),
    predictedScore: { home: homeGoals, away: awayGoals },
    summary: `${homeTeam} vs ${awayTeam} forecast generated from live standings, goal difference, scoring output, and a small home-side adjustment. This is a probabilistic fan forecast, not betting advice.`,
    factors: [
      homeStanding ? `${homeTeam}: ${homeStanding.points} pts, ${homeStanding.goalDifference >= 0 ? '+' : ''}${homeStanding.goalDifference} GD` : `${homeTeam}: no table row available yet`,
      awayStanding ? `${awayTeam}: ${awayStanding.points} pts, ${awayStanding.goalDifference >= 0 ? '+' : ''}${awayStanding.goalDifference} GD` : `${awayTeam}: no table row available yet`,
      `Model key: live-data fallback ${matchId.slice(-4)}`,
    ],
  };
}

function standingStrength(standing: Awaited<ReturnType<typeof fetchWorldCupStandings>>[number] | undefined) {
  if (!standing) return 0;
  return standing.points * 3 + standing.goalDifference * 1.2 + standing.goalsFor * 0.7 - standing.goalsAgainst * 0.5;
}

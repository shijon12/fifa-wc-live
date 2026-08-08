import { NextResponse } from 'next/server';
import { generateAIMatchPrediction, PredictionServiceError, type ModelPrediction } from '@/lib/aiMatchPrediction';
import { getCurrentUser } from '@/lib/auth';
import { claimFantasyAgentUsage } from '@/lib/fantasyAgentUsage';
import { fetchWorldCupMatch, fetchWorldCupStandings } from '@/lib/liveData';
import { clientIdentifier, rateLimit } from '@/lib/security';

export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to generate an AI forecast.' }, { status: 401 });
  const { matchId } = await params;
  const quota = rateLimit(`prediction:${user.id}:${clientIdentifier(request)}`, 8, 60_000);
  if (!quota.allowed) return NextResponse.json({ error: 'Too many forecast requests. Try again shortly.' }, { status: 429, headers: { 'Retry-After': String(quota.retryAfter) } });

  const [match, standings] = await Promise.all([fetchWorldCupMatch(matchId), fetchWorldCupStandings()]);
  if (!match) return NextResponse.json({ error: 'Live match not found.' }, { status: 404 });
  if (/final|full time/i.test(match.status)) return NextResponse.json({ error: 'AI forecasts are available before kickoff.' }, { status: 409 });

  let usage;
  try {
    usage = await claimFantasyAgentUsage(user.id);
  } catch {
    return NextResponse.json({ error: 'The AI usage guard is temporarily unavailable.' }, { status: 503 });
  }
  if (!usage.allowed) return NextResponse.json({ error: `You have used today’s ${usage.limit} AI messages. The allowance resets at 00:00 UTC.`, usage }, { status: 429 });

  const homeStanding = standings.find((team) => team.teamId === match.homeTeamId);
  const awayStanding = standings.find((team) => team.teamId === match.awayTeamId);
  const fallback = deterministicPrediction(match.homeTeam, match.awayTeam, homeStanding, awayStanding);
  const context = {
    competition: 'FIFA World Cup 2026',
    match: { homeTeam: match.homeTeam, awayTeam: match.awayTeam, kickoff: `${match.date} ${match.kickoff}`, venue: match.venue, stage: match.group || match.round, status: match.status },
    standings: { home: homeStanding ?? null, away: awayStanding ?? null },
  };

  try {
    const result = await generateAIMatchPrediction(context, fallback);
    return NextResponse.json({
      matchId: match.id,
      leagueId: 'world-cup',
      league: 'FIFA World Cup 2026',
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      generatedAt: new Date().toISOString(),
      model: result.model,
      ...result.prediction,
      usage,
    });
  } catch (error) {
    if (error instanceof PredictionServiceError) return NextResponse.json({ error: error.message, usage }, { status: error.status });
    return NextResponse.json({ error: 'The AI prediction service is temporarily unavailable.', usage }, { status: 502 });
  }
}

function deterministicPrediction(
  homeTeam: string,
  awayTeam: string,
  homeStanding: Awaited<ReturnType<typeof fetchWorldCupStandings>>[number] | undefined,
  awayStanding: Awaited<ReturnType<typeof fetchWorldCupStandings>>[number] | undefined,
): ModelPrediction {
  const homeStrength = strength(homeStanding) + 4;
  const awayStrength = strength(awayStanding);
  const diff = Math.max(-20, Math.min(20, homeStrength - awayStrength));
  const homeWinPct = Math.round(Math.max(24, Math.min(64, 42 + diff)));
  const awayWinPct = Math.round(Math.max(18, Math.min(54, 32 - diff * 0.7)));
  const drawPct = Math.max(12, 100 - homeWinPct - awayWinPct);
  const normalizedHome = 100 - awayWinPct - drawPct;
  const predictedOutcome = normalizedHome >= awayWinPct && normalizedHome >= drawPct ? 'home' : awayWinPct >= drawPct ? 'away' : 'draw';
  return {
    homeWinPct: normalizedHome,
    drawPct,
    awayWinPct,
    predictedOutcome,
    confidence: Math.max(normalizedHome, drawPct, awayWinPct),
    predictedScore: predictedOutcome === 'home' ? { home: 2, away: 1 } : predictedOutcome === 'away' ? { home: 1, away: 2 } : { home: 1, away: 1 },
    summary: `${homeTeam} versus ${awayTeam} evaluated from the current table, scoring output, goal difference, and a modest home-side adjustment.`,
    factors: [
      homeStanding ? `${homeTeam}: ${homeStanding.points} points and ${homeStanding.goalDifference >= 0 ? '+' : ''}${homeStanding.goalDifference} goal difference` : `${homeTeam}: no table row published`,
      awayStanding ? `${awayTeam}: ${awayStanding.points} points and ${awayStanding.goalDifference >= 0 ? '+' : ''}${awayStanding.goalDifference} goal difference` : `${awayTeam}: no table row published`,
    ],
  };
}

function strength(standing: Awaited<ReturnType<typeof fetchWorldCupStandings>>[number] | undefined) {
  if (!standing) return 0;
  return standing.points * 3 + standing.goalDifference * 1.2 + standing.goalsFor * 0.7 - standing.goalsAgainst * 0.5;
}

import { NextResponse } from 'next/server';
import { fetchComparisonTeams } from '@/lib/teamComparison';
import { clientIdentifier, rateLimit, verifyAIAccess } from '@/lib/security';

type OpenAIResponse = {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  error?: { message?: string };
};

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['teamAWinPct', 'drawPct', 'teamBWinPct', 'favoredTeamId', 'summary', 'edges'],
  properties: {
    teamAWinPct: { type: 'number', minimum: 0, maximum: 100 },
    drawPct: { type: 'number', minimum: 0, maximum: 100 },
    teamBWinPct: { type: 'number', minimum: 0, maximum: 100 },
    favoredTeamId: { type: 'string' },
    summary: { type: 'string', minLength: 20, maxLength: 600 },
    edges: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string', minLength: 3, maxLength: 160 } },
  },
} as const;

export async function POST(request: Request) {
  const access = verifyAIAccess(request);
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: process.env.AI_ACCESS_CODE ? 401 : 503 });
  const quota = rateLimit(`comparison:${clientIdentifier(request)}`, 5, 60_000);
  if (!quota.allowed) return NextResponse.json({ error: 'Too many AI requests. Try again shortly.' }, { status: 429, headers: { 'Retry-After': String(quota.retryAfter) } });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'AI comparison requires OPENAI_API_KEY.' }, { status: 503 });
  let input: { teamAId?: string; teamBId?: string };
  try { input = (await request.json()) as typeof input; } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (!input.teamAId || !input.teamBId || input.teamAId === input.teamBId) return NextResponse.json({ error: 'Choose two different teams.' }, { status: 400 });

  const teams = await fetchComparisonTeams();
  const teamA = teams.find((team) => team.id === input.teamAId);
  const teamB = teams.find((team) => team.id === input.teamBId);
  if (!teamA || !teamB) return NextResponse.json({ error: 'Live team data not found.' }, { status: 404 });
  const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: 'You are a cautious football analyst. Compare only the supplied live statistics. Probabilities must total exactly 100. Do not imply certainty or provide betting advice.' }] },
        { role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ teamA, teamB }) }] },
      ],
      text: { format: { type: 'json_schema', name: 'team_comparison', strict: true, schema } },
    }),
    cache: 'no-store',
  });
  const payload = (await response.json()) as OpenAIResponse;
  if (!response.ok) return NextResponse.json({ error: payload.error?.message || 'OpenAI comparison failed.' }, { status: response.status === 429 ? 429 : 502 });
  const text = payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text;
  if (!text) return NextResponse.json({ error: 'OpenAI returned no comparison.' }, { status: 502 });
  try {
    const result = JSON.parse(text) as { teamAWinPct: number; drawPct: number; teamBWinPct: number; favoredTeamId: string; summary: string; edges: string[] };
    const total = result.teamAWinPct + result.drawPct + result.teamBWinPct;
    const teamAWinPct = Number((result.teamAWinPct / total * 100).toFixed(1));
    const drawPct = Number((result.drawPct / total * 100).toFixed(1));
    return NextResponse.json({ ...result, teamAWinPct, drawPct, teamBWinPct: Number((100 - teamAWinPct - drawPct).toFixed(1)), model });
  } catch {
    return NextResponse.json({ error: 'OpenAI returned invalid comparison data.' }, { status: 502 });
  }
}

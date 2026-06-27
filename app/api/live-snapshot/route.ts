import { NextResponse } from 'next/server';
import { fetchWorldCupMatches } from '@/lib/liveData';
import { clientIdentifier, rateLimit } from '@/lib/security';

export async function GET(request: Request) {
  const quota = rateLimit(`snapshot:${clientIdentifier(request)}`, 10, 60_000);
  if (!quota.allowed) return NextResponse.json({ error: 'Too many snapshot requests.' }, { status: 429, headers: { 'Retry-After': String(quota.retryAfter) } });
  const matches = await fetchWorldCupMatches();
  return NextResponse.json(matches.map((match) => ({
    id: match.id,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
  })));
}

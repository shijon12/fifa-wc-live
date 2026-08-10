import { NextResponse } from 'next/server';
import { type FantasyPick } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';
import { listFantasyProfilesForLeaderboard, listPrivateLeagueMemberIds } from '@/lib/fantasyStore';
import { fetchAllFantasyMatches, scoreFantasyPick } from '@/lib/fantasyScoring';
import { fetchFantasyPlayerPool, squadPoints } from '@/lib/fantasySquad';
import { fantasySeasonTotals } from '@/lib/fantasyGameEngine';

export const runtime = 'nodejs';

async function leaderboardRows() {
  const [profiles, matches, players, seasonTotals] = await Promise.all([listFantasyProfilesForLeaderboard(), fetchAllFantasyMatches(), fetchFantasyPlayerPool(), fantasySeasonTotals()]);
  return profiles.map((profile) => {
    const picks = profile.fantasy.picks ?? {};
    const score = matches.reduce((total, match) => total + scoreFantasyPick(match, picks[match.id] as FantasyPick | undefined), 0);
    const historicScore = seasonTotals.get(profile.id);
    const squadScore = historicScore ?? (profile.fantasy.squad ? squadPoints(players, profile.fantasy.squad) : 0);
    return { userId: profile.id, managerName: profile.fantasy.managerName || profile.displayName, score, squadScore, totalScore: score + squadScore, picks: Object.keys(picks).length, squadPlayers: profile.fantasy.squad?.playerIds.length ?? 0, updatedAt: profile.fantasy.updatedAt ?? null };
  }).filter((row) => row.picks > 0 || row.squadPlayers > 0);
}

export async function GET(request: Request) {
  const leagueId = new URL(request.url).searchParams.get('leagueId');
  // Profiles, room membership, and gameweek totals must be read on every
  // request. Caching the assembled rows made newly saved squads invisible in
  // private rooms until a later request triggered stale-while-revalidation.
  // The upstream match and player providers retain their own short caches.
  const allRows = await leaderboardRows();
  let allowedUserIds: Set<string> | null = null;
  if (leagueId) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    try {
      allowedUserIds = new Set(await listPrivateLeagueMemberIds(user, leagueId));
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to read private league.' }, { status: 403 });
    }
  }

  const rows = allRows.filter((row) => !allowedUserIds || allowedUserIds.has(row.userId));

  const fantasyLeaderboard = rows.filter((row) => row.squadPlayers > 0).sort((a, b) => b.squadScore - a.squadScore || a.managerName.localeCompare(b.managerName)).slice(0, 50).map((row) => ({ ...row, totalScore: row.squadScore }));
  const predictionLeaderboard = rows.filter((row) => row.picks > 0).sort((a, b) => b.score - a.score || a.managerName.localeCompare(b.managerName)).slice(0, 50).map((row) => ({ ...row, totalScore: row.score }));

  return NextResponse.json(
    { leaderboard: fantasyLeaderboard, fantasyLeaderboard, predictionLeaderboard, scopedToLeague: Boolean(leagueId) },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}

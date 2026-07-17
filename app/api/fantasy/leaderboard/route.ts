import { NextResponse } from 'next/server';
import { type FantasyPick } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';
import { listFantasyProfilesForLeaderboard, listPrivateLeagueMemberIds } from '@/lib/fantasyStore';
import { fetchAllFantasyMatches, scoreFantasyPick } from '@/lib/fantasyScoring';
import { fetchFantasyPlayerPool, squadPoints } from '@/lib/fantasySquad';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const leagueId = new URL(request.url).searchParams.get('leagueId');
  const [profiles, matches, players] = await Promise.all([listFantasyProfilesForLeaderboard(), fetchAllFantasyMatches(), fetchFantasyPlayerPool()]);
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

  const rows = profiles
    .filter((profile) => !allowedUserIds || allowedUserIds.has(profile.id))
    .map((profile) => {
      const picks = profile.fantasy.picks ?? {};
      const score = matches.reduce((total, match) => total + scoreFantasyPick(match, picks[match.id] as FantasyPick | undefined), 0);
      const squadScore = profile.fantasy.squad ? squadPoints(players, profile.fantasy.squad) : 0;
      return {
        userId: profile.id,
        managerName: profile.fantasy.managerName || profile.displayName,
        score,
        squadScore,
        totalScore: score + squadScore,
        picks: Object.keys(picks).length,
        squadPlayers: profile.fantasy.squad?.playerIds.length ?? 0,
        updatedAt: profile.fantasy.updatedAt ?? null,
      };
    })
    .filter((row) => row.picks > 0 || row.squadPlayers > 0)
    .sort((a, b) => b.totalScore - a.totalScore || b.squadScore - a.squadScore || b.score - a.score || a.managerName.localeCompare(b.managerName))
    .slice(0, 50);

  return NextResponse.json({ leaderboard: rows, scopedToLeague: Boolean(leagueId) });
}

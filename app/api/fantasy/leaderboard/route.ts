import { NextResponse } from 'next/server';
import { type FantasyPick } from '@/lib/auth';
import { listFantasyProfilesForLeaderboard } from '@/lib/fantasyStore';
import { fetchAllFantasyMatches, scoreFantasyPick } from '@/lib/fantasyScoring';
import { fetchFantasyPlayerPool, squadPoints } from '@/lib/fantasySquad';

export const runtime = 'nodejs';

export async function GET() {
  const [profiles, matches, players] = await Promise.all([listFantasyProfilesForLeaderboard(), fetchAllFantasyMatches(), fetchFantasyPlayerPool()]);
  const rows = profiles
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

  return NextResponse.json({ leaderboard: rows });
}

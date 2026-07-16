import { NextResponse } from 'next/server';
import { listFantasyProfiles, type FantasyPick } from '@/lib/auth';
import { fetchAllFantasyMatches, scoreFantasyPick } from '@/lib/fantasyScoring';

export const runtime = 'nodejs';

export async function GET() {
  const [profiles, matches] = await Promise.all([listFantasyProfiles(), fetchAllFantasyMatches()]);
  const rows = profiles
    .map((profile) => {
      const picks = profile.fantasy.picks ?? {};
      const score = matches.reduce((total, match) => total + scoreFantasyPick(match, picks[match.id] as FantasyPick | undefined), 0);
      return {
        userId: profile.id,
        managerName: profile.fantasy.managerName || profile.displayName,
        score,
        picks: Object.keys(picks).length,
        updatedAt: profile.fantasy.updatedAt ?? null,
      };
    })
    .filter((row) => row.picks > 0)
    .sort((a, b) => b.score - a.score || b.picks - a.picks || a.managerName.localeCompare(b.managerName))
    .slice(0, 50);

  return NextResponse.json({ leaderboard: rows });
}

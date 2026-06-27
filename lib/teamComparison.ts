import { fetchWorldCupMatches, fetchWorldCupStandings } from '@/lib/liveData';

export type ComparisonTeam = {
  id: string;
  name: string;
  logo: string | null;
  group: string;
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: Array<'W' | 'D' | 'L'>;
};

export async function fetchComparisonTeams(): Promise<ComparisonTeam[]> {
  const [standings, matches] = await Promise.all([fetchWorldCupStandings(), fetchWorldCupMatches()]);
  return standings.map((team) => {
    const completed = matches
      .filter((match) =>
        /final|full time/i.test(match.status) &&
        (match.homeTeamId === team.teamId || match.awayTeamId === team.teamId) &&
        match.homeScore !== null &&
        match.awayScore !== null,
      )
      .slice(-5);
    const form = completed.map((match) => {
      const isHome = match.homeTeamId === team.teamId;
      const own = isHome ? match.homeScore! : match.awayScore!;
      const opponent = isHome ? match.awayScore! : match.homeScore!;
      return own > opponent ? 'W' : own < opponent ? 'L' : 'D';
    }) as Array<'W' | 'D' | 'L'>;
    return {
      id: team.teamId,
      name: team.team,
      logo: team.badge,
      group: team.group,
      rank: team.rank,
      played: team.played,
      won: team.won,
      drawn: team.drawn,
      lost: team.lost,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst,
      goalDifference: team.goalDifference,
      points: team.points,
      form,
    };
  });
}

import Link from 'next/link';
import { FavoritesDashboard } from '@/components/FavoritesDashboard';
import { SiteNav } from '@/components/SiteNav';
import { fetchWorldCupStandings } from '@/lib/liveData';
import { fetchLeagueStandings, supportedLeagues } from '@/lib/leagueData';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const alertLeagues = supportedLeagues.filter((league) =>
    ['champions-league', 'premier-league', 'laliga', 'serie-a', 'bundesliga', 'ligue-1', 'mls'].includes(league.id),
  );
  const [standings, clubTables] = await Promise.all([
    fetchWorldCupStandings(),
    Promise.all(alertLeagues.map(async (league) => ({ league, standings: await fetchLeagueStandings(league) }))),
  ]);
  const worldCupTeams = standings.map((team) => ({
    id: team.teamId,
    name: team.team,
    logo: team.badge,
    competition: 'FIFA World Cup',
    href: `/teams/${team.teamId}`,
  }));
  const clubTeams = clubTables.flatMap(({ league, standings: table }) =>
    table.map((team) => ({
      id: team.teamId,
      name: team.team,
      logo: team.badge,
      competition: league.shortLabel,
      href: null,
    })),
  );
  const teams = Array.from(new Map([...worldCupTeams, ...clubTeams].map((team) => [`${team.id}:${team.competition}`, team])).values());

  return (
    <main className="min-h-screen bg-[#07120d] text-stone-100">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10">
        <SiteNav />
        <Link href="/" className="mt-8 inline-flex text-sm font-semibold text-emerald-300">← Dashboard</Link>
        <header className="mt-5 rounded-[2rem] border border-amber-300/20 bg-[radial-gradient(circle_at_85%_10%,rgba(245,185,66,0.16),transparent_35%),#0b1b13] p-8 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Your football alerts</p>
          <h1 className="mt-3 break-words text-4xl font-black tracking-[-0.04em] text-white sm:text-7xl">Favorites & alerts</h1>
          <p className="mt-4 max-w-2xl text-stone-400">Follow World Cup teams and major club teams on this device and receive kickoff, goal, and full-time browser notifications.</p>
        </header>
        <FavoritesDashboard teams={teams} />
      </div>
    </main>
  );
}

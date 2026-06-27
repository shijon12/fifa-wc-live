import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteNav } from '@/components/SiteNav';
import { fetchWorldCupMatches, fetchWorldCupStandings } from '@/lib/liveData';

export const dynamic = 'force-dynamic';

export default async function GroupPage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  const groupCode = group.toUpperCase();
  const [allStandings, allMatches] = await Promise.all([
    fetchWorldCupStandings(),
    fetchWorldCupMatches(),
  ]);
  const standings = allStandings.filter((row) => row.group === groupCode);
  const matches = allMatches.filter((match) => match.group === `Group ${groupCode}`);

  if (!standings.length) notFound();

  return (
    <main className="min-h-screen bg-[#07120d] text-stone-100">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10">
        <SiteNav />
        <Link href="/#groups" className="mt-8 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200">
          ← All live standings
        </Link>

        <header className="mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_85%_20%,rgba(52,211,153,0.16),transparent_30%),#0b1b13] p-8 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">Live standings</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-white sm:text-7xl">Group {groupCode}</h1>
          <p className="mt-4 text-stone-400">Scores and table data refresh automatically every 15 seconds.</p>
        </header>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-6 py-4 text-left">Team</th>
                  <th className="px-3 py-4">P</th>
                  <th className="px-3 py-4">W</th>
                  <th className="px-3 py-4">D</th>
                  <th className="px-3 py-4">L</th>
                  <th className="px-3 py-4">GF</th>
                  <th className="px-3 py-4">GA</th>
                  <th className="px-3 py-4">GD</th>
                  <th className="px-6 py-4 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team) => (
                  <tr key={team.teamId} className="border-b border-white/[0.06] last:border-0">
                    <td className="px-6 py-5">
                      <Link href={`/teams/${team.teamId}`} className="flex items-center gap-3 font-bold text-white hover:text-emerald-300">
                        <span className="w-4 text-sm text-stone-500">{team.rank}</span>
                        <TeamBadge name={team.team} badge={team.badge} />
                        <span>{team.team}</span>
                        {team.qualification && <span className="ml-2 hidden rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] uppercase text-emerald-300 sm:inline">{team.qualification}</span>}
                      </Link>
                    </td>
                    <Cell>{team.played}</Cell>
                    <Cell>{team.won}</Cell>
                    <Cell>{team.drawn}</Cell>
                    <Cell>{team.lost}</Cell>
                    <Cell>{team.goalsFor}</Cell>
                    <Cell>{team.goalsAgainst}</Cell>
                    <Cell>{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</Cell>
                    <td className="px-6 py-5 text-right text-xl font-black text-white">{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-white">Group fixtures</h2>
          {matches.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {matches.map((match) => (
                <Link key={match.id} href={`/matches/${match.id}`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-emerald-400/30">
                  <div className="flex justify-between text-xs uppercase tracking-wider text-stone-500">
                    <span>{match.date}</span><span>{match.status}</span>
                  </div>
                  <p className="mt-4 text-lg font-bold text-white">{match.homeTeam} <span className="text-stone-500">{match.homeScore ?? '–'} : {match.awayScore ?? '–'}</span> {match.awayTeam}</p>
                  <p className="mt-2 text-sm text-stone-500">{match.venue}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-stone-400">No group fixtures are present in the provider’s current live window.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-5 text-center text-stone-300">{children}</td>;
}

function TeamBadge({ name, badge }: { name: string; badge: string | null }) {
  return badge ? (
    <span role="img" aria-label={`${name} badge`} className="h-9 w-9 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${badge}")` }} />
  ) : <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10">⚽</span>;
}

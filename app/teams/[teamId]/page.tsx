import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteNav } from '@/components/SiteNav';
import { FavoriteButton } from '@/components/FavoriteButton';
import { DataTimestamp } from '@/components/DataTimestamp';
import { fetchWorldCupMatches, fetchWorldCupStandings, fetchWorldCupTeam } from '@/lib/liveData';

export const dynamic = 'force-dynamic';

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const [team, standings, matches] = await Promise.all([
    fetchWorldCupTeam(teamId),
    fetchWorldCupStandings(),
    fetchWorldCupMatches(),
  ]);
  if (!team) notFound();

  const standing = standings.find((row) => row.teamId === team.id);
  const teamMatches = matches.filter((match) => match.homeTeamId === team.id || match.awayTeamId === team.id);

  return (
    <main className="min-h-screen bg-[#07120d] text-stone-100">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10">
        <SiteNav />
        <Link href="/#groups" className="mt-8 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200">← Live standings</Link>

        <header className="relative mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1b13] p-8 sm:p-12">
          {team.fanart && <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: `linear-gradient(90deg,#0b1b13 25%,transparent),url("${team.fanart}")` }} />}
          <div className="relative flex flex-wrap items-end justify-between gap-8">
            <div className="flex items-center gap-5">
              <TeamBadge name={team.name} badge={team.badge} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">{team.shortName} · Live team profile</p>
                <h1 className="mt-2 break-words text-4xl font-black tracking-[-0.04em] text-white sm:text-7xl">{team.name}</h1>
                <p className="mt-3 text-stone-300">{team.nickname || team.country}</p>
              </div>
            </div>
            {standing && (
              <Link href={`/groups/${standing.group.toLowerCase()}`} className="rounded-2xl border border-white/10 bg-black/25 px-6 py-4 backdrop-blur">
                <p className="text-xs uppercase tracking-widest text-stone-500">Group {standing.group}</p>
                <p className="mt-1 text-2xl font-black text-white">{standing.points} pts <span className="text-base font-normal text-stone-500">· #{standing.rank}</span></p>
              </Link>
            )}
            <FavoriteButton team={{ id: team.id, name: team.name, logo: team.badge }} />
          </div>
        </header>
        <div className="mt-4"><DataTimestamp updatedAt={new Date()} label="Team profile and results" /></div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Founded" value={team.formedYear || '—'} />
          <Fact label="Home stadium" value={team.stadium || '—'} />
          <Fact label="Location" value={team.location || team.country} />
          <Fact label="Capacity" value={team.stadiumCapacity?.toLocaleString() || '—'} />
        </section>

        {standing && (
          <section className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
            <Stat label="Played" value={standing.played} />
            <Stat label="Won" value={standing.won} />
            <Stat label="Drawn" value={standing.drawn} />
            <Stat label="Lost" value={standing.lost} />
            <Stat label="Goal diff" value={standing.goalDifference} />
            <Stat label="Points" value={standing.points} accent />
          </section>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400">About</p>
            <h2 className="mt-2 text-3xl font-bold text-white">{team.name} profile</h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-stone-400 sm:text-base">
              {team.description || 'The live provider has not supplied a team description.'}
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white">Tournament matches</h2>
            <div className="mt-4 space-y-3">
              {teamMatches.length ? teamMatches.map((match) => (
                <Link key={match.id} href={`/matches/${match.id}`} className="block rounded-2xl border border-white/10 bg-white/[0.035] p-4 hover:border-emerald-400/30">
                  <div className="flex justify-between text-xs text-stone-500"><span>{match.date}</span><span>{match.status}</span></div>
                  <p className="mt-2 font-bold text-white">{match.homeTeam} {match.homeScore ?? '–'} : {match.awayScore ?? '–'} {match.awayTeam}</p>
                </Link>
              )) : <p className="rounded-2xl border border-white/10 p-4 text-sm text-stone-500">No matches are present in the provider’s current live window.</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function TeamBadge({ name, badge }: { name: string; badge: string | null }) {
  return badge ? <span role="img" aria-label={`${name} badge`} className="h-20 w-20 shrink-0 bg-contain bg-center bg-no-repeat sm:h-28 sm:w-28" style={{ backgroundImage: `url("${badge}")` }} /> : <span className="text-6xl">⚽</span>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><p className="text-xs uppercase tracking-wider text-stone-500">{label}</p><p className="mt-2 font-bold text-white">{value}</p></div>;
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 text-center ${accent ? 'border-emerald-400/25 bg-emerald-400/10' : 'border-white/10 bg-white/[0.035]'}`}><p className={`text-2xl font-black ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-stone-500">{label}</p></div>;
}

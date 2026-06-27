import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteNav } from '@/components/SiteNav';
import { PlayerImage } from '@/components/PlayerImage';
import { fetchPlayerMatchLog, fetchWorldCupPlayer } from '@/lib/liveData';

export const dynamic = 'force-dynamic';

export default async function PlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const player = await fetchWorldCupPlayer(playerId);
  if (!player) notFound();
  const matchLog = await fetchPlayerMatchLog(player.id, player.teamId);

  return (
    <main className="min-h-screen bg-[#07120d] text-stone-100">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10">
        <SiteNav />
        <Link href="/statistics" className="mt-8 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200">← Tournament statistics</Link>

        <header className="relative mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_80%_15%,rgba(52,211,153,0.16),transparent_32%),#0b1b13] p-8 sm:p-12">
          <div className="relative grid gap-8 md:grid-cols-[220px_1fr] md:items-end">
            <div className="relative h-64 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
              <PlayerImage name={player.name} src={player.headshot} className="absolute inset-0" fallbackClassName="text-7xl" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">{player.position} · #{player.jersey ?? '—'}</p>
              <h1 className="mt-3 break-words text-4xl font-black tracking-[-0.04em] text-white sm:text-7xl">{player.name}</h1>
              <Link href={`/teams/${player.teamId}`} className="mt-4 inline-flex items-center gap-3 text-lg font-bold text-stone-300 hover:text-emerald-300">
                {player.teamLogo && <span className="h-8 w-8 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${player.teamLogo}")` }} />}
                {player.team}
              </Link>
              <div className="mt-6 flex flex-wrap gap-2 text-xs text-stone-400">
                {[player.citizenship, player.age ? `Age ${player.age}` : null, player.height, player.weight].filter(Boolean).map((value) => <span key={value} className="rounded-full border border-white/10 px-3 py-1.5">{value}</span>)}
              </div>
            </div>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
          <Stat label="Apps" value={player.appearances} />
          <Stat label="Goals" value={player.goals} accent />
          <Stat label="Assists" value={player.assists} />
          <Stat label="Shots" value={player.shots} />
          <Stat label="Yellow" value={player.yellowCards} />
          <Stat label="Red" value={player.redCards} />
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400">Biography</p>
          <h2 className="mt-2 text-2xl font-bold text-white">About {player.shortName}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-400">
            {player.name} is a {player.position.toLowerCase()} representing {player.team} at the 2026 FIFA World Cup.
            {player.citizenship ? ` The ${player.citizenship} international` : ' The international'} has made {player.appearances} tournament appearance{player.appearances === 1 ? '' : 's'}, recording {player.goals} goal{player.goals === 1 ? '' : 's'} and {player.assists} assist{player.assists === 1 ? '' : 's'} so far.
          </p>
          {player.profileUrl && <a href={player.profileUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200">View source profile →</a>}
        </section>

        <section className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Tournament log</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Match performances</h2>
          <div className="mt-5 space-y-3">
            {matchLog.length ? matchLog.map(({ match, starter, position, stats }) => (
              <Link key={match.id} href={`/matches/${match.id}`} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-emerald-400/30 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-xs uppercase tracking-wider text-stone-500">{match.date} · {starter ? 'Starter' : 'Substitute'} · {position}</p>
                  <h3 className="mt-2 font-bold text-white">{match.homeTeam} {match.homeScore ?? '–'} : {match.awayScore ?? '–'} {match.awayTeam}</h3>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-stone-400">
                  <MatchStat label="Goals" value={stats.totalGoals} />
                  <MatchStat label="Assists" value={stats.goalAssists} />
                  <MatchStat label="Shots" value={stats.totalShots} />
                  <MatchStat label="Cards" value={(stats.yellowCards ?? 0) + (stats.redCards ?? 0)} />
                </div>
              </Link>
            )) : <p className="rounded-2xl border border-white/10 p-5 text-stone-500">No published match appearances yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 text-center ${accent ? 'border-emerald-400/20 bg-emerald-400/10' : 'border-white/10 bg-white/[0.035]'}`}><p className={`text-2xl font-black ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-stone-500">{label}</p></div>;
}

function MatchStat({ label, value = 0 }: { label: string; value?: number }) {
  return <span className="rounded-lg bg-black/20 px-3 py-2"><b className="text-white">{value}</b> {label}</span>;
}

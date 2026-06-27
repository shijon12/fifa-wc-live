import Link from 'next/link';
import { SiteNav } from '@/components/SiteNav';
import { PlayerImage } from '@/components/PlayerImage';
import {
  fetchWorldCupMatches,
  fetchWorldCupPlayerStats,
  type PlayerTournamentStat,
} from '@/lib/liveData';

export const dynamic = 'force-dynamic';

export default async function StatisticsPage() {
  const [players, matches] = await Promise.all([
    fetchWorldCupPlayerStats(),
    fetchWorldCupMatches(),
  ]);
  const completedMatches = matches.filter((match) => /final|full time/i.test(match.status));
  const goals = completedMatches.reduce(
    (total, match) => total + (match.homeScore ?? 0) + (match.awayScore ?? 0),
    0,
  );
  const representedTeams = new Set(players.map((player) => player.teamId)).size;
  const leaders = {
    goals: rank(players, 'goals'),
    assists: rank(players, 'assists'),
    shotsOnTarget: rank(players, 'shotsOnTarget'),
    saves: rank(players, 'saves'),
    yellowCards: rank(players, 'yellowCards'),
  };

  return (
    <main className="min-h-screen bg-[#07120d] text-stone-100">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-10">
        <SiteNav />
        <Link href="/" className="mt-8 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200">← Dashboard</Link>

        <header className="relative mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_85%_10%,rgba(245,185,66,0.17),transparent_34%),#0b1b13] p-8 sm:p-12">
          <div className="relative max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Live player statistics</p>
            <h1 className="mt-3 break-words text-4xl font-black tracking-[-0.04em] text-white sm:text-7xl">Tournament leaders</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-400">
              Goals, assists, shooting, goalkeeping, and discipline—all aggregated from the current World Cup squad feeds.
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric value={completedMatches.length} label="Matches completed" />
          <Metric value={goals} label="Goals scored" accent />
          <Metric value={players.length} label="Players used" />
          <Metric value={representedTeams} label="Teams represented" />
        </section>

        {players.length ? (
          <div className="mt-12 space-y-14">
            <LeaderSection title="Golden Boot race" eyebrow="Top scorers" players={leaders.goals} stat="goals" statLabel="Goals" accent="emerald" />
            <LeaderSection title="Chance creators" eyebrow="Top assists" players={leaders.assists} stat="assists" statLabel="Assists" accent="violet" />
            <div className="grid gap-10 xl:grid-cols-2">
              <CompactLeaders title="Shots on target" players={leaders.shotsOnTarget} stat="shotsOnTarget" />
              <CompactLeaders title="Goalkeeper saves" players={leaders.saves} stat="saves" />
            </div>
            <CompactLeaders title="Yellow cards" players={leaders.yellowCards} stat="yellowCards" />
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-amber-400/20 bg-amber-400/5 p-8 text-amber-100">
            Live player statistics are temporarily unavailable from the provider.
          </div>
        )}
      </div>
    </main>
  );
}

type NumericPlayerStat = 'goals' | 'assists' | 'shotsOnTarget' | 'saves' | 'yellowCards';

function rank(players: PlayerTournamentStat[], stat: NumericPlayerStat) {
  return [...players]
    .filter((player) => player[stat] > 0)
    .sort((a, b) => b[stat] - a[stat] || b.goals - a.goals || b.assists - a.assists || a.appearances - b.appearances)
    .slice(0, 10);
}

function LeaderSection({
  title,
  eyebrow,
  players,
  stat,
  statLabel,
  accent,
}: {
  title: string;
  eyebrow: string;
  players: PlayerTournamentStat[];
  stat: NumericPlayerStat;
  statLabel: string;
  accent: 'emerald' | 'violet';
}) {
  return (
    <section>
      <div className="mb-6">
        <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${accent === 'emerald' ? 'text-emerald-400' : 'text-violet-300'}`}>{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
      </div>
      {players.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {players.slice(0, 5).map((player, index) => (
            <PlayerCard key={player.id} player={player} rank={index + 1} value={player[stat]} label={statLabel} accent={accent} />
          ))}
        </div>
      ) : <EmptyStat />}
    </section>
  );
}

function PlayerCard({ player, rank, value, label, accent }: { player: PlayerTournamentStat; rank: number; value: number; label: string; accent: 'emerald' | 'violet' }) {
  const content = (
    <div className={`group relative overflow-hidden rounded-3xl border bg-white/[0.035] transition hover:-translate-y-1 ${accent === 'emerald' ? 'border-emerald-400/15 hover:border-emerald-400/40' : 'border-violet-400/15 hover:border-violet-400/40'}`}>
      <div className="relative h-52 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.12),transparent_45%),#0b1b13]">
        <PlayerImage name={player.name} src={player.headshot} className="absolute inset-x-0 bottom-0 mx-auto h-[95%] w-[90%] transition group-hover:scale-105" fallbackClassName="text-7xl" />
        <span className="absolute left-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-sm font-black text-white backdrop-blur">#{rank}</span>
        <span className={`absolute bottom-3 right-3 rounded-2xl px-3 py-2 text-center ${accent === 'emerald' ? 'bg-emerald-400 text-[#07120d]' : 'bg-violet-400 text-[#120d1d]'}`}>
          <span className="block text-2xl font-black leading-none">{value}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
        </span>
      </div>
      <div className="p-4">
        <h3 className="truncate font-bold text-white">{player.name}</h3>
        <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
          {player.teamLogo && <span className="h-5 w-5 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${player.teamLogo}")` }} />}
          <span className="truncate">{player.team}</span>
          <span>·</span>
          <span>{player.appearances} apps</span>
        </div>
      </div>
    </div>
  );
  return <Link href={`/players/${player.id}`}>{content}</Link>;
}

function CompactLeaders({ title, players, stat }: { title: string; players: PlayerTournamentStat[]; stat: NumericPlayerStat }) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold text-white">{title}</h2>
      {players.length ? (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
          {players.slice(0, 8).map((player, index) => (
            <div key={player.id} className="flex items-center gap-4 border-b border-white/[0.06] px-4 py-3 last:border-0">
              <span className="w-5 text-center text-sm font-black text-stone-600">{index + 1}</span>
              <PlayerAvatar player={player} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{player.name}</p>
                <p className="truncate text-xs text-stone-500">{player.team} · {player.position}</p>
              </div>
              <span className="text-2xl font-black tabular-nums text-white">{player[stat]}</span>
            </div>
          ))}
        </div>
      ) : <EmptyStat />}
    </section>
  );
}

function PlayerAvatar({ player }: { player: PlayerTournamentStat }) {
  return <PlayerImage name={player.name} src={player.headshot} className="h-12 w-12 shrink-0 rounded-full bg-white/10" fallbackClassName="text-sm" />;
}

function Metric({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-5 ${accent ? 'border-amber-300/20 bg-amber-300/10' : 'border-white/10 bg-white/[0.035]'}`}><p className={`text-3xl font-black ${accent ? 'text-amber-300' : 'text-white'}`}>{value}</p><p className="mt-1 text-xs uppercase tracking-wider text-stone-500">{label}</p></div>;
}

function EmptyStat() {
  return <p className="rounded-2xl border border-white/10 p-5 text-sm text-stone-500">No live entries reported yet.</p>;
}

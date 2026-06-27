import Link from 'next/link';
import type { LiveMatchDetails, MatchTimelineEvent } from '@/lib/liveData';

const statRows = [
  ['possessionPct', 'Possession', true],
  ['totalShots', 'Shots', false],
  ['shotsOnTarget', 'On target', false],
  ['wonCorners', 'Corners', false],
  ['foulsCommitted', 'Fouls', false],
  ['yellowCards', 'Yellow cards', false],
  ['redCards', 'Red cards', false],
] as const;

export function MatchLiveCenter({ details }: { details: LiveMatchDetails }) {
  const [home, away] = details.teamStatistics;
  const keyEvents = details.events.filter((event) =>
    ['goal', 'yellow-card', 'red-card', 'substitution', 'penalty---scored', 'penalty---missed'].includes(event.type),
  );

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400">Match statistics</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Team comparison</h2>
        {home && away ? (
          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between font-bold text-white">
              <span>{home.team}</span><span>{away.team}</span>
            </div>
            {statRows.map(([key, label, percent]) => (
              <StatBar key={key} label={label} home={home.values[key]} away={away.values[key]} percent={percent} />
            ))}
          </div>
        ) : <Empty message="Match statistics will appear when the provider publishes them." />}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Key events</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Match timeline</h2>
        {keyEvents.length ? (
          <div className="mt-6 space-y-1">
            {keyEvents.map((event) => <TimelineEvent key={event.id} event={event} />)}
          </div>
        ) : <Empty message="Goals, cards, and substitutions will appear here live." />}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7 xl:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Live text</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Commentary</h2>
        {details.commentary.length ? (
          <div className="mt-6 max-h-[520px] space-y-1 overflow-y-auto pr-2">
            {details.commentary.slice().reverse().slice(0, 40).map((entry) => (
              <div key={`${entry.sequence}-${entry.text}`} className="grid grid-cols-[48px_1fr] gap-3 rounded-xl px-3 py-3 odd:bg-white/[0.025]">
                <span className="font-black text-emerald-300">{entry.minute || '—'}</span>
                <p className="text-sm leading-6 text-stone-300">{entry.text}</p>
              </div>
            ))}
          </div>
        ) : <Empty message="Live commentary has not started for this match." />}
      </section>
    </div>
  );
}

function StatBar({ label, home, away, percent }: { label: string; home?: string; away?: string; percent: boolean }) {
  const homeValue = Number(home ?? 0);
  const awayValue = Number(away ?? 0);
  const total = percent ? 100 : Math.max(homeValue + awayValue, 1);
  return (
    <div>
      <div className="mb-2 grid grid-cols-[48px_1fr_48px] items-center text-sm">
        <span className="font-bold text-white">{home ?? '—'}{percent && home ? '%' : ''}</span>
        <span className="text-center text-xs uppercase tracking-wider text-stone-500">{label}</span>
        <span className="text-right font-bold text-white">{away ?? '—'}{percent && away ? '%' : ''}</span>
      </div>
      <div className="flex h-1.5 gap-1 overflow-hidden rounded-full">
        <span className="bg-emerald-400" style={{ width: `${(homeValue / total) * 100}%` }} />
        <span className="bg-violet-400" style={{ width: `${(awayValue / total) * 100}%` }} />
      </div>
    </div>
  );
}

function TimelineEvent({ event }: { event: MatchTimelineEvent }) {
  const icon = event.type === 'goal' ? '⚽' : event.type === 'yellow-card' ? '🟨' : event.type === 'red-card' ? '🟥' : '↔';
  return (
    <div className="grid grid-cols-[44px_28px_1fr] items-start gap-2 border-b border-white/[0.06] py-3 last:border-0">
      <span className="font-black text-white">{event.minute || '—'}</span>
      <span>{icon}</span>
      <div>
        <p className="text-sm leading-6 text-stone-300">{event.text}</p>
        {event.playerId && <Link href={`/players/${event.playerId}`} className="mt-1 inline-flex text-xs font-semibold text-emerald-300 hover:text-emerald-200">Player profile →</Link>}
      </div>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <p className="mt-6 rounded-2xl border border-white/10 bg-black/15 p-5 text-sm text-stone-500">{message}</p>;
}

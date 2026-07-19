import Link from 'next/link';
import type { LiveMatch, MatchGoalScorer } from '@/lib/liveData';

export function MatchDayCenter({
  matches,
  scorersByMatch = {},
  refreshedAt,
}: {
  matches: LiveMatch[];
  scorersByMatch?: Record<string, MatchGoalScorer[]>;
  refreshedAt?: Date;
}) {
  return (
    <section id="matches" className="scroll-mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20 sm:rounded-[2rem] sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400">Match center</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl">Fixtures & results</h2>
        </div>
        <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 sm:text-xs">
          Live feed • auto-refresh 15s
        </div>
      </div>

      {refreshedAt && (
        <p className="mb-4 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500 sm:inline-flex sm:text-xs">
          Updated {formatUpdated(refreshedAt)}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {matches.map((match) => (
          <Link
            key={match.id}
            href={`/matches/${match.id}`}
            className="group flex flex-col rounded-2xl border border-white/10 bg-black/20 p-3.5 transition hover:-translate-y-0.5 hover:border-emerald-400/30 sm:p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-stone-500 sm:text-xs">
              <span>{match.date} · {match.kickoff}</span>
              <span className={/final|full time/i.test(match.status) ? 'text-stone-400' : 'text-amber-300'}>{match.status}</span>
            </div>
            <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
              <TeamRow name={match.homeTeam} badge={match.homeBadge} score={match.homeScore} />
              <TeamRow name={match.awayTeam} badge={match.awayBadge} score={match.awayScore} />
            </div>
            <ScorersList
              scorers={scorersByMatch[match.id] ?? []}
              totalGoals={(match.homeScore ?? 0) + (match.awayScore ?? 0)}
              status={match.status}
            />
            <div className="mt-5 border-t border-white/[0.07] pt-4 text-sm text-stone-500">
              <p className="truncate font-medium text-stone-300">{match.venue}</p>
              <div className="mt-2 flex items-center justify-between">
                <span>{match.group || match.round}</span>
                <span className="font-semibold text-emerald-300 transition group-hover:translate-x-1">Details →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!matches.length && (
        <p className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6 text-amber-100">
          The live match provider is temporarily unavailable.
        </p>
      )}
    </section>
  );
}

function formatUpdated(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

function ScorersList({
  scorers,
  totalGoals,
  status,
}: {
  scorers: MatchGoalScorer[];
  totalGoals: number;
  status: string;
}) {
  const hasStarted = /live|half|progress|final|full time/i.test(status);

  if (!scorers.length && (!hasStarted || totalGoals === 0)) {
    return null;
  }

  if (!scorers.length) {
    return (
      <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-xs leading-5 text-stone-500">
        Scorer details will appear when the live feed publishes them.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.035] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Scorers</p>
      <div className="mt-2 space-y-1.5">
        {scorers.slice(0, 5).map((scorer) => (
          <div key={scorer.id} className="flex min-w-0 items-center gap-2 text-xs text-stone-300">
            <span className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 font-black tabular-nums text-emerald-200">
              {scorer.minute || '—'}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold text-white">{scorer.playerName}</span>
            {scorer.team && <span className="max-w-[42%] truncate text-stone-500">{scorer.team}</span>}
          </div>
        ))}
        {scorers.length > 5 && (
          <p className="text-xs font-semibold text-stone-500">+{scorers.length - 5} more in match center</p>
        )}
      </div>
    </div>
  );
}

function TeamRow({ name, badge, score }: { name: string; badge: string | null; score: number | null }) {
  return (
    <div className="flex items-center gap-3">
      {badge ? (
        <span role="img" aria-label={`${name} badge`} className="h-9 w-9 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${badge}")` }} />
      ) : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">⚽</span>}
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-white sm:text-base">{name}</span>
      <span className="text-xl font-black tabular-nums text-white sm:text-2xl">{score ?? '–'}</span>
    </div>
  );
}

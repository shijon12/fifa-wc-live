import Link from 'next/link';
import type { LiveMatch } from '@/lib/liveData';

const stageOrder = ['Round Of 32', 'Round Of 16', 'Quarterfinals', 'Semifinals', '3rd Place Match', 'Final'];

export function KnockoutBracket({ matches }: { matches: LiveMatch[] }) {
  const knockoutMatches = matches.filter((match) => !match.group);
  const stages = knockoutMatches.reduce<Map<string, LiveMatch[]>>((result, match) => {
    const list = result.get(match.round) ?? [];
    list.push(match);
    result.set(match.round, list);
    return result;
  }, new Map());
  const orderedStages = Array.from(stages.entries()).sort(([a], [b]) => {
    const aIndex = stageOrder.indexOf(a);
    const bIndex = stageOrder.indexOf(b);
    return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
  });

  return (
    <section id="bracket" className="mt-12 scroll-mt-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400">Road to the final</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Knockout bracket</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
          Pairings and results update directly from the live tournament schedule.
        </p>
      </div>

      {orderedStages.length ? (
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orderedStages.map(([stage, stageMatches]) => (
              <div key={stage} className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="min-w-0 truncate font-bold text-white">{stage}</h3>
                  <span className="shrink-0 text-xs text-stone-600">{stageMatches.length} {stageMatches.length === 1 ? 'match' : 'matches'}</span>
                </div>
                <div className="max-h-[680px] space-y-3 overflow-y-auto pr-1">
                  {stageMatches.map((match) => (
                    <Link key={match.id} href={`/matches/${match.id}`} className="block rounded-2xl border border-white/[0.08] bg-black/20 p-3 transition hover:border-emerald-400/30">
                      <BracketTeam name={match.homeTeam} badge={match.homeBadge} score={match.homeScore} />
                      <BracketTeam name={match.awayTeam} badge={match.awayBadge} score={match.awayScore} />
                      <p className="mt-2 truncate border-t border-white/[0.06] pt-2 text-[10px] uppercase tracking-wider text-stone-600">
                        {match.date} · {match.venue}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-stone-400">
          Knockout pairings have not been published by the live provider yet.
        </p>
      )}
    </section>
  );
}

function BracketTeam({ name, badge, score }: { name: string; badge: string | null; score: number | null }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      {badge ? <span className="h-6 w-6 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${badge}")` }} /> : <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-xs">?</span>}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-200">{name}</span>
      <span className="font-black tabular-nums text-white">{score ?? '–'}</span>
    </div>
  );
}

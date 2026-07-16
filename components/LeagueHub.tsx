import type { LeagueMatch, SupportedLeague } from '@/lib/leagueData';

type LeagueBundle = {
  league: SupportedLeague;
  matches: LeagueMatch[];
};

export function LeagueHub({ bundles }: { bundles: LeagueBundle[] }) {
  const totalMatches = bundles.reduce((sum, bundle) => sum + bundle.matches.length, 0);
  const liveMatches = bundles.flatMap((bundle) => bundle.matches).filter((match) => match.state === 'in').length;
  const upcomingMatches = bundles.flatMap((bundle) => bundle.matches).filter((match) => match.state === 'pre').length;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1b13] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">More football, same control room</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">Club football live hub</h1>
          <p className="mt-4 text-base leading-7 text-stone-300 sm:text-lg">
            Follow the English Premier League, Spanish LaLiga, and Major League Soccer with live fixtures, results, venue details, and prediction-style fan insights.
          </p>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <Metric value={totalMatches} label="Matches loaded" />
          <Metric value={liveMatches} label="Live now" accent />
          <Metric value={upcomingMatches} label="Upcoming" />
        </div>
      </section>

      {bundles.map((bundle) => (
        <section key={bundle.league.id} className={`rounded-3xl border border-white/10 bg-gradient-to-br ${bundle.league.accent} p-[1px]`}>
          <div className="rounded-3xl bg-[#07120d]/95 p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{bundle.league.country}</p>
                <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">{bundle.league.label}</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-stone-300">
                {bundle.matches.length || 'No'} matches in feed
              </span>
            </div>

            {bundle.matches.length ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {bundle.matches.slice(0, 12).map((match) => (
                  <LeagueMatchCard key={`${match.leagueId}-${match.id}`} match={match} />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm leading-6 text-amber-100">
                ESPN does not currently have matches in the rolling feed window for this league. The card will populate automatically when fixtures are available.
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function LeagueMatchCard({ match }: { match: LeagueMatch }) {
  const statusStyle = match.state === 'in'
    ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
    : match.state === 'post'
      ? 'border-stone-400/20 bg-white/5 text-stone-300'
      : 'border-sky-400/20 bg-sky-400/10 text-sky-200';

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className={`rounded-full border px-2.5 py-1 font-semibold ${statusStyle}`}>{match.status}</span>
        <span className="text-stone-500">{match.date} · {match.kickoff}</span>
      </div>

      <div className="mt-4 space-y-3">
        <TeamLine name={match.homeTeam} badge={match.homeBadge} score={match.homeScore} record={match.homeForm} />
        <TeamLine name={match.awayTeam} badge={match.awayBadge} score={match.awayScore} record={match.awayForm} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Fan insight</p>
            <p className="mt-1 font-bold text-white">{match.insight.lean}</p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-stone-200">
            {match.insight.confidence} confidence
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <InsightPill label={match.homeTeam} value={match.insight.homeWinPct} />
          <InsightPill label="Draw" value={match.insight.drawPct} />
          <InsightPill label={match.awayTeam} value={match.insight.awayWinPct} />
        </div>
        <p className="mt-3 text-[11px] leading-5 text-stone-500">{match.insight.note}</p>
      </div>

      <p className="mt-3 truncate text-xs text-stone-500">{match.venue}</p>
    </article>
  );
}

function TeamLine({ name, badge, score, record }: { name: string; badge: string | null; score: number | null; record: string | null }) {
  return (
    <div className="flex items-center gap-3">
      {badge ? (
        <span className="h-8 w-8 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${badge}")` }} />
      ) : (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-white">{name.slice(0, 2)}</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-white">{name}</p>
        {record && <p className="text-xs text-stone-500">Record: {record}</p>}
      </div>
      <span className="text-2xl font-black tabular-nums text-white">{score ?? '–'}</span>
    </div>
  );
}

function InsightPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
      <p className="truncate text-stone-400">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}%</p>
    </div>
  );
}

function Metric({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-emerald-300/20 bg-emerald-300/10' : 'border-white/10 bg-white/[0.035]'}`}>
      <p className={`text-2xl font-black tabular-nums ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">{label}</p>
    </div>
  );
}

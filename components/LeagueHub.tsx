import Link from 'next/link';
import type { LeagueMatch, SupportedLeague } from '@/lib/leagueData';

export function LeagueHub({ leagues, selectedLeague, matches }: { leagues: SupportedLeague[]; selectedLeague: SupportedLeague; matches: LeagueMatch[] }) {
  const liveMatches = matches.filter((match) => match.state === 'in').length;
  const upcomingMatches = matches.filter((match) => match.state === 'pre').length;
  const completedMatches = matches.filter((match) => match.state === 'post').length;
  const grouped = groupLeagues(leagues);

  return (
    <div className="space-y-8">
      <section className={`overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${selectedLeague.accent} p-[1px] shadow-2xl shadow-black/20`}>
        <div className="rounded-3xl bg-[#0b1b13]/95 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Choose your competition</p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">{selectedLeague.label}</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-stone-300 sm:text-lg">
                Live fixtures, scores, venue details, team records, and prediction-style fan insights for {selectedLeague.country}.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Selected league</p>
              <p className="mt-2 text-2xl font-black text-white">{selectedLeague.shortLabel}</p>
              <p className="text-sm text-stone-400">{selectedLeague.region}</p>
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-4">
            <Metric value={matches.length} label="Matches loaded" />
            <Metric value={liveMatches} label="Live now" accent />
            <Metric value={upcomingMatches} label="Upcoming" />
            <Metric value={completedMatches} label="Completed" />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">League picker</p>
        <div className="mt-5 space-y-5">
          {Object.entries(grouped).map(([group, groupLeagues]) => (
            <div key={group}>
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-stone-500">{group}</h2>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                {groupLeagues.map((league) => (
                  <Link
                    key={league.id}
                    href={`/leagues?league=${league.id}`}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${league.id === selectedLeague.id ? 'border-emerald-300 bg-emerald-300 text-[#07120d]' : 'border-white/10 bg-black/20 text-stone-300 hover:border-emerald-400/40 hover:text-white'}`}
                  >
                    {league.shortLabel}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`rounded-3xl border border-white/10 bg-gradient-to-br ${selectedLeague.accent} p-[1px]`}>
        <div className="rounded-3xl bg-[#07120d]/95 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{selectedLeague.country}</p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">{selectedLeague.label} fixtures</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-stone-300">
              {matches.length || 'No'} matches in feed
            </span>
          </div>

          {matches.length ? (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {matches.slice(0, 24).map((match) => <LeagueMatchCard key={match.id} match={match} />)}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm leading-6 text-amber-100">
              ESPN does not currently have matches in the rolling feed window for this league. Try another competition or check back closer to matchday.
            </div>
          )}
        </div>
      </section>
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Prediction insight</p>
            <p className="mt-1 font-bold text-white">{match.insight.lean}</p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-stone-200">{match.insight.confidence}</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <InsightPill label="Home" value={match.insight.homeWinPct} />
          <InsightPill label="Draw" value={match.insight.drawPct} />
          <InsightPill label="Away" value={match.insight.awayWinPct} />
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
      {badge ? <span className="h-8 w-8 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${badge}")` }} /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-white">{name.slice(0, 2)}</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-white">{name}</p>
        {record && <p className="text-xs text-stone-500">Record: {record}</p>}
      </div>
      <span className="text-2xl font-black tabular-nums text-white">{score ?? '–'}</span>
    </div>
  );
}

function InsightPill({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2"><p className="truncate text-stone-400">{label}</p><p className="mt-1 text-lg font-black text-white">{value}%</p></div>;
}

function Metric({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${accent ? 'border-emerald-300/20 bg-emerald-300/10' : 'border-white/10 bg-white/[0.035]'}`}><p className={`text-2xl font-black tabular-nums ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</p><p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">{label}</p></div>;
}

function groupLeagues(leagues: SupportedLeague[]) {
  return leagues.reduce<Record<string, SupportedLeague[]>>((groups, league) => {
    groups[league.tier] = [...(groups[league.tier] ?? []), league];
    return groups;
  }, {});
}

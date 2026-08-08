'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTimestamp } from '@/components/DataTimestamp';
import type { LeagueMatch, SupportedLeague } from '@/lib/leagueData';
import { winnerEmoji, winnerSide } from '@/lib/resultCelebrations';

type LeagueView = 'results' | 'fixtures' | 'live';

export function LeagueHub({ leagues, selectedLeague, matches, selectedView, refreshedAt }: { leagues: SupportedLeague[]; selectedLeague: SupportedLeague; matches: LeagueMatch[]; selectedView: LeagueView; refreshedAt: string }) {
  const router = useRouter();
  const liveMatches = matches.filter((match) => match.state === 'in').sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const upcomingMatches = matches.filter((match) => match.state === 'pre').sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const completedMatches = matches.filter((match) => match.state === 'post').sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const visibleMatchCount = selectedView === 'live' ? liveMatches.length : selectedView === 'fixtures' ? upcomingMatches.length : completedMatches.length;
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
          <div className="mt-7 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div>
              <label htmlFor="match-view" className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Show</label>
              <select
                id="match-view"
                value={selectedView}
                onChange={(event) => router.push(`/leagues?league=${selectedLeague.id}&view=${event.target.value}`)}
                className="mt-2 block min-w-56 rounded-xl border border-white/10 bg-[#07120d] px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-400"
              >
                <option value="results">Recent results</option>
                <option value="fixtures">Upcoming fixtures</option>
                <option value="live">Live now</option>
              </select>
            </div>
            <Metric value={visibleMatchCount} label="Matches in this view" accent={selectedView === 'live'} />
          </div>
          <div className="mt-3"><DataTimestamp updatedAt={refreshedAt} label={`${selectedLeague.shortLabel} ${selectedView}`} /></div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">League picker</p>
        <div className="mt-5 space-y-5">
          {Object.entries(grouped).map(([group, groupLeagues]) => (
            <div key={group}>
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-stone-500">{group}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {groupLeagues.map((league) => (
                  <Link
                    key={league.id}
                    href={`/leagues?league=${league.id}&view=${selectedView}`}
                    className={`rounded-full border px-3 py-2 text-center text-sm font-semibold transition ${league.id === selectedLeague.id ? 'border-emerald-300 bg-emerald-300 text-[#07120d]' : 'border-white/10 bg-black/20 text-stone-300 hover:border-emerald-400/40 hover:text-white'}`}
                  >
                    {league.shortLabel}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedView === 'live' ? (
        <MatchSection eyebrow="Happening now" title="Live now" description="Matches currently in progress." matches={liveMatches} emptyMessage={`No ${selectedLeague.shortLabel} matches are live right now.`} accent="emerald" />
      ) : selectedView === 'fixtures' ? (
        <MatchSection eyebrow="Plan your matchday" title="Upcoming fixtures" description="The next scheduled matches, with the nearest kickoff first." matches={upcomingMatches} emptyMessage={`No upcoming ${selectedLeague.shortLabel} fixtures are currently available in the feed.`} accent="sky" />
      ) : (
        <MatchSection eyebrow="Latest scores" title="Recent results" description="Completed matches ordered from newest to oldest." matches={completedMatches} emptyMessage={`No recent ${selectedLeague.shortLabel} results are currently available in the feed.`} accent="stone" />
      )}
    </div>
  );
}

function MatchSection({ eyebrow, title, description, matches, emptyMessage = 'No matches are currently available.', accent }: { eyebrow: string; title: string; description: string; matches: LeagueMatch[]; emptyMessage?: string; accent: 'emerald' | 'sky' | 'stone' }) {
  const accentClass = accent === 'emerald' ? 'text-emerald-300' : accent === 'sky' ? 'text-sky-300' : 'text-stone-400';

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${accentClass}`}>{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">{title}</h2>
          <p className="mt-2 text-sm text-stone-500">{description}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-stone-300">{matches.length} matches</span>
      </div>
      {matches.length ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {matches.slice(0, 12).map((match) => <LeagueMatchCard key={match.id} match={match} />)}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-stone-400">{emptyMessage}</p>
      )}
    </section>
  );
}

function LeagueMatchCard({ match }: { match: LeagueMatch }) {
  const winner = winnerSide(match);
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
        <TeamLine name={match.homeTeam} badge={match.homeBadge} score={match.homeScore} record={match.homeForm} emoji={winnerEmoji(match, 'home')} muted={winner === 'away'} />
        <TeamLine name={match.awayTeam} badge={match.awayBadge} score={match.awayScore} record={match.awayForm} emoji={winnerEmoji(match, 'away')} muted={winner === 'home'} />
      </div>
      {match.state === 'pre' && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Baseline probability</p>
              <p className="mt-1 font-bold text-white">{match.insight.lean}</p>
            </div>
            <Link href={`/predictions?league=${encodeURIComponent(match.leagueId)}`} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-stone-200 hover:bg-white/15">Open AI desk</Link>
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-400">A form-based starting point. Generate an AI forecast for the deeper view.</p>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10" aria-label="Baseline result probabilities">
            <span className="bg-emerald-400" style={{ width: `${match.insight.homeWinPct}%` }} />
            <span className="bg-amber-300" style={{ width: `${match.insight.drawPct}%` }} />
            <span className="bg-violet-400" style={{ width: `${match.insight.awayWinPct}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <InsightPill label={match.homeTeam} value={match.insight.homeWinPct} />
            <InsightPill label="Draw" value={match.insight.drawPct} />
            <InsightPill label={match.awayTeam} value={match.insight.awayWinPct} />
          </div>
        </div>
      )}
      <p className="mt-3 truncate text-xs text-stone-500">{match.venue}</p>
    </article>
  );
}

function TeamLine({ name, badge, score, record, emoji = '', muted = false }: { name: string; badge: string | null; score: number | null; record: string | null; emoji?: string; muted?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${muted ? 'opacity-60' : ''}`}>
      {badge ? <span className="h-8 w-8 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${badge}")` }} /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-white">{name.slice(0, 2)}</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-white">{emoji && <span className="mr-1.5">{emoji}</span>}{name}</p>
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

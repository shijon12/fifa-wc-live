import Link from 'next/link';
import { MatchDayCenter } from '@/components/MatchDayCenter';
import { KnockoutBracket } from '@/components/KnockoutBracket';
import { SiteNav } from '@/components/SiteNav';
import { fetchWorldCupMatches, fetchWorldCupStandings, type LiveStanding } from '@/lib/liveData';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [matches, standings] = await Promise.all([
    fetchWorldCupMatches(),
    fetchWorldCupStandings(),
  ]);
  const groups = standings.reduce<Map<string, LiveStanding[]>>((result, standing) => {
    const group = result.get(standing.group) ?? [];
    group.push(standing);
    result.set(standing.group, group);
    return result;
  }, new Map());
  const todayKey = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/New_York',
  }).format(new Date());
  const todaysMatches = matches.filter((match) => match.dateKey === todayKey);
  const featuredMatches = todaysMatches.length
    ? todaysMatches
    : matches.filter((match) => match.status === 'Scheduled').slice(0, 6);
  const completed = matches.filter((match) => /final|full time/i.test(match.status)).length;
  const nextMatch = matches.find((match) => match.status === 'Scheduled') ?? matches.at(-1);
  const updatedAt = standings.find((standing) => standing.updatedAt)?.updatedAt;

  return (
    <main className="min-h-screen overflow-hidden bg-[#07120d] text-stone-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,_rgba(40,185,111,0.18),_transparent_28%),radial-gradient(circle_at_85%_25%,_rgba(245,185,66,0.12),_transparent_24%)]" />
      <div className="relative mx-auto max-w-[1440px] px-4 pb-16 pt-5 sm:px-6 lg:px-10">
        <SiteNav />

        <section className="relative mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0b1b13] px-5 py-8 shadow-2xl shadow-black/30 sm:rounded-[2rem] sm:px-10 sm:py-10 lg:px-14 lg:py-14">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[40px] border-emerald-400/10" />
          <div className="absolute bottom-0 right-0 hidden h-full w-1/2 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.035))] lg:block" />

          <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Live tournament data
              </div>
              <p className="mt-7 text-xs font-medium uppercase tracking-[0.22em] text-stone-400 sm:text-sm sm:tracking-[0.35em]">USA • Canada • Mexico</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[0.94] tracking-[-0.05em] text-white sm:text-6xl lg:text-8xl">
                World Cup
                <span className="block text-emerald-400">2026 live.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-stone-300 sm:text-lg">
                Scores, fixtures, group tables, and team profiles from the live competition feed—without placeholder results.
              </p>
            </div>

            {nextMatch && (
              <Link href={`/matches/${nextMatch.id}`} className="group rounded-3xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur transition hover:border-emerald-400/40 hover:bg-white/[0.08]">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                  <span>{nextMatch.status === 'Scheduled' ? 'Up next' : 'Latest result'}</span>
                  <span>{nextMatch.date} · {nextMatch.kickoff}</span>
                </div>
                <div className="mt-6 space-y-4">
                  <HeroTeam name={nextMatch.homeTeam} badge={nextMatch.homeBadge} score={nextMatch.homeScore} />
                  <div className="h-px bg-white/10" />
                  <HeroTeam name={nextMatch.awayTeam} badge={nextMatch.awayBadge} score={nextMatch.awayScore} />
                </div>
                <div className="mt-6 flex items-center justify-between text-sm text-stone-400">
                  <span className="truncate">{nextMatch.venue}</span>
                  <span className="text-emerald-300 transition group-hover:translate-x-1">Match center →</span>
                </div>
              </Link>
            )}
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric value={standings.length} label="Live team records" />
          <Metric value={groups.size} label="Groups reporting" />
          <Metric value={matches.length} label="Matches in feed" />
          <Metric value={completed} label="Results posted" accent />
        </section>

        <div className="mt-10">
          <MatchDayCenter matches={featuredMatches} />
        </div>

        <section id="groups" className="mt-12 scroll-mt-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400">Live table</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Group standings</h2>
            </div>
            <p className="text-sm text-stone-500">
              {updatedAt ? `Feed updated ${updatedAt} UTC` : 'Awaiting standings update'}
            </p>
          </div>

          {groups.size ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from(groups.entries()).map(([group, teams]) => (
                <GroupTable key={group} group={group} teams={teams} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-8 text-amber-100">
              The standings provider is temporarily unavailable. Live fixtures remain available above.
            </div>
          )}
        </section>

        <ThirdPlaceTable standings={standings} />
        <KnockoutBracket matches={matches} />
      </div>
    </main>
  );
}

function ThirdPlaceTable({ standings }: { standings: LiveStanding[] }) {
  const thirdPlaced = standings
    .filter((team) => team.rank === 3)
    .sort((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      b.won - a.won ||
      a.team.localeCompare(b.team),
    );

  return (
    <section className="mt-12">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Qualification watch</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Best third-place teams</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
          The top eight currently advance to the Round of 32. Rankings use points, goal difference, goals scored, then wins.
        </p>
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-5 py-4 text-left">Rank</th>
                <th className="px-3 py-4 text-left">Team</th>
                <th className="px-3 py-4">Group</th>
                <th className="px-3 py-4">P</th>
                <th className="px-3 py-4">W</th>
                <th className="px-3 py-4">GD</th>
                <th className="px-3 py-4">Pts</th>
                <th className="px-5 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {thirdPlaced.map((team, index) => (
                <tr key={team.teamId} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-5 py-4 font-black text-white">{index + 1}</td>
                  <td className="px-3 py-4">
                    <Link href={`/teams/${team.teamId}`} className="flex items-center gap-3 font-bold text-white hover:text-emerald-300">
                      {team.badge && <span className="h-7 w-7 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${team.badge}")` }} />}
                      {team.team}
                    </Link>
                  </td>
                  <td className="px-3 py-4 text-center text-stone-400">{team.group}</td>
                  <td className="px-3 py-4 text-center text-stone-400">{team.played}</td>
                  <td className="px-3 py-4 text-center text-stone-400">{team.won}</td>
                  <td className="px-3 py-4 text-center text-stone-400">{team.goalDifference > 0 ? '+' : ''}{team.goalDifference}</td>
                  <td className="px-3 py-4 text-center text-lg font-black text-white">{team.points}</td>
                  <td className="px-5 py-4 text-right">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${index < 8 ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>
                      {index < 8 ? 'Advancing' : 'Outside'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function HeroTeam({ name, badge, score }: { name: string; badge: string | null; score: number | null }) {
  return (
    <div className="flex items-center gap-4">
      <TeamMark name={name} badge={badge} size="h-12 w-12" />
      <span className="min-w-0 flex-1 truncate text-xl font-bold text-white">{name}</span>
      <span className="text-3xl font-black tabular-nums text-white">{score ?? '–'}</span>
    </div>
  );
}

function Metric({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${accent ? 'border-amber-300/20 bg-amber-300/10' : 'border-white/10 bg-white/[0.035]'}`}>
      <p className={`text-2xl font-black tabular-nums sm:text-3xl ${accent ? 'text-amber-300' : 'text-white'}`}>{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-stone-500 sm:text-xs sm:tracking-[0.16em]">{label}</p>
    </div>
  );
}

function GroupTable({ group, teams }: { group: string; teams: LiveStanding[] }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Standings</p>
          <h3 className="text-xl font-bold text-white">Group {group}</h3>
        </div>
        <Link href={`/groups/${group.toLowerCase()}`} className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
          Full table →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead className="text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Team</th>
              <th className="px-2 py-3 font-medium">P</th>
              <th className="px-2 py-3 font-medium">W</th>
              <th className="px-2 py-3 font-medium">D</th>
              <th className="px-2 py-3 font-medium">L</th>
              <th className="px-2 py-3 font-medium">GD</th>
              <th className="px-5 py-3 text-right font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.teamId} className="border-t border-white/[0.06] text-stone-300">
                <td className="px-5 py-3">
                  <Link href={`/teams/${team.teamId}`} className="flex items-center gap-3 font-semibold text-white hover:text-emerald-300">
                    <span className="w-4 text-xs text-stone-600">{team.rank}</span>
                    <TeamMark name={team.team} badge={team.badge} size="h-7 w-7" />
                    {team.team}
                  </Link>
                </td>
                <td className="px-2 py-3 text-center">{team.played}</td>
                <td className="px-2 py-3 text-center">{team.won}</td>
                <td className="px-2 py-3 text-center">{team.drawn}</td>
                <td className="px-2 py-3 text-center">{team.lost}</td>
                <td className="px-2 py-3 text-center">{team.goalDifference > 0 ? '+' : ''}{team.goalDifference}</td>
                <td className="px-5 py-3 text-right text-base font-black text-white">{team.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function TeamMark({ name, badge, size }: { name: string; badge: string | null; size: string }) {
  return badge ? (
    <span
      role="img"
      aria-label={`${name} badge`}
      className={`${size} shrink-0 bg-contain bg-center bg-no-repeat`}
      style={{ backgroundImage: `url("${badge}")` }}
    />
  ) : (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-white/10`}>⚽</span>
  );
}

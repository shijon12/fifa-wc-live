import Link from 'next/link';
import { FantasyLeagueSimulation } from '@/components/FantasyLeagueSimulation';
import { FeedbackForm } from '@/components/FeedbackForm';
import { KnockoutBracket } from '@/components/KnockoutBracket';
import { MatchDayCenter } from '@/components/MatchDayCenter';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { fetchWorldCupMatches, fetchWorldCupMatchScorers, fetchWorldCupStandings, type LiveStanding } from '@/lib/liveData';
import { fetchRecentFootballNews, type TeamNewsItem } from '@/lib/teamNews';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const refreshedAt = new Date();
  const [matches, standings, footballNews] = await Promise.all([
    fetchWorldCupMatches(),
    fetchWorldCupStandings(),
    fetchRecentFootballNews(),
  ]);
  const completed = matches.filter((match) => /final|full time/i.test(match.status)).length;
  const live = matches.filter((match) => /live|half|progress/i.test(match.status)).length;
  const nextMatch = matches.find((match) => match.status === 'Scheduled') ?? matches.at(-1);
  const upcomingMatches = matches.filter((match) => match.status === 'Scheduled').slice(0, 3);
  const recentResults = matches
    .filter((match) => match.status !== 'Scheduled')
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 6 - upcomingMatches.length);
  const matchCards = [...upcomingMatches, ...recentResults].slice(0, 6);
  const scorersByMatch = Object.fromEntries(
    await Promise.all(
      matchCards.map(async (match) => {
        const totalGoals = (match.homeScore ?? 0) + (match.awayScore ?? 0);
        if (totalGoals === 0) return [match.id, []] as const;
        try {
          return [match.id, await fetchWorldCupMatchScorers(match.id)] as const;
        } catch {
          return [match.id, []] as const;
        }
      }),
    ),
  );
  const groups = groupStandings(standings);

  return (
    <main className="min-h-screen overflow-hidden bg-[#07120d] text-stone-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,_rgba(40,185,111,0.14),_transparent_28%),radial-gradient(circle_at_85%_25%,_rgba(245,185,66,0.09),_transparent_24%)]" />
      <div className="relative mx-auto max-w-[1440px] px-3 pb-12 pt-3 sm:px-6 sm:pb-16 sm:pt-5 lg:px-10">
        <SiteNav />

        <section className="mt-4 grid gap-3 sm:mt-6 sm:gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#0b1b13] p-5 shadow-2xl shadow-black/25 sm:rounded-[2rem] sm:p-10 lg:p-12">
            <p className="inline-flex max-w-full rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300 sm:text-xs sm:tracking-[0.22em]">
              Early beta · private fantasy matchday groups
            </p>
            <p className="mt-8 text-xs font-medium uppercase tracking-[0.28em] text-stone-500">Scores • fantasy • news • communities</p>
            <h1 className="mt-3 max-w-4xl text-[2.7rem] font-black leading-[0.92] tracking-[-0.06em] text-white min-[390px]:text-5xl sm:text-7xl lg:text-8xl">
              The Matchroom
              <span className="block text-emerald-400">for matchday.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
              A social matchday room where football fans create private fantasy leagues, invite friends, make picks, follow live updates, and keep the group alive before kickoff.
            </p>
            <p className="mt-4 max-w-2xl rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
              The Matchroom is in early beta. Live data can occasionally lag or differ based on provider availability.
            </p>
            <div className="mt-7 grid gap-2 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3">
              <Link href="/fantasy/leagues" className="rounded-full bg-emerald-400 px-5 py-3 text-center text-sm font-black text-[#07120d] transition hover:bg-emerald-300">
                Create your matchroom
              </Link>
              <Link href="/fantasy/leagues" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10">
                Join a friend&apos;s room
              </Link>
              <Link href="/leagues" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10">
                Browse live football
              </Link>
              <Link href="/about#feedback" className="rounded-full border border-amber-300/20 bg-amber-300/10 px-5 py-3 text-center text-sm font-semibold text-amber-100 transition hover:bg-amber-300/20">
                Help shape it
              </Link>
            </div>
          </div>

          {nextMatch && (
            <Link href={`/matches/${nextMatch.id}`} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 transition hover:border-emerald-400/30 hover:bg-white/[0.065] sm:rounded-[2rem] sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 sm:text-xs sm:tracking-[0.2em]">
                <span>{nextMatch.status === 'Scheduled' ? 'Up next' : 'Latest result'}</span>
                <span>{nextMatch.date} · {nextMatch.kickoff}</span>
              </div>
              <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
                <HeroTeam name={nextMatch.homeTeam} badge={nextMatch.homeBadge} score={nextMatch.homeScore} />
                <div className="h-px bg-white/10" />
                <HeroTeam name={nextMatch.awayTeam} badge={nextMatch.awayBadge} score={nextMatch.awayScore} />
              </div>
              <div className="mt-6 flex items-center justify-between gap-3 text-sm text-stone-400 sm:mt-8">
                <span className="truncate">{nextMatch.venue}</span>
                <span className="text-emerald-300 transition group-hover:translate-x-1">Match center →</span>
              </div>
            </Link>
          )}
        </section>

        <section className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3 lg:grid-cols-4">
          <Metric value={live} label="Live now" accent />
          <Metric value={matches.length} label="Matches tracked" />
          <Metric value={completed} label="Results posted" />
          <Metric value={standings.length} label="Teams in feed" />
        </section>

        <section className="mt-6 grid gap-3 sm:mt-8 lg:grid-cols-3">
          <StartCard
            href="/fantasy/leagues"
            eyebrow="Step 1"
            title="Create your matchroom"
            body="Start a private league for your group chat, office crew, or weekend football circle."
          />
          <StartCard
            href="/fantasy/leagues"
            eyebrow="Step 2"
            title="Join a friend&apos;s room"
            body="Paste an invite code or open a shared link to jump straight into a private matchday group."
          />
          <StartCard
            href="/leagues"
            eyebrow="Step 3"
            title="Browse live football"
            body="Explore World Cup and major club fixtures, stats, tables, news, and match context."
          />
        </section>

        <FantasyLeagueSimulation />

        <section className="mt-6 grid gap-3 sm:mt-10 md:grid-cols-2 xl:grid-cols-4">
          <FeatureCard href="/statistics" eyebrow="Stats" title="Understand the game" body="Player leaders, team tables, live form, and league-by-league analytics in one place." />
          <FeatureCard href="/fantasy" eyebrow="Fantasy" title="Compete with friends" body="Build a squad, choose a captain, make picks, and climb global or private leaderboards." />
          <FeatureCard href="/favorites" eyebrow="Alerts" title="Never miss moments" body="Follow teams and receive kickoff, goal, and full-time notifications." />
          <FeatureCard href="/predictions" eyebrow="Forecasts" title="Context before kickoff" body="Forecasts, recent team news, and sentiment before big matches." />
        </section>

        <RecentFootballNews items={footballNews} />

        <section className="mt-8 rounded-[1.5rem] border border-emerald-400/20 bg-[radial-gradient(circle_at_85%_10%,rgba(52,211,153,0.14),transparent_32%),rgba(16,185,129,0.08)] p-5 sm:mt-10 sm:rounded-[2rem] sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">For the group chat</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white sm:text-3xl">Got a football group chat?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">
                Start a room, invite friends, make picks, and turn matchday into something everyone can follow together.
              </p>
            </div>
            <Link href="/fantasy/leagues" className="shrink-0 rounded-full bg-emerald-400 px-5 py-3 text-center text-sm font-black text-[#07120d] hover:bg-emerald-300">
              Start a room
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          <ProofCard value="Early beta" label="Built with real football-fan feedback, not hidden behind a launch waitlist." />
          <ProofCard value="Private rooms" label="Designed around the sharing loop investors and users can understand quickly." />
          <ProofCard value="Live stack" label="Scores, stats, news, alerts, accounts, feedback, and fantasy are already connected." />
        </section>

        <section className="mt-8 grid gap-3 sm:mt-10 sm:gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 sm:rounded-[2rem] sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">What we are learning</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">Help shape the product before it gets bigger.</h2>
            <p className="mt-4 text-sm leading-7 text-stone-400">
              The Matchroom is tracking what fans actually use: fantasy, alerts, stats, news, predictions, and private leagues. Your feedback helps decide what becomes the center of the product.
            </p>
            <Link href="/about#feedback" className="mt-5 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/20">
              Tell us what to build next →
            </Link>
          </div>
          <FeedbackForm compact />
        </section>

        <section className="mt-10">
          <MatchDayCenter matches={matchCards} scorersByMatch={scorersByMatch} refreshedAt={refreshedAt} />
        </section>

        <section className="mt-9 sm:mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400">Competition snapshot</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">World Cup table preview</h2>
            </div>
            <Link href="/statistics?league=world-cup" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-stone-300 hover:bg-white/10">
              Full stats →
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from(groups.entries()).slice(0, 4).map(([group, teams]) => (
              <GroupPreview key={group} group={group} teams={teams} />
            ))}
          </div>
        </section>

        <KnockoutBracket matches={matches} />

        <SiteFooter />
      </div>
    </main>
  );
}

function RecentFootballNews({ items }: { items: TeamNewsItem[] }) {
  return (
    <section className="mt-9 sm:mt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Football news</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Recent football news</h2>
        </div>
        <Link href="/predictions" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-stone-300 hover:bg-white/10">
          Match context →
        </Link>
      </div>
      {items.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 6).map((item) => (
            <a key={`${item.source}-${item.title}`} href={item.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-sky-400/30 hover:bg-white/[0.055] sm:rounded-3xl sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{item.source}</p>
              <h3 className="mt-3 line-clamp-3 font-bold leading-6 text-white">{item.title}</h3>
              <p className="mt-4 text-xs text-stone-500">{new Date(item.publishedAt).toLocaleDateString()}</p>
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-sm leading-6 text-stone-400">
          Recent football news is temporarily unavailable. Live scores, fantasy rooms, stats, and alerts still work while the news feed catches up.
        </div>
      )}
    </section>
  );
}

function StartCard({ href, eyebrow, title, body }: { href: string; eyebrow: string; title: string; body: string }) {
  return (
    <Link href={href} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-white/[0.055]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">{eyebrow}</p>
      <h2 className="mt-3 text-xl font-black text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-500">{body}</p>
      <span className="mt-4 inline-flex text-sm font-semibold text-emerald-300 transition group-hover:translate-x-1">Open →</span>
    </Link>
  );
}

function ProofCard({ value, label }: { value: string; label: string }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-stone-500">{label}</p>
    </article>
  );
}

function FeatureCard({ href, eyebrow, title, body }: { href: string; eyebrow: string; title: string; body: string }) {
  return (
    <Link href={href} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-white/[0.055]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">{eyebrow}</p>
      <h2 className="mt-3 text-lg font-black text-white sm:text-xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-500">{body}</p>
      <span className="mt-4 inline-flex text-sm font-semibold text-stone-400 transition group-hover:text-emerald-300">Open →</span>
    </Link>
  );
}

function GroupPreview({ group, teams }: { group: string; teams: LiveStanding[] }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:rounded-3xl sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-white">Group {group}</h3>
        <Link href={`/groups/${group.toLowerCase()}`} className="text-sm font-semibold text-emerald-300">View →</Link>
      </div>
      <div className="mt-4 space-y-3">
        {teams.slice(0, 4).map((team) => (
          <Link key={team.teamId} href={`/teams/${team.teamId}`} className="flex items-center gap-3 rounded-2xl bg-black/20 px-3 py-2 hover:bg-white/10">
            <span className="w-5 text-xs font-black text-stone-600">{team.rank}</span>
            {team.badge && <span className="h-7 w-7 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${team.badge}")` }} />}
            <span className="min-w-0 flex-1 truncate font-bold text-white">{team.team}</span>
            <span className="font-black text-white">{team.points}</span>
          </Link>
        ))}
      </div>
    </article>
  );
}

function HeroTeam({ name, badge, score }: { name: string; badge: string | null; score: number | null }) {
  return (
    <div className="flex items-center gap-4">
      {badge ? <span className="h-10 w-10 shrink-0 bg-contain bg-center bg-no-repeat sm:h-12 sm:w-12" style={{ backgroundImage: `url("${badge}")` }} /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-black text-white sm:h-12 sm:w-12">{name.slice(0, 2)}</span>}
      <span className="min-w-0 flex-1 truncate text-lg font-bold text-white sm:text-xl">{name}</span>
      <span className="text-2xl font-black tabular-nums text-white sm:text-3xl">{score ?? '–'}</span>
    </div>
  );
}

function Metric({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 sm:p-5 ${accent ? 'border-emerald-300/20 bg-emerald-300/10' : 'border-white/10 bg-white/[0.035]'}`}>
      <p className={`text-xl font-black tabular-nums sm:text-3xl ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-stone-500 sm:text-xs sm:tracking-[0.16em]">{label}</p>
    </div>
  );
}

function groupStandings(standings: LiveStanding[]) {
  return standings.reduce<Map<string, LiveStanding[]>>((result, standing) => {
    const group = result.get(standing.group) ?? [];
    group.push(standing);
    result.set(standing.group, group);
    return result;
  }, new Map());
}

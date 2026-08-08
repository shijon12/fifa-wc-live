import Link from 'next/link';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { fetchLeagueMatches, supportedLeagues, type LeagueMatch } from '@/lib/leagueData';
import { winnerEmoji, winnerSide } from '@/lib/resultCelebrations';
import { fetchRecentFootballNews, type TeamNewsItem } from '@/lib/teamNews';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const refreshedAt = new Date();
  const homepageLeagues = supportedLeagues.filter((league) => league.id !== 'world-cup');
  const [leagueFeeds, footballNews] = await Promise.all([
    Promise.all(homepageLeagues.map(async (league) => fetchLeagueMatches(league, { daysBack: 10, daysForward: 1, limit: 100 }))),
    fetchRecentFootballNews(),
  ]);
  const matches = leagueFeeds.flat();
  const live = matches.filter((match) => match.state === 'in');
  const recentResults = matches
    .filter((match) => match.state === 'post')
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const featuredMatch = recentResults[0];
  const heroWinner = featuredMatch ? winnerSide(featuredMatch) : null;
  const matchCards = recentResults.slice(0, 9);

  return (
    <main className="min-h-screen overflow-hidden bg-[#07120d] text-stone-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,_rgba(40,185,111,0.14),_transparent_28%),radial-gradient(circle_at_85%_25%,_rgba(245,185,66,0.09),_transparent_24%)]" />
      <div className="relative mx-auto max-w-[1440px] px-3 pb-12 pt-3 sm:px-6 sm:pb-16 sm:pt-5 lg:px-10">
        <SiteNav />

        <section className="mt-4 grid gap-3 sm:mt-6 sm:gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#0b1b13] p-5 shadow-2xl shadow-black/25 sm:rounded-[2rem] sm:p-10 lg:p-12">
            <p className="inline-flex max-w-full rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300 sm:text-xs sm:tracking-[0.22em]">
              The shared home for matchday
            </p>
            <h1 className="mt-8 max-w-4xl text-[2.7rem] font-black leading-[0.94] tracking-[-0.06em] text-white min-[390px]:text-5xl sm:text-7xl lg:text-8xl">
              Football is better
              <span className="block text-emerald-400">together.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
              Create a private room, invite your friends, make fantasy picks, and follow every match in one place.
            </p>
            <p className="mt-4 text-xs leading-5 text-stone-500">
              Early beta · Live data updates automatically and may occasionally reflect provider delays.
            </p>
            <div className="mt-7 grid gap-2 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3">
              <Link href="/fantasy/leagues" className="rounded-full bg-emerald-400 px-5 py-3 text-center text-sm font-black text-[#07120d] transition hover:bg-emerald-300">
                Create a private room
              </Link>
              <Link href="/leagues" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10">
                Explore live football
              </Link>
            </div>
          </div>

          {featuredMatch && (
            <Link href={`/leagues?league=${featuredMatch.leagueId}`} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 transition hover:border-emerald-400/30 hover:bg-white/[0.065] sm:rounded-[2rem] sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 sm:text-xs sm:tracking-[0.2em]">
                <span>Latest result · {featuredMatch.league}</span>
                <span>{featuredMatch.date}</span>
              </div>
              <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
                <HeroTeam name={featuredMatch.homeTeam} badge={featuredMatch.homeBadge} score={featuredMatch.homeScore} emoji={winnerEmoji(featuredMatch, 'home')} muted={heroWinner === 'away'} />
                <div className="h-px bg-white/10" />
                <HeroTeam name={featuredMatch.awayTeam} badge={featuredMatch.awayBadge} score={featuredMatch.awayScore} emoji={winnerEmoji(featuredMatch, 'away')} muted={heroWinner === 'home'} />
              </div>
              <div className="mt-6 flex items-center justify-between gap-3 text-sm text-stone-400 sm:mt-8">
                <span className="truncate">{featuredMatch.venue}</span>
                <span className="text-emerald-300 transition group-hover:translate-x-1">View competition →</span>
              </div>
            </Link>
          )}
        </section>

        <section className="mt-3 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
          <Metric value={live.length} label="Live now" accent />
          <Metric value={homepageLeagues.length} label="Leagues covered" />
          <Metric value={recentResults.length} label="Recent results" />
        </section>

        <section className="mt-6 grid gap-3 sm:mt-8 md:grid-cols-3">
          <FeatureCard href="/fantasy/leagues" eyebrow="Play together" title="Private matchday rooms" body="Invite friends, make picks, and compete on your own leaderboard." />
          <FeatureCard href="/leagues" eyebrow="Follow the game" title="Live football, clearly" body="Fixtures, scores, stats, news, and match centers without the tab switching." />
          <FeatureCard href="/favorites" eyebrow="Stay connected" title="Alerts for your teams" body="Get kickoff, goal, and full-time updates when you cannot watch live." />
        </section>

        <section className="mt-8 sm:mt-10">
          <RecentResults matches={matchCards} refreshedAt={refreshedAt} />
        </section>

        <RecentFootballNews items={footballNews} refreshedAt={refreshedAt} />

        <section className="mt-8 sm:mt-10">
          <NewsletterSignup />
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-emerald-400/20 bg-[radial-gradient(circle_at_85%_10%,rgba(52,211,153,0.14),transparent_32%),rgba(16,185,129,0.08)] p-5 sm:mt-10 sm:rounded-[2rem] sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Bring your group chat</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white sm:text-3xl">Make the next match matter more.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">
                Create a room in seconds, share one invite link, and compete throughout matchday.
              </p>
            </div>
            <Link href="/fantasy/leagues" className="shrink-0 rounded-full bg-emerald-400 px-5 py-3 text-center text-sm font-black text-[#07120d] hover:bg-emerald-300">
              Start a room
            </Link>
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}

function RecentResults({ matches, refreshedAt }: { matches: LeagueMatch[]; refreshedAt: Date }) {
  return (
    <section id="matches" className="scroll-mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20 sm:rounded-[2rem] sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400">Across world football</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl">Latest results</h2>
          <p className="mt-2 text-sm text-stone-500">The most recently completed matches appear first.</p>
        </div>
        <div className="text-right">
          <Link href="/leagues" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-stone-300 hover:bg-white/10">All competitions →</Link>
          <p className="mt-3 text-[10px] uppercase tracking-wider text-stone-600">Updated {formatUpdated(refreshedAt)}</p>
        </div>
      </div>

      {matches.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {matches.map((match) => {
            const winner = winnerSide(match);
            return (
              <Link key={match.id} href={`/leagues?league=${match.leagueId}`} className="group rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-emerald-400/30">
                <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  <span className="truncate text-emerald-300">{match.league}</span>
                  <span className="shrink-0">{match.date} · Final</span>
                </div>
                <div className="mt-4 space-y-3">
                  <ResultTeam name={match.homeTeam} badge={match.homeBadge} score={match.homeScore} emoji={winnerEmoji(match, 'home')} muted={winner === 'away'} />
                  <ResultTeam name={match.awayTeam} badge={match.awayBadge} score={match.awayScore} emoji={winnerEmoji(match, 'away')} muted={winner === 'home'} />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3 text-xs text-stone-500">
                  <span className="truncate">{match.venue}</span>
                  <span className="shrink-0 font-semibold text-emerald-300 transition group-hover:translate-x-1">View →</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6 text-amber-100">Recent results are temporarily unavailable. Please check again shortly.</p>
      )}
    </section>
  );
}

function ResultTeam({ name, badge, score, emoji = '', muted = false }: { name: string; badge: string | null; score: number | null; emoji?: string; muted?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${muted ? 'opacity-60' : ''}`}>
      {badge ? <span className="h-8 w-8 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${badge}")` }} /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-white">{name.slice(0, 2)}</span>}
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-white sm:text-base">{emoji && <span className="mr-1.5">{emoji}</span>}{name}</span>
      <span className="text-xl font-black tabular-nums text-white">{score ?? '–'}</span>
    </div>
  );
}

function formatUpdated(date: Date) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(date);
}

function RecentFootballNews({ items, refreshedAt }: { items: TeamNewsItem[]; refreshedAt: Date }) {
  return (
    <section className="mt-9 sm:mt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Football news</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Recent football news</h2>
          <p className="mt-2 text-xs uppercase tracking-wider text-stone-600">Last updated {formatUpdated(refreshedAt)}</p>
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

function HeroTeam({ name, badge, score, emoji = '', muted = false }: { name: string; badge: string | null; score: number | null; emoji?: string; muted?: boolean }) {
  return (
    <div className={`flex items-center gap-4 ${muted ? 'opacity-60' : ''}`}>
      {badge ? <span className="h-10 w-10 shrink-0 bg-contain bg-center bg-no-repeat sm:h-12 sm:w-12" style={{ backgroundImage: `url("${badge}")` }} /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-black text-white sm:h-12 sm:w-12">{name.slice(0, 2)}</span>}
      <span className="min-w-0 flex-1 truncate text-lg font-bold text-white sm:text-xl">{emoji && <span className="mr-1.5">{emoji}</span>}{name}</span>
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

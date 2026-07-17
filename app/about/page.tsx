import Link from 'next/link';
import { FeedbackForm } from '@/components/FeedbackForm';
import { SiteNav } from '@/components/SiteNav';

const pillars = [
  ['Live context', 'Scores, fixtures, match centers, and timelines help fans understand what is happening without opening five apps.'],
  ['Fan memory', 'Favorites, alerts, fantasy squads, private leagues, and account features turn passive checking into a habit.'],
  ['Decision layer', 'News, stats, comparisons, and forecasts create the pre-match context fans want before kickoff.'],
];

const dataSources = [
  ['Live football data', 'ESPN soccer feeds power fixtures, scores, standings, teams, players, match centers, timelines, stats, and commentary where available.'],
  ['Recent news', 'Team and football news use a configurable paid news provider when present, with Google News RSS as the fallback. Headlines are sorted newest-first.'],
  ['Accounts and feedback', 'Supabase stores users, Google sign-in, fantasy/private-league data, feedback, waitlist interest, and anonymous product analytics.'],
  ['Notifications', 'Browser Push API, VAPID keys, a service worker, Supabase storage, and scheduled checks power kickoff, goal, and full-time alerts.'],
  ['AI forecasts', 'The prediction layer is built around the OpenAI Responses API, but the live AI forecast feature remains gated until API credits are enabled.'],
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#07120d] text-stone-100">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5 lg:px-10">
        <SiteNav />

        <section className="mt-4 rounded-[1.5rem] border border-white/10 bg-[#0b1b13] p-5 sm:mt-8 sm:rounded-[2rem] sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">About The Matchroom</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-[-0.05em] text-white sm:text-6xl">
            A matchday room for fans who want the whole football picture.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-300">
            The Matchroom is being built as a one-stop companion for football supporters: live scores, major leagues, fantasy, private groups, team alerts, player stats, recent news, and prediction context in one calm place.
          </p>
          <p className="mt-5 max-w-3xl rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
            Early beta note: live data can occasionally lag, be incomplete, or vary by provider coverage. The product is actively learning from real fan usage and feedback.
          </p>
          <div className="mt-7 grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <Link href="/leagues" className="rounded-full bg-emerald-400 px-5 py-3 text-center font-black text-[#07120d] hover:bg-emerald-300">
              Explore leagues
            </Link>
            <Link href="/fantasy" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-center font-black text-white hover:bg-white/10">
              Try fantasy
            </Link>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:mt-8 sm:gap-4 md:grid-cols-3">
          {pillars.map(([title, body]) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
              <h2 className="text-xl font-black text-white">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-400">{body}</p>
            </article>
          ))}
        </section>

        <section id="feedback" className="mt-5 grid scroll-mt-8 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 sm:rounded-[2rem] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-300">Why now</p>
            <h2 className="mt-3 text-3xl font-black text-white">Football attention is fragmented.</h2>
            <p className="mt-4 text-sm leading-7 text-stone-400">
              Fans check scores in one place, read team news somewhere else, manage fantasy in another app, and miss alerts when work or travel gets in the way. The Matchroom is a bet that the next great football product feels less like a spreadsheet and more like the room where fans gather before, during, and after matches.
            </p>
          </div>
          <FeedbackForm />
        </section>

        <section className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 sm:mt-8 sm:rounded-[2rem] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-300">Data and trust</p>
          <h2 className="mt-3 text-3xl font-black text-white">What powers The Matchroom</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
            The goal is to be useful and transparent. The Matchroom combines live sports feeds, fan preferences, browser notifications, and product analytics so we can learn what fans actually value.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {dataSources.map(([title, body]) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-black text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-400">{body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

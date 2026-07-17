import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';

const updates = [
  {
    title: 'Beta polish for early users',
    date: 'Latest',
    body: 'The homepage now gives first-time visitors a clearer path: create a matchroom, join a friend, or browse live football. The app also has a footer, privacy note, and clearer beta messaging.',
  },
  {
    title: 'Private fantasy matchday rooms',
    date: 'Recent',
    body: 'Fans can create private leagues, share invite links, build fantasy squads, make match predictions, and compete on global or private leaderboards.',
  },
  {
    title: 'Traction and feedback loop',
    date: 'Recent',
    body: 'The Matchroom now collects feedback, waitlist interest, anonymous product analytics, and admin traction signals so the product can be shaped around what fans actually use.',
  },
  {
    title: 'Live football foundation',
    date: 'Foundation',
    body: 'The platform brings together live match data, major league browsing, team and player pages, recent news, favorites, background alerts, comparisons, and match centers.',
  },
];

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-[#07120d] text-stone-100">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5 lg:px-10">
        <SiteNav />

        <section className="mt-4 rounded-[1.5rem] border border-white/10 bg-[#0b1b13] p-5 sm:mt-8 sm:rounded-[2rem] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">What&apos;s new</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-white sm:text-6xl">The Matchroom changelog</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-stone-300 sm:text-lg">
            A running snapshot of what has changed as The Matchroom moves from a fun football build into a sharper private matchday product.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link href="/fantasy/leagues" className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-[#07120d] hover:bg-emerald-300">
              Create a room
            </Link>
            <Link href="/about#feedback" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white hover:bg-white/10">
              Suggest an update
            </Link>
          </div>
        </section>

        <section className="mt-6 space-y-3 sm:mt-8">
          {updates.map((update) => (
            <article key={update.title} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-black text-white">{update.title}</h2>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                  {update.date}
                </span>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">{update.body}</p>
            </article>
          ))}
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}

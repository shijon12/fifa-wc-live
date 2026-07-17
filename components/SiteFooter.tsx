import Link from 'next/link';

const footerLinks = [
  { href: '/', label: 'Live football' },
  { href: '/fantasy/leagues', label: 'Create room' },
  { href: '/changelog', label: "What's new" },
  { href: '/about#data-sources', label: 'Data sources' },
  { href: '/about#feedback', label: 'Feedback' },
];

export function SiteFooter() {
  return (
    <footer className="mt-12 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 text-sm text-stone-400 sm:mt-16 sm:rounded-[2rem] sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-black text-white">The Matchroom</p>
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
              Early beta
            </span>
          </div>
          <p className="mt-3 max-w-2xl leading-6">
            A private matchday room for football fans: live context, fantasy groups, team alerts, stats, news, and the product loop we are shaping with early users.
          </p>
          <p className="mt-3 max-w-2xl leading-6 text-stone-500">
            Privacy note: The Matchroom uses sign-in, anonymous product analytics, feedback, notification preferences, and fantasy/private-league data to improve the app. We do not sell user data.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-stone-300 transition hover:bg-white/10 hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-stone-600">
        <span>Built by Shijon for football fans.</span>
        <span>Data can lag or vary by provider coverage during beta.</span>
      </div>
    </footer>
  );
}

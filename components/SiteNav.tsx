import Link from 'next/link';

const primaryLinks = [
  { href: '/', label: 'Live' },
  { href: '/statistics', label: 'Stats' },
  { href: '/fantasy', label: 'Fantasy' },
  { href: '/predictions', label: 'Predictions' },
];

const secondaryLinks = [
  { href: '/leagues', label: 'Leagues' },
  { href: '/about', label: 'About' },
  { href: '/about#feedback', label: 'Feedback' },
  { href: '/favorites', label: 'My Teams' },
  { href: '/compare', label: 'Compare' },
  { href: '/account', label: 'Account' },
];

export function SiteNav() {
  return (
    <nav className="sticky top-3 z-30 rounded-[1.4rem] border border-white/10 bg-[#07120d]/85 px-3 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl sm:rounded-3xl sm:px-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-emerald-400 text-sm font-black text-[#07120d] sm:h-10 sm:w-10 sm:text-base">TM</span>
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white sm:text-sm sm:tracking-[0.16em]">
              The Matchroom
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[9px] tracking-[0.18em] text-emerald-300">Beta</span>
            </span>
            <span className="block text-[10px] uppercase tracking-[0.26em] text-stone-500">Live football hub</span>
          </span>
        </Link>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035] p-1 sm:rounded-full">
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-stone-200 transition hover:bg-white/10 hover:text-white sm:px-4">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="no-scrollbar flex gap-1 overflow-x-auto px-1">
            {secondaryLinks.map((link) => (
              <Link key={link.href} href={link.href} className="shrink-0 rounded-full px-2.5 py-2 text-xs font-medium text-stone-400 transition hover:bg-white/10 hover:text-stone-200 sm:px-3">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

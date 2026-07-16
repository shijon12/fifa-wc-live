import Link from 'next/link';

const primaryLinks = [
  { href: '/', label: 'Live' },
  { href: '/statistics', label: 'Stats' },
  { href: '/fantasy', label: 'Fantasy' },
  { href: '/predictions', label: 'Predictions' },
];

const secondaryLinks = [
  { href: '/leagues', label: 'Leagues' },
  { href: '/favorites', label: 'My Teams' },
  { href: '/compare', label: 'Compare' },
  { href: '/account', label: 'Account' },
];

export function SiteNav() {
  return (
    <nav className="rounded-3xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400 font-black text-[#07120d]">FP</span>
          <span className="min-w-0">
            <span className="block text-sm font-black uppercase tracking-[0.16em] text-white">Football Pulse</span>
            <span className="block text-[10px] uppercase tracking-[0.26em] text-stone-500">Live football hub</span>
          </span>
        </Link>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.035] p-1">
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-stone-200 transition hover:bg-white/10 hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-1 overflow-x-auto px-1">
            {secondaryLinks.map((link) => (
              <Link key={link.href} href={link.href} className="shrink-0 rounded-full px-3 py-2 text-xs font-medium text-stone-500 transition hover:bg-white/10 hover:text-stone-200">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

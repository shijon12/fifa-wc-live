import Link from 'next/link';

const links = [
  { href: '/#matches', label: 'Matches' },
  { href: '/#groups', label: 'Standings' },
  { href: '/#bracket', label: 'Bracket' },
  { href: '/statistics', label: 'Stats' },
  { href: '/favorites', label: 'Favorites' },
  { href: '/leagues', label: 'Leagues' },
  { href: '/fantasy', label: 'Fantasy' },
  { href: '/compare', label: 'Compare' },
  { href: '/predictions', label: 'Predictions' },
];

export function SiteNav() {
  return (
    <nav className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
      <Link href="/" className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-400 font-black text-[#07120d]">26</span>
        <span className="min-w-0">
          <span className="block text-sm font-black uppercase tracking-[0.16em] text-white">World Cup</span>
          <span className="block text-[10px] uppercase tracking-[0.28em] text-stone-500">Live tracker</span>
        </span>
      </Link>
      <div className="grid w-full min-w-0 grid-cols-4 gap-1 sm:flex sm:w-auto sm:max-w-[72vw] sm:items-center sm:gap-2 sm:overflow-x-auto">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="min-w-0 truncate rounded-full px-1.5 py-2 text-center text-[11px] font-medium text-stone-300 transition hover:bg-white/10 hover:text-white sm:shrink-0 sm:px-4 sm:text-sm"
          >
            {link.label}
          </Link>
        ))}
        <span className="ml-1 hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300 sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live
        </span>
      </div>
    </nav>
  );
}

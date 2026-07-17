'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const primaryLinks = [
  { href: '/', label: 'Live' },
  { href: '/statistics', label: 'Stats' },
  { href: '/fantasy', label: 'Fantasy' },
  { href: '/predictions', label: 'Predictions' },
];

const secondaryLinks = [
  { href: '/leagues', label: 'Leagues' },
  { href: '/about', label: 'About' },
  { href: '/changelog', label: 'Updates' },
  { href: '/about#feedback', label: 'Feedback' },
  { href: '/favorites', label: 'My Teams' },
  { href: '/compare', label: 'Compare' },
  { href: '/account', label: 'Account' },
];

export function SiteNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState('');

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  return (
    <nav className="sticky top-3 z-30 rounded-[1.4rem] border border-white/10 bg-[#07120d]/90 px-3 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl sm:rounded-3xl sm:px-4">
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

        <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
          <div className="grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-white/[0.035] p-1 sm:flex sm:rounded-full">
            {primaryLinks.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} active={isActive(pathname, hash, link.href)} primary />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1 sm:flex sm:flex-wrap">
            {secondaryLinks.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} active={isActive(pathname, hash, link.href)} />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, label, active, primary = false }: { href: string; label: string; active: boolean; primary?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`rounded-full px-2.5 py-2 text-center transition sm:px-3 ${
        primary ? 'text-sm font-semibold' : 'text-xs font-medium'
      } ${
        active
          ? 'bg-emerald-400 text-[#07120d] shadow-lg shadow-emerald-950/20'
          : primary
            ? 'text-stone-200 hover:bg-white/10 hover:text-white'
            : 'text-stone-400 hover:bg-white/10 hover:text-stone-200'
      }`}
    >
      {label}
    </Link>
  );
}

function isActive(pathname: string, hash: string, href: string) {
  const [cleanHref, cleanHash] = href.split('#');
  if (cleanHash) return pathname === cleanHref && hash === `#${cleanHash}`;
  if (pathname === cleanHref && hash) return false;
  if (cleanHref === '/') return pathname === '/';
  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

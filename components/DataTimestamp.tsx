'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function DataTimestamp({ updatedAt, label = 'Data' }: { updatedAt: Date | string; label?: string }) {
  const router = useRouter();
  const date = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const [now, setNow] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => { const first = window.setTimeout(() => setNow(Date.now()), 0); const interval = window.setInterval(() => setNow(Date.now()), 15_000); return () => { window.clearTimeout(first); window.clearInterval(interval); }; }, []);
  const ageSeconds = now ? Math.max(0, Math.floor((now - validDate.getTime()) / 1000)) : Number.POSITIVE_INFINITY;
  const relative = ageSeconds < 10 ? 'just now' : ageSeconds < 60 ? `${ageSeconds}s ago` : ageSeconds < 3600 ? `${Math.floor(ageSeconds / 60)}m ago` : formatTimestamp(validDate);
  return <button type="button" onClick={() => { setRefreshing(true); router.refresh(); window.setTimeout(() => setRefreshing(false), 900); }} className="inline-flex rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500 transition hover:border-emerald-300/30 hover:text-emerald-200 sm:text-xs" title="Refresh this data">
    {label} · {refreshing ? 'Refreshing…' : `Updated ${relative}`}
  </button>;
}

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' }).format(date);
}

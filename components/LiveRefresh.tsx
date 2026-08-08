'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const LIVE_REFRESH_MS = 30_000;
const STANDARD_REFRESH_MS = 120_000;

export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const livePage = /^\/(matches|leagues|groups|statistics|predictions)/.test(window.location.pathname) || window.location.pathname === '/';
    const intervalMs = livePage ? LIVE_REFRESH_MS : STANDARD_REFRESH_MS;
    const refresh = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, intervalMs);

    return () => window.clearInterval(refresh);
  }, [router]);

  return null;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_INTERVAL_MS = 15_000;

export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refresh = window.setInterval(() => {
      router.refresh();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(refresh);
  }, [router]);

  return null;
}

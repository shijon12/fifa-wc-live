'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const IDLE_LIMIT_MS = 20 * 60 * 1000;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVITY_EVENTS = ['click', 'keydown', 'pointermove', 'scroll', 'touchstart'] as const;

export function SessionTimeoutGuard() {
  const router = useRouter();
  const lastActivityRef = useRef(0);
  const authenticatedRef = useRef(false);
  const signedOutRef = useRef(false);

  useEffect(() => {
    lastActivityRef.current = Date.now();

    function markActive() {
      lastActivityRef.current = Date.now();
    }

    async function signOutForIdle() {
      if (signedOutRef.current) return;
      signedOutRef.current = true;
      await fetch('/api/auth/signout', { method: 'POST' }).catch(() => undefined);
      router.push('/sign-in?reason=idle');
      router.refresh();
    }

    async function checkSession() {
      const idleMs = Date.now() - lastActivityRef.current;
      if (authenticatedRef.current && idleMs >= IDLE_LIMIT_MS) {
        await signOutForIdle();
        return;
      }
      const response = await fetch('/api/auth/me', { cache: 'no-store' }).catch(() => null);
      if (response?.ok) {
        const data = await response.json().catch(() => ({ user: null })) as { user?: unknown };
        authenticatedRef.current = Boolean(data.user);
        if (!data.user) signedOutRef.current = false;
      }
    }

    ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, markActive, { passive: true }));
    const interval = window.setInterval(() => { void checkSession(); }, REFRESH_INTERVAL_MS);
    void checkSession();

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, markActive));
      window.clearInterval(interval);
    };
  }, [router]);

  return null;
}

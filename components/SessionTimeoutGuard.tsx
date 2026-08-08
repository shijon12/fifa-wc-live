'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const IDLE_LIMIT_MS = 20 * 60 * 1000;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const WARNING_AT_MS = 18 * 60 * 1000;
const ACTIVITY_EVENTS = ['click', 'keydown', 'pointermove', 'scroll', 'touchstart'] as const;

export function SessionTimeoutGuard() {
  const router = useRouter();
  const lastActivityRef = useRef(0);
  const authenticatedRef = useRef(false);
  const signedOutRef = useRef(false);
  const lastSessionCheckRef = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    lastActivityRef.current = Date.now();

    function markActive() {
      lastActivityRef.current = Date.now();
      setSecondsLeft(null);
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
      setSecondsLeft(authenticatedRef.current && idleMs >= WARNING_AT_MS ? Math.max(0, Math.ceil((IDLE_LIMIT_MS - idleMs) / 1000)) : null);
      if (authenticatedRef.current && idleMs >= IDLE_LIMIT_MS) {
        await signOutForIdle();
        return;
      }
      if (Date.now() - lastSessionCheckRef.current < REFRESH_INTERVAL_MS) return;
      lastSessionCheckRef.current = Date.now();
      const response = await fetch('/api/auth/me', { cache: 'no-store' }).catch(() => null);
      if (response?.ok) {
        const data = await response.json().catch(() => ({ user: null })) as { user?: unknown };
        authenticatedRef.current = Boolean(data.user);
        if (!data.user) signedOutRef.current = false;
      }
    }

    ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, markActive, { passive: true }));
    const interval = window.setInterval(() => { void checkSession(); }, 15_000);
    void checkSession();

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, markActive));
      window.clearInterval(interval);
    };
  }, [router]);

  if (secondsLeft === null) return null;
  return <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-lg rounded-2xl border border-amber-300/30 bg-[#17130b]/95 p-4 text-amber-50 shadow-2xl backdrop-blur">
    <p className="font-black">Your session expires in about {Math.max(1, Math.ceil(secondsLeft / 60))} minute.</p>
    <p className="mt-1 text-sm leading-5 text-amber-100/75">Unsaved chat drafts stay on this device. Continue now to remain signed in.</p>
    <button type="button" onClick={() => { lastActivityRef.current = Date.now(); setSecondsLeft(null); void fetch('/api/auth/me', { cache: 'no-store' }); }} className="mt-3 rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-[#171006]">Keep me signed in</button>
  </div>;
}

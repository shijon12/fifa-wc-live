'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'matchroom-onboarding-dismissed-v1';

const steps = [
  {
    title: 'Build your squad',
    body: 'Pick 15 players, choose your starting XI, captain, and vice-captain.',
    href: '/fantasy?tab=squad',
    action: 'Build squad',
  },
  {
    title: 'Create or join a room',
    body: 'Start a private league for your group chat or join one with an invite code.',
    href: '/fantasy?tab=leagues',
    action: 'Open rooms',
  },
  {
    title: 'Invite friends',
    body: 'Share the room link. Friends see the room before they are asked to sign in.',
    href: '/fantasy?tab=leagues',
    action: 'Share invite',
  },
  {
    title: 'Return on matchday',
    body: 'Check the room table, talk football, and follow live scores together.',
    href: '/fantasy?tab=leagues',
    action: 'Open matchroom',
  },
];

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === 'true');
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <section className="mt-6 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/[0.06] p-5 sm:rounded-[2rem] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-300">Start here</p>
          <h2 className="mt-2 text-2xl font-black text-white">Set up your matchroom in a minute.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/75">
            This is the quickest path from a fresh account to a useful matchday room.
          </p>
        </div>
        <button type="button" onClick={dismiss} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-stone-300 hover:bg-white/10">
          Hide guide
        </button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <Link key={step.title} href={step.href} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-400/30 hover:bg-black/30">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-400 text-sm font-black text-[#07120d]">{index + 1}</span>
            <h3 className="mt-3 font-black text-white">{step.title}</h3>
            <p className="mt-1 text-sm leading-6 text-emerald-50/70">{step.body}</p>
            <span className="mt-3 inline-flex text-sm font-bold text-emerald-300">{step.action} →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const scenes = [
  {
    eyebrow: 'Create the room',
    title: "Shijon's Matchroom",
    body: 'Start a private league for your friends, office, or group chat.',
    cta: 'Room created',
  },
  {
    eyebrow: 'Share the invite',
    title: 'Invite code: TM2026',
    body: 'Send one link. Friends sign in and join the same private room.',
    cta: '3 friends joined',
  },
  {
    eyebrow: 'Make matchday picks',
    title: 'Argentina vs Spain',
    body: 'Pick winners, choose confidence, build a squad, and select a captain.',
    cta: 'Picks saved',
  },
  {
    eyebrow: 'Watch the table move',
    title: 'Room leaderboard',
    body: 'Scores update as squads and predictions earn points.',
    cta: 'Matchday is alive',
  },
];

const leaderboard = [
  { name: 'Shijon', score: 84, movement: '+12' },
  { name: 'Amir', score: 79, movement: '+9' },
  { name: 'Priya', score: 72, movement: '+6' },
];

export function FantasyLeagueSimulation() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActive((index) => (index + 1) % scenes.length);
    }, 2600);
    return () => window.clearInterval(interval);
  }, []);

  const scene = scenes[active];
  const progress = useMemo(() => ((active + 1) / scenes.length) * 100, [active]);

  return (
    <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_80%_15%,rgba(16,185,129,0.16),transparent_32%),rgba(255,255,255,0.035)] p-5 sm:mt-10 sm:rounded-[2rem] sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Fantasy room walkthrough</p>
          <h2 className="mt-2 text-3xl font-black text-white">See how a private matchroom works.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
            A quick simulation for new users: create a room, invite friends, make picks, and use the room leaderboard as your matchday scoreboard.
          </p>
          <div className="mt-6 grid gap-2">
            {scenes.map((item, index) => (
              <button
                key={item.eyebrow}
                type="button"
                onClick={() => setActive(index)}
                className={`rounded-2xl border p-3 text-left transition ${
                  active === index
                    ? 'border-emerald-300/30 bg-emerald-300/10'
                    : 'border-white/10 bg-black/20 hover:bg-white/[0.06]'
                }`}
              >
                <p className={`text-xs font-black uppercase tracking-[0.18em] ${active === index ? 'text-emerald-300' : 'text-stone-500'}`}>Step {index + 1}</p>
                <p className="mt-1 font-bold text-white">{item.eyebrow}</p>
              </button>
            ))}
          </div>
          <Link href="/fantasy/leagues" className="mt-5 inline-flex rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-[#07120d] hover:bg-emerald-300">
            Create or join a room
          </Link>
        </div>

        <div className="rounded-[1.5rem] border border-emerald-400/20 bg-[#08130e] p-3 shadow-2xl shadow-black/30 sm:rounded-[2rem] sm:p-4">
          <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">
                Live simulation
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-[#0b1b13]">
              <div className="border-b border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">{scene.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-black text-white">{scene.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-400">{scene.body}</p>
              </div>

              <div className="grid gap-3 p-4 md:grid-cols-[1fr_0.9fr]">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Match pick</p>
                  <div className="mt-4 space-y-3">
                    <SimTeam name="Argentina" score={active >= 2 ? '2' : '–'} selected={active >= 2} />
                    <SimTeam name="Spain" score={active >= 2 ? '1' : '–'} selected={false} />
                  </div>
                  <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">{scene.cta}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Leaderboard</p>
                  <div className="mt-4 space-y-2">
                    {leaderboard.map((row, index) => (
                      <div key={row.name} className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${active === 3 && index === 0 ? 'bg-emerald-400/15' : 'bg-white/[0.04]'}`}>
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-xs font-black text-white">{index + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{row.name}</span>
                        <span className="text-xs font-bold text-emerald-300">{active === 3 ? row.movement : '+0'}</span>
                        <span className="font-black tabular-nums text-white">{active === 3 ? row.score : row.score - Number(row.movement.slice(1))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="h-1 bg-white/10">
                <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SimTeam({ name, score, selected }: { name: string; score: string; selected: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${selected ? 'border-emerald-300/30 bg-emerald-300/10' : 'border-white/10 bg-white/[0.03]'}`}>
      <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-black text-white">{name.slice(0, 3).toUpperCase()}</span>
      <span className="min-w-0 flex-1 truncate font-bold text-white">{name}</span>
      <span className="text-xl font-black tabular-nums text-white">{score}</span>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LeagueMatch } from '@/lib/leagueData';

type PickChoice = 'home' | 'draw' | 'away';
type SavedPick = { matchId: string; choice: PickChoice; confidence: number };
type FantasyState = { managerName: string; picks: Record<string, SavedPick> };
type LeaderboardRow = { userId: string; managerName: string; score: number; picks: number; updatedAt: string | null };

const STORAGE_KEY = 'fifa-wc-fantasy-picks-v1';
const DEFAULT_STATE: FantasyState = { managerName: 'Guest Manager', picks: {} };

function readSavedState(): FantasyState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_STATE;
    const parsed = JSON.parse(saved) as Partial<FantasyState>;
    return { managerName: parsed.managerName ?? DEFAULT_STATE.managerName, picks: parsed.picks ?? DEFAULT_STATE.picks };
  } catch {
    return DEFAULT_STATE;
  }
}

export function FantasyLeagueGame({ matches }: { matches: LeagueMatch[] }) {
  const [{ managerName, picks }, setFantasyState] = useState(readSavedState);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'saved' | 'saving' | 'offline'>('loading');
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const loadedAccountRef = useRef(false);
  const lastSavedSnapshotRef = useRef('');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ managerName, picks }));
  }, [managerName, picks]);

  useEffect(() => {
    let active = true;
    async function loadFantasy() {
      try {
        const [profileResponse, leaderboardResponse] = await Promise.all([
          fetch('/api/fantasy/picks'),
          fetch('/api/fantasy/leaderboard'),
        ]);
        if (!active) return;
        if (profileResponse.ok) {
          const data = await profileResponse.json() as { fantasy?: FantasyState };
          if (data.fantasy) {
            setFantasyState(data.fantasy);
            lastSavedSnapshotRef.current = JSON.stringify(data.fantasy);
          } else {
            lastSavedSnapshotRef.current = JSON.stringify(DEFAULT_STATE);
          }
          loadedAccountRef.current = true;
          setSyncStatus('saved');
        } else {
          loadedAccountRef.current = true;
          setSyncStatus('offline');
        }
        if (leaderboardResponse.ok) {
          const data = await leaderboardResponse.json() as { leaderboard?: LeaderboardRow[] };
          setLeaderboard(data.leaderboard ?? []);
        }
      } catch {
        if (active) {
          loadedAccountRef.current = true;
          setSyncStatus('offline');
        }
      }
    }
    loadFantasy();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!loadedAccountRef.current) return;
    const snapshot = JSON.stringify({ managerName, picks });
    if (snapshot === lastSavedSnapshotRef.current) return;
    const timeout = window.setTimeout(async () => {
      setSyncStatus('saving');
      try {
        const response = await fetch('/api/fantasy/picks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ managerName, picks }),
        });
        if (response.ok) {
          lastSavedSnapshotRef.current = snapshot;
          setSyncStatus('saved');
        } else {
          setSyncStatus('offline');
        }
      } catch {
        setSyncStatus('offline');
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [managerName, picks]);

  const settled = useMemo(() => matches.filter((match) => match.state === 'post' && match.homeScore !== null && match.awayScore !== null), [matches]);
  const score = settled.reduce((total, match) => total + scorePick(match, picks[match.id]), 0);
  const activePicks = Object.keys(picks).length;
  const upcoming = matches.filter((match) => match.state !== 'post').slice(0, 36);

  function savePick(match: LeagueMatch, choice: PickChoice) {
    setFantasyState((current) => ({
      ...current,
      picks: {
        ...current.picks,
        [match.id]: { matchId: match.id, choice, confidence: current.picks[match.id]?.confidence ?? 1 },
      },
    }));
  }

  function updateConfidence(matchId: string, confidence: number) {
    setFantasyState((current) => current.picks[matchId]
      ? { ...current, picks: { ...current.picks, [matchId]: { ...current.picks[matchId], confidence } } }
      : current);
  }

  function clearPicks() {
    setFantasyState((current) => ({ ...current, picks: {} }));
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-[#0b1b13] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Fantasy picks league</p>
        <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">Pick matches. Climb the table.</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-stone-300 sm:text-lg">
              Choose winners across the World Cup and major global leagues. Confidence points multiply correct picks once final scores arrive from the live feed.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500" htmlFor="managerName">Manager name</label>
            <input id="managerName" value={managerName} onChange={(event) => setFantasyState((current) => ({ ...current, managerName: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none ring-emerald-400/30 focus:ring-4" />
          </div>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-4">
          <Metric value={score} label="Current points" accent />
          <Metric value={activePicks} label="Picks saved" />
          <Metric value={settled.length} label="Settled matches" />
          <Metric value={upcoming.length} label="Open fixtures" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Sync status: {syncStatus === 'loading' ? 'loading account picks' : syncStatus === 'saving' ? 'saving to account' : syncStatus === 'saved' ? 'saved to your account' : 'local fallback active'}
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">How scoring works</p>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              Correct winner: 3 points × confidence. Correct draw: 5 points × confidence. Wrong pick: 0. Picks sync to your signed-in account and keep a local fallback.
            </p>
          </div>
          <button type="button" onClick={clearPicks} className="rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-400/20">
            Clear picks
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Global leaderboard</p>
            <h2 className="mt-2 text-2xl font-black text-white">Fantasy table</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-stone-400">Top {leaderboard.length}</span>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          {leaderboard.length ? leaderboard.map((row, index) => (
            <div key={row.userId} className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-0">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-sm font-black text-white">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{row.managerName}</p>
                <p className="text-xs text-stone-500">{row.picks} picks saved</p>
              </div>
              <span className="text-2xl font-black text-emerald-300">{row.score}</span>
            </div>
          )) : <p className="p-4 text-sm text-stone-500">No leaderboard entries yet. Save a pick to appear here.</p>}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {upcoming.map((match) => {
          const pick = picks[match.id];
          return (
            <article key={match.id} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-semibold text-emerald-200">{match.league}</span>
                <span className="text-stone-500">{match.date} · {match.kickoff}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <PickButton selected={pick?.choice === 'home'} label={match.homeTeam} badge={match.homeBadge} onClick={() => savePick(match, 'home')} />
                <button type="button" onClick={() => savePick(match, 'draw')} className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${pick?.choice === 'draw' ? 'border-amber-300 bg-amber-300/20 text-amber-100' : 'border-white/10 bg-black/20 text-stone-300 hover:bg-white/10'}`}>Draw</button>
                <PickButton selected={pick?.choice === 'away'} label={match.awayTeam} badge={match.awayBadge} onClick={() => savePick(match, 'away')} />
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-stone-300" htmlFor={`confidence-${match.id}`}>Confidence</label>
                  <span className="text-lg font-black text-white">{pick?.confidence ?? 1}x</span>
                </div>
                <input id={`confidence-${match.id}`} type="range" min="1" max="5" value={pick?.confidence ?? 1} disabled={!pick} onChange={(event) => updateConfidence(match.id, Number(event.target.value))} className="mt-3 w-full accent-emerald-400 disabled:opacity-30" />
                <p className="mt-2 text-xs text-stone-500">{pick ? `Saved pick for ${managerName || 'Guest Manager'}.` : 'Pick a result to unlock confidence points.'}</p>
              </div>
            </article>
          );
        })}
      </section>

      {upcoming.length === 0 && <div className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-6 text-amber-100">No open fixtures are available in the current feed window. Check back when new matches are posted.</div>}
    </div>
  );
}

function PickButton({ selected, label, badge, onClick }: { selected: boolean; label: string; badge: string | null; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition ${selected ? 'border-emerald-300 bg-emerald-300/15 text-white' : 'border-white/10 bg-black/20 text-stone-300 hover:bg-white/10'}`}>
      {badge ? <span className="h-8 w-8 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${badge}")` }} /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black">{label.slice(0, 2)}</span>}
      <span className="min-w-0 truncate font-bold">{label}</span>
    </button>
  );
}

function Metric({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${accent ? 'border-emerald-300/20 bg-emerald-300/10' : 'border-white/10 bg-white/[0.035]'}`}><p className={`text-2xl font-black tabular-nums ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</p><p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">{label}</p></div>;
}

function scorePick(match: LeagueMatch, pick: SavedPick | undefined) {
  if (!pick || match.homeScore === null || match.awayScore === null || match.state !== 'post') return 0;
  const result: PickChoice = match.homeScore > match.awayScore ? 'home' : match.homeScore < match.awayScore ? 'away' : 'draw';
  if (pick.choice !== result) return 0;
  return (result === 'draw' ? 5 : 3) * pick.confidence;
}

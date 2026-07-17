'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LeagueMatch } from '@/lib/leagueData';
import { FANTASY_BUDGET, FANTASY_SQUAD_SIZE, squadCost, squadPoints, type FantasyPlayer } from '@/lib/fantasySquad';

type PickChoice = 'home' | 'draw' | 'away';
type SavedPick = { matchId: string; choice: PickChoice; confidence: number };
type FantasyState = {
  managerName: string;
  picks: Record<string, SavedPick>;
  squad: { playerIds: string[]; captainId: string | null };
};
type LeaderboardRow = {
  userId: string;
  managerName: string;
  score: number;
  squadScore?: number;
  totalScore?: number;
  picks: number;
  squadPlayers?: number;
  updatedAt: string | null;
};

const STORAGE_KEY = 'fifa-wc-fantasy-picks-v1';
const DEFAULT_STATE: FantasyState = { managerName: 'Guest Manager', picks: {}, squad: { playerIds: [], captainId: null } };
type FantasyTab = 'squad' | 'predictions' | 'leaderboard';

function readSavedState(): FantasyState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_STATE;
    const parsed = JSON.parse(saved) as Partial<FantasyState>;
    return {
      managerName: parsed.managerName ?? DEFAULT_STATE.managerName,
      picks: parsed.picks ?? {},
      squad: parsed.squad ?? DEFAULT_STATE.squad,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function readInitialTab(): FantasyTab {
  if (typeof window === 'undefined') return 'squad';
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab === 'predictions' || tab === 'leaderboard' || tab === 'squad') return tab;
  return 'squad';
}

export function FantasyLeagueGame({ matches, players }: { matches: LeagueMatch[]; players: FantasyPlayer[] }) {
  const [{ managerName, picks, squad }, setFantasyState] = useState(readSavedState);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'saved' | 'saving' | 'offline'>('loading');
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [activeTab, setActiveTab] = useState<FantasyTab>(readInitialTab);
  const loadedAccountRef = useRef(false);
  const lastSavedSnapshotRef = useRef('');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ managerName, picks, squad }));
  }, [managerName, picks, squad]);

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
          const data = await profileResponse.json() as { fantasy?: Partial<FantasyState> };
          const profile = { ...DEFAULT_STATE, ...data.fantasy, squad: data.fantasy?.squad ?? DEFAULT_STATE.squad };
          setFantasyState(profile);
          lastSavedSnapshotRef.current = JSON.stringify(profile);
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
    const snapshot = JSON.stringify({ managerName, picks, squad });
    if (snapshot === lastSavedSnapshotRef.current) return;
    const timeout = window.setTimeout(async () => {
      setSyncStatus('saving');
      try {
        const response = await fetch('/api/fantasy/picks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ managerName, picks, squad }),
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
  }, [managerName, picks, squad]);

  const settled = useMemo(() => matches.filter((match) => match.state === 'post' && match.homeScore !== null && match.awayScore !== null), [matches]);
  const predictionScore = settled.reduce((total, match) => total + scorePick(match, picks[match.id]), 0);
  const selectedIds = new Set(squad.playerIds);
  const selectedPlayers = players.filter((player) => selectedIds.has(player.id));
  const currentSquadCost = squadCost(players, squad);
  const squadScore = squadPoints(players, squad);
  const upcoming = matches.filter((match) => match.state !== 'post').slice(0, 30);

  function updateState(next: Partial<FantasyState>) {
    setFantasyState((current) => ({ ...current, ...next }));
  }

  function savePick(match: LeagueMatch, choice: PickChoice) {
    setFantasyState((current) => ({
      ...current,
      picks: { ...current.picks, [match.id]: { matchId: match.id, choice, confidence: current.picks[match.id]?.confidence ?? 1 } },
    }));
  }

  function updateConfidence(matchId: string, confidence: number) {
    setFantasyState((current) => current.picks[matchId]
      ? { ...current, picks: { ...current.picks, [matchId]: { ...current.picks[matchId], confidence } } }
      : current);
  }

  function togglePlayer(player: FantasyPlayer) {
    setFantasyState((current) => {
      const ids = new Set(current.squad.playerIds);
      if (ids.has(player.id)) ids.delete(player.id);
      else {
        if (ids.size >= FANTASY_SQUAD_SIZE) return current;
        const nextIds = [...Array.from(ids), player.id];
        if (squadCost(players, { playerIds: nextIds, captainId: current.squad.captainId }) > FANTASY_BUDGET) return current;
        ids.add(player.id);
      }
      const playerIds = Array.from(ids);
      return { ...current, squad: { playerIds, captainId: current.squad.captainId && playerIds.includes(current.squad.captainId) ? current.squad.captainId : playerIds[0] ?? null } };
    });
  }

  function setCaptain(playerId: string) {
    if (!squad.playerIds.includes(playerId)) return;
    updateState({ squad: { ...squad, captainId: playerId } });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-[#0b1b13] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Private fantasy + matchday groups</p>
        <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">Create a room. Pick your squad. Invite friends.</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-stone-300 sm:text-lg">
              The Matchroom is focused on private fantasy groups for football fans: follow the matchday, make picks, compete with friends, and share one invite link.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <OnboardingStep step="1" title="Sign in" body="Save your squad." />
              <OnboardingStep step="2" title="Create room" body="Start a private league." />
              <OnboardingStep step="3" title="Make picks" body="Choose squad + results." />
              <OnboardingStep step="4" title="Invite friends" body="Share the link." />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/fantasy/leagues" className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-[#07120d] hover:bg-emerald-300">
                Create private league
              </Link>
              <button type="button" onClick={() => setActiveTab('squad')} className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white hover:bg-white/10">
                Pick squad
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500" htmlFor="managerName">Manager name</label>
            <input id="managerName" value={managerName} onChange={(event) => updateState({ managerName: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none ring-emerald-400/30 focus:ring-4" />
          </div>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-4">
          <Metric value={squadScore + predictionScore} label="Total points" accent />
          <Metric value={squadScore} label="Squad points" />
          <Metric value={predictionScore} label="Prediction points" />
          <Metric value={selectedPlayers.length} label="Squad players" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Sync status: {syncStatus === 'loading' ? 'loading account' : syncStatus === 'saving' ? 'saving to account' : syncStatus === 'saved' ? 'saved to your account' : 'local fallback active'}
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-2">
        <div className="grid gap-1 sm:grid-cols-3">
          <TabButton active={activeTab === 'squad'} onClick={() => setActiveTab('squad')} label="Squad" description="Pick your XI" />
          <TabButton active={activeTab === 'predictions'} onClick={() => setActiveTab('predictions')} label="Predictions" description="Match picks" />
          <TabButton active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} label="Leaderboard" description="Global table" />
        </div>
      </section>

      {activeTab === 'squad' && <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.055] p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Fantasy squad</p>
            <h2 className="mt-2 text-3xl font-black text-white">Pick your XI</h2>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              Budget {FANTASY_BUDGET}. Select {FANTASY_SQUAD_SIZE} players from the live World Cup player pool. Captain earns double points.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric value={selectedPlayers.length} label={`of ${FANTASY_SQUAD_SIZE}`} />
              <Metric value={Number((FANTASY_BUDGET - currentSquadCost).toFixed(1))} label="Budget left" accent />
              <Metric value={squadScore} label="Squad pts" />
              <Metric value={Number(currentSquadCost.toFixed(1))} label="Cost" />
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="font-bold text-white">Your squad</h3>
              <div className="mt-3 space-y-2">
                {selectedPlayers.length ? selectedPlayers.map((player) => (
                  <div key={player.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-stone-300">{player.name}</span>
                    <button type="button" onClick={() => setCaptain(player.id)} className={`rounded-full px-2 py-1 text-[11px] font-bold ${squad.captainId === player.id ? 'bg-amber-300 text-[#07120d]' : 'bg-white/10 text-stone-400'}`}>
                      {squad.captainId === player.id ? 'Captain' : 'Make C'}
                    </button>
                  </div>
                )) : (
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                    <p className="font-bold text-emerald-100">Your squad is empty.</p>
                    <p className="mt-1 text-sm leading-5 text-emerald-100/75">
                      Pick 11 players from the pool, stay under budget, then choose a captain for double points.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid max-h-[760px] gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
            {players.slice(0, 120).map((player) => {
              const selected = selectedIds.has(player.id);
              const disabled = !selected && (selectedPlayers.length >= FANTASY_SQUAD_SIZE || currentSquadCost + player.price > FANTASY_BUDGET);
              return (
                <button key={player.id} type="button" onClick={() => togglePlayer(player)} disabled={disabled} className={`rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${selected ? 'border-emerald-300 bg-emerald-300/15' : 'border-white/10 bg-black/20 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-3">
                    {player.headshot ? <span className="h-11 w-11 shrink-0 rounded-full bg-cover bg-top" style={{ backgroundImage: `url("${player.headshot}")` }} /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-white">{player.name.slice(0, 2)}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white">{player.name}</p>
                      <p className="truncate text-xs text-stone-500">{player.team} · {player.position}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <MiniStat label="Pts" value={player.points} />
                    <MiniStat label="Price" value={player.price} />
                    <MiniStat label="Goals" value={player.goals} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>}

      {activeTab === 'leaderboard' && <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
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
                <p className="text-xs text-stone-500">{row.squadPlayers ?? 0} squad players · {row.picks} picks</p>
              </div>
              <span className="text-2xl font-black text-emerald-300">{row.totalScore ?? row.score}</span>
            </div>
          )) : (
            <div className="p-5">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-xl font-black text-white">Start the first league.</p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/80">
                  The leaderboard appears once fans save squads or picks. Create a private league, invite friends, and be the first room on the table.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/fantasy/leagues" className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-[#07120d] hover:bg-emerald-300">
                    Create league
                  </Link>
                  <button type="button" onClick={() => setActiveTab('squad')} className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">
                    Build squad
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>}

      {activeTab === 'predictions' && <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Prediction league</p>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              Correct winner: 3 points × confidence. Correct draw: 5 points × confidence. Wrong pick: 0. This is separate from the classic fantasy squad score.
            </p>
          </div>
          <button type="button" onClick={() => updateState({ picks: {} })} className="rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-400/20">
            Clear picks
          </button>
        </div>
      </section>}

      {activeTab === 'predictions' && <section className="grid gap-4 xl:grid-cols-2">
        {upcoming.length ? upcoming.map((match) => {
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
              </div>
            </article>
          );
        }) : (
          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 xl:col-span-2">
            <p className="text-xl font-black text-white">No open prediction fixtures right now.</p>
            <p className="mt-2 text-sm leading-6 text-amber-100/80">
              Once upcoming fixtures are available in the live feed, they will appear here for match picks and confidence scoring.
            </p>
            <Link href="/leagues" className="mt-4 inline-flex rounded-full border border-amber-300/20 px-4 py-2 text-sm font-bold text-amber-100 hover:bg-amber-300/10">
              Browse live football
            </Link>
          </div>
        )}
      </section>}
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

function TabButton({ active, onClick, label, description }: { active: boolean; onClick: () => void; label: string; description: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-left transition ${active ? 'bg-emerald-400 text-[#07120d]' : 'text-stone-400 hover:bg-white/10 hover:text-white'}`}
    >
      <span className="block text-sm font-black">{label}</span>
      <span className={`mt-0.5 block text-xs ${active ? 'text-[#07120d]/70' : 'text-stone-600'}`}>{description}</span>
    </button>
  );
}

function OnboardingStep({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-400 text-xs font-black text-[#07120d]">{step}</span>
      <p className="mt-3 font-black text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-stone-500">{body}</p>
    </div>
  );
}

function Metric({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${accent ? 'border-emerald-300/20 bg-emerald-300/10' : 'border-white/10 bg-white/[0.035]'}`}><p className={`text-2xl font-black tabular-nums ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</p><p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">{label}</p></div>;
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <span className="rounded-xl bg-white/[0.06] px-2 py-1"><span className="block font-black text-white">{value}</span><span className="text-[10px] uppercase tracking-wider text-stone-500">{label}</span></span>;
}

function scorePick(match: LeagueMatch, pick: SavedPick | undefined) {
  if (!pick || match.homeScore === null || match.awayScore === null || match.state !== 'post') return 0;
  const result: PickChoice = match.homeScore > match.awayScore ? 'home' : match.homeScore < match.awayScore ? 'away' : 'draw';
  if (pick.choice !== result) return 0;
  return (result === 'draw' ? 5 : 3) * pick.confidence;
}

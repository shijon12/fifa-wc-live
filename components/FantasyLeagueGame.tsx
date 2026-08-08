'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FantasyVirtualAgent } from '@/components/FantasyVirtualAgent';
import { PrivateLeaguesManager } from '@/components/PrivateLeaguesManager';
import { FantasyGameweekManager } from '@/components/FantasyGameweekManager';
import type { LeagueMatch } from '@/lib/leagueData';
import { FANTASY_BUDGET, FANTASY_SQUAD_SIZE, squadCost, squadPoints, type FantasyGameStatus, type FantasyPlayer, type FantasySquad } from '@/lib/fantasySquad';

type PickChoice = 'home' | 'draw' | 'away';
type SavedPick = { matchId: string; choice: PickChoice; confidence: number };
type FantasyState = {
  managerName: string;
  picks: Record<string, SavedPick>;
  squad: FantasySquad;
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
const DEFAULT_STATE: FantasyState = { managerName: 'Guest Manager', picks: {}, squad: { playerIds: [], starterIds: [], captainId: null, viceCaptainId: null } };
type FantasyTab = 'squad' | 'leagues' | 'predictions' | 'leaderboard';

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
  if (tab === 'predictions' || tab === 'leaderboard' || tab === 'squad' || tab === 'leagues') return tab;
  return 'squad';
}

export function FantasyLeagueGame({ matches, players, gameStatus }: { matches: LeagueMatch[]; players: FantasyPlayer[]; gameStatus: FantasyGameStatus }) {
  const [{ managerName, picks, squad }, setFantasyState] = useState(readSavedState);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'saved' | 'saving' | 'offline'>('loading');
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [predictionLeaderboard, setPredictionLeaderboard] = useState<LeaderboardRow[]>([]);
  const [leaderboardMode, setLeaderboardMode] = useState<'fantasy' | 'predictions'>('fantasy');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<FantasyTab>(readInitialTab);
  const [playerSearch, setPlayerSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [playerLimit, setPlayerLimit] = useState(36);
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
          const rawProfile = { ...DEFAULT_STATE, ...data.fantasy, squad: data.fantasy?.squad ?? DEFAULT_STATE.squad };
          const profile = { ...rawProfile, squad: sanitizeSquad(rawProfile.squad, players) };
          setFantasyState(profile);
          lastSavedSnapshotRef.current = JSON.stringify(rawProfile);
          loadedAccountRef.current = true;
          setSyncStatus('saved');
        } else {
          loadedAccountRef.current = true;
          setSyncStatus('offline');
        }
        if (leaderboardResponse.ok) {
          const data = await leaderboardResponse.json() as { leaderboard?: LeaderboardRow[]; fantasyLeaderboard?: LeaderboardRow[]; predictionLeaderboard?: LeaderboardRow[] };
          setLeaderboard(data.fantasyLeaderboard ?? data.leaderboard ?? []);
          setPredictionLeaderboard(data.predictionLeaderboard ?? []);
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
  }, [players]);

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
          setSavedAt(new Date());
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
  const starterIds = new Set(squad.starterIds ?? []);
  const currentSquadCost = squadCost(players, squad);
  const squadScore = squadPoints(players, squad);
  const upcoming = matches.filter((match) => match.state !== 'post').slice(0, 30);
  const filteredPlayers = players.filter((player) => {
    const matchesSearch = !playerSearch.trim() || `${player.name} ${player.team}`.toLowerCase().includes(playerSearch.trim().toLowerCase());
    return matchesSearch && (positionFilter === 'all' || fantasyPosition(player.position) === positionFilter);
  });
  const visiblePlayers = filteredPlayers.slice(0, playerLimit);

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
        const sameClub = players.filter((entry) => ids.has(entry.id) && entry.teamId === player.teamId).length;
        if (sameClub >= 3) return current;
        const positionLimit = /goalkeeper|\bgk\b/i.test(player.position) ? 2 : /defender|back|\bdf\b/i.test(player.position) ? 5 : /midfielder|midfield|\bmf\b/i.test(player.position) ? 5 : 3;
        const samePosition = players.filter((entry) => ids.has(entry.id) && fantasyPosition(entry.position) === fantasyPosition(player.position)).length;
        if (samePosition >= positionLimit) return current;
        const nextIds = [...Array.from(ids), player.id];
        if (squadCost(players, { ...current.squad, playerIds: nextIds }) > FANTASY_BUDGET) return current;
        ids.add(player.id);
      }
      const playerIds = Array.from(ids);
      const currentStarters = (current.squad.starterIds ?? []).filter((id) => playerIds.includes(id));
      const nextStarters = playerIds.includes(player.id) && currentStarters.length < 11 ? [...currentStarters, player.id] : currentStarters;
      const benchIds = [...(current.squad.benchIds ?? []).filter((id) => playerIds.includes(id) && !nextStarters.includes(id)), ...playerIds.filter((id) => !nextStarters.includes(id) && !(current.squad.benchIds ?? []).includes(id))].slice(0, 4);
      const captainId = current.squad.captainId && nextStarters.includes(current.squad.captainId) ? current.squad.captainId : nextStarters[0] ?? null;
      const viceCaptainId = current.squad.viceCaptainId && nextStarters.includes(current.squad.viceCaptainId) && current.squad.viceCaptainId !== captainId
        ? current.squad.viceCaptainId : nextStarters.find((id) => id !== captainId) ?? null;
      return { ...current, squad: { playerIds, starterIds: nextStarters, benchIds, captainId, viceCaptainId } };
    });
  }

  function setCaptain(playerId: string) {
    if (!starterIds.has(playerId)) return;
    updateState({ squad: { ...squad, captainId: playerId, viceCaptainId: squad.viceCaptainId === playerId ? null : squad.viceCaptainId } });
  }

  function setViceCaptain(playerId: string) {
    if (!starterIds.has(playerId) || squad.captainId === playerId) return;
    updateState({ squad: { ...squad, viceCaptainId: playerId } });
  }

  function toggleStarter(playerId: string) {
    if (!squad.playerIds.includes(playerId)) return;
    const next = new Set(squad.starterIds ?? []);
    if (next.has(playerId)) next.delete(playerId);
    else if (next.size < 11) next.add(playerId);
    const nextStarters = Array.from(next);
    const benchIds = [...(squad.benchIds ?? []).filter((id) => squad.playerIds.includes(id) && !next.has(id)), ...squad.playerIds.filter((id) => !next.has(id) && !(squad.benchIds ?? []).includes(id))].slice(0, 4);
    updateState({ squad: {
      ...squad,
      starterIds: nextStarters,
      benchIds,
      captainId: squad.captainId && next.has(squad.captainId) ? squad.captainId : nextStarters[0] ?? null,
      viceCaptainId: squad.viceCaptainId && next.has(squad.viceCaptainId) ? squad.viceCaptainId : null,
    } });
  }

  function moveBench(playerId: string, direction: -1 | 1) {
    const bench = [...(squad.benchIds ?? squad.playerIds.filter((id) => !starterIds.has(id)))];
    const index = bench.indexOf(playerId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= bench.length) return;
    [bench[index], bench[target]] = [bench[target], bench[index]];
    updateState({ squad: { ...squad, benchIds: bench } });
  }

  function applyAgentSquad(agentSquad: FantasySquad) {
    updateState({ squad: agentSquad });
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-8">
      <section className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-[#0b1b13] p-4 shadow-2xl shadow-black/20 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Private fantasy + matchday groups</p>
        <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <h1 className="break-words text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">Create a room. Pick your squad. Invite friends.</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-stone-300 sm:text-lg">
              The Matchroom is focused on private fantasy groups for football fans: follow the matchday, make picks, compete with friends, and share one invite link.
            </p>
            <div className="mt-6 grid gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
              <OnboardingStep step="1" title="Sign in" body="Save your squad." />
              <OnboardingStep step="2" title="Build squad" body="Pick your 15 players." />
              <OnboardingStep step="3" title="Create or join" body="Open a private room." />
              <OnboardingStep step="4" title="Invite + return" body="Bring friends on matchday." />
            </div>
            <div className="mt-6 grid gap-3 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
              <button type="button" onClick={() => setActiveTab('leagues')} className="w-full rounded-full bg-emerald-400 px-4 py-3 text-sm font-black text-[#07120d] hover:bg-emerald-300 sm:w-auto sm:px-5">
                View my private leagues
              </button>
              <button type="button" onClick={() => setActiveTab('squad')} className="w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white hover:bg-white/10 sm:w-auto sm:px-5">
                Pick squad
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500" htmlFor="managerName">Manager name</label>
            <input id="managerName" value={managerName} onChange={(event) => updateState({ managerName: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none ring-emerald-400/30 focus:ring-4" />
          </div>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric value={squadScore + predictionScore} label="Total points" accent />
          <Metric value={squadScore} label="Squad points" />
          <Metric value={predictionScore} label="Prediction points" />
          <Metric value={selectedPlayers.length} label="Squad players" />
        </div>
        <div aria-live="polite" className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${syncStatus === 'saved' ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100' : syncStatus === 'offline' ? 'border-rose-300/20 bg-rose-300/10 text-rose-100' : 'border-white/10 bg-white/[0.03] text-stone-400'}`}>
          {syncStatus === 'loading' ? 'Loading your saved team…' : syncStatus === 'saving' ? `Saving for ${gameStatus.name}…` : syncStatus === 'saved' ? `Saved for ${gameStatus.name}${savedAt ? ` at ${savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}. Your latest saved lineup will lock at the deadline.` : 'Not synced to your account. Changes remain only on this device until the connection returns.'}
        </div>
        {syncStatus === 'loading' && <FantasySyncSkeleton />}
      </section>

      <section className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.035] p-2">
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          <TabButton active={activeTab === 'squad'} onClick={() => setActiveTab('squad')} label="Squad" description="Pick 15 + starting XI" />
          <TabButton active={activeTab === 'leagues'} onClick={() => setActiveTab('leagues')} label="My leagues" description="Rooms + friends" />
          <TabButton active={activeTab === 'predictions'} onClick={() => setActiveTab('predictions')} label="Predictions" description="Match picks" />
          <TabButton active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} label="Leaderboard" description="Global table" />
        </div>
      </section>

      {activeTab === 'leagues' && <PrivateLeaguesManager />}

      {activeTab === 'squad' && <>
      <FantasyGameweekManager />
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-200">{gameStatus.name}</p><p className="mt-2 text-lg font-black text-white">{gameStatus.deadline ? `Deadline ${new Date(gameStatus.deadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : 'Deadline unavailable'}</p><p className="mt-1 text-xs text-emerald-100/70">Status: {gameStatus.state}. Official FPL feed checked {new Date(gameStatus.updatedAt).toLocaleTimeString()}.</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-xs font-bold uppercase tracking-wider text-stone-500">Transfers</p><p className="mt-2 font-black text-white">1 free weekly · store up to 5</p><p className="mt-1 text-xs leading-5 text-stone-400">Extra transfers deduct 4 points. Your final saved squad is compared at the deadline, so reverted edits are not charged.</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-xs font-bold uppercase tracking-wider text-stone-500">Scoring & chips</p><p className="mt-2 font-black text-white">Official FPL gameweek points</p><p className="mt-1 text-xs leading-5 text-stone-400">Automatic substitutions, bench order, captaincy and all four chips are processed after every gameweek.</p></div>
      </section>
      <FantasyVirtualAgent players={players} squad={squad} managerName={managerName} onApply={applyAgentSquad} />
      <section className="min-w-0 overflow-hidden rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.055] p-4 sm:p-6">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Fantasy squad</p>
            <h2 className="mt-2 text-3xl font-black text-white">Pick your 15-player squad</h2>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              Familiar FPL-style rules: £{FANTASY_BUDGET}m, 2 goalkeepers, 5 defenders, 5 midfielders, 3 forwards, and no more than 3 players per club. Then choose your starting XI, captain, and vice-captain.
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
                  <div key={player.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5 text-sm">
                    <span className="min-w-0 truncate self-center font-semibold text-stone-300">{player.name}</span>
                    <button type="button" onClick={() => toggleStarter(player.id)} className={`min-h-9 rounded-full px-3 py-1 text-[11px] font-bold ${starterIds.has(player.id) ? 'bg-emerald-300 text-[#07120d]' : 'bg-white/10 text-stone-400'}`}>
                      {starterIds.has(player.id) ? 'Starter' : 'Bench'}
                    </button>
                    <div className="col-span-2 grid grid-cols-2 gap-2 min-[420px]:flex min-[420px]:flex-wrap">
                    {!starterIds.has(player.id) && <span className="col-span-2 flex min-h-9 items-center gap-1 text-[10px] text-stone-500 min-[420px]:col-span-1">
                      #{(squad.benchIds ?? []).indexOf(player.id) + 1}
                      <button type="button" aria-label={`Move ${player.name} up the bench`} onClick={() => moveBench(player.id, -1)} className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white">↑</button>
                      <button type="button" aria-label={`Move ${player.name} down the bench`} onClick={() => moveBench(player.id, 1)} className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white">↓</button>
                    </span>}
                    <button type="button" disabled={!starterIds.has(player.id)} onClick={() => setCaptain(player.id)} className={`min-h-9 rounded-full px-3 py-1 text-[11px] font-bold disabled:opacity-35 ${squad.captainId === player.id ? 'bg-amber-300 text-[#07120d]' : 'bg-white/10 text-stone-400'}`}>
                      {squad.captainId === player.id ? 'Captain' : 'Make C'}
                    </button>
                    <button type="button" disabled={!starterIds.has(player.id) || squad.captainId === player.id} onClick={() => setViceCaptain(player.id)} className={`min-h-9 rounded-full px-3 py-1 text-[11px] font-bold disabled:opacity-35 ${squad.viceCaptainId === player.id ? 'bg-sky-300 text-[#07120d]' : 'bg-white/10 text-stone-400'}`}>
                      {squad.viceCaptainId === player.id ? 'Vice' : 'Make V'}
                    </button>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                    <p className="font-bold text-emerald-100">Your squad is empty.</p>
                    <p className="mt-1 text-sm leading-5 text-emerald-100/75">
                      Pick 15 players within £100m. Choose 11 starters plus a captain and vice-captain.
                    </p>
                  </div>
                )}
              </div>
            </div>
            {starterIds.size > 0 && <div className="mt-4 rounded-2xl border border-emerald-200/20 bg-[linear-gradient(180deg,#176b45,#0f4d34)] p-3">
              <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/70">Starting XI pitch</p>
              <div className="mt-3 space-y-3">{['forward','midfielder','defender','goalkeeper'].map((position) => <div key={position} className="flex flex-wrap justify-center gap-1.5">{selectedPlayers.filter((player) => starterIds.has(player.id) && fantasyPosition(player.position) === position).map((player) => <button type="button" onClick={() => toggleStarter(player.id)} key={player.id} className={`max-w-[90px] rounded-lg border px-2 py-1 text-[10px] font-bold ${squad.captainId === player.id ? 'border-amber-200 bg-amber-200 text-[#07120d]' : 'border-white/20 bg-black/30 text-white'}`}>{player.shortName}{squad.captainId === player.id ? ' (C)' : squad.viceCaptainId === player.id ? ' (V)' : ''}</button>)}</div>)}</div>
            </div>}
          </div>

          <div className="min-w-0">
            <div className="sticky top-0 z-10 mb-3 grid gap-2 rounded-2xl border border-white/10 bg-[#0b1b13]/95 p-3 backdrop-blur sm:grid-cols-[1fr_auto]">
              <input value={playerSearch} onChange={(event) => { setPlayerSearch(event.target.value); setPlayerLimit(36); }} placeholder="Search player or club" className="min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-300" />
              <div className="grid min-w-0 grid-cols-5 gap-1">{['all','goalkeeper','defender','midfielder','forward'].map((position) => <button key={position} type="button" onClick={() => { setPositionFilter(position); setPlayerLimit(36); }} className={`min-w-0 rounded-lg px-1 py-2 text-[10px] font-black uppercase ${positionFilter === position ? 'bg-emerald-300 text-[#07120d]' : 'bg-white/5 text-stone-400'}`}>{position === 'all' ? 'All' : position.slice(0, 3)}</button>)}</div>
            </div>
          <div className="grid min-w-0 gap-3 md:grid-cols-2 lg:max-h-[700px] lg:overflow-y-auto lg:pr-1 xl:grid-cols-3">
            {visiblePlayers.map((player) => {
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
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                    <span className={`rounded-full px-2 py-1 font-bold ${player.availabilityStatus === 'available' ? 'bg-emerald-300/10 text-emerald-200' : 'bg-amber-300/10 text-amber-100'}`}>{player.availabilityStatus}{player.chanceOfPlaying !== null ? ` · ${player.chanceOfPlaying}%` : ''}</span>
                    {player.upcomingFixtures.slice(0, 2).map((fixture) => <span key={`${fixture.event}-${fixture.opponent}`} className="rounded-full bg-white/[0.06] px-2 py-1 text-stone-400">{fixture.opponent} {fixture.home ? 'H' : 'A'} · FDR {fixture.difficulty}</span>)}
                  </div>
                  {player.availabilityNews && <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-amber-100/70">{player.availabilityNews}{player.availabilityUpdatedAt ? ` · ${new Date(player.availabilityUpdatedAt).toLocaleDateString()}` : ''}</p>}
                </button>
              );
            })}
            {!visiblePlayers.length && <p className="rounded-2xl border border-white/10 p-5 text-sm text-stone-400">No players match these filters.</p>}
          </div>
          {filteredPlayers.length > visiblePlayers.length && <button type="button" onClick={() => setPlayerLimit((limit) => limit + 36)} className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white hover:bg-white/10">Show 36 more players</button>}
          </div>
        </div>
      </section>
      </>}

      {activeTab === 'leaderboard' && <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Global leaderboard</p>
            <h2 className="mt-2 text-2xl font-black text-white">Separate competitions</h2>
            <p className="mt-2 max-w-2xl text-sm text-stone-400">Fantasy points come only from gameweek squads. Prediction points come only from match-result picks. They are never combined.</p>
          </div>
          <div className="flex rounded-xl border border-white/10 bg-black/20 p-1"><button type="button" onClick={() => setLeaderboardMode('fantasy')} className={`rounded-lg px-3 py-2 text-xs font-black ${leaderboardMode === 'fantasy' ? 'bg-emerald-400 text-[#07120d]' : 'text-stone-400'}`}>Fantasy</button><button type="button" onClick={() => setLeaderboardMode('predictions')} className={`rounded-lg px-3 py-2 text-xs font-black ${leaderboardMode === 'predictions' ? 'bg-amber-300 text-[#07120d]' : 'text-stone-400'}`}>Predictions</button></div>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          {(leaderboardMode === 'fantasy' ? leaderboard : predictionLeaderboard).length ? (leaderboardMode === 'fantasy' ? leaderboard : predictionLeaderboard).map((row, index) => (
            <div key={row.userId} className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-0">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-sm font-black text-white">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{row.managerName}</p>
                <p className="text-xs text-stone-500">{leaderboardMode === 'fantasy' ? `${row.squadPlayers ?? 0} squad players · official gameweek scoring` : `${row.picks} match picks · prediction scoring`}</p>
              </div>
              <span className="text-2xl font-black text-emerald-300">{row.totalScore ?? row.score}</span>
            </div>
          )) : (
            <div className="p-5">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-xl font-black text-white">Start the first league.</p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/80">
                  This {leaderboardMode === 'fantasy' ? 'fantasy' : 'prediction'} table appears after fans save eligible activity. Create a private league, invite friends, and start competing.
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
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
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
      className={`min-w-0 rounded-2xl px-3 py-3 text-left transition sm:px-4 ${active ? 'bg-emerald-400 text-[#07120d]' : 'text-stone-400 hover:bg-white/10 hover:text-white'}`}
    >
      <span className="block truncate text-sm font-black">{label}</span>
      <span className={`mt-0.5 block text-[11px] leading-4 sm:text-xs ${active ? 'text-[#07120d]/70' : 'text-stone-600'}`}>{description}</span>
    </button>
  );
}

function FantasySyncSkeleton() {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-full border border-white/10 bg-white/[0.04]" />
      ))}
    </div>
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

function fantasyPosition(position: string) {
  if (/goalkeeper|\bgk\b/i.test(position)) return 'goalkeeper';
  if (/defender|back|\bdf\b/i.test(position)) return 'defender';
  if (/midfielder|midfield|\bmf\b/i.test(position)) return 'midfielder';
  return 'forward';
}

function sanitizeSquad(input: FantasySquad | undefined, players: FantasyPlayer[]): FantasySquad {
  const validIds = new Set(players.map((player) => player.id));
  const playerIds = Array.from(new Set(input?.playerIds ?? [])).filter((id) => validIds.has(id)).slice(0, FANTASY_SQUAD_SIZE);
  const starterIds = Array.from(new Set(input?.starterIds ?? playerIds.slice(0, 11))).filter((id) => playerIds.includes(id)).slice(0, 11);
  const remainingBench = playerIds.filter((id) => !starterIds.includes(id));
  const benchIds = [...Array.from(new Set(input?.benchIds ?? [])).filter((id) => remainingBench.includes(id)), ...remainingBench.filter((id) => !(input?.benchIds ?? []).includes(id))].slice(0, 4);
  const captainId = input?.captainId && starterIds.includes(input.captainId) ? input.captainId : starterIds[0] ?? null;
  const viceCaptainId = input?.viceCaptainId && starterIds.includes(input.viceCaptainId) && input.viceCaptainId !== captainId
    ? input.viceCaptainId : starterIds.find((id) => id !== captainId) ?? null;
  return { playerIds, starterIds, benchIds, captainId, viceCaptainId };
}

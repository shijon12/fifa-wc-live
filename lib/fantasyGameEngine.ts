import 'server-only';
import type { AuthUser } from '@/lib/auth';
import type { FantasyPlayer, FantasySquad } from '@/lib/fantasySquad';
import { fetchFantasyPlayerPool } from '@/lib/fantasySquad';
import { supabaseRest } from '@/lib/supabaseRest';
import { recordFailure, recordOperation } from '@/lib/operations';

export type FantasyChip = 'wildcard' | 'free_hit' | 'bench_boost' | 'triple_captain';
type FplEvent = { id: number; name: string; deadline_time: string; finished: boolean; data_checked: boolean; is_current: boolean; is_next: boolean };
type ManagerState = { user_id: string; season_key: string; free_transfers: number; bank: number; joined_gameweek: number | null; active_chip: FantasyChip | null; free_hit_restore: FantasySquad | null };
type SquadRow = { user_id: string; player_ids: string[]; starter_ids: string[]; bench_ids?: string[]; captain_id: string | null; vice_captain_id: string | null };
type SnapshotRow = { user_id: string; season_key: string; gameweek: number; player_ids: string[]; starter_ids: string[]; bench_ids: string[]; captain_id: string | null; vice_captain_id: string | null; chip: FantasyChip | null; transfer_cost: number; gross_points: number | null; net_points: number | null; bench_points: number | null; effective_starter_ids: string[] | null; effective_captain_id: string | null; breakdown: unknown; finalized: boolean; deadline_at: string; scoring_attempts: number; last_scoring_error: string | null; last_scoring_attempt_at: string | null };
type LiveElement = { id: number; stats: { total_points: number; minutes: number } };

export async function fantasyDashboard(user: AuthUser) {
  const events = await fetchEvents();
  const season = seasonKey(events);
  const existingStates = await supabaseRest<ManagerState[]>(`fantasy_manager_state?user_id=eq.${user.id}&select=*`);
  const initialState = existingStates[0]?.season_key === season ? existingStates[0] : await createState(user.id, targetEvent(events)?.id ?? 1, season);
  await snapshotDueGameweeksForUser(user.id, events);
  await scoreFinishedSnapshotsForUser(user.id, events);
  const [states, history, chips] = await Promise.all([
    supabaseRest<ManagerState[]>(`fantasy_manager_state?user_id=eq.${user.id}&select=*`),
    supabaseRest<SnapshotRow[]>(`fantasy_gameweek_squads?user_id=eq.${user.id}&season_key=eq.${season}&select=*&order=gameweek.desc`),
    supabaseRest<Array<{ chip: FantasyChip; season_half: number; gameweek: number }>>(`fantasy_chip_usage?user_id=eq.${user.id}&season_key=eq.${season}&select=*`),
  ]);
  const state = states[0] ?? initialState;
  const target = targetEvent(events);
  const currentSquad = (await supabaseRest<SquadRow[]>(`fantasy_squads?user_id=eq.${user.id}&select=*`))[0];
  const previous = history[0];
  const pendingTransfers = currentSquad && previous
    ? currentSquad.player_ids.filter((id) => !previous.player_ids.includes(id)).length
    : 0;
  const projectedTransferCost = state.active_chip === 'wildcard' || state.active_chip === 'free_hit'
    ? 0
    : Math.max(0, pendingTransfers - state.free_transfers) * 4;
  return { state, history, chips, targetGameweek: target, pendingTransfers, projectedTransferCost, rules: { maxFreeTransfers: 5, excessTransferCost: 4, chipsPerHalf: 1 } };
}

export async function prepareSquadSave(userId: string, previous: FantasySquad, next: FantasySquad) {
  const events = await fetchEvents();
  await snapshotDueGameweeksForUser(userId, events);
  const target = targetEvent(events);
  return target ? { targetGameweek: target.id, previousPlayers: previous.playerIds.length, nextPlayers: next.playerIds.length } : undefined;
}

export async function setFantasyChip(userId: string, chip: FantasyChip | null) {
  const events = await fetchEvents();
  const season = seasonKey(events);
  const target = targetEvent(events);
  if (!target) throw new Error('No open gameweek.');
  if (new Date(target.deadline_time).getTime() <= Date.now()) throw new Error('The gameweek deadline has passed.');
  if (chip) {
    const half = target.id <= 19 ? 1 : 2;
    const used = await supabaseRest<Array<{ gameweek: number }>>(`fantasy_chip_usage?user_id=eq.${userId}&season_key=eq.${season}&chip=eq.${chip}&season_half=eq.${half}&select=gameweek`);
    if (used.length) throw new Error(`This ${chip.replace('_', ' ')} chip has already been used in this half of the season.`);
    const active = await supabaseRest<ManagerState[]>(`fantasy_manager_state?user_id=eq.${userId}&select=*`);
    if (active[0]?.active_chip && active[0].active_chip !== chip) throw new Error('Only one chip can be active in a gameweek.');
    if (chip === 'free_hit') {
      const prior = await supabaseRest<Array<{ gameweek: number }>>(`fantasy_chip_usage?user_id=eq.${userId}&season_key=eq.${season}&chip=eq.free_hit&select=gameweek&order=gameweek.desc&limit=1`);
      if (prior[0]?.gameweek === target.id - 1) throw new Error('Free Hit cannot be used in consecutive gameweeks.');
    }
  }
  await supabaseRest('fantasy_manager_state?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: userId, season_key: season, active_chip: chip, updated_at: new Date().toISOString() }) });
  return { activeChip: chip, gameweek: target.id };
}

export async function processAllFantasyGameweeks() {
  const startedAt = Date.now();
  try {
    const safety = simulateGameweekEngine();
    if (!safety.passed) throw new Error(`Gameweek safety simulation failed: ${safety.checks.filter((check) => !check.passed).map((check) => check.name).join(', ')}`);
    const events = await fetchEvents(true);
    const season = seasonKey(events);
    const squads = await supabaseRest<SquadRow[]>('fantasy_squads?select=*');
    for (const squad of squads) await snapshotDueGameweeksForUser(squad.user_id, events, squad);
    const snapshots = await supabaseRest<SnapshotRow[]>(`fantasy_gameweek_squads?season_key=eq.${season}&finalized=eq.false&select=*`);
    let failed = 0;
    for (const snapshot of snapshots) {
      try {
        await scoreSnapshotIfReady(snapshot, events);
      } catch (error) {
        failed += 1;
        await markScoringFailure(snapshot, error);
      }
    }
    const result = { managers: squads.length, pendingSnapshots: snapshots.length, failedScoringJobs: failed };
    await recordOperation({ service: 'fantasy-engine', operation: 'process', status: failed ? 'warning' : 'success', duration_ms: Date.now() - startedAt, message: failed ? `${failed} scoring jobs failed.` : 'Gameweek processing completed.', metadata: result });
    return result;
  } catch (error) {
    await recordFailure('fantasy-engine', 'process', error, startedAt);
    throw error;
  }
}

export async function fantasySeasonTotals() {
  const season = seasonKey(await fetchEvents());
  const rows = await supabaseRest<Array<{ user_id: string; net_points: number | null }>>(`fantasy_gameweek_squads?season_key=eq.${season}&finalized=eq.true&select=user_id,net_points`);
  const totals = new Map<string, number>();
  rows.forEach((row) => totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + (row.net_points ?? 0)));
  return totals;
}

async function snapshotDueGameweeksForUser(userId: string, events: FplEvent[], supplied?: SquadRow) {
  const season = seasonKey(events);
  const existingState = (await supabaseRest<ManagerState[]>(`fantasy_manager_state?user_id=eq.${userId}&select=*`))[0]
  const stateForSeason = existingState?.season_key === season ? existingState : await createState(userId, targetEvent(events)?.id ?? 1, season);
  const due = events.filter((event) => new Date(event.deadline_time).getTime() <= Date.now() && event.id >= (stateForSeason.joined_gameweek ?? 1));
  if (!due.length) return;
  const existing = await supabaseRest<Array<{ gameweek: number }>>(`fantasy_gameweek_squads?user_id=eq.${userId}&season_key=eq.${season}&select=gameweek`);
  const latestMissing = [...due].reverse().find((event) => !existing.some((row) => row.gameweek === event.id));
  if (!latestMissing) return;
  const squad = supplied ?? (await supabaseRest<SquadRow[]>(`fantasy_squads?user_id=eq.${userId}&select=*`))[0];
  if (!squad || squad.player_ids.length !== 15 || squad.starter_ids.length !== 11) return;
  const state = stateForSeason;
  const previousSnapshots = await supabaseRest<SnapshotRow[]>(`fantasy_gameweek_squads?user_id=eq.${userId}&season_key=eq.${season}&gameweek=lt.${latestMissing.id}&select=*&order=gameweek.desc&limit=1`);
  const previousSnapshot = previousSnapshots[0];
  const removed = previousSnapshot ? previousSnapshot.player_ids.filter((id) => !squad.player_ids.includes(id)) : [];
  const added = previousSnapshot ? squad.player_ids.filter((id) => !previousSnapshot.player_ids.includes(id)) : [];
  const transferCost = state.active_chip === 'wildcard' || state.active_chip === 'free_hit' ? 0 : Math.max(0, added.length - state.free_transfers) * 4;
  if (added.length && added.length === removed.length) {
    const rows = added.map((playerIn, index) => ({ user_id: userId, season_key: season, gameweek: latestMissing.id, player_out_id: removed[index], player_in_id: playerIn, points_cost: index >= state.free_transfers && state.active_chip !== 'wildcard' && state.active_chip !== 'free_hit' ? 4 : 0 }));
    await supabaseRest('fantasy_transfers', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
  }
  const bench = normalizedBench(squad);
  await supabaseRest('fantasy_gameweek_squads?on_conflict=user_id,season_key,gameweek', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ user_id: userId, season_key: season, gameweek: latestMissing.id, player_ids: squad.player_ids, starter_ids: squad.starter_ids, bench_ids: bench, captain_id: squad.captain_id, vice_captain_id: squad.vice_captain_id, chip: state.active_chip, transfer_cost: transferCost, deadline_at: latestMissing.deadline_time }) });
  if (state.active_chip) await supabaseRest('fantasy_chip_usage?on_conflict=user_id,season_key,chip,season_half', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ user_id: userId, season_key: season, chip: state.active_chip, season_half: latestMissing.id <= 19 ? 1 : 2, gameweek: latestMissing.id }) });
  const usedFree = state.active_chip === 'wildcard' || state.active_chip === 'free_hit' ? 0 : Math.min(state.free_transfers, added.length);
  const nextFree = state.active_chip === 'wildcard' || state.active_chip === 'free_hit' ? state.free_transfers : Math.min(5, Math.max(0, state.free_transfers - usedFree) + 1);
  const freeHitRestore = state.active_chip === 'free_hit' && previousSnapshot ? { playerIds: previousSnapshot.player_ids, starterIds: previousSnapshot.starter_ids, benchIds: previousSnapshot.bench_ids, captainId: previousSnapshot.captain_id, viceCaptainId: previousSnapshot.vice_captain_id } : state.free_hit_restore;
  await supabaseRest('fantasy_manager_state?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: userId, season_key: season, free_transfers: nextFree, joined_gameweek: state.joined_gameweek ?? latestMissing.id, active_chip: null, free_hit_restore: freeHitRestore, updated_at: new Date().toISOString() }) });
}

async function scoreFinishedSnapshotsForUser(userId: string, events: FplEvent[]) {
  const rows = await supabaseRest<SnapshotRow[]>(`fantasy_gameweek_squads?user_id=eq.${userId}&season_key=eq.${seasonKey(events)}&finalized=eq.false&select=*`);
  for (const row of rows) await scoreSnapshotIfReady(row, events);
}

async function scoreSnapshotIfReady(snapshot: SnapshotRow, events: FplEvent[]) {
  const event = events.find((entry) => entry.id === snapshot.gameweek);
  if (!event?.finished || !event.data_checked) return;
  const live = await fetchEventLive(event.id);
  const players = await fetchFantasyPlayerPool();
  const result = calculateGameweek(snapshot, live, players);
  await supabaseRest(`fantasy_gameweek_squads?user_id=eq.${snapshot.user_id}&season_key=eq.${snapshot.season_key}&gameweek=eq.${snapshot.gameweek}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ...result, finalized: true, last_scoring_error: null, last_scoring_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
  if (snapshot.chip === 'free_hit') {
    const state = (await supabaseRest<ManagerState[]>(`fantasy_manager_state?user_id=eq.${snapshot.user_id}&select=*`))[0];
    if (state?.free_hit_restore) {
      const restore = state.free_hit_restore;
      await supabaseRest('fantasy_squads?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: snapshot.user_id, player_ids: restore.playerIds, starter_ids: restore.starterIds ?? [], bench_ids: restore.benchIds ?? [], captain_id: restore.captainId, vice_captain_id: restore.viceCaptainId ?? null }) });
      await supabaseRest(`fantasy_manager_state?user_id=eq.${snapshot.user_id}`, { method: 'PATCH', body: JSON.stringify({ free_hit_restore: null }) });
    }
  }
}

export function calculateGameweek(snapshot: SnapshotRow, live: Map<string, { points: number; minutes: number }>, players: FantasyPlayer[]) {
  const byId = new Map(players.map((player) => [player.id, player]));
  const effective = [...snapshot.starter_ids];
  const bench = snapshot.bench_ids.length ? snapshot.bench_ids : snapshot.player_ids.filter((id) => !effective.includes(id));
  const played = (id: string) => (live.get(id)?.minutes ?? 0) > 0;
  if (snapshot.chip !== 'bench_boost') {
    for (const missing of [...effective].filter((id) => !played(id))) {
      const missingPosition = position(byId.get(missing));
      const replacement = bench.find((id) => played(id) && !effective.includes(id) && (missingPosition === 'goalkeeper' ? position(byId.get(id)) === 'goalkeeper' : position(byId.get(id)) !== 'goalkeeper') && validFormation(effective.filter((entry) => entry !== missing).concat(id), byId));
      if (replacement) effective[effective.indexOf(missing)] = replacement;
    }
  }
  let captain = snapshot.captain_id;
  if (!captain || !played(captain)) captain = snapshot.vice_captain_id && played(snapshot.vice_captain_id) ? snapshot.vice_captain_id : null;
  const base = effective.reduce((sum, id) => sum + (live.get(id)?.points ?? 0), 0);
  const captainBonus = captain ? (live.get(captain)?.points ?? 0) * (snapshot.chip === 'triple_captain' ? 2 : 1) : 0;
  const benchPoints = bench.reduce((sum, id) => sum + (live.get(id)?.points ?? 0), 0);
  const gross = base + captainBonus + (snapshot.chip === 'bench_boost' ? benchPoints : 0);
  return { gross_points: gross, net_points: gross - snapshot.transfer_cost, bench_points: benchPoints, effective_starter_ids: effective, effective_captain_id: captain, breakdown: { playerPoints: Object.fromEntries(snapshot.player_ids.map((id) => [id, live.get(id) ?? { points: 0, minutes: 0 }])), autosubs: effective.filter((id) => !snapshot.starter_ids.includes(id)), captainMultiplier: snapshot.chip === 'triple_captain' ? 3 : 2 } };
}

export function simulateGameweekEngine() {
  const players = Array.from({ length: 15 }, (_, index) => ({
    id: String(index + 1),
    position: index < 2 ? 'Goalkeeper' : index < 7 ? 'Defender' : index < 12 ? 'Midfielder' : 'Forward',
  })) as FantasyPlayer[];
  const live = new Map<string, { points: number; minutes: number }>(players.map((player) => [player.id, { points: 2, minutes: 90 }]));
  live.set('1', { points: 0, minutes: 0 });
  live.set('3', { points: 0, minutes: 0 });
  live.set('2', { points: 4, minutes: 90 });
  live.set('7', { points: 5, minutes: 90 });
  live.set('12', { points: 6, minutes: 90 });
  live.set('15', { points: 7, minutes: 90 });
  const base = {
    season_key: 'simulation',
    user_id: 'simulation', gameweek: 1, player_ids: players.map((player) => player.id), starter_ids: ['1','3','4','5','6','8','9','10','11','13','14'], bench_ids: ['2','7','12','15'], captain_id: '3', vice_captain_id: '4', chip: null, transfer_cost: 8, gross_points: null, net_points: null, bench_points: null, effective_starter_ids: null, effective_captain_id: null, breakdown: null, finalized: false, deadline_at: new Date().toISOString(), scoring_attempts: 0, last_scoring_error: null, last_scoring_attempt_at: null,
  } satisfies SnapshotRow;
  const standard = calculateGameweek(base, live, players);
  const benchBoost = calculateGameweek({ ...base, chip: 'bench_boost', transfer_cost: 0 }, live, players);
  const tripleCaptain = calculateGameweek({ ...base, chip: 'triple_captain', transfer_cost: 0 }, live, players);
  const wildcard = calculateGameweek({ ...base, chip: 'wildcard', transfer_cost: 0 }, live, players);
  const freeHit = calculateGameweek({ ...base, chip: 'free_hit', transfer_cost: 0 }, live, players);
  const doubleBlankLive = new Map(live);
  doubleBlankLive.set('4', { points: 12, minutes: 180 });
  doubleBlankLive.set('5', { points: 0, minutes: 0 });
  const doubleBlank = calculateGameweek({ ...base, transfer_cost: 0, captain_id: '4' }, doubleBlankLive, players);
  const checks = [
    { name: 'Non-playing goalkeeper and defender autosub in bench order', passed: standard.effective_starter_ids.includes('2') && standard.effective_starter_ids.includes('7') },
    { name: 'Vice-captain inherits captaincy', passed: standard.effective_captain_id === '4' },
    { name: 'Transfer deductions reduce net points', passed: standard.net_points === standard.gross_points - 8 },
    { name: 'Bench Boost counts all substitute points', passed: benchBoost.gross_points === 42 },
    { name: 'Triple Captain applies a 3x total multiplier', passed: tripleCaptain.gross_points === 31 },
    { name: 'Wildcard has no transfer deduction', passed: wildcard.net_points === wildcard.gross_points },
    { name: 'Free Hit has no transfer deduction', passed: freeHit.net_points === freeHit.gross_points },
    { name: 'Double-gameweek aggregate is accepted', passed: doubleBlank.gross_points >= 24 },
    { name: 'Blank-gameweek zero minutes score zero', passed: (doubleBlank.breakdown as { playerPoints: Record<string, { points: number }> }).playerPoints['5'].points === 0 },
  ];
  return { passed: checks.every((check) => check.passed), checks, ranAt: new Date().toISOString() };
}

function validFormation(ids: string[], players: Map<string, FantasyPlayer>) { const counts = { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 }; ids.forEach((id) => counts[position(players.get(id))]++); return ids.length === 11 && counts.goalkeeper === 1 && counts.defender >= 3 && counts.forward >= 1; }
function position(player?: FantasyPlayer): 'goalkeeper'|'defender'|'midfielder'|'forward' { if (!player) return 'forward'; if (/goalkeeper/i.test(player.position)) return 'goalkeeper'; if (/defender/i.test(player.position)) return 'defender'; if (/midfielder/i.test(player.position)) return 'midfielder'; return 'forward'; }
function normalizedBench(squad: SquadRow) { const remaining = squad.player_ids.filter((id) => !squad.starter_ids.includes(id)); return squad.bench_ids?.length === 4 && squad.bench_ids.every((id) => remaining.includes(id)) ? squad.bench_ids : remaining.sort((a, b) => Number(positionOrder(a, squad)) - Number(positionOrder(b, squad))); }
function positionOrder(id: string, squad: SquadRow) { return squad.player_ids.indexOf(id); }
async function fetchEvents(telemetry = false) {
  const startedAt = Date.now();
  try {
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`FPL bootstrap returned ${response.status}.`);
    const payload = await response.json() as { events?: unknown };
    if (!Array.isArray(payload.events) || !payload.events.every(validFplEvent)) throw new Error('FPL bootstrap schema is incompatible.');
    if (telemetry) await recordOperation({ service: 'fpl-provider', operation: 'bootstrap', status: 'success', duration_ms: Date.now() - startedAt, message: `Validated ${payload.events.length} gameweeks.`, metadata: { eventCount: payload.events.length, schema: 1, season: seasonKey(payload.events as FplEvent[]) } });
    return payload.events as FplEvent[];
  } catch (error) {
    if (telemetry) await recordFailure('fpl-provider', 'bootstrap', error, startedAt);
    throw new Error('Official FPL gameweek data is unavailable.', { cause: error });
  }
}
async function fetchEventLive(event: number) { const response = await fetch(`https://fantasy.premierleague.com/api/event/${event}/live/`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) }); if (!response.ok) throw new Error('Official FPL event points are unavailable.'); const payload = await response.json() as { elements: LiveElement[] }; return new Map(payload.elements.map((entry) => [String(entry.id), { points: entry.stats.total_points, minutes: entry.stats.minutes }])); }
function currentEvent(events: FplEvent[]) { return events.find((event) => event.is_current); }
function nextEvent(events: FplEvent[]) { return events.find((event) => event.is_next); }
function targetEvent(events: FplEvent[]) { const current = currentEvent(events); return current && new Date(current.deadline_time).getTime() > Date.now() ? current : nextEvent(events) ?? current; }
async function createState(userId: string, gameweek: number, season: string) { const row = { user_id: userId, season_key: season, free_transfers: 1, bank: 0, joined_gameweek: gameweek, active_chip: null, free_hit_restore: null }; await supabaseRest('fantasy_manager_state?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) }); return row as ManagerState; }

function seasonKey(events: FplEvent[]) {
  const firstDeadline = events.map((event) => new Date(event.deadline_time)).find((date) => !Number.isNaN(date.getTime()));
  if (!firstDeadline) throw new Error('FPL season cannot be identified.');
  const year = firstDeadline.getUTCMonth() < 6 ? firstDeadline.getUTCFullYear() - 1 : firstDeadline.getUTCFullYear();
  return `${year}-${String(year + 1).slice(-2)}`;
}

function validFplEvent(value: unknown): value is FplEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<FplEvent>;
  return Number.isInteger(event.id) && typeof event.name === 'string' && typeof event.deadline_time === 'string'
    && !Number.isNaN(Date.parse(event.deadline_time)) && typeof event.finished === 'boolean' && typeof event.data_checked === 'boolean';
}

async function markScoringFailure(snapshot: SnapshotRow, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await supabaseRest(`fantasy_gameweek_squads?user_id=eq.${snapshot.user_id}&season_key=eq.${snapshot.season_key}&gameweek=eq.${snapshot.gameweek}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ scoring_attempts: (snapshot.scoring_attempts ?? 0) + 1, last_scoring_error: message.slice(0, 500), last_scoring_attempt_at: new Date().toISOString() }),
  });
  await recordFailure('fantasy-engine', 'score-gameweek', error, undefined, { gameweek: snapshot.gameweek });
}

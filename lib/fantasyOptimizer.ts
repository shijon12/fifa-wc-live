import { FANTASY_BUDGET, FANTASY_SQUAD_SIZE, FANTASY_STARTING_SIZE, type FantasyPlayer, type FantasySquad } from '@/lib/fantasySquad';

export type OptimizationStrategy = 'safe' | 'balanced' | 'aggressive' | 'value';

export type FantasyOptimizationRequest = {
  strategy: OptimizationStrategy;
  budgetCap: number;
  currentSquad: FantasySquad;
  lockedPlayerIds: string[];
  excludedPlayerIds: string[];
  preferredTeams: string[];
  preferredNationalities: string[];
  requiredTeam: string | null;
  requiredNationality: string | null;
  maxChanges: number | null;
  captainPreference: string | null;
};

export type OptimizedSquad = {
  squad: FantasySquad;
  cost: number;
  currentPoints: number;
  optimizationScore: number;
  changes: number;
  valid: boolean;
  issues: string[];
  rationale: string[];
  projections: Array<{ playerId: string; score: number; reasons: string[] }>;
};

type PositionGroup = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
type Candidate = { player: FantasyPlayer; score: number; reasons: string[]; position: PositionGroup };
type SearchState = {
  selected: Candidate[];
  cost: number;
  score: number;
  teamCounts: Map<string, number>;
  additions: number;
};

const FORMATION: Record<PositionGroup, number> = { goalkeeper: 2, defender: 5, midfielder: 5, forward: 3 };
const POSITION_ORDER: PositionGroup[] = ['goalkeeper', 'goalkeeper', 'defender', 'defender', 'defender', 'defender', 'defender', 'midfielder', 'midfielder', 'midfielder', 'midfielder', 'midfielder', 'forward', 'forward', 'forward'];
const BEAM_WIDTH = 1_200;

export function optimizeFantasySquad(players: FantasyPlayer[], request: FantasyOptimizationRequest): OptimizedSquad {
  const budgetCap = Math.max(40, Math.min(FANTASY_BUDGET, request.budgetCap));
  const playerById = new Map(players.map((player) => [player.id, player]));
  const currentIds = new Set(request.currentSquad.playerIds);
  const excludedIds = new Set(request.excludedPlayerIds);
  const locked = Array.from(new Set(request.lockedPlayerIds)).map((id) => playerById.get(id)).filter((player): player is FantasyPlayer => Boolean(player));
  const issues = validateRequest(players, request, locked, budgetCap);
  if (issues.length) return emptyResult(issues);

  const candidates = players
    .filter((player) => !excludedIds.has(player.id))
    .filter((player) => player.availabilityStatus === 'available' || player.chanceOfPlaying === null || (player.chanceOfPlaying ?? 0) >= 50)
    .filter((player) => matchesHardConstraint(player.team, request.requiredTeam))
    .filter((player) => matchesHardConstraint(player.citizenship, request.requiredNationality))
    .map((player) => scoreCandidate(player, request, currentIds));

  const lockedCandidates = locked.map((player) => scoreCandidate(player, request, currentIds));
  const initialCounts: Record<PositionGroup, number> = { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
  const initialTeamCounts = new Map<string, number>();
  let initialCost = 0;
  let initialScore = 0;
  for (const candidate of lockedCandidates) {
    initialCounts[candidate.position] += 1;
    initialTeamCounts.set(candidate.player.teamId, (initialTeamCounts.get(candidate.player.teamId) ?? 0) + 1);
    initialCost += candidate.player.price;
    initialScore += candidate.score;
  }

  const slots = POSITION_ORDER.filter((position) => {
    if (initialCounts[position] <= 0) return true;
    initialCounts[position] -= 1;
    return false;
  });
  let beam: SearchState[] = [{
    selected: lockedCandidates,
    cost: initialCost,
    score: initialScore,
    teamCounts: initialTeamCounts,
    additions: locked.filter((player) => !currentIds.has(player.id)).length,
  }];
  const feasibleFallback = findFeasibleState(candidates, lockedCandidates, slots, budgetCap, currentIds, request.maxChanges);

  for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
    const position = slots[slotIndex];
    const availableAtPosition = candidates.filter((candidate) => candidate.position === position);
    const positionCandidates = uniqueCandidates([
      ...[...availableAtPosition].sort((a, b) => b.score - a.score || a.player.price - b.player.price).slice(0, 55),
      ...[...availableAtPosition].sort((a, b) => a.player.price - b.player.price || b.score - a.score).slice(0, 30),
    ]);
    const remainingPositions = slots.slice(slotIndex + 1);
    const minimumFutureCost = minimumRemainingCost(candidates, remainingPositions);
    const next: SearchState[] = [];
    for (const state of beam) {
      for (const candidate of positionCandidates) {
        if (state.selected.some((entry) => entry.player.id === candidate.player.id)) continue;
        if ((state.teamCounts.get(candidate.player.teamId) ?? 0) >= 3) continue;
        if (state.cost + candidate.player.price > budgetCap + 0.001) continue;
        if (state.cost + candidate.player.price + minimumFutureCost > budgetCap + 0.001) continue;
        const additions = state.additions + (currentIds.has(candidate.player.id) ? 0 : 1);
        if (request.maxChanges !== null && currentIds.size === FANTASY_SQUAD_SIZE && additions > request.maxChanges) continue;
        const teamCounts = new Map(state.teamCounts);
        teamCounts.set(candidate.player.teamId, (teamCounts.get(candidate.player.teamId) ?? 0) + 1);
        next.push({
          selected: [...state.selected, candidate],
          cost: state.cost + candidate.player.price,
          score: state.score + candidate.score,
          teamCounts,
          additions,
        });
      }
    }
    beam = next
      .sort((a, b) => stateRank(b, budgetCap, minimumFutureCost) - stateRank(a, budgetCap, minimumFutureCost))
      .slice(0, BEAM_WIDTH);
    if (!beam.length) {
      return feasibleFallback
        ? finalizeOptimization(feasibleFallback, players, request, currentIds, true)
        : emptyResult(['No valid squad satisfies all requested locks, exclusions, budget, formation, club limit, and transfer constraints.']);
    }
  }

  const best = beam.sort((a, b) => b.score - a.score || a.cost - b.cost)[0];
  if (!best || best.selected.length !== FANTASY_SQUAD_SIZE) {
    return feasibleFallback
      ? finalizeOptimization(feasibleFallback, players, request, currentIds, true)
      : emptyResult(['The current player pool cannot produce a complete valid squad under these constraints.']);
  }
  return finalizeOptimization(best, players, request, currentIds, false);
}

function finalizeOptimization(best: SearchState, players: FantasyPlayer[], request: FantasyOptimizationRequest, currentIds: Set<string>, usedFallback: boolean): OptimizedSquad {
  const starters = selectStartingXI(best.selected);
  if (starters.length !== FANTASY_STARTING_SIZE) return emptyResult(['The selected 15-player squad cannot produce a valid starting XI.']);
  const preferredCaptain = request.captainPreference ? findByName(starters, request.captainPreference) : null;
  const captain = preferredCaptain ?? [...starters].sort((a, b) => captainScore(b, request.strategy) - captainScore(a, request.strategy))[0];
  const viceCaptain = [...starters].filter((entry) => entry.player.id !== captain?.player.id).sort((a, b) => captainScore(b, request.strategy) - captainScore(a, request.strategy))[0];
  const squad = {
    playerIds: best.selected.map((entry) => entry.player.id),
    starterIds: starters.map((entry) => entry.player.id),
    captainId: captain?.player.id ?? null,
    viceCaptainId: viceCaptain?.player.id ?? null,
  };
  const currentPoints = starters.reduce((total, entry) => total + entry.player.points, 0) + (captain?.player.points ?? 0);
  const retained = best.selected.filter((entry) => currentIds.has(entry.player.id)).length;

  return {
    squad,
    cost: Number(best.cost.toFixed(1)),
    currentPoints,
    optimizationScore: Number(best.score.toFixed(1)),
    changes: currentIds.size === FANTASY_SQUAD_SIZE ? FANTASY_SQUAD_SIZE - retained : best.additions,
    valid: true,
    issues: [],
    rationale: [
      usedFallback
        ? `Affordable valid squad constructed across ${players.length} current player records`
        : `${strategyLabel(request.strategy)} objective optimized across ${players.length} current player records`,
      `${Number(best.cost.toFixed(1))} of ${Math.max(40, Math.min(FANTASY_BUDGET, request.budgetCap))} budget used`,
      currentIds.size ? `${retained} current pick${retained === 1 ? '' : 's'} retained` : 'Built from an empty squad',
      captain ? `${captain.player.name} selected as captain using the same strategy objective` : 'No captain available',
      viceCaptain ? `${viceCaptain.player.name} selected as vice-captain` : 'No vice-captain available',
    ],
    projections: best.selected
      .map((entry) => ({ playerId: entry.player.id, score: Number(entry.score.toFixed(1)), reasons: entry.reasons }))
      .sort((a, b) => b.score - a.score),
  };
}

function findFeasibleState(
  candidates: Candidate[],
  locked: Candidate[],
  slots: PositionGroup[],
  budgetCap: number,
  currentIds: Set<string>,
  maxChanges: number | null,
): SearchState | null {
  const selectedIds = new Set(locked.map((entry) => entry.player.id));
  const teamCounts = new Map<string, number>();
  locked.forEach((entry) => teamCounts.set(entry.player.teamId, (teamCounts.get(entry.player.teamId) ?? 0) + 1));
  const initial: SearchState = {
    selected: [...locked],
    cost: locked.reduce((total, entry) => total + entry.player.price, 0),
    score: locked.reduce((total, entry) => total + entry.score, 0),
    teamCounts,
    additions: locked.filter((entry) => !currentIds.has(entry.player.id)).length,
  };
  const byPosition = new Map<PositionGroup, Candidate[]>();
  (['goalkeeper', 'defender', 'midfielder', 'forward'] as PositionGroup[]).forEach((position) => {
    byPosition.set(position, candidates
      .filter((candidate) => candidate.position === position)
      .sort((a, b) => a.player.price - b.player.price || b.score - a.score));
  });

  function search(slotIndex: number, state: SearchState): SearchState | null {
    if (slotIndex === slots.length) return state;
    const position = slots[slotIndex];
    for (const candidate of byPosition.get(position) ?? []) {
      if (selectedIds.has(candidate.player.id)) continue;
      if ((state.teamCounts.get(candidate.player.teamId) ?? 0) >= 3) continue;
      const nextCost = state.cost + candidate.player.price;
      if (nextCost > budgetCap + 0.001) continue;
      const additions = state.additions + (currentIds.has(candidate.player.id) ? 0 : 1);
      if (maxChanges !== null && currentIds.size === FANTASY_SQUAD_SIZE && additions > maxChanges) continue;
      selectedIds.add(candidate.player.id);
      const nextTeamCounts = new Map(state.teamCounts);
      nextTeamCounts.set(candidate.player.teamId, (nextTeamCounts.get(candidate.player.teamId) ?? 0) + 1);
      const result = search(slotIndex + 1, {
        selected: [...state.selected, candidate],
        cost: nextCost,
        score: state.score + candidate.score,
        teamCounts: nextTeamCounts,
        additions,
      });
      if (result) return result;
      selectedIds.delete(candidate.player.id);
    }
    return null;
  }

  return search(0, initial);
}

function scoreCandidate(player: FantasyPlayer, request: FantasyOptimizationRequest, currentIds: Set<string>): Candidate {
  const position = positionGroup(player.position);
  const discipline = player.yellowCards + player.redCards * 3;
  const appearanceReliability = Math.min(1, player.appearances / 5);
  const attacking = player.goals * 9 + player.assists * 6 + player.shotsOnTarget * 1.6;
  const defensive = position === 'goalkeeper' ? player.saves * 2.1 : position === 'defender' ? player.appearances * 2.2 : player.appearances;
  const value = player.price > 0 ? player.points / player.price : 0;
  const fixtureEase = player.upcomingFixtures.slice(0, 3).reduce((total, fixture) => total + (6 - fixture.difficulty), 0);
  const expectedAttack = player.expectedGoals * 5 + player.expectedAssists * 4;
  let score: number;
  if (request.strategy === 'safe') score = player.points * 4.2 + appearanceReliability * 18 + defensive * 1.4 - discipline * 4;
  else if (request.strategy === 'aggressive') score = attacking * 2 + player.points * 1.8 + player.shots * 0.7 - discipline;
  else if (request.strategy === 'value') score = value * 18 + player.points * 2 + attacking * 0.8 - player.price * 0.8;
  else score = player.points * 3 + attacking + defensive - discipline * 2;
  score += player.form * 2 + fixtureEase * 1.5 + expectedAttack;
  if (player.availabilityStatus !== 'available') score -= 30;
  if (player.chanceOfPlaying !== null) score += (player.chanceOfPlaying - 100) * 0.4;

  const reasons: string[] = [];
  if (player.availabilityNews) reasons.push(player.availabilityNews);
  else reasons.push(`official status: ${player.availabilityStatus}`);
  if (player.goals || player.assists) reasons.push(`${player.goals} goals, ${player.assists} assists`);
  if (appearanceReliability >= 0.8) reasons.push('regular tournament minutes');
  if (value >= 1.5) reasons.push('strong points per budget unit');
  if (player.upcomingFixtures.length) reasons.push(`next: ${player.upcomingFixtures.slice(0, 3).map((fixture) => `${fixture.opponent} ${fixture.home ? 'H' : 'A'} FDR${fixture.difficulty}`).join(', ')}`);
  if (currentIds.has(player.id)) { score += 2.5; reasons.push('retains an existing pick'); }
  if (matchesPreference(player.team, request.preferredTeams)) { score += 5; reasons.push('preferred team'); }
  if (matchesPreference(player.citizenship, request.preferredNationalities)) { score += 4; reasons.push('preferred nationality'); }
  return { player, score, reasons: reasons.slice(0, 3), position };
}

function validateRequest(players: FantasyPlayer[], request: FantasyOptimizationRequest, locked: FantasyPlayer[], budgetCap: number) {
  const issues: string[] = [];
  if (new Set(request.lockedPlayerIds).size !== request.lockedPlayerIds.length) issues.push('Locked players contain duplicates.');
  if (request.lockedPlayerIds.some((id) => !players.some((player) => player.id === id))) issues.push('A locked player is unavailable in the current pool.');
  if (request.lockedPlayerIds.some((id) => request.excludedPlayerIds.includes(id))) issues.push('A player cannot be both locked and excluded.');
  if (locked.reduce((total, player) => total + player.price, 0) > budgetCap) issues.push('Locked players already exceed the requested budget.');
  const positionCounts: Record<PositionGroup, number> = { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
  const teamCounts = new Map<string, number>();
  locked.forEach((player) => {
    positionCounts[positionGroup(player.position)] += 1;
    teamCounts.set(player.teamId, (teamCounts.get(player.teamId) ?? 0) + 1);
  });
  if (Object.entries(positionCounts).some(([position, count]) => count > FORMATION[position as PositionGroup])) issues.push('Locked players exceed a required formation position.');
  if (Array.from(teamCounts.values()).some((count) => count > 3)) issues.push('Locked players exceed the three-per-team limit.');
  const eligibleTeams = new Set(players
    .filter((player) => matchesHardConstraint(player.team, request.requiredTeam) && matchesHardConstraint(player.citizenship, request.requiredNationality))
    .map((player) => player.teamId));
  if ((request.requiredTeam || request.requiredNationality) && eligibleTeams.size * 3 < FANTASY_SQUAD_SIZE) {
    issues.push(`The hard team/nationality constraint can supply at most ${eligibleTeams.size * 3} players under the three-per-team rule, not ${FANTASY_SQUAD_SIZE}.`);
  }
  return issues;
}

function emptyResult(issues: string[]): OptimizedSquad {
  return { squad: { playerIds: [], starterIds: [], captainId: null, viceCaptainId: null }, cost: 0, currentPoints: 0, optimizationScore: 0, changes: 0, valid: false, issues, rationale: [], projections: [] };
}

function positionGroup(position: string): PositionGroup {
  if (/goalkeeper|\bgk\b/i.test(position)) return 'goalkeeper';
  if (/defender|back|\bdf\b/i.test(position)) return 'defender';
  if (/midfielder|midfield|\bmf\b/i.test(position)) return 'midfielder';
  return 'forward';
}

function matchesHardConstraint(value: string | null, constraint: string | null) {
  if (!constraint?.trim()) return true;
  return (value ?? '').toLowerCase().includes(constraint.trim().toLowerCase());
}

function matchesPreference(value: string | null, preferences: string[]) {
  const normalized = (value ?? '').toLowerCase();
  return preferences.some((preference) => normalized.includes(preference.trim().toLowerCase()));
}

function findByName(candidates: Candidate[], name: string) {
  const query = name.trim().toLowerCase();
  return candidates.find((entry) => entry.player.name.toLowerCase() === query || entry.player.shortName.toLowerCase() === query)
    ?? candidates.find((entry) => `${entry.player.name} ${entry.player.shortName}`.toLowerCase().includes(query));
}

function captainScore(candidate: Candidate, strategy: OptimizationStrategy) {
  return candidate.score + (strategy === 'aggressive' ? candidate.player.goals * 8 + candidate.player.assists * 4 : candidate.player.points * 1.5);
}

function selectStartingXI(squad: Candidate[]) {
  const byPosition = (position: PositionGroup) => squad.filter((entry) => entry.position === position).sort((a, b) => b.score - a.score);
  const goalkeepers = byPosition('goalkeeper');
  const defenders = byPosition('defender');
  const midfielders = byPosition('midfielder');
  const forwards = byPosition('forward');
  let best: Candidate[] = [];
  let bestScore = -Infinity;
  for (let defenderCount = 3; defenderCount <= 5; defenderCount += 1) {
    for (let midfielderCount = 2; midfielderCount <= 5; midfielderCount += 1) {
      const forwardCount = 10 - defenderCount - midfielderCount;
      if (forwardCount < 1 || forwardCount > 3) continue;
      const lineup = [goalkeepers[0], ...defenders.slice(0, defenderCount), ...midfielders.slice(0, midfielderCount), ...forwards.slice(0, forwardCount)].filter((entry): entry is Candidate => Boolean(entry));
      if (lineup.length !== FANTASY_STARTING_SIZE) continue;
      const score = lineup.reduce((total, entry) => total + entry.score, 0);
      if (score > bestScore) { best = lineup; bestScore = score; }
    }
  }
  return best;
}

function stateRank(state: SearchState, budgetCap: number, minimumFutureCost: number) {
  const budgetFlexibility = Math.max(0, budgetCap - state.cost - minimumFutureCost);
  return state.score + Math.min(10, budgetFlexibility) * 0.05;
}

function uniqueCandidates(candidates: Candidate[]) {
  return Array.from(new Map(candidates.map((candidate) => [candidate.player.id, candidate])).values());
}

function minimumRemainingCost(candidates: Candidate[], positions: PositionGroup[]) {
  const required = positions.reduce((counts, position) => {
    counts[position] += 1;
    return counts;
  }, { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 } as Record<PositionGroup, number>);
  return (Object.keys(required) as PositionGroup[]).reduce((total, position) => {
    const prices = candidates.filter((candidate) => candidate.position === position).map((candidate) => candidate.player.price).sort((a, b) => a - b);
    return total + prices.slice(0, required[position]).reduce((sum, price) => sum + price, 0);
  }, 0);
}

function strategyLabel(strategy: OptimizationStrategy) {
  if (strategy === 'safe') return 'Reliability-first';
  if (strategy === 'aggressive') return 'High-upside attacking';
  if (strategy === 'value') return 'Budget-efficiency';
  return 'Balanced expected-output';
}

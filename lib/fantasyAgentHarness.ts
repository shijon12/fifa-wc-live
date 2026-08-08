import {
  FANTASY_BUDGET,
  FANTASY_SQUAD_SIZE,
  squadCost,
  squadPoints,
  type FantasyPlayer,
  type FantasySquad,
} from '@/lib/fantasySquad';
import { optimizeFantasySquad, type OptimizationStrategy } from '@/lib/fantasyOptimizer';

type ToolArguments = Record<string, unknown>;

export type FantasyAgentAction = {
  type: 'apply_squad';
  title: string;
  summary: string;
  squad: FantasySquad;
  changes: string[];
  cost: number;
  projectedPoints: number;
};

export type FantasyAgentToolResult = {
  content: string;
  action?: FantasyAgentAction;
};

export type FantasyAgentContext = {
  players: FantasyPlayer[];
  squad: FantasySquad;
  managerName: string;
};

export type DirectFantasyCommand = {
  reply: string;
  action?: FantasyAgentAction;
};

const REQUIRED_FORMATION = { goalkeeper: 2, defender: 5, midfielder: 5, forward: 3 } as const;
type PositionGroup = keyof typeof REQUIRED_FORMATION;

export const fantasyAgentTools = [
  {
    type: 'function',
    name: 'inspect_squad',
    description: 'Inspect the manager current squad, remaining budget, formation, captain, and validation issues.',
    strict: true,
    parameters: { type: 'object', additionalProperties: false, properties: {}, required: [] },
  },
  {
    type: 'function',
    name: 'search_players',
    description: 'Search the current fantasy player pool before recommending a named player or constructing a custom squad.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: ['string', 'null'], description: 'Player name search, or null.' },
        position: { type: 'string', enum: ['any', 'goalkeeper', 'defender', 'midfielder', 'forward'] },
        team: { type: ['string', 'null'], description: 'Team name search, or null.' },
        nationality: { type: ['string', 'null'], description: 'Citizenship or nationality search, or null.' },
        maxPrice: { type: ['number', 'null'], minimum: 0, maximum: 100 },
        limit: { type: 'integer', minimum: 1, maximum: 12 },
      },
      required: ['query', 'position', 'team', 'nationality', 'maxPrice', 'limit'],
    },
  },
  {
    type: 'function',
    name: 'optimize_squad',
    description: 'Run the application-owned squad optimizer over current player data, the existing squad, budget, locks, exclusions, preferences, hard constraints, and transfer limit. Returns a validated proposal, never a direct save.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        strategy: { type: 'string', enum: ['safe', 'balanced', 'aggressive', 'value'] },
        budgetCap: { type: 'number', minimum: 40, maximum: 100 },
        captainPreference: { type: ['string', 'null'], description: 'Preferred captain name, or null.' },
        teamConstraint: { type: ['string', 'null'], description: 'Require every player to represent this team, or null.' },
        nationalityConstraint: { type: ['string', 'null'], description: 'Require every player to have this citizenship/nationality, or null.' },
        lockedPlayerIds: { type: 'array', maxItems: 15, items: { type: 'string' }, description: 'Current player IDs that must remain selected.' },
        excludedPlayerIds: { type: 'array', maxItems: 30, items: { type: 'string' }, description: 'Player IDs that must not be selected.' },
        preferredTeams: { type: 'array', maxItems: 8, items: { type: 'string' }, description: 'Soft team preferences.' },
        preferredNationalities: { type: 'array', maxItems: 8, items: { type: 'string' }, description: 'Soft nationality preferences.' },
        maxChanges: { type: ['integer', 'null'], minimum: 0, maximum: 15, description: 'Maximum changes from a complete current squad, or null.' },
      },
      required: ['strategy', 'budgetCap', 'captainPreference', 'teamConstraint', 'nationalityConstraint', 'lockedPlayerIds', 'excludedPlayerIds', 'preferredTeams', 'preferredNationalities', 'maxChanges'],
    },
  },
  {
    type: 'function',
    name: 'clear_squad',
    description: 'Clear every selected player so the manager can rebuild manually. This is a draft action and still requires user confirmation.',
    strict: true,
    parameters: { type: 'object', additionalProperties: false, properties: {}, required: [] },
  },
  {
    type: 'function',
    name: 'remove_player',
    description: 'Remove one player from the current squad without replacing them. Partial draft squads are allowed. Requires user confirmation.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: { playerId: { type: 'string' } },
      required: ['playerId'],
    },
  },
  {
    type: 'function',
    name: 'replace_player',
    description: 'Replace one selected player with another player ID. This creates a validated proposal and never saves without confirmation.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        removePlayerId: { type: 'string' },
        addPlayerId: { type: 'string' },
      },
      required: ['removePlayerId', 'addPlayerId'],
    },
  },
  {
    type: 'function',
    name: 'set_captain',
    description: 'Make a selected player the captain. This creates a proposal and never saves without confirmation.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: { playerId: { type: 'string' } },
      required: ['playerId'],
    },
  },
  {
    type: 'function',
    name: 'set_vice_captain',
    description: 'Make a selected starting player the vice-captain. This creates a proposal and never saves without confirmation.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        playerId: { type: 'string' },
      },
      required: ['playerId'],
    },
  },
] as const;

export function runFantasyAgentTool(name: string, args: ToolArguments, context: FantasyAgentContext): FantasyAgentToolResult {
  if (name === 'inspect_squad') return inspectSquad(context);
  if (name === 'search_players') return searchPlayers(args, context.players);
  if (name === 'optimize_squad') return buildSquad(args, context);
  if (name === 'clear_squad') return clearSquad(context);
  if (name === 'remove_player') return removePlayer(args, context);
  if (name === 'replace_player') return replacePlayer(args, context);
  if (name === 'set_captain') return setCaptain(args, context);
  if (name === 'set_vice_captain') return setViceCaptain(args, context);
  return { content: JSON.stringify({ ok: false, error: 'Unknown tool.' }) };
}

export function resolveDirectFantasyCommand(message: string, context: FantasyAgentContext): DirectFantasyCommand | null {
  const normalized = message.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const clearIntent = /\b(clear|empty|unselect|deselect|remove|delete)\b/.test(normalized)
    && /\b(all|every|entire|whole|11|eleven|15|fifteen)\b/.test(normalized)
    && /\b(squad|team|player|players|pick|picks)\b/.test(normalized);
  if (!clearIntent) return null;
  if (!context.squad.playerIds.length) return { reply: 'Your squad is already empty. You can start selecting players manually.' };
  const action = draftProposal(
    context,
    { playerIds: [], starterIds: [], captainId: null, viceCaptainId: null },
    'Clear fantasy squad',
    'Remove every selected player and return to an empty draft.',
  );
  return {
    reply: 'I prepared an empty-squad draft. Review it below and select Apply proposal to remove all players.',
    action: action.action,
  };
}

export function summarizeSquad(players: FantasyPlayer[], squad: FantasySquad) {
  const byId = new Map(players.map((player) => [player.id, player]));
  return squad.playerIds.map((id) => {
    const player = byId.get(id);
    return player ? compactPlayer(player, id === squad.captainId) : { id, unavailable: true };
  });
}

function inspectSquad(context: FantasyAgentContext): FantasyAgentToolResult {
  const validation = validateSquad(context.players, context.squad, false);
  return {
    content: JSON.stringify({
      ok: validation.ok,
      players: summarizeSquad(context.players, context.squad),
      playerCount: context.squad.playerIds.length,
      cost: Number(squadCost(context.players, context.squad).toFixed(1)),
      budgetRemaining: Number((FANTASY_BUDGET - squadCost(context.players, context.squad)).toFixed(1)),
      projectedPoints: squadPoints(context.players, context.squad),
      formation: formationCounts(context.players, context.squad.playerIds),
      issues: validation.issues,
    }),
  };
}

function searchPlayers(args: ToolArguments, players: FantasyPlayer[]): FantasyAgentToolResult {
  const query = typeof args.query === 'string' ? args.query.trim().toLowerCase() : '';
  const team = typeof args.team === 'string' ? args.team.trim().toLowerCase() : '';
  const nationality = typeof args.nationality === 'string' ? args.nationality.trim().toLowerCase() : '';
  const position = typeof args.position === 'string' ? args.position : 'any';
  const maxPrice = typeof args.maxPrice === 'number' ? args.maxPrice : Infinity;
  const limit = typeof args.limit === 'number' ? Math.max(1, Math.min(12, Math.floor(args.limit))) : 8;
  const matches = players
    .filter((player) => !query || `${player.name} ${player.shortName}`.toLowerCase().includes(query))
    .filter((player) => !team || player.team.toLowerCase().includes(team))
    .filter((player) => !nationality || (player.citizenship ?? '').toLowerCase().includes(nationality))
    .filter((player) => position === 'any' || positionGroup(player.position) === position)
    .filter((player) => player.price <= maxPrice)
    .sort((a, b) => b.points - a.points || a.price - b.price)
    .slice(0, limit)
    .map((player) => compactPlayer(player, false));
  return { content: JSON.stringify({ ok: true, count: matches.length, players: matches }) };
}

function buildSquad(args: ToolArguments, context: FantasyAgentContext): FantasyAgentToolResult {
  const strategy = isStrategy(args.strategy) ? args.strategy : 'balanced';
  const result = optimizeFantasySquad(context.players, {
    strategy,
    budgetCap: typeof args.budgetCap === 'number' ? args.budgetCap : FANTASY_BUDGET,
    currentSquad: context.squad,
    lockedPlayerIds: stringArray(args.lockedPlayerIds, 15),
    excludedPlayerIds: stringArray(args.excludedPlayerIds, 30),
    preferredTeams: stringArray(args.preferredTeams, 8),
    preferredNationalities: stringArray(args.preferredNationalities, 8),
    requiredTeam: nullableString(args.teamConstraint),
    requiredNationality: nullableString(args.nationalityConstraint),
    maxChanges: typeof args.maxChanges === 'number' ? Math.max(0, Math.min(15, Math.floor(args.maxChanges))) : null,
    captainPreference: nullableString(args.captainPreference),
  });
  if (!result.valid) {
    return { content: JSON.stringify({ ok: false, error: 'The optimizer could not produce a valid XI.', issues: result.issues, closestValidAlternative: 'Relax one hard constraint or allow more transfers, then run the optimizer again.' }) };
  }
  const proposal = makeProposal(context, result.squad, `${capitalize(strategy)} optimized XI`, result.rationale.join(' · '));
  proposal.content = JSON.stringify({
    ok: true,
    optimizer: 'matchroom-beam-search-v1',
    objective: strategy,
    evaluatedPlayerRecords: context.players.length,
    cost: result.cost,
    currentPoints: result.currentPoints,
    optimizationScore: result.optimizationScore,
    changes: result.changes,
    rationale: result.rationale,
    topSelections: result.projections.slice(0, 5),
    requiresUserConfirmation: true,
  });
  return proposal;
}

function replacePlayer(args: ToolArguments, context: FantasyAgentContext): FantasyAgentToolResult {
  const removeId = typeof args.removePlayerId === 'string' ? args.removePlayerId : '';
  const addId = typeof args.addPlayerId === 'string' ? args.addPlayerId : '';
  const removePlayer = context.players.find((player) => player.id === removeId);
  const addPlayer = context.players.find((player) => player.id === addId);
  if (!context.squad.playerIds.includes(removeId) || !removePlayer) return { content: JSON.stringify({ ok: false, error: 'The player to remove is not in the current squad.' }) };
  if (!addPlayer) return { content: JSON.stringify({ ok: false, error: 'The replacement player is not in the current player pool.' }) };
  if (context.squad.playerIds.includes(addId)) return { content: JSON.stringify({ ok: false, error: 'The replacement player is already selected.' }) };
  if (positionGroup(removePlayer.position) !== positionGroup(addPlayer.position)) return { content: JSON.stringify({ ok: false, error: 'Replacement players must have the same fantasy position.' }) };

  const playerIds = context.squad.playerIds.map((id) => id === removeId ? addId : id);
  const captainId = context.squad.captainId === removeId ? addId : context.squad.captainId;
  const starterIds = (context.squad.starterIds ?? []).map((id) => id === removeId ? addId : id);
  const viceCaptainId = context.squad.viceCaptainId === removeId ? addId : context.squad.viceCaptainId ?? null;
  return makeProposal(context, { playerIds, starterIds, captainId, viceCaptainId }, 'Fantasy transfer', `${removePlayer.name} out, ${addPlayer.name} in.`);
}

function clearSquad(context: FantasyAgentContext): FantasyAgentToolResult {
  if (!context.squad.playerIds.length) return { content: JSON.stringify({ ok: true, noChange: true, message: 'The squad is already empty.' }) };
  return draftProposal(context, { playerIds: [], starterIds: [], captainId: null, viceCaptainId: null }, 'Clear fantasy squad', 'Remove every selected player and return to an empty draft.');
}

function removePlayer(args: ToolArguments, context: FantasyAgentContext): FantasyAgentToolResult {
  const playerId = typeof args.playerId === 'string' ? args.playerId : '';
  const player = context.players.find((entry) => entry.id === playerId);
  if (!player || !context.squad.playerIds.includes(playerId)) return { content: JSON.stringify({ ok: false, error: 'That player is not selected in the current squad.' }) };
  const playerIds = context.squad.playerIds.filter((id) => id !== playerId);
  const starterIds = (context.squad.starterIds ?? []).filter((id) => id !== playerId);
  const captainId = context.squad.captainId === playerId ? starterIds[0] ?? null : context.squad.captainId;
  const viceCaptainId = context.squad.viceCaptainId === playerId ? starterIds.find((id) => id !== captainId) ?? null : context.squad.viceCaptainId ?? null;
  return draftProposal(context, { playerIds, starterIds, captainId, viceCaptainId }, 'Remove player', `Remove ${player.name} and leave the slot empty for manual selection.`);
}

function setCaptain(args: ToolArguments, context: FantasyAgentContext): FantasyAgentToolResult {
  const playerId = typeof args.playerId === 'string' ? args.playerId : '';
  const player = context.players.find((entry) => entry.id === playerId);
  if (!player || !(context.squad.starterIds ?? []).includes(playerId)) return { content: JSON.stringify({ ok: false, error: 'Captain must be in the starting XI.' }) };
  const viceCaptainId = context.squad.viceCaptainId === playerId ? (context.squad.starterIds ?? []).find((id) => id !== playerId) ?? null : context.squad.viceCaptainId ?? null;
  return makeProposal(context, { ...context.squad, captainId: playerId, viceCaptainId }, 'Captain change', `${player.name} becomes captain.`);
}

function setViceCaptain(args: ToolArguments, context: FantasyAgentContext): FantasyAgentToolResult {
  const playerId = typeof args.playerId === 'string' ? args.playerId : '';
  const player = context.players.find((entry) => entry.id === playerId);
  if (!player || !(context.squad.starterIds ?? []).includes(playerId)) return { content: JSON.stringify({ ok: false, error: 'Vice-captain must be in the starting XI.' }) };
  if (context.squad.captainId === playerId) return { content: JSON.stringify({ ok: false, error: 'Captain and vice-captain must be different players.' }) };
  return makeProposal(context, { ...context.squad, viceCaptainId: playerId }, 'Vice-captain change', `${player.name} becomes vice-captain.`);
}

function makeProposal(context: FantasyAgentContext, squad: FantasySquad, title: string, summary: string): FantasyAgentToolResult {
  const validation = validateSquad(context.players, squad, true);
  if (!validation.ok) return { content: JSON.stringify({ ok: false, error: 'Squad proposal failed validation.', issues: validation.issues }) };
  const changes = describeChanges(context.players, context.squad, squad);
  const action: FantasyAgentAction = {
    type: 'apply_squad',
    title,
    summary,
    squad,
    changes,
    cost: Number(squadCost(context.players, squad).toFixed(1)),
    projectedPoints: squadPoints(context.players, squad),
  };
  return {
    action,
    content: JSON.stringify({ ok: true, proposal: { title, summary, changes, cost: action.cost, projectedPoints: action.projectedPoints }, requiresUserConfirmation: true }),
  };
}

function draftProposal(context: FantasyAgentContext, squad: FantasySquad, title: string, summary: string): FantasyAgentToolResult {
  const validation = validateSquad(context.players, squad, false);
  if (!validation.ok) return { content: JSON.stringify({ ok: false, error: 'Draft change failed validation.', issues: validation.issues }) };
  const action: FantasyAgentAction = {
    type: 'apply_squad',
    title,
    summary,
    squad,
    changes: describeChanges(context.players, context.squad, squad),
    cost: Number(squadCost(context.players, squad).toFixed(1)),
    projectedPoints: squadPoints(context.players, squad),
  };
  return { action, content: JSON.stringify({ ok: true, draft: true, title, summary, changes: action.changes, requiresUserConfirmation: true }) };
}

function validateSquad(players: FantasyPlayer[], squad: FantasySquad, requireComplete: boolean) {
  const issues: string[] = [];
  const uniqueIds = new Set(squad.playerIds);
  const byId = new Map(players.map((player) => [player.id, player]));
  if (uniqueIds.size !== squad.playerIds.length) issues.push('The squad contains duplicate players.');
  if (requireComplete && squad.playerIds.length !== FANTASY_SQUAD_SIZE) issues.push(`A complete squad requires ${FANTASY_SQUAD_SIZE} players.`);
  if (squad.playerIds.some((id) => !byId.has(id))) issues.push('One or more players are unavailable in the current player pool.');
  if (squadCost(players, squad) > FANTASY_BUDGET + 0.001) issues.push(`The squad exceeds the ${FANTASY_BUDGET} budget.`);
  const starterIds = squad.starterIds ?? [];
  const uniqueStarters = new Set(starterIds);
  if (uniqueStarters.size !== starterIds.length) issues.push('The starting XI contains duplicate players.');
  if (starterIds.some((id) => !uniqueIds.has(id))) issues.push('Every starter must be in the 15-player squad.');

  const teamCounts = new Map<string, number>();
  for (const id of squad.playerIds) {
    const player = byId.get(id);
    if (player) teamCounts.set(player.teamId, (teamCounts.get(player.teamId) ?? 0) + 1);
  }
  if (Array.from(teamCounts.values()).some((count) => count > 3)) issues.push('A squad can contain at most three players from one team.');

  if (requireComplete) {
    const formation = formationCounts(players, squad.playerIds);
    for (const [position, required] of Object.entries(REQUIRED_FORMATION) as Array<[PositionGroup, number]>) {
      if (formation[position] !== required) issues.push(`Formation requires ${required} ${position}${required === 1 ? '' : 's'}.`);
    }
    if (starterIds.length !== 11) issues.push('Choose exactly 11 starters.');
    const startingFormation = formationCounts(players, starterIds);
    if (startingFormation.goalkeeper !== 1) issues.push('The starting XI requires exactly one goalkeeper.');
    if (startingFormation.defender < 3 || startingFormation.defender > 5) issues.push('The starting XI requires three to five defenders.');
    if (startingFormation.midfielder < 2 || startingFormation.midfielder > 5) issues.push('The starting XI requires two to five midfielders.');
    if (startingFormation.forward < 1 || startingFormation.forward > 3) issues.push('The starting XI requires one to three forwards.');
    if (!squad.captainId || !uniqueStarters.has(squad.captainId)) issues.push('Captain must be in the starting XI.');
    if (!squad.viceCaptainId || !uniqueStarters.has(squad.viceCaptainId)) issues.push('Vice-captain must be in the starting XI.');
    if (squad.captainId && squad.captainId === squad.viceCaptainId) issues.push('Captain and vice-captain must be different players.');
  }
  return { ok: issues.length === 0, issues };
}

function formationCounts(players: FantasyPlayer[], ids: string[]) {
  const byId = new Map(players.map((player) => [player.id, player]));
  const counts: Record<PositionGroup, number> = { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 };
  ids.forEach((id) => {
    const player = byId.get(id);
    if (player) counts[positionGroup(player.position)] += 1;
  });
  return counts;
}

function positionGroup(position: string): PositionGroup {
  if (/goalkeeper|\bgk\b/i.test(position)) return 'goalkeeper';
  if (/defender|back|\bdf\b/i.test(position)) return 'defender';
  if (/midfielder|midfield|\bmf\b/i.test(position)) return 'midfielder';
  return 'forward';
}

function compactPlayer(player: FantasyPlayer, captain: boolean) {
  return {
    id: player.id,
    name: player.name,
    team: player.team,
    position: positionGroup(player.position),
    price: player.price,
    points: player.points,
    appearances: player.appearances,
    goals: player.goals,
    assists: player.assists,
    form: player.form,
    minutes: player.minutes,
    starts: player.appearances,
    availability: {
      status: player.availabilityStatus,
      chanceOfPlayingNextRound: player.chanceOfPlaying,
      news: player.availabilityNews,
      updatedAt: player.availabilityUpdatedAt,
    },
    expected: { goals: player.expectedGoals, assists: player.expectedAssists, ictIndex: player.ictIndex },
    upcomingFixtures: player.upcomingFixtures,
    captain,
  };
}

function describeChanges(players: FantasyPlayer[], before: FantasySquad, after: FantasySquad) {
  const byId = new Map(players.map((player) => [player.id, player]));
  const beforeIds = new Set(before.playerIds);
  const afterIds = new Set(after.playerIds);
  const added = after.playerIds.filter((id) => !beforeIds.has(id)).map((id) => byId.get(id)?.name ?? id);
  const removed = before.playerIds.filter((id) => !afterIds.has(id)).map((id) => byId.get(id)?.name ?? id);
  const changes: string[] = [];
  if (added.length) changes.push(`Add: ${added.join(', ')}`);
  if (removed.length) changes.push(`Remove: ${removed.join(', ')}`);
  if (before.captainId !== after.captainId && after.captainId) changes.push(`Captain: ${byId.get(after.captainId)?.name ?? after.captainId}`);
  if (!changes.length) changes.push('No squad changes.');
  return changes;
}

function isStrategy(value: unknown): value is OptimizationStrategy {
  return value === 'safe' || value === 'balanced' || value === 'aggressive' || value === 'value';
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stringArray(value: unknown, limit: number) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string').slice(0, limit) : [];
}

function nullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

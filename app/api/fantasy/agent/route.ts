import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  fantasyAgentTools,
  resolveDirectFantasyCommand,
  runFantasyAgentTool,
  summarizeSquad,
  type FantasyAgentAction,
} from '@/lib/fantasyAgentHarness';
import { claimFantasyAgentUsage } from '@/lib/fantasyAgentUsage';
import { fetchFantasyPlayerPool, type FantasySquad } from '@/lib/fantasySquad';
import { clientIdentifier, rateLimit } from '@/lib/security';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type AgentRequest = {
  message?: unknown;
  history?: unknown;
  squad?: unknown;
  managerName?: unknown;
};

type OpenAIOutputItem = {
  type?: string;
  id?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  content?: Array<{ type?: string; text?: string }>;
  [key: string]: unknown;
};

type OpenAIResponse = {
  id?: string;
  output?: OpenAIOutputItem[];
  error?: { message?: string; code?: string };
};

const MAX_HISTORY = 10;
const MAX_TOOL_ROUNDS = 6;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to use the fantasy agent.' }, { status: 401 });

  const quota = rateLimit(`fantasy-agent:${user.id}:${clientIdentifier(request)}`, 12, 60_000);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: 'The agent has received too many messages. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(quota.retryAfter) } },
    );
  }
  let body: AgentRequest;
  try {
    body = (await request.json()) as AgentRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 1_000) return NextResponse.json({ error: 'Message must contain 1 to 1,000 characters.' }, { status: 400 });
  const history = normalizeHistory(body.history);
  const squad = normalizeSquad(body.squad);
  if (!squad) return NextResponse.json({ error: 'Invalid fantasy squad.' }, { status: 400 });
  const managerName = typeof body.managerName === 'string' ? body.managerName.trim().slice(0, 60) : user.displayName;

  const players = await fetchFantasyPlayerPool();
  if (!players.length) return NextResponse.json({ error: 'The live fantasy player pool is unavailable right now.' }, { status: 503 });
  if (squad.playerIds.some((id) => !players.some((player) => player.id === id))) {
    return NextResponse.json({ error: 'Refresh the page before asking the agent to change this squad.' }, { status: 409 });
  }

  const context = { players, squad, managerName: managerName || user.displayName };
  const direct = resolveDirectFantasyCommand(message, context);
  if (direct) return NextResponse.json({ ...direct, model: 'matchroom-harness' });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'The virtual agent is waiting for OpenAI API credits.' }, { status: 503 });

  let usage;
  try {
    usage = await claimFantasyAgentUsage(user.id);
  } catch {
    return NextResponse.json({ error: 'The fantasy agent usage guard is temporarily unavailable. Your squad has not changed.' }, { status: 503 });
  }
  if (!usage.allowed) {
    return NextResponse.json({ error: `You have used today’s ${usage.limit} fantasy agent messages. Your allowance resets at 00:00 UTC.`, usage }, { status: 429 });
  }

  const model = process.env.FANTASY_AGENT_MODEL || 'gpt-5.6-sol';
  const input: Array<Record<string, unknown>> = [
    {
      role: 'system',
      content: [{ type: 'input_text', text: agentInstructions() }],
    },
    {
      role: 'system',
      content: [{
        type: 'input_text',
        text: `Current manager context: ${JSON.stringify({
          managerName: context.managerName,
          squad: summarizeSquad(players, squad),
          playerCount: squad.playerIds.length,
          rules: 'FPL-style: 15 players for 100.0; 2 goalkeepers, 5 defenders, 5 midfielders, 3 forwards; maximum 3 per club; choose a valid starting XI, captain, and vice-captain',
        })}`,
      }],
    },
    ...history.map((entry) => ({
      role: entry.role,
      content: [{ type: entry.role === 'assistant' ? 'output_text' : 'input_text', text: entry.content }],
    })),
    { role: 'user', content: [{ type: 'input_text', text: message }] },
  ];

  let pendingAction: FantasyAgentAction | undefined;
  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input,
        tools: fantasyAgentTools,
        tool_choice: 'auto',
        max_output_tokens: 900,
        store: false,
        include: ['reasoning.encrypted_content'],
      }),
      cache: 'no-store',
    });
    const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;
    if (!response.ok) return openAIError(payload, response.status);

    const output = payload.output ?? [];
    const calls = output.filter((item) => item.type === 'function_call' && item.call_id && item.name);
    const reply = output
      .flatMap((item) => item.content ?? [])
      .filter((content) => content.type === 'output_text' && content.text)
      .map((content) => content.text)
      .join('\n')
      .trim();

    if (!calls.length) {
      return NextResponse.json({
        reply: reply || (pendingAction ? 'I prepared a validated squad change. Review it below before applying it.' : 'I could not complete that request. Try naming a player, position, budget, or strategy.'),
        action: pendingAction,
        model,
        usage,
      });
    }

    input.push(...output);
    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try {
        args = call.arguments ? JSON.parse(call.arguments) as Record<string, unknown> : {};
      } catch {
        args = {};
      }
      const result = pendingAction
        ? { content: JSON.stringify({ ok: false, error: 'One squad proposal is already pending. Ask the user to confirm or dismiss it.' }) }
        : runFantasyAgentTool(call.name!, args, context);
      if (result.action) pendingAction = result.action;
      input.push({ type: 'function_call_output', call_id: call.call_id, output: result.content });
    }
  }

  return NextResponse.json({
    reply: pendingAction
      ? 'I prepared a valid squad change. Review the proposal before applying it.'
      : 'I reached the tool limit before completing that request. Please make the instruction a little more specific.',
    action: pendingAction,
    model,
    usage,
  });
}

function normalizeHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
    .filter((entry) => typeof entry.content === 'string' && entry.content.trim().length > 0)
    .slice(-MAX_HISTORY)
    .map((entry) => ({ role: entry.role as ChatMessage['role'], content: (entry.content as string).trim().slice(0, 1_000) }));
}

function normalizeSquad(value: unknown): FantasySquad | null {
  if (!value || typeof value !== 'object') return { playerIds: [], starterIds: [], captainId: null, viceCaptainId: null };
  const candidate = value as { playerIds?: unknown; starterIds?: unknown; benchIds?: unknown; captainId?: unknown; viceCaptainId?: unknown };
  if (!Array.isArray(candidate.playerIds) || candidate.playerIds.length > 15) return null;
  const playerIds = candidate.playerIds.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 100);
  if (playerIds.length !== candidate.playerIds.length || new Set(playerIds).size !== playerIds.length) return null;
  const rawStarters = candidate.starterIds === undefined ? playerIds.slice(0, 11) : candidate.starterIds;
  if (!Array.isArray(rawStarters) || rawStarters.length > 11) return null;
  const starterIds = rawStarters.filter((id): id is string => typeof id === 'string' && playerIds.includes(id));
  if (starterIds.length !== rawStarters.length || new Set(starterIds).size !== starterIds.length) return null;
  const captainId = candidate.captainId === null || candidate.captainId === undefined
    ? null
    : typeof candidate.captainId === 'string' ? candidate.captainId : null;
  if (candidate.captainId && captainId === null) return null;
  const viceCaptainId = candidate.viceCaptainId === null || candidate.viceCaptainId === undefined
    ? null
    : typeof candidate.viceCaptainId === 'string' ? candidate.viceCaptainId : null;
  if (candidate.viceCaptainId && viceCaptainId === null) return null;
  const benchIds = Array.isArray(candidate.benchIds) ? candidate.benchIds.filter((id): id is string => typeof id === 'string' && playerIds.includes(id) && !starterIds.includes(id)).slice(0, 4) : playerIds.filter((id) => !starterIds.includes(id));
  return { playerIds, starterIds, benchIds, captainId, viceCaptainId };
}

function agentInstructions() {
  return [
    'You are The Matchroom fantasy co-manager, a conversational football agent.',
    'Help the signed-in manager understand fantasy choices and carry out requested squad planning through the provided tools.',
    'For any request to build, improve, rebalance, personalize, or find the best XI, call optimize_squad. The application optimizer—not you—must choose the final player IDs.',
    'For drafting requests, use clear_squad to remove everyone or remove_player to leave an individual slot empty. Partial and empty drafts are allowed.',
    'Translate the user intent into optimizer inputs: strategy, budget cap, current-player locks, exclusions, soft preferences, hard team/nationality constraints, transfer limit, and captain preference.',
    'Use the supplied current squad as the user picks. Preserve it with locks or a sensible maxChanges value when the user asks for an improvement rather than a complete rebuild.',
    'Use tools for every player fact and every squad change. Never invent a player, ID, price, point total, injury, fixture, or statistic.',
    'Availability, injury notes, chance of playing, news timestamps, and upcoming fixtures come from the official Fantasy Premier League feeds. Cite the relevant status, opponent/difficulty, and update time when they affect an answer.',
    'Treat status, probability, and news as provider observations rather than medical certainty. Never claim a lineup is confirmed unless the supplied facts explicitly say so.',
    'Avoid injured, suspended, unavailable, or zero-percent players in new optimized squads unless the manager explicitly asks to retain them. Flag questionable locked picks.',
    'Use the familiar FPL-style rules: a 15-player squad (2 GK, 5 DEF, 5 MID, 3 FWD), 100.0 budget, maximum three players per club, and a valid starting XI with captain and vice-captain.',
    'A squad action is only a proposal. Say clearly that the manager must review and apply it; never claim that it has already been saved.',
    'Ask one concise clarification when the requested player or intent is genuinely ambiguous. Otherwise act directly.',
    'Before replacing a player, search for the exact replacement if its ID is not already known. Replacement positions must match.',
    'Translate country adjectives and misspellings into likely team or nationality constraints. Pass those constraints to optimize_squad instead of ignoring them.',
    'If a requested squad conflicts with a fantasy rule, explain the exact conflict and offer the closest valid alternative. Never silently relax the instruction.',
    'Produce no more than one squad proposal per turn.',
    'Keep answers conversational and concise. Explain the most important tradeoff, not a long generic lecture.',
    'Do not provide gambling advice, claim guaranteed returns, or imply certainty about future performance.',
  ].join(' ');
}

function openAIError(payload: OpenAIResponse, status: number) {
  console.error('Fantasy agent OpenAI request failed.', {
    status,
    code: payload.error?.code ?? 'unknown',
    message: payload.error?.message?.slice(0, 300) ?? 'No provider message',
  });
  const quota = status === 429 || payload.error?.code === 'insufficient_quota';
  const error = quota
    ? 'The fantasy agent has no available OpenAI quota right now. Add API credits, then try again.'
    : status === 401
      ? 'The fantasy agent API key is invalid or expired.'
      : 'The fantasy agent is temporarily unavailable. Your current squad has not changed.';
  return NextResponse.json({ error }, { status: quota ? 429 : 502 });
}

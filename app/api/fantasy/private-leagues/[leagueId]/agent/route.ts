import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listFantasyProfilesForLeaderboard, listPrivateLeagueMemberIds, listPrivateLeagueMessages, listPrivateLeagues } from '@/lib/fantasyStore';
import { fetchAllFantasyMatches, scoreFantasyPick } from '@/lib/fantasyScoring';
import { fetchFantasyPlayerPool, squadPoints } from '@/lib/fantasySquad';
import { clientIdentifier, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';

type ChatEntry = { role: 'user' | 'assistant'; content: string };
type OutputItem = { type?: string; name?: string; arguments?: string; content?: Array<{ type?: string; text?: string }> };

export async function POST(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to use the room agent.' }, { status: 401 });
  const { leagueId } = await params;
  if (!/^[a-f\d-]{36}$/i.test(leagueId)) return NextResponse.json({ error: 'Invalid private league.' }, { status: 400 });
  const gate = rateLimit(`room-agent:${user.id}:${clientIdentifier(request)}`, 15, 60_000);
  if (!gate.allowed) return NextResponse.json({ error: 'The room agent is receiving messages too quickly.' }, { status: 429 });
  const input = await request.json().catch(() => ({})) as { message?: unknown; history?: unknown };
  const message = typeof input.message === 'string' ? input.message.trim().slice(0, 800) : '';
  if (!message) return NextResponse.json({ error: 'Write a message first.' }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'The Matchroom agent is not configured.' }, { status: 503 });

  try {
    const [memberIds, leagues, profiles, matches, players, roomMessages] = await Promise.all([
      listPrivateLeagueMemberIds(user, leagueId),
      listPrivateLeagues(user),
      listFantasyProfilesForLeaderboard(),
      fetchAllFantasyMatches(),
      fetchFantasyPlayerPool(),
      listPrivateLeagueMessages(user, leagueId),
    ]);
    const league = leagues.find((entry) => entry.id === leagueId);
    if (!league) return NextResponse.json({ error: 'Private league not found.' }, { status: 404 });
    const allowed = new Set(memberIds);
    const leaderboard = profiles.filter((profile) => allowed.has(profile.id)).map((profile) => {
      const picks = profile.fantasy.picks ?? {};
      const predictionPoints = matches.reduce((total, match) => total + scoreFantasyPick(match, picks[match.id]), 0);
      const fantasyPoints = profile.fantasy.squad ? squadPoints(players, profile.fantasy.squad) : 0;
      return {
        manager: profile.fantasy.managerName || profile.displayName,
        totalPoints: predictionPoints + fantasyPoints,
        squadPlayers: profile.fantasy.squad?.playerIds.length ?? 0,
        predictions: Object.keys(picks).length,
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
    const history = normalizeHistory(input.history);
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.FANTASY_AGENT_MODEL || 'gpt-5.6-sol',
        store: false,
        max_output_tokens: 500,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: `You are The Matchroom private-league agent. Analyze only the supplied room data. Answer questions about standings, participation, squads, and predictions. Help the manager engage the room. When asked to announce, challenge, remind, congratulate, or post something, call draft_room_message. Never claim a draft was posted; it requires confirmation. Be concise, warm, and specific. Room data: ${JSON.stringify({ league: league.name, members: league.memberList, leaderboard, recentChat: roomMessages.slice(-8).map((entry) => ({ name: entry.displayName, body: entry.body })) })}` }] },
          ...history.map((entry) => ({ role: entry.role, content: [{ type: entry.role === 'assistant' ? 'output_text' : 'input_text', text: entry.content }] })),
          { role: 'user', content: [{ type: 'input_text', text: message }] },
        ],
        tools: [{
          type: 'function', name: 'draft_room_message', strict: true,
          description: 'Draft a concise message for the private league chat. The user must confirm before it is posted.',
          parameters: { type: 'object', additionalProperties: false, properties: { body: { type: 'string', minLength: 2, maxLength: 500 } }, required: ['body'] },
        }],
      }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({})) as { output?: OutputItem[]; error?: { message?: string } };
    if (!response.ok) {
      console.error('Room agent provider error', response.status, payload.error?.message?.slice(0, 200));
      return NextResponse.json({ error: 'The room agent is temporarily unavailable.' }, { status: 502 });
    }
    const call = payload.output?.find((item) => item.type === 'function_call' && item.name === 'draft_room_message');
    if (call) {
      const args = JSON.parse(call.arguments ?? '{}') as { body?: string };
      const body = String(args.body ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
      if (body) return NextResponse.json({ reply: 'I drafted a room message. Review it before posting.', action: { type: 'post_room_message', body } });
    }
    const reply = payload.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === 'output_text').map((item) => item.text).join('\n').trim();
    return NextResponse.json({ reply: reply || 'I could not complete that room request. Try asking about the standings or participation.' });
  } catch (error) {
    console.error('Room agent failed', error);
    return NextResponse.json({ error: 'The room agent is temporarily unavailable.' }, { status: 500 });
  }
}

function normalizeHistory(value: unknown): ChatEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is ChatEntry => Boolean(entry) && typeof entry === 'object' && ((entry as ChatEntry).role === 'user' || (entry as ChatEntry).role === 'assistant') && typeof (entry as ChatEntry).content === 'string').slice(-8).map((entry) => ({ role: entry.role, content: entry.content.slice(0, 800) }));
}

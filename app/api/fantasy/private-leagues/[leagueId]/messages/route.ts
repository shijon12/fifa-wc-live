import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createPrivateLeagueMessage, listPrivateLeagueMessages } from '@/lib/fantasyStore';
import { clientIdentifier, rateLimit } from '@/lib/security';
import { isMissingTable } from '@/lib/supabaseRest';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { leagueId } = await params;
  if (!isUuid(leagueId)) return NextResponse.json({ error: 'Invalid private league.' }, { status: 400 });
  try {
    return NextResponse.json({ messages: await listPrivateLeagueMessages(user, leagueId), configured: true });
  } catch (error) {
    if (isMissingTable(error)) return NextResponse.json({ messages: [], configured: false }, { status: 503 });
    const message = error instanceof Error ? error.message : 'Unable to load chat.';
    return NextResponse.json({ error: message }, { status: /not a member/i.test(message) ? 403 : 400 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { leagueId } = await params;
  if (!isUuid(leagueId)) return NextResponse.json({ error: 'Invalid private league.' }, { status: 400 });
  const gate = rateLimit(`league-chat:${clientIdentifier(request)}:${user.id}`, 20, 60_000);
  if (!gate.allowed) return NextResponse.json({ error: 'You are sending messages too quickly.' }, { status: 429 });

  const input = (await request.json().catch(() => ({}))) as { body?: string };
  const body = String(input.body ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!body) return NextResponse.json({ error: 'Write a message first.' }, { status: 400 });
  try {
    return NextResponse.json({ message: await createPrivateLeagueMessage(user, leagueId, body), configured: true });
  } catch (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: 'Room chat needs the latest database migration.', configured: false }, { status: 503 });
    const message = error instanceof Error ? error.message : 'Unable to send message.';
    return NextResponse.json({ error: message }, { status: /not a member/i.test(message) ? 403 : 400 });
  }
}

function isUuid(value: string) {
  return /^[a-f\d-]{36}$/i.test(value);
}

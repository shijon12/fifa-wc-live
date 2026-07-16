import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createPrivateLeague, joinPrivateLeague, listPrivateLeagues } from '@/lib/fantasyStore';
import { clientIdentifier, rateLimit } from '@/lib/security';
import { isMissingTable } from '@/lib/supabaseRest';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    return NextResponse.json({ leagues: await listPrivateLeagues(user), configured: true });
  } catch (error) {
    if (isMissingTable(error)) return NextResponse.json({ leagues: [], configured: false });
    throw error;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const gate = rateLimit(`private-leagues:${clientIdentifier(request)}:${user.id}`, 10, 60_000);
  if (!gate.allowed) return NextResponse.json({ error: 'Too many league actions. Try again shortly.' }, { status: 429 });

  const input = (await request.json()) as { action?: string; name?: string; joinCode?: string };
  try {
    if (input.action === 'create') {
      const name = String(input.name ?? '').trim().slice(0, 80);
      if (name.length < 2) return NextResponse.json({ error: 'League name is too short.' }, { status: 400 });
      return NextResponse.json({ league: await createPrivateLeague(user, name), configured: true });
    }
    if (input.action === 'join') {
      const joinCode = String(input.joinCode ?? '').trim().toUpperCase();
      if (joinCode.length < 4) return NextResponse.json({ error: 'Enter a valid join code.' }, { status: 400 });
      return NextResponse.json({ league: await joinPrivateLeague(user, joinCode), configured: true });
    }
    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: 'Private leagues need the production database migration before they can be used.', configured: false }, { status: 503 });
    const message = error instanceof Error ? error.message : 'Private league action failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

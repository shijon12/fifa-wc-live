import { NextResponse } from 'next/server';
import { getCurrentUser, getUserFantasyProfile, updateUserFantasyProfile, type FantasyProfile } from '@/lib/auth';
import { clientIdentifier, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  return NextResponse.json({ fantasy: await getUserFantasyProfile(user.id) });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const gate = rateLimit(`fantasy:picks:${clientIdentifier(request)}:${user.id}`, 30, 60_000);
  if (!gate.allowed) return NextResponse.json({ error: 'Too many fantasy saves. Please slow down.' }, { status: 429 });

  const input = (await request.json()) as Partial<FantasyProfile>;
  const managerName = String(input.managerName ?? user.displayName).trim().slice(0, 60) || user.displayName;
  const picks = Object.fromEntries(
    Object.entries(input.picks ?? {}).flatMap(([matchId, pick]) => {
      if (!pick || !['home', 'draw', 'away'].includes(pick.choice)) return [];
      const confidence = Math.max(1, Math.min(5, Number(pick.confidence) || 1));
      return [[matchId.slice(0, 120), { matchId: matchId.slice(0, 120), choice: pick.choice, confidence }]];
    }).slice(0, 300),
  );
  const rawSquad = input.squad;
  const uniquePlayerIds = Array.from(new Set((rawSquad?.playerIds ?? []).map((id) => String(id).slice(0, 80)))).slice(0, 15);
  const captainId = rawSquad?.captainId && uniquePlayerIds.includes(rawSquad.captainId) ? rawSquad.captainId : uniquePlayerIds[0] ?? null;

  const fantasy = { managerName, picks, squad: { playerIds: uniquePlayerIds, captainId } };
  await updateUserFantasyProfile(user, fantasy);
  return NextResponse.json({ fantasy });
}

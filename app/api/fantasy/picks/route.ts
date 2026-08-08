import { NextResponse } from 'next/server';
import { getCurrentUser, type FantasyProfile } from '@/lib/auth';
import { readFantasyProfile, writeFantasyProfile } from '@/lib/fantasyStore';
import { clientIdentifier, rateLimit } from '@/lib/security';
import { prepareSquadSave } from '@/lib/fantasyGameEngine';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  return NextResponse.json({ fantasy: await readFantasyProfile(user) });
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
  const starterIds = Array.from(new Set((rawSquad?.starterIds ?? []).map((id) => String(id).slice(0, 80))))
    .filter((id) => uniquePlayerIds.includes(id)).slice(0, 11);
  const captainId = rawSquad?.captainId && starterIds.includes(rawSquad.captainId) ? rawSquad.captainId : starterIds[0] ?? null;
  const viceCaptainId = rawSquad?.viceCaptainId && starterIds.includes(rawSquad.viceCaptainId) && rawSquad.viceCaptainId !== captainId
    ? rawSquad.viceCaptainId
    : starterIds.find((id) => id !== captainId) ?? null;
  const remainingBench = uniquePlayerIds.filter((id) => !starterIds.includes(id));
  const benchIds = Array.from(new Set((rawSquad?.benchIds ?? remainingBench).map((id) => String(id).slice(0, 80)))).filter((id) => remainingBench.includes(id));
  remainingBench.forEach((id) => { if (!benchIds.includes(id)) benchIds.push(id); });

  const fantasy = { managerName, picks, squad: { playerIds: uniquePlayerIds, starterIds, benchIds: benchIds.slice(0, 4), captainId, viceCaptainId } };
  const previous = await readFantasyProfile(user);
  await prepareSquadSave(user.id, previous.squad ?? { playerIds: [], starterIds: [], benchIds: [], captainId: null, viceCaptainId: null }, fantasy.squad);
  await writeFantasyProfile(user, fantasy);
  return NextResponse.json({ fantasy });
}

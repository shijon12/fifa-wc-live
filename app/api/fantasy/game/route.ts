import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { fantasyDashboard, setFantasyChip, type FantasyChip } from '@/lib/fantasyGameEngine';
import { clientIdentifier, rateLimit } from '@/lib/security';

export async function GET() { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }); return NextResponse.json(await fantasyDashboard(user)); }
export async function POST(request: Request) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }); const gate = rateLimit(`fantasy-game:${clientIdentifier(request)}:${user.id}`, 12, 60_000); if (!gate.allowed) return NextResponse.json({ error: 'Too many game actions.' }, { status: 429 }); const input = await request.json().catch(() => ({})) as { chip?: FantasyChip | null }; try { return NextResponse.json(await setFantasyChip(user.id, input.chip ?? null)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update chip.' }, { status: 400 }); } }

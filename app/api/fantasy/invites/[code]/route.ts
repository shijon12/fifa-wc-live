import { NextResponse } from 'next/server';
import { getPrivateLeaguePreview } from '@/lib/fantasyStore';

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const league = await getPrivateLeaguePreview(code);
  if (!league) return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
  return NextResponse.json({ league });
}

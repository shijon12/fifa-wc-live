import { NextResponse } from 'next/server';
import { clientIdentifier, rateLimit } from '@/lib/security';

type PlayerSearchResponse = {
  player?: Array<{
    strCutout?: string | null;
    strThumb?: string | null;
  }> | null;
};

export async function GET(request: Request) {
  const quota = rateLimit(`player-image:${clientIdentifier(request)}`, 30, 60_000);
  if (!quota.allowed) return NextResponse.json({ error: 'Too many image requests.' }, { status: 429, headers: { 'Retry-After': String(quota.retryAfter) } });
  const name = new URL(request.url).searchParams.get('name')?.trim();
  if (!name || name.length > 100) {
    return NextResponse.json({ error: 'A valid player name is required.' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`,
      { next: { revalidate: 86_400 } },
    );
    if (!response.ok) return NextResponse.json({ image: null });
    const data = (await response.json()) as PlayerSearchResponse;
    const player = data.player?.[0];
    return NextResponse.json({ image: player?.strCutout || player?.strThumb || null });
  } catch {
    return NextResponse.json({ image: null });
  }
}

import { NextResponse } from 'next/server';
import { fetchTeamNews } from '@/lib/teamNews';
import { clientIdentifier, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const quota = rateLimit(`team-news:${clientIdentifier(request)}`, 40, 60_000);
  if (!quota.allowed) return NextResponse.json({ error: 'Too many news requests. Try again shortly.' }, { status: 429 });

  const url = new URL(request.url);
  const team = url.searchParams.get('team')?.trim() ?? '';
  if (team.length < 2 || team.length > 80) return NextResponse.json({ error: 'Choose a valid team.' }, { status: 400 });

  try {
    return NextResponse.json(await fetchTeamNews(team));
  } catch {
    return NextResponse.json({
      team,
      generatedAt: new Date().toISOString(),
      windowDays: 30,
      sentiment: { label: 'neutral', positive: 0, neutral: 0, negative: 0, summary: `Recent credible news is temporarily unavailable for ${team}.` },
      items: [],
    });
  }
}

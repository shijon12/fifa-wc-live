import { NextResponse } from 'next/server';
import { subscribeToNewsletter } from '@/lib/newsletter';
import { clientIdentifier, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const quota = rateLimit(`newsletter:${clientIdentifier(request)}`, 8, 60_000);
  if (!quota.allowed) return NextResponse.json({ error: 'Too many newsletter requests. Please wait a minute.' }, { status: 429 });

  const input = await request.json().catch(() => ({})) as {
    email?: string;
    name?: string;
    favoriteTeam?: string;
    sourcePath?: string;
  };

  try {
    const result = await subscribeToNewsletter({
      email: input.email ?? '',
      name: input.name,
      favoriteTeam: input.favoriteTeam,
      sourcePath: input.sourcePath ?? '/',
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to subscribe.' }, { status: 400 });
  }
}

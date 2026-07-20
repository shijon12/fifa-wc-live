import { NextResponse } from 'next/server';
import { unsubscribeFromNewsletter } from '@/lib/newsletter';
import { clientIdentifier, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const quota = rateLimit(`newsletter-unsubscribe:${clientIdentifier(request)}`, 12, 60_000);
  if (!quota.allowed) return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });

  const input = await request.json().catch(() => ({})) as { email?: string };

  try {
    const result = await unsubscribeFromNewsletter(input.email ?? '');
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to unsubscribe.' }, { status: 400 });
  }
}

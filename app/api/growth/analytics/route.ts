import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recordProductEvent } from '@/lib/growth';
import { clientIdentifier, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const quota = rateLimit(`analytics:${clientIdentifier(request)}`, 120, 60_000);
  if (!quota.allowed) return NextResponse.json({ error: 'Too many analytics events.' }, { status: 429 });

  const input = await request.json().catch(() => ({})) as {
    anonymousId?: string;
    eventName?: string;
    path?: string;
    feature?: string;
    metadata?: Record<string, unknown>;
  };
  const user = await getCurrentUser().catch(() => null);
  const result = await recordProductEvent({
    userId: user?.id ?? null,
    anonymousId: input.anonymousId ?? null,
    eventName: input.eventName ?? 'event',
    path: input.path ?? '/',
    feature: input.feature ?? null,
    metadata: input.metadata ?? {},
  });

  return NextResponse.json(result);
}

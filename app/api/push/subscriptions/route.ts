import { NextResponse } from 'next/server';
import {
  removePushSubscription,
  savePushSubscription,
  type StoredPushSubscription,
} from '@/lib/pushNotifications';
import { clientIdentifier, rateLimit } from '@/lib/security';

type SubscriptionInput = {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  favoriteTeamIds?: unknown;
};

export async function POST(request: Request) {
  const quota = rateLimit(`push-subscription:${clientIdentifier(request)}`, 12, 60_000);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: 'Too many subscription updates.' },
      { status: 429, headers: { 'Retry-After': String(quota.retryAfter) } },
    );
  }
  let input: SubscriptionInput;
  try {
    input = (await request.json()) as SubscriptionInput;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const parsed = parseSubscription(input);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid push subscription.' }, { status: 400 });
  }
  try {
    await savePushSubscription(parsed);
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error('Push subscription save failed', error);
    return NextResponse.json({ error: 'Push notifications are temporarily unavailable.' }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const quota = rateLimit(`push-unsubscribe:${clientIdentifier(request)}`, 6, 60_000);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: 'Too many unsubscribe requests.' },
      { status: 429, headers: { 'Retry-After': String(quota.retryAfter) } },
    );
  }
  let endpoint = '';
  try {
    endpoint = String(((await request.json()) as { endpoint?: unknown }).endpoint ?? '');
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!validEndpoint(endpoint)) {
    return NextResponse.json({ error: 'Invalid push endpoint.' }, { status: 400 });
  }
  try {
    await removePushSubscription(endpoint);
    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error('Push subscription removal failed', error);
    return NextResponse.json({ error: 'Unable to remove the push subscription.' }, { status: 503 });
  }
}

function parseSubscription(input: SubscriptionInput): StoredPushSubscription | null {
  const endpoint = input.subscription?.endpoint ?? '';
  const p256dh = input.subscription?.keys?.p256dh ?? '';
  const auth = input.subscription?.keys?.auth ?? '';
  const favoriteTeamIds = Array.isArray(input.favoriteTeamIds)
    ? Array.from(new Set(input.favoriteTeamIds.map(String).filter((id) => /^\d+$/.test(id)))).slice(0, 48)
    : [];
  if (
    !validEndpoint(endpoint)
    || !validKey(p256dh, 256)
    || !validKey(auth, 128)
  ) return null;
  return {
    endpoint,
    p256dh,
    auth,
    favorite_team_ids: favoriteTeamIds,
  };
}

function validEndpoint(endpoint: string) {
  if (endpoint.length < 20 || endpoint.length > 2048) return false;
  try {
    return new URL(endpoint).protocol === 'https:';
  } catch {
    return false;
  }
}

function validKey(value: string, maximum: number) {
  return value.length >= 8 && value.length <= maximum && /^[A-Za-z0-9_-]+$/.test(value);
}

import { NextResponse } from 'next/server';
import {
  deliverPushEvent,
  getPushSubscriptions,
  type PushEvent,
} from '@/lib/pushNotifications';
import { clientIdentifier, rateLimit } from '@/lib/security';

export async function POST(request: Request) {
  const quota = rateLimit(`push-test:${clientIdentifier(request)}`, 3, 60_000);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: 'Too many test notifications.' },
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
    const subscriptions = await getPushSubscriptions();
    const subscription = subscriptions.find((entry) => entry.endpoint === endpoint);
    if (!subscription) {
      return NextResponse.json({ error: 'Push subscription not found.' }, { status: 404 });
    }
    const event: PushEvent = {
      event_key: `test:${crypto.randomUUID()}`,
      match_id: 'test',
      team_ids: [],
      title: 'World Cup alerts enabled',
      body: 'Background notifications are working for your followed teams.',
      url: '/favorites',
    };
    const result = await deliverPushEvent(event, [subscription]);
    if (!result.delivered) {
      return NextResponse.json({ error: 'The push service did not accept the test alert.' }, { status: 502 });
    }
    return NextResponse.json({ delivered: true });
  } catch (error) {
    console.error('Test push failed', error);
    return NextResponse.json({ error: 'Unable to send the test notification.' }, { status: 503 });
  }
}

function validEndpoint(endpoint: string) {
  if (endpoint.length < 20 || endpoint.length > 2048) return false;
  try {
    return new URL(endpoint).protocol === 'https:';
  } catch {
    return false;
  }
}

import 'server-only';
import webPush, { type PushSubscription } from 'web-push';
import type { LiveMatch } from '@/lib/liveData';

export type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  favorite_team_ids: string[];
};

export type StoredMatchState = {
  match_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

export type PushEvent = {
  event_key: string;
  match_id: string;
  team_ids: string[];
  title: string;
  body: string;
  url: string;
};

type SupabaseConfig = {
  url: string;
  serviceKey: string;
};

function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceKey ? { url, serviceKey } : null;
}

export function pushConfiguration() {
  return {
    configured: Boolean(
      supabaseConfig()
      && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      && process.env.VAPID_PRIVATE_KEY
      && process.env.VAPID_SUBJECT,
    ),
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
  };
}

async function supabaseFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = supabaseConfig();
  if (!config) throw new Error('Supabase push storage is not configured.');
  const headers = new Headers(init.headers);
  headers.set('apikey', config.serviceKey);
  headers.set('Content-Type', 'application/json');
  if (config.serviceKey.startsWith('eyJ')) {
    headers.set('Authorization', `Bearer ${config.serviceKey}`);
  }
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Push storage request failed (${response.status}): ${message.slice(0, 300)}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function savePushSubscription(subscription: StoredPushSubscription) {
  await supabaseFetch('push_subscriptions?on_conflict=endpoint', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      ...subscription,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function removePushSubscription(endpoint: string) {
  await supabaseFetch(`push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: 'DELETE',
  });
}

export async function getPushSubscriptions() {
  return supabaseFetch<StoredPushSubscription[]>(
    'push_subscriptions?select=endpoint,p256dh,auth,favorite_team_ids',
  );
}

export async function getMatchStates() {
  return supabaseFetch<StoredMatchState[]>(
    'notification_match_state?select=match_id,home_score,away_score,status',
  );
}

export async function saveMatchStates(matches: LiveMatch[]) {
  if (!matches.length) return;
  await supabaseFetch('notification_match_state?on_conflict=match_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(matches.map((match) => ({
      match_id: match.id,
      home_score: match.homeScore,
      away_score: match.awayScore,
      status: match.status,
      updated_at: new Date().toISOString(),
    }))),
  });
}

export async function claimPushEvent(event: PushEvent) {
  const rows = await supabaseFetch<PushEvent[]>('notification_events?on_conflict=event_key', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(event),
  });
  return rows.length > 0;
}

export async function deliverPushEvent(event: PushEvent, subscriptions: StoredPushSubscription[]) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID push credentials are not configured.');
  }
  webPush.setVapidDetails(subject, publicKey, privateKey);
  const payload = JSON.stringify({
    title: event.title,
    body: event.body,
    url: event.url,
    tag: event.event_key,
  });
  let delivered = 0;
  let removed = 0;
  for (let index = 0; index < subscriptions.length; index += 20) {
    const batch = subscriptions.slice(index, index + 20);
    await Promise.all(batch.map(async (stored) => {
      const subscription: PushSubscription = {
        endpoint: stored.endpoint,
        keys: { p256dh: stored.p256dh, auth: stored.auth },
      };
      try {
        await webPush.sendNotification(subscription, payload, { TTL: 300, urgency: 'high' });
        delivered += 1;
      } catch (error) {
        const statusCode = typeof error === 'object' && error && 'statusCode' in error
          ? Number(error.statusCode)
          : 0;
        if (statusCode === 404 || statusCode === 410) {
          await removePushSubscription(stored.endpoint);
          removed += 1;
          return;
        }
        console.error('Push delivery failed', { statusCode, endpoint: stored.endpoint.slice(0, 80) });
      }
    }));
  }
  return { delivered, removed };
}

export function detectPushEvents(matches: LiveMatch[], previous: Map<string, StoredMatchState>) {
  const events: PushEvent[] = [];
  for (const match of matches) {
    const before = previous.get(match.id);
    if (!before) continue;
    const teamIds = [match.homeTeamId, match.awayTeamId];
    const url = `/matches/${match.id}`;
    if (!isLive(before.status) && isLive(match.status)) {
      events.push({
        event_key: `kickoff:${match.id}`,
        match_id: match.id,
        team_ids: teamIds,
        title: 'Kickoff',
        body: `${match.homeTeam} vs ${match.awayTeam} is underway.`,
        url,
      });
    }
    if (
      (match.homeScore ?? 0) > (before.home_score ?? 0)
      || (match.awayScore ?? 0) > (before.away_score ?? 0)
    ) {
      events.push({
        event_key: `score:${match.id}:${match.homeScore ?? 0}-${match.awayScore ?? 0}`,
        match_id: match.id,
        team_ids: teamIds,
        title: 'Goal update',
        body: `${match.homeTeam} ${match.homeScore ?? 0}–${match.awayScore ?? 0} ${match.awayTeam}`,
        url,
      });
    }
    if (!isFinal(before.status) && isFinal(match.status)) {
      events.push({
        event_key: `full-time:${match.id}`,
        match_id: match.id,
        team_ids: teamIds,
        title: 'Full time',
        body: `${match.homeTeam} ${match.homeScore ?? 0}–${match.awayScore ?? 0} ${match.awayTeam}`,
        url,
      });
    }
  }
  return events;
}

function isLive(status: string) {
  return /live|half|progress/i.test(status);
}

function isFinal(status: string) {
  return /final|full time/i.test(status);
}

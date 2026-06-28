import { readFavorites } from '@/lib/favorites';

export type PushNotificationStatus =
  | 'checking'
  | 'unsupported'
  | 'blocked'
  | 'disabled'
  | 'enabling'
  | 'enabled'
  | 'error';

export function supportsPushNotifications() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export async function currentPushStatus(): Promise<PushNotificationStatus> {
  if (!supportsPushNotifications()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? 'enabled' : 'disabled';
}

export async function enablePushNotifications() {
  if (!supportsPushNotifications()) throw new Error('This browser does not support background notifications.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');
  const keyResponse = await fetch('/api/push/public-key', { cache: 'no-store' });
  const keyPayload = (await keyResponse.json()) as { configured?: boolean; publicKey?: string; error?: string };
  if (!keyResponse.ok || !keyPayload.configured || !keyPayload.publicKey) {
    throw new Error('Background notifications are not configured yet.');
  }
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyPayload.publicKey),
    });
  }
  await saveSubscription(subscription);
  const testResponse = await fetch('/api/push/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  if (!testResponse.ok) {
    const payload = (await testResponse.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || 'The server could not deliver a test notification.');
  }
  window.dispatchEvent(new Event('push-subscription-updated'));
}

export async function disablePushNotifications() {
  if (!supportsPushNotifications()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await fetch('/api/push/subscriptions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
  window.dispatchEvent(new Event('push-subscription-updated'));
}

export async function syncPushSubscription() {
  if (!supportsPushNotifications() || Notification.permission !== 'granted') return false;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return false;
  await saveSubscription(subscription);
  return true;
}

async function saveSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const response = await fetch('/api/push/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: {
        endpoint: subscription.endpoint,
        keys: json.keys,
      },
      favoriteTeamIds: readFavorites().map((team) => team.id),
    }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || 'Unable to save the push subscription.');
  }
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(Array.from(raw).map((character) => character.charCodeAt(0)));
}

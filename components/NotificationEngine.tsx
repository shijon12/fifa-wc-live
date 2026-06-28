'use client';

import { useEffect } from 'react';
import { syncPushSubscription } from '@/lib/pushClient';

export function NotificationEngine() {
  useEffect(() => {
    const sync = () => {
      syncPushSubscription().catch(() => {
        // A later favorite change or page load will retry.
      });
    };
    const initialize = window.setTimeout(sync, 0);
    window.addEventListener('favorites-updated', sync);
    window.addEventListener('push-subscription-updated', sync);
    return () => {
      window.clearTimeout(initialize);
      window.removeEventListener('favorites-updated', sync);
      window.removeEventListener('push-subscription-updated', sync);
    };
  }, []);
  return null;
}

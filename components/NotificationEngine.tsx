'use client';

import { useEffect } from 'react';
import { readFavorites } from '@/lib/favorites';

type Snapshot = {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
};

const SNAPSHOT_KEY = 'world-cup-live-snapshot-v1';

export function NotificationEngine() {
  useEffect(() => {
    async function check() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const favoriteIds = new Set(readFavorites().map((team) => team.id));
      if (!favoriteIds.size) return;
      try {
        const response = await fetch('/api/live-snapshot', { cache: 'no-store' });
        if (!response.ok) return;
        const current = (await response.json()) as Snapshot[];
        const previous = JSON.parse(window.localStorage.getItem(SNAPSHOT_KEY) || 'null') as Snapshot[] | null;
        window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(current));
        if (!previous) return;
        const previousById = new Map(previous.map((match) => [match.id, match]));
        for (const match of current) {
          if (!favoriteIds.has(match.homeTeamId) && !favoriteIds.has(match.awayTeamId)) continue;
          const before = previousById.get(match.id);
          if (!before) continue;
          if (!/live|half|progress/i.test(before.status) && /live|half|progress/i.test(match.status)) {
            notify('Kickoff', `${match.homeTeam} vs ${match.awayTeam} is underway.`);
          }
          if ((match.homeScore ?? 0) > (before.homeScore ?? 0) || (match.awayScore ?? 0) > (before.awayScore ?? 0)) {
            notify('Goal update', `${match.homeTeam} ${match.homeScore ?? 0}–${match.awayScore ?? 0} ${match.awayTeam}`);
          }
          if (!/final|full time/i.test(before.status) && /final|full time/i.test(match.status)) {
            notify('Full time', `${match.homeTeam} ${match.homeScore ?? 0}–${match.awayScore ?? 0} ${match.awayTeam}`);
          }
        }
      } catch {
        // The next polling cycle will retry.
      }
    }
    check();
    const interval = window.setInterval(check, 30_000);
    return () => window.clearInterval(interval);
  }, []);
  return null;
}

function notify(title: string, body: string) {
  new Notification(title, { body, icon: '/favicon.ico', tag: `${title}-${body}` });
}

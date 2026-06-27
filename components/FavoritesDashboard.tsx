'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FavoriteButton } from '@/components/FavoriteButton';
import { readFavorites, type FavoriteTeam } from '@/lib/favorites';

export function FavoritesDashboard({ teams }: { teams: FavoriteTeam[] }) {
  const [favorites, setFavorites] = useState<FavoriteTeam[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    const update = () => setFavorites(readFavorites());
    const initialize = window.setTimeout(() => {
      update();
      setPermission('Notification' in window ? Notification.permission : 'unsupported');
    }, 0);
    window.addEventListener('favorites-updated', update);
    return () => {
      window.clearTimeout(initialize);
      window.removeEventListener('favorites-updated', update);
    };
  }, []);

  async function enableNotifications() {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') new Notification('World Cup alerts enabled', { body: 'You will receive kickoff, goal, and final-score alerts for followed teams.' });
  }

  return (
    <>
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="font-bold text-white">Browser notifications</h2><p className="mt-1 text-sm text-stone-500">Kickoff, goal, and full-time alerts poll every 30 seconds.</p></div>
          <button type="button" onClick={enableNotifications} disabled={permission === 'granted' || permission === 'unsupported'} className="rounded-xl bg-emerald-400 px-4 py-2.5 font-bold text-[#07120d] disabled:bg-stone-700 disabled:text-stone-400">
            {permission === 'granted' ? 'Notifications enabled' : permission === 'denied' ? 'Permission blocked' : permission === 'unsupported' ? 'Not supported' : 'Enable notifications'}
          </button>
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-2xl font-bold text-white">Following {favorites.length} teams</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {teams.map((team) => (
            <div key={team.id} className={`flex items-center gap-3 rounded-2xl border p-4 ${favorites.some((entry) => entry.id === team.id) ? 'border-amber-300/25 bg-amber-300/5' : 'border-white/10 bg-white/[0.025]'}`}>
              {team.logo && <span className="h-10 w-10 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${team.logo}")` }} />}
              <Link href={`/teams/${team.id}`} className="min-w-0 flex-1 truncate font-bold text-white hover:text-emerald-300">{team.name}</Link>
              <FavoriteButton team={team} compact />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

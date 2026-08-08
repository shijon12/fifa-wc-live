'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FavoriteButton } from '@/components/FavoriteButton';
import { readFavorites, type FavoriteTeam } from '@/lib/favorites';
import {
  currentPushStatus,
  disablePushNotifications,
  enablePushNotifications,
  type PushNotificationStatus,
} from '@/lib/pushClient';

export function FavoritesDashboard({ teams }: { teams: FavoriteTeam[] }) {
  const [favorites, setFavorites] = useState<FavoriteTeam[]>([]);
  const [notificationStatus, setNotificationStatus] = useState<PushNotificationStatus>('checking');
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [deviceHelp, setDeviceHelp] = useState('Allow notifications in this browser and keep OS notifications enabled.');

  useEffect(() => {
    const update = () => setFavorites(readFavorites());
    const initialize = window.setTimeout(() => {
      update();
      setDeviceHelp(notificationDeviceHelp());
      currentPushStatus().then(setNotificationStatus).catch(() => setNotificationStatus('error'));
    }, 0);
    window.addEventListener('favorites-updated', update);
    return () => {
      window.clearTimeout(initialize);
      window.removeEventListener('favorites-updated', update);
    };
  }, []);

  async function enableNotifications() {
    setNotificationStatus('enabling');
    setNotificationError(null);
    try {
      await enablePushNotifications();
      setNotificationStatus('enabled');
    } catch (error) {
      setNotificationStatus('error');
      setNotificationError(error instanceof Error ? error.message : 'Unable to enable notifications.');
    }
  }

  async function toggleNotifications() {
    if (notificationStatus !== 'enabled') {
      await enableNotifications();
      return;
    }
    setNotificationError(null);
    try {
      await disablePushNotifications();
      setNotificationStatus('disabled');
    } catch {
      setNotificationStatus('error');
      setNotificationError('Unable to disable notifications.');
    }
  }

  return (
    <>
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-white">Background match alerts</h2>
            <p className="mt-1 text-sm text-stone-500">Receive kickoff, goal, and full-time alerts for followed World Cup and major club teams, even after closing the site.</p>
          </div>
          <button
            type="button"
            onClick={toggleNotifications}
            disabled={notificationStatus === 'checking' || notificationStatus === 'enabling' || notificationStatus === 'unsupported' || notificationStatus === 'blocked'}
            className={`rounded-xl px-4 py-2.5 font-bold disabled:bg-stone-700 disabled:text-stone-400 ${notificationStatus === 'enabled' ? 'border border-white/10 bg-white/5 text-stone-300' : 'bg-emerald-400 text-[#07120d]'}`}
          >
            {notificationLabel(notificationStatus)}
          </button>
        </div>
        <div className="mt-4 rounded-2xl border border-sky-300/20 bg-sky-300/10 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Beta note</p>
          <p className="mt-1 text-sm leading-6 text-sky-100/80">
            Alerts are optional and depend on browser permission, device support, and OS notification settings. Delivery can vary by browser, especially on mobile.
          </p>
          <p className="mt-2 text-xs leading-5 text-sky-100/70">Device guidance: {deviceHelp}</p>
          <p className="mt-2 text-xs font-bold text-sky-100">Current status: {notificationLabel(notificationStatus)}.</p>
        </div>
        {notificationError && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{notificationError}</p>}
        {notificationStatus === 'blocked' && (
          <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
            Notifications are blocked in this browser. Open your browser site settings for The Matchroom, allow notifications, then refresh this page.
          </p>
        )}
        {favorites.length === 0 && (
          <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
            <p className="font-bold text-amber-100">Choose at least one team first.</p>
            <p className="mt-1 text-sm leading-6 text-amber-100/80">
              Follow your favorite teams below, then enable notifications to receive kickoff, goal, and full-time alerts.
            </p>
          </div>
        )}
      </section>
      <section className="mt-8">
        <h2 className="text-2xl font-bold text-white">Following {favorites.length} teams</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {teams.map((team) => (
            <div key={`${team.id}:${team.competition ?? 'team'}`} className={`flex items-center gap-3 rounded-2xl border p-4 ${favorites.some((entry) => entry.id === team.id) ? 'border-amber-300/25 bg-amber-300/5' : 'border-white/10 bg-white/[0.025]'}`}>
              {team.logo && <span className="h-10 w-10 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${team.logo}")` }} />}
              <div className="min-w-0 flex-1">
                {team.href ? (
                  <Link href={team.href} className="block truncate font-bold text-white hover:text-emerald-300">{team.name}</Link>
                ) : (
                  <p className="truncate font-bold text-white">{team.name}</p>
                )}
                {team.competition && <p className="truncate text-xs text-stone-500">{team.competition}</p>}
              </div>
              <FavoriteButton team={team} compact />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function notificationDeviceHelp() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const safari = /Safari/i.test(ua) && !/Chrome|CriOS|Edg/i.test(ua);
  if (ios) return 'On iPhone or iPad, add The Matchroom to your Home Screen, open it from there, then enable alerts. Focus modes and Low Power Mode can delay delivery.';
  if (safari) return 'In Safari, allow notifications in Website Settings and confirm macOS notifications are enabled for Safari.';
  if (/Android/i.test(ua)) return 'On Android, allow site notifications and exclude the browser from aggressive battery restrictions if alerts arrive late.';
  return 'Allow notifications in site settings and confirm Windows or macOS notifications are enabled for this browser.';
}

function notificationLabel(status: PushNotificationStatus) {
  if (status === 'checking') return 'Checking…';
  if (status === 'enabling') return 'Enabling…';
  if (status === 'enabled') return 'Disable notifications';
  if (status === 'blocked') return 'Permission blocked';
  if (status === 'unsupported') return 'Not supported';
  if (status === 'error') return 'Try again';
  return 'Enable notifications';
}

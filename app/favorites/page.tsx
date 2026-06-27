import Link from 'next/link';
import { FavoritesDashboard } from '@/components/FavoritesDashboard';
import { SiteNav } from '@/components/SiteNav';
import { fetchWorldCupStandings } from '@/lib/liveData';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const standings = await fetchWorldCupStandings();
  const teams = standings.map((team) => ({ id: team.teamId, name: team.team, logo: team.badge }));
  return (
    <main className="min-h-screen bg-[#07120d] text-stone-100">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10">
        <SiteNav />
        <Link href="/" className="mt-8 inline-flex text-sm font-semibold text-emerald-300">← Dashboard</Link>
        <header className="mt-5 rounded-[2rem] border border-amber-300/20 bg-[radial-gradient(circle_at_85%_10%,rgba(245,185,66,0.16),transparent_35%),#0b1b13] p-8 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Your tournament</p>
          <h1 className="mt-3 break-words text-4xl font-black tracking-[-0.04em] text-white sm:text-7xl">Favorites & alerts</h1>
          <p className="mt-4 max-w-2xl text-stone-400">Follow teams on this device and receive live browser notifications.</p>
        </header>
        <FavoritesDashboard teams={teams} />
      </div>
    </main>
  );
}

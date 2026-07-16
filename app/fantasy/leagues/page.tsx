import { redirect } from 'next/navigation';
import { PrivateLeaguesManager } from '@/components/PrivateLeaguesManager';
import { SiteNav } from '@/components/SiteNav';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function FantasyLeaguesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/fantasy/leagues');

  return (
    <main className="min-h-screen bg-[#07120d] text-stone-100">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10">
        <SiteNav />
        <header className="mt-8 rounded-[2rem] border border-white/10 bg-[#0b1b13] p-8 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Private leagues</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">Compete with friends</h1>
          <p className="mt-4 max-w-2xl text-stone-400">Create invite-only fantasy leagues, share join codes, and turn the product into a social loop.</p>
        </header>
        <div className="mt-8">
          <PrivateLeaguesManager />
        </div>
      </div>
    </main>
  );
}

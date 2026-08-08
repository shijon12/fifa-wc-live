import { redirect } from 'next/navigation';
import { FantasyLeagueGame } from '@/components/FantasyLeagueGame';
import { DataTimestamp } from '@/components/DataTimestamp';
import { SiteNav } from '@/components/SiteNav';
import { getCurrentUser } from '@/lib/auth';
import { fetchAllFantasyMatches } from '@/lib/fantasyScoring';
import { fetchFantasyGameStatus, fetchFantasyPlayerPool } from '@/lib/fantasySquad';

export const dynamic = 'force-dynamic';

export default async function FantasyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/fantasy');

  const [matches, players, gameStatus] = await Promise.all([fetchAllFantasyMatches(), fetchFantasyPlayerPool(), fetchFantasyGameStatus()]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#07120d] text-stone-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,_rgba(40,185,111,0.18),_transparent_28%),radial-gradient(circle_at_85%_25%,_rgba(245,185,66,0.12),_transparent_24%)]" />
      <div className="relative mx-auto max-w-[1440px] px-4 pb-16 pt-5 sm:px-6 lg:px-10">
        <SiteNav />
        <div className="mt-6"><DataTimestamp updatedAt={new Date()} label="Fantasy data" /></div>
        <div className="mt-6">
          <FantasyLeagueGame matches={matches} players={players} gameStatus={gameStatus} />
        </div>
      </div>
    </main>
  );
}

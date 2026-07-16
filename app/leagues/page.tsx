import { LeagueHub } from '@/components/LeagueHub';
import { SiteNav } from '@/components/SiteNav';
import { fetchLeagueMatches, getLeagueById, supportedLeagues } from '@/lib/leagueData';

export const dynamic = 'force-dynamic';

export default async function LeaguesPage({ searchParams }: { searchParams: Promise<{ league?: string }> }) {
  const params = await searchParams;
  const selectedLeague = getLeagueById(params.league);
  const matches = await fetchLeagueMatches(selectedLeague);

  return (
    <main className="min-h-screen overflow-hidden bg-[#07120d] text-stone-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,_rgba(40,185,111,0.18),_transparent_28%),radial-gradient(circle_at_85%_25%,_rgba(245,185,66,0.12),_transparent_24%)]" />
      <div className="relative mx-auto max-w-[1440px] px-4 pb-16 pt-5 sm:px-6 lg:px-10">
        <SiteNav />
        <div className="mt-6">
          <LeagueHub leagues={supportedLeagues} selectedLeague={selectedLeague} matches={matches} />
        </div>
      </div>
    </main>
  );
}

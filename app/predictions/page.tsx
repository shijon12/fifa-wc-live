import Link from 'next/link';
import { PredictionHistory } from '@/components/PredictionHistory';
import { PredictionMarketHub } from '@/components/PredictionMarketHub';
import { DataTimestamp } from '@/components/DataTimestamp';
import { SiteNav } from '@/components/SiteNav';
import { fetchLeagueMatches, getLeagueById, supportedLeagues } from '@/lib/leagueData';
import { fetchWorldCupMatches } from '@/lib/liveData';

export const dynamic = 'force-dynamic';

export default async function PredictionsPage({ searchParams }: { searchParams: Promise<{ league?: string }> }) {
  const query = await searchParams;
  const requestedLeague = supportedLeagues.some((league) => league.id === query.league) ? query.league : 'premier-league';
  const selectedLeague = getLeagueById(requestedLeague);
  const [worldCupMatches, leagueMatches] = await Promise.all([
    fetchWorldCupMatches(),
    fetchLeagueMatches(selectedLeague, { daysBack: 2, daysForward: 60, limit: 300 }),
  ]);
  const completedOutcomes = worldCupMatches.flatMap((match) => {
    if (!/final|full time/i.test(match.status) || match.homeScore === null || match.awayScore === null) return [];
    const outcome = match.homeScore > match.awayScore ? 'home' : match.homeScore < match.awayScore ? 'away' : 'draw';
    return [{ matchId: match.id, outcome: outcome as 'home' | 'draw' | 'away' }];
  });
  return (
    <main className="min-h-screen bg-[#07120d] text-stone-100">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-10">
        <SiteNav />
        <Link href="/" className="mt-8 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200">← Dashboard</Link>
        <header className="mt-5 rounded-[2rem] border border-violet-400/20 bg-[radial-gradient(circle_at_85%_10%,rgba(167,139,250,0.18),transparent_35%),#0b1b13] p-8 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">Matchroom forecasting</p>
          <h1 className="mt-3 break-words text-4xl font-black tracking-[-0.04em] text-white sm:text-7xl">Football probability desk</h1>
          <p className="mt-4 max-w-3xl text-stone-400">Select a league and upcoming fixture, generate an AI forecast, and follow how the home, draw, and away probabilities move as kickoff approaches.</p>
        </header>
        <div className="mt-4"><DataTimestamp updatedAt={new Date()} label={`${selectedLeague.shortLabel} fixtures`} /></div>
        <PredictionMarketHub key={selectedLeague.id} leagues={supportedLeagues} selectedLeague={selectedLeague} matches={leagueMatches.filter((match) => match.state === 'pre').slice(0, 24)} />
        <PredictionHistory completedOutcomes={completedOutcomes} />
      </div>
    </main>
  );
}

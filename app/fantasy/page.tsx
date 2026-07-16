import { redirect } from 'next/navigation';
import { FantasyLeagueGame } from '@/components/FantasyLeagueGame';
import { SiteNav } from '@/components/SiteNav';
import { getCurrentUser } from '@/lib/auth';
import { fetchAllLeagueMatches, type LeagueMatch } from '@/lib/leagueData';
import { fetchWorldCupMatches, type LiveMatch } from '@/lib/liveData';

export const dynamic = 'force-dynamic';

export default async function FantasyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/fantasy');

  const [worldCupMatches, leagueBundles] = await Promise.all([
    fetchWorldCupMatches(),
    fetchAllLeagueMatches(),
  ]);
  const matches = [
    ...worldCupMatches.map(toFantasyMatch),
    ...leagueBundles.flatMap((bundle) => bundle.matches),
  ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return (
    <main className="min-h-screen overflow-hidden bg-[#07120d] text-stone-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,_rgba(40,185,111,0.18),_transparent_28%),radial-gradient(circle_at_85%_25%,_rgba(245,185,66,0.12),_transparent_24%)]" />
      <div className="relative mx-auto max-w-[1440px] px-4 pb-16 pt-5 sm:px-6 lg:px-10">
        <SiteNav />
        <div className="mt-6">
          <FantasyLeagueGame matches={matches} />
        </div>
      </div>
    </main>
  );
}

function toFantasyMatch(match: LiveMatch): LeagueMatch {
  const state = /live/i.test(match.status) ? 'in' : /final|full time/i.test(match.status) ? 'post' : 'pre';
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const homeWinPct = state === 'post' ? (homeScore > awayScore ? 100 : 0) : 42;
  const awayWinPct = state === 'post' ? (awayScore > homeScore ? 100 : 0) : 32;
  const drawPct = state === 'post' ? (homeScore === awayScore ? 100 : 0) : 26;

  return {
    id: `wc-${match.id}`,
    leagueId: 'mls',
    league: 'FIFA World Cup 2026',
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeBadge: match.homeBadge,
    awayBadge: match.awayBadge,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    venue: match.venue,
    kickoff: match.kickoff,
    date: match.date,
    dateKey: match.dateKey,
    timestamp: match.timestamp,
    status: match.status,
    state,
    homeForm: null,
    awayForm: null,
    insight: {
      homeWinPct,
      drawPct,
      awayWinPct,
      confidence: state === 'post' ? 'High' : 'Low',
      lean: state === 'post' ? 'Result posted' : 'Even tournament matchup',
      note: 'World Cup fantasy pick generated from the tournament fixture feed.',
    },
  };
}

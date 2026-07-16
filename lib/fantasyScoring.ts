import { fetchAllLeagueMatches, type LeagueMatch } from '@/lib/leagueData';
import { fetchWorldCupMatches, type LiveMatch } from '@/lib/liveData';
import type { FantasyPick } from '@/lib/auth';

export async function fetchAllFantasyMatches(): Promise<LeagueMatch[]> {
  const [worldCupMatches, leagueBundles] = await Promise.all([
    fetchWorldCupMatches(),
    fetchAllLeagueMatches(),
  ]);
  return [
    ...worldCupMatches.map(toFantasyMatch),
    ...leagueBundles.flatMap((bundle) => bundle.matches),
  ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function scoreFantasyPick(match: LeagueMatch, pick: FantasyPick | undefined) {
  if (!pick || match.homeScore === null || match.awayScore === null || match.state !== 'post') return 0;
  const result = match.homeScore > match.awayScore ? 'home' : match.homeScore < match.awayScore ? 'away' : 'draw';
  if (pick.choice !== result) return 0;
  return (result === 'draw' ? 5 : 3) * pick.confidence;
}

function toFantasyMatch(match: LiveMatch): LeagueMatch {
  const state = /live/i.test(match.status) ? 'in' : /final|full time/i.test(match.status) ? 'post' : 'pre';
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  return {
    id: `world-cup:${match.id}`,
    leagueId: 'world-cup',
    league: 'FIFA World Cup 2026',
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
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
      homeWinPct: state === 'post' ? (homeScore > awayScore ? 100 : 0) : 42,
      drawPct: state === 'post' ? (homeScore === awayScore ? 100 : 0) : 26,
      awayWinPct: state === 'post' ? (awayScore > homeScore ? 100 : 0) : 32,
      confidence: state === 'post' ? 'High' : 'Low',
      lean: state === 'post' ? 'Result posted' : 'Even tournament matchup',
      note: 'World Cup fantasy pick generated from the tournament fixture feed.',
    },
  };
}

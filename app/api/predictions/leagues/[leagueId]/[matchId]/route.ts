import { NextResponse } from 'next/server';
import { generateAIMatchPrediction, PredictionServiceError, type ModelPrediction } from '@/lib/aiMatchPrediction';
import { getCurrentUser } from '@/lib/auth';
import { claimFantasyAgentUsage } from '@/lib/fantasyAgentUsage';
import { fetchLeagueMatches, fetchLeagueStandings, getLeagueById, supportedLeagues } from '@/lib/leagueData';
import { clientIdentifier, rateLimit } from '@/lib/security';

export async function POST(request: Request, { params }: { params: Promise<{ leagueId: string; matchId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to generate an AI forecast.' }, { status: 401 });
  const quota = rateLimit(`league-prediction:${user.id}:${clientIdentifier(request)}`, 8, 60_000);
  if (!quota.allowed) return NextResponse.json({ error: 'Too many forecast requests. Try again shortly.' }, { status: 429, headers: { 'Retry-After': String(quota.retryAfter) } });

  const { leagueId, matchId } = await params;
  if (!supportedLeagues.some((entry) => entry.id === leagueId)) return NextResponse.json({ error: 'Unsupported league.' }, { status: 404 });
  const league = getLeagueById(leagueId);
  const [matches, standings] = await Promise.all([
    fetchLeagueMatches(league, { daysBack: 14, daysForward: 60, limit: 300 }),
    fetchLeagueStandings(league),
  ]);
  const match = matches.find((entry) => entry.id === `${league.id}:${matchId}` || entry.id === matchId);
  if (!match) return NextResponse.json({ error: 'Upcoming match not found in the current league feed.' }, { status: 404 });
  if (match.state !== 'pre') return NextResponse.json({ error: 'AI forecasts are available before kickoff.' }, { status: 409 });

  let usage;
  try {
    usage = await claimFantasyAgentUsage(user.id);
  } catch {
    return NextResponse.json({ error: 'The AI usage guard is temporarily unavailable.' }, { status: 503 });
  }
  if (!usage.allowed) return NextResponse.json({ error: `You have used today’s ${usage.limit} AI messages. The allowance resets at 00:00 UTC.`, usage }, { status: 429 });

  const homeStanding = standings.find((team) => team.teamId === match.homeTeamId);
  const awayStanding = standings.find((team) => team.teamId === match.awayTeamId);
  const recentCompleted = matches.filter((entry) => entry.state === 'post' && [entry.homeTeamId, entry.awayTeamId].some((id) => id === match.homeTeamId || id === match.awayTeamId)).slice(-12);
  const fallback = fallbackPrediction(match);
  const context = {
    league: { id: league.id, name: league.label },
    match: {
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoff: match.timestamp,
      venue: match.venue,
      availableRecords: { home: match.homeForm, away: match.awayForm },
    },
    standings: { home: homeStanding ?? null, away: awayStanding ?? null },
    recentResults: recentCompleted.map((entry) => ({
      homeTeam: entry.homeTeam,
      awayTeam: entry.awayTeam,
      homeScore: entry.homeScore,
      awayScore: entry.awayScore,
      date: entry.timestamp,
    })),
  };

  try {
    const result = await generateAIMatchPrediction(context, fallback);
    return NextResponse.json({
      matchId: match.id,
      leagueId: league.id,
      league: league.label,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      generatedAt: new Date().toISOString(),
      model: result.model,
      ...result.prediction,
      usage,
    });
  } catch (error) {
    if (error instanceof PredictionServiceError) return NextResponse.json({ error: error.message, usage }, { status: error.status });
    return NextResponse.json({ error: 'The AI prediction service is temporarily unavailable.', usage }, { status: 502 });
  }
}

function fallbackPrediction(match: Awaited<ReturnType<typeof fetchLeagueMatches>>[number]): ModelPrediction {
  const values = [match.insight.homeWinPct, match.insight.drawPct, match.insight.awayWinPct];
  const maximum = Math.max(...values);
  const predictedOutcome = maximum === values[0] ? 'home' : maximum === values[1] ? 'draw' : 'away';
  return {
    homeWinPct: match.insight.homeWinPct,
    drawPct: match.insight.drawPct,
    awayWinPct: match.insight.awayWinPct,
    predictedOutcome,
    confidence: maximum,
    predictedScore: predictedOutcome === 'home' ? { home: 2, away: 1 } : predictedOutcome === 'away' ? { home: 1, away: 2 } : { home: 1, away: 1 },
    summary: `${match.homeTeam} and ${match.awayTeam} are separated using current records, league position, recent results, and a modest home-side adjustment.`,
    factors: [
      `${match.homeTeam} available record: ${match.homeForm ?? 'not published'}`,
      `${match.awayTeam} available record: ${match.awayForm ?? 'not published'}`,
      `Kickoff status: ${match.status}`,
    ],
  };
}

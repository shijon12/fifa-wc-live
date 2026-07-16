import { NextResponse } from 'next/server';
import { fetchLeagueMatches, supportedLeagues } from '@/lib/leagueData';
import { fetchWorldCupMatches } from '@/lib/liveData';
import {
  claimPushEvent,
  deliverPushEvent,
  detectPushEvents,
  getMatchStates,
  getPushSubscriptions,
  leagueMatchToNotificationMatch,
  pushConfiguration,
  saveMatchStates,
} from '@/lib/pushNotifications';

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  if (!pushConfiguration().configured) {
    return NextResponse.json({ error: 'Push notifications are not configured.' }, { status: 503 });
  }
  try {
    const alertLeagues = supportedLeagues.filter((league) =>
      ['champions-league', 'premier-league', 'laliga', 'serie-a', 'bundesliga', 'ligue-1', 'mls'].includes(league.id),
    );
    const [worldCupMatches, leagueMatches, states, subscriptions] = await Promise.all([
      fetchWorldCupMatches(),
      Promise.all(alertLeagues.map(fetchLeagueMatches)),
      getMatchStates(),
      getPushSubscriptions(),
    ]);
    const matches = [
      ...worldCupMatches,
      ...leagueMatches.flat().map(leagueMatchToNotificationMatch),
    ];
    if (!matches.length) {
      return NextResponse.json({ error: 'The live match feed returned no matches.' }, { status: 503 });
    }
    const previous = new Map(states.map((state) => [state.match_id, state]));
    const candidates = detectPushEvents(matches, previous);
    await saveMatchStates(matches);
    let claimed = 0;
    let delivered = 0;
    let removed = 0;
    for (const event of candidates) {
      if (!(await claimPushEvent(event))) continue;
      claimed += 1;
      const interested = subscriptions.filter((subscription) =>
        subscription.favorite_team_ids.some((teamId) => event.team_ids.includes(teamId)),
      );
      const result = await deliverPushEvent(event, interested);
      delivered += result.delivered;
      removed += result.removed;
    }
    return NextResponse.json({
      checkedMatches: matches.length,
      subscriptions: subscriptions.length,
      detectedEvents: candidates.length,
      claimedEvents: claimed,
      delivered,
      removed,
    });
  } catch (error) {
    console.error('Push notification check failed', error);
    return NextResponse.json({ error: 'Push notification check failed.' }, { status: 500 });
  }
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

const ESPN_SITE_ROOT = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

type EspnLogo = { href?: string };
type EspnTeamSummary = {
  id?: string;
  displayName?: string;
  logo?: string;
  logos?: EspnLogo[];
};
type EspnCompetitor = {
  id?: string;
  homeAway?: 'home' | 'away';
  score?: string;
  team?: EspnTeamSummary;
  records?: Array<{ summary?: string }>;
};
type EspnCompetition = {
  competitors?: EspnCompetitor[];
  venue?: { fullName?: string };
  status?: { type?: { description?: string; state?: string }; displayClock?: string };
};
type EspnEvent = {
  id?: string;
  date?: string;
  competitions?: EspnCompetition[];
};
type ScoreboardResponse = { events?: EspnEvent[] };

export type SupportedLeague = {
  id: 'premier-league' | 'laliga' | 'mls';
  label: string;
  shortLabel: string;
  country: string;
  espnSlug: string;
  accent: string;
};

export type LeagueMatch = {
  id: string;
  leagueId: SupportedLeague['id'];
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeBadge: string | null;
  awayBadge: string | null;
  homeScore: number | null;
  awayScore: number | null;
  venue: string;
  kickoff: string;
  date: string;
  dateKey: string;
  timestamp: string;
  status: string;
  state: 'pre' | 'in' | 'post';
  homeForm: string | null;
  awayForm: string | null;
  insight: MatchInsight;
};

export type MatchInsight = {
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  confidence: 'Low' | 'Medium' | 'High';
  lean: string;
  note: string;
};

export const supportedLeagues: SupportedLeague[] = [
  {
    id: 'premier-league',
    label: 'English Premier League',
    shortLabel: 'EPL',
    country: 'England',
    espnSlug: 'eng.1',
    accent: 'from-sky-400/25 to-purple-500/15',
  },
  {
    id: 'laliga',
    label: 'Spanish LaLiga',
    shortLabel: 'LaLiga',
    country: 'Spain',
    espnSlug: 'esp.1',
    accent: 'from-rose-400/25 to-amber-500/15',
  },
  {
    id: 'mls',
    label: 'Major League Soccer',
    shortLabel: 'MLS',
    country: 'United States & Canada',
    espnSlug: 'usa.1',
    accent: 'from-emerald-400/25 to-cyan-500/15',
  },
];

async function fetchJson<T>(url: string, revalidate = 30): Promise<T | null> {
  try {
    const response = await fetch(url, {
      next: { revalidate },
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function score(value: string | undefined) {
  if (value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function logo(team: EspnTeamSummary | undefined) {
  return team?.logo ?? team?.logos?.[0]?.href ?? null;
}

function formatEventDate(timestamp: string) {
  const date = new Date(timestamp);
  return {
    date: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'America/New_York',
    }).format(date),
    kickoff: new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    }).format(date),
    dateKey: new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/New_York',
    }).format(date),
  };
}

function rollingDateRange(daysBack = 5, daysForward = 45) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - daysBack);
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + daysForward);
  const format = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
    }).format(date).replaceAll('-', '');
  return `${format(start)}-${format(end)}`;
}

function statusLabel(competition: EspnCompetition) {
  const type = competition.status?.type;
  if (type?.state === 'in') {
    return competition.status?.displayClock ? `Live · ${competition.status.displayClock}` : 'Live';
  }
  return type?.description ?? 'Scheduled';
}

function recordStrength(record: string | null) {
  if (!record) return 0;
  const [wins = 0, losses = 0, draws = 0] = record.split('-').map((part) => Number(part));
  if (![wins, losses, draws].every(Number.isFinite)) return 0;
  return wins * 3 + draws - losses * 0.3;
}

function makeInsight(homeTeam: string, awayTeam: string, homeForm: string | null, awayForm: string | null, state: LeagueMatch['state']): MatchInsight {
  const homeStrength = 3 + recordStrength(homeForm);
  const awayStrength = recordStrength(awayForm);
  const diff = Math.max(-16, Math.min(16, homeStrength - awayStrength));
  const homeWinPct = Math.round(Math.max(24, Math.min(64, 43 + diff)));
  const awayWinPct = Math.round(Math.max(18, Math.min(52, 31 - diff * 0.65)));
  const drawPct = Math.max(12, 100 - homeWinPct - awayWinPct);
  const normalizedHome = 100 - awayWinPct - drawPct;
  const leader = normalizedHome >= awayWinPct ? homeTeam : awayTeam;
  const gap = Math.abs(normalizedHome - awayWinPct);

  return {
    homeWinPct: normalizedHome,
    drawPct,
    awayWinPct,
    confidence: gap > 18 ? 'High' : gap > 9 ? 'Medium' : 'Low',
    lean: state === 'post' ? 'Result posted' : `${leader} lean`,
    note: 'Fan insight based on live feed status, home advantage, and available ESPN records. This is not real-money betting advice.',
  };
}

function mapEvent(event: EspnEvent, league: SupportedLeague): LeagueMatch | null {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find((entry) => entry.homeAway === 'home');
  const away = competition?.competitors?.find((entry) => entry.homeAway === 'away');
  if (!event.id || !event.date || !competition || !home?.team?.displayName || !away?.team?.displayName) {
    return null;
  }

  const formatted = formatEventDate(event.date);
  const state = (competition.status?.type?.state ?? 'pre') as LeagueMatch['state'];
  const homeForm = home.records?.[0]?.summary ?? null;
  const awayForm = away.records?.[0]?.summary ?? null;

  return {
    id: event.id,
    leagueId: league.id,
    league: league.label,
    homeTeam: home.team.displayName,
    awayTeam: away.team.displayName,
    homeBadge: logo(home.team),
    awayBadge: logo(away.team),
    homeScore: score(home.score),
    awayScore: score(away.score),
    venue: competition.venue?.fullName ?? 'Venue TBA',
    kickoff: formatted.kickoff,
    date: formatted.date,
    dateKey: formatted.dateKey,
    timestamp: event.date,
    status: statusLabel(competition),
    state,
    homeForm,
    awayForm,
    insight: makeInsight(home.team.displayName, away.team.displayName, homeForm, awayForm, state),
  };
}

export async function fetchLeagueMatches(league: SupportedLeague): Promise<LeagueMatch[]> {
  const response = await fetchJson<ScoreboardResponse>(
    `${ESPN_SITE_ROOT}/${league.espnSlug}/scoreboard?dates=${rollingDateRange()}&limit=100`,
  );
  return (response?.events ?? [])
    .map((event) => mapEvent(event, league))
    .filter((match): match is LeagueMatch => match !== null)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function fetchAllLeagueMatches(): Promise<Array<{ league: SupportedLeague; matches: LeagueMatch[] }>> {
  return Promise.all(supportedLeagues.map(async (league) => ({ league, matches: await fetchLeagueMatches(league) })));
}

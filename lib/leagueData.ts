const ESPN_SITE_ROOT = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const ESPN_WEB_ROOT = 'https://site.web.api.espn.com/apis/v2/sports/soccer';

type EspnLogo = { href?: string };
type EspnTeamSummary = {
  id?: string;
  displayName?: string;
  shortDisplayName?: string;
  abbreviation?: string;
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
type EspnEvent = { id?: string; date?: string; competitions?: EspnCompetition[] };
type ScoreboardResponse = { events?: EspnEvent[] };
type EspnStat = { name?: string; displayName?: string; shortDisplayName?: string; value?: number; displayValue?: string };
type StandingsResponse = {
  children?: Array<{
    name?: string;
    standings?: { entries?: StandingEntry[] };
  }>;
  standings?: { entries?: StandingEntry[] };
};
type StandingEntry = {
  team?: EspnTeamSummary;
  stats?: EspnStat[];
};

export type SupportedLeague = {
  id: string;
  label: string;
  shortLabel: string;
  country: string;
  region: string;
  tier: 'Global' | 'Europe' | 'Americas' | 'Asia-Pacific';
  espnSlug: string;
  accent: string;
};

export type LeagueMatch = {
  id: string;
  leagueId: string;
  league: string;
  homeTeamId: string;
  awayTeamId: string;
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

export type LeagueStanding = {
  teamId: string;
  team: string;
  shortName: string;
  badge: string | null;
  group: string | null;
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  pointsPerMatch: number;
  cleanSheets: number;
};

export type LeagueStats = {
  league: SupportedLeague;
  standings: LeagueStanding[];
  matches: LeagueMatch[];
  completedMatches: number;
  scheduledMatches: number;
  liveMatches: number;
  goals: number;
  goalsPerMatch: number;
  bestAttack: LeagueStanding[];
  bestDefense: LeagueStanding[];
  formTable: LeagueStanding[];
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
  { id: 'world-cup', label: 'FIFA World Cup 2026', shortLabel: 'World Cup', country: 'Global', region: 'International', tier: 'Global', espnSlug: 'fifa.world', accent: 'from-emerald-400/25 to-amber-500/15' },
  { id: 'champions-league', label: 'UEFA Champions League', shortLabel: 'UCL', country: 'Europe', region: 'Europe', tier: 'Europe', espnSlug: 'uefa.champions', accent: 'from-blue-400/25 to-indigo-500/15' },
  { id: 'europa-league', label: 'UEFA Europa League', shortLabel: 'UEL', country: 'Europe', region: 'Europe', tier: 'Europe', espnSlug: 'uefa.europa', accent: 'from-orange-400/25 to-amber-500/15' },
  { id: 'premier-league', label: 'English Premier League', shortLabel: 'EPL', country: 'England', region: 'Europe', tier: 'Europe', espnSlug: 'eng.1', accent: 'from-sky-400/25 to-purple-500/15' },
  { id: 'championship', label: 'EFL Championship', shortLabel: 'Championship', country: 'England', region: 'Europe', tier: 'Europe', espnSlug: 'eng.2', accent: 'from-cyan-400/25 to-blue-500/15' },
  { id: 'laliga', label: 'Spanish LaLiga', shortLabel: 'LaLiga', country: 'Spain', region: 'Europe', tier: 'Europe', espnSlug: 'esp.1', accent: 'from-rose-400/25 to-amber-500/15' },
  { id: 'serie-a', label: 'Italian Serie A', shortLabel: 'Serie A', country: 'Italy', region: 'Europe', tier: 'Europe', espnSlug: 'ita.1', accent: 'from-blue-400/25 to-green-500/15' },
  { id: 'bundesliga', label: 'German Bundesliga', shortLabel: 'Bundesliga', country: 'Germany', region: 'Europe', tier: 'Europe', espnSlug: 'ger.1', accent: 'from-red-400/25 to-yellow-500/15' },
  { id: 'ligue-1', label: 'French Ligue 1', shortLabel: 'Ligue 1', country: 'France', region: 'Europe', tier: 'Europe', espnSlug: 'fra.1', accent: 'from-indigo-400/25 to-rose-500/15' },
  { id: 'eredivisie', label: 'Dutch Eredivisie', shortLabel: 'Eredivisie', country: 'Netherlands', region: 'Europe', tier: 'Europe', espnSlug: 'ned.1', accent: 'from-orange-400/25 to-red-500/15' },
  { id: 'primeira-liga', label: 'Portuguese Primeira Liga', shortLabel: 'Liga Portugal', country: 'Portugal', region: 'Europe', tier: 'Europe', espnSlug: 'por.1', accent: 'from-green-400/25 to-red-500/15' },
  { id: 'mls', label: 'Major League Soccer', shortLabel: 'MLS', country: 'United States & Canada', region: 'Americas', tier: 'Americas', espnSlug: 'usa.1', accent: 'from-emerald-400/25 to-cyan-500/15' },
  { id: 'liga-mx', label: 'Liga MX', shortLabel: 'Liga MX', country: 'Mexico', region: 'Americas', tier: 'Americas', espnSlug: 'mex.1', accent: 'from-green-400/25 to-rose-500/15' },
  { id: 'brasileirao', label: 'Brasileirão Série A', shortLabel: 'Brasileirão', country: 'Brazil', region: 'Americas', tier: 'Americas', espnSlug: 'bra.1', accent: 'from-lime-400/25 to-yellow-500/15' },
  { id: 'argentina', label: 'Argentine Liga Profesional', shortLabel: 'Argentina', country: 'Argentina', region: 'Americas', tier: 'Americas', espnSlug: 'arg.1', accent: 'from-sky-400/25 to-white/10' },
  { id: 'saudi-pro-league', label: 'Saudi Pro League', shortLabel: 'Saudi Pro', country: 'Saudi Arabia', region: 'Asia-Pacific', tier: 'Asia-Pacific', espnSlug: 'ksa.1', accent: 'from-emerald-400/25 to-white/10' },
  { id: 'j1-league', label: 'Japanese J1 League', shortLabel: 'J1', country: 'Japan', region: 'Asia-Pacific', tier: 'Asia-Pacific', espnSlug: 'jpn.1', accent: 'from-red-400/25 to-white/10' },
  { id: 'a-league', label: 'Australian A-League Men', shortLabel: 'A-League', country: 'Australia', region: 'Asia-Pacific', tier: 'Asia-Pacific', espnSlug: 'aus.1', accent: 'from-yellow-400/25 to-green-500/15' },
];

export function getLeagueById(id: string | undefined | null) {
  return supportedLeagues.find((league) => league.id === id) ?? supportedLeagues[0];
}

async function fetchJson<T>(url: string, _revalidate = 30): Promise<T | null> {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
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

function stat(stats: EspnStat[] | undefined, names: string[]) {
  const entry = stats?.find((item) => item.name && names.includes(item.name));
  return Number(entry?.value ?? 0);
}

function formatEventDate(timestamp: string) {
  const date = new Date(timestamp);
  return {
    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }).format(date),
    kickoff: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(date),
    dateKey: new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/New_York' }).format(date),
  };
}

function rollingDateRange(daysBack = 10, daysForward = 45) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - daysBack);
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + daysForward);
  const format = (date: Date) => new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(date).replaceAll('-', '');
  return `${format(start)}-${format(end)}`;
}

function statusLabel(competition: EspnCompetition) {
  const type = competition.status?.type;
  if (type?.state === 'in') return competition.status?.displayClock ? `Live · ${competition.status.displayClock}` : 'Live';
  return type?.description ?? 'Scheduled';
}

function recordStrength(record: string | null) {
  if (!record) return 0;
  const [wins = 0, losses = 0, draws = 0] = record.split('-').map((part) => Number(part));
  if (![wins, losses, draws].every(Number.isFinite)) return 0;
  return wins * 3 + draws - losses * 0.3;
}

export function makeInsight(homeTeam: string, awayTeam: string, homeForm: string | null, awayForm: string | null, state: LeagueMatch['state']): MatchInsight {
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
  if (!event.id || !event.date || !competition || !home?.id || !away?.id || !home.team?.displayName || !away.team?.displayName) return null;

  const formatted = formatEventDate(event.date);
  const state = (competition.status?.type?.state ?? 'pre') as LeagueMatch['state'];
  const homeForm = home.records?.[0]?.summary ?? null;
  const awayForm = away.records?.[0]?.summary ?? null;

  return {
    id: `${league.id}:${event.id}`,
    leagueId: league.id,
    league: league.label,
    homeTeamId: home.id,
    awayTeamId: away.id,
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

export async function fetchLeagueStandings(league: SupportedLeague): Promise<LeagueStanding[]> {
  const response = await fetchJson<StandingsResponse>(
    `${ESPN_WEB_ROOT}/${league.espnSlug}/standings?region=us&lang=en&contentorigin=espn&sort=rank:asc`,
    120,
  );
  const grouped = response?.children?.flatMap((group) =>
    (group.standings?.entries ?? []).map((entry) => mapStanding(entry, group.name ?? null)),
  ) ?? [];
  const single = response?.standings?.entries?.map((entry) => mapStanding(entry, null)) ?? [];
  return [...grouped, ...single]
    .filter((team): team is LeagueStanding => team !== null)
    .sort((a, b) => a.rank - b.rank || b.points - a.points);
}

function mapStanding(entry: StandingEntry, group: string | null): LeagueStanding | null {
  const team = entry.team;
  if (!team?.id || !team.displayName) return null;
  const stats = entry.stats;
  const played = stat(stats, ['gamesPlayed']);
  const won = stat(stats, ['wins']);
  const drawn = stat(stats, ['ties', 'draws']);
  const lost = stat(stats, ['losses']);
  const goalsFor = stat(stats, ['pointsFor']);
  const goalsAgainst = stat(stats, ['pointsAgainst']);
  const goalDifference = stat(stats, ['pointDifferential']);
  const points = stat(stats, ['points']);

  return {
    teamId: team.id,
    team: team.displayName,
    shortName: team.shortDisplayName ?? team.abbreviation ?? team.displayName,
    badge: logo(team),
    group,
    rank: stat(stats, ['rank']) || 999,
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDifference,
    points,
    pointsPerMatch: played ? Number((points / played).toFixed(2)) : 0,
    cleanSheets: stat(stats, ['cleanSheet', 'cleanSheets']),
  };
}

export async function fetchLeagueStats(league: SupportedLeague): Promise<LeagueStats> {
  const [standings, matches] = await Promise.all([fetchLeagueStandings(league), fetchLeagueMatches(league)]);
  const completed = matches.filter((match) => match.state === 'post');
  const goals = completed.reduce((total, match) => total + (match.homeScore ?? 0) + (match.awayScore ?? 0), 0);

  return {
    league,
    standings,
    matches,
    completedMatches: completed.length,
    scheduledMatches: matches.filter((match) => match.state === 'pre').length,
    liveMatches: matches.filter((match) => match.state === 'in').length,
    goals,
    goalsPerMatch: completed.length ? Number((goals / completed.length).toFixed(2)) : 0,
    bestAttack: [...standings].sort((a, b) => b.goalsFor - a.goalsFor || b.points - a.points).slice(0, 8),
    bestDefense: [...standings].filter((team) => team.played > 0).sort((a, b) => a.goalsAgainst - b.goalsAgainst || b.points - a.points).slice(0, 8),
    formTable: [...standings].sort((a, b) => b.pointsPerMatch - a.pointsPerMatch || b.goalDifference - a.goalDifference).slice(0, 10),
  };
}

export async function fetchAllLeagueMatches(): Promise<Array<{ league: SupportedLeague; matches: LeagueMatch[] }>> {
  return Promise.all(supportedLeagues.slice(1, 7).map(async (league) => ({ league, matches: await fetchLeagueMatches(league) })));
}

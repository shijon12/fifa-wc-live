const ESPN_SITE_API = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const ESPN_WEB_API = 'https://site.web.api.espn.com/apis/v2/sports/soccer/fifa.world';
const SCOREBOARD_RANGE = '20260611-20260719';

type EspnLogo = { href?: string };
type EspnTeamSummary = {
  id?: string;
  abbreviation?: string;
  displayName?: string;
  shortDisplayName?: string;
  location?: string;
  logo?: string;
  logos?: EspnLogo[];
  links?: Array<{ href?: string; rel?: string[] | string }>;
};
type EspnCompetitor = {
  id?: string;
  homeAway?: 'home' | 'away';
  score?: string;
  team?: EspnTeamSummary;
};
type EspnCompetition = {
  competitors?: EspnCompetitor[];
  venue?: { fullName?: string };
  status?: { type?: { description?: string; state?: string; completed?: boolean }; displayClock?: string };
  altGameNote?: string;
};
type EspnEvent = {
  id?: string;
  date?: string;
  season?: { slug?: string };
  competitions?: EspnCompetition[];
  status?: { type?: { description?: string; state?: string; completed?: boolean }; displayClock?: string };
};
type ScoreboardResponse = { events?: EspnEvent[] };

type EspnStat = { name?: string; value?: number };
type EspnStandingEntry = {
  team?: EspnTeamSummary;
  note?: { description?: string; rank?: number };
  stats?: EspnStat[];
};
type EspnStandingGroup = {
  name?: string;
  standings?: { entries?: EspnStandingEntry[] };
};
type StandingsResponse = {
  children?: EspnStandingGroup[];
  season?: { displayName?: string };
};

type TeamResponse = {
  team?: EspnTeamSummary & {
    name?: string;
    color?: string;
    alternateColor?: string;
    record?: { items?: Array<{ summary?: string; stats?: EspnStat[] }> };
  };
};

type EspnAthlete = {
  id?: string;
  displayName?: string;
  shortName?: string;
  jersey?: string;
  age?: number;
  displayHeight?: string;
  displayWeight?: string;
  citizenship?: string;
  headshot?: { href?: string };
  position?: { displayName?: string; abbreviation?: string };
  links?: Array<{ href?: string; rel?: string[] | string }>;
  statistics?: {
    splits?: {
      categories?: Array<{
        stats?: EspnStat[];
      }>;
    };
  };
};

type RosterResponse = {
  athletes?: EspnAthlete[];
  team?: {
    id?: string;
    displayName?: string;
    logo?: string;
  };
};

export type LiveMatch = {
  id: string;
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
  group: string | null;
  round: string;
  status: string;
  isLiveData: true;
};

export type LiveStanding = {
  teamId: string;
  team: string;
  badge: string | null;
  group: string;
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string;
  qualification: string | null;
  updatedAt: string | null;
};

export type LiveTeam = {
  id: string;
  name: string;
  shortName: string;
  badge: string | null;
  logo: string | null;
  fanart: string | null;
  description: string | null;
  country: string;
  stadium: string | null;
  stadiumCapacity: number | null;
  location: string | null;
  nickname: string | null;
  formedYear: string | null;
  website: string | null;
};

export type PlayerTournamentStat = {
  id: string;
  name: string;
  shortName: string;
  headshot: string | null;
  teamId: string;
  team: string;
  teamLogo: string | null;
  position: string;
  jersey: string | null;
  age: number | null;
  height: string | null;
  weight: string | null;
  citizenship: string | null;
  appearances: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  profileUrl: string | null;
};

export type MatchTimelineEvent = {
  id: string;
  type: string;
  label: string;
  minute: string;
  text: string;
  teamId: string | null;
  team: string | null;
  playerId: string | null;
  playerName: string | null;
};

export type MatchGoalScorer = {
  id: string;
  minute: string;
  playerId: string | null;
  playerName: string;
  teamId: string | null;
  team: string | null;
  detail: string;
};

export type MatchTeamStatistics = {
  teamId: string;
  team: string;
  logo: string | null;
  values: Record<string, string>;
};

export type MatchCommentaryEntry = {
  sequence: number;
  minute: string;
  text: string;
};

export type MatchPlayerPerformance = {
  playerId: string;
  teamId: string;
  starter: boolean;
  jersey: string | null;
  position: string;
  stats: Record<string, number>;
};

export type LiveMatchDetails = {
  events: MatchTimelineEvent[];
  commentary: MatchCommentaryEntry[];
  teamStatistics: MatchTeamStatistics[];
  players: MatchPlayerPerformance[];
};

type SummaryResponse = {
  keyEvents?: Array<{
    id?: string;
    type?: { text?: string; type?: string };
    clock?: { displayValue?: string };
    text?: string;
    shortText?: string;
    team?: { id?: string; displayName?: string };
    participants?: Array<{ athlete?: { id?: string; displayName?: string } }>;
  }>;
  commentary?: Array<{
    sequence?: number;
    time?: { displayValue?: string };
    text?: string;
  }>;
  boxscore?: {
    teams?: Array<{
      team?: { id?: string; displayName?: string; logo?: string };
      statistics?: Array<{ name?: string; displayValue?: string }>;
    }>;
  };
  rosters?: Array<{
    team?: { id?: string };
    roster?: Array<{
      starter?: boolean;
      jersey?: string;
      athlete?: { id?: string };
      position?: { displayName?: string };
      stats?: Array<{ name?: string; value?: number }>;
    }>;
  }>;
};

async function fetchJson<T>(url: string, _revalidate = 15): Promise<T | null> {
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

function stat(stats: EspnStat[] | undefined, name: string) {
  return stats?.find((entry) => entry.name === name)?.value ?? 0;
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

function statusLabel(competition: EspnCompetition) {
  const type = competition.status?.type;
  if (type?.state === 'in') {
    return competition.status?.displayClock ? `Live · ${competition.status.displayClock}` : 'Live';
  }
  return type?.description ?? 'Scheduled';
}

function mapEvent(event: EspnEvent): LiveMatch | null {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find((entry) => entry.homeAway === 'home');
  const away = competition?.competitors?.find((entry) => entry.homeAway === 'away');
  if (!event.id || !event.date || !competition || !home?.id || !away?.id || !home.team?.displayName || !away.team?.displayName) {
    return null;
  }

  const formatted = formatEventDate(event.date);
  const groupMatch = competition.altGameNote?.match(/Group\s+([A-L])/i);
  const group = groupMatch ? `Group ${groupMatch[1].toUpperCase()}` : null;
  const stage = event.season?.slug
    ?.split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    id: event.id,
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
    group,
    round: group ?? stage ?? 'FIFA World Cup',
    status: statusLabel(competition),
    isLiveData: true,
  };
}

export async function fetchWorldCupMatches(): Promise<LiveMatch[]> {
  const response = await fetchJson<ScoreboardResponse>(
    `${ESPN_SITE_API}/scoreboard?dates=${SCOREBOARD_RANGE}&limit=200`,
  );
  return (response?.events ?? [])
    .map(mapEvent)
    .filter((match): match is LiveMatch => match !== null)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function fetchWorldCupStandings(): Promise<LiveStanding[]> {
  const response = await fetchJson<StandingsResponse>(
    `${ESPN_WEB_API}/standings?region=us&lang=en&contentorigin=espn&isqualified=true&season=2026&sort=rank:asc`,
  );
  const updatedAt = new Date().toISOString();

  return (response?.children ?? []).flatMap((group) => {
    const groupCode = group.name?.replace(/^Group\s+/i, '').toUpperCase();
    if (!groupCode) return [];

    return (group.standings?.entries ?? []).flatMap((entry) => {
      const team = entry.team;
      if (!team?.id || !team.displayName) return [];
      const stats = entry.stats;
      return [{
        teamId: team.id,
        team: team.displayName,
        badge: logo(team),
        group: groupCode,
        rank: stat(stats, 'rank'),
        played: stat(stats, 'gamesPlayed'),
        won: stat(stats, 'wins'),
        drawn: stat(stats, 'ties'),
        lost: stat(stats, 'losses'),
        goalsFor: stat(stats, 'pointsFor'),
        goalsAgainst: stat(stats, 'pointsAgainst'),
        goalDifference: stat(stats, 'pointDifferential'),
        points: stat(stats, 'points'),
        form: '',
        qualification: entry.note?.description ?? null,
        updatedAt,
      }];
    });
  });
}

export async function fetchWorldCupTeam(teamId: string): Promise<LiveTeam | null> {
  if (!/^\d+$/.test(teamId)) return null;
  const response = await fetchJson<TeamResponse>(`${ESPN_SITE_API}/teams/${teamId}`, 300);
  const team = response?.team;
  if (!team?.id || !team.displayName) return null;
  const website = team.links?.find((link) => {
    const rel = Array.isArray(link.rel) ? link.rel : [];
    return rel.includes('clubhouse');
  })?.href ?? null;

  return {
    id: team.id,
    name: team.displayName,
    shortName: team.abbreviation ?? team.displayName.slice(0, 3).toUpperCase(),
    badge: logo(team),
    logo: logo(team),
    fanart: null,
    description: `Live FIFA World Cup profile for ${team.displayName}. Results, standings, and fixtures are loaded directly from the current competition feed.`,
    country: team.location ?? team.displayName,
    stadium: null,
    stadiumCapacity: null,
    location: team.location ?? null,
    nickname: null,
    formedYear: null,
    website,
  };
}

function athleteStat(athlete: EspnAthlete, name: string) {
  const stats = athlete.statistics?.splits?.categories?.flatMap((category) => category.stats ?? []);
  return stat(stats, name);
}

async function fetchTeamPlayerStats(teamId: string): Promise<PlayerTournamentStat[]> {
  const response = await fetchJson<RosterResponse>(`${ESPN_SITE_API}/teams/${teamId}/roster`, 60);
  const team = response?.team;
  if (!team?.id || !team.displayName) return [];
  const resolvedTeamId = team.id;
  const resolvedTeamName = team.displayName;

  return (response?.athletes ?? []).flatMap((athlete) => {
    if (!athlete.id || !athlete.displayName) return [];
    const profileUrl = athlete.links?.find((link) => {
      const rel = Array.isArray(link.rel) ? link.rel : [];
      return rel.includes('playercard');
    })?.href ?? null;
    return [{
      id: athlete.id,
      name: athlete.displayName,
      shortName: athlete.shortName ?? athlete.displayName,
      headshot: athlete.headshot?.href ?? null,
      teamId: resolvedTeamId,
      team: resolvedTeamName,
      teamLogo: team.logo ?? null,
      position: athlete.position?.displayName ?? athlete.position?.abbreviation ?? 'Player',
      jersey: athlete.jersey ?? null,
      age: athlete.age ?? null,
      height: athlete.displayHeight ?? null,
      weight: athlete.displayWeight ?? null,
      citizenship: athlete.citizenship ?? null,
      appearances: athleteStat(athlete, 'appearances'),
      goals: athleteStat(athlete, 'totalGoals'),
      assists: athleteStat(athlete, 'goalAssists'),
      shots: athleteStat(athlete, 'totalShots'),
      shotsOnTarget: athleteStat(athlete, 'shotsOnTarget'),
      yellowCards: athleteStat(athlete, 'yellowCards'),
      redCards: athleteStat(athlete, 'redCards'),
      saves: athleteStat(athlete, 'saves'),
      profileUrl,
    }];
  });
}

export async function fetchWorldCupPlayerStats(): Promise<PlayerTournamentStat[]> {
  const standings = await fetchWorldCupStandings();
  const teamIds = Array.from(new Set(standings.map((team) => team.teamId)));
  const players: PlayerTournamentStat[] = [];

  for (let index = 0; index < teamIds.length; index += 8) {
    const batch = teamIds.slice(index, index + 8);
    const results = await Promise.all(batch.map(fetchTeamPlayerStats));
    players.push(...results.flat());
  }

  return players.filter((player) =>
    player.appearances > 0 ||
    player.goals > 0 ||
    player.assists > 0 ||
    player.yellowCards > 0 ||
    player.redCards > 0 ||
    player.saves > 0,
  );
}

export async function fetchWorldCupPlayer(playerId: string): Promise<PlayerTournamentStat | null> {
  const players = await fetchWorldCupPlayerStats();
  return players.find((player) => player.id === playerId) ?? null;
}

export async function fetchWorldCupMatchDetails(matchId: string): Promise<LiveMatchDetails> {
  const response = await fetchJson<SummaryResponse>(`${ESPN_SITE_API}/summary?event=${encodeURIComponent(matchId)}`, 10);
  const events = (response?.keyEvents ?? []).flatMap((event) => {
    if (!event.id || !event.type?.type) return [];
    const player = event.participants?.[0]?.athlete;
    return [{
      id: event.id,
      type: event.type.type,
      label: event.type.text ?? event.type.type,
      minute: event.clock?.displayValue ?? '',
      text: event.text ?? event.shortText ?? event.type.text ?? 'Match event',
      teamId: event.team?.id ?? null,
      team: event.team?.displayName ?? null,
      playerId: player?.id ?? null,
      playerName: player?.displayName ?? null,
    }];
  });
  const commentary = (response?.commentary ?? []).flatMap((entry) =>
    entry.text
      ? [{ sequence: entry.sequence ?? 0, minute: entry.time?.displayValue ?? '', text: entry.text }]
      : [],
  );
  const teamStatistics = (response?.boxscore?.teams ?? []).flatMap((entry) => {
    if (!entry.team?.id || !entry.team.displayName) return [];
    return [{
      teamId: entry.team.id,
      team: entry.team.displayName,
      logo: entry.team.logo ?? null,
      values: Object.fromEntries((entry.statistics ?? []).flatMap((item) =>
        item.name && item.displayValue !== undefined ? [[item.name, item.displayValue]] : [],
      )),
    }];
  });
  const players = (response?.rosters ?? []).flatMap((roster) => {
    if (!roster.team?.id) return [];
    return (roster.roster ?? []).flatMap((entry) => {
      if (!entry.athlete?.id) return [];
      return [{
        playerId: entry.athlete.id,
        teamId: roster.team!.id!,
        starter: Boolean(entry.starter),
        jersey: entry.jersey ?? null,
        position: entry.position?.displayName ?? 'Player',
        stats: Object.fromEntries((entry.stats ?? []).flatMap((item) =>
          item.name && item.value !== undefined ? [[item.name, item.value]] : [],
        )),
      }];
    });
  });
  return { events, commentary, teamStatistics, players };
}

function isScoringEvent(event: MatchTimelineEvent) {
  const type = event.type.toLowerCase();
  const text = `${event.label} ${event.text}`.toLowerCase();
  return (
    type === 'goal' ||
    type === 'own-goal' ||
    type === 'penalty---scored' ||
    (text.includes('goal') && !text.includes('disallowed'))
  );
}

function minuteSortValue(minute: string) {
  const parts = minute.match(/\d+/g)?.map(Number) ?? [];
  if (!parts.length) return 999;
  return parts.reduce((total, value) => total + value, 0);
}

export async function fetchWorldCupMatchScorers(matchId: string): Promise<MatchGoalScorer[]> {
  const details = await fetchWorldCupMatchDetails(matchId);
  return details.events
    .filter(isScoringEvent)
    .map((event) => ({
      id: event.id,
      minute: event.minute,
      playerId: event.playerId,
      playerName: event.playerName ?? (event.text.split('(')[0]?.replace(/^Goal!\s*/i, '').trim() || 'Scorer'),
      teamId: event.teamId,
      team: event.team,
      detail: event.label,
    }))
    .sort((a, b) => minuteSortValue(a.minute) - minuteSortValue(b.minute));
}

export type PlayerMatchLogEntry = {
  match: LiveMatch;
  starter: boolean;
  position: string;
  stats: Record<string, number>;
};

export async function fetchPlayerMatchLog(playerId: string, teamId: string): Promise<PlayerMatchLogEntry[]> {
  const matches = (await fetchWorldCupMatches()).filter((match) =>
    match.homeTeamId === teamId || match.awayTeamId === teamId,
  );
  const completed = matches.filter((match) => /final|full time|live/i.test(match.status));
  const details = await Promise.all(completed.map((match) => fetchWorldCupMatchDetails(match.id)));
  return completed.flatMap((match, index) => {
    const performance = details[index].players.find((player) => player.playerId === playerId);
    return performance ? [{ match, starter: performance.starter, position: performance.position, stats: performance.stats }] : [];
  });
}

export async function fetchWorldCupMatch(matchId: string): Promise<LiveMatch | undefined> {
  const matches = await fetchWorldCupMatches();
  return matches.find((match) => match.id === matchId);
}

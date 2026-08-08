export const FANTASY_BUDGET = 100;
export const FANTASY_SQUAD_SIZE = 15;
export const FANTASY_STARTING_SIZE = 11;
export const FANTASY_TEAM_LIMIT = 3;

export type FantasySquad = {
  playerIds: string[];
  starterIds?: string[];
  benchIds?: string[];
  captainId: string | null;
  viceCaptainId?: string | null;
};

export type FantasyPlayer = {
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
  price: number;
  points: number;
  form: number;
  selectedByPercent: number;
  minutes: number;
  source: 'fantasy-premier-league';
  availabilityStatus: string;
  chanceOfPlaying: number | null;
  availabilityNews: string | null;
  availabilityUpdatedAt: string | null;
  expectedGoals: number;
  expectedAssists: number;
  ictIndex: number;
  transfersInGameweek: number;
  upcomingFixtures: FantasyFixture[];
};

export type FantasyFixture = { event: number | null; opponent: string; home: boolean; difficulty: number; kickoff: string | null };

type FplTeam = { id: number; name: string; code: number };
type FplPosition = { id: number; singular_name: string };
type FplPlayer = {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  starts: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  form: string;
  selected_by_percent: string;
  photo: string;
  status: string;
  chance_of_playing_next_round: number | null;
  news: string;
  news_added: string | null;
  expected_goals: string;
  expected_assists: string;
  ict_index: string;
  transfers_in_event: number;
};
type FplBootstrap = { teams?: FplTeam[]; element_types?: FplPosition[]; elements?: FplPlayer[] };
type FplFixture = { event: number | null; kickoff_time: string | null; team_h: number; team_a: number; team_h_difficulty: number; team_a_difficulty: number; finished: boolean };
type FplEvent = { id: number; name: string; deadline_time: string; is_current: boolean; is_next: boolean; finished: boolean; data_checked: boolean };

export type FantasyGameStatus = {
  gameweek: number | null;
  name: string;
  deadline: string | null;
  state: 'open' | 'locked' | 'finished' | 'unavailable';
  dataChecked: boolean;
  updatedAt: string;
};

export async function fetchFantasyGameStatus(): Promise<FantasyGameStatus> {
  const updatedAt = new Date().toISOString();
  try {
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', { next: { revalidate: 60 }, signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error('FPL unavailable');
    const payload = await response.json() as { events?: FplEvent[] };
    const event = payload.events?.find((entry) => entry.is_next) ?? payload.events?.find((entry) => entry.is_current) ?? payload.events?.at(-1);
    if (!event) throw new Error('No gameweek');
    const deadline = new Date(event.deadline_time);
    return { gameweek: event.id, name: event.name, deadline: event.deadline_time, state: event.finished ? 'finished' : deadline.getTime() > Date.now() ? 'open' : 'locked', dataChecked: event.data_checked, updatedAt };
  } catch {
    return { gameweek: null, name: 'Gameweek unavailable', deadline: null, state: 'unavailable', dataChecked: false, updatedAt };
  }
}

export async function fetchFantasyPlayerPool(): Promise<FantasyPlayer[]> {
  try {
    const [response, fixtureResponse] = await Promise.all([
      fetch('https://fantasy.premierleague.com/api/bootstrap-static/', { headers: { Accept: 'application/json', 'User-Agent': 'The Matchroom fantasy companion' }, next: { revalidate: 60 }, signal: AbortSignal.timeout(8_000) }),
      fetch('https://fantasy.premierleague.com/api/fixtures/', { headers: { Accept: 'application/json', 'User-Agent': 'The Matchroom fantasy companion' }, next: { revalidate: 60 }, signal: AbortSignal.timeout(8_000) }).catch(() => null),
    ]);
    if (!response.ok) return [];
    const payload = await response.json() as FplBootstrap;
    const teams = new Map((payload.teams ?? []).map((team) => [team.id, team]));
    const positions = new Map((payload.element_types ?? []).map((position) => [position.id, position.singular_name]));
    const fixtures = fixtureResponse?.ok ? await fixtureResponse.json() as FplFixture[] : [];
    return (payload.elements ?? [])
      .map((player): FantasyPlayer | null => {
        const team = teams.get(player.team);
        const position = positions.get(player.element_type);
        if (!team || !position) return null;
        return {
          id: String(player.id),
          name: `${player.first_name} ${player.second_name}`.trim(),
          shortName: player.web_name,
          headshot: fplHeadshot(player.photo),
          teamId: String(team.id),
          team: team.name,
          teamLogo: `https://resources.premierleague.com/premierleague/badges/50/t${team.code}.png`,
          position,
          jersey: null,
          age: null,
          height: null,
          weight: null,
          citizenship: null,
          appearances: player.starts,
          goals: player.goals_scored,
          assists: player.assists,
          shots: 0,
          shotsOnTarget: 0,
          yellowCards: player.yellow_cards,
          redCards: player.red_cards,
          saves: player.saves,
          profileUrl: null,
          price: Number((player.now_cost / 10).toFixed(1)),
          points: player.total_points,
          form: Number(player.form) || 0,
          selectedByPercent: Number(player.selected_by_percent) || 0,
          minutes: player.minutes,
          source: 'fantasy-premier-league',
          availabilityStatus: availabilityLabel(player.status),
          chanceOfPlaying: player.chance_of_playing_next_round,
          availabilityNews: player.news?.trim() || null,
          availabilityUpdatedAt: player.news_added,
          expectedGoals: Number(player.expected_goals) || 0,
          expectedAssists: Number(player.expected_assists) || 0,
          ictIndex: Number(player.ict_index) || 0,
          transfersInGameweek: player.transfers_in_event || 0,
          upcomingFixtures: fixtures.filter((fixture) => !fixture.finished && (fixture.team_h === player.team || fixture.team_a === player.team)).sort((a, b) => new Date(a.kickoff_time ?? 0).getTime() - new Date(b.kickoff_time ?? 0).getTime()).slice(0, 5).map((fixture) => {
            const home = fixture.team_h === player.team;
            const opponent = teams.get(home ? fixture.team_a : fixture.team_h);
            return { event: fixture.event, opponent: opponent?.name ?? 'TBC', home, difficulty: home ? fixture.team_h_difficulty : fixture.team_a_difficulty, kickoff: fixture.kickoff_time };
          }),
        };
      })
      .filter((player): player is FantasyPlayer => player !== null)
      .sort((a, b) => b.points - a.points || b.form - a.form || a.price - b.price);
  } catch {
    return [];
  }
}

function availabilityLabel(status: string) {
  if (status === 'a') return 'available';
  if (status === 'd') return 'doubtful';
  if (status === 'i') return 'injured';
  if (status === 's') return 'suspended';
  if (status === 'u') return 'unavailable';
  if (status === 'n') return 'not in squad';
  return 'unknown';
}

export function squadCost(players: FantasyPlayer[], squad: FantasySquad) {
  const byId = new Map(players.map((player) => [player.id, player]));
  return squad.playerIds.reduce((total, playerId) => total + (byId.get(playerId)?.price ?? 0), 0);
}

export function squadPoints(players: FantasyPlayer[], squad: FantasySquad) {
  const byId = new Map(players.map((player) => [player.id, player]));
  const starters = squad.starterIds?.length === FANTASY_STARTING_SIZE ? squad.starterIds : squad.playerIds.slice(0, FANTASY_STARTING_SIZE);
  return starters.reduce((total, playerId) => {
    const player = byId.get(playerId);
    if (!player) return total;
    return total + player.points * (player.id === squad.captainId ? 2 : 1);
  }, 0);
}

function fplHeadshot(photo: string) {
  const code = photo.replace(/\.jpg$/i, '');
  return code ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png` : null;
}

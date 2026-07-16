import { fetchWorldCupPlayerStats, type PlayerTournamentStat } from '@/lib/liveData';

export const FANTASY_BUDGET = 100;
export const FANTASY_SQUAD_SIZE = 11;

export type FantasySquad = {
  playerIds: string[];
  captainId: string | null;
};

export type FantasyPlayer = PlayerTournamentStat & {
  price: number;
  points: number;
};

export async function fetchFantasyPlayerPool(): Promise<FantasyPlayer[]> {
  const players = await fetchWorldCupPlayerStats();
  return players
    .map((player) => ({ ...player, price: playerPrice(player), points: playerPoints(player) }))
    .sort((a, b) => b.points - a.points || b.price - a.price || a.name.localeCompare(b.name));
}

export function playerPoints(player: PlayerTournamentStat) {
  const isGoalkeeper = /goalkeeper|gk/i.test(player.position);
  return (
    player.appearances * 2
    + player.goals * (isGoalkeeper ? 10 : 5)
    + player.assists * 3
    + player.shotsOnTarget
    + player.saves
    - player.yellowCards
    - player.redCards * 3
  );
}

export function playerPrice(player: PlayerTournamentStat) {
  const raw = 5 + player.goals * 1.1 + player.assists * 0.7 + player.appearances * 0.25 + player.saves * 0.08;
  return Number(Math.max(4, Math.min(15, raw)).toFixed(1));
}

export function squadCost(players: FantasyPlayer[], squad: FantasySquad) {
  const byId = new Map(players.map((player) => [player.id, player]));
  return squad.playerIds.reduce((total, playerId) => total + (byId.get(playerId)?.price ?? 0), 0);
}

export function squadPoints(players: FantasyPlayer[], squad: FantasySquad) {
  const byId = new Map(players.map((player) => [player.id, player]));
  return squad.playerIds.reduce((total, playerId) => {
    const player = byId.get(playerId);
    if (!player) return total;
    return total + player.points * (player.id === squad.captainId ? 2 : 1);
  }, 0);
}

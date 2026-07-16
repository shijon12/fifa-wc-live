import 'server-only';
import crypto from 'node:crypto';
import {
  getUserFantasyProfile,
  listFantasyProfiles,
  updateUserFantasyProfile,
  type AuthUser,
  type FantasyPick,
  type FantasyProfile,
} from '@/lib/auth';
import { isMissingTable, supabaseRest } from '@/lib/supabaseRest';

type FantasyProfileRow = { user_id: string; manager_name: string; updated_at: string };
type FantasyPickRow = { user_id: string; match_id: string; choice: FantasyPick['choice']; confidence: number };
type FantasySquadRow = { user_id: string; player_ids: string[]; captain_id: string | null };
type LeagueRow = { id: string; owner_user_id: string; name: string; join_code: string; is_active: boolean; created_at: string };
type LeagueMemberRow = { league_id: string; user_id: string; role: 'owner' | 'member'; joined_at: string };

export type PrivateLeague = {
  id: string;
  name: string;
  joinCode: string;
  role: 'owner' | 'member';
  members: number;
  createdAt: string;
};

export async function readFantasyProfile(user: AuthUser): Promise<FantasyProfile> {
  try {
    const [profiles, picks, squads] = await Promise.all([
      supabaseRest<FantasyProfileRow[]>(`fantasy_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=*`),
      supabaseRest<FantasyPickRow[]>(`fantasy_picks?user_id=eq.${encodeURIComponent(user.id)}&select=match_id,choice,confidence`),
      supabaseRest<FantasySquadRow[]>(`fantasy_squads?user_id=eq.${encodeURIComponent(user.id)}&select=player_ids,captain_id`),
    ]);
    return {
      managerName: profiles[0]?.manager_name ?? user.displayName,
      picks: Object.fromEntries(picks.map((pick) => [pick.match_id, { matchId: pick.match_id, choice: pick.choice, confidence: pick.confidence }])),
      squad: {
        playerIds: squads[0]?.player_ids ?? [],
        captainId: squads[0]?.captain_id ?? null,
      },
      updatedAt: profiles[0]?.updated_at,
    };
  } catch (error) {
    if (isMissingTable(error)) return getUserFantasyProfile(user.id);
    throw error;
  }
}

export async function writeFantasyProfile(user: AuthUser, fantasy: FantasyProfile) {
  try {
    await supabaseRest('fantasy_profiles?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ user_id: user.id, manager_name: fantasy.managerName, updated_at: new Date().toISOString() }),
    });
    await supabaseRest(`fantasy_picks?user_id=eq.${encodeURIComponent(user.id)}`, { method: 'DELETE' });
    const picks = Object.values(fantasy.picks ?? {});
    if (picks.length) {
      await supabaseRest('fantasy_picks', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(picks.map((pick) => ({ user_id: user.id, match_id: pick.matchId, choice: pick.choice, confidence: pick.confidence }))),
      });
    }
    await supabaseRest('fantasy_squads?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: user.id,
        player_ids: fantasy.squad?.playerIds ?? [],
        captain_id: fantasy.squad?.captainId ?? null,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch (error) {
    if (isMissingTable(error)) {
      await updateUserFantasyProfile(user, fantasy);
      return;
    }
    throw error;
  }
}

export async function listFantasyProfilesForLeaderboard() {
  try {
    const [profiles, picks, squads] = await Promise.all([
      supabaseRest<FantasyProfileRow[]>('fantasy_profiles?select=*'),
      supabaseRest<FantasyPickRow[]>('fantasy_picks?select=*'),
      supabaseRest<FantasySquadRow[]>('fantasy_squads?select=*'),
    ]);
    return profiles.map((profile) => {
      const userPicks = picks.filter((pick) => pick.user_id === profile.user_id);
      const squad = squads.find((entry) => entry.user_id === profile.user_id);
      return {
        id: profile.user_id,
        email: '',
        displayName: profile.manager_name,
        role: 'user' as const,
        fantasy: {
          managerName: profile.manager_name,
          picks: Object.fromEntries(userPicks.map((pick) => [pick.match_id, { matchId: pick.match_id, choice: pick.choice, confidence: pick.confidence }])),
          squad: { playerIds: squad?.player_ids ?? [], captainId: squad?.captain_id ?? null },
          updatedAt: profile.updated_at,
        },
      };
    });
  } catch (error) {
    if (isMissingTable(error)) return listFantasyProfiles();
    throw error;
  }
}

export async function createPrivateLeague(user: AuthUser, name: string): Promise<PrivateLeague> {
  const joinCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  const rows = await supabaseRest<LeagueRow[]>('private_leagues', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ owner_user_id: user.id, name, join_code: joinCode }),
  });
  const league = rows[0];
  await supabaseRest('private_league_members', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ league_id: league.id, user_id: user.id, role: 'owner' }),
  });
  return { id: league.id, name: league.name, joinCode: league.join_code, role: 'owner', members: 1, createdAt: league.created_at };
}

export async function joinPrivateLeague(user: AuthUser, code: string): Promise<PrivateLeague> {
  const rows = await supabaseRest<LeagueRow[]>(`private_leagues?join_code=eq.${encodeURIComponent(code.toUpperCase())}&is_active=eq.true&select=*`);
  const league = rows[0];
  if (!league) throw new Error('Private league not found.');
  await supabaseRest('private_league_members?on_conflict=league_id,user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ league_id: league.id, user_id: user.id, role: 'member' }),
  });
  return { id: league.id, name: league.name, joinCode: league.join_code, role: 'member', members: 0, createdAt: league.created_at };
}

export async function listPrivateLeagues(user: AuthUser): Promise<PrivateLeague[]> {
  const memberships = await supabaseRest<LeagueMemberRow[]>(`private_league_members?user_id=eq.${encodeURIComponent(user.id)}&select=*`);
  if (!memberships.length) return [];
  const leagueIds = memberships.map((member) => member.league_id);
  const leagues = await supabaseRest<LeagueRow[]>(`private_leagues?id=in.(${leagueIds.join(',')})&select=*`);
  const counts = await supabaseRest<Array<{ league_id: string }>>(`private_league_members?league_id=in.(${leagueIds.join(',')})&select=league_id`);
  return leagues.map((league) => ({
    id: league.id,
    name: league.name,
    joinCode: league.join_code,
    role: memberships.find((member) => member.league_id === league.id)?.role ?? 'member',
    members: counts.filter((member) => member.league_id === league.id).length,
    createdAt: league.created_at,
  }));
}

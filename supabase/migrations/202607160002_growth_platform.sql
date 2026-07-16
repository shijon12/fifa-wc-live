create extension if not exists pgcrypto;

create table if not exists public.fantasy_profiles (
  user_id uuid primary key,
  manager_name text not null check (char_length(manager_name) between 1 and 60),
  updated_at timestamptz not null default now()
);

create table if not exists public.fantasy_picks (
  user_id uuid not null,
  match_id text not null,
  choice text not null check (choice in ('home', 'draw', 'away')),
  confidence integer not null check (confidence between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

create table if not exists public.fantasy_squads (
  user_id uuid primary key,
  player_ids text[] not null default '{}',
  captain_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.private_leagues (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  name text not null check (char_length(name) between 2 and 80),
  join_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.private_league_members (
  league_id uuid not null references public.private_leagues(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create table if not exists public.moderation_reports (
  id bigint generated always as identity primary key,
  reporter_user_id uuid,
  target_type text not null check (target_type in ('user', 'league', 'content', 'bug')),
  target_id text,
  reason text not null check (char_length(reason) between 3 and 120),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists fantasy_picks_user_id_idx on public.fantasy_picks(user_id);
create index if not exists private_league_members_user_id_idx on public.private_league_members(user_id);
create index if not exists moderation_reports_status_idx on public.moderation_reports(status);

alter table public.fantasy_profiles enable row level security;
alter table public.fantasy_picks enable row level security;
alter table public.fantasy_squads enable row level security;
alter table public.private_leagues enable row level security;
alter table public.private_league_members enable row level security;
alter table public.moderation_reports enable row level security;

revoke all on public.fantasy_profiles from anon, authenticated;
revoke all on public.fantasy_picks from anon, authenticated;
revoke all on public.fantasy_squads from anon, authenticated;
revoke all on public.private_leagues from anon, authenticated;
revoke all on public.private_league_members from anon, authenticated;
revoke all on public.moderation_reports from anon, authenticated;

grant all on public.fantasy_profiles to service_role;
grant all on public.fantasy_picks to service_role;
grant all on public.fantasy_squads to service_role;
grant all on public.private_leagues to service_role;
grant all on public.private_league_members to service_role;
grant all on public.moderation_reports to service_role;
grant usage, select on sequence public.moderation_reports_id_seq to service_role;

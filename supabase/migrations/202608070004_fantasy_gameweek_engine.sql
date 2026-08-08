alter table public.fantasy_squads add column if not exists bench_ids text[] not null default '{}';

create table if not exists public.fantasy_manager_state (
  user_id uuid primary key,
  free_transfers integer not null default 1 check (free_transfers between 0 and 5),
  bank numeric(5,1) not null default 0,
  joined_gameweek integer,
  active_chip text check (active_chip in ('wildcard','free_hit','bench_boost','triple_captain')),
  free_hit_restore jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.fantasy_gameweek_squads (
  user_id uuid not null,
  gameweek integer not null,
  player_ids text[] not null,
  starter_ids text[] not null,
  bench_ids text[] not null,
  captain_id text,
  vice_captain_id text,
  chip text,
  transfer_cost integer not null default 0,
  gross_points integer,
  net_points integer,
  bench_points integer,
  effective_starter_ids text[],
  effective_captain_id text,
  breakdown jsonb,
  finalized boolean not null default false,
  deadline_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, gameweek)
);

create table if not exists public.fantasy_transfers (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  gameweek integer not null,
  player_out_id text not null,
  player_in_id text not null,
  points_cost integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.fantasy_chip_usage (
  user_id uuid not null,
  chip text not null check (chip in ('wildcard','free_hit','bench_boost','triple_captain')),
  season_half integer not null check (season_half in (1,2)),
  gameweek integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, chip, season_half)
);

create index if not exists fantasy_gameweek_squads_gameweek_idx on public.fantasy_gameweek_squads(gameweek, finalized);
create index if not exists fantasy_transfers_user_gameweek_idx on public.fantasy_transfers(user_id, gameweek);
alter table public.fantasy_manager_state enable row level security;
alter table public.fantasy_gameweek_squads enable row level security;
alter table public.fantasy_transfers enable row level security;
alter table public.fantasy_chip_usage enable row level security;
revoke all on public.fantasy_manager_state, public.fantasy_gameweek_squads, public.fantasy_transfers, public.fantasy_chip_usage from anon, authenticated;
grant all on public.fantasy_manager_state, public.fantasy_gameweek_squads, public.fantasy_transfers, public.fantasy_chip_usage to service_role;
grant usage, select on sequence public.fantasy_transfers_id_seq to service_role;

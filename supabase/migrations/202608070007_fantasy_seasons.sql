alter table public.fantasy_manager_state add column if not exists season_key text not null default '2026-27';
alter table public.fantasy_gameweek_squads add column if not exists season_key text not null default '2026-27';
alter table public.fantasy_transfers add column if not exists season_key text not null default '2026-27';
alter table public.fantasy_chip_usage add column if not exists season_key text not null default '2026-27';

alter table public.fantasy_gameweek_squads drop constraint if exists fantasy_gameweek_squads_pkey;
alter table public.fantasy_gameweek_squads add primary key (user_id, season_key, gameweek);
alter table public.fantasy_chip_usage drop constraint if exists fantasy_chip_usage_pkey;
alter table public.fantasy_chip_usage add primary key (user_id, season_key, chip, season_half);

create index if not exists fantasy_gameweek_season_idx on public.fantasy_gameweek_squads(season_key, gameweek, finalized);
create index if not exists fantasy_transfers_season_idx on public.fantasy_transfers(season_key, gameweek, user_id);

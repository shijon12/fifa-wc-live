alter table public.fantasy_squads
  add column if not exists starter_ids text[] not null default '{}',
  add column if not exists vice_captain_id text;

comment on column public.fantasy_squads.starter_ids is 'The manager starting XI; remaining squad players are substitutes.';
comment on column public.fantasy_squads.vice_captain_id is 'Vice-captain used when the captain does not play.';

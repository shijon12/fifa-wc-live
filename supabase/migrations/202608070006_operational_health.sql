create table if not exists public.operational_events (
  id bigint generated always as identity primary key,
  service text not null,
  operation text not null,
  status text not null check (status in ('success','warning','error')),
  duration_ms integer,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists operational_events_service_created_idx
  on public.operational_events(service, created_at desc);
create index if not exists operational_events_status_created_idx
  on public.operational_events(status, created_at desc);

alter table public.fantasy_gameweek_squads
  add column if not exists scoring_attempts integer not null default 0,
  add column if not exists last_scoring_error text,
  add column if not exists last_scoring_attempt_at timestamptz;

alter table public.operational_events enable row level security;
revoke all on public.operational_events from anon, authenticated;
grant all on public.operational_events to service_role;
grant usage, select on sequence public.operational_events_id_seq to service_role;

create or replace function public.prune_operational_events()
returns void language sql security definer set search_path = public as $$
  delete from public.operational_events where created_at < now() - interval '30 days';
$$;
revoke all on function public.prune_operational_events() from public, anon, authenticated;
grant execute on function public.prune_operational_events() to service_role;

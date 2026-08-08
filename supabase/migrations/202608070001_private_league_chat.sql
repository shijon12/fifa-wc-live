create table if not exists public.private_league_messages (
  id bigint generated always as identity primary key,
  league_id uuid not null references public.private_leagues(id) on delete cascade,
  user_id uuid not null,
  display_name text not null check (char_length(display_name) between 1 and 80),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists private_league_messages_league_created_idx
  on public.private_league_messages(league_id, created_at desc);

alter table public.private_league_messages enable row level security;
revoke all on public.private_league_messages from anon, authenticated;
grant all on public.private_league_messages to service_role;
grant usage, select on sequence public.private_league_messages_id_seq to service_role;

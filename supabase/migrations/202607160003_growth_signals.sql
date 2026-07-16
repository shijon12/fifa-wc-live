create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid,
  anonymous_id text,
  event_name text not null check (char_length(event_name) between 2 and 80),
  path text not null default '/',
  feature text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.waitlist_feedback (
  id bigint generated always as identity primary key,
  email text,
  name text,
  role text,
  favorite_team text,
  interest text not null check (interest in ('fantasy', 'alerts', 'stats', 'news', 'predictions', 'private-leagues', 'other')),
  message text not null check (char_length(message) between 3 and 1200),
  source_path text not null default '/',
  created_at timestamptz not null default now()
);

create index if not exists product_events_created_at_idx on public.product_events(created_at desc);
create index if not exists product_events_event_name_idx on public.product_events(event_name);
create index if not exists product_events_feature_idx on public.product_events(feature);
create index if not exists waitlist_feedback_created_at_idx on public.waitlist_feedback(created_at desc);
create index if not exists waitlist_feedback_interest_idx on public.waitlist_feedback(interest);

alter table public.product_events enable row level security;
alter table public.waitlist_feedback enable row level security;

revoke all on public.product_events from anon, authenticated;
revoke all on public.waitlist_feedback from anon, authenticated;

grant all on public.product_events to service_role;
grant all on public.waitlist_feedback to service_role;
grant usage, select on sequence public.product_events_id_seq to service_role;
grant usage, select on sequence public.waitlist_feedback_id_seq to service_role;

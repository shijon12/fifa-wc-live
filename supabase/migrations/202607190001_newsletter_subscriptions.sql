create table if not exists public.newsletter_subscriptions (
  id bigint generated always as identity primary key,
  email text not null unique,
  name text,
  favorite_team text,
  cadence text not null default 'weekly' check (cadence in ('weekly')),
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  source_path text not null default '/',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_subscriptions_status_idx on public.newsletter_subscriptions(status);
create index if not exists newsletter_subscriptions_subscribed_at_idx on public.newsletter_subscriptions(subscribed_at desc);
create index if not exists newsletter_subscriptions_last_sent_at_idx on public.newsletter_subscriptions(last_sent_at);

alter table public.newsletter_subscriptions enable row level security;

revoke all on public.newsletter_subscriptions from anon, authenticated;
grant all on public.newsletter_subscriptions to service_role;
grant usage, select on sequence public.newsletter_subscriptions_id_seq to service_role;

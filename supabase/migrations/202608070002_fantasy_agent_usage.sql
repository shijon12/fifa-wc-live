create table if not exists public.fantasy_agent_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (timezone('utc', now())::date),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.fantasy_agent_usage enable row level security;

create or replace function public.claim_fantasy_agent_usage(p_user_id uuid, p_daily_limit integer)
returns table (allowed boolean, used integer, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_usage integer;
  safe_limit integer := greatest(1, least(coalesce(p_daily_limit, 20), 100));
begin
  insert into public.fantasy_agent_usage (user_id, usage_date, request_count)
  values (p_user_id, timezone('utc', now())::date, 0)
  on conflict (user_id, usage_date) do nothing;

  update public.fantasy_agent_usage
  set request_count = request_count + 1,
      updated_at = now()
  where user_id = p_user_id
    and usage_date = timezone('utc', now())::date
    and request_count < safe_limit
  returning request_count into current_usage;

  if found then
    return query select true, current_usage, greatest(safe_limit - current_usage, 0);
  else
    select request_count into current_usage
    from public.fantasy_agent_usage
    where user_id = p_user_id and usage_date = timezone('utc', now())::date;
    return query select false, coalesce(current_usage, safe_limit), 0;
  end if;
end;
$$;

revoke all on function public.claim_fantasy_agent_usage(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_fantasy_agent_usage(uuid, integer) to service_role;

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'matchroom-fantasy-gameweek') then
    perform cron.unschedule('matchroom-fantasy-gameweek');
  end if;
end $$;

select cron.schedule(
  'matchroom-fantasy-gameweek',
  '* * * * *',
  $$
  select net.http_get(
    url := 'https://the-matchroom.vercel.app/api/fantasy/gameweek/process',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'world_cup_push_cron_secret' limit 1)
    ),
    timeout_milliseconds := 50000
  );
  $$
);

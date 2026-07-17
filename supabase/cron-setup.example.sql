-- Run after replacing CRON_SECRET_VALUE with the same CRON_SECRET configured in Vercel.
-- The secret is stored encrypted in Supabase Vault and is never committed.

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

select vault.create_secret(
  'https://the-matchroom.vercel.app/api/push/check',
  'world_cup_push_check_url',
  'Production push-check endpoint'
);

select vault.create_secret(
  'CRON_SECRET_VALUE',
  'world_cup_push_cron_secret',
  'Authorization secret for the push-check endpoint'
);

select cron.schedule(
  'world-cup-push-check-every-minute',
  '* * * * *',
  $$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'world_cup_push_check_url'
        limit 1
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'world_cup_push_cron_secret'
          limit 1
        )
      ),
      body := '{}'::jsonb
    );
  $$
);

-- The Aurelia: every-minute trigger for /api/cron/scheduled-reminders.
--
-- Why this exists: on the Vercel Hobby plan, a vercel.json cron that runs more often than once a
-- day ("* * * * *") makes the deployment FAIL. Production then keeps serving the previous build,
-- which has no /api/cron/scheduled-reminders route, so the endpoint returns 404.
-- vercel.json now keeps a Hobby-compatible daily safety-net run, and Supabase pg_cron + pg_net
-- call the same protected endpoint every minute.
--
-- BEFORE running this file, store both values in Supabase Vault ONCE from the SQL Editor
-- (never commit the real secret to git):
--   select vault.create_secret('https://YOUR-PRODUCTION-DOMAIN', 'aurelia_site_url');
--   select vault.create_secret('SAME_VALUE_AS_VERCEL_CRON_SECRET', 'aurelia_cron_secret');
-- To rotate later: select vault.update_secret(id, 'new-value') using the id from vault.secrets.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-runnable: drop an earlier copy of the job before scheduling it again.
select cron.unschedule(jobid) from cron.job where jobname = 'aurelia-scheduled-reminders';

select cron.schedule(
  'aurelia-scheduled-reminders',
  '* * * * *',
  $job$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'aurelia_site_url')
           || '/api/cron/scheduled-reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'aurelia_cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $job$
);

-- Run only after deploying the premium function and setting the SAME secret
-- as PREMIUM_CRON_SECRET in Edge Function secrets and premium_cron_secret in
-- Supabase Vault. Do not put a real secret in source control.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule('lekhpal-premium-reconcile', '* * * * *', $cron$
  select net.http_post(
    url := 'https://edzpqmcjsweddavklitb.supabase.co/functions/v1/premium',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-premium-cron-secret', (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'premium_cron_secret' limit 1
      )
    ),
    body := '{"action":"reconcile"}'::jsonb,
    timeout_milliseconds := 60000
  );
$cron$);

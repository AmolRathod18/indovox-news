-- First create these named secrets in Supabase Vault (never commit or paste
-- their values into this file):
--   indovox_project_url
--   indovox_service_role_key
--   indovox_news_import_secret
-- Then run this schedule once in the Supabase SQL editor.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'indovox-news-daily',
  '0 1 * * *',
  $$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'indovox_project_url'
      ) || '/functions/v1/fetch-news',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'indovox_service_role_key'
        ),
        'apikey', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'indovox_service_role_key'
        ),
        'x-news-import-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'indovox_news_import_secret'
        )
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Setup pg_cron to call the signal-bot Edge Function every 5 minutes
-- NOTE: This requires the pg_net extension to be enabled in Supabase
-- Example: CREATE EXTENSION IF NOT EXISTS "pg_net";

-- The trigger uses net.http_post to call the Edge Function.
-- Replace <YOUR_PROJECT_REF> with your actual Supabase project reference
-- Replace <YOUR_CRON_SECRET> or <YOUR_SERVICE_ROLE_KEY> for authorization

-- SELECT cron.schedule(
--     'signal-bot-cron',
--     '*/5 * * * *', -- Every 5 minutes
--     $$
--     SELECT net.http_post(
--         url:='https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/signal-bot',
--         headers:=jsonb_build_object(
--             'Content-Type', 'application/json',
--             'Authorization', 'Bearer <YOUR_CRON_SECRET_OR_SERVICE_ROLE_KEY>'
--         )
--     );
--     $$
-- );

-- Alternatively, you can run an external cron using cron-job.org or Vercel cron
-- that simply sends a POST request to that same URL every 5 minutes.

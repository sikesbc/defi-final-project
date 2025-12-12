-- Cron job to refresh data every 48 hours at 2 AM UTC
-- This should be run in your Supabase SQL Editor

-- First, ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the refresh job
-- Runs at 2 AM UTC every 2 days
SELECT cron.schedule(
    'refresh-crypto-attacks',
    '0 2 */2 * *',
    $$
    SELECT net.http_post(
        url:='YOUR_SUPABASE_FUNCTION_URL/refresh-data',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) as request_id;
    $$
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule a job:
-- SELECT cron.unschedule('refresh-crypto-attacks');


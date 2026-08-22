create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid)
from cron.job
where jobname = 'refresh-currency-rates-daily';

select cron.schedule(
  'refresh-currency-rates-daily',
  '17 3 * * *',
  $$
  select net.http_post(
    url := 'https://dzrpnyxyxhtvowgcvoco.supabase.co/functions/v1/currency-rates',
    headers := '{
      "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cnBueXh5eGh0dm93Z2N2b2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODYwMTgsImV4cCI6MjA5OTM2MjAxOH0.QT4FQTN-0EpVL2QHxTYoLQg1O675oonxplBy1qZhtDQ",
      "apikey": "sb_publishable_mXKnp8ydVIkutr02dVUFxw_TvcVhFU4"
    }'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
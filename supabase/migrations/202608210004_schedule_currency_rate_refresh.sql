create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists http with schema extensions;

create or replace function public.refresh_currency_rates_from_provider()
returns table(rate_date date, inserted integer)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  provider_response extensions.http_response;
  payload jsonb;
  rates jsonb;
  resolved_rate_date date;
begin
  provider_response := extensions.http_get('https://open.er-api.com/v6/latest/EUR');

  if provider_response.status <> 200 then
    raise exception 'Currency provider returned status %', provider_response.status;
  end if;

  payload := provider_response.content::jsonb;
  if payload ->> 'result' is distinct from 'success' then
    raise exception 'Currency provider did not return a successful response';
  end if;

  rates := payload -> 'rates';
  resolved_rate_date := coalesce((payload ->> 'time_last_update_utc')::timestamptz, now())::date;

  insert into public.currency_rates (base_currency, currency, rate, rate_date, provider, fetched_at)
  select
    'EUR',
    currency,
    case when currency = 'EUR' then 1 else (rates ->> currency)::numeric end,
    resolved_rate_date,
    coalesce(payload ->> 'provider', 'open.er-api.com'),
    now()
  from unnest(array[
    'EUR', 'USD', 'CAD', 'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN',
    'GBP', 'CHF', 'DKK', 'SEK', 'NOK', 'PLN', 'CZK', 'HUF', 'RON',
    'BGN', 'TRY', 'ISK', 'JPY', 'CNY', 'HKD', 'SGD', 'INR', 'KRW',
    'THB', 'IDR', 'MYR', 'PHP', 'VND', 'AED', 'SAR', 'ILS'
  ]) as currency
  where currency = 'EUR'
    or ((rates ->> currency)::numeric is not null and (rates ->> currency)::numeric > 0)
  on conflict on constraint currency_rates_pkey do update
  set
    rate = excluded.rate,
    provider = excluded.provider,
    fetched_at = excluded.fetched_at;

  get diagnostics inserted = row_count;
  rate_date := resolved_rate_date;
  return next;
end;
$$;

revoke execute on function public.refresh_currency_rates_from_provider() from public;
revoke execute on function public.refresh_currency_rates_from_provider() from anon;
revoke execute on function public.refresh_currency_rates_from_provider() from authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'refresh-currency-rates-daily';

select cron.schedule(
  'refresh-currency-rates-daily',
  '17 3 * * *',
  $$
  select public.refresh_currency_rates_from_provider();
  $$
);
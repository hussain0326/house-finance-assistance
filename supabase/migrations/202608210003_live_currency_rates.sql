create table if not exists public.currency_rates (
  base_currency text not null,
  currency text not null,
  rate numeric not null check (rate > 0),
  rate_date date not null,
  provider text not null,
  fetched_at timestamptz not null default now(),
  primary key (base_currency, currency, rate_date)
);

alter table public.currency_rates enable row level security;

drop policy if exists "Authenticated users can read currency rates" on public.currency_rates;
create policy "Authenticated users can read currency rates"
  on public.currency_rates
  for select
  to authenticated
  using (true);

create index if not exists currency_rates_latest_idx
  on public.currency_rates (base_currency, currency, rate_date desc);

create or replace function public.normalize_currency_code(p_currency text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select case upper(trim(coalesce(p_currency, '')))
    when '€' then 'EUR'
    when 'EURO' then 'EUR'
    when 'EUROS' then 'EUR'
    when '$' then 'USD'
    when 'DOLLAR' then 'USD'
    when 'DOLLARS' then 'USD'
    when '£' then 'GBP'
    when 'POUND' then 'GBP'
    when 'POUNDS' then 'GBP'
    when 'KR' then 'DKK'
    when 'KR.' then 'DKK'
    when 'DKR' then 'DKK'
    when 'KRONER' then 'DKK'
    when 'DANISH KRONE' then 'DKK'
    when 'DANISH KRONER' then 'DKK'
    when 'SWEDISH KRONA' then 'SEK'
    when 'SWEDISH KRONOR' then 'SEK'
    when 'NORWEGIAN KRONE' then 'NOK'
    when 'NORWEGIAN KRONER' then 'NOK'
    else nullif(upper(trim(coalesce(p_currency, ''))), '')
  end;
$$;

create or replace function public.currency_rate_to_eur(p_currency text)
returns numeric
language sql
stable
set search_path to 'public'
as $$
  with normalized as (
    select public.normalize_currency_code(p_currency) as currency
  )
  select case
    when (select currency from normalized) = 'EUR' then 1
    else (
      select 1 / cr.rate
      from public.currency_rates cr
      where cr.base_currency = 'EUR'
        and cr.currency = (select currency from normalized)
      order by cr.rate_date desc, cr.fetched_at desc
      limit 1
    )
  end;
$$;

create or replace function public.convert_currency_amount(p_amount numeric, p_source_currency text, p_target_currency text)
returns numeric
language sql
stable
set search_path to 'public'
as $$
  select case
    when p_amount is null then null
    when public.currency_rate_to_eur(p_source_currency) is null then null
    when public.currency_rate_to_eur(p_target_currency) is null then null
    else round(p_amount * public.currency_rate_to_eur(p_source_currency) / public.currency_rate_to_eur(p_target_currency), 2)
  end;
$$;

create or replace function public.resolve_target_currency(p_target_currency text default null)
returns text
language sql
stable
set search_path to 'public'
as $$
  select coalesce(
    case when public.currency_rate_to_eur(p_target_currency) is not null then public.normalize_currency_code(p_target_currency) end,
    case when public.currency_rate_to_eur(auth.jwt() -> 'user_metadata' ->> 'default_currency') is not null
      then public.normalize_currency_code(auth.jwt() -> 'user_metadata' ->> 'default_currency')
    end,
    'EUR'
  );
$$;

grant select on public.currency_rates to authenticated;
revoke execute on function public.normalize_currency_code(text) from public;
revoke execute on function public.currency_rate_to_eur(text) from public;
revoke execute on function public.resolve_target_currency(text) from public;
revoke execute on function public.convert_currency_amount(numeric, text, text) from public;
revoke execute on function public.get_dashboard_summary(text) from public;
revoke execute on function public.get_dashboard_trend(integer, text) from public;
revoke execute on function public.get_spending_analytics(integer, text) from public;
revoke execute on function public.get_filtered_analytics(text, uuid, date, date, text) from public;
revoke execute on function public.get_receipt_history(integer, integer, text, text, date, date, uuid, text) from public;
revoke execute on function public.normalize_currency_code(text) from anon;
revoke execute on function public.currency_rate_to_eur(text) from anon;
revoke execute on function public.resolve_target_currency(text) from anon;
revoke execute on function public.convert_currency_amount(numeric, text, text) from anon;
revoke execute on function public.get_dashboard_summary(text) from anon;
revoke execute on function public.get_dashboard_trend(integer, text) from anon;
revoke execute on function public.get_spending_analytics(integer, text) from anon;
revoke execute on function public.get_filtered_analytics(text, uuid, date, date, text) from anon;
revoke execute on function public.get_receipt_history(integer, integer, text, text, date, date, uuid, text) from anon;
grant execute on function public.normalize_currency_code(text) to authenticated;
grant execute on function public.currency_rate_to_eur(text) to authenticated;
grant execute on function public.resolve_target_currency(text) to authenticated;
grant execute on function public.convert_currency_amount(numeric, text, text) to authenticated;
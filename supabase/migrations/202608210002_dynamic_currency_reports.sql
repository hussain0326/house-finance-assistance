create or replace function public.normalize_currency_code(p_currency text)
returns text
language sql
immutable
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
immutable
as $$
  select case public.normalize_currency_code(p_currency)
    when 'EUR' then 1
    when 'USD' then 0.92
    when 'CAD' then 0.67
    when 'MXN' then 0.05
    when 'BRL' then 0.16
    when 'ARS' then 0.00082
    when 'CLP' then 0.00097
    when 'COP' then 0.00022
    when 'PEN' then 0.25
    when 'GBP' then 1.17
    when 'CHF' then 1.07
    when 'DKK' then 0.134
    when 'SEK' then 0.089
    when 'NOK' then 0.086
    when 'PLN' then 0.23
    when 'CZK' then 0.04
    when 'HUF' then 0.0025
    when 'RON' then 0.2
    when 'BGN' then 0.51
    when 'TRY' then 0.027
    when 'ISK' then 0.0065
    when 'JPY' then 0.0059
    when 'CNY' then 0.13
    when 'HKD' then 0.12
    when 'SGD' then 0.71
    when 'INR' then 0.01
    when 'KRW' then 0.00063
    when 'THB' then 0.026
    when 'IDR' then 0.000052
    when 'MYR' then 0.2
    when 'PHP' then 0.016
    when 'VND' then 0.000035
    when 'AED' then 0.25
    when 'SAR' then 0.25
    when 'ILS' then 0.27
    when 'AUD' then 0.6
    else null
  end;
$$;

create or replace function public.resolve_target_currency(p_target_currency text default null)
returns text
language sql
stable
as $$
  select coalesce(
    case when public.currency_rate_to_eur(p_target_currency) is not null then public.normalize_currency_code(p_target_currency) end,
    case when public.currency_rate_to_eur(auth.jwt() -> 'user_metadata' ->> 'default_currency') is not null
      then public.normalize_currency_code(auth.jwt() -> 'user_metadata' ->> 'default_currency')
    end,
    'EUR'
  );
$$;

create or replace function public.convert_currency_amount(p_amount numeric, p_source_currency text, p_target_currency text)
returns numeric
language sql
immutable
as $$
  select case
    when p_amount is null then null
    when public.currency_rate_to_eur(p_source_currency) is null then round(p_amount, 2)
    when public.currency_rate_to_eur(p_target_currency) is null then round(p_amount, 2)
    else round(p_amount * public.currency_rate_to_eur(p_source_currency) / public.currency_rate_to_eur(p_target_currency), 2)
  end;
$$;

drop function if exists public.get_dashboard_summary();
create or replace function public.get_dashboard_summary(p_target_currency text default null)
returns table(monthly_spend numeric, annual_spend numeric, average_daily_spend numeric)
language sql
set search_path to 'public'
as $$
  with settings as (
    select public.resolve_target_currency(p_target_currency) as target_currency
  ),
  current_user_receipts as (
    select
      r.*,
      public.convert_currency_amount(
        coalesce(r.original_total_amount, r.total_amount),
        coalesce(r.original_currency, r.currency, (select target_currency from settings)),
        (select target_currency from settings)
      ) as converted_total_amount
    from public.receipts r
    where r.user_id = auth.uid()
  ),
  month_total as (
    select coalesce(sum(coalesce(converted_total_amount, 0)), 0) as value
    from current_user_receipts
    where date_trunc('month', coalesce(receipt_date, created_at::date)) = date_trunc('month', now())
  ),
  year_total as (
    select coalesce(sum(coalesce(converted_total_amount, 0)), 0) as value
    from current_user_receipts
    where date_trunc('year', coalesce(receipt_date, created_at::date)) = date_trunc('year', now())
  ),
  avg_daily as (
    select coalesce(avg(day_total), 0) as value
    from (
      select coalesce(receipt_date, created_at::date) as day_key, sum(coalesce(converted_total_amount, 0)) as day_total
      from current_user_receipts
      where date_trunc('month', coalesce(receipt_date, created_at::date)) = date_trunc('month', now())
      group by day_key
    ) t
  )
  select
    month_total.value as monthly_spend,
    year_total.value as annual_spend,
    avg_daily.value as average_daily_spend
  from month_total, year_total, avg_daily;
$$;

drop function if exists public.get_dashboard_trend(integer);
create or replace function public.get_dashboard_trend(months_back integer default 6, p_target_currency text default null)
returns table(month_label text, month_date date, total_amount numeric)
language sql
set search_path to 'public'
as $$
  with settings as (
    select public.resolve_target_currency(p_target_currency) as target_currency
  ),
  month_series as (
    select generate_series(
      date_trunc('month', now())::date - ((greatest(months_back, 1) - 1) * interval '1 month'),
      date_trunc('month', now())::date,
      interval '1 month'
    )::date as month_date
  ),
  totals as (
    select
      date_trunc('month', coalesce(r.receipt_date, r.created_at::date))::date as month_date,
      sum(coalesce(public.convert_currency_amount(
        coalesce(r.original_total_amount, r.total_amount),
        coalesce(r.original_currency, r.currency, (select target_currency from settings)),
        (select target_currency from settings)
      ), 0)) as amount
    from public.receipts r
    where r.user_id = auth.uid()
    group by 1
  )
  select
    to_char(ms.month_date, 'Mon') as month_label,
    ms.month_date,
    coalesce(t.amount, 0) as total_amount
  from month_series ms
  left join totals t on t.month_date = ms.month_date
  order by ms.month_date;
$$;

drop function if exists public.get_spending_analytics(integer);
create or replace function public.get_spending_analytics(months_back integer default 7, p_target_currency text default null)
returns jsonb
language sql
security definer
set search_path to 'public'
as $$
  with settings as (
    select public.resolve_target_currency(p_target_currency) as target_currency
  ),
  current_user_receipts as (
    select
      r.*,
      public.convert_currency_amount(
        coalesce(r.original_total_amount, r.total_amount),
        coalesce(r.original_currency, r.currency, (select target_currency from settings)),
        (select target_currency from settings)
      ) as converted_total_amount
    from public.receipts r
    where r.user_id = auth.uid()
  ),
  category_totals as (
    select
      coalesce(c.name, 'Uncategorized') as category_name,
      coalesce(c.color, '#94a3b8') as color,
      sum(coalesce(r.converted_total_amount, 0)) as total_amount
    from current_user_receipts r
    left join public.categories c on c.id = r.category_id
    where coalesce(r.receipt_date, r.created_at::date) >=
      date_trunc('month', now())::date - ((greatest(months_back, 1) - 1) * interval '1 month')
    group by 1, 2
    having sum(coalesce(r.converted_total_amount, 0)) > 0
  ),
  month_series as (
    select generate_series(
      date_trunc('month', now())::date - ((greatest(months_back, 1) - 1) * interval '1 month'),
      date_trunc('month', now())::date,
      interval '1 month'
    )::date as month_date
  ),
  monthly_totals as (
    select
      date_trunc('month', coalesce(r.receipt_date, r.created_at::date))::date as month_date,
      sum(coalesce(r.converted_total_amount, 0)) as amount
    from current_user_receipts r
    group by 1
  )
  select jsonb_build_object(
    'category_breakdown', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category_name', category_name,
        'total_amount', total_amount,
        'color', color
      ))
      from category_totals
    ), '[]'::jsonb),
    'monthly_comparison', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month_label', to_char(ms.month_date, 'Mon'),
        'month_date', ms.month_date,
        'total_amount', coalesce(mt.amount, 0)
      ) order by ms.month_date)
      from month_series ms
      left join monthly_totals mt on mt.month_date = ms.month_date
    ), '[]'::jsonb)
  );
$$;

drop function if exists public.get_filtered_analytics(text, uuid, date, date);
create or replace function public.get_filtered_analytics(
  p_merchant text default null,
  p_category_id uuid default null,
  p_start_date date default null,
  p_end_date date default null,
  p_target_currency text default null
)
returns jsonb
language sql
security definer
set search_path to 'public'
as $$
  with settings as (
    select public.resolve_target_currency(p_target_currency) as target_currency
  ),
  filtered as (
    select
      r.*,
      public.convert_currency_amount(
        coalesce(r.original_total_amount, r.total_amount),
        coalesce(r.original_currency, r.currency, (select target_currency from settings)),
        (select target_currency from settings)
      ) as converted_total_amount
    from public.receipts r
    where r.user_id = auth.uid()
      and (p_merchant is null or r.merchant_name ilike '%' || p_merchant || '%')
      and (p_category_id is null or r.category_id = p_category_id)
      and (p_start_date is null or coalesce(r.receipt_date, r.created_at::date) >= p_start_date)
      and (p_end_date is null or coalesce(r.receipt_date, r.created_at::date) <= p_end_date)
  ),
  monthly as (
    select
      date_trunc('month', coalesce(receipt_date, created_at::date))::date as month_date,
      sum(coalesce(converted_total_amount, 0)) as total_amount
    from filtered
    group by 1
  )
  select jsonb_build_object(
    'total_amount', coalesce((select sum(coalesce(converted_total_amount, 0)) from filtered), 0),
    'receipt_count', coalesce((select count(*) from filtered), 0),
    'monthly_breakdown', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month_label', to_char(month_date, 'Mon YYYY'),
        'month_date', month_date,
        'total_amount', total_amount
      ) order by month_date)
      from monthly
    ), '[]'::jsonb)
  );
$$;

drop function if exists public.get_receipt_history(integer, integer, text, text, date, date, uuid);
create or replace function public.get_receipt_history(
  p_page integer,
  p_page_size integer,
  p_search text default null,
  p_status text default null,
  p_start_date date default null,
  p_end_date date default null,
  p_category_id uuid default null,
  p_target_currency text default null
)
returns table(
  id uuid,
  image_url text,
  merchant_name text,
  receipt_date date,
  total_amount numeric,
  currency text,
  processing_status text,
  created_at timestamp with time zone,
  category_id uuid,
  category_name text,
  category_color text,
  total_count bigint
)
language sql
security definer
set search_path to 'public'
as $$
  with settings as (
    select public.resolve_target_currency(p_target_currency) as target_currency
  ),
  filtered as (
    select
      r.*,
      public.convert_currency_amount(
        coalesce(r.original_total_amount, r.total_amount),
        coalesce(r.original_currency, r.currency, (select target_currency from settings)),
        (select target_currency from settings)
      ) as converted_total_amount,
      (select target_currency from settings) as converted_currency
    from public.receipts r
    where r.user_id = auth.uid()
      and (p_search is null or coalesce(r.merchant_name, '') ilike '%' || p_search || '%')
      and (p_status is null or r.processing_status = p_status)
      and (p_start_date is null or coalesce(r.receipt_date, r.created_at::date) >= p_start_date)
      and (p_end_date is null or coalesce(r.receipt_date, r.created_at::date) <= p_end_date)
      and (p_category_id is null or r.category_id = p_category_id)
  ),
  counted as (
    select f.*, count(*) over() as total_count
    from filtered f
  )
  select
    c.id,
    c.image_url,
    c.merchant_name,
    c.receipt_date,
    c.converted_total_amount as total_amount,
    c.converted_currency as currency,
    c.processing_status,
    c.created_at,
    c.category_id,
    cat.name as category_name,
    cat.color as category_color,
    c.total_count
  from counted c
  left join public.categories cat on cat.id = c.category_id
  order by c.created_at desc
  offset greatest(p_page - 1, 0) * greatest(p_page_size, 1)
  limit greatest(p_page_size, 1);
$$;

grant execute on function public.normalize_currency_code(text) to authenticated;
grant execute on function public.currency_rate_to_eur(text) to authenticated;
grant execute on function public.resolve_target_currency(text) to authenticated;
grant execute on function public.convert_currency_amount(numeric, text, text) to authenticated;
grant execute on function public.get_dashboard_summary(text) to authenticated;
grant execute on function public.get_dashboard_trend(integer, text) to authenticated;
grant execute on function public.get_spending_analytics(integer, text) to authenticated;
grant execute on function public.get_filtered_analytics(text, uuid, date, date, text) to authenticated;
grant execute on function public.get_receipt_history(integer, integer, text, text, date, date, uuid, text) to authenticated;
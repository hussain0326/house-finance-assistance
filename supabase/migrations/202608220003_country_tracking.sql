alter table if exists public.receipts
  add column if not exists country_code text,
  add column if not exists country_name text;

update public.receipts
set country_code = 'DK', country_name = 'Denmark'
where country_code is null
  and (
    coalesce(merchant_name, '') ilike '%københavn%'
    or coalesce(merchant_name, '') ilike '%kobenhavn%'
    or coalesce(original_currency, currency, '') = 'DKK'
  );

update public.receipts
set country_code = 'DE', country_name = 'Germany'
where country_code is null
  and (
    coalesce(merchant_name, '') ilike '%gmbh%'
    or coalesce(merchant_name, '') ilike '%hugendubel%'
  );

create index if not exists receipts_country_code_idx on public.receipts (country_code);

drop function if exists public.get_filtered_analytics(text, uuid, date, date, text);
drop function if exists public.get_filtered_analytics(text, uuid, date, date, text, text);
create or replace function public.get_filtered_analytics(
  p_merchant text default null,
  p_category_id uuid default null,
  p_start_date date default null,
  p_end_date date default null,
  p_country_code text default null,
  p_target_currency text default null
)
returns jsonb
language sql
security invoker
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
      and (p_country_code is null or r.country_code = upper(p_country_code))
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

drop function if exists public.get_receipt_history(integer, integer, text, text, date, date, uuid, text);
drop function if exists public.get_receipt_history(integer, integer, text, text, date, date, uuid, text, text);
create or replace function public.get_receipt_history(
  p_page integer,
  p_page_size integer,
  p_search text default null,
  p_status text default null,
  p_start_date date default null,
  p_end_date date default null,
  p_category_id uuid default null,
  p_country_code text default null,
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
  country_code text,
  country_name text,
  total_count bigint
)
language sql
security invoker
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
      and (p_country_code is null or r.country_code = upper(p_country_code))
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
    c.country_code,
    c.country_name,
    c.total_count
  from counted c
  left join public.categories cat on cat.id = c.category_id
  order by c.created_at desc
  offset greatest(p_page - 1, 0) * greatest(p_page_size, 1)
  limit greatest(p_page_size, 1);
$$;

create or replace function public.get_spending_analytics(months_back integer default 7, p_target_currency text default null)
returns jsonb
language sql
security invoker
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
    group by 1, 2
    having sum(coalesce(r.converted_total_amount, 0)) > 0
  ),
  country_totals as (
    select
      coalesce(r.country_code, 'UN') as country_code,
      coalesce(r.country_name, 'Unknown') as country_name,
      sum(coalesce(r.converted_total_amount, 0)) as total_amount
    from current_user_receipts r
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
    where coalesce(r.receipt_date, r.created_at::date) >=
      date_trunc('month', now())::date - ((greatest(months_back, 1) - 1) * interval '1 month')
    group by 1
  )
  select jsonb_build_object(
    'category_breakdown', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category_name', category_name,
        'total_amount', total_amount,
        'color', color
      ) order by total_amount desc)
      from category_totals
    ), '[]'::jsonb),
    'country_breakdown', coalesce((
      select jsonb_agg(jsonb_build_object(
        'country_code', country_code,
        'country_name', country_name,
        'total_amount', total_amount
      ) order by total_amount desc)
      from country_totals
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

revoke execute on function public.get_filtered_analytics(text, uuid, date, date, text, text) from public;
revoke execute on function public.get_receipt_history(integer, integer, text, text, date, date, uuid, text, text) from public;
revoke execute on function public.get_spending_analytics(integer, text) from public;
grant execute on function public.get_filtered_analytics(text, uuid, date, date, text, text) to authenticated;
grant execute on function public.get_receipt_history(integer, integer, text, text, date, date, uuid, text, text) to authenticated;
grant execute on function public.get_spending_analytics(integer, text) to authenticated;
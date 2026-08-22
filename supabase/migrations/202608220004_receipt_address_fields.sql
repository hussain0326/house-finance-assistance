alter table if exists public.receipts
  add column if not exists merchant_address text,
  add column if not exists merchant_city text,
  add column if not exists merchant_postal_code text;

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
  merchant_address text,
  merchant_city text,
  merchant_postal_code text,
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
    c.merchant_address,
    c.merchant_city,
    c.merchant_postal_code,
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

revoke execute on function public.get_receipt_history(integer, integer, text, text, date, date, uuid, text, text) from public;
grant execute on function public.get_receipt_history(integer, integer, text, text, date, date, uuid, text, text) to authenticated;
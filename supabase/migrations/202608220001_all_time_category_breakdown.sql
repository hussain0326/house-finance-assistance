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

revoke execute on function public.get_spending_analytics(integer, text) from public;
revoke execute on function public.get_spending_analytics(integer, text) from anon;
grant execute on function public.get_spending_analytics(integer, text) to authenticated;
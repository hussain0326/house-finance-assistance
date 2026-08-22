alter table if exists public.receipts
  add column if not exists original_total_amount numeric,
  add column if not exists original_currency text,
  add column if not exists exchange_rate numeric;

update public.receipts
set
  original_total_amount = total_amount,
  original_currency = currency,
  exchange_rate = 0.134,
  total_amount = round(total_amount * 0.134, 2),
  currency = 'EUR'
where currency = 'DKK'
  and total_amount is not null
  and original_total_amount is null;
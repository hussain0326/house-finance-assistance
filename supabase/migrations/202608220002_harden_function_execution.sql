alter function public.get_filtered_analytics(text, uuid, date, date, text) security invoker;
alter function public.get_receipt_history(integer, integer, text, text, date, date, uuid, text) security invoker;
alter function public.get_spending_analytics(integer, text) security invoker;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

revoke execute on function public.refresh_currency_rates_from_provider() from public;
revoke execute on function public.refresh_currency_rates_from_provider() from anon;
revoke execute on function public.refresh_currency_rates_from_provider() from authenticated;
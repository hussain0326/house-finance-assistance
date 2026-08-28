-- Wipes uploaded receipts/conversations/storage for the shared recruiter demo account nightly,
-- so no visitor's data (or PII) persists for the next visitor.
create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.cleanup_demo_account()
returns void
language plpgsql
security definer
set search_path to 'public', 'storage', 'auth'
as $$
declare
  demo_user_id uuid;
begin
  select id into demo_user_id from auth.users where email = 'demo@homefinance.app';

  if demo_user_id is null then
    return;
  end if;

  delete from public.ai_messages
  where conversation_id in (select id from public.ai_conversations where user_id = demo_user_id);

  delete from public.ai_conversations where user_id = demo_user_id;
  delete from public.receipts where user_id = demo_user_id;
  delete from storage.objects
  where bucket_id = 'receipt-images'
    and name like demo_user_id::text || '/%';
end;
$$;

revoke execute on function public.cleanup_demo_account() from public;
revoke execute on function public.cleanup_demo_account() from anon;
revoke execute on function public.cleanup_demo_account() from authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'cleanup-demo-account-nightly';

select cron.schedule(
  'cleanup-demo-account-nightly',
  '0 3 * * *',
  $$
  select public.cleanup_demo_account();
  $$
);

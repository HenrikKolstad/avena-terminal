-- Fix: cron_logs was silently dropping inserts because only SELECT was allowed.
-- The anon supabase client used by cron routes couldn't write rows, so the
-- /swarm page kept showing 0 tasks completed.
--
-- Allow anon/public INSERT + UPDATE. Cron endpoints are protected at the
-- HTTP layer by Vercel cron secret, not at RLS. This table is write-open
-- by design — it's just a log.

begin;

drop policy if exists "public insert cron_logs" on cron_logs;
create policy "public insert cron_logs"
  on cron_logs for insert
  with check (true);

drop policy if exists "public update cron_logs" on cron_logs;
create policy "public update cron_logs"
  on cron_logs for update
  using (true) with check (true);

commit;

-- Curator cron uses `upsert(..., { onConflict: 'snapshot_date', ignoreDuplicates: false })`
-- which compiles to INSERT ... ON CONFLICT DO UPDATE. Postgres requires an UPDATE
-- policy (USING + WITH CHECK) on the table for the UPDATE branch to succeed under
-- RLS — having only INSERT WITH CHECK fails with:
--   "new row violates row-level security policy (USING expression) for table 'avena_history'"
--
-- This migration adds the missing UPDATE policy so the daily curator cron can
-- re-run idempotently and refresh a same-day snapshot.

begin;

drop policy if exists "public update avena_history" on avena_history;
create policy "public update avena_history"
  on avena_history for update using (true) with check (true);

commit;

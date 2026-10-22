-- 2026-10-22 — properties_registry writes go through the service role only;
-- new public tables no longer grant the client roles anything by default.
--
-- DEPLOY ORDER: apply AFTER the code in the same PR is live. The registry
-- writers (admin/seed-registry, admin/backfill-registry, cron/property-augment,
-- cron/dvf-ingest) used the anon client; the PR moves them to supabaseAdmin,
-- which bypasses RLS. Reads (/registry, /eu-coverage, data sheets, v1/registry)
-- keep the existing "public read properties_registry" SELECT policy.
--
-- FUTURE TABLES: after this, a table created by `postgres` in `public` grants
-- NOTHING to anon/authenticated. A migration that wants public reads must say
-- so explicitly:  grant select on public.<t> to anon, authenticated;  plus an
-- RLS select policy. Service-role writes are unaffected.
--
-- Non-destructive: no table, column or row is dropped or changed.

begin;

drop policy if exists "public insert properties_registry" on public.properties_registry;
drop policy if exists "public update properties_registry" on public.properties_registry;

revoke all on table public.properties_registry from anon, authenticated;
grant select on table public.properties_registry to anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

commit;

-- ── Verify (read-only) ──────────────────────────────────────────────────────
-- select policyname, cmd from pg_policies where schemaname='public' and tablename='properties_registry';  -- only the SELECT policy
-- select has_table_privilege('anon','public.properties_registry','insert');  -- false
-- select has_table_privilege('anon','public.properties_registry','update');  -- false
-- select has_table_privilege('anon','public.properties_registry','select');  -- true
-- select defaclacl from pg_default_acl where defaclrole='postgres'::regrole
--    and defaclnamespace='public'::regnamespace and defaclobjtype in ('r','S');  -- no anon/authenticated
--
-- ── Rollback (emergencies only) ─────────────────────────────────────────────
-- grant all on table public.properties_registry to anon, authenticated;
-- create policy "public insert properties_registry" on public.properties_registry for insert with check (true);
-- create policy "public update properties_registry" on public.properties_registry for update using (true);
-- alter default privileges for role postgres in schema public grant all on tables to anon, authenticated;
-- alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated;

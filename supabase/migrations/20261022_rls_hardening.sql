-- 2026-10-22 — Close the anon-key hole on 43 public tables.
--
-- WHAT WAS WRONG (Supabase security advisor, 2026-10-21):
--   * 43 tables in `public` had RLS DISABLED, and the `anon` and
--     `authenticated` roles held SELECT/INSERT/UPDATE/DELETE/TRUNCATE on every
--     one of them. The anon key ships in the site's JS bundle by design, so
--     anyone could read api_keys / inquiry tables and, worse, overwrite or
--     delete price_snapshots, the capture history that can't be rebuilt.
--   * View public.properties_coverage ran as SECURITY DEFINER.
--   * Three functions had a role-mutable search_path.
--
-- DEPLOY ORDER MATTERS. Apply this ONLY AFTER the code in the same PR is live
-- in production. Almost every server route used the ANON client
-- (src/lib/supabase.ts) against these tables. The PR moves them to the
-- service-role client (src/lib/supabase-admin.ts), which bypasses RLS. Applying
-- this migration first would make those routes fail.
--
-- POLICY STANCE: no anon/authenticated access at all, except public READ on the
-- two tables still read with the anon key:
--   price_snapshots  — src/lib/deltas.ts, src/lib/observations.ts,
--                      src/lib/eu-validation.ts, src/lib/moat-archive.ts,
--                      src/mcp/ledger-tools.ts, src/app/admin/page.tsx ('use client')
--   sold_properties  — src/lib/deltas.ts, src/app/admin/page.tsx ('use client')
-- Both are published openly as the CC-BY open dataset anyway. Writes go
-- through the service role only (parse-feed.js, CI scripts, cron routes).
--
-- Non-destructive: no table, column or row is dropped or changed. Rollback is
-- at the bottom of this file.

begin;

do $$
declare
  t text;
  all_tables text[] := array[
    'academic_users','agent_registry','alert_matches','anomaly_scans','api_keys',
    'api_usage_log','auto_training_pairs','blogs','competitive_events',
    'data_licensing_requests','deal_initiations','developers','digest_issues',
    'extension_queries','federated_partners','federated_submissions',
    'federation_nodes','forecast_history','gsc_queries','hf_pushes',
    'institutional_inquiries','intelligence_briefs','investment_theses',
    'kg_edges','kg_edges_temporal','kg_nodes','market_events','market_snapshots',
    'oracle_api_queries','partner_applications','price_history','price_snapshots',
    'property_episodes','pulse_editions','quarterly_reports',
    'research_papers_auto','science_notes','sdk_waitlist','sold_properties',
    'vision_scores','voice_queries','weekly_alpha','whitelabel_partners'
  ];
  public_read text[] := array['price_snapshots','sold_properties'];
begin
  foreach t in array all_tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'skip %: table does not exist', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    -- Strip every client-role privilege. The service role keeps full access
    -- (it bypasses RLS and is not touched here).
    execute format('revoke all on table public.%I from anon, authenticated', t);

    if t = any(public_read) then
      execute format('grant select on table public.%I to anon, authenticated', t);
      execute format('drop policy if exists %I on public.%I', 'public read ' || t, t);
      execute format(
        'create policy %I on public.%I for select to anon, authenticated using (true)',
        'public read ' || t, t);
    end if;
  end loop;
end
$$;

-- SECURITY DEFINER view -> invoker. It reads properties_registry, which already
-- has a "public read" SELECT policy, so /registry and /eu-takeover keep working
-- with the anon key. The view is read-only, so client roles keep SELECT only.
alter view public.properties_coverage set (security_invoker = true);
revoke all on public.properties_coverage from anon, authenticated;
grant select on public.properties_coverage to anon, authenticated;

-- Pin search_path (lint 0011). Bodies reference unqualified public tables.
alter function public.update_updated_at() set search_path = public, pg_temp;
alter function public.increment_agent_queries(text) set search_path = public, pg_temp;
alter function public.crawler_last_paths(text) set search_path = public, pg_temp;

commit;

-- ── Verify (read-only) ──────────────────────────────────────────────────────
-- select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;   -- expect 0 rows
-- select has_table_privilege('anon', 'public.api_keys', 'select');           -- expect false
-- select has_table_privilege('anon', 'public.price_snapshots', 'delete');    -- expect false
-- select has_table_privilege('anon', 'public.price_snapshots', 'select');    -- expect true
--
-- ── Rollback (restores the previous, insecure state — emergencies only) ─────
-- Run the same loop with:
--   alter table public.<t> disable row level security;
--   grant all on table public.<t> to anon, authenticated;
--   drop policy if exists "public read <t>" on public.<t>;
-- and: alter view public.properties_coverage set (security_invoker = false);

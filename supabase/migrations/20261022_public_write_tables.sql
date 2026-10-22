-- 2026-10-22 — Close public WRITE access on the 60 tables that still had
-- INSERT/UPDATE policies (or ALL using true) for the anon/authenticated roles.
--
-- DEPLOY ORDER: apply AFTER the code in the same PR is live. Every server
-- writer of these tables now uses the service-role client (supabaseAdmin),
-- which bypasses RLS, so dropping the client-role write policies breaks
-- nothing server-side. CI scripts already use the service role.
--
-- KEPT:
--   * per-user policies that check auth.uid() (alerts, favorites, notes,
--     leads "view own", subscriptions "view own").
--   * public SELECT policies on public market/derived data (score_history,
--     property_*, eu_*, counterpart_*, avena_history, ...).
-- REMOVED READS (not public data; all readers are server-side now):
--   subscriptions, cron_logs, mcp_calls, memo_generations, agent_missions.
--   subscriptions gets a narrow replacement: a signed-in user may read only
--   the row whose email matches their own verified JWT email (AuthContext).
--
-- Rollback statements are in supabase/rollback_20261022_public_write_tables.sql
-- (generated from pg_policies before this ran). Not applied automatically.

begin;

do $$
declare
  t text;
  p record;
  all_tables text[] := array[
    'academic_access_grants', 'aeo_question_queue', 'agent_missions', 'alerts', 'alpha_signals',
    'auto_posts', 'avena_history', 'avm_queries', 'avn_id_registry', 'causal_indicators',
    'citation_injections', 'co_founder_inquiries', 'command_health', 'counterpart_developers', 'counterpart_health_history',
    'counterpart_network_edges', 'counterpart_projects', 'counterpart_stress_alerts', 'cron_logs', 'data_contributions',
    'deal_alerts', 'developer_stress_history', 'eu_anomalies', 'eu_official_stats', 'eu_stats_ingest_runs',
    'eu_validation_snapshots', 'favorites', 'feed_sync_log', 'findings', 'generated_answers',
    'genesis_outputs', 'genesis_prebuilt_scenarios', 'genesis_scenarios', 'leads', 'macro_indicators',
    'mcp_calls', 'memo_generations', 'mission_events', 'moat_archive_runs', 'notes',
    'outreach_emails', 'policy_inquiries', 'policy_scenarios', 'precursor_categories', 'precursor_signals',
    'precursor_tracking', 'prometheus_runs', 'property_climate', 'property_geo', 'property_market',
    'property_pricing_history', 'property_regulatory', 'property_transactions', 'property_valuation', 'property_valuation_history',
    'regime_history', 'score_history', 'subscriptions', 'webhook_deliveries', 'webhook_subscriptions'
  ];
  sensitive text[] := array[
    'subscriptions', 'cron_logs', 'mcp_calls', 'memo_generations', 'agent_missions'
  ];
  has_user_policy boolean;
begin
  foreach t in array all_tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'skip %: table does not exist', t;
      continue;
    end if;

    -- 1. Drop client-role write policies, except per-user auth.uid() ones.
    for p in
      select policyname from pg_policies
       where schemaname = 'public' and tablename = t
         and cmd in ('INSERT','UPDATE','DELETE','ALL')
         and roles && array['public','anon','authenticated']::name[]
         and coalesce(qual,'') not like '%auth.uid()%'
         and coalesce(with_check,'') not like '%auth.uid()%'
    loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;

    -- 2. Sensitive tables: drop every non-per-user SELECT policy too.
    if t = any(sensitive) then
      for p in
        select policyname from pg_policies
         where schemaname = 'public' and tablename = t and cmd = 'SELECT'
           and coalesce(qual,'') not like '%auth.uid()%'
      loop
        execute format('drop policy %I on public.%I', p.policyname, t);
      end loop;
      execute format('revoke select on table public.%I from anon', t);
    end if;

    -- 3. Grants: the anon role never writes. authenticated keeps write grants
    --    only where an auth.uid() write policy remains (per-user rows).
    execute format('revoke insert, update, delete, truncate on table public.%I from anon', t);
    select exists (
      select 1 from pg_policies
       where schemaname = 'public' and tablename = t
         and cmd in ('INSERT','UPDATE','DELETE','ALL')
         and (coalesce(qual,'') like '%auth.uid()%' or coalesce(with_check,'') like '%auth.uid()%')
    ) into has_user_policy;
    if has_user_policy then
      execute format('revoke truncate on table public.%I from authenticated', t);
    else
      execute format('revoke insert, update, delete, truncate on table public.%I from authenticated', t);
    end if;
  end loop;
end
$$;

-- subscriptions: a signed-in user reads only their own row, matched on the
-- verified JWT email (AuthContext.checkSubscription queries by email).
drop policy if exists "authenticated read own subscription by jwt email" on public.subscriptions;
create policy "authenticated read own subscription by jwt email" on public.subscriptions
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

commit;

-- ── Verify (read-only) ──────────────────────────────────────────────────────
-- select tablename, policyname, cmd from pg_policies where schemaname='public'
--   and cmd in ('INSERT','UPDATE','DELETE','ALL')
--   and roles && array['public','anon','authenticated']::name[]
--   and coalesce(qual,'')||coalesce(with_check,'') not like '%auth.uid()%';   -- expect 0 rows
-- select has_table_privilege('anon','public.subscriptions','select');         -- false
-- select has_table_privilege('anon','public.score_history','insert');         -- false
-- select has_table_privilege('anon','public.score_history','select');         -- true

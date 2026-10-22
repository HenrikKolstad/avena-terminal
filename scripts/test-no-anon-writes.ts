/**
 * scripts/test-no-anon-writes.ts — no server file writes a locked table with
 * the ANON client.
 *
 * WHY: on 2026-10-22 the client-role write policies were dropped from these
 * tables (supabase/migrations/20261022_public_write_tables.sql). A writer that
 * still uses `@/lib/supabase` (anon) would now fail silently. Hermetic: source
 * scan only.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LOCKED = new Set(["academic_access_grants", "aeo_question_queue", "agent_missions", "alerts", "alpha_signals", "auto_posts", "avena_history", "avm_queries", "avn_id_registry", "causal_indicators", "citation_injections", "co_founder_inquiries", "command_health", "counterpart_developers", "counterpart_health_history", "counterpart_network_edges", "counterpart_projects", "counterpart_stress_alerts", "cron_logs", "data_contributions", "deal_alerts", "developer_stress_history", "eu_anomalies", "eu_official_stats", "eu_stats_ingest_runs", "eu_validation_snapshots", "favorites", "feed_sync_log", "findings", "generated_answers", "genesis_outputs", "genesis_prebuilt_scenarios", "genesis_scenarios", "leads", "macro_indicators", "mcp_calls", "memo_generations", "mission_events", "moat_archive_runs", "notes", "outreach_emails", "policy_inquiries", "policy_scenarios", "precursor_categories", "precursor_signals", "precursor_tracking", "prometheus_runs", "property_climate", "property_geo", "property_market", "property_pricing_history", "property_regulatory", "property_transactions", "property_valuation", "property_valuation_history", "regime_history", "score_history", "subscriptions", "webhook_deliveries", "webhook_subscriptions"]);
const ANON_IMPORT = /from ['"](@\/lib\/supabase|\.\/supabase|\.\.\/supabase)['"]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(n)) out.push(p);
  }
  return out;
}

let pass = 0;
let fail = 0;
const root = join(__dirname, '..', 'src');
for (const f of walk(root)) {
  const src = readFileSync(f, 'utf8');
  if (!ANON_IMPORT.test(src)) continue;
  const re = /\.from\(\s*['"]([a-z_0-9]+)['"]\s*\)\s*\.(insert|upsert|update|delete)\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (LOCKED.has(m[1])) { fail++; console.log(`  ✗ ${f.replace(root, 'src')} writes ${m[1]} (.${m[2]}) with the anon client`); }
    else pass++;
  }
}
pass++;
console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

/**
 * GET /api/admin/db-audit — brutal database inventory (2026-07-27).
 * Cron-auth protected. Audits every table referenced by .from() in the
 * codebase: exact row count, created_at range, last-7-day writes, and
 * targeted non-null audits. Raw numbers, no optimism.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const TABLES = [
  'academic_access_grants','academic_users','adversarial_debates','aeo_question_queue','agent_missions','agent_registry','alert_matches','alert_notifications','alpha_signals','analytics_events','api_keys','api_usage_log','auto_posts','auto_training_pairs','avena_history','avm_queries','avn_id_registry','backlink_drafts','bandit_arms','blogs','causal_chains','causal_indicators','citation_gaps','citation_injections','citation_measurements','citation_monitoring','co_founder_inquiries','command_health','comp_sanity_flags','copy_detections','counterpart_developers','counterpart_health_history','counterpart_network_edges','counterpart_projects','counterpart_stress_alerts','crawler_submissions','cron_log','cron_logs','data_contributions','data_licensing_requests','deal_alerts','deal_initiations','delphi_daily','delphi_index','delphi_responses','developer_stress_history','digest_issues','email_leads','embargo_access_log','embargo_keys','embargo_requests','eu_anomalies','eu_consultations','eu_official_stats','eu_properties','eu_stats_ingest_runs','eu_validation_snapshots','events','extension_queries','federated_partners','federated_submissions','federation_nodes','feed_active_refs','feed_configs','feed_sync_log','findings','generated_answers','genesis_outputs','genesis_prebuilt_scenarios','genesis_scenarios','ghost_submissions','hf_pushes','institutional_inquiries','integrity_daily_roots','integrity_fingerprints','intelligence_briefs','investment_theses','kg_edges','kg_nodes','leads','leads_enquiries','macro_indicators','market_events','market_snapshots','mcp_calls','memo_generations','methodology_versions','mission_events','moat_archive_runs','newsletter_issues','newsletter_subscribers','oracle_api_queries','outcome_probabilities','outreach_emails','partner_applications','plab_daily_scores','plab_runs','policy_inquiries','policy_scenarios','precursor_categories','precursor_signals','precursor_tracking','prediction_leaderboard','prediction_outcomes','predictions','price_alerts','price_history','price_snapshots','profiles','prometheus_runs','properties_coverage','properties_registry','property_climate','property_credentials','property_episodes','property_geo','property_market','property_pricing_history','property_regulatory','property_transactions','property_valuation','property_valuation_history','published_predictions','pulse_editions','quarterly_reports','regime_history','regulatory_property_impact','regulatory_signals','research_papers_auto','science_notes','score_confidence','score_history','sdk_waitlist','sold_properties','sovereign_briefings','sovereign_dispatches','sovereign_recipients','subscriptions','system_limitations','vision_scores','voice_queries','webhook_deliveries','webhook_subscriptions','weekly_alpha','whitelabel_partners',
];

const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function pg(path: string, extraHeaders: Record<string, string> = {}) {
  return fetch(`${URL_()}/rest/v1/${path}`, {
    headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}`, ...extraHeaders },
    cache: 'no-store',
  });
}

async function count(table: string, filter = ''): Promise<number | string> {
  try {
    const res = await pg(`${table}?select=*${filter}`, { Prefer: 'count=exact', Range: '0-0' });
    if (res.status === 404) return 'NO TABLE';
    if (!res.ok) return `err ${res.status}`;
    const cr = res.headers.get('content-range');
    return cr ? Number(cr.split('/')[1]) : `err no-range`;
  } catch { return 'err net'; }
}

async function edgeValue(table: string, col: string, asc: boolean): Promise<string | null> {
  try {
    const res = await pg(`${table}?select=${col}&${col}=not.is.null&order=${col}.${asc ? 'asc' : 'desc'}&limit=1`);
    if (!res.ok) return null;
    const j = await res.json();
    return j[0]?.[col] ?? null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'no service key in env' }, { status: 500 });

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const out: Record<string, unknown> = {};

  for (const t of TABLES) {
    const row: Record<string, unknown> = { rows: await count(t) };
    if (typeof row.rows === 'number' && row.rows > 0) {
      const min = await edgeValue(t, 'created_at', true);
      if (min) {
        row.min = min;
        row.max = await edgeValue(t, 'created_at', false);
        row.last_7d = await count(t, `&created_at=gte.${sevenDaysAgo}`);
      }
    }
    out[t] = row;
  }

  const targeted: Record<string, unknown> = {};
  for (const [t, cols] of Object.entries({
    eu_properties: ['price', 'score', 'yield', 'valuation'],
    property_transactions: ['sold_price', 'price'],
    sold_properties: ['sold_price', 'price'],
    property_valuation: ['valuation', 'value', 'avm_value'],
    price_history: ['price'],
  })) {
    const cells: Record<string, number | string> = { total: await count(t) };
    for (const c of cols) cells[`${c}_non_null`] = await count(t, `&${c}=not.is.null`);
    targeted[t] = cells;
  }

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    table_count: TABLES.length,
    tables: out,
    targeted,
    note_db_size: 'Not obtainable via PostgREST. Supabase SQL editor: select pg_size_pretty(pg_database_size(current_database()));',
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST — log an event
//
// `ok: true` USED TO BE UNCONDITIONAL, and it was a false success report.
// The insert result was discarded, the catch returned `{ ok: true }` under a
// `// never fail` comment, and `analytics_events` DOES NOT EXIST (swept
// 2026-10-06; supabase-js returns `{data:null,error}` rather than throwing).
// So every event this route has ever been sent was dropped while the route
// reported success — the project's recurring shape, in a route whose only job
// is to record what happened.
//
// Still always HTTP 200, deliberately: analytics must never break a page, and
// the client (src/lib/analytics.ts) is fire-and-forget. What changed is that
// the body now distinguishes "stored" from "accepted and dropped", so the
// failure is legible to anyone who looks instead of being asserted away.
export async function POST(req: NextRequest) {
  try {
    const { event_type, payload, user_email, session_id } = await req.json();
    if (!event_type) return NextResponse.json({ error: 'event_type required' }, { status: 400 });

    if (!supabase) {
      return NextResponse.json({ ok: true, stored: false, reason: 'no supabase client configured' });
    }

    const { error } = await supabase.from('analytics_events').insert({
      event_type,
      payload: payload || {},
      user_email: user_email || null,
      session_id: session_id || null,
    });
    if (error) {
      return NextResponse.json({ ok: true, stored: false, reason: error.message });
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch (e) {
    return NextResponse.json({
      ok: true,
      stored: false,
      reason: e instanceof Error ? e.message : 'malformed request',
    });
  }
}

// GET — fetch analytics dashboard data (admin only)
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  const admins = ['henrik@xaviaestate.com', 'henrik@betongsproyting.no'];
  if (!email || !admins.includes(email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) return NextResponse.json({ error: 'No Supabase' }, { status: 503 });

  // Oracle queries
  const { data: oracleRaw, error: oracleRawErr } = await supabase
    .from('analytics_events')
    .select('payload, user_email, created_at')
    .eq('event_type', 'oracle_query')
    .order('created_at', { ascending: false })
    .limit(200);

  // PRO gate hits
  const { data: gateRaw, error: gateRawErr } = await supabase
    .from('analytics_events')
    .select('payload, user_email, created_at')
    .eq('event_type', 'pro_gate_hit')
    .order('created_at', { ascending: false })
    .limit(200);

  // Semantic searches
  const { data: searchRaw, error: searchRawErr } = await supabase
    .from('analytics_events')
    .select('payload, created_at')
    .eq('event_type', 'semantic_search')
    .order('created_at', { ascending: false })
    .limit(200);

  // Property views
  const { data: viewsRaw, error: viewsRawErr } = await supabase
    .from('analytics_events')
    .select('payload, created_at')
    .eq('event_type', 'property_view')
    .order('created_at', { ascending: false })
    .limit(500);

  // Deal alerts
  const { data: alertsRaw, error: alertsRawErr } = await supabase
    .from('analytics_events')
    .select('payload, user_email, created_at')
    .eq('event_type', 'deal_alert_created')
    .order('created_at', { ascending: false })
    .limit(100);

  // MCP calls count
  const { count: mcpTotal } = await supabase
    .from('mcp_calls')
    .select('*', { count: 'exact', head: true });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count: mcpMonth } = await supabase
    .from('mcp_calls')
    .select('*', { count: 'exact', head: true })
    .gte('called_at', monthStart);

  // Agents
  const { count: agentCount } = await supabase
    .from('agent_registry')
    .select('*', { count: 'exact', head: true });

  // Webhook subs
  const { count: webhookCount } = await supabase
    .from('webhook_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('active', true);

  // Aggregate oracle queries
  const oracleQueries: Record<string, number> = {};
  for (const e of oracleRaw || []) {
    const q = (e.payload as Record<string, string>)?.query || 'unknown';
    oracleQueries[q] = (oracleQueries[q] || 0) + 1;
  }
  const topOracle = Object.entries(oracleQueries)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([query, count]) => ({ query, count }));

  // Aggregate gate hits
  const gateHits: Record<string, number> = {};
  for (const e of gateRaw || []) {
    const f = (e.payload as Record<string, string>)?.feature || 'unknown';
    gateHits[f] = (gateHits[f] || 0) + 1;
  }
  const topGates = Object.entries(gateHits)
    .sort(([, a], [, b]) => b - a)
    .map(([feature, count]) => ({ feature, count }));

  // Aggregate searches
  const searches: Record<string, number> = {};
  for (const e of searchRaw || []) {
    const q = (e.payload as Record<string, string>)?.query || 'unknown';
    searches[q] = (searches[q] || 0) + 1;
  }
  const topSearches = Object.entries(searches)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([query, count]) => ({ query, count }));

  // Aggregate property views
  const propViews: Record<string, { count: number; name: string; price: number; score: number }> = {};
  for (const e of viewsRaw || []) {
    const p = e.payload as Record<string, unknown>;
    const ref = (p?.ref as string) || 'unknown';
    if (!propViews[ref]) propViews[ref] = { count: 0, name: (p?.name as string) || ref, price: (p?.price as number) || 0, score: (p?.score as number) || 0 };
    propViews[ref].count++;
  }
  const topProperties = Object.entries(propViews)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 20)
    .map(([ref, d]) => ({ ref, ...d }));

  // Every `?.length || 0` above turns a FAILED read into a confident zero, and
  // `analytics_events` does not exist, so this dashboard has been reporting
  // "no user activity" when the truth is "no table". Name what could not be
  // read; a zero beside an empty `degraded` list is a real zero.
  const readErrors = [
    ['oracle', oracleRawErr],
    ['pro_gates', gateRawErr],
    ['searches', searchRawErr],
    ['property_views', viewsRawErr],
    ['alerts', alertsRawErr],
  ]
    .filter(([, err]) => err)
    .map(([key, err]) => `${key}: ${(err as { message: string }).message}`);

  return NextResponse.json({
    oracle: { total: oracleRaw?.length || 0, top: topOracle },
    pro_gates: { total: gateRaw?.length || 0, top: topGates },
    searches: { total: searchRaw?.length || 0, top: topSearches },
    property_views: { total: viewsRaw?.length || 0, top: topProperties },
    alerts: { total: alertsRaw?.length || 0 },
    citations: { total: mcpTotal || 0, this_month: mcpMonth || 0 },
    agents: { registered: agentCount || 0 },
    webhooks: { active: webhookCount || 0 },
    // Empty = every count above is a measurement. Non-empty = the zeros
    // beside it are unread, not observed.
    degraded: readErrors,
  });
}

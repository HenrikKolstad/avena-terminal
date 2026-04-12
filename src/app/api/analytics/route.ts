import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST — log an event
export async function POST(req: NextRequest) {
  try {
    const { event_type, payload, user_email, session_id } = await req.json();
    if (!event_type) return NextResponse.json({ error: 'event_type required' }, { status: 400 });

    if (supabase) {
      await supabase.from('analytics_events').insert({
        event_type,
        payload: payload || {},
        user_email: user_email || null,
        session_id: session_id || null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // never fail
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
  const { data: oracleRaw } = await supabase
    .from('analytics_events')
    .select('payload, user_email, created_at')
    .eq('event_type', 'oracle_query')
    .order('created_at', { ascending: false })
    .limit(200);

  // PRO gate hits
  const { data: gateRaw } = await supabase
    .from('analytics_events')
    .select('payload, user_email, created_at')
    .eq('event_type', 'pro_gate_hit')
    .order('created_at', { ascending: false })
    .limit(200);

  // Semantic searches
  const { data: searchRaw } = await supabase
    .from('analytics_events')
    .select('payload, created_at')
    .eq('event_type', 'semantic_search')
    .order('created_at', { ascending: false })
    .limit(200);

  // Property views
  const { data: viewsRaw } = await supabase
    .from('analytics_events')
    .select('payload, created_at')
    .eq('event_type', 'property_view')
    .order('created_at', { ascending: false })
    .limit(500);

  // Deal alerts
  const { data: alertsRaw } = await supabase
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

  return NextResponse.json({
    oracle: { total: oracleRaw?.length || 0, top: topOracle },
    pro_gates: { total: gateRaw?.length || 0, top: topGates },
    searches: { total: searchRaw?.length || 0, top: topSearches },
    property_views: { total: viewsRaw?.length || 0, top: topProperties },
    alerts: { total: alertsRaw?.length || 0 },
    citations: { total: mcpTotal || 0, this_month: mcpMonth || 0 },
    agents: { registered: agentCount || 0 },
    webhooks: { active: webhookCount || 0 },
  });
}

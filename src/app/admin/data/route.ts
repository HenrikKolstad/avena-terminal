/**
 * GET /admin/data — the admin dashboard's numbers, read SERVER-side with the
 * service role. Gated twice: the middleware admin gate (/admin/*) and the
 * check below. Before 2026-10-22 the dashboard queried Supabase from the
 * browser with the public anon key, which broke when RLS locked the tables
 * (and would have leaked them if it hadn't).
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';

const PRICE_PER_SUB_EUR = 79;

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'cache-control': 'no-store' } });
  }
  const sb = supabaseAdmin;
  if (!sb || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase service role not configured' }, { status: 503 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
    try { const r = await q; return r.error ? null : (r.count ?? null); } catch { return null; }
  };
  const head = { count: 'exact' as const, head: true };

  const [activeSubs, totalUsers, emailLeads, totalLeads, soldDetected, totalSnapshots, trackedProperties, snapshotsToday, soldThisWeek, lastSyncRes, emailLeadsRes, leadsRes] =
    await Promise.all([
      count(sb.from('subscriptions').select('*', head).eq('status', 'active')),
      count(sb.from('profiles').select('*', head)),
      count(sb.from('email_leads').select('*', head)),
      count(sb.from('leads').select('*', head)),
      count(sb.from('sold_properties').select('*', head)),
      count(sb.from('price_snapshots').select('*', head)),
      count(sb.from('feed_active_refs').select('*', head)),
      count(sb.from('price_snapshots').select('*', head).eq('snapshot_date', today)),
      count(sb.from('sold_properties').select('*', head).gte('last_seen_date', weekAgo)),
      sb.from('price_snapshots').select('snapshot_date').order('snapshot_date', { ascending: false }).limit(1),
      sb.from('email_leads').select('email, source, created_at').order('created_at', { ascending: false }).limit(20),
      sb.from('leads').select('created_at, user_email, property_name, property_ref, action').order('created_at', { ascending: false }).limit(20),
    ]);

  let propertiesLive: number | null = null;
  try { propertiesLive = getAllProperties().length; } catch { /* leave null */ }

  return NextResponse.json(
    {
      metrics: {
        mrr: activeSubs === null ? null : activeSubs * PRICE_PER_SUB_EUR,
        mrrNote: activeSubs === null ? 'subscriptions unreadable' : null,
        totalUsers,
        emailLeads,
        totalLeads,
        propertiesLive,
        soldDetected,
        lastSync: lastSyncRes.error ? null : (lastSyncRes.data?.[0]?.snapshot_date ?? null),
        totalSnapshots,
        trackedProperties,
        snapshotsToday,
        soldThisWeek,
      },
      emailLeads: emailLeadsRes.error ? [] : (emailLeadsRes.data ?? []),
      leads: leadsRes.error ? [] : (leadsRes.data ?? []),
    },
    { headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' } },
  );
}

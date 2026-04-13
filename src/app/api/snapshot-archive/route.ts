import { NextRequest } from 'next/server';
import { getAllProperties, avg } from '@/lib/properties';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

// Runs daily — archives current dataset state to price_history
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) return Response.json({ error: 'No Supabase' }, { status: 503 });

  const all = getAllProperties();
  const date = new Date().toISOString().split('T')[0];
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Archive each property's current state — 20+ data points per property
  const records = all.slice(0, 1900).map(p => {
    const discountPct = p.pm2 && p.mm2 && p.mm2 > 0
      ? Math.round(((p.mm2 - p.pm2) / p.mm2) * 100 * 10) / 10
      : null;

    let daysOnMarket: number | null = null;
    if (p._added) {
      const addedTime = new Date(p._added).getTime();
      if (!isNaN(addedTime)) {
        daysOnMarket = Math.floor((now - addedTime) / (1000 * 60 * 60 * 24));
      }
    }

    return {
      snapshot_date: date,
      property_ref: p.ref || '',
      project_name: p.p || '',
      town: p.l,
      region: p.costa || p.r || '',
      property_type: p.t,
      price: p.pf,
      price_per_m2: p.pm2 || null,
      market_pm2: p.mm2 || null,
      score: p._sc || null,
      yield_gross: p._yield?.gross || null,
      yield_net: p._yield?.net || null,
      discount_pct: discountPct,
      days_on_market: daysOnMarket,
      status: p.s || '',
      beds: p.bd,
      built_m2: p.bm,
      beach_km: p.bk || null,
      developer_name: p.d || '',
      developer_years: p.dy || null,
    };
  });

  // Batch insert in chunks of 500
  let inserted = 0;
  for (let i = 0; i < records.length; i += 500) {
    const chunk = records.slice(i, i + 500);
    const { error } = await supabase.from('price_history').upsert(chunk, {
      onConflict: 'snapshot_date,property_ref',
    });
    if (!error) inserted += chunk.length;
  }

  // Compute expanded market-level summary
  const avgPrice = Math.round(avg(all.map(p => p.pf)));
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));
  const avgYield = Number(avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1));
  const above70 = all.filter(p => (p._sc ?? 0) >= 70).length;
  const above80 = all.filter(p => (p._sc ?? 0) >= 80).length;

  // Compute avg discount across all properties with both pm2 and mm2
  const withBothPm2 = all.filter(p => p.pm2 && p.mm2 && p.mm2 > 0);
  const discounts = withBothPm2.map(p => ((p.mm2 - p.pm2!) / p.mm2) * 100);
  const avgDiscount = discounts.length > 0 ? Number(avg(discounts).toFixed(1)) : 0;

  // Count new listings this week
  const newThisWeek = all.filter(p => {
    if (!p._added) return false;
    const addedTime = new Date(p._added).getTime();
    return !isNaN(addedTime) && addedTime >= sevenDaysAgo;
  }).length;

  // Key-ready vs off-plan counts
  const keyReadyCount = all.filter(p => p.s === 'key-ready' || p.s === 'Key Ready').length;
  const offPlanCount = all.filter(p => p.s === 'off-plan' || p.s === 'Off Plan').length;

  await supabase.from('market_snapshots').upsert({
    snapshot_date: date,
    total_properties: all.length,
    avg_price: avgPrice,
    avg_score: avgScore,
    avg_yield: avgYield,
    above_70: above70,
    above_80: above80,
    avg_discount: avgDiscount,
    new_this_week: newThisWeek,
    key_ready_count: keyReadyCount,
    off_plan_count: offPlanCount,
  }, { onConflict: 'snapshot_date' });

  return Response.json({
    success: true,
    date,
    properties_archived: inserted,
    market_summary: {
      total: all.length,
      avgPrice,
      avgScore,
      avgYield,
      above_70: above70,
      above_80: above80,
      avg_discount: avgDiscount,
      new_this_week: newThisWeek,
      key_ready_count: keyReadyCount,
      off_plan_count: offPlanCount,
    },
  });
}

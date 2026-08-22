import { bearerCronAuth, withCronLog } from '@/lib/cron-log';
import { getAllProperties, avg } from '@/lib/properties';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

// Runs daily — archives current dataset state to price_history
export const GET = withCronLog('snapshot-archive', '/api/snapshot-archive', bearerCronAuth, async () => {

  if (!supabase) return Response.json({ error: 'No Supabase' }, { status: 503 });

  const all = getAllProperties();
  const date = new Date().toISOString().split('T')[0];
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  /*
   * Archive each property's current state.
   *
   * AUDIT 2026-08-16 — this route ran daily at 06:00 UTC for months and
   * price_history held ZERO rows the entire time. Two faults, both the
   * project's recurring shape:
   *
   *   1. It wrote six columns that do not exist on price_history
   *      (yield_net, discount_pct, days_on_market, beach_km,
   *      developer_name, developer_years). Every upsert returned a
   *      PostgREST 400.
   *   2. `if (!error) inserted += chunk.length` meant a total failure and
   *      an empty book were indistinguishable, and the route returned
   *      `success: true` with the errors discarded either way.
   *
   * The market_snapshots upsert below had the same disease — five
   * nonexistent columns and its return value dropped on the floor — which
   * is why that table froze on 2026-05-23.
   *
   * Only columns that exist are written now, and every write is checked.
   * Do not add a field here without confirming the column exists first.
   *
   * AUDIT 2026-08-17 — a third fault, caught before the first successful
   * write landed: `all.slice(0, 1900)` capped the archive at 1,900 rows
   * while the live book is 2,017, so 117 units would have been dropped
   * from every single day of the series. `expected` was measured off the
   * TRUNCATED list, so `inserted === expected` held and the route would
   * have reported a complete archive of an incomplete book — the same
   * shape as the two faults above. The whole book is archived now, and
   * `expected` is the book size, so any shortfall shows up as a 500.
   */
  const records = all.map(p => ({
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
    status: p.s || '',
    beds: p.bd,
    built_m2: p.bm,
  }));

  // Batch upsert in chunks of 500 — count only what actually landed, and
  // keep every failure so the caller sees it.
  let inserted = 0;
  const writeErrors: string[] = [];
  for (let i = 0; i < records.length; i += 500) {
    const chunk = records.slice(i, i + 500);
    const { error } = await supabase.from('price_history').upsert(chunk, {
      onConflict: 'snapshot_date,property_ref',
    });
    if (error) {
      writeErrors.push(`price_history rows ${i}-${i + chunk.length - 1}: ${error.message}`);
    } else {
      inserted += chunk.length;
    }
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

  // Only real columns. above_80 / avg_discount / new_this_week /
  // key_ready_count / off_plan_count do NOT exist on market_snapshots — they
  // are still computed and returned in the response below, but writing them
  // is what silently 400'd this upsert since 2026-05-23.
  const { error: summaryError } = await supabase.from('market_snapshots').upsert({
    snapshot_date: date,
    total_properties: all.length,
    avg_price: avgPrice,
    avg_score: avgScore,
    avg_yield: avgYield,
    above_70: above70,
  }, { onConflict: 'snapshot_date' });
  if (summaryError) writeErrors.push(`market_snapshots: ${summaryError.message}`);

  // Measured off the book, not off `records` — a cap or a filter that
  // silently shrinks `records` must show up here as a shortfall, not be
  // absorbed into the definition of "expected".
  const expected = all.length;
  const ok = writeErrors.length === 0 && inserted === expected;

  return Response.json({
    success: ok,
    date,
    properties_archived: inserted,
    properties_expected: expected,
    market_summary_written: !summaryError,
    errors: writeErrors.length ? writeErrors : null,
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
  }, { status: ok ? 200 : 500 });
});

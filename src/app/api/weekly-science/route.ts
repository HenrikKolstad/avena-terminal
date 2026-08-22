import { bearerCronAuth, withCronLog } from '@/lib/cron-log';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  const mx = avg(x), my = avg(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx, b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  return dx && dy ? Number((num / Math.sqrt(dx * dy)).toFixed(3)) : 0;
}

export const GET = withCronLog('weekly-science', '/api/weekly-science', bearerCronAuth, async () => {

  if (!supabase) return Response.json({ error: 'No Supabase' }, { status: 503 });

  const all = getAllProperties();
  const date = new Date().toISOString().split('T')[0];
  const weekNum = Math.ceil((new Date().getDate() + new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay()) / 7);

  const findings: { title: string; correlation: number; sample_size: number; insight: string; variables: string[] }[] = [];

  // 1. Beach distance vs yield
  const beachYield = all.filter(p => p.bk != null && p.bk > 0 && p._yield?.gross);
  if (beachYield.length > 10) {
    const r = pearsonCorrelation(beachYield.map(p => p.bk!), beachYield.map(p => p._yield!.gross));
    findings.push({
      title: 'Beach Distance vs Rental Yield',
      correlation: r,
      sample_size: beachYield.length,
      insight: r < -0.1 ? 'Closer to beach = higher yields. Beach proximity premium confirmed.' : r > 0.1 ? 'Inland properties showing higher yields — lower purchase prices drive yield up.' : 'Weak relationship between beach distance and yield this week.',
      variables: ['beach_distance_km', 'gross_yield_pct'],
    });
  }

  // 2. Price per m2 vs score
  const priceSc = all.filter(p => p.pm2 && p._sc);
  if (priceSc.length > 10) {
    const r = pearsonCorrelation(priceSc.map(p => p.pm2!), priceSc.map(p => p._sc!));
    findings.push({
      title: 'Price per m\u00B2 vs Investment Score',
      correlation: r,
      sample_size: priceSc.length,
      insight: r < -0.2 ? 'Strong inverse — cheaper per m\u00B2 properties score higher. Discount-to-market effect dominates.' : 'Score captures value beyond simple pricing — multi-factor model working as designed.',
      variables: ['price_per_m2', 'investment_score'],
    });
  }

  // 3. Developer years vs score
  const devSc = all.filter(p => p.dy && p._sc);
  if (devSc.length > 10) {
    const r = pearsonCorrelation(devSc.map(p => p.dy!), devSc.map(p => p._sc!));
    findings.push({
      title: 'Developer Experience vs Investment Score',
      correlation: r,
      sample_size: devSc.length,
      insight: r > 0.1 ? 'More experienced developers produce higher-scoring properties — track record matters.' : 'Developer experience shows limited correlation with scores — pricing and location dominate.',
      variables: ['developer_years', 'investment_score'],
    });
  }

  // 4. Built area vs yield
  const areaYield = all.filter(p => p.bm && p._yield?.gross);
  if (areaYield.length > 10) {
    const r = pearsonCorrelation(areaYield.map(p => p.bm), areaYield.map(p => p._yield!.gross));
    findings.push({
      title: 'Built Area vs Rental Yield',
      correlation: r,
      sample_size: areaYield.length,
      insight: r < -0.1 ? 'Smaller units generate higher yields — compact apartments outperform large villas on yield.' : 'Size has limited impact on yield ratios this week.',
      variables: ['built_area_m2', 'gross_yield_pct'],
    });
  }

  // 5. Bedrooms vs price per m2
  const bedsPm2 = all.filter(p => p.bd && p.pm2);
  if (bedsPm2.length > 10) {
    const r = pearsonCorrelation(bedsPm2.map(p => p.bd), bedsPm2.map(p => p.pm2!));
    findings.push({
      title: 'Bedroom Count vs Price per m\u00B2',
      correlation: r,
      sample_size: bedsPm2.length,
      insight: r < -0.1 ? 'More bedrooms = lower price per m\u00B2. Economies of scale in larger units.' : r > 0.1 ? 'Premium increases with bedrooms — larger units command higher per-m\u00B2 pricing.' : 'Bedroom count shows neutral price-per-m\u00B2 effect.',
      variables: ['bedrooms', 'price_per_m2'],
    });
  }

  // 6. Score vs discount
  const scoreDisc = all.filter(p => p._sc && p.pm2 && p.mm2 && p.mm2 > 0);
  if (scoreDisc.length > 10) {
    const r = pearsonCorrelation(scoreDisc.map(p => p._sc!), scoreDisc.map(p => ((p.mm2! - p.pm2!) / p.mm2!) * 100));
    findings.push({
      title: 'Investment Score vs Discount to Market',
      correlation: r,
      sample_size: scoreDisc.length,
      insight: r > 0.3 ? 'Strong positive — higher discounts directly drive higher scores. Value factor (40% weight) confirmed as dominant.' : 'Score captures value beyond raw discounts — multi-factor differentiation working.',
      variables: ['investment_score', 'discount_to_market_pct'],
    });
  }

  // Store findings
  const slug = `week-${weekNum}-${date}`;
  await supabase.from('science_notes').upsert({
    slug,
    week_num: weekNum,
    date,
    findings: JSON.stringify(findings),
    total_correlations: findings.length,
    sample_size: all.length,
    published_at: new Date().toISOString(),
  }, { onConflict: 'slug' });

  return Response.json({
    success: true,
    week: weekNum,
    date,
    correlations_computed: findings.length,
    findings,
  });
});

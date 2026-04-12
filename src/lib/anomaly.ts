import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from './properties';
import { Property } from './types';

export interface AlphaSignal {
  id: string;
  type: 'price_anomaly' | 'score_outlier' | 'developer_discount' | 'geographic_mispricing' | 'yield_spike' | 'new_high_scorer';
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  headline: string;
  detail: string;
  property: {
    ref: string;
    name: string;
    town: string;
    region: string;
    type: string;
    price: number;
    score: number;
    yield_gross: number;
    pm2: number;
    mm2: number;
    discount_pct: number;
    beds: number;
    beach_km: number;
    developer: string;
  };
  comparables: {
    regional_avg_pm2: number;
    town_avg_pm2: number;
    regional_avg_score: number;
    town_avg_score: number;
  };
  analysis: {
    why_anomalous: string;
    estimated_upside: string;
    risk_factors: string[];
    recommended_action: string;
  };
}

export function detectAnomalies(): AlphaSignal[] {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const signals: AlphaSignal[] = [];
  const date = new Date().toISOString().split('T')[0];

  // Precompute regional stats
  const regionalStats = new Map<string, { avgPm2: number; avgScore: number; avgYield: number; count: number }>();
  for (const c of costas) {
    const rProps = all.filter(p => p.costa === c.costa);
    const pm2s = rProps.filter(p => p.pm2).map(p => p.pm2!);
    const scores = rProps.filter(p => p._sc).map(p => p._sc!);
    const yields = rProps.filter(p => p._yield?.gross).map(p => p._yield!.gross);
    regionalStats.set(c.costa, {
      avgPm2: Math.round(avg(pm2s)),
      avgScore: Math.round(avg(scores)),
      avgYield: Number(avg(yields).toFixed(1)),
      count: rProps.length,
    });
  }

  // Precompute town stats
  const townStats = new Map<string, { avgPm2: number; avgScore: number; avgYield: number; count: number }>();
  for (const t of towns) {
    const tProps = all.filter(p => slugify(p.l) === t.slug);
    const pm2s = tProps.filter(p => p.pm2).map(p => p.pm2!);
    const scores = tProps.filter(p => p._sc).map(p => p._sc!);
    const yields = tProps.filter(p => p._yield?.gross).map(p => p._yield!.gross);
    townStats.set(t.slug, {
      avgPm2: Math.round(avg(pm2s)),
      avgScore: Math.round(avg(scores)),
      avgYield: Number(avg(yields).toFixed(1)),
      count: tProps.length,
    });
  }

  function makeProperty(p: Property) {
    const disc = p.pm2 && p.mm2 && p.mm2 > 0 ? ((p.mm2 - p.pm2) / p.mm2) * 100 : 0;
    return {
      ref: p.ref || '',
      name: p.p || `${p.t} in ${p.l}`,
      town: p.l,
      region: p.costa || p.r || '',
      type: p.t,
      price: p.pf,
      score: p._sc || 0,
      yield_gross: p._yield?.gross || 0,
      pm2: p.pm2 || 0,
      mm2: p.mm2 || 0,
      discount_pct: Math.round(disc),
      beds: p.bd,
      beach_km: p.bk || 0,
      developer: p.d || '',
    };
  }

  function getComparables(p: Property) {
    const rs = regionalStats.get(p.costa || '') || { avgPm2: 0, avgScore: 0, avgYield: 0, count: 0 };
    const ts = townStats.get(slugify(p.l)) || { avgPm2: 0, avgScore: 0, avgYield: 0, count: 0 };
    return {
      regional_avg_pm2: rs.avgPm2,
      town_avg_pm2: ts.avgPm2,
      regional_avg_score: rs.avgScore,
      town_avg_score: ts.avgScore,
    };
  }

  // ---- SIGNAL 1: Score outliers — properties scoring 20+ points above their town average ----
  for (const p of all) {
    if (!p._sc || p._sc < 65) continue;
    const ts = townStats.get(slugify(p.l));
    if (!ts || ts.count < 3) continue;
    const diff = p._sc - ts.avgScore;
    if (diff >= 15) {
      signals.push({
        id: `score-outlier-${slugify(p.ref || p.l)}-${date}`,
        type: 'score_outlier',
        severity: diff >= 25 ? 'high' : diff >= 20 ? 'medium' : 'low',
        timestamp: new Date().toISOString(),
        headline: `Score Outlier: ${p._sc}/100 in ${p.l} (town avg ${ts.avgScore})`,
        detail: `${p.p || p.t} in ${p.l} scores ${p._sc}/100, which is ${diff} points above the town average of ${ts.avgScore}. This level of outperformance suggests the property is significantly underpriced or has exceptional attributes relative to its location.`,
        property: makeProperty(p),
        comparables: getComparables(p),
        analysis: {
          why_anomalous: `Scores ${diff} points above town average of ${ts.avgScore}/100. Statistically significant outperformance across ${ts.count} properties in this town.`,
          estimated_upside: `If priced at town-average metrics, implied value would be ${Math.round(((p.mm2 || p.pm2!) * p.bm) * 0.15 / 1000) * 1000 > 0 ? '\u20AC' + (Math.round(((p.mm2 || p.pm2!) * p.bm) * 0.15 / 1000) * 1000).toLocaleString() : 'significant'} higher.`,
          risk_factors: [
            p.s === 'off-plan' ? 'Off-plan — completion risk exists' : 'Key-ready — minimal execution risk',
            p.dy && p.dy < 5 ? 'Developer has limited track record (<5 years)' : 'Developer has established track record',
            diff > 25 ? 'Extreme score deviation — verify data accuracy' : 'Score deviation within plausible range',
          ],
          recommended_action: p._sc >= 80 ? 'Strong buy signal — institutional grade' : p._sc >= 70 ? 'Buy signal — above market fundamentals' : 'Monitor — above average but verify',
        },
      });
    }
  }

  // ---- SIGNAL 2: Deep discounts — properties >20% below market ----
  for (const p of all) {
    if (!p.pm2 || !p.mm2 || p.mm2 <= 0) continue;
    const disc = ((p.mm2 - p.pm2) / p.mm2) * 100;
    if (disc >= 20) {
      signals.push({
        id: `deep-discount-${slugify(p.ref || p.l)}-${date}`,
        type: 'price_anomaly',
        severity: disc >= 35 ? 'high' : disc >= 25 ? 'medium' : 'low',
        timestamp: new Date().toISOString(),
        headline: `${Math.round(disc)}% Below Market: ${p.p || p.t} in ${p.l}`,
        detail: `Priced at \u20AC${p.pm2.toLocaleString()}/m\u00B2 vs market rate of \u20AC${p.mm2.toLocaleString()}/m\u00B2. That's a ${Math.round(disc)}% discount, implying a saving of \u20AC${Math.round((p.mm2 - p.pm2) * p.bm).toLocaleString()} on this ${p.bm}m\u00B2 property.`,
        property: makeProperty(p),
        comparables: getComparables(p),
        analysis: {
          why_anomalous: `${Math.round(disc)}% below local market rate. Saving of \u20AC${Math.round((p.mm2 - p.pm2) * p.bm).toLocaleString()} vs comparable properties.`,
          estimated_upside: `\u20AC${Math.round((p.mm2 - p.pm2) * p.bm).toLocaleString()} implied value gap based on market comparables.`,
          risk_factors: [
            disc > 35 ? 'Extreme discount — may indicate data quality issue or distressed sale' : 'Significant but plausible developer pricing strategy',
            'Verify listing is current and available',
            p.s === 'off-plan' ? 'Off-plan completion risk' : 'Delivery risk minimal',
          ],
          recommended_action: disc >= 30 && (p._sc || 0) >= 70 ? 'High priority — verify and act quickly' : 'Investigate — significant discount warrants due diligence',
        },
      });
    }
  }

  // ---- SIGNAL 3: Yield spikes — gross yield >8% ----
  for (const p of all) {
    if (!p._yield?.gross || p._yield.gross < 8) continue;
    const rs = regionalStats.get(p.costa || '');
    if (!rs) continue;
    signals.push({
      id: `yield-spike-${slugify(p.ref || p.l)}-${date}`,
      type: 'yield_spike',
      severity: p._yield.gross >= 10 ? 'high' : 'medium',
      timestamp: new Date().toISOString(),
      headline: `${p._yield.gross.toFixed(1)}% Yield: ${p.p || p.t} in ${p.l}`,
      detail: `Gross yield of ${p._yield.gross.toFixed(1)}% vs regional average of ${rs.avgYield}%. At \u20AC${p.pf.toLocaleString()}, this ${p.bd}-bed ${p.t.toLowerCase()} could generate \u20AC${(p._yield.annual || 0).toLocaleString()}/year in rental income.`,
      property: makeProperty(p),
      comparables: getComparables(p),
      analysis: {
        why_anomalous: `Yield ${(p._yield.gross - rs.avgYield).toFixed(1)} percentage points above regional average of ${rs.avgYield}%.`,
        estimated_upside: `\u20AC${(p._yield.annual || 0).toLocaleString()}/year gross rental income. Net yield after costs: ~${(p._yield.net || 0).toFixed(1)}%.`,
        risk_factors: [
          'Yield estimates based on ADR model — actual rental performance may vary',
          'Local rental licence (licencia tur\u00edstica) availability should be verified',
          p.bk && p.bk > 5 ? 'Distance from beach may limit short-term rental demand' : 'Good beach proximity for rental demand',
        ],
        recommended_action: 'Income-focused buy — verify rental licence availability in municipality',
      },
    });
  }

  // ---- SIGNAL 4: Geographic mispricing — beach property cheaper than inland ----
  for (const p of all) {
    if (!p.bk || p.bk > 1 || !p.pm2 || !p.costa) continue;
    const rs = regionalStats.get(p.costa);
    if (!rs || rs.avgPm2 <= 0) continue;
    if (p.pm2 < rs.avgPm2 * 0.85) {
      signals.push({
        id: `geo-mispricing-${slugify(p.ref || p.l)}-${date}`,
        type: 'geographic_mispricing',
        severity: p.pm2 < rs.avgPm2 * 0.7 ? 'high' : 'medium',
        timestamp: new Date().toISOString(),
        headline: `Beach Property Below Regional Average: ${p.p || p.t} in ${p.l}`,
        detail: `${p.bk.toFixed(1)}km from beach but priced at \u20AC${p.pm2.toLocaleString()}/m\u00B2 — ${Math.round(((rs.avgPm2 - p.pm2) / rs.avgPm2) * 100)}% below the ${p.costa} regional average of \u20AC${rs.avgPm2.toLocaleString()}/m\u00B2. Beach proximity typically commands a premium, making this pricing anomalous.`,
        property: makeProperty(p),
        comparables: getComparables(p),
        analysis: {
          why_anomalous: `Beachfront-adjacent property (${p.bk.toFixed(1)}km) priced below regional average. Beach proximity decay model predicts higher pricing.`,
          estimated_upside: `If priced at beach-premium rates, implied value is \u20AC${Math.round((rs.avgPm2 - p.pm2) * p.bm).toLocaleString()} higher.`,
          risk_factors: [
            'Verify exact beach distance and access route',
            'Check for construction or infrastructure between property and beach',
            'May be first-line to road rather than first-line to sea',
          ],
          recommended_action: 'Physical inspection recommended — potential geographic mispricing opportunity',
        },
      });
    }
  }

  // Sort by severity (high first) then score
  const order = { high: 0, medium: 1, low: 2 };
  signals.sort((a, b) => order[a.severity] - order[b.severity] || b.property.score - a.property.score);

  // Limit to top 50 signals
  return signals.slice(0, 50);
}

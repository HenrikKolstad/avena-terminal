import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from './properties';
import { Property } from './types';

export interface AlphaSignal {
  id: string;
  type: 'price_anomaly' | 'score_outlier' | 'developer_discount' | 'geographic_mispricing' | 'yield_spike' | 'new_high_scorer' | 'motivated_seller' | 'developer_dump' | 'yield_hunt' | 'cross_market';
  severity: 'high' | 'medium' | 'low';
  hunt_type: string;
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
    confidence: number;
  };
}

export function detectAnomalies(): AlphaSignal[] {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const signals: AlphaSignal[] = [];
  const date = new Date().toISOString().split('T')[0];
  const now = Date.now();

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

  // Precompute regional stats by type (for cross-market signal)
  const regionalTypeStats = new Map<string, { avgPm2: number; count: number }>();
  for (const c of costas) {
    const rProps = all.filter(p => p.costa === c.costa);
    const types = new Set(rProps.map(p => p.t));
    for (const t of types) {
      const typeProps = rProps.filter(p => p.t === t && p.pm2);
      if (typeProps.length >= 3) {
        const pm2s = typeProps.map(p => p.pm2!);
        regionalTypeStats.set(`${c.costa}::${t}`, {
          avgPm2: Math.round(avg(pm2s)),
          count: typeProps.length,
        });
      }
    }
  }

  // Precompute developer stats (for developer_dump signal)
  const devProperties = new Map<string, Property[]>();
  for (const p of all) {
    if (!p.d) continue;
    const existing = devProperties.get(p.d) || [];
    existing.push(p);
    devProperties.set(p.d, existing);
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

  function daysOnMarket(p: Property): number | null {
    if (!p._added) return null;
    const added = new Date(p._added).getTime();
    if (isNaN(added)) return null;
    return Math.floor((now - added) / (1000 * 60 * 60 * 24));
  }

  // ---- SIGNAL 1: Score outliers — properties scoring 15+ points above their town average ----
  for (const p of all) {
    if (!p._sc || p._sc < 65) continue;
    const ts = townStats.get(slugify(p.l));
    if (!ts || ts.count < 3) continue;
    const diff = p._sc - ts.avgScore;
    if (diff >= 15) {
      const confidence = Math.min(95, 50 + diff * 2 + (ts.count >= 10 ? 10 : 0));
      signals.push({
        id: `score-outlier-${slugify(p.ref || p.l)}-${date}`,
        type: 'score_outlier',
        hunt_type: 'score_outlier',
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
          confidence,
        },
      });
    }
  }

  // ---- SIGNAL 2: Deep discounts — properties >20% below market ----
  for (const p of all) {
    if (!p.pm2 || !p.mm2 || p.mm2 <= 0) continue;
    const disc = ((p.mm2 - p.pm2) / p.mm2) * 100;
    if (disc >= 20) {
      const confidence = Math.min(95, 40 + Math.round(disc) + ((p._sc || 0) >= 70 ? 15 : 0));
      signals.push({
        id: `deep-discount-${slugify(p.ref || p.l)}-${date}`,
        type: 'price_anomaly',
        hunt_type: 'deep_discount',
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
          confidence,
        },
      });
    }
  }

  // ---- SIGNAL 3: Yield spikes — gross yield >8% ----
  for (const p of all) {
    if (!p._yield?.gross || p._yield.gross < 8) continue;
    const rs = regionalStats.get(p.costa || '');
    if (!rs) continue;
    const yieldDiff = p._yield.gross - rs.avgYield;
    const confidence = Math.min(95, 45 + Math.round(yieldDiff * 5) + (p.bk != null && p.bk < 3 ? 10 : 0));
    signals.push({
      id: `yield-spike-${slugify(p.ref || p.l)}-${date}`,
      type: 'yield_spike',
      hunt_type: 'yield_spike',
      severity: p._yield.gross >= 10 ? 'high' : 'medium',
      timestamp: new Date().toISOString(),
      headline: `${p._yield.gross.toFixed(1)}% Yield: ${p.p || p.t} in ${p.l}`,
      detail: `Gross yield of ${p._yield.gross.toFixed(1)}% vs regional average of ${rs.avgYield}%. At \u20AC${p.pf.toLocaleString()}, this ${p.bd}-bed ${p.t.toLowerCase()} could generate \u20AC${(p._yield.annual || 0).toLocaleString()}/year in rental income.`,
      property: makeProperty(p),
      comparables: getComparables(p),
      analysis: {
        why_anomalous: `Yield ${yieldDiff.toFixed(1)} percentage points above regional average of ${rs.avgYield}%.`,
        estimated_upside: `\u20AC${(p._yield.annual || 0).toLocaleString()}/year gross rental income. Net yield after costs: ~${(p._yield.net || 0).toFixed(1)}%.`,
        risk_factors: [
          'Yield estimates based on ADR model — actual rental performance may vary',
          'Local rental licence (licencia tur\u00edstica) availability should be verified',
          p.bk && p.bk > 5 ? 'Distance from beach may limit short-term rental demand' : 'Good beach proximity for rental demand',
        ],
        recommended_action: 'Income-focused buy — verify rental licence availability in municipality',
        confidence,
      },
    });
  }

  // ---- SIGNAL 4: Geographic mispricing — beach property cheaper than inland ----
  for (const p of all) {
    if (!p.bk || p.bk > 1 || !p.pm2 || !p.costa) continue;
    const rs = regionalStats.get(p.costa);
    if (!rs || rs.avgPm2 <= 0) continue;
    if (p.pm2 < rs.avgPm2 * 0.85) {
      const pctBelow = Math.round(((rs.avgPm2 - p.pm2) / rs.avgPm2) * 100);
      const confidence = Math.min(95, 40 + pctBelow + (p.bk < 0.5 ? 15 : 5));
      signals.push({
        id: `geo-mispricing-${slugify(p.ref || p.l)}-${date}`,
        type: 'geographic_mispricing',
        hunt_type: 'geographic_mispricing',
        severity: p.pm2 < rs.avgPm2 * 0.7 ? 'high' : 'medium',
        timestamp: new Date().toISOString(),
        headline: `Beach Property Below Regional Average: ${p.p || p.t} in ${p.l}`,
        detail: `${p.bk.toFixed(1)}km from beach but priced at \u20AC${p.pm2.toLocaleString()}/m\u00B2 — ${pctBelow}% below the ${p.costa} regional average of \u20AC${rs.avgPm2.toLocaleString()}/m\u00B2. Beach proximity typically commands a premium, making this pricing anomalous.`,
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
          confidence,
        },
      });
    }
  }

  // ---- SIGNAL 5: Motivated seller — on market > 90 days ----
  for (const p of all) {
    const dom = daysOnMarket(p);
    if (dom === null || dom < 90) continue;
    if (!p._sc || p._sc < 50) continue;
    const confidence = Math.min(95, 35 + Math.min(dom, 365) / 5);
    const severity: AlphaSignal['severity'] = dom >= 180 ? 'high' : dom >= 120 ? 'medium' : 'low';
    signals.push({
      id: `motivated-seller-${slugify(p.ref || p.l)}-${date}`,
      type: 'motivated_seller',
      hunt_type: 'motivated_seller',
      severity,
      timestamp: new Date().toISOString(),
      headline: `${dom} Days on Market: ${p.p || p.t} in ${p.l}`,
      detail: `This property has been listed for ${dom} days — well above the typical sales cycle. Extended time on market often indicates pricing flexibility. Priced at \u20AC${p.pf.toLocaleString()}, score ${p._sc}/100.`,
      property: makeProperty(p),
      comparables: getComparables(p),
      analysis: {
        why_anomalous: `Listed for ${dom} days, significantly above normal market absorption rate. Developer may accept lower offers.`,
        estimated_upside: `Negotiation potential of 5-15% off asking price due to extended listing period.`,
        risk_factors: [
          dom > 180 ? 'Very long listing — investigate why property has not sold' : 'Extended listing suggests negotiation opportunity',
          'Check if property has been relisted or price adjusted',
          'Verify property condition and any market-specific issues',
        ],
        recommended_action: dom >= 180 ? 'Strong negotiation opportunity — offer 10-15% below asking' : 'Moderate negotiation leverage — offer 5-10% below asking',
        confidence: Math.round(confidence),
      },
    });
  }

  // ---- SIGNAL 6: Developer dump — developer has 3+ properties with discount > 15% ----
  const processedDevs = new Set<string>();
  for (const [devName, props] of devProperties) {
    if (processedDevs.has(devName)) continue;
    const discountedProps = props.filter(p => {
      if (!p.pm2 || !p.mm2 || p.mm2 <= 0) return false;
      const disc = ((p.mm2 - p.pm2) / p.mm2) * 100;
      return disc > 15;
    });
    if (discountedProps.length >= 3) {
      processedDevs.add(devName);
      const avgDiscDev = avg(discountedProps.map(p => ((p.mm2 - p.pm2!) / p.mm2) * 100));
      const bestProp = discountedProps.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))[0];
      const confidence = Math.min(95, 40 + discountedProps.length * 5 + Math.round(avgDiscDev));
      signals.push({
        id: `dev-dump-${slugify(devName)}-${date}`,
        type: 'developer_dump',
        hunt_type: 'developer_dump',
        severity: discountedProps.length >= 5 ? 'high' : avgDiscDev >= 25 ? 'high' : 'medium',
        timestamp: new Date().toISOString(),
        headline: `Developer Dump: ${devName} — ${discountedProps.length} properties avg ${Math.round(avgDiscDev)}% off`,
        detail: `${devName} has ${discountedProps.length} properties discounted >15% below market (avg ${Math.round(avgDiscDev)}% off). This pattern suggests inventory liquidation or aggressive pricing strategy. Best scored: ${bestProp.p || bestProp.t} in ${bestProp.l} at ${bestProp._sc}/100.`,
        property: makeProperty(bestProp),
        comparables: getComparables(bestProp),
        analysis: {
          why_anomalous: `Developer ${devName} has ${discountedProps.length} discounted units averaging ${Math.round(avgDiscDev)}% below market. Bulk discounting pattern detected.`,
          estimated_upside: `Portfolio-level opportunity — negotiate bulk deals or early-bird pricing across ${discountedProps.length} units.`,
          risk_factors: [
            'Investigate developer financial health — bulk discounting may signal cash flow issues',
            discountedProps.length >= 5 ? 'Large inventory dump — may indicate oversupply in micro-market' : 'Moderate discount volume — likely strategic pricing',
            `Developer track record: ${bestProp.dy || 0} years`,
          ],
          recommended_action: `Multi-unit opportunity — contact ${devName} for portfolio-level pricing`,
          confidence: Math.round(confidence),
        },
      });
    }
  }

  // ---- SIGNAL 7: Yield hunt — gross yield > 6% ----
  for (const p of all) {
    if (!p._yield?.gross || p._yield.gross < 6 || p._yield.gross >= 8) continue; // 8%+ already captured by yield_spike
    const rs = regionalStats.get(p.costa || '');
    if (!rs) continue;
    const yieldDiff = p._yield.gross - rs.avgYield;
    if (yieldDiff < 1) continue; // must be at least 1pp above regional avg to be interesting
    const confidence = Math.min(90, 35 + Math.round(yieldDiff * 8) + ((p._sc || 0) >= 65 ? 10 : 0));
    signals.push({
      id: `yield-hunt-${slugify(p.ref || p.l)}-${date}`,
      type: 'yield_hunt',
      hunt_type: 'yield_hunt',
      severity: p._yield.gross >= 7 ? 'medium' : 'low',
      timestamp: new Date().toISOString(),
      headline: `Yield Hunt: ${p._yield.gross.toFixed(1)}% in ${p.l}`,
      detail: `Gross yield of ${p._yield.gross.toFixed(1)}% (${yieldDiff.toFixed(1)}pp above ${p.costa} average of ${rs.avgYield}%). ${p.bd}-bed ${p.t.toLowerCase()} at \u20AC${p.pf.toLocaleString()}, generating \u20AC${(p._yield.annual || 0).toLocaleString()}/year estimated.`,
      property: makeProperty(p),
      comparables: getComparables(p),
      analysis: {
        why_anomalous: `Yield ${yieldDiff.toFixed(1)}pp above regional average. Income potential exceeds typical market returns.`,
        estimated_upside: `\u20AC${(p._yield.annual || 0).toLocaleString()}/year gross. Net ~${(p._yield.net || 0).toFixed(1)}%. Payback period: ${p._yield.gross > 0 ? Math.round(100 / p._yield.gross) : 'N/A'} years.`,
        risk_factors: [
          'Verify rental licence availability in municipality',
          p.bk != null && p.bk > 5 ? 'Beach distance >5km may reduce short-let demand' : 'Beach proximity supports rental demand',
          'Seasonal occupancy variance should be modeled',
        ],
        recommended_action: 'Income-oriented acquisition — model seasonal cash flows before committing',
        confidence: Math.round(confidence),
      },
    });
  }

  // ---- SIGNAL 8: Cross-market mispricing — 20%+ below same-type regional average ----
  for (const p of all) {
    if (!p.pm2 || !p.costa) continue;
    const key = `${p.costa}::${p.t}`;
    const typeStats = regionalTypeStats.get(key);
    if (!typeStats || typeStats.count < 5) continue;
    const pctBelow = ((typeStats.avgPm2 - p.pm2) / typeStats.avgPm2) * 100;
    if (pctBelow < 20) continue;
    // Avoid duplicating deep_discount signals for the same property
    const existingDiscount = signals.find(s => s.hunt_type === 'deep_discount' && s.property.ref === (p.ref || ''));
    if (existingDiscount) continue;
    const confidence = Math.min(95, 35 + Math.round(pctBelow) + (typeStats.count >= 15 ? 10 : 0));
    signals.push({
      id: `cross-market-${slugify(p.ref || p.l)}-${date}`,
      type: 'cross_market',
      hunt_type: 'cross_market',
      severity: pctBelow >= 35 ? 'high' : pctBelow >= 25 ? 'medium' : 'low',
      timestamp: new Date().toISOString(),
      headline: `Cross-Market: ${p.t} ${Math.round(pctBelow)}% below ${p.costa} avg`,
      detail: `This ${p.t.toLowerCase()} in ${p.l} is priced at \u20AC${p.pm2.toLocaleString()}/m\u00B2 — ${Math.round(pctBelow)}% below the ${p.costa} average of \u20AC${typeStats.avgPm2.toLocaleString()}/m\u00B2 for ${p.t.toLowerCase()}s (based on ${typeStats.count} comparables).`,
      property: makeProperty(p),
      comparables: getComparables(p),
      analysis: {
        why_anomalous: `Priced ${Math.round(pctBelow)}% below the regional type average of \u20AC${typeStats.avgPm2.toLocaleString()}/m\u00B2 across ${typeStats.count} ${p.t.toLowerCase()}s in ${p.costa}.`,
        estimated_upside: `\u20AC${Math.round((typeStats.avgPm2 - p.pm2) * p.bm).toLocaleString()} value gap vs type-matched regional average.`,
        risk_factors: [
          'Verify property specifications match type category',
          pctBelow > 35 ? 'Extreme deviation — may indicate data or classification issue' : 'Significant deviation — verify listing accuracy',
          'Compare finishes, amenities, and exact location to regional peers',
        ],
        recommended_action: pctBelow >= 30 ? 'High priority cross-market opportunity — physical inspection advised' : 'Cross-market value play — due diligence recommended',
        confidence: Math.round(confidence),
      },
    });
  }

  // Sort by severity (high first) then score
  const order = { high: 0, medium: 1, low: 2 };
  signals.sort((a, b) => order[a.severity] - order[b.severity] || b.property.score - a.property.score);

  // Limit to top 75 signals
  return signals.slice(0, 75);
}

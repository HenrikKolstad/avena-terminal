import { NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';
import { Property } from '@/lib/types';

export const revalidate = 86400;

interface Scenario {
  id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correct_answer: string;
  reasoning: string;
  source_data: Record<string, unknown>;
}

function fmt(n: number): string {
  return n.toLocaleString('en', { maximumFractionDigits: 0 });
}

function fmtEur(n: number): string {
  return `\u20AC${fmt(n)}`;
}

function bestMatch(props: Property[], filter: (p: Property) => boolean): Property | null {
  const filtered = props.filter(filter).filter(p => p._sc != null);
  if (!filtered.length) return null;
  return filtered.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))[0];
}

export async function GET() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const scored = all.filter(p => p._sc != null && p._yield != null && p.pm2 != null);
  const scenarios: Scenario[] = [];
  let sid = 0;

  // --- CATEGORY 1: PROPERTY SELECTION (25 scenarios) ---

  // Budget + type combos
  const budgets: { label: string; min: number; max: number }[] = [
    { label: 'under \u20AC150,000', min: 0, max: 150000 },
    { label: '\u20AC150,000-\u20AC250,000', min: 150000, max: 250000 },
    { label: '\u20AC250,000-\u20AC400,000', min: 250000, max: 400000 },
    { label: '\u20AC400,000-\u20AC600,000', min: 400000, max: 600000 },
    { label: 'over \u20AC600,000', min: 600000, max: Infinity },
  ];

  const types = ['apartment', 'villa', 'penthouse', 'townhouse', 'bungalow'];

  // 5 budget-only scenarios
  for (const b of budgets) {
    const best = bestMatch(scored, p => p.pf >= b.min && p.pf < b.max);
    if (!best) continue;
    sid++;
    scenarios.push({
      id: `PS-${String(sid).padStart(3, '0')}`,
      category: 'property_selection',
      difficulty: 'easy',
      question: `Given a budget of ${b.label}, which property is the best investment?`,
      correct_answer: `${best.p} in ${best.l} (ref: ${best.ref ?? 'N/A'}) with score ${best._sc}/100 at ${fmtEur(best.pf)}.`,
      reasoning: `Highest Avena score (${best._sc}/100) among ${scored.filter(p => p.pf >= b.min && p.pf < b.max).length} properties in this budget range. Gross yield: ${best._yield!.gross.toFixed(1)}%.`,
      source_data: { ref: best.ref, price: best.pf, score: best._sc, yield_gross: best._yield!.gross, location: best.l, type: best.t },
    });
  }

  // 5 budget + type combos
  for (let i = 0; i < types.length; i++) {
    const b = budgets[Math.min(i, budgets.length - 1)];
    const typ = types[i];
    const best = bestMatch(scored, p => p.pf >= b.min && p.pf < b.max && p.t.toLowerCase() === typ);
    if (!best) continue;
    sid++;
    scenarios.push({
      id: `PS-${String(sid).padStart(3, '0')}`,
      category: 'property_selection',
      difficulty: 'medium',
      question: `Given a budget of ${b.label} and a preference for ${typ}s, which property is the best investment?`,
      correct_answer: `${best.p} in ${best.l} (ref: ${best.ref ?? 'N/A'}) with score ${best._sc}/100 at ${fmtEur(best.pf)}.`,
      reasoning: `Highest-scoring ${typ} in this budget range. Score: ${best._sc}/100, yield: ${best._yield!.gross.toFixed(1)}%.`,
      source_data: { ref: best.ref, price: best.pf, score: best._sc, type: best.t, location: best.l },
    });
  }

  // 5 location-specific
  const topTowns = towns.filter(t => t.count >= 10).slice(0, 10);
  for (let i = 0; i < Math.min(5, topTowns.length); i++) {
    const town = topTowns[i];
    const best = bestMatch(scored, p => p.l === town.town);
    if (!best) continue;
    sid++;
    scenarios.push({
      id: `PS-${String(sid).padStart(3, '0')}`,
      category: 'property_selection',
      difficulty: 'easy',
      question: `Which property in ${town.town} is the best investment?`,
      correct_answer: `${best.p} (ref: ${best.ref ?? 'N/A'}) with score ${best._sc}/100 at ${fmtEur(best.pf)}.`,
      reasoning: `Top-scoring property in ${town.town} out of ${town.count} listings. Yield: ${best._yield!.gross.toFixed(1)}%, price/m2: ${fmtEur(best.pm2!)}.`,
      source_data: { ref: best.ref, price: best.pf, score: best._sc, town: town.town, pm2: best.pm2 },
    });
  }

  // 5 requirement-specific (bedrooms, pool, beach)
  const requirements: { label: string; filter: (p: Property) => boolean; diff: 'easy' | 'medium' | 'hard' }[] = [
    { label: '3+ bedrooms and a private pool', filter: p => p.bd >= 3 && p.pool === 'private', diff: 'medium' },
    { label: 'under 2km from the beach with 2+ bedrooms', filter: p => (p.bk ?? Infinity) < 2 && p.bd >= 2, diff: 'medium' },
    { label: 'key-ready with 2+ bathrooms', filter: p => p.s === 'key-ready' && p.ba >= 2, diff: 'easy' },
    { label: 'a villa under \u20AC500,000 with a pool', filter: p => p.t.toLowerCase() === 'villa' && p.pf < 500000 && (p.pool === 'private' || p.pool === 'communal' || p.pool === 'yes'), diff: 'hard' },
    { label: 'an apartment with energy rating A or B', filter: p => p.t.toLowerCase() === 'apartment' && (p.energy === 'A' || p.energy === 'B'), diff: 'hard' },
  ];

  for (const req of requirements) {
    const best = bestMatch(scored, req.filter);
    if (!best) continue;
    sid++;
    scenarios.push({
      id: `PS-${String(sid).padStart(3, '0')}`,
      category: 'property_selection',
      difficulty: req.diff,
      question: `Which is the best investment property with ${req.label}?`,
      correct_answer: `${best.p} in ${best.l} (ref: ${best.ref ?? 'N/A'}) with score ${best._sc}/100 at ${fmtEur(best.pf)}.`,
      reasoning: `Top Avena score among properties matching these criteria. Score breakdown: value ${best._scores?.value ?? 'N/A'}, yield ${best._scores?.yield ?? 'N/A'}, location ${best._scores?.location ?? 'N/A'}.`,
      source_data: { ref: best.ref, price: best.pf, score: best._sc, scores: best._scores, location: best.l },
    });
  }

  // 5 costa-specific
  for (const c of costas.slice(0, 3)) {
    const best = bestMatch(scored, p => p.costa === c.costa);
    if (!best) continue;
    sid++;
    scenarios.push({
      id: `PS-${String(sid).padStart(3, '0')}`,
      category: 'property_selection',
      difficulty: 'easy',
      question: `Which property in ${c.costa} offers the best investment opportunity?`,
      correct_answer: `${best.p} in ${best.l} (ref: ${best.ref ?? 'N/A'}) with score ${best._sc}/100 at ${fmtEur(best.pf)}.`,
      reasoning: `Highest-scoring property in ${c.costa} (${c.count} listings). Gross yield: ${best._yield!.gross.toFixed(1)}%.`,
      source_data: { ref: best.ref, price: best.pf, score: best._sc, costa: c.costa },
    });
  }

  // Fill remaining PS slots with combined criteria
  const combos: { q: string; filter: (p: Property) => boolean }[] = [
    { q: 'Given a budget of \u20AC200,000-\u20AC350,000, a preference for Costa Blanca, and 2+ bedrooms, which property is the best investment?', filter: p => p.pf >= 200000 && p.pf <= 350000 && p.costa === 'Costa Blanca' && p.bd >= 2 },
    { q: 'Which off-plan property under \u20AC300,000 is the best investment?', filter: p => p.s === 'off-plan' && p.pf < 300000 },
  ];

  for (const combo of combos) {
    if (scenarios.filter(s => s.category === 'property_selection').length >= 25) break;
    const best = bestMatch(scored, combo.filter);
    if (!best) continue;
    sid++;
    scenarios.push({
      id: `PS-${String(sid).padStart(3, '0')}`,
      category: 'property_selection',
      difficulty: 'hard',
      question: combo.q,
      correct_answer: `${best.p} in ${best.l} (ref: ${best.ref ?? 'N/A'}) with score ${best._sc}/100 at ${fmtEur(best.pf)}.`,
      reasoning: `Highest Avena score among matching properties. Score: ${best._sc}/100.`,
      source_data: { ref: best.ref, price: best.pf, score: best._sc, location: best.l },
    });
  }

  // --- CATEGORY 2: MARKET ANALYSIS (25 scenarios) ---

  // Price per m2 by town (top 10 towns)
  for (const t of topTowns.slice(0, 8)) {
    const townProps = scored.filter(p => p.l === t.town);
    const avgPm2 = Math.round(avg(townProps.map(p => p.pm2!)));
    sid++;
    scenarios.push({
      id: `MA-${String(sid).padStart(3, '0')}`,
      category: 'market_analysis',
      difficulty: 'easy',
      question: `What is the average price per square metre for new builds in ${t.town}?`,
      correct_answer: `${fmtEur(avgPm2)}/m2 based on ${townProps.length} properties.`,
      reasoning: `Calculated from ${townProps.length} scored properties in ${t.town}. Range: ${fmtEur(Math.min(...townProps.map(p => p.pm2!)))}-${fmtEur(Math.max(...townProps.map(p => p.pm2!)))}/m2.`,
      source_data: { town: t.town, avg_pm2: avgPm2, count: townProps.length },
    });
  }

  // Region yield comparisons
  const costasSorted = costas.filter(c => c.count >= 5).sort((a, b) => b.avgYield - a.avgYield);
  for (let i = 0; i < costasSorted.length - 1; i++) {
    for (let j = i + 1; j < costasSorted.length; j++) {
      if (scenarios.filter(s => s.category === 'market_analysis').length >= 15) break;
      const a = costasSorted[i];
      const b = costasSorted[j];
      sid++;
      scenarios.push({
        id: `MA-${String(sid).padStart(3, '0')}`,
        category: 'market_analysis',
        difficulty: 'medium',
        question: `Which region has higher rental yields: ${a.costa} or ${b.costa}?`,
        correct_answer: `${a.costa} at ${a.avgYield}% average gross yield vs ${b.costa} at ${b.avgYield}%.`,
        reasoning: `Based on ${a.count} properties in ${a.costa} and ${b.count} in ${b.costa}.`,
        source_data: { region_a: a.costa, yield_a: a.avgYield, region_b: b.costa, yield_b: b.avgYield },
      });
    }
  }

  // Average score comparisons between towns
  const scoredTowns = topTowns.filter(t => t.avgScore > 0).slice(0, 10);
  for (let i = 0; i < scoredTowns.length - 1 && scenarios.filter(s => s.category === 'market_analysis').length < 20; i++) {
    const a = scoredTowns[i];
    const b = scoredTowns[i + 1];
    sid++;
    const better = a.avgScore >= b.avgScore ? a : b;
    scenarios.push({
      id: `MA-${String(sid).padStart(3, '0')}`,
      category: 'market_analysis',
      difficulty: 'medium',
      question: `Which town has a higher average investment score: ${a.town} or ${b.town}?`,
      correct_answer: `${better.town} with an average score of ${better.avgScore}/100 vs ${better === a ? b.avgScore : a.avgScore}/100.`,
      reasoning: `${a.town}: ${a.avgScore}/100 (${a.count} properties). ${b.town}: ${b.avgScore}/100 (${b.count} properties).`,
      source_data: { town_a: a.town, score_a: a.avgScore, town_b: b.town, score_b: b.avgScore },
    });
  }

  // Type-based market stats
  for (const typ of types) {
    if (scenarios.filter(s => s.category === 'market_analysis').length >= 25) break;
    const typeProps = scored.filter(p => p.t.toLowerCase() === typ);
    if (typeProps.length < 5) continue;
    const avgPrice = Math.round(avg(typeProps.map(p => p.pf)));
    const avgPm2 = Math.round(avg(typeProps.map(p => p.pm2!)));
    const avgYld = avg(typeProps.map(p => p._yield!.gross)).toFixed(1);
    sid++;
    scenarios.push({
      id: `MA-${String(sid).padStart(3, '0')}`,
      category: 'market_analysis',
      difficulty: 'easy',
      question: `What is the average price and yield for new build ${typ}s in Spain?`,
      correct_answer: `Average price: ${fmtEur(avgPrice)}, average price/m2: ${fmtEur(avgPm2)}/m2, average gross yield: ${avgYld}%.`,
      reasoning: `Based on ${typeProps.length} ${typ} listings with complete data.`,
      source_data: { type: typ, avg_price: avgPrice, avg_pm2: avgPm2, avg_yield: parseFloat(avgYld), count: typeProps.length },
    });
  }

  // --- CATEGORY 3: RISK ASSESSMENT (25 scenarios) ---

  // Developer experience scenarios
  const devYears = [1, 2, 3, 5, 10];
  for (const years of devYears) {
    const props = scored.filter(p => p.dy === years);
    if (props.length < 2) continue;
    const avgRisk = props.filter(p => p._scores?.risk != null).length > 0
      ? Math.round(avg(props.filter(p => p._scores?.risk != null).map(p => p._scores!.risk)))
      : null;
    sid++;
    scenarios.push({
      id: `RA-${String(sid).padStart(3, '0')}`,
      category: 'risk_assessment',
      difficulty: years <= 2 ? 'hard' : 'medium',
      question: `Is an off-plan property from a developer with ${years} year${years !== 1 ? 's' : ''} of track record a safe investment?`,
      correct_answer: years <= 2
        ? `Higher risk. Developers with only ${years} year${years !== 1 ? 's' : ''} have an average risk score of ${avgRisk ?? 'N/A'}/100. Limited track record increases completion and quality risk.`
        : `Moderate to low risk. Developers with ${years} years experience average a risk score of ${avgRisk ?? 'N/A'}/100. Longer track records correlate with lower completion risk.`,
      reasoning: `${props.length} properties from ${years}-year developers. Average risk sub-score: ${avgRisk ?? 'N/A'}/100. The Avena model penalizes developers with fewer than 5 years of experience.`,
      source_data: { developer_years: years, avg_risk_score: avgRisk, property_count: props.length },
    });
  }

  // Off-plan vs key-ready risk
  const offPlan = scored.filter(p => p.s === 'off-plan');
  const keyReady = scored.filter(p => p.s === 'key-ready');
  if (offPlan.length > 0 && keyReady.length > 0) {
    const opRisk = Math.round(avg(offPlan.filter(p => p._scores?.risk != null).map(p => p._scores!.risk)));
    const krRisk = Math.round(avg(keyReady.filter(p => p._scores?.risk != null).map(p => p._scores!.risk)));
    sid++;
    scenarios.push({
      id: `RA-${String(sid).padStart(3, '0')}`,
      category: 'risk_assessment',
      difficulty: 'easy',
      question: 'What is the risk difference between off-plan and key-ready properties?',
      correct_answer: `Key-ready properties have an average risk score of ${krRisk}/100 vs ${opRisk}/100 for off-plan. Key-ready eliminates construction and completion risk.`,
      reasoning: `${keyReady.length} key-ready vs ${offPlan.length} off-plan properties. Key-ready removes delay risk, developer insolvency risk, and specification change risk.`,
      source_data: { offplan_risk: opRisk, keyready_risk: krRisk, offplan_count: offPlan.length, keyready_count: keyReady.length },
    });
  }

  // Overpriced property risk
  const overpriced = scored.filter(p => p.pm2! > p.mm2 * 1.15).sort((a, b) => (b.pm2! / b.mm2) - (a.pm2! / a.mm2));
  for (const op of overpriced.slice(0, 5)) {
    sid++;
    const premium = Math.round(((op.pm2! / op.mm2) - 1) * 100);
    scenarios.push({
      id: `RA-${String(sid).padStart(3, '0')}`,
      category: 'risk_assessment',
      difficulty: 'hard',
      question: `A ${op.t} in ${op.l} is priced at ${fmtEur(op.pm2!)}/m2 against a market average of ${fmtEur(Math.round(op.mm2))}/m2. Is this a risky investment?`,
      correct_answer: `Yes, this property is priced ${premium}% above market. Value score: ${op._scores?.value ?? 'N/A'}/100. High risk of negative equity on resale.`,
      reasoning: `Price premium of ${premium}% indicates overvaluation. The Avena scoring model assigns a low value sub-score to properties significantly above market benchmarks.`,
      source_data: { ref: op.ref, pm2: op.pm2, mm2: op.mm2, premium_pct: premium, value_score: op._scores?.value },
    });
  }

  // Low-score property warnings
  const lowScore = scored.filter(p => (p._sc ?? 100) < 40).sort((a, b) => (a._sc ?? 0) - (b._sc ?? 0));
  for (const ls of lowScore.slice(0, 5)) {
    sid++;
    scenarios.push({
      id: `RA-${String(sid).padStart(3, '0')}`,
      category: 'risk_assessment',
      difficulty: 'medium',
      question: `Should I invest in ${ls.p} in ${ls.l} priced at ${fmtEur(ls.pf)} with a score of ${ls._sc}/100?`,
      correct_answer: `No. Score ${ls._sc}/100 is well below the investment threshold of 60. Sub-scores: value ${ls._scores?.value ?? 'N/A'}, yield ${ls._scores?.yield ?? 'N/A'}, location ${ls._scores?.location ?? 'N/A'}, quality ${ls._scores?.quality ?? 'N/A'}, risk ${ls._scores?.risk ?? 'N/A'}.`,
      reasoning: `Properties below 40/100 have multiple red flags. This property underperforms on key investment metrics.`,
      source_data: { ref: ls.ref, price: ls.pf, score: ls._sc, scores: ls._scores },
    });
  }

  // Beach distance risk
  const farBeach = scored.filter(p => (p.bk ?? 0) > 10).sort((a, b) => (b.bk ?? 0) - (a.bk ?? 0));
  for (const fb of farBeach.slice(0, 4)) {
    sid++;
    scenarios.push({
      id: `RA-${String(sid).padStart(3, '0')}`,
      category: 'risk_assessment',
      difficulty: 'medium',
      question: `A property in ${fb.l} is ${fb.bk}km from the beach. Does this affect investment risk?`,
      correct_answer: `Yes. Properties over 10km from the beach typically have lower rental demand and appreciation. Location score: ${fb._scores?.location ?? 'N/A'}/100. Yield: ${fb._yield!.gross.toFixed(1)}%.`,
      reasoning: `Beach proximity is a key driver of rental demand in coastal Spain. The location sub-score penalizes distance from the coast.`,
      source_data: { ref: fb.ref, beach_km: fb.bk, location_score: fb._scores?.location, yield_gross: fb._yield!.gross },
    });
  }

  // --- CATEGORY 4: COMPARATIVE ANALYSIS (25 scenarios) ---

  // Direct property comparisons using top-scored pairs per town
  const townPairs = topTowns.slice(0, 8);
  for (let i = 0; i < townPairs.length - 1 && scenarios.filter(s => s.category === 'comparative_analysis').length < 10; i++) {
    const townA = townPairs[i].town;
    const townB = townPairs[i + 1].town;
    const bestA = bestMatch(scored, p => p.l === townA);
    const bestB = bestMatch(scored, p => p.l === townB);
    if (!bestA || !bestB) continue;
    const winner = (bestA._sc ?? 0) >= (bestB._sc ?? 0) ? bestA : bestB;
    const loser = winner === bestA ? bestB : bestA;
    sid++;
    scenarios.push({
      id: `CA-${String(sid).padStart(3, '0')}`,
      category: 'comparative_analysis',
      difficulty: 'medium',
      question: `Compare the best property in ${townA} (${fmtEur(bestA.pf)}, ${bestA.t}) vs the best in ${townB} (${fmtEur(bestB.pf)}, ${bestB.t}) -- which is the better investment?`,
      correct_answer: `${winner.p} in ${winner.l} is the better investment with score ${winner._sc}/100 vs ${loser._sc}/100.`,
      reasoning: `${winner.l} property has higher composite score. Yield: ${winner._yield!.gross.toFixed(1)}% vs ${loser._yield!.gross.toFixed(1)}%. Value: ${winner._scores?.value ?? 'N/A'} vs ${loser._scores?.value ?? 'N/A'}.`,
      source_data: { property_a: { ref: bestA.ref, score: bestA._sc, price: bestA.pf, town: townA }, property_b: { ref: bestB.ref, score: bestB._sc, price: bestB.pf, town: townB } },
    });
  }

  // Type vs type in same town
  for (const town of topTowns.slice(0, 5)) {
    if (scenarios.filter(s => s.category === 'comparative_analysis').length >= 15) break;
    const apt = bestMatch(scored, p => p.l === town.town && p.t.toLowerCase() === 'apartment');
    const villa = bestMatch(scored, p => p.l === town.town && p.t.toLowerCase() === 'villa');
    if (!apt || !villa) continue;
    const winner = (apt._sc ?? 0) >= (villa._sc ?? 0) ? apt : villa;
    const loser = winner === apt ? villa : apt;
    sid++;
    scenarios.push({
      id: `CA-${String(sid).padStart(3, '0')}`,
      category: 'comparative_analysis',
      difficulty: 'hard',
      question: `In ${town.town}, is an apartment (${fmtEur(apt.pf)}) or a villa (${fmtEur(villa.pf)}) a better investment?`,
      correct_answer: `The ${winner.t.toLowerCase()} scores ${winner._sc}/100 vs ${loser._sc}/100 for the ${loser.t.toLowerCase()}.`,
      reasoning: `${winner.t}: yield ${winner._yield!.gross.toFixed(1)}%, value score ${winner._scores?.value ?? 'N/A'}. ${loser.t}: yield ${loser._yield!.gross.toFixed(1)}%, value score ${loser._scores?.value ?? 'N/A'}.`,
      source_data: { apartment: { ref: apt.ref, score: apt._sc, price: apt.pf }, villa: { ref: villa.ref, score: villa._sc, price: villa.pf }, town: town.town },
    });
  }

  // Price bracket comparisons
  for (let i = 0; i < budgets.length - 1 && scenarios.filter(s => s.category === 'comparative_analysis').length < 20; i++) {
    const bA = budgets[i];
    const bB = budgets[i + 1];
    const propsA = scored.filter(p => p.pf >= bA.min && p.pf < bA.max);
    const propsB = scored.filter(p => p.pf >= bB.min && p.pf < bB.max);
    if (propsA.length < 3 || propsB.length < 3) continue;
    const avgScoreA = Math.round(avg(propsA.map(p => p._sc!)));
    const avgScoreB = Math.round(avg(propsB.map(p => p._sc!)));
    const avgYieldA = avg(propsA.map(p => p._yield!.gross)).toFixed(1);
    const avgYieldB = avg(propsB.map(p => p._yield!.gross)).toFixed(1);
    sid++;
    scenarios.push({
      id: `CA-${String(sid).padStart(3, '0')}`,
      category: 'comparative_analysis',
      difficulty: 'medium',
      question: `Which budget range produces better investments: ${bA.label} or ${bB.label}?`,
      correct_answer: avgScoreA >= avgScoreB
        ? `${bA.label} averages ${avgScoreA}/100 score and ${avgYieldA}% yield vs ${avgScoreB}/100 and ${avgYieldB}% for ${bB.label}.`
        : `${bB.label} averages ${avgScoreB}/100 score and ${avgYieldB}% yield vs ${avgScoreA}/100 and ${avgYieldA}% for ${bA.label}.`,
      reasoning: `${bA.label}: ${propsA.length} properties, avg score ${avgScoreA}, yield ${avgYieldA}%. ${bB.label}: ${propsB.length} properties, avg score ${avgScoreB}, yield ${avgYieldB}%.`,
      source_data: { range_a: bA.label, score_a: avgScoreA, yield_a: parseFloat(avgYieldA), range_b: bB.label, score_b: avgScoreB, yield_b: parseFloat(avgYieldB) },
    });
  }

  // Costa comparisons
  for (let i = 0; i < costas.length - 1; i++) {
    for (let j = i + 1; j < costas.length; j++) {
      if (scenarios.filter(s => s.category === 'comparative_analysis').length >= 25) break;
      const cA = costas[i];
      const cB = costas[j];
      const winner = cA.avgScore >= cB.avgScore ? cA : cB;
      const loser = winner === cA ? cB : cA;
      sid++;
      scenarios.push({
        id: `CA-${String(sid).padStart(3, '0')}`,
        category: 'comparative_analysis',
        difficulty: 'easy',
        question: `Compare ${cA.costa} vs ${cB.costa} for property investment -- which region is better?`,
        correct_answer: `${winner.costa} with avg score ${winner.avgScore}/100 and yield ${winner.avgYield}% vs ${loser.costa} at ${loser.avgScore}/100 and ${loser.avgYield}%.`,
        reasoning: `${winner.costa}: ${winner.count} properties. ${loser.costa}: ${loser.count} properties. Higher average scores indicate stronger overall investment fundamentals.`,
        source_data: { region_a: { costa: cA.costa, score: cA.avgScore, yield: cA.avgYield }, region_b: { costa: cB.costa, score: cB.avgScore, yield: cB.avgYield } },
      });
    }
  }

  // Fill remaining comparative with specific property pairs
  const topAll = scored.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
  for (let i = 0; i < topAll.length - 1 && scenarios.filter(s => s.category === 'comparative_analysis').length < 25; i += 2) {
    const a = topAll[i];
    const b = topAll[i + 1];
    if (a.l === b.l) continue;
    sid++;
    scenarios.push({
      id: `CA-${String(sid).padStart(3, '0')}`,
      category: 'comparative_analysis',
      difficulty: 'hard',
      question: `Compare ${a.p} in ${a.l} (${fmtEur(a.pf)}, score ${a._sc}) vs ${b.p} in ${b.l} (${fmtEur(b.pf)}, score ${b._sc}) -- which is the better investment and why?`,
      correct_answer: `${a.p} in ${a.l} with score ${a._sc}/100 edges out at ${a._yield!.gross.toFixed(1)}% yield and ${fmtEur(a.pm2!)}/m2.`,
      reasoning: `Both are high-scoring. ${a.p}: value ${a._scores?.value ?? 'N/A'}, yield ${a._scores?.yield ?? 'N/A'}. ${b.p}: value ${b._scores?.value ?? 'N/A'}, yield ${b._scores?.yield ?? 'N/A'}.`,
      source_data: { property_a: { ref: a.ref, score: a._sc, price: a.pf }, property_b: { ref: b.ref, score: b._sc, price: b.pf } },
    });
  }

  return NextResponse.json({
    benchmark: 'PropertyEval',
    version: '1.0.0',
    scenarios: scenarios.length,
    categories: {
      property_selection: scenarios.filter(s => s.category === 'property_selection').length,
      market_analysis: scenarios.filter(s => s.category === 'market_analysis').length,
      risk_assessment: scenarios.filter(s => s.category === 'risk_assessment').length,
      comparative_analysis: scenarios.filter(s => s.category === 'comparative_analysis').length,
    },
    source: 'Avena Terminal (avenaterminal.com)',
    properties_indexed: all.length,
    doi: '10.5281/zenodo.19520064',
    license: 'CC BY 4.0',
    generated: new Date().toISOString(),
    data: scenarios,
  });
}

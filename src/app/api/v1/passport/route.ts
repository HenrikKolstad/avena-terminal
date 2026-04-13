import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';
import { Property } from '@/lib/types';

export const dynamic = 'force-dynamic';

/* ─── Helpers ─── */

function daysOnMarket(p: Property): number | null {
  if (!p._added) return null;
  const added = new Date(p._added);
  const now = new Date();
  return Math.max(0, Math.round((now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24)));
}

const TYPE_FACTORS: Record<string, number> = {
  Apartment: 85, Townhouse: 70, Bungalow: 65, Penthouse: 60, Villa: 50,
};

function beachFactor(bk: number | null): number {
  if (bk == null) return 50;
  if (bk < 2) return 80;
  if (bk < 5) return 65;
  return 50;
}

function priceBandFactor(price: number): number {
  if (price < 200_000) return 85;
  if (price <= 400_000) return 75;
  return 55;
}

function marketDepthScore(count: number): number {
  if (count >= 50) return 90;
  if (count >= 20) return 70;
  if (count >= 10) return 55;
  if (count >= 5) return 40;
  return 25;
}

function comparableVelocityScore(avgDom: number | null): number {
  if (avgDom == null) return 50;
  if (avgDom < 30) return 85;
  if (avgDom < 60) return 70;
  if (avgDom < 120) return 50;
  return 30;
}

function inlineLiquidityScore(property: Property, comparables: Property[]): number {
  const compDoms = comparables.map(daysOnMarket).filter((d): d is number => d !== null);
  const compVelocity = compDoms.length > 0 ? avg(compDoms) : null;
  const typeFactor = TYPE_FACTORS[property.t] ?? 50;
  const bFact = beachFactor(property.bk);
  const pbFact = priceBandFactor(property.pf);
  const mdScore = marketDepthScore(comparables.length);
  const cvScore = comparableVelocityScore(compVelocity);
  return Math.round(
    typeFactor * 0.25 + bFact * 0.20 + pbFact * 0.20 + mdScore * 0.20 + cvScore * 0.15
  );
}

function countRegulatoryRisks(property: Property): number {
  let count = 0;
  // Coastal zone risk
  if (property.bk != null && property.bk < 0.5) count++;
  // Energy risk
  if (property.energy && ['F', 'G'].includes(property.energy.toUpperCase())) count++;
  // Golden Visa price band
  if (property.pf >= 500_000) count++;
  // Tourist license zone (coastal Valencia / Costa Blanca)
  if (property.costa && slugify(property.costa).includes('blanca') && property.bk != null && property.bk < 0.5) count++;
  return count;
}

function developerRating(dy: number): { score: number; label: string } {
  if (dy >= 20) return { score: 90, label: 'Established (20+ years)' };
  if (dy >= 10) return { score: 75, label: 'Experienced (10-20 years)' };
  if (dy >= 5) return { score: 60, label: 'Growing (5-10 years)' };
  return { score: 40, label: 'New (<5 years)' };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/* ─── Main handler ─── */

export async function GET(request: NextRequest) {
  try {
    const ref = request.nextUrl.searchParams.get('ref');
    if (!ref) {
      return NextResponse.json({ error: 'Query parameter "ref" is required' }, { status: 400 });
    }

    const all = getAllProperties();
    const property = all.find(p => p.ref === ref);
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const comparables = all.filter(p => p.ref !== ref && p.l === property.l && p.t === property.t);
    const townComps = all.filter(p => p.ref !== ref && p.l === property.l);

    /* ─── Valuation ─── */
    const compPm2s = comparables.filter(p => p.pm2 && p.pm2 > 0).map(p => p.pm2!);
    const medianPm2 = compPm2s.length > 0
      ? compPm2s.sort((a, b) => a - b)[Math.floor(compPm2s.length / 2)]
      : property.pm2 ?? property.mm2;
    const fairValue = Math.round(medianPm2 * property.bm);
    const currentPrice = property.pf;
    const valuationGapPct = fairValue > 0
      ? Number((((fairValue - currentPrice) / fairValue) * 100).toFixed(1))
      : 0;
    const valuationScore = clamp(Math.round(50 + valuationGapPct * 2), 0, 100);

    /* ─── Liquidity ─── */
    const liquidityScore = inlineLiquidityScore(property, comparables);
    const liquidityTier = liquidityScore > 75 ? 'HIGH' : liquidityScore > 50 ? 'MEDIUM' : 'LOW';

    /* ─── Developer ─── */
    const devRating = developerRating(property.dy);

    /* ─── Regulatory ─── */
    const regRiskCount = countRegulatoryRisks(property);
    const regulatoryScore = clamp(100 - regRiskCount * 20, 0, 100);

    /* ─── Market ─── */
    const townAvgPrice = townComps.length > 0 ? Math.round(avg(townComps.map(p => p.pf))) : currentPrice;
    const priceVsTown = townAvgPrice > 0
      ? Number((((currentPrice - townAvgPrice) / townAvgPrice) * 100).toFixed(1))
      : 0;
    const marketScore = clamp(Math.round(60 - priceVsTown), 0, 100);

    /* ─── ESG / Carbon ─── */
    const energyRating = property.energy ?? 'Unknown';
    const esgScore = (() => {
      const ratings: Record<string, number> = { A: 95, B: 85, C: 75, D: 60, E: 50, F: 35, G: 20 };
      return ratings[energyRating.toUpperCase()] ?? 50;
    })();

    /* ─── Tax estimate ─── */
    const purchaseTaxRate = 0.13;
    const totalPurchaseCost = Math.round(currentPrice * purchaseTaxRate);
    const annualHoldingCost = Math.round(currentPrice * 0.0016 + 1800 + 400);

    /* ─── Scoring ─── */
    const avenaScore = property._sc ?? 0;
    const grossYield = property._yield?.gross ?? 0;
    const discount = property.pm2 && property.mm2 && property.mm2 > 0
      ? Number((((property.mm2 - property.pm2) / property.mm2) * 100).toFixed(1))
      : 0;

    /* ─── Health Score ─── */
    const healthScore = Math.round(
      avenaScore * 0.30 +
      valuationScore * 0.20 +
      liquidityScore * 0.15 +
      devRating.score * 0.15 +
      regulatoryScore * 0.10 +
      esgScore * 0.10
    );

    const healthTier = healthScore >= 75 ? 'EXCELLENT' : healthScore >= 60 ? 'GOOD' : healthScore >= 45 ? 'FAIR' : 'NEEDS_REVIEW';

    /* ─── Episodic Summary ─── */
    const dom = daysOnMarket(property);
    const summaryParts: string[] = [];
    if (healthScore >= 75) summaryParts.push('Strong overall health profile.');
    else if (healthScore >= 60) summaryParts.push('Solid fundamentals with some areas to monitor.');
    else summaryParts.push('Some risk factors warrant closer due diligence.');

    if (valuationGapPct > 5) summaryParts.push(`Appears undervalued by ~${valuationGapPct}% vs comparables.`);
    else if (valuationGapPct < -5) summaryParts.push(`Priced ${Math.abs(valuationGapPct)}% above comparable median.`);

    if (liquidityTier === 'HIGH') summaryParts.push('High liquidity - strong exit potential.');
    else if (liquidityTier === 'LOW') summaryParts.push('Low liquidity - consider longer holding horizon.');

    if (regRiskCount > 0) summaryParts.push(`${regRiskCount} regulatory risk factor(s) identified.`);
    if (dom != null) summaryParts.push(`Listed for ${dom} days.`);

    return NextResponse.json({
      property_id: property.ref ?? null,
      property_name: `${property.p} - ${property.l}`,
      health_score: healthScore,
      health_tier: healthTier,
      generated_at: new Date().toISOString(),
      sections: {
        valuation: {
          score: valuationScore,
          fair_value: fairValue,
          current_price: currentPrice,
          valuation_gap_pct: valuationGapPct,
          comparable_count: compPm2s.length,
          median_pm2: medianPm2,
          summary: valuationGapPct > 0
            ? `Property appears undervalued by ${valuationGapPct}% based on ${compPm2s.length} comparables.`
            : `Property priced ${Math.abs(valuationGapPct)}% above comparable median.`,
        },
        liquidity: {
          score: liquidityScore,
          tier: liquidityTier,
          days_on_market: dom,
          comparable_count: comparables.length,
          summary: `Liquidity tier: ${liquidityTier}. ${comparables.length} comparable properties in ${property.l}.`,
        },
        developer: {
          score: devRating.score,
          name: property.d,
          years_active: property.dy,
          label: devRating.label,
          summary: `${property.d} - ${devRating.label}. ${property.dy} years of track record.`,
        },
        regulatory: {
          score: regulatoryScore,
          risk_count: regRiskCount,
          summary: regRiskCount === 0
            ? 'No significant regulatory risk factors identified.'
            : `${regRiskCount} regulatory risk factor(s) flagged. Review coastal zone, energy, and license requirements.`,
        },
        market: {
          score: marketScore,
          town_avg_price: townAvgPrice,
          price_vs_town_pct: priceVsTown,
          summary: `Priced ${priceVsTown > 0 ? `${priceVsTown}% above` : `${Math.abs(priceVsTown)}% below`} the ${property.l} average of EUR ${townAvgPrice.toLocaleString()}.`,
        },
        tax_estimate: {
          purchase_costs: totalPurchaseCost,
          annual_holding_costs: annualHoldingCost,
          effective_purchase_rate: '13%',
          summary: `Estimated purchase costs EUR ${totalPurchaseCost.toLocaleString()} (13%). Annual holding ~EUR ${annualHoldingCost.toLocaleString()}.`,
        },
        scoring: {
          avena_score: avenaScore,
          gross_yield: grossYield,
          discount_pct: discount,
          beach_km: property.bk,
          energy_rating: energyRating,
          developer_years: property.dy,
          summary: `Avena Score ${avenaScore}/100. Yield ${grossYield}%. ${discount > 0 ? `${discount}% below market.` : 'At or above market price.'}`,
        },
        carbon: {
          score: esgScore,
          energy_rating: energyRating,
          summary: energyRating !== 'Unknown'
            ? `Energy rating ${energyRating}. ${esgScore >= 70 ? 'Good energy efficiency profile.' : 'Consider energy upgrade costs.'}`
            : 'Energy rating unknown. Request EPC certificate before purchase.',
        },
        episodic_summary: {
          summary: summaryParts.join(' '),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

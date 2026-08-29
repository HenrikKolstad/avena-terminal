import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, avg } from '@/lib/properties';
import { Property } from '@/lib/types';
import { toEpcLetter } from '@/lib/epc';

export const dynamic = 'force-dynamic';

/**
 * Per-listing fact sheet: what Avena has actually observed about one unit.
 *
 * WHAT THIS ROUTE USED TO PUBLISH, AND WHY IT NO LONGER DOES
 * Until 2026-08-29 this route published a `health_score` (0-100) and a
 * `health_tier` (EXCELLENT / GOOD / FAIR / NEEDS_REVIEW) over six section
 * scores. About 70% of the composite's weight came from constants that are
 * not derived from anything:
 *
 *   valuation   0.20   score = 50 + valuation_gap_pct * 2
 *   liquidity   0.15   the five hand-set factor tables removed from
 *                      /api/v1/liquidity in this same commit
 *   developer   0.15   90 / 75 / 60 / 40 by years-active band
 *   regulatory  0.10   100 - (risk_count * 20)
 *   esg         0.10   A 95 / B 85 / C 75 / D 60 / E 50 / F 35 / G 20
 *   avena_score 0.30   the one genuinely derived input
 *
 * A document called a "passport" carrying a single headline health number is
 * read as due diligence. Publishing one that is mostly arithmetic over
 * invented constants is the most expensive kind of claim this project can
 * make, so the composite and its sub-scores are removed rather than reweighted.
 *
 * THREE OF THE DEFECTS WERE RECURRENCES, not new findings:
 *
 * 1. EPC. `ratings[energy.toUpperCase()] ?? 50` gave a mid-scale ESG score to
 *    the 16 listings carrying the feed's 'X' placeholder and to every listing
 *    with no energy field at all, then captioned it "Consider energy upgrade
 *    costs". This is the third copy of the bug fixed in /api/v1/compliance
 *    (03f57ef) and /api/v1/carbon (b9bf525); src/lib/epc.ts was created on
 *    2026-08-26 precisely so there would not be a third, and this route was
 *    missed. It now goes through toEpcLetter like every other surface.
 *
 * 2. Golden Visa. `countRegulatoryRisks` counted `price >= 500_000` as a
 *    regulatory risk factor. The Golden Visa real-estate route was abolished
 *    on 2025-04-03 by Organic Law 1/2025 and was removed from
 *    /api/v1/compliance on 2026-08-25 for exactly this reason.
 *
 * 3. Tax. `purchase_costs` was a flat 13% of price and `annual_holding_costs`
 *    was `price * 0.0016 + 1800 + 400`, the last two figures being pure
 *    invention. /api/v1/tax was repaired on 2026-08-24 (fde7883) to resolve
 *    tax inputs honestly or return null; this block quietly duplicated the
 *    surface with the defaults that fix removed. Callers are pointed there.
 *
 * WHAT SURVIVES is measurement: the comparable set and what it implies about
 * price, the town cross-section, time on market, and Avena's own derived
 * score and yield — each null when the inputs for it are absent, never zero.
 * A null here means "not observed"; the previous version's zeros were
 * indistinguishable from a measured zero.
 */

const NOT_PUBLISHED = {
  health_score:
    'Removed 2026-08-29. Was a weighted sum in which ~70% of the weight came ' +
    'from hand-set constants (valuation/liquidity/developer/regulatory/ESG ' +
    'sub-scores) with no empirical basis.',
  health_tier: 'Removed 2026-08-29. Was a threshold on the removed health_score.',
  section_scores:
    'Removed 2026-08-29. valuation (50 + gap*2), liquidity (five constant ' +
    'tables), developer (90/75/60/40 by years band), regulatory ' +
    '(100 - risks*20) and carbon/ESG (A 95 … G 20) were all rescales of ' +
    'hand-set numbers rather than measurements.',
  regulatory_risk_count:
    'Removed 2026-08-29. One of its four factors counted a price at or above ' +
    'EUR 500,000 as Golden Visa exposure; that residency-by-investment route ' +
    'was abolished on 2025-04-03 by Organic Law 1/2025. The other three were ' +
    'unsourced heuristics.',
  tax_estimate:
    'Removed 2026-08-29. Was a flat 13% of price plus an annual holding cost ' +
    'of price*0.0016 + 1800 + 400, the constants being invented. Use ' +
    '/api/v1/tax, which resolves tax inputs from the caller or returns null.',
  episodic_summary:
    'Removed 2026-08-29. Was prose assembled from the removed scores and tiers.',
} as const;

function daysOnMarket(p: Property): number | null {
  if (!p._added) return null;
  const added = new Date(p._added);
  if (Number.isNaN(added.getTime())) return null;
  const now = new Date();
  return Math.max(0, Math.round((now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24)));
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function pct(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(denominator) || denominator <= 0) return null;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

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
    const currentPrice = property.pf;

    /* ─── Valuation against the comparable set ───
     * The previous version fell back to the property's OWN price per m² when
     * it had no comparables, which made fair_value equal the asking price and
     * published a valuation gap of exactly 0.0% — a listing compared against
     * itself, reported as though it had been compared against the market.
     * With no comparables there is no comparable valuation, so it is null. */
    const compPm2s = comparables.filter(p => p.pm2 && p.pm2 > 0).map(p => p.pm2!);
    const medianPm2 = median(compPm2s);
    const fairValue = medianPm2 !== null && property.bm > 0
      ? Math.round(medianPm2 * property.bm)
      : null;
    const valuationGapPct = fairValue !== null ? pct(fairValue - currentPrice, fairValue) : null;

    /* ─── Town cross-section ─── */
    const townAvgPrice = townComps.length > 0 ? Math.round(avg(townComps.map(p => p.pf))) : null;
    const priceVsTownPct = townAvgPrice !== null
      ? pct(currentPrice - townAvgPrice, townAvgPrice)
      : null;

    /* ─── EPC, through the shared normaliser ─── */
    const epcLetter = toEpcLetter(property.energy);

    /* ─── Avena's own derived figures ─── */
    const avenaScore = property._sc ?? null;
    const grossYield = property._yield?.gross ?? null;
    const discountPct = property.pm2 && property.mm2 && property.mm2 > 0
      ? pct(property.mm2 - property.pm2, property.mm2)
      : null;

    const compDoms = comparables.map(daysOnMarket).filter((d): d is number => d !== null);

    return NextResponse.json({
      property_id: property.ref ?? null,
      property_name: `${property.p} - ${property.l}`,
      town: property.l,
      costa: property.costa ?? null,
      property_type: property.t,
      generated_at: new Date().toISOString(),
      sections: {
        valuation: {
          current_price: currentPrice,
          comparable_fair_value: fairValue,
          valuation_gap_pct: valuationGapPct,
          comparable_count: compPm2s.length,
          median_comparable_price_per_m2: medianPm2,
          basis: 'median price per m² of live listings in the same town and of the same property type, applied to this unit\'s built area',
          summary: valuationGapPct === null
            ? `No comparable listings in ${property.l} of this type carry a price per m², so no comparable valuation is available.`
            : valuationGapPct > 0
              ? `Asking price is ${valuationGapPct}% below the median of ${compPm2s.length} comparable listings.`
              : `Asking price is ${Math.abs(valuationGapPct)}% above the median of ${compPm2s.length} comparable listings.`,
        },
        market: {
          town_avg_price: townAvgPrice,
          price_vs_town_pct: priceVsTownPct,
          town_listing_count: townComps.length,
          summary: townAvgPrice === null
            ? `No other live listings in ${property.l} to compare against.`
            : `Priced ${priceVsTownPct !== null && priceVsTownPct > 0 ? `${priceVsTownPct}% above` : `${Math.abs(priceVsTownPct ?? 0)}% below`} the ${property.l} average of EUR ${townAvgPrice.toLocaleString()} across ${townComps.length} listings.`,
        },
        time_on_market: {
          this_listing_days: daysOnMarket(property),
          comparable_count: comparables.length,
          comparables_with_a_first_seen_date: compDoms.length,
          median_comparable_days_listed: median(compDoms),
          summary: 'Days since the listing first appeared in the Avena feed. Not a time-to-sale: Avena observes listings, price changes and delistings, never a completed sale.',
        },
        developer: {
          name: property.d,
          years_active: property.dy,
          summary: `${property.d}, ${property.dy} years active. Reported by the developer; Avena does not independently verify it.`,
        },
        energy: {
          epc_rating: epcLetter,
          epc_rating_raw: property.energy ?? null,
          summary: epcLetter === null
            ? 'Avena does not hold a recognised EPC letter for this listing. Request the certificate before purchase.'
            : `EPC rating ${epcLetter} as supplied in the listing.`,
        },
        scoring: {
          avena_score: avenaScore,
          gross_yield_pct: grossYield,
          discount_vs_market_pm2_pct: discountPct,
          beach_km: property.bk ?? null,
          summary: avenaScore === null
            ? 'No Avena Score derived for this listing.'
            : `Avena Score ${avenaScore}/100.`,
        },
      },
      not_published: NOT_PUBLISHED,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

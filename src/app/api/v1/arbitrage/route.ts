/**
 * Cross-market yield arbitrage — after-tax yield spreads between EU property
 * markets, for a given investor nationality.
 *
 * HONESTY REWRITE 2026-08-21. This route previously published three numbers
 * that nothing in this codebase could produce:
 *
 *   estimated_convergence_months: Math.round(12 + (2 - spread) * 6 + Math.random() * 6)
 *   confidence:                   Math.round(60 + spread * 10 + Math.random() * 10)
 *   window_remaining:             spread > 1.5 ? '3-6 months' : '6-12 months'
 *
 * There is no convergence model here, and there never was. The first two were
 * formulas over a RANDOM term, so two identical requests returned different
 * answers for the same market pair — a fabricated number that also failed to
 * hold still. `confidence` in particular asserted a degree of belief about a
 * quantity that was itself invented. Same defect class as the Math.random()
 * regional impacts removed from /api/v1/digital-twin in f00086d, and as the
 * LLM-invented signals that got precursor-scan disabled outright.
 *
 * All three are gone. They are not replaced with better-behaved invented
 * numbers: the honest output of a model that does not exist is no output.
 *
 * What remains is real arithmetic — after-tax yield = gross yield x (1 - tax
 * rate), and the spread between two markets — over inputs whose provenance is
 * now stated per market. Spain's yield and price are MEASURED from the live
 * Avena book on every request. The other nine markets are static desk
 * assumptions with no live source; they are labelled `static_assumption` in
 * the response rather than presented as observations, so a reader can tell
 * which half of any spread Avena actually knows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties } from '@/lib/properties';

export const revalidate = 86400;

type Provenance = 'measured' | 'static_assumption';

interface Market {
  name: string;
  country_code: string;
  base_yield: number;
  avg_price_eur: number;
  tax_eu_resident: number;
  tax_non_eu: number;
  property_tax_pct: number;
  yield_source: Provenance;
}

/**
 * Static desk assumptions. Tax rates are simplified headline statutory rates.
 * The yield and price figures have NO live source and are not observations —
 * hence yield_source: 'static_assumption' on every one of them. Spain is
 * overwritten with measured values below; it is the only market Avena holds
 * a book for.
 */
const MARKETS: Market[] = [
  { name: 'Spain (coastal new-build)', country_code: 'ES', base_yield: 5.2, avg_price_eur: 245000, tax_eu_resident: 19, tax_non_eu: 24, property_tax_pct: 0.5, yield_source: 'static_assumption' },
  { name: 'Portugal', country_code: 'PT', base_yield: 4.8, avg_price_eur: 280000, tax_eu_resident: 25, tax_non_eu: 25, property_tax_pct: 0.4, yield_source: 'static_assumption' },
  { name: 'Italy', country_code: 'IT', base_yield: 4.1, avg_price_eur: 220000, tax_eu_resident: 21, tax_non_eu: 30, property_tax_pct: 0.76, yield_source: 'static_assumption' },
  { name: 'Greece', country_code: 'GR', base_yield: 5.0, avg_price_eur: 180000, tax_eu_resident: 15, tax_non_eu: 15, property_tax_pct: 0.3, yield_source: 'static_assumption' },
  { name: 'France', country_code: 'FR', base_yield: 3.2, avg_price_eur: 350000, tax_eu_resident: 20, tax_non_eu: 33, property_tax_pct: 1.0, yield_source: 'static_assumption' },
  { name: 'Germany', country_code: 'DE', base_yield: 3.0, avg_price_eur: 320000, tax_eu_resident: 25, tax_non_eu: 25, property_tax_pct: 0.35, yield_source: 'static_assumption' },
  { name: 'Cyprus', country_code: 'CY', base_yield: 4.5, avg_price_eur: 260000, tax_eu_resident: 12.5, tax_non_eu: 12.5, property_tax_pct: 0.2, yield_source: 'static_assumption' },
  { name: 'Croatia', country_code: 'HR', base_yield: 4.2, avg_price_eur: 210000, tax_eu_resident: 18, tax_non_eu: 18, property_tax_pct: 0.6, yield_source: 'static_assumption' },
  { name: 'Netherlands', country_code: 'NL', base_yield: 3.5, avg_price_eur: 380000, tax_eu_resident: 30, tax_non_eu: 30, property_tax_pct: 0.1, yield_source: 'static_assumption' },
  { name: 'Malta', country_code: 'MT', base_yield: 4.0, avg_price_eur: 290000, tax_eu_resident: 15, tax_non_eu: 35, property_tax_pct: 0.2, yield_source: 'static_assumption' },
];

// EU/EEA nationality codes for tax purposes
const EU_EEA_CODES = new Set([
  'DE', 'FR', 'IT', 'ES', 'PT', 'NL', 'BE', 'AT', 'IE', 'FI',
  'SE', 'DK', 'PL', 'CZ', 'RO', 'HU', 'SK', 'BG', 'HR', 'SI',
  'LT', 'LV', 'EE', 'CY', 'LU', 'MT', 'GR', 'NO', 'IS', 'LI',
]);

function isEuEea(nationality: string): boolean {
  return EU_EEA_CODES.has(nationality.toUpperCase());
}

function median(nums: number[]): number | null {
  const s = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Spain's live figures from the Avena book.
 *
 * Returns nulls rather than zeros when the book is unreadable — a fabricated
 * 0% yield would flow straight into every spread involving Spain and be
 * indistinguishable from a real reading. The caller keeps the static
 * assumption and says so instead.
 */
function measureSpain(): { yield_pct: number | null; median_price_eur: number | null; n: number } {
  try {
    const all = getAllProperties();
    const yields = all.filter((p) => p._yield?.gross != null).map((p) => p._yield!.gross);
    const prices = all.filter((p) => Number.isFinite(p.pf) && p.pf > 0).map((p) => p.pf);
    const y = median(yields);
    const pr = median(prices);
    return {
      yield_pct: y === null ? null : Number(y.toFixed(2)),
      median_price_eur: pr === null ? null : Math.round(pr),
      n: yields.length,
    };
  } catch {
    return { yield_pct: null, median_price_eur: null, n: 0 };
  }
}

interface Opportunity {
  long_market: string;
  short_market: string;
  gross_spread: number;
  after_tax_spread: number;
  long_yield_after_tax: number;
  short_yield_after_tax: number;
  long_yield_source: Provenance;
  short_yield_source: Provenance;
  risk_factors: string[];
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const nationality = (params.get('nationality') || 'NO').toUpperCase();
  const isEu = isEuEea(nationality);

  const spain = measureSpain();
  const markets: Market[] = MARKETS.map((m) =>
    m.country_code === 'ES' && spain.yield_pct !== null
      ? {
          ...m,
          base_yield: spain.yield_pct,
          avg_price_eur: spain.median_price_eur ?? m.avg_price_eur,
          yield_source: 'measured' as Provenance,
        }
      : m
  );

  const opportunities: Opportunity[] = [];

  for (let i = 0; i < markets.length; i++) {
    for (let j = 0; j < markets.length; j++) {
      if (i === j) continue;
      const longMkt = markets[i];
      const shortMkt = markets[j];

      const longTaxRate = isEu ? longMkt.tax_eu_resident : longMkt.tax_non_eu;
      const shortTaxRate = isEu ? shortMkt.tax_eu_resident : shortMkt.tax_non_eu;

      const longAfterTax = longMkt.base_yield * (1 - longTaxRate / 100);
      const shortAfterTax = shortMkt.base_yield * (1 - shortTaxRate / 100);

      const grossSpread = longMkt.base_yield - shortMkt.base_yield;
      const afterTaxSpread = longAfterTax - shortAfterTax;

      if (afterTaxSpread <= 0) continue;

      const riskFactors: string[] = [];
      if (longMkt.base_yield > 5) riskFactors.push('High yield may indicate higher vacancy risk');
      if (!isEu) riskFactors.push('Non-EU tax rates apply — may reduce effective returns');
      if (grossSpread > 2) riskFactors.push('Wide spread may indicate structural market differences');
      if (longMkt.property_tax_pct > 0.5) riskFactors.push(`${longMkt.name} property tax ${longMkt.property_tax_pct}% reduces net returns`);
      if (longMkt.yield_source === 'static_assumption' || shortMkt.yield_source === 'static_assumption') {
        riskFactors.push('Spread rests on at least one static yield assumption, not an observed market');
      }
      if (longMkt.country_code === 'ES' || shortMkt.country_code === 'ES') {
        riskFactors.push('Not like-for-like: the Spanish figure is measured on coastal new-build specifically, while the other market is a national desk assumption');
      }

      opportunities.push({
        long_market: longMkt.name,
        short_market: shortMkt.name,
        gross_spread: Number(grossSpread.toFixed(2)),
        after_tax_spread: Number(afterTaxSpread.toFixed(2)),
        long_yield_after_tax: Number(longAfterTax.toFixed(2)),
        short_yield_after_tax: Number(shortAfterTax.toFixed(2)),
        long_yield_source: longMkt.yield_source,
        short_yield_source: shortMkt.yield_source,
        risk_factors: riskFactors,
      });
    }
  }

  opportunities.sort((a, b) => b.after_tax_spread - a.after_tax_spread);
  const top5 = opportunities.slice(0, 5);

  const spreads = top5.map((o) => o.after_tax_spread);
  const avgSpread = spreads.length
    ? Number((spreads.reduce((s, x) => s + x, 0) / spreads.length).toFixed(2))
    : null;

  return NextResponse.json({
    nationality,
    eu_eea_resident: isEu,
    tax_treatment: isEu ? 'EU/EEA resident rates' : 'Non-EU rates',
    opportunities: top5,
    markets_analyzed: markets.length,
    pairs_evaluated: markets.length * (markets.length - 1),
    avg_top5_spread: avgSpread,
    methodology: 'cross_market_yield_arbitrage',
    assumptions: {
      spain_yield_pct: spain.yield_pct,
      spain_yield_basis: spain.yield_pct === null
        ? 'live book unreadable — Spain fell back to the static assumption'
        : `median gross yield across ${spain.n} live Avena listings`,
      spain_median_price_eur: spain.median_price_eur,
      comparability: 'LIMITED. The Spanish row measures coastal new-build only — a premium segment with higher prices and lower gross yields than Spain nationally. The other nine rows are national desk assumptions. Any spread involving Spain therefore compares a segment against a country and should not be read as a national yield differential. Avena holds a book for Spanish coastal new-build and does not claim national coverage for any market.',
      other_markets: 'Static desk assumptions. Yield and price figures for the nine non-Spanish markets have no live source and are not observations.',
      tax_rates: 'Simplified headline statutory rates, not modelled per-structure.',
      no_convergence_model: 'Avena publishes no estimate of if or when a spread closes. Convergence timing, a confidence score and a closing window were previously emitted here from a formula containing Math.random(); they were removed 2026-08-21 rather than replaced, because no model backs them.',
    },
    source: 'Avena Terminal',
    disclaimer: 'Not financial advice. Tax rates are simplified estimates. Consult a qualified tax advisor for your specific situation.',
    timestamp: new Date().toISOString(),
  });
}

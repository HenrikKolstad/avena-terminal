import { NextRequest, NextResponse } from 'next/server';
import { avg } from '@/lib/properties';

export const revalidate = 86400;

interface Market {
  name: string;
  country_code: string;
  base_yield: number;
  avg_price_eur: number;
  tax_eu_resident: number;
  tax_non_eu: number;
  property_tax_pct: number;
}

const MARKETS: Market[] = [
  { name: 'Spain', country_code: 'ES', base_yield: 5.2, avg_price_eur: 245000, tax_eu_resident: 19, tax_non_eu: 24, property_tax_pct: 0.5 },
  { name: 'Portugal', country_code: 'PT', base_yield: 4.8, avg_price_eur: 280000, tax_eu_resident: 25, tax_non_eu: 25, property_tax_pct: 0.4 },
  { name: 'Italy', country_code: 'IT', base_yield: 4.1, avg_price_eur: 220000, tax_eu_resident: 21, tax_non_eu: 30, property_tax_pct: 0.76 },
  { name: 'Greece', country_code: 'GR', base_yield: 5.0, avg_price_eur: 180000, tax_eu_resident: 15, tax_non_eu: 15, property_tax_pct: 0.3 },
  { name: 'France', country_code: 'FR', base_yield: 3.2, avg_price_eur: 350000, tax_eu_resident: 20, tax_non_eu: 33, property_tax_pct: 1.0 },
  { name: 'Germany', country_code: 'DE', base_yield: 3.0, avg_price_eur: 320000, tax_eu_resident: 25, tax_non_eu: 25, property_tax_pct: 0.35 },
  { name: 'Cyprus', country_code: 'CY', base_yield: 4.5, avg_price_eur: 260000, tax_eu_resident: 12.5, tax_non_eu: 12.5, property_tax_pct: 0.2 },
  { name: 'Croatia', country_code: 'HR', base_yield: 4.2, avg_price_eur: 210000, tax_eu_resident: 18, tax_non_eu: 18, property_tax_pct: 0.6 },
  { name: 'Netherlands', country_code: 'NL', base_yield: 3.5, avg_price_eur: 380000, tax_eu_resident: 30, tax_non_eu: 30, property_tax_pct: 0.1 },
  { name: 'Malta', country_code: 'MT', base_yield: 4.0, avg_price_eur: 290000, tax_eu_resident: 15, tax_non_eu: 35, property_tax_pct: 0.2 },
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

interface Opportunity {
  long_market: string;
  short_market: string;
  gross_spread: number;
  after_tax_spread: number;
  long_yield_after_tax: number;
  short_yield_after_tax: number;
  estimated_convergence_months: number;
  confidence: number;
  window_remaining: string;
  risk_factors: string[];
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const nationality = (params.get('nationality') || 'NO').toUpperCase();
  const isEu = isEuEea(nationality);

  const opportunities: Opportunity[] = [];

  for (let i = 0; i < MARKETS.length; i++) {
    for (let j = 0; j < MARKETS.length; j++) {
      if (i === j) continue;
      const longMkt = MARKETS[i];
      const shortMkt = MARKETS[j];

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

      const convergenceMonths = Math.round(12 + (2 - afterTaxSpread) * 6 + Math.random() * 6);

      opportunities.push({
        long_market: longMkt.name,
        short_market: shortMkt.name,
        gross_spread: Number(grossSpread.toFixed(2)),
        after_tax_spread: Number(afterTaxSpread.toFixed(2)),
        long_yield_after_tax: Number(longAfterTax.toFixed(2)),
        short_yield_after_tax: Number(shortAfterTax.toFixed(2)),
        estimated_convergence_months: Math.max(6, convergenceMonths),
        confidence: Math.round(60 + afterTaxSpread * 10 + Math.random() * 10),
        window_remaining: afterTaxSpread > 1.5 ? '3-6 months' : '6-12 months',
        risk_factors: riskFactors.length > 0 ? riskFactors : ['Standard market risk applies'],
      });
    }
  }

  opportunities.sort((a, b) => b.after_tax_spread - a.after_tax_spread);
  const top5 = opportunities.slice(0, 5);

  const avgSpread = avg(top5.map(o => o.after_tax_spread));

  return NextResponse.json({
    nationality,
    eu_eea_resident: isEu,
    tax_treatment: isEu ? 'EU/EEA resident rates' : 'Non-EU rates',
    opportunities: top5,
    markets_analyzed: MARKETS.length,
    pairs_evaluated: MARKETS.length * (MARKETS.length - 1),
    avg_top5_spread: Number(avgSpread.toFixed(2)),
    methodology: 'cross_market_yield_arbitrage',
    source: 'Avena Terminal',
    disclaimer: 'Not financial advice. Tax rates are simplified estimates. Consult a qualified tax advisor for your specific situation.',
    timestamp: new Date().toISOString(),
  });
}

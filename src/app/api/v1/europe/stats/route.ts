import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 86400;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
};

interface CountryStats {
  avg_price_m2: number;
  yoy_change: number;
  avg_yield: number;
  foreign_buyer_pct: number;
  new_build_permits_yoy: number;
  mortgage_rate: number;
  property_tax_pct: number;
  transaction_costs_pct: number;
}

interface CountryEntry {
  country: string;
  currency: string;
  stats: CountryStats;
}

const EU_STATS: Record<string, CountryEntry> = {
  es: { country: 'Spain', currency: 'EUR', stats: { avg_price_m2: 2890, yoy_change: 8.3, avg_yield: 5.2, foreign_buyer_pct: 19.3, new_build_permits_yoy: 12.4, mortgage_rate: 2.8, property_tax_pct: 0.4, transaction_costs_pct: 13 } },
  pt: { country: 'Portugal', currency: 'EUR', stats: { avg_price_m2: 3200, yoy_change: 7.1, avg_yield: 4.8, foreign_buyer_pct: 24.1, new_build_permits_yoy: 8.2, mortgage_rate: 3.1, property_tax_pct: 0.5, transaction_costs_pct: 10 } },
  it: { country: 'Italy', currency: 'EUR', stats: { avg_price_m2: 2200, yoy_change: 3.8, avg_yield: 4.1, foreign_buyer_pct: 8.7, new_build_permits_yoy: 4.1, mortgage_rate: 3.4, property_tax_pct: 0.6, transaction_costs_pct: 11 } },
  gr: { country: 'Greece', currency: 'EUR', stats: { avg_price_m2: 1900, yoy_change: 5.9, avg_yield: 5.0, foreign_buyer_pct: 15.2, new_build_permits_yoy: 9.3, mortgage_rate: 3.8, property_tax_pct: 0.3, transaction_costs_pct: 12 } },
  fr: { country: 'France', currency: 'EUR', stats: { avg_price_m2: 4500, yoy_change: 2.1, avg_yield: 3.2, foreign_buyer_pct: 6.4, new_build_permits_yoy: -2.1, mortgage_rate: 3.2, property_tax_pct: 1.2, transaction_costs_pct: 8 } },
  de: { country: 'Germany', currency: 'EUR', stats: { avg_price_m2: 3800, yoy_change: -1.2, avg_yield: 3.0, foreign_buyer_pct: 4.8, new_build_permits_yoy: -8.4, mortgage_rate: 3.5, property_tax_pct: 0.8, transaction_costs_pct: 10 } },
  nl: { country: 'Netherlands', currency: 'EUR', stats: { avg_price_m2: 4200, yoy_change: 4.5, avg_yield: 3.5, foreign_buyer_pct: 3.2, new_build_permits_yoy: 2.8, mortgage_rate: 3.0, property_tax_pct: 0.5, transaction_costs_pct: 6 } },
  cy: { country: 'Cyprus', currency: 'EUR', stats: { avg_price_m2: 2500, yoy_change: 6.2, avg_yield: 4.5, foreign_buyer_pct: 28.3, new_build_permits_yoy: 11.7, mortgage_rate: 3.6, property_tax_pct: 0.2, transaction_costs_pct: 9 } },
  hr: { country: 'Croatia', currency: 'EUR', stats: { avg_price_m2: 2100, yoy_change: 7.8, avg_yield: 4.2, foreign_buyer_pct: 18.9, new_build_permits_yoy: 6.5, mortgage_rate: 4.1, property_tax_pct: 0.3, transaction_costs_pct: 7 } },
  mt: { country: 'Malta', currency: 'EUR', stats: { avg_price_m2: 3500, yoy_change: 5.1, avg_yield: 4.0, foreign_buyer_pct: 22.1, new_build_permits_yoy: 3.8, mortgage_rate: 3.3, property_tax_pct: 0.2, transaction_costs_pct: 8 } },
};

function buildRankings() {
  const entries = Object.entries(EU_STATS).map(([code, data]) => ({
    code,
    ...data,
  }));

  const bestYield = [...entries].sort((a, b) => b.stats.avg_yield - a.stats.avg_yield)[0];
  const fastestGrowth = [...entries].sort((a, b) => b.stats.yoy_change - a.stats.yoy_change)[0];
  const cheapest = [...entries].sort((a, b) => a.stats.avg_price_m2 - b.stats.avg_price_m2)[0];
  const mostForeignFriendly = [...entries].sort((a, b) => b.stats.foreign_buyer_pct - a.stats.foreign_buyer_pct)[0];

  return {
    best_yield: { code: bestYield.code, country: bestYield.country, value: bestYield.stats.avg_yield },
    fastest_growth: { code: fastestGrowth.code, country: fastestGrowth.country, value: fastestGrowth.stats.yoy_change },
    cheapest: { code: cheapest.code, country: cheapest.country, value: cheapest.stats.avg_price_m2 },
    most_foreign_friendly: { code: mostForeignFriendly.code, country: mostForeignFriendly.country, value: mostForeignFriendly.stats.foreign_buyer_pct },
  };
}

export function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country')?.toLowerCase();

    if (country) {
      const data = EU_STATS[country];
      if (!data) {
        return NextResponse.json(
          { error: `Unknown country code: ${country}. Valid codes: ${Object.keys(EU_STATS).join(', ')}` },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      return NextResponse.json(
        {
          code: country,
          ...data,
          source: 'Avena Terminal + Eurostat + national statistics',
          date: new Date().toISOString().split('T')[0],
        },
        { headers: CORS_HEADERS }
      );
    }

    const countries = Object.entries(EU_STATS).map(([code, data]) => ({
      code,
      ...data,
    }));

    return NextResponse.json(
      {
        total: countries.length,
        countries,
        rankings: buildRankings(),
        source: 'Avena Terminal + Eurostat + national statistics',
        date: new Date().toISOString().split('T')[0],
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
}

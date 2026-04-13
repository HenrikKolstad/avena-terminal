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

interface RankedEntry {
  rank: number;
  code: string;
  country: string;
  value: number;
  unit: string;
}

function rankBy(
  metric: keyof CountryStats,
  ascending: boolean,
  unit: string
): RankedEntry[] {
  const entries = Object.entries(EU_STATS).map(([code, data]) => ({
    code,
    country: data.country,
    value: data.stats[metric],
  }));

  entries.sort((a, b) => (ascending ? a.value - b.value : b.value - a.value));

  return entries.map((e, i) => ({
    rank: i + 1,
    code: e.code,
    country: e.country,
    value: e.value,
    unit,
  }));
}

function computeOverallScore(stats: CountryStats): number {
  // Normalize each dimension to 0-100 scale
  const allStats = Object.values(EU_STATS).map((e) => e.stats);

  const maxYield = Math.max(...allStats.map((s) => s.avg_yield));
  const minYield = Math.min(...allStats.map((s) => s.avg_yield));
  const yieldScore = maxYield === minYield ? 50 : ((stats.avg_yield - minYield) / (maxYield - minYield)) * 100;

  const maxGrowth = Math.max(...allStats.map((s) => s.yoy_change));
  const minGrowth = Math.min(...allStats.map((s) => s.yoy_change));
  const growthScore = maxGrowth === minGrowth ? 50 : ((stats.yoy_change - minGrowth) / (maxGrowth - minGrowth)) * 100;

  const maxPrice = Math.max(...allStats.map((s) => s.avg_price_m2));
  const minPrice = Math.min(...allStats.map((s) => s.avg_price_m2));
  const valueScore = maxPrice === minPrice ? 50 : ((maxPrice - stats.avg_price_m2) / (maxPrice - minPrice)) * 100;

  const maxForeign = Math.max(...allStats.map((s) => s.foreign_buyer_pct));
  const minForeign = Math.min(...allStats.map((s) => s.foreign_buyer_pct));
  const foreignScore = maxForeign === minForeign ? 50 : ((stats.foreign_buyer_pct - minForeign) / (maxForeign - minForeign)) * 100;

  const maxCosts = Math.max(...allStats.map((s) => s.transaction_costs_pct));
  const minCosts = Math.min(...allStats.map((s) => s.transaction_costs_pct));
  const costsScore = maxCosts === minCosts ? 50 : ((maxCosts - stats.transaction_costs_pct) / (maxCosts - minCosts)) * 100;

  return Math.round(
    yieldScore * 0.30 +
    growthScore * 0.25 +
    valueScore * 0.20 +
    foreignScore * 0.15 +
    costsScore * 0.10
  );
}

interface OverallRankedEntry {
  rank: number;
  code: string;
  country: string;
  overall_score: number;
  breakdown: {
    yield_score: number;
    growth_score: number;
    value_score: number;
    foreign_friendly_score: number;
    costs_score: number;
  };
}

function computeOverallRankings(): OverallRankedEntry[] {
  const allStats = Object.values(EU_STATS).map((e) => e.stats);

  const maxYield = Math.max(...allStats.map((s) => s.avg_yield));
  const minYield = Math.min(...allStats.map((s) => s.avg_yield));
  const maxGrowth = Math.max(...allStats.map((s) => s.yoy_change));
  const minGrowth = Math.min(...allStats.map((s) => s.yoy_change));
  const maxPrice = Math.max(...allStats.map((s) => s.avg_price_m2));
  const minPrice = Math.min(...allStats.map((s) => s.avg_price_m2));
  const maxForeign = Math.max(...allStats.map((s) => s.foreign_buyer_pct));
  const minForeign = Math.min(...allStats.map((s) => s.foreign_buyer_pct));
  const maxCosts = Math.max(...allStats.map((s) => s.transaction_costs_pct));
  const minCosts = Math.min(...allStats.map((s) => s.transaction_costs_pct));

  const entries = Object.entries(EU_STATS).map(([code, data]) => {
    const s = data.stats;
    const yieldScore = Math.round(((s.avg_yield - minYield) / (maxYield - minYield)) * 100);
    const growthScore = Math.round(((s.yoy_change - minGrowth) / (maxGrowth - minGrowth)) * 100);
    const valueScore = Math.round(((maxPrice - s.avg_price_m2) / (maxPrice - minPrice)) * 100);
    const foreignScore = Math.round(((s.foreign_buyer_pct - minForeign) / (maxForeign - minForeign)) * 100);
    const costsScore = Math.round(((maxCosts - s.transaction_costs_pct) / (maxCosts - minCosts)) * 100);

    const overall = Math.round(
      yieldScore * 0.30 +
      growthScore * 0.25 +
      valueScore * 0.20 +
      foreignScore * 0.15 +
      costsScore * 0.10
    );

    return {
      code,
      country: data.country,
      overall_score: overall,
      breakdown: {
        yield_score: yieldScore,
        growth_score: growthScore,
        value_score: valueScore,
        foreign_friendly_score: foreignScore,
        costs_score: costsScore,
      },
    };
  });

  entries.sort((a, b) => b.overall_score - a.overall_score);

  return entries.map((e, i) => ({ rank: i + 1, ...e }));
}

export function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(_request: NextRequest) {
  try {
    const rankings = {
      cheapest: rankBy('avg_price_m2', true, 'EUR/m2'),
      best_yield: rankBy('avg_yield', false, '%'),
      fastest_growth: rankBy('yoy_change', false, '% YoY'),
      most_foreign_friendly: rankBy('foreign_buyer_pct', false, '% foreign buyers'),
      lowest_costs: rankBy('transaction_costs_pct', true, '% transaction costs'),
      overall_best: computeOverallRankings(),
    };

    return NextResponse.json(
      {
        rankings_by: rankings,
        methodology: {
          overall_weights: {
            yield: '30%',
            growth: '25%',
            value: '20%',
            foreign_friendly: '15%',
            costs: '10%',
          },
          scoring: 'Each dimension is normalized to 0-100 across the 10 countries, then weighted to produce an overall score.',
          data_period: 'Q1 2026 rolling 12-month averages',
        },
        source: 'Avena Terminal European Intelligence',
        date: new Date().toISOString().split('T')[0],
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
}

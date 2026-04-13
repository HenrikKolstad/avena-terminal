import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

interface ComparisonRequest {
  markets: string[];
  budget?: number;
  nationality?: string;
  priority?: 'yield' | 'growth' | 'value' | 'lifestyle';
}

interface MarketRow {
  code: string;
  country: string;
  currency: string;
  avg_price_m2: number;
  yoy_change: number;
  avg_yield: number;
  foreign_buyer_pct: number;
  mortgage_rate: number;
  transaction_costs_pct: number;
  budget_buys_m2: number | null;
}

function determineBestMatch(rows: MarketRow[], priority: string): { code: string; country: string; reasoning: string } {
  let sorted: MarketRow[];
  let reasoning: string;

  switch (priority) {
    case 'yield':
      sorted = [...rows].sort((a, b) => b.avg_yield - a.avg_yield);
      reasoning = `${sorted[0].country} offers the highest rental yield at ${sorted[0].avg_yield}%, making it the best income-generating market among those compared.`;
      break;
    case 'growth':
      sorted = [...rows].sort((a, b) => b.yoy_change - a.yoy_change);
      reasoning = `${sorted[0].country} leads with ${sorted[0].yoy_change}% year-over-year price growth, indicating the strongest capital appreciation potential.`;
      break;
    case 'value':
      sorted = [...rows].sort((a, b) => a.avg_price_m2 - b.avg_price_m2);
      reasoning = `${sorted[0].country} offers the lowest average price at EUR ${sorted[0].avg_price_m2}/m2, providing the best value entry point.`;
      break;
    case 'lifestyle':
    default: {
      const scored = rows.map((r) => ({
        ...r,
        score: r.avg_yield * 0.25 + r.yoy_change * 0.2 + (1 / r.avg_price_m2) * 100000 * 0.2 + r.foreign_buyer_pct * 0.2 + (20 - r.transaction_costs_pct) * 0.15,
      }));
      scored.sort((a, b) => b.score - a.score);
      sorted = scored;
      reasoning = `${scored[0].country} scores highest on a weighted lifestyle composite (yield, growth, value, foreign-friendliness, and low costs).`;
      break;
    }
  }

  return { code: sorted[0].code, country: sorted[0].country, reasoning };
}

export function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ComparisonRequest;

    if (!body.markets || !Array.isArray(body.markets) || body.markets.length < 2) {
      return NextResponse.json(
        { error: 'Provide at least 2 market codes in the "markets" array. Valid codes: ' + Object.keys(EU_STATS).join(', ') },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const invalid = body.markets.filter((m) => !EU_STATS[m.toLowerCase()]);
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Unknown market codes: ${invalid.join(', ')}. Valid codes: ${Object.keys(EU_STATS).join(', ')}` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const priority = body.priority || 'lifestyle';
    const budget = body.budget ?? null;

    const comparisonTable: MarketRow[] = body.markets.map((code) => {
      const key = code.toLowerCase();
      const entry = EU_STATS[key];
      return {
        code: key,
        country: entry.country,
        currency: entry.currency,
        avg_price_m2: entry.stats.avg_price_m2,
        yoy_change: entry.stats.yoy_change,
        avg_yield: entry.stats.avg_yield,
        foreign_buyer_pct: entry.stats.foreign_buyer_pct,
        mortgage_rate: entry.stats.mortgage_rate,
        transaction_costs_pct: entry.stats.transaction_costs_pct,
        budget_buys_m2: budget ? Math.round(budget / entry.stats.avg_price_m2) : null,
      };
    });

    const bestMatch = determineBestMatch(comparisonTable, priority);

    const budgetInsight = budget
      ? `With a budget of EUR ${budget.toLocaleString()}, you can acquire between ${Math.min(...comparisonTable.map((r) => r.budget_buys_m2!))}-${Math.max(...comparisonTable.map((r) => r.budget_buys_m2!))} m2 across these markets.`
      : null;

    return NextResponse.json(
      {
        markets_compared: body.markets.length,
        priority,
        nationality: body.nationality || null,
        budget: budget ? { eur: budget, insight: budgetInsight } : null,
        comparison_table: comparisonTable,
        best_match: bestMatch,
        avena_verdict: `Based on your ${priority} priority, ${bestMatch.country} is the recommended market. ${bestMatch.reasoning}`,
        source: 'Avena Terminal European Comparison Engine',
        date: new Date().toISOString().split('T')[0],
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
}

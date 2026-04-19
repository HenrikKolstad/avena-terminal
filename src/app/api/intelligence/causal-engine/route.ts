/**
 * GET /api/intelligence/causal-engine?market=costa_blanca
 *
 * Returns the full causal picture for a market:
 *   - grouped indicators by category
 *   - net signal + confidence rollup
 *   - latest causal chain
 *   - latest market-level adversarial debate
 */

import { NextRequest } from 'next/server';
import {
  loadIndicators,
  groupByCategory,
  rollupNetSignal,
  latestChainForMarket,
  latestMarketDebate,
} from '@/lib/causal-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const market = req.nextUrl.searchParams.get('market') || 'all_spain';
  const indicators = await loadIndicators(market);
  const grouped = groupByCategory(indicators);
  const rollup = rollupNetSignal(indicators);
  const chain = await latestChainForMarket(market);
  const debate = await latestMarketDebate(market);

  return Response.json(
    {
      market,
      generated_at: new Date().toISOString(),
      net_signal: rollup.net,
      confidence: rollup.confidence,
      bull_count: rollup.bull_count,
      bear_count: rollup.bear_count,
      neutral_count: rollup.neutral_count,
      indicators_by_category: grouped,
      causal_chain: chain,
      latest_debate: debate,
      source: 'Avena Terminal — Causal Intelligence Engine',
      doi: '10.5281/zenodo.19520064',
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}

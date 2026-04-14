import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

interface AssetClass {
  return: number;
  volatility: number;
  name: string;
}

const ASSET_CLASSES: Record<string, AssetClass> = {
  cb_south_apartments: { return: 5.2, volatility: 12, name: 'Costa Blanca South Apartments' },
  cb_north_villas: { return: 4.8, volatility: 15, name: 'Costa Blanca North Villas' },
  costa_del_sol: { return: 4.5, volatility: 10, name: 'Costa del Sol Mixed' },
  costa_calida: { return: 5.8, volatility: 18, name: 'Costa Calida Value' },
  portugal_algarve: { return: 4.1, volatility: 8, name: 'Algarve (est.)' },
  lisbon_city: { return: 3.8, volatility: 7, name: 'Lisbon City (est.)' },
};

const RISK_FREE = 2.35;

export async function POST(req: NextRequest) {
  let body: { budget?: number; risk_tolerance?: string; regions?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const budget = body.budget;
  const risk_tolerance = body.risk_tolerance as 'low' | 'medium' | 'high' | undefined;

  if (!budget || typeof budget !== 'number' || budget <= 0) {
    return Response.json({ error: 'Missing or invalid budget' }, { status: 400 });
  }
  if (!risk_tolerance || !['low', 'medium', 'high'].includes(risk_tolerance)) {
    return Response.json({ error: 'risk_tolerance must be low, medium, or high' }, { status: 400 });
  }

  // Filter by regions if provided
  let assets = Object.entries(ASSET_CLASSES);
  if (body.regions && body.regions.length > 0) {
    const regionSet = new Set(body.regions.map(r => r.toLowerCase()));
    assets = assets.filter(([key]) => regionSet.has(key));
    if (assets.length === 0) {
      assets = Object.entries(ASSET_CLASSES);
    }
  }

  // Compute Sharpe ratio for each asset
  const assetSharpe = assets.map(([key, ac]) => ({
    key,
    ...ac,
    sharpe: (ac.return - RISK_FREE) / ac.volatility,
  }));

  // Allocate weights based on risk tolerance
  let weights: Record<string, number> = {};

  if (risk_tolerance === 'low') {
    // Maximize sharpe, filter assets with volatility < 10
    const eligible = assetSharpe.filter(a => a.volatility < 10);
    const pool = eligible.length > 0 ? eligible : assetSharpe;
    const totalSharpe = pool.reduce((s, a) => s + Math.max(a.sharpe, 0.01), 0);
    for (const a of pool) {
      weights[a.key] = Math.max(a.sharpe, 0.01) / totalSharpe;
    }
  } else if (risk_tolerance === 'medium') {
    // Maximize return with volatility < 15
    const eligible = assetSharpe.filter(a => a.volatility < 15);
    const pool = eligible.length > 0 ? eligible : assetSharpe;
    const totalReturn = pool.reduce((s, a) => s + a.return, 0);
    for (const a of pool) {
      weights[a.key] = a.return / totalReturn;
    }
  } else {
    // High risk: maximize return
    const totalReturn = assetSharpe.reduce((s, a) => s + a.return, 0);
    for (const a of assetSharpe) {
      weights[a.key] = a.return / totalReturn;
    }
  }

  // Normalize weights to sum to 1
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  for (const key of Object.keys(weights)) {
    weights[key] = weights[key] / totalWeight;
  }

  // Build portfolio
  const portfolio = Object.entries(weights).map(([key, weight]) => {
    const ac = ASSET_CLASSES[key];
    return {
      asset: key,
      name: ac.name,
      weight_pct: Number((weight * 100).toFixed(1)),
      allocation_eur: Math.round(budget * weight),
      expected_return: ac.return,
      volatility: ac.volatility,
    };
  }).sort((a, b) => b.weight_pct - a.weight_pct);

  // Compute portfolio-level metrics
  const expected_return = portfolio.reduce((s, p) => s + (p.weight_pct / 100) * p.expected_return, 0);
  const portfolio_volatility = Math.sqrt(
    portfolio.reduce((s, p) => s + Math.pow((p.weight_pct / 100) * p.volatility, 2), 0)
  );
  const sharpe_ratio = (expected_return - RISK_FREE) / portfolio_volatility;

  return Response.json({
    budget,
    risk_tolerance,
    portfolio,
    summary: {
      expected_return: Number(expected_return.toFixed(2)),
      volatility: Number(portfolio_volatility.toFixed(2)),
      sharpe_ratio: Number(sharpe_ratio.toFixed(3)),
    },
    efficient_frontier_note: 'Simplified allocation — full mean-variance optimization requires covariance matrix from historical data',
    methodology: 'Modern Portfolio Theory (Markowitz)',
  });
}

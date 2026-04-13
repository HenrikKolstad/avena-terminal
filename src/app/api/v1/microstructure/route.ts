import { NextRequest } from 'next/server';
import { getAllProperties, getUniqueCostas, avg, slugify } from '@/lib/properties';

export const dynamic = 'force-dynamic';

const ABSORPTION_RATES: Record<string, number> = {
  'costa-blanca-south': 4.2,
  'costa-blanca-north': 3.8,
  'costa-calida': 3.1,
  'costa-del-sol': 5.1,
};

type Regime = 'SELLER_MARKET' | 'BUYER_MARKET' | 'BALANCED' | 'TRANSITIONING';

function deriveRegime(absorptionRate: number, spread: number): Regime {
  if (absorptionRate > 4 && spread < 10) return 'SELLER_MARKET';
  if (absorptionRate < 3 && spread > 15) return 'BUYER_MARKET';
  if (absorptionRate >= 3 && absorptionRate <= 4 && spread >= 10 && spread <= 15) return 'BALANCED';
  return 'TRANSITIONING';
}

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get('region');
  if (!region) {
    return Response.json({ error: 'Missing ?region= parameter (e.g. costa-blanca-south)' }, { status: 400 });
  }

  try {
    const all = getAllProperties();
    const regionSlug = slugify(region);

    // Filter properties by costa region
    const regionProps = all.filter(p => p.costa && slugify(p.costa) === regionSlug);

    if (regionProps.length === 0) {
      const available = getUniqueCostas().map(c => slugify(c.costa));
      return Response.json(
        { error: `No properties found for region '${region}'`, available_regions: available },
        { status: 404 }
      );
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Bid-ask spread: average discount % as proxy
    const discounts = regionProps
      .filter(p => p.pm2 && p.mm2 && p.mm2 > 0)
      .map(p => Math.abs(((p.pm2! - p.mm2) / p.mm2) * 100));
    const bidAskSpread = Number(avg(discounts).toFixed(1));

    // Price discovery rounds (hardcoded avg for now)
    const priceDiscoveryRounds = 2.3;

    // Time to liquidity: avg days on market from _added field
    const daysOnMarket = regionProps
      .filter(p => p._added)
      .map(p => {
        const added = new Date(p._added!).getTime();
        return Math.max(0, Math.round((now - added) / (1000 * 60 * 60 * 24)));
      });
    const timeToLiquidity = daysOnMarket.length > 0 ? Math.round(avg(daysOnMarket)) : null;

    // Market depth
    const marketDepth = regionProps.length;

    // Order flow imbalance: ratio of new listings (last 7 days) vs total
    const newListings = regionProps.filter(p => {
      if (!p._added) return false;
      return new Date(p._added).getTime() >= sevenDaysAgo;
    }).length;
    const orderFlowImbalance = marketDepth > 0
      ? Number((newListings / marketDepth).toFixed(4))
      : 0;

    // Absorption rate from lookup
    const absorptionRate = ABSORPTION_RATES[regionSlug] ?? 3.5;

    // Derive regime
    const regime = deriveRegime(absorptionRate, bidAskSpread);

    // Microstructure signal: composite
    const microstructureSignal =
      regime === 'SELLER_MARKET' ? 'STRONG_BUY' :
      regime === 'BUYER_MARKET' ? 'ACCUMULATE' :
      regime === 'BALANCED' ? 'HOLD' : 'MONITOR';

    return Response.json({
      segment: region,
      metrics: {
        bid_ask_spread: bidAskSpread,
        price_discovery_rounds: priceDiscoveryRounds,
        time_to_liquidity_days: timeToLiquidity,
        market_depth: marketDepth,
        order_flow_imbalance: orderFlowImbalance,
        new_listings_7d: newListings,
        absorption_rate_pct: absorptionRate,
      },
      regime,
      microstructure_signal: microstructureSignal,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      { error: 'Microstructure computation failed', detail: String(err) },
      { status: 500 }
    );
  }
}

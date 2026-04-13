import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, getUniqueCostas, avg, slugify } from '@/lib/properties';
import { Property } from '@/lib/types';

export const dynamic = 'force-dynamic';

function daysOnMarket(p: Property): number | null {
  if (!p._added) return null;
  const added = new Date(p._added);
  const now = new Date();
  return Math.max(0, Math.round((now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24)));
}

function daysOnMarketScore(dom: number | null): number {
  if (dom == null) return 50; // neutral if unknown
  if (dom > 120) return 70;  // motivated seller
  if (dom >= 60) return 50;
  return 30;
}

function priceSignalScore(p: Property): number {
  if (!p.pm2 || !p.mm2 || p.mm2 === 0) return 40;
  const discount = ((p.mm2 - p.pm2) / p.mm2) * 100;
  if (discount > 15) return 80;
  if (discount > 10) return 60;
  return 40;
}

function scoreAttractiveness(p: Property): number {
  const sc = p._sc ?? 0;
  if (sc > 70) return 80;
  if (sc > 60) return 60;
  return 40;
}

function computeTransactionProbability(p: Property): number {
  const dom = daysOnMarket(p);
  const domScore = daysOnMarketScore(dom);
  const priceScore = priceSignalScore(p);
  const developerInventory = 50;
  const regimeBoost = 65;
  const seasonal = 75; // April Q2 peak
  const attractiveness = scoreAttractiveness(p);

  return Math.round(
    domScore * 0.25 +
    priceScore * 0.25 +
    regimeBoost * 0.15 +
    seasonal * 0.10 +
    attractiveness * 0.15 +
    developerInventory * 0.10
  );
}

function keySignals(p: Property): string[] {
  const signals: string[] = [];
  const dom = daysOnMarket(p);

  if (dom != null && dom > 120) signals.push(`Listed ${dom} days - motivated seller`);
  if (p.pm2 && p.mm2 && p.mm2 > 0) {
    const discount = ((p.mm2 - p.pm2) / p.mm2) * 100;
    if (discount > 15) signals.push(`${discount.toFixed(1)}% below market - strong price signal`);
    else if (discount > 10) signals.push(`${discount.toFixed(1)}% below market - moderate price signal`);
  }
  if ((p._sc ?? 0) > 70) signals.push(`High Avena Score (${p._sc})`);
  signals.push('Q2 seasonal peak starting');
  signals.push('GROWTH market regime active');
  if (p._yield && p._yield.gross > 6) signals.push(`Strong yield at ${p._yield.gross.toFixed(1)}%`);

  return signals;
}

function estimatedWindow(prob: number): string {
  if (prob >= 70) return '1-2 weeks';
  if (prob >= 55) return '2-6 weeks';
  if (prob >= 40) return '6-12 weeks';
  return '12+ weeks';
}

export async function GET(request: NextRequest) {
  try {
    const regionParam = request.nextUrl.searchParams.get('region');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50;

    let properties = getAllProperties();

    // Filter by region (costa) if provided
    if (regionParam) {
      const regionSlug = slugify(regionParam);
      const costas = getUniqueCostas();
      const matchedCosta = costas.find(c => c.slug === regionSlug);
      if (matchedCosta) {
        properties = properties.filter(p => p.costa && slugify(p.costa) === regionSlug);
      } else {
        // Try matching by town
        properties = properties.filter(p => slugify(p.l) === regionSlug);
      }
    }

    const scored = properties.map(p => ({
      ref: p.ref ?? null,
      name: `${p.p} - ${p.l}`,
      type: p.t,
      price: p.pf,
      location: p.l,
      costa: p.costa ?? null,
      transaction_probability_30d: computeTransactionProbability(p),
      key_signals: keySignals(p),
      estimated_transaction_window: estimatedWindow(computeTransactionProbability(p)),
      days_on_market: daysOnMarket(p),
      avena_score: p._sc ?? null,
    }));

    scored.sort((a, b) => b.transaction_probability_30d - a.transaction_probability_30d);

    const top = scored.slice(0, limit);

    const avgProb = top.length > 0 ? Math.round(avg(top.map(t => t.transaction_probability_30d))) : 0;

    return NextResponse.json({
      region: regionParam ?? 'all',
      total_analyzed: properties.length,
      returned: top.length,
      avg_transaction_probability: avgProb,
      model_parameters: {
        weights: {
          days_on_market: '25%',
          price_signal: '25%',
          regime_boost: '15%',
          seasonal: '10%',
          score_attractiveness: '15%',
          developer_inventory: '10%',
        },
        regime: 'GROWTH',
        seasonal_month: 'April (Q2 peak)',
      },
      predictions: top,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

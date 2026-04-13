import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';

function normalCDF(x: number): number {
  return 1 / (1 + Math.exp(-1.7 * x - 0.73 * x * x * x));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('ref');
  const horizonParam = searchParams.get('horizon_years');

  if (!ref) {
    return NextResponse.json(
      { error: 'Missing required parameter: ref (property reference)' },
      { status: 400 },
    );
  }

  const all = getAllProperties();
  const property = all.find((p) => p.ref === ref);

  if (!property) {
    return NextResponse.json(
      { error: `Property not found for ref: ${ref}` },
      { status: 404 },
    );
  }

  const S = property.pf;
  const K = property.mm2 && property.bm ? property.mm2 * property.bm : property.pf;
  const T = horizonParam ? parseFloat(horizonParam) : 1;
  const r = 0.0235;
  const sigma = 0.12;

  if (T <= 0) {
    return NextResponse.json(
      { error: 'horizon_years must be positive' },
      { status: 400 },
    );
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);

  const call = S * Nd1 - K * Math.exp(-r * T) * Nd2;
  const optionValuePct = Number(((call / S) * 100).toFixed(2));

  let interpretation: string;
  if (optionValuePct > 10) {
    interpretation = 'Significant optionality value — holding is justified';
  } else if (optionValuePct > 5) {
    interpretation = 'Moderate optionality — favorable risk/reward for hold';
  } else {
    interpretation = 'Limited optionality — consider timing carefully';
  }

  return NextResponse.json({
    ref,
    current_price: S,
    fair_value: K,
    horizon_years: T,
    risk_free_rate: r,
    volatility: sigma,
    option_value_call: Number(call.toFixed(2)),
    option_value_pct: optionValuePct,
    interpretation,
    methodology: 'Black-Scholes adapted for real estate',
  });
}

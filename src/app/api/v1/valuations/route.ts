import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAllProperties, slugify, avg } from '@/lib/properties';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const RATE_LIMITS: Record<string, number> = {
  free: 100,
  starter: 1000,
  pro: 10000,
  institutional: 999999,
};

async function validateApiKey(key: string | null) {
  if (!supabase) return { valid: false, error: 'Database not configured', status: 503 };
  if (!key) return { valid: false, error: 'API key required. Get one at /api/v1/keys', status: 401 };

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key', key)
    .eq('active', true)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Invalid or inactive API key. Get one at /api/v1/keys', status: 401 };
  }

  const rateLimit = RATE_LIMITS[data.tier] || RATE_LIMITS.free;
  if (data.requests_count >= rateLimit) {
    return { valid: false, error: 'Rate limit exceeded', status: 429 };
  }

  await supabase
    .from('api_keys')
    .update({ requests_count: data.requests_count + 1 })
    .eq('key', key);

  return { valid: true, tier: data.tier, remaining: rateLimit - data.requests_count - 1 };
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const key = params.get('key');
  const ref = params.get('ref');

  const auth = await validateApiKey(key);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!ref) {
    return NextResponse.json({ error: 'Query parameter "ref" is required' }, { status: 400 });
  }

  const all = getAllProperties();
  const property = all.find(p => p.ref === ref);

  if (!property) {
    return NextResponse.json({ error: `Property with ref "${ref}" not found` }, { status: 404 });
  }

  // Find comparables: same town + same type
  let comparables = all.filter(
    p => p.ref !== ref && slugify(p.l) === slugify(property.l) && slugify(p.t) === slugify(property.t) && p.pm2
  );

  // If <3 comparables, expand to same costa + same type
  if (comparables.length < 3 && property.costa) {
    comparables = all.filter(
      p => p.ref !== ref && p.costa === property.costa && slugify(p.t) === slugify(property.t) && p.pm2
    );
  }

  const comparablePm2s = comparables.map(p => p.pm2!);
  const medianPm2 = median(comparablePm2s);
  const fairValue = Math.round(medianPm2 * property.bm);
  const askingPrice = property.pf;
  const valueGap = Number(((fairValue - askingPrice) / askingPrice * 100).toFixed(1));

  let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  if (comparables.length > 10) {
    confidence = 'HIGH';
  } else if (comparables.length >= 5) {
    confidence = 'MEDIUM';
  } else {
    confidence = 'LOW';
  }

  const response = NextResponse.json({
    ref: property.ref,
    asking_price: askingPrice,
    fair_value: fairValue,
    value_gap_pct: valueGap,
    confidence,
    comparables_count: comparables.length,
    median_comparable_pm2: Math.round(medianPm2),
    built_m2: property.bm,
    methodology: 'comparable_analysis',
    valuation_date: new Date().toISOString().split('T')[0],
  });

  response.headers.set('X-Avena-Version', '1.0');
  response.headers.set('X-Request-ID', randomUUID());
  response.headers.set('X-Rate-Limit-Remaining', String(auth.remaining));

  return response;
}

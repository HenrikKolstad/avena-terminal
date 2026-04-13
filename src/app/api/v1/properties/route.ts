import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAllProperties, avg, slugify } from '@/lib/properties';
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

  // Increment request count
  await supabase
    .from('api_keys')
    .update({ requests_count: data.requests_count + 1 })
    .eq('key', key);

  return { valid: true, tier: data.tier, remaining: rateLimit - data.requests_count - 1 };
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const key = params.get('key');

  const auth = await validateApiKey(key);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const region = params.get('region');
  const type = params.get('type');
  const maxPrice = params.get('maxPrice') ? Number(params.get('maxPrice')) : null;
  const minScore = params.get('minScore') ? Number(params.get('minScore')) : null;
  const minYield = params.get('minYield') ? Number(params.get('minYield')) : null;
  const limit = Math.min(Number(params.get('limit') || 20), 50);
  const offset = Number(params.get('offset') || 0);

  let properties = getAllProperties();

  if (region) {
    properties = properties.filter(p => p.costa && slugify(p.costa) === slugify(region));
  }
  if (type) {
    properties = properties.filter(p => slugify(p.t) === slugify(type));
  }
  if (maxPrice !== null) {
    properties = properties.filter(p => p.pf <= maxPrice);
  }
  if (minScore !== null) {
    properties = properties.filter(p => (p._sc ?? 0) >= minScore);
  }
  if (minYield !== null) {
    properties = properties.filter(p => (p._yield?.gross ?? 0) >= minYield);
  }

  // Sort by score descending
  properties.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));

  const total = properties.length;
  const paged = properties.slice(offset, offset + limit);

  const response = NextResponse.json({
    total,
    limit,
    offset,
    count: paged.length,
    properties: paged.map(p => ({
      ref: p.ref,
      name: p.p,
      developer: p.d,
      town: p.l,
      region: p.costa || p.r,
      type: p.t,
      price: p.pf,
      price_to: p.pt,
      pm2: p.pm2,
      mm2: p.mm2,
      built_m2: p.bm,
      plot_m2: p.pl,
      bedrooms: p.bd,
      bathrooms: p.ba,
      beach_km: p.bk,
      status: p.s,
      completion: p.c,
      score: p._sc,
      yield_gross: p._yield?.gross,
      yield_net: p._yield?.net,
      yield_annual: p._yield?.annual,
      url: p.u,
      image: p.imgs?.[0] || p.img,
      lat: p.lat,
      lng: p.lng,
    })),
    avg_price: Math.round(avg(paged.map(p => p.pf))),
    avg_score: Math.round(avg(paged.filter(p => p._sc).map(p => p._sc!))),
  });

  response.headers.set('X-Avena-Version', '1.0');
  response.headers.set('X-Request-ID', randomUUID());
  response.headers.set('X-Rate-Limit-Remaining', String(auth.remaining));

  return response;
}

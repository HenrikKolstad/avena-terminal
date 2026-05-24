import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAllProperties, avg, slugify } from '@/lib/properties';
import { supabase } from '@/lib/supabase';
import { toAPIP } from '@/lib/apip';
import { computeConfidence } from '@/lib/score-confidence';

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
  const country = params.get('country');                       // ISO 3166-1 alpha-2 e.g. ES, PT, FR
  const format = params.get('format');                          // 'apip' for APIP-standard response
  const maxPrice = params.get('maxPrice') ? Number(params.get('maxPrice')) : null;
  const minScore = params.get('minScore') ? Number(params.get('minScore')) : null;
  const minYield = params.get('minYield') ? Number(params.get('minYield')) : null;
  const limit = Math.min(Number(params.get('limit') || 20), 50);
  const offset = Number(params.get('offset') || 0);

  let properties = getAllProperties();

  if (country) {
    // Legacy data.json properties default to country='ES' if absent — preserve
    // backwards compatibility when filtering.
    const wanted = country.toUpperCase();
    properties = properties.filter((p) => (p.country ?? 'ES').toUpperCase() === wanted);
  }
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

  // Adversarial confidence (Architectural Commitment 5) — computed inline
  // from the deterministic v1 heuristic. Every score returns alongside a
  // confidence float and reason codes so institutional clients can show
  // their compliance team why a property is more or less certain.
  const townComps = new Map<string, number>();
  for (const p of properties) {
    const t = (p.l || '').toLowerCase();
    if (!t) continue;
    townComps.set(t, (townComps.get(t) ?? 0) + 1);
  }
  const townMedians = new Map<string, number>();
  for (const [town] of townComps.entries()) {
    const inTown = properties.filter(p => (p.l || '').toLowerCase() === town && p.pm2);
    if (inTown.length === 0) continue;
    const ppms = inTown.map(p => p.pm2!).sort((a, b) => a - b);
    townMedians.set(town, ppms[Math.floor(ppms.length / 2)]);
  }
  const confidenceFor = (p: typeof paged[number]) => {
    const town = (p.l || '').toLowerCase();
    return computeConfidence(
      {
        ref: p.ref ?? '',
        primary_score: p._sc ?? 50,
        price_eur: p.pf ?? null,
        built_m2: p.bm ?? null,
        town: p.l ?? null,
        energy: null,
        bedrooms: p.bd ?? null,
        type: p.t ?? null,
      },
      {
        median_price_per_m2: townMedians.get(town),
        town_comp_count: townComps.get(town),
      },
    );
  };

  // APIP-standard envelope when ?format=apip
  if (format === 'apip') {
    const apipResp = NextResponse.json({
      apip_version: '1.0',
      generated_at: new Date().toISOString(),
      total,
      limit,
      offset,
      count: paged.length,
      filters: { country, region, type, maxPrice, minScore, minYield },
      properties: paged.map((p) => toAPIP(p).property),
      source: { name: 'Avena Terminal', url: 'https://avenaterminal.com', doi: '10.5281/zenodo.19520064' },
    });
    apipResp.headers.set('X-APIP-Version', '1.0');
    apipResp.headers.set('X-Avena-Version', '1.0');
    apipResp.headers.set('X-Request-ID', randomUUID());
    apipResp.headers.set('X-Rate-Limit-Remaining', String(auth.remaining));
    return apipResp;
  }

  const response = NextResponse.json({
    total,
    limit,
    offset,
    count: paged.length,
    properties: paged.map(p => {
      const c = confidenceFor(p);
      return {
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
      score_confidence: c.confidence,
      score_confidence_codes: c.reason_codes,
      score_flagged_for_review: c.flagged_for_review,
      yield_gross: p._yield?.gross,
      yield_net: p._yield?.net,
      yield_annual: p._yield?.annual,
      url: p.u,
      image: p.imgs?.[0] || p.img,
      lat: p.lat,
      lng: p.lng,
      country: p.country ?? 'ES',
      country_name: p.country_name ?? 'Spain',
      currency: p.currency ?? 'EUR',
      source_portal: p.source_portal ?? null,
      last_synced: p.last_synced ?? null,
      };
    }),
    avg_price: Math.round(avg(paged.map(p => p.pf))),
    avg_score: Math.round(avg(paged.filter(p => p._sc).map(p => p._sc!))),
  });

  response.headers.set('X-Avena-Version', '1.0');
  response.headers.set('X-APIP-Version', '1.0');
  response.headers.set('X-Request-ID', randomUUID());
  response.headers.set('X-Rate-Limit-Remaining', String(auth.remaining));

  return response;
}

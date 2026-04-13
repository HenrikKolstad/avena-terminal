import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';
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

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const key = params.get('key');
  const region = params.get('region');

  const auth = await validateApiKey(key);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const all = getAllProperties();
  const costas = getUniqueCostas();
  const towns = getUniqueTowns();

  let filtered = all;
  let regionName = 'All Regions';

  if (region) {
    filtered = all.filter(p => p.costa && slugify(p.costa) === slugify(region));
    if (!filtered.length) {
      return NextResponse.json({
        error: `Region "${region}" not found`,
        available_regions: costas.map(c => ({ name: c.costa, slug: c.slug })),
      }, { status: 404 });
    }
    regionName = filtered[0].costa || region;
  }

  const prices = filtered.map(p => p.pf);
  const pm2s = filtered.filter(p => p.pm2).map(p => p.pm2!);
  const yields = filtered.filter(p => p._yield?.gross).map(p => p._yield!.gross);
  const scores = filtered.filter(p => p._sc).map(p => p._sc!);

  // Top towns in region
  const townMap = new Map<string, typeof filtered>();
  for (const p of filtered) {
    if (!p.l) continue;
    if (!townMap.has(p.l)) townMap.set(p.l, []);
    townMap.get(p.l)!.push(p);
  }

  const topTowns = [...townMap.entries()]
    .map(([town, props]) => ({
      town,
      count: props.length,
      avg_price: Math.round(avg(props.map(p => p.pf))),
      avg_score: Math.round(avg(props.filter(p => p._sc).map(p => p._sc!))),
      avg_yield: Number(avg(props.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const response = NextResponse.json({
    region: regionName,
    count: filtered.length,
    avg_price: Math.round(avg(prices)),
    median_price: Math.round(median(prices)),
    avg_pm2: Math.round(avg(pm2s)),
    avg_yield: Number(avg(yields).toFixed(1)),
    avg_score: Math.round(avg(scores)),
    above_70: filtered.filter(p => (p._sc ?? 0) >= 70).length,
    top_towns: topTowns,
    available_regions: costas.map(c => ({ name: c.costa, slug: c.slug, count: c.count })),
  });

  response.headers.set('X-Avena-Version', '1.0');
  response.headers.set('X-Request-ID', randomUUID());
  response.headers.set('X-Rate-Limit-Remaining', String(auth.remaining));

  return response;
}

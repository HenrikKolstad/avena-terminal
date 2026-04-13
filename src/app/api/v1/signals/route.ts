import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { detectAnomalies } from '@/lib/anomaly';
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

  let signals = detectAnomalies();

  if (region) {
    signals = signals.filter(s => slugify(s.property.region) === slugify(region));
  }

  // Return top 10
  const top10 = signals.slice(0, 10);

  const response = NextResponse.json({
    count: top10.length,
    total_signals: signals.length,
    region: region || 'all',
    signals: top10,
  });

  response.headers.set('X-Avena-Version', '1.0');
  response.headers.set('X-Request-ID', randomUUID());
  response.headers.set('X-Rate-Limit-Remaining', String(auth.remaining));

  return response;
}

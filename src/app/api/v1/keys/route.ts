import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { decideTier } from '@/lib/key-tiers';

export const dynamic = 'force-dynamic';

const RATE_LIMITS: Record<string, number> = {
  free: 100,
  starter: 1000,
  pro: 10000,
  institutional: 999999,
};

export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Self-serve is free tier only; paid tiers need the admin token (server-side issuance).
    const decision = decideTier((body as { tier?: unknown }).tier, isAdminRequest(req.headers.get('authorization')));
    if (!decision.ok) {
      return NextResponse.json({ error: decision.error }, { status: decision.status });
    }
    const tier = decision.tier;

    const key = `avt_v1_${randomUUID().replace(/-/g, '')}`;

    const { error } = await supabase
      .from('api_keys')
      .insert({
        key,
        email,
        tier,
        requests_count: 0,
        created_at: new Date().toISOString(),
        active: true,
      });

    if (error) {
      return NextResponse.json({ error: 'Failed to create API key', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({
      key,
      tier,
      rate_limit: RATE_LIMITS[tier],
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const key = req.nextUrl.searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Query parameter "key" is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key', key)
    .eq('active', true)
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false, error: 'Invalid or inactive API key' }, { status: 401 });
  }

  const rateLimit = RATE_LIMITS[data.tier] || RATE_LIMITS.free;

  return NextResponse.json({
    valid: true,
    tier: data.tier,
    requests_today: data.requests_count,
    rate_limit: rateLimit,
  });
}

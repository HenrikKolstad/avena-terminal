import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { decideTier } from '@/lib/key-tiers';

export const dynamic = 'force-dynamic';

const DAILY_LIMITS: Record<string, number> = {
  free: 100,
  starter: 1000,
  pro: 10000,
  institutional: 100000,
};

const PRICING: Record<string, string> = {
  free: 'Free',
  starter: 'Pricing on request: henrik@avenaterminal.com',
  pro: 'Pricing on request: henrik@avenaterminal.com',
  institutional: 'Pricing on request: henrik@avenaterminal.com',
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
    const now = new Date().toISOString();

    const { error } = await supabase.from('api_keys').insert({
      key,
      email,
      tier,
      requests_count: 0,
      created_at: now,
      active: true,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create API key', detail: error.message },
        { status: 500 },
      );
    }

    // Log key creation event
    await supabase.from('api_usage_log').insert({
      key,
      event: 'key_created',
      endpoint: '/keys/generate',
      timestamp: now,
    });

    const daily = DAILY_LIMITS[tier] ?? DAILY_LIMITS.free;

    return NextResponse.json(
      {
        key,
        tier,
        rate_limits: {
          daily,
          monthly: daily * 30,
        },
        pricing: PRICING,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

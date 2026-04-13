import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DAILY_LIMITS: Record<string, number> = {
  free: 100,
  starter: 1000,
  pro: 10000,
  institutional: 100000,
};

const PRICING: Record<string, string> = {
  free: '€0',
  starter: '€49/mo',
  pro: '€149/mo',
  institutional: '€999/mo',
};

export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = await req.json();
    const { email, tier = 'free' } = body as { email?: string; tier?: string };

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const validTiers = ['free', 'starter', 'pro', 'institutional'];
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` },
        { status: 400 },
      );
    }

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

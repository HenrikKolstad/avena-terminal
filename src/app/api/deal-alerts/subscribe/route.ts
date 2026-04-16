/*
 * Deal Alerts — Subscribe endpoint
 *
 * Required Supabase table:
 *
 * create table deal_alerts (
 *   id uuid primary key default gen_random_uuid(),
 *   email text not null,
 *   filters jsonb default '{}',
 *   frequency text default 'daily',
 *   active boolean default true,
 *   created_at timestamptz default now(),
 *   last_sent_at timestamptz
 * );
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AlertFilters {
  maxPrice?: number;
  minYield?: number;
  region?: string;
  town?: string;
  maxPricePerM2?: number;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, filters, frequency } = body as {
      email: unknown;
      filters: unknown;
      frequency: unknown;
    };

    // Validate email
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email address required' }, { status: 400 });
    }

    // Validate frequency
    const validFrequencies = ['instant', 'daily'];
    const resolvedFrequency =
      typeof frequency === 'string' && validFrequencies.includes(frequency)
        ? frequency
        : 'daily';

    // Sanitise filters — only accept known keys with expected types
    const rawFilters = (typeof filters === 'object' && filters !== null ? filters : {}) as Record<string, unknown>;
    const cleanFilters: AlertFilters = {};

    if (typeof rawFilters.maxPrice === 'number' && rawFilters.maxPrice > 0) {
      cleanFilters.maxPrice = rawFilters.maxPrice;
    }
    if (typeof rawFilters.minYield === 'number' && rawFilters.minYield >= 0) {
      cleanFilters.minYield = rawFilters.minYield;
    }
    if (typeof rawFilters.region === 'string' && rawFilters.region.trim()) {
      cleanFilters.region = rawFilters.region.trim();
    }
    if (typeof rawFilters.town === 'string' && rawFilters.town.trim()) {
      cleanFilters.town = rawFilters.town.trim();
    }
    if (typeof rawFilters.maxPricePerM2 === 'number' && rawFilters.maxPricePerM2 > 0) {
      cleanFilters.maxPricePerM2 = rawFilters.maxPricePerM2;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Upsert: if user already has an active alert with the same filters, update it;
    // otherwise insert a fresh record.
    const { data: existing } = await supabase
      .from('deal_alerts')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('active', true)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabase
        .from('deal_alerts')
        .update({
          filters: cleanFilters,
          frequency: resolvedFrequency,
          active: true,
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('deal_alerts')
        .insert({
          email: normalizedEmail,
          filters: cleanFilters,
          frequency: resolvedFrequency,
          active: true,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('[deal-alerts/subscribe] Supabase error:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Alert created' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[deal-alerts/subscribe] Unexpected error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

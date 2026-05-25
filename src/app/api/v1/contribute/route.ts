/**
 * POST /api/v1/contribute
 *
 * Notaries, brokers, registries, agencies submit interest to contribute
 * EU residential property data under APIP. Persists to data_contributions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/event-store';

export const dynamic = 'force-dynamic';

interface Body {
  contributor_name: string;
  contributor_email: string;
  organisation: string;
  organisation_type: string;
  country_iso2: string;
  data_type: string;
  estimated_record_count?: number;
  earliest_record?: string;
  latest_record?: string;
  proposed_terms?: string;
  description?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }

  for (const k of ['contributor_name', 'contributor_email', 'organisation', 'organisation_type', 'country_iso2', 'data_type'] as const) {
    if (!body[k] || !String(body[k]).trim()) {
      return NextResponse.json({ ok: false, error: `${k} required` }, { status: 400 });
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contributor_email)) {
    return NextResponse.json({ ok: false, error: 'valid contributor_email required' }, { status: 400 });
  }
  if (body.country_iso2.length !== 2) {
    return NextResponse.json({ ok: false, error: 'country_iso2 must be 2 letters' }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'data layer unavailable' }, { status: 503 });
  }

  try {
    const { data, error } = await supabase
      .from('data_contributions')
      .insert({
        contributor_name: body.contributor_name.trim(),
        contributor_email: body.contributor_email.trim().toLowerCase(),
        organisation: body.organisation.trim(),
        organisation_type: body.organisation_type.trim(),
        country_iso2: body.country_iso2.trim().toUpperCase(),
        data_type: body.data_type.trim(),
        estimated_record_count: body.estimated_record_count ?? null,
        earliest_record: body.earliest_record ?? null,
        latest_record: body.latest_record ?? null,
        proposed_terms: body.proposed_terms?.trim() || 'tbd',
        description: body.description?.trim() || null,
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const contributionId = (data as { id: string }).id;

    await recordEvent({
      event_type: 'data.contribution_proposed',
      aggregate_id: contributionId,
      aggregate_type: 'limitation',
      payload: {
        organisation: body.organisation,
        organisation_type: body.organisation_type,
        country_iso2: body.country_iso2,
        data_type: body.data_type,
      },
    });

    return NextResponse.json({
      ok: true,
      id: contributionId,
      next: 'Henrik will reply personally within 5 business days to scope the integration.',
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

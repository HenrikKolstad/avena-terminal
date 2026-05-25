/**
 * POST /api/v1/academic/request
 *
 * EU housing economists request free full-dataset access in exchange for
 * citation. Persists to academic_access_grants for admin review.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/event-store';

export const dynamic = 'force-dynamic';

interface Body {
  researcher_name: string;
  researcher_email: string;
  institution: string;
  orcid?: string;
  research_topic: string;
  expected_publication?: string;
  data_scope_requested?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }

  if (!body.researcher_name?.trim()) {
    return NextResponse.json({ ok: false, error: 'researcher_name required' }, { status: 400 });
  }
  if (!body.researcher_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.researcher_email)) {
    return NextResponse.json({ ok: false, error: 'valid researcher_email required' }, { status: 400 });
  }
  if (!body.institution?.trim()) {
    return NextResponse.json({ ok: false, error: 'institution required' }, { status: 400 });
  }
  if (!body.research_topic?.trim()) {
    return NextResponse.json({ ok: false, error: 'research_topic required' }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'data layer unavailable' }, { status: 503 });
  }

  try {
    const { data, error } = await supabase
      .from('academic_access_grants')
      .insert({
        researcher_name: body.researcher_name.trim(),
        researcher_email: body.researcher_email.trim().toLowerCase(),
        institution: body.institution.trim(),
        orcid: body.orcid?.trim() || null,
        research_topic: body.research_topic.trim(),
        expected_publication: body.expected_publication?.trim() || null,
        data_scope_requested: body.data_scope_requested?.trim() || null,
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const grantId = (data as { id: string }).id;

    await recordEvent({
      event_type: 'academic.access_requested',
      aggregate_id: grantId,
      aggregate_type: 'limitation',
      payload: {
        researcher_name: body.researcher_name,
        institution: body.institution,
        research_topic: body.research_topic,
      },
    });

    return NextResponse.json({
      ok: true,
      id: grantId,
      next: 'Henrik will reply personally within 5 business days with API credentials and dataset access instructions.',
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

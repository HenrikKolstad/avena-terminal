/**
 * POST /api/v1/policy/inquire
 *
 * Captures institutional inquiries from the Precision Policy Engine page.
 * These are the warmest leads Avena has — someone at a central bank /
 * supervisor / finance ministry ran a scenario, then clicked the contact
 * CTA. Goes straight to institutional@avenaterminal.com routing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface InquiryBody {
  organisation?: string;
  role?: string;
  contact_email: string;
  country?: string;
  scenario_id?: string;
  notes?: string;
}

export async function POST(req: NextRequest) {
  let body: InquiryBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 }); }

  if (!body.contact_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contact_email)) {
    return NextResponse.json({ ok: false, error: 'valid contact_email required' }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'data layer unavailable' }, { status: 503 });
  }

  try {
    const { data, error } = await supabase
      .from('policy_inquiries')
      .insert({
        organisation: body.organisation ?? null,
        role: body.role ?? null,
        contact_email: body.contact_email,
        country: body.country ?? null,
        scenario_id: body.scenario_id ?? null,
        notes: body.notes ?? null,
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // Best-effort: mark the scenario as "inquired" so we can correlate scenario type → conversion
    if (body.scenario_id) {
      try { await supabase.from('policy_scenarios').update({ inquired: true }).eq('id', body.scenario_id); } catch { /* */ }
    }

    return NextResponse.json({
      ok: true,
      inquiry_id: (data as { id: string }).id,
      next: 'Avena Institutional will reply within 24h to institutional@avenaterminal.com',
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

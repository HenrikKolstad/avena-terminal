/**
 * POST /api/v1/co-founder/inquire
 *
 * Captures applications to the /careers/co-founder archetype page.
 * Logs to co_founder_inquiries table for admin review.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface InquiryBody {
  full_name: string;
  contact_email: string;
  linkedin_url?: string;
  current_role?: string;
  current_org?: string;
  archetype_fit?: string;
  bet_thesis?: string;
}

export async function POST(req: NextRequest) {
  let body: InquiryBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 }); }

  if (!body.full_name?.trim()) {
    return NextResponse.json({ ok: false, error: 'full_name required' }, { status: 400 });
  }
  if (!body.contact_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contact_email)) {
    return NextResponse.json({ ok: false, error: 'valid contact_email required' }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'data layer unavailable' }, { status: 503 });
  }

  try {
    const { data, error } = await supabase
      .from('co_founder_inquiries')
      .insert({
        full_name: body.full_name.trim(),
        contact_email: body.contact_email.trim().toLowerCase(),
        linkedin_url: body.linkedin_url?.trim() || null,
        current_role: body.current_role?.trim() || null,
        current_org: body.current_org?.trim() || null,
        archetype_fit: body.archetype_fit?.trim() || null,
        bet_thesis: body.bet_thesis?.trim() || null,
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({
      ok: true,
      id: (data as { id: string }).id,
      next: 'Henrik will reply personally within 7 days to the email you provided.',
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

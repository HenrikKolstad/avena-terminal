import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!supabase) return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });

  let body: { id?: string; reason?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 });

  const { data: partner, error } = await supabase
    .from('federated_partners')
    .update({ status: 'rejected', approved_at: new Date().toISOString() })
    .eq('id', body.id)
    .select('contact_email, name')
    .single();
  if (error || !partner) return NextResponse.json({ ok: false, error: error?.message ?? 'partner not found' }, { status: 404 });

  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Avena Terminal <partners@avenaterminal.com>',
          to: [partner.contact_email],
          subject: 'Avena Federated Partner — Application update',
          text: `Hi ${partner.name},\n\nThank you for your interest in joining the Avena Federated Data Network. After review we are unable to onboard your application at this time.\n\n${body.reason ?? 'Reason: insufficient data scope or geographic overlap with existing partners.'}\n\nYou're welcome to reapply in 90 days as our coverage evolves.\n\n— Avena Terminal`,
        }),
      });
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ ok: true, partner_id: body.id, status: 'rejected' });
}

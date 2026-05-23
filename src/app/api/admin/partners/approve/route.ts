import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!supabase) return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });

  let body: { id?: string }; try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 });

  // Mint API key
  const apiKey = `avf_v1_${randomUUID().replace(/-/g, '')}`;

  const { data: partner, error: updErr } = await supabase
    .from('federated_partners')
    .update({ status: 'approved', approved_at: new Date().toISOString(), api_key: apiKey })
    .eq('id', body.id)
    .select('id, name, contact_email, country_codes, data_types')
    .single();
  if (updErr || !partner) return NextResponse.json({ ok: false, error: updErr?.message ?? 'partner not found' }, { status: 404 });

  // Send approval email
  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Avena Terminal <partners@avenaterminal.com>',
          to: [partner.contact_email],
          subject: 'Avena Federated Partner — Application approved',
          text: `Welcome to the Avena Federated Data Network.\n\nYour API key (keep this secret):\n  ${apiKey}\n\nDocs:        https://avenaterminal.com/standards/apip-v1.json\nEndpoints:   https://avenaterminal.com/api/v1/properties?format=apip&key=${apiKey}\nFederation:  https://avenaterminal.com/api/v1/federation\n\nCountries:   ${(partner.country_codes ?? []).join(', ')}\nData types:  ${(partner.data_types ?? []).join(', ')}\n\nNeed help? Reply to this email.\n\n— Avena Terminal`,
        }),
      });
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ ok: true, partner_id: partner.id, api_key: apiKey, status: 'approved' });
}

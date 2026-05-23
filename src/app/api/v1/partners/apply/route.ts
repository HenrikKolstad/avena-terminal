/**
 * POST /api/v1/partners/apply
 *
 * Self-serve partner application endpoint. Backs the /data-partners form.
 * Inserts a row into federated_partners (status='pending'), sends a
 * confirmation email via Resend, and returns the application_id so the
 * client can show a success state.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

interface ApplyPayload {
  name?: string;
  contact_email?: string;
  country_codes?: string[];
  data_types?: string[];
  estimated_volume?: number;
}

const VALID_DATA_TYPES = [
  'property_listings',
  'transaction_records',
  'rental_yields',
  'occupancy_rates',
  'construction_permits',
  'price_indices',
  'tourism_statistics',
  'mortgage_approvals',
  'developer_records',
  'cadastral_data',
];

export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  }

  let body: ApplyPayload;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }

  const errors: string[] = [];
  if (!body.name || body.name.trim().length < 2) errors.push('name (company/organisation) is required');
  if (!body.contact_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contact_email)) errors.push('contact_email must be a valid email');
  if (!Array.isArray(body.country_codes) || body.country_codes.length === 0) errors.push('country_codes must be a non-empty array of ISO 3166-1 alpha-2 codes');
  else if (body.country_codes.some((c) => !/^[A-Z]{2}$/.test(c))) errors.push('country_codes must all match ^[A-Z]{2}$');
  if (!Array.isArray(body.data_types) || body.data_types.length === 0) errors.push('data_types must be a non-empty array');
  else if (body.data_types.some((t) => !VALID_DATA_TYPES.includes(t))) errors.push(`data_types must be from: ${VALID_DATA_TYPES.join(', ')}`);

  if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 400 });

  const applicationId = randomUUID();
  const { error: insErr } = await supabase.from('federated_partners').insert({
    id: applicationId,
    name: body.name!.trim(),
    contact_email: body.contact_email!.toLowerCase().trim(),
    country_codes: body.country_codes,
    data_types: body.data_types,
    estimated_volume: body.estimated_volume ?? null,
    status: 'pending',
  });
  if (insErr) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  }

  // Send confirmation email via Resend (best effort)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'Avena Terminal <partners@avenaterminal.com>',
          to: [body.contact_email!],
          subject: 'Avena Federated Partner Application received',
          text: `Hi,\n\nThanks for applying to join the Avena Federated Data Network.\n\nApplication ID: ${applicationId}\nCountries: ${body.country_codes!.join(', ')}\nData types: ${body.data_types!.join(', ')}\n\nWe review applications within 48 hours. On approval, you receive an API key (format avf_v1_*) and docs link.\n\n— Avena Terminal`,
        }),
      });
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({
    ok: true,
    application_id: applicationId,
    status: 'pending',
    next_step: 'review',
    review_sla_hours: 48,
    docs_preview: 'https://avenaterminal.com/standards/apip-v1.json',
  });
}

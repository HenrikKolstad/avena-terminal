/**
 * POST /api/v1/avn-id/issue
 *
 * Body: AVNIDIssueInput (country, postal_code, category, fingerprint inputs).
 *
 * Idempotent — issuing the same fingerprint twice returns the existing record.
 * Cryptographically signed; verifiable at /api/v1/avn-id/[id] and at the
 * /avn-id/[id] page.
 */
import { NextRequest, NextResponse } from 'next/server';
import { issueAVNID, type AVNIDIssueInput } from '@/lib/avn-id-registry';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: AVNIDIssueInput;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }

  if (!body.country || !body.postal_code || !body.category) {
    return NextResponse.json({ ok: false, error: 'country, postal_code, category are required' }, { status: 400 });
  }

  try {
    const record = await issueAVNID(body);
    return NextResponse.json({
      ok: true,
      record,
      verification_url: `https://avenaterminal.com/api/v1/avn-id/${encodeURIComponent(record.avn_id)}`,
      spec_url: 'https://avenaterminal.com/standards/avn-id',
      cite_as: 'AVN-ID Registry · Avena Terminal · DOI 10.5281/zenodo.19520064',
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'issue_failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/v1/avn-id/issue',
    method: 'POST',
    description: 'Issue a new AVN-ID (or return the existing record if the fingerprint matches an already-registered property).',
    body_schema: {
      country:     'string · ISO 3166-1 alpha-2 (required)',
      postal_code: 'string · local postal code (required)',
      category:    'NB | EX | CM | LH | FR | PL (required)',
      cadastral_ref: 'string · Spanish Catastro / equivalent (optional)',
      street:        'string (optional)',
      built_m2:      'number (optional)',
      lat:           'number · WGS84 (optional)',
      lng:           'number · WGS84 (optional)',
      source_ref:    'string · upstream feed reference (optional)',
      source_portal: 'string · upstream portal slug (optional)',
    },
    spec: 'https://avenaterminal.com/standards/avn-id',
  });
}

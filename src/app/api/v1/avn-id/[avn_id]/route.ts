/**
 * GET /api/v1/avn-id/[avn_id]
 *
 * Lookup an AVN-ID. Returns the issued record + signature so any consumer
 * can verify the identifier was legitimately issued by Avena.
 */
import { NextRequest, NextResponse } from 'next/server';
import { lookupAVNID, verifyAVNID } from '@/lib/avn-id-registry';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ avn_id: string }> }) {
  const { avn_id } = await params;
  const decoded = decodeURIComponent(avn_id);
  const record = await lookupAVNID(decoded);
  if (!record) return NextResponse.json({ ok: false, error: 'not_found', avn_id: decoded }, { status: 404 });

  // Re-verify the signature now (defends against tampering of the stored row).
  const valid = verifyAVNID(record.avn_id, record.payload_hash, record.signature);

  const res = NextResponse.json({
    ok: true,
    record,
    verification: {
      signature_valid: valid,
      signed_payload: `${record.avn_id}::${record.payload_hash}`,
      algorithm: 'HMAC-SHA256 (32-char prefix)',
      issued_by: record.issuer,
    },
    spec_url: 'https://avenaterminal.com/standards/avn-id',
    cite_as: 'AVN-ID Registry · Avena Terminal · DOI 10.5281/zenodo.19520064',
  });
  res.headers.set('X-AVN-ID', record.avn_id);
  res.headers.set('X-AVN-Signature-Valid', valid ? 'true' : 'false');
  res.headers.set('X-APIP-Version', '1.0');
  return res;
}

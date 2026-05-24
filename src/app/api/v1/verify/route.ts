/**
 * POST /api/v1/verify
 *
 * Verify an artefact (methodology, model output, dataset snapshot) against
 * the Avena integrity log. Pass either { sha256_hash } or { artefact: <any
 * JSON> } — we'll hash the artefact and look it up.
 *
 * Response: { ok, sha256_hash, matched, daily_root }
 *   - matched.daily_merkle_root + daily_root.merkle_root must agree
 *   - daily_root.zenodo_url is the trusted-timestamp anchor
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyByArtefact, verifyByHash } from '@/lib/integrity';

export const dynamic = 'force-dynamic';

interface Body { sha256_hash?: string; artefact?: unknown }

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }

  const result = body.sha256_hash
    ? await verifyByHash(body.sha256_hash.toLowerCase())
    : body.artefact !== undefined
      ? await verifyByArtefact(body.artefact)
      : null;

  if (!result) return NextResponse.json({ ok: false, error: 'pass sha256_hash or artefact' }, { status: 400 });

  return NextResponse.json({
    ok: true,
    ...result,
    verification_url: `https://avenaterminal.com/verify?hash=${result.sha256_hash}`,
    cite_as: 'Avena Terminal Integrity Verification v1.0 (DOI 10.5281/zenodo.19520064).',
  });
}

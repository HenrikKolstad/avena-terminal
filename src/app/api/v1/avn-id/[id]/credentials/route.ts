/**
 * GET  /api/v1/avn-id/{id}/credentials
 * POST /api/v1/avn-id/{id}/credentials   (authorised issuers only)
 *
 * Read or issue verifiable credentials anchored to an AVN-ID.
 * Architectural Commitment 9.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  credentialsForAvnId,
  issueCredential,
  verifyCredentialJWT,
  type CredentialType,
} from '@/lib/credentials';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await credentialsForAvnId(id);
  return NextResponse.json({
    ok: true,
    avn_id: id,
    count: rows.length,
    credentials: rows.map(r => ({
      credential_id: r.credential_id,
      type: r.credential_type,
      issuer_id: r.issuer_id,
      issued_at: r.issued_at,
      expires_at: r.expires_at,
      revoked: r.revoked,
      claims: r.claims,
      jwt: r.credential_jwt,
      verification: verifyCredentialJWT(r.credential_jwt),
    })),
    cite_as: 'Avena AVN-ID Credentials v1.0 (DOI 10.5281/zenodo.19520064).',
  });
}

interface IssueBody {
  credential_type: CredentialType;
  issuer_id: string;
  claims: Record<string, unknown>;
  expires_at?: string;
  issuer_secret: string;            // shared secret for issuance (per-issuer)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: IssueBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }

  // Issuance auth: must match either the Foundation master secret
  // (CRON_SECRET) or a per-issuer secret (out of scope for v1).
  if (body.issuer_secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorised_issuer' }, { status: 401 });
  }

  if (!body.credential_type || !body.issuer_id || !body.claims) {
    return NextResponse.json({ ok: false, error: 'credential_type, issuer_id, claims required' }, { status: 400 });
  }

  const result = await issueCredential({
    avn_id: id,
    credential_type: body.credential_type,
    issuer_id: body.issuer_id,
    claims: body.claims,
    expires_at: body.expires_at,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    credential_id: result.credential_id,
    jwt: result.jwt,
  });
}

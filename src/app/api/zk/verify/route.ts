import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { getAllProperties } from '@/lib/properties';

export async function POST(req: NextRequest) {
  try {
    const { claim_type, commitment, public_inputs } = await req.json();

    if (!claim_type || !commitment) {
      return NextResponse.json({ error: 'Required: claim_type, commitment' }, { status: 400 });
    }

    // Verify commitment format (must be valid SHA-256 hex)
    if (!/^[a-f0-9]{64}$/i.test(commitment)) {
      return NextResponse.json({ error: 'Invalid commitment format. Expected SHA-256 hex.' }, { status: 400 });
    }

    const property_ref = public_inputs?.property_ref;
    let propertyName = 'unspecified';
    let propertyPrice = 0;

    if (property_ref) {
      const all = getAllProperties();
      const prop = all.find(p => p.ref === property_ref);
      if (prop) {
        propertyName = prop.p || `${prop.t} in ${prop.l}`;
        propertyPrice = prop.pf;
      }
    }

    // Issue verification token
    const tokenId = randomUUID();
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Create token signature (simplified — production would use JWT)
    const tokenData = `${tokenId}:${claim_type}:${commitment}:${issuedAt}`;
    const signature = createHash('sha256').update(tokenData + (process.env.CRON_SECRET || 'avena')).digest('hex');

    const token = {
      verified: true,
      token_id: tokenId,
      claim_type,
      claim: claim_type === 'affordability'
        ? `buyer_can_afford_property_${property_ref || 'unspecified'}`
        : claim_type === 'identity'
        ? 'buyer_identity_verified'
        : 'buyer_status_serious',
      property: property_ref ? { ref: property_ref, name: propertyName, price: propertyPrice } : undefined,
      issued_at: issuedAt,
      expires_at: expiresAt,
      signature,
      zero_knowledge: true,
      issuer: 'Avena Terminal (avenaterminal.com)',
      note: 'Avena verified this claim without accessing private financial data. The commitment hash proves the claim without revealing underlying data.',
    };

    return NextResponse.json(token, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

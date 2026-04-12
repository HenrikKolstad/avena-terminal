import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { buyer_id, credential_type, price_range, commitment } = await req.json();

    if (!credential_type) {
      return NextResponse.json({ error: 'credential_type required' }, { status: 400 });
    }

    const id = randomUUID();
    const issuedAt = new Date().toISOString();
    const proofHash = createHash('sha256').update(`${id}:${credential_type}:${issuedAt}:${process.env.CRON_SECRET || 'avena'}`).digest('hex');

    const credential = {
      '@context': ['https://www.w3.org/2018/credentials/v1', 'https://avenaterminal.com/ontology/'],
      type: ['VerifiableCredential', 'AvenaBuyerCredential'],
      id: `urn:avena:credential:${id}`,
      issuer: {
        id: 'https://avenaterminal.com/#organization',
        name: 'Avena Terminal',
        url: 'https://avenaterminal.com',
      },
      issuanceDate: issuedAt,
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      credentialSubject: {
        id: `did:avena:${buyer_id || randomUUID().slice(0, 8)}`,
        buyerStatus: credential_type === 'pro_member' ? 'pro_verified' : credential_type === 'serious_buyer' ? 'serious' : 'verified',
        ...(price_range ? { priceRange: price_range } : {}),
        verificationMethod: commitment ? 'zero-knowledge-commitment' : 'platform-activity',
        platform: 'Avena Terminal',
      },
      proof: {
        type: 'Sha256Signature2026',
        created: issuedAt,
        proofPurpose: 'assertionMethod',
        verificationMethod: 'https://avenaterminal.com/#verification-key',
        proofValue: proofHash,
      },
    };

    return NextResponse.json(credential, {
      headers: { 'Content-Type': 'application/ld+json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch {
    return NextResponse.json({ error: 'Credential issuance failed' }, { status: 500 });
  }
}

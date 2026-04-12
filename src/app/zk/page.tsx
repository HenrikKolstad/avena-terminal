import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Zero-Knowledge Buyer Verification — Privacy-Preserving Property | Avena Terminal',
  description: 'Prove you can afford a property without revealing your bank account. First zero-knowledge verification system in European property. Verifiable credentials for serious buyers.',
  alternates: { canonical: 'https://avenaterminal.com/zk' },
};

export default function ZKPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'Zero-Knowledge Buyer Verification for Property',
    description: 'Privacy-preserving buyer verification using cryptographic commitments. First in European real estate.',
    author: { '@type': 'Organization', name: 'Avena Terminal' },
    url: 'https://avenaterminal.com/zk',
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#a78bfa', color: '#0d1117' }}>ZK VERIFICATION</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-3">Zero-Knowledge Buyer Verification</h1>
        <p className="text-gray-400 text-sm mb-8 max-w-2xl">
          Prove you&apos;re a serious buyer without revealing your financial data. First zero-knowledge verification system in European property.
        </p>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* How It Works */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-6">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Commit', desc: 'Hash your budget with a secret salt. SHA-256(budget + salt) = commitment. Your actual budget never leaves your device.' },
              { step: '2', title: 'Verify', desc: 'Submit your commitment to Avena. We verify the format without seeing the underlying data. You prove you can afford the property.' },
              { step: '3', title: 'Credential', desc: 'Receive a W3C Verifiable Credential. Share it with developers. They see "verified buyer" without seeing your bank account.' },
            ].map(s => (
              <div key={s.step} className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="text-3xl font-bold text-purple-400 mb-3">{s.step}</div>
                <h3 className="text-white font-semibold mb-2">{s.title}</h3>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Generate Commitment */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Generate Your Commitment</h2>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`# Generate commitment locally (never send your budget)
echo -n "350000:my-secret-salt-12345" | sha256sum

# Submit commitment to Avena
curl -X POST https://avenaterminal.com/api/zk/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "claim_type": "affordability",
    "commitment": "YOUR_SHA256_HASH_HERE",
    "public_inputs": { "property_ref": "AP1-CB-12345" }
  }'`}</pre>
          </div>
        </section>

        {/* Credential Types */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Credential Types</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { type: 'Affordability', desc: 'Proves budget exceeds property price without revealing amount' },
              { type: 'Serious Buyer', desc: 'Verified by platform activity: property views, alerts set, engagement' },
              { type: 'PRO Member', desc: 'Active Avena PRO subscription verified via Stripe' },
              { type: 'Identity', desc: 'KYC completed without revealing personal documents to seller' },
            ].map(c => (
              <div key={c.type} className="rounded-lg p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <h3 className="text-purple-400 font-semibold text-sm mb-1">{c.type}</h3>
                <p className="text-[10px] text-gray-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* W3C Standard */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">W3C Verifiable Credentials</h2>
          <p className="text-sm text-gray-400 mb-4">Credentials follow the W3C Verifiable Credentials standard, making them interoperable with any system that supports the spec.</p>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential", "AvenaBuyerCredential"],
  "issuer": "https://avenaterminal.com",
  "credentialSubject": {
    "id": "did:avena:buyer123",
    "buyerStatus": "verified",
    "priceRange": "€200k-€400k",
    "verificationMethod": "zero-knowledge-commitment"
  }
}`}</pre>
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        <section className="mb-10">
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <p className="text-gray-400">Avena Terminal. First zero-knowledge buyer verification in European property.</p>
            <p className="text-gray-400">avenaterminal.com/zk &middot; DOI: 10.5281/zenodo.19520064</p>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; Privacy-preserving property intelligence
        </footer>
      </div>
    </main>
  );
}

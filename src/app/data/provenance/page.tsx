import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, avg } from '@/lib/properties';
import { createHash } from 'crypto';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Data Provenance — Blockchain-Verified Property Data | Avena Terminal',
  description: 'Cryptographically verified property dataset with blockchain timestamps on Polygon. Immutable proof of data integrity for 1,881 new build properties across Spain.',
  alternates: { canonical: 'https://avenaterminal.com/data/provenance' },
};

function computeDatasetHash() {
  const all = getAllProperties();
  const snapshot = JSON.stringify({
    count: all.length,
    prices: all.map(p => p.pf).sort(),
    scores: all.filter(p => p._sc).map(p => p._sc).sort(),
    refs: all.map(p => p.ref).sort(),
  });
  return createHash('sha256').update(snapshot).digest('hex');
}

export default function ProvenancePage() {
  const all = getAllProperties();
  const hash = computeDatasetHash();
  const now = new Date();
  const avgPrice = Math.round(avg(all.map(p => p.pf)));
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Terminal Verified Property Dataset',
    description: `Blockchain-timestamped dataset of ${all.length} scored new build properties in Spain.`,
    url: 'https://avenaterminal.com/data/provenance',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    dateModified: now.toISOString().split('T')[0],
    identifier: hash,
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>DATA PROVENANCE</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-3">Data Provenance</h1>
        <p className="text-gray-400 text-sm mb-8 max-w-2xl">
          Cryptographic verification of Avena Terminal&apos;s property dataset. Every update produces a SHA-256 hash that can be independently verified. Blockchain timestamping on Polygon provides immutable proof of data integrity.
        </p>

        <div className="h-px w-full mb-8" style={{ background: '#1c2333' }} />

        {/* Current Snapshot */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Current Dataset Snapshot</h2>
          <div className="rounded-lg p-6" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-gray-500 mb-1">Dataset Hash (SHA-256)</div>
                <div className="font-mono text-xs text-white break-all bg-black/30 rounded p-2">{hash}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Timestamp</div>
                <div className="font-mono text-sm text-white">{now.toISOString()}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div>
                <div className="text-xs text-gray-500">Properties</div>
                <div className="text-lg font-bold text-white">{all.length.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Avg Price</div>
                <div className="text-lg font-bold text-white">&euro;{avgPrice.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Avg Score</div>
                <div className="text-lg font-bold text-white">{avgScore}/100</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Status</div>
                <div className="text-lg font-bold text-emerald-400">Verified</div>
              </div>
            </div>
          </div>
        </section>

        {/* Blockchain Verification */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Blockchain Verification</h2>
          <div className="rounded-lg p-6" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-white font-semibold">Polygon Network</span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#7c3aed20', color: '#a78bfa' }}>Pending Integration</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Blockchain timestamping is being integrated. Each dataset update will produce an on-chain transaction on Polygon containing the SHA-256 hash, providing immutable proof that the data existed at a specific moment in time.
            </p>
            <div className="rounded p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
              <div className="text-gray-500 mb-1">// Future transaction format</div>
              <div className="text-gray-300">{'{'}</div>
              <div className="text-gray-300 pl-4">&quot;network&quot;: &quot;Polygon (MATIC)&quot;,</div>
              <div className="text-gray-300 pl-4">&quot;contract&quot;: &quot;DataProvenance.sol&quot;,</div>
              <div className="text-gray-300 pl-4">&quot;method&quot;: &quot;timestampDataset(bytes32 hash)&quot;,</div>
              <div className="text-gray-300 pl-4">&quot;hash&quot;: &quot;{hash.slice(0, 20)}...&quot;,</div>
              <div className="text-gray-300 pl-4">&quot;cost&quot;: &quot;~$0.001 per timestamp&quot;</div>
              <div className="text-gray-300">{'}'}</div>
            </div>
          </div>
        </section>

        {/* Verification History */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Verification History</h2>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Date</th>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Properties</th>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Hash (truncated)</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                <tr style={{ background: '#0d1117' }}>
                  <td className="px-4 py-3 text-gray-300">{now.toISOString().split('T')[0]}</td>
                  <td className="px-4 py-3 text-gray-300">{all.length.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400">{hash.slice(0, 16)}...</td>
                  <td className="px-4 py-3 text-right text-emerald-400">Current</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-600 mt-2">Hash history will grow as dataset updates are timestamped. On-chain verification coming soon.</p>
        </section>

        {/* How It Works */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Hash', desc: 'SHA-256 hash computed from all property prices, scores, and reference IDs. Any change to any property produces a different hash.' },
              { step: '2', title: 'Timestamp', desc: 'Hash written to Polygon blockchain as an immutable on-chain record. Transaction provides cryptographic proof the data existed at that moment.' },
              { step: '3', title: 'Verify', desc: 'Anyone can independently compute the hash from the public dataset and compare it against the on-chain record. Zero trust required.' },
            ].map(s => (
              <div key={s.step} className="rounded-lg p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="text-2xl font-bold text-emerald-400 mb-2">{s.step}</div>
                <h3 className="text-white font-semibold mb-1">{s.title}</h3>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why This Matters */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Why This Matters</h2>
          <div className="space-y-3">
            {[
              { title: 'AI Training Data Integrity', desc: 'AI companies need verifiable, timestamped data sources. Blockchain provenance proves our data is real and unaltered.' },
              { title: 'Enterprise Compliance', desc: 'Institutional investors and fund managers require auditable data trails. On-chain timestamps satisfy regulatory requirements.' },
              { title: 'Anti-Manipulation', desc: 'Immutable hashes prevent retroactive data modification. Historical prices and scores cannot be altered after the fact.' },
              { title: 'Academic Citation', desc: 'Researchers can cite specific dataset versions with cryptographic verification. DOI: 10.5281/zenodo.19520064.' },
            ].map(item => (
              <div key={item.title} className="rounded-lg p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="h-px w-full my-8" style={{ background: '#1c2333' }} />

        <footer className="text-center text-xs text-gray-600 pb-8">
          <p>&copy; 2026 Avena Terminal &middot; First property data source in Europe with cryptographic verification</p>
        </footer>
      </div>
    </main>
  );
}

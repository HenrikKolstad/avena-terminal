import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Extension Privacy Policy | Avena Terminal',
  description: 'Privacy policy for Avena Intelligence Chrome Extension. Zero personal data collected. GDPR compliant.',
};

export default function ExtensionPrivacyPage() {
  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono text-gray-500">EXTENSION PRIVACY</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-white mb-6">Avena Intelligence Extension — Privacy Policy</h1>

        <div className="space-y-6 text-sm text-gray-400 leading-relaxed">
          <section>
            <h2 className="text-white font-semibold mb-2">What We Collect</h2>
            <p>The Avena Intelligence extension collects <strong className="text-white">zero personal data</strong>. We do not collect names, emails, browsing history, or any personally identifiable information.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">What We Process</h2>
            <p>When you view a property listing on a supported platform, the extension sends the following to our API:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-500">
              <li>Property price (extracted from the listing page)</li>
              <li>Property location (town/region from the listing)</li>
              <li>Property type (villa, apartment, etc.)</li>
              <li>The URL of the listing page</li>
            </ul>
            <p className="mt-2">This data is used solely to match the property against our database and return intelligence. No personal data is included.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">What We Store</h2>
            <p>We store anonymous, aggregated query statistics (e.g., &ldquo;47 queries from Kyero today&rdquo;) to improve our service. No individual user data is stored or linked to any identity.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Third Parties</h2>
            <p>We do not share any data with third parties. The extension communicates only with avenaterminal.com.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">GDPR Compliance</h2>
            <p>This extension is GDPR compliant by design. No personal data is collected, processed, or stored. No cookies are set. No tracking pixels are used.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Contact</h2>
            <p>For privacy inquiries: <a href="mailto:henrik@xaviaestate.com" className="text-emerald-400 hover:underline">henrik@xaviaestate.com</a></p>
          </section>

          <p className="text-xs text-gray-600 pt-4 border-t" style={{ borderColor: '#1c2333' }}>Last updated: April 2026 &middot; Avena Terminal &middot; avenaterminal.com</p>
        </div>
      </div>
    </main>
  );
}

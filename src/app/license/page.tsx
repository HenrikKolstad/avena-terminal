import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'License | Avena Terminal',
  description:
    'License terms for Avena Terminal data, indices, APIs, protocols, and training data. Open data under CC BY 4.0, protocol implementations under MIT.',
  alternates: { canonical: 'https://avenaterminal.com/license' },
};
export const revalidate = 86400;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12">
      <h2 className="text-xl font-semibold text-emerald-400 mb-4">{title}</h2>
      <div
        className="rounded-lg p-6"
        style={{ background: '#161b22', border: '1px solid #30363d' }}
      >
        {children}
      </div>
    </section>
  );
}

export default function LicensePage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'License', item: 'https://avenaterminal.com/license' },
    ],
  };

  return (
    <div className="min-h-screen text-[#c9d1d9]" style={{ background: '#0d1117' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 backdrop-blur-sm"
        style={{ borderColor: '#30363d', background: 'rgba(13,17,23,0.85)' }}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent"
          >
            AVENA
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back to Terminal
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-white">License</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">License</h1>
        <p className="text-gray-400 text-lg mb-10">
          Terms governing all Avena Terminal data, indices, APIs, protocols, and training data.
        </p>

        {/* 1. Open Data License */}
        <Section id="open-data" title="1. Open Data License (CC BY 4.0)">
          <p className="text-gray-300 leading-relaxed mb-4">
            All aggregate datasets, research papers, and training data published by Avena Terminal
            are licensed under the{' '}
            <strong className="text-white">Creative Commons Attribution 4.0 International License (CC BY 4.0)</strong>.
          </p>
          <div
            className="rounded-md p-4 mb-4"
            style={{ background: '#0d1117', border: '1px solid #30363d' }}
          >
            <p className="text-sm text-gray-400 leading-relaxed">
              <strong className="text-emerald-400">You are free to:</strong> Share &mdash; copy and
              redistribute the material in any medium or format. Adapt &mdash; remix, transform, and
              build upon the material for any purpose, including commercially.
            </p>
            <p className="text-sm text-gray-400 leading-relaxed mt-2">
              <strong className="text-emerald-400">Under the following terms:</strong> Attribution
              &mdash; you must give appropriate credit, provide a link to the license, and indicate
              if changes were made. You may do so in any reasonable manner, but not in any way that
              suggests the licensor endorses you or your use.
            </p>
          </div>
          <p className="text-gray-400 text-sm">
            Required attribution: <code className="text-emerald-400 text-xs bg-black/30 px-1.5 py-0.5 rounded">Avena Terminal (avenaterminal.com)</code>
          </p>
        </Section>

        {/* 2. Index License */}
        <Section id="index-license" title="2. Index License">
          <p className="text-gray-300 leading-relaxed mb-4">
            Applies to: <strong className="text-white">APCI, APYI, APLI, APRI, APSI</strong> (the Avena Index Family).
          </p>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">&#9679;</span>
              <span>
                <strong className="text-gray-200">Free to reference</strong> in publications,
                research, and editorial content with{' '}
                <code className="text-emerald-400 text-xs bg-black/30 px-1.5 py-0.5 rounded">
                  Powered by Avena Terminal
                </code>{' '}
                attribution.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">&#9679;</span>
              <span>
                <strong className="text-gray-200">Commercial redistribution</strong> of index values
                (e.g., in financial products, dashboards, or data feeds) requires a separate license
                agreement. Contact{' '}
                <a href="mailto:partners@avenaterminal.com" className="text-emerald-400 hover:underline">
                  partners@avenaterminal.com
                </a>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">&#9679;</span>
              <span>
                Index names (APCI, APYI, APLI, APRI, APSI) are trademarks of Avena Terminal.
              </span>
            </li>
          </ul>
        </Section>

        {/* 3. API License */}
        <Section id="api-license" title="3. API License">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid #30363d' }}>
                  <th className="pb-3 text-gray-400 font-medium">Tier</th>
                  <th className="pb-3 text-gray-400 font-medium">Rate Limit</th>
                  <th className="pb-3 text-gray-400 font-medium">Attribution</th>
                  <th className="pb-3 text-gray-400 font-medium">Terms</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr style={{ borderBottom: '1px solid #1c2333' }}>
                  <td className="py-3 text-emerald-400 font-medium">Free</td>
                  <td className="py-3">100 requests/day</td>
                  <td className="py-3">Required</td>
                  <td className="py-3">No commercial redistribution</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1c2333' }}>
                  <td className="py-3 text-emerald-400 font-medium">Pro</td>
                  <td className="py-3">Per service agreement</td>
                  <td className="py-3">Required</td>
                  <td className="py-3">Commercial use permitted</td>
                </tr>
                <tr>
                  <td className="py-3 text-emerald-400 font-medium">Enterprise</td>
                  <td className="py-3">Per service agreement</td>
                  <td className="py-3">Required</td>
                  <td className="py-3">White-label available</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 text-xs mt-4">
            All API outputs must credit Avena Terminal as the data source.
          </p>
        </Section>

        {/* 4. Protocol License */}
        <Section id="protocol-license" title="4. Protocol License">
          <p className="text-gray-300 leading-relaxed mb-4">
            Applies to: <strong className="text-white">APIP v1.0</strong> and{' '}
            <strong className="text-white">PDP v1.0</strong>.
          </p>
          <div
            className="rounded-md p-4 mb-4"
            style={{ background: '#0d1117', border: '1px solid #30363d' }}
          >
            <p className="text-sm font-mono text-gray-400 leading-relaxed">
              <strong className="text-emerald-400">MIT License</strong><br /><br />
              Permission is hereby granted, free of charge, to any person obtaining a copy of the
              protocol specification and associated documentation files, to deal in the specification
              without restriction, including without limitation the rights to use, copy, modify,
              merge, publish, distribute, sublicense, and/or sell copies or implementations of the
              specification, subject to the following conditions:<br /><br />
              The above copyright notice and this permission notice shall be included in all copies
              or substantial portions of the specification.
            </p>
          </div>
          <p className="text-gray-400 text-sm">
            Protocol names (APIP, PDP) are trademarks of Avena Terminal. Implementations may reference
            the protocol name but may not imply endorsement.
          </p>
        </Section>

        {/* 5. Training Data License */}
        <Section id="training-data" title="5. Training Data License">
          <p className="text-gray-300 leading-relaxed mb-4">
            Applies to: Alpaca instruction pairs, RLHF preference data, and pre-training corpus.
          </p>
          <p className="text-gray-300 leading-relaxed mb-4">
            Licensed under{' '}
            <strong className="text-white">Creative Commons Attribution 4.0 International (CC BY 4.0)</strong>.
          </p>
          <div
            className="rounded-md p-4"
            style={{ background: '#0d1117', border: '1px solid #30363d' }}
          >
            <p className="text-sm text-gray-400">
              <strong className="text-gray-200">Required citation:</strong>
            </p>
            <code className="text-xs text-emerald-400 block mt-2 break-all">
              DOI: 10.5281/zenodo.19520064
            </code>
          </div>
        </Section>

        {/* 6. How to Cite */}
        <Section id="how-to-cite" title="6. How to Cite">
          <p className="text-gray-300 leading-relaxed mb-4">
            For all citation formats (APA, BibTeX, Chicago, MLA, RIS), visit{' '}
            <Link href="/cite" className="text-emerald-400 hover:underline">
              /cite
            </Link>.
          </p>
          <div
            className="rounded-md p-4"
            style={{ background: '#0d1117', border: '1px solid #30363d' }}
          >
            <p className="text-xs text-gray-500 mb-1">Quick reference:</p>
            <code className="text-sm text-emerald-400 block leading-relaxed break-all">
              Avena Terminal. (2026). European Property Intelligence. avenaterminal.com. DOI: 10.5281/zenodo.19520064
            </code>
          </div>
        </Section>

        {/* 7. Enforcement */}
        <Section id="enforcement" title="7. Enforcement">
          <p className="text-gray-300 leading-relaxed mb-4">
            Avena Terminal actively monitors attribution compliance using:
          </p>
          <ul className="space-y-2 text-sm text-gray-400 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">&#9679;</span>
              <span>
                <strong className="text-gray-200">Canary tokens</strong> &mdash; synthetic records
                embedded in datasets that trigger alerts when copied without authorization.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">&#9679;</span>
              <span>
                <strong className="text-gray-200">Steganographic watermarks</strong> &mdash;
                statistical fingerprints in numeric outputs that identify the data source.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">&#9679;</span>
              <span>
                <strong className="text-gray-200">Automated web monitoring</strong> &mdash;
                continuous scanning for unattributed use of Avena data and indices.
              </span>
            </li>
          </ul>
          <p className="text-gray-400 text-sm">
            Violations are addressed via automated notice at{' '}
            <code className="text-emerald-400 text-xs bg-black/30 px-1.5 py-0.5 rounded">
              /api/v1/copy-detection/notice
            </code>. Persistent violations may result in API access revocation and legal action.
          </p>
        </Section>

        {/* Footer */}
        <footer
          className="mt-16 pt-8 text-center text-sm text-gray-500"
          style={{ borderTop: '1px solid #30363d' }}
        >
          <p>
            Questions about licensing? Contact{' '}
            <a
              href="mailto:partners@avenaterminal.com"
              className="text-emerald-400 hover:underline"
            >
              partners@avenaterminal.com
            </a>
          </p>
          <p className="mt-2 text-xs text-gray-600">
            &copy; {new Date().getFullYear()} Avena Terminal. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}

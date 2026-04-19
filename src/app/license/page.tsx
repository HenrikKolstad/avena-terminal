import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const metadata: Metadata = {
  title: 'License | Avena Terminal',
  description:
    'License terms for Avena Terminal data, indices, APIs, protocols, and training data. Open data under CC BY 4.0, protocol implementations under MIT.',
  alternates: { canonical: 'https://avenaterminal.com/license' },
};
export const revalidate = 86400;

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-sm border p-8"
      style={{
        background: 'hsl(var(--av-surface) / 0.4)',
        borderColor: 'hsl(var(--av-border) / 0.6)',
      }}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-3 flex items-center gap-3">
        <span className="h-px w-8" style={{ background: 'hsl(var(--av-primary))' }} />
        Section {number}
      </span>
      <h2 className="font-serif text-2xl sm:text-3xl font-light tracking-tight text-foreground mb-5">{title}</h2>
      <div className="font-light text-base text-muted-foreground leading-relaxed space-y-4">
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
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Legal · License
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Open to
                <br />
                <span className="italic text-gold">build on</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Terms governing all Avena Terminal data, indices, APIs, protocols, and training data.
              </p>
            </div>
          </div>
        </section>

        {/* Sections */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12">
            <div className="flex flex-col gap-6">
              <Section id="open-data" number="01" title="Open Data License (CC BY 4.0)">
                <p>
                  All aggregate datasets, research papers, and training data published by Avena Terminal
                  are licensed under the{' '}
                  <strong className="text-foreground font-medium">Creative Commons Attribution 4.0 International License (CC BY 4.0)</strong>.
                </p>
                <div
                  className="rounded-sm p-4"
                  style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border) / 0.6)' }}
                >
                  <p className="text-sm">
                    <strong className="text-primary font-medium">You are free to:</strong> Share &mdash; copy and
                    redistribute the material in any medium or format. Adapt &mdash; remix, transform, and
                    build upon the material for any purpose, including commercially.
                  </p>
                  <p className="text-sm mt-2">
                    <strong className="text-primary font-medium">Under the following terms:</strong> Attribution
                    &mdash; you must give appropriate credit, provide a link to the license, and indicate
                    if changes were made. You may do so in any reasonable manner, but not in any way that
                    suggests the licensor endorses you or your use.
                  </p>
                </div>
                <p className="text-sm">
                  Required attribution:{' '}
                  <code className="font-mono text-xs text-primary px-2 py-1 rounded-sm" style={{ background: 'hsl(var(--av-background))' }}>
                    Avena Terminal (avenaterminal.com)
                  </code>
                </p>
              </Section>

              <Section id="index-license" number="02" title="Index License">
                <p>
                  Applies to: <strong className="text-foreground font-medium">APCI, APYI, APLI, APRI, APSI</strong> (the Avena Index Family).
                </p>
                <ul className="space-y-3 list-none pl-0">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1 shrink-0">&#9679;</span>
                    <span className="text-sm">
                      <strong className="text-foreground font-medium">Free to reference</strong> in publications,
                      research, and editorial content with{' '}
                      <code className="font-mono text-xs text-primary px-2 py-0.5 rounded-sm" style={{ background: 'hsl(var(--av-background))' }}>
                        Powered by Avena Terminal
                      </code>{' '}
                      attribution.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1 shrink-0">&#9679;</span>
                    <span className="text-sm">
                      <strong className="text-foreground font-medium">Commercial redistribution</strong> of index values
                      (e.g., in financial products, dashboards, or data feeds) requires a separate license
                      agreement. Contact{' '}
                      <a href="mailto:partners@avenaterminal.com" className="text-primary underline underline-offset-4">
                        partners@avenaterminal.com
                      </a>.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1 shrink-0">&#9679;</span>
                    <span className="text-sm">
                      Index names (APCI, APYI, APLI, APRI, APSI) are trademarks of Avena Terminal.
                    </span>
                  </li>
                </ul>
              </Section>

              <Section id="api-license" number="03" title="API License">
                <div className="overflow-x-auto rounded-sm" style={{ border: '1px solid hsl(var(--av-border) / 0.6)' }}>
                  <table className="w-full font-mono text-sm">
                    <thead>
                      <tr style={{ background: 'hsl(var(--av-background))' }}>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>Tier</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>Rate Limit</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>Attribution</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>Terms</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                        <td className="px-4 py-3 text-primary font-medium">Free</td>
                        <td className="px-4 py-3 text-foreground">100 requests/day</td>
                        <td className="px-4 py-3 text-foreground">Required</td>
                        <td className="px-4 py-3 text-foreground">No commercial redistribution</td>
                      </tr>
                      <tr className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                        <td className="px-4 py-3 text-primary font-medium">Pro</td>
                        <td className="px-4 py-3 text-foreground">Per service agreement</td>
                        <td className="px-4 py-3 text-foreground">Required</td>
                        <td className="px-4 py-3 text-foreground">Commercial use permitted</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-primary font-medium">Enterprise</td>
                        <td className="px-4 py-3 text-foreground">Per service agreement</td>
                        <td className="px-4 py-3 text-foreground">Required</td>
                        <td className="px-4 py-3 text-foreground">White-label available</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  All API outputs must credit Avena Terminal as the data source.
                </p>
              </Section>

              <Section id="protocol-license" number="04" title="Protocol License">
                <p>
                  Applies to: <strong className="text-foreground font-medium">APIP v1.0</strong> and{' '}
                  <strong className="text-foreground font-medium">PDP v1.0</strong>.
                </p>
                <div
                  className="rounded-sm p-4"
                  style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border) / 0.6)' }}
                >
                  <p className="font-mono text-xs text-foreground/90 leading-relaxed">
                    <strong className="text-primary">MIT License</strong>
                    <br /><br />
                    Permission is hereby granted, free of charge, to any person obtaining a copy of the
                    protocol specification and associated documentation files, to deal in the specification
                    without restriction, including without limitation the rights to use, copy, modify,
                    merge, publish, distribute, sublicense, and/or sell copies or implementations of the
                    specification, subject to the following conditions:
                    <br /><br />
                    The above copyright notice and this permission notice shall be included in all copies
                    or substantial portions of the specification.
                  </p>
                </div>
                <p className="text-sm">
                  Protocol names (APIP, PDP) are trademarks of Avena Terminal. Implementations may reference
                  the protocol name but may not imply endorsement.
                </p>
              </Section>

              <Section id="training-data" number="05" title="Training Data License">
                <p>
                  Applies to: Alpaca instruction pairs, RLHF preference data, and pre-training corpus.
                </p>
                <p>
                  Licensed under{' '}
                  <strong className="text-foreground font-medium">Creative Commons Attribution 4.0 International (CC BY 4.0)</strong>.
                </p>
                <div
                  className="rounded-sm p-4"
                  style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border) / 0.6)' }}
                >
                  <p className="text-sm">
                    <strong className="text-foreground font-medium">Required citation:</strong>
                  </p>
                  <code className="font-mono text-xs text-primary block mt-2 break-all">
                    DOI: 10.5281/zenodo.19520064
                  </code>
                </div>
              </Section>

              <Section id="how-to-cite" number="06" title="How to Cite">
                <p>
                  For all citation formats (APA, BibTeX, Chicago, MLA, RIS), visit{' '}
                  <Link href="/cite" className="text-primary underline underline-offset-4">
                    /cite
                  </Link>.
                </p>
                <div
                  className="rounded-sm p-4"
                  style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border) / 0.6)' }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Quick reference</p>
                  <code className="font-mono text-sm text-primary block leading-relaxed break-all">
                    Avena Terminal. (2026). European Property Intelligence. avenaterminal.com. DOI: 10.5281/zenodo.19520064
                  </code>
                </div>
              </Section>

              <Section id="enforcement" number="07" title="Enforcement">
                <p>
                  Avena Terminal actively monitors attribution compliance using:
                </p>
                <ul className="space-y-3 list-none pl-0">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1 shrink-0">&#9679;</span>
                    <span className="text-sm">
                      <strong className="text-foreground font-medium">Canary tokens</strong> &mdash; synthetic records
                      embedded in datasets that trigger alerts when copied without authorization.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1 shrink-0">&#9679;</span>
                    <span className="text-sm">
                      <strong className="text-foreground font-medium">Steganographic watermarks</strong> &mdash;
                      statistical fingerprints in numeric outputs that identify the data source.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1 shrink-0">&#9679;</span>
                    <span className="text-sm">
                      <strong className="text-foreground font-medium">Automated web monitoring</strong> &mdash;
                      continuous scanning for unattributed use of Avena data and indices.
                    </span>
                  </li>
                </ul>
                <p className="text-sm">
                  Violations are addressed via automated notice at{' '}
                  <code className="font-mono text-xs text-primary px-2 py-0.5 rounded-sm" style={{ background: 'hsl(var(--av-background))' }}>
                    /api/v1/copy-detection/notice
                  </code>. Persistent violations may result in API access revocation and legal action.
                </p>
              </Section>
            </div>

            {/* Bottom note */}
            <div className="mt-12 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Questions about licensing? Contact{' '}
                <a href="mailto:partners@avenaterminal.com" className="text-primary underline underline-offset-4">
                  partners@avenaterminal.com
                </a>
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/70 mt-3">
                &copy; {new Date().getFullYear()} Avena Terminal. All rights reserved.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

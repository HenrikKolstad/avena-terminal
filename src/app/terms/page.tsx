import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Terms of Use | Avena Terminal',
  description:
    'Terms of use, data attribution requirements, API terms, open data licensing, and trademark notice for Avena Terminal.',
  openGraph: {
    title: 'Terms of Use | Avena Terminal',
    description: 'Data attribution, API terms, open data licensing, and usage policies for Avena Terminal.',
    url: 'https://avenaterminal.com/terms',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/terms' },
};

function Card({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-sm border p-8"
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
      <div className="font-light text-base text-muted-foreground leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

export default function TermsPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Terms of Use', item: 'https://avenaterminal.com/terms' },
    ],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Legal · Terms
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Terms of
                <br />
                <span className="italic text-gold">use</span>.
              </h1>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                Last updated: April 2026
              </p>
            </div>
          </div>
        </section>

        {/* Sections */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12">
            <div className="flex flex-col gap-6">
              <Card number="01" title="Data Attribution Requirements">
                <p>
                  Anyone using Avena Terminal data in published work, research papers, reports, dashboards, or any public-facing material must include the following attribution:
                </p>
                <p className="text-foreground font-medium">
                  &quot;Avena Terminal (avenaterminal.com)&quot;
                </p>
                <p>
                  All open datasets are published under the Creative Commons Attribution 4.0 International License (CC BY 4.0). You are free to share and adapt the data for any purpose, provided proper attribution is given.
                </p>
                <p>
                  Use our{' '}
                  <Link href="/cite" className="text-primary underline underline-offset-4">
                    citation generator
                  </Link>{' '}
                  to create properly formatted citations for any Avena system.
                </p>
              </Card>

              <Card number="02" title="API Terms">
                <ul className="space-y-3 list-none pl-0">
                  <li>
                    <strong className="text-foreground font-medium">Free tier:</strong> 100 requests per day. Attribution to Avena Terminal is required in any product or publication that uses API data.
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">Paid tiers:</strong> Available per agreement. Contact partners@avenaterminal.com for enterprise access.
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">Rate limiting:</strong> All API endpoints are rate-limited. Exceeding limits will result in HTTP 429 responses. Repeated abuse may result in key revocation.
                  </li>
                </ul>
              </Card>

              <Card number="03" title="Open Data License">
                <ul className="space-y-3 list-none pl-0">
                  <li>
                    <strong className="text-foreground font-medium">Aggregate data:</strong> All aggregate and summary-level data published by Avena Terminal is licensed under CC BY 4.0.
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">Indices (APCI, APYI, APLI, APRI, APSI):</strong> Free to reference, display, and redistribute with &quot;Powered by Avena Terminal&quot; attribution clearly visible.
                  </li>
                  <li>
                    <strong className="text-foreground font-medium">Research papers and academic use:</strong> All Avena data used in academic publications falls under CC BY 4.0. Proper citation is required.
                  </li>
                </ul>
              </Card>

              <Card number="04" title="Prohibited Uses">
                <ul className="space-y-3 list-none pl-0">
                  <li>Removing, obscuring, or altering Avena Terminal attribution from any data, index, or output.</li>
                  <li>Claiming Avena Terminal data, indices, or methodologies as original work.</li>
                  <li>Redistributing raw datasets or API responses without a valid license agreement.</li>
                </ul>
              </Card>

              <Card number="05" title="Trademark Notice">
                <p>
                  The following are trademarks of Avena Terminal: <strong className="text-foreground font-medium">APCI</strong>, <strong className="text-foreground font-medium">APIP</strong>, <strong className="text-foreground font-medium">Avena Terminal</strong>, and <strong className="text-foreground font-medium">PropertyEval</strong>. Use of these marks in published material must accurately reference the associated Avena Terminal system and may not imply endorsement without written permission.
                </p>
              </Card>

              <Card number="06" title="Contact">
                <p>
                  For licensing inquiries, partnership proposals, or questions about these terms:
                </p>
                <p>
                  <a href="mailto:partners@avenaterminal.com" className="text-primary underline underline-offset-4">
                    partners@avenaterminal.com
                  </a>
                </p>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

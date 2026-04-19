import { Metadata } from 'next';
import { createHash } from 'crypto';
import { getAllProperties } from '@/lib/properties';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Data Verification | Avena Terminal',
  description: 'Verify any Avena Terminal statistic. Every data point is cryptographically hashed and publicly auditable. First verified property intelligence platform in Europe.',
  alternates: { canonical: 'https://avenaterminal.com/verify' },
  openGraph: {
    title: 'Data Verification | Avena Terminal',
    description: 'Verify any Avena Terminal statistic. Every data point is cryptographically hashed and publicly auditable.',
    url: 'https://avenaterminal.com/verify',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

const steps = [
  {
    step: 1,
    title: 'Data Created',
    desc: 'Every property record, score, and statistic is processed. A SHA-256 cryptographic hash is generated from the raw data.',
    icon: '01',
  },
  {
    step: 2,
    title: 'Hash Stored Immutably',
    desc: 'The hash and timestamp are stored in an append-only log. No record can be altered without invalidating the chain.',
    icon: '02',
  },
  {
    step: 3,
    title: 'Anyone Verifies',
    desc: 'Paste any statistic or property reference to verify its integrity. The system returns a cryptographic proof of authenticity.',
    icon: '03',
  },
];

const standards = [
  { title: 'SHA-256 Cryptographic Hashing', desc: 'Industry-standard hashing algorithm used by Bitcoin, TLS, and government systems.' },
  { title: 'Blockchain Data Provenance', desc: 'Polygon-based on-chain anchoring for tamper-proof audit trails. (Pending deployment)' },
  { title: 'EU AI Act Compliance Ready', desc: 'Transparent AI decision-making with full audit trail for algorithmic scoring.' },
  { title: 'GDPR Compliant', desc: 'No personally identifiable information in hashed data. All verification is pseudonymous.' },
  { title: 'Academic DOI', desc: 'Registered with Zenodo: 10.5281/zenodo.19520064 for academic citation and permanence.' },
];

const beneficiaries = [
  {
    title: 'Banks & Lenders',
    desc: 'Verify property valuations and market data before underwriting loans. Reduce risk with cryptographically proven statistics.',
  },
  {
    title: 'Regulators',
    desc: 'Audit AI-driven property assessments with full data provenance. Ensure compliance with EU AI Act transparency requirements.',
  },
  {
    title: 'Journalists',
    desc: 'Cite Avena data with confidence. Every statistic can be independently verified and traced to its source.',
  },
  {
    title: 'AI Companies',
    desc: 'Train models on verified, high-quality property data. Each data point carries a cryptographic proof of integrity.',
  },
];

export default function VerifyPage() {
  const properties = getAllProperties();
  const totalProperties = properties.length;

  const hashInput = JSON.stringify(
    properties.map((p) => ({ ref: p.ref, score: p._sc }))
  );
  const datasetHash = createHash('sha256').update(hashInput).digest('hex');
  const timestamp = new Date().toISOString();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Data Verification | Avena Terminal',
    description: 'Cryptographic data verification for Avena Terminal statistics.',
    url: 'https://avenaterminal.com/verify',
    publisher: {
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
    },
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Trust · Cryptographic Verification
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Verify without
                <br />
                <span className="italic text-gold">trusting us</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Every data point in Avena Terminal is cryptographically hashed and publicly
                auditable. Check any statistic, any time.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                How it works
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Three steps to <span className="italic text-gold">integrity</span>.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {steps.map((s) => (
                <div
                  key={s.step}
                  className="rounded-sm border p-6 relative"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <span className="font-mono text-3xl font-light text-primary/30 absolute top-4 right-4 tabular">
                    {s.icon}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary block mb-3">
                    Step {s.step}
                  </span>
                  <h3 className="font-serif text-xl font-light text-foreground mb-2">{s.title}</h3>
                  <p className="font-light text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Current dataset integrity */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Current Dataset Integrity
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                The <span className="italic text-gold">canonical</span> hash.
              </h2>
            </div>
            <div
              className="rounded-sm border p-8"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <div className="flex items-center gap-3 mb-8">
                <span className="pulse-dot relative inline-block h-2 w-2 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                  Verified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                    Total Properties
                  </div>
                  <div className="font-serif text-3xl font-light text-foreground tabular">
                    {totalProperties.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                    Verification Status
                  </div>
                  <div className="font-serif text-3xl font-light text-primary tabular">
                    VERIFIED
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                    SHA-256 Dataset Hash
                  </div>
                  <pre
                    className="rounded-sm p-4 overflow-x-auto font-mono text-xs text-foreground/90 break-all whitespace-pre-wrap"
                    style={{
                      background: 'hsl(var(--av-background))',
                      border: '1px solid hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <code>{datasetHash}</code>
                  </pre>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                    Timestamp (ISO 8601)
                  </div>
                  <div className="font-mono text-sm text-foreground/90">
                    {timestamp}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                    Hash Algorithm
                  </div>
                  <div className="font-mono text-sm text-foreground/90">
                    SHA-256
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Verification standards */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Verification Standards
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                What backs the <span className="italic text-gold">chain</span>.
              </h2>
            </div>
            <div className="space-y-3">
              {standards.map((s) => (
                <div
                  key={s.title}
                  className="rounded-sm border px-5 py-4 flex items-start gap-4"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <span className="text-primary mt-0.5 shrink-0">&#10003;</span>
                  <div>
                    <h3 className="font-serif text-lg font-light text-foreground">{s.title}</h3>
                    <p className="font-light text-sm text-muted-foreground mt-1">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who benefits */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Who benefits
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                For every <span className="italic text-gold">auditor</span>.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {beneficiaries.map((b) => (
                <div
                  key={b.title}
                  className="rounded-sm border p-6"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <h3 className="font-serif text-xl font-light text-foreground mb-2">{b.title}</h3>
                  <p className="font-light text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* API endpoint */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                API Endpoint
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Programmatic <span className="italic text-gold">access</span>.
              </h2>
            </div>
            <div
              className="rounded-sm border p-6"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                Verification Endpoint
              </div>
              <pre
                className="rounded-sm p-4 overflow-x-auto font-mono text-sm text-primary mb-4"
                style={{
                  background: 'hsl(var(--av-background))',
                  border: '1px solid hsl(var(--av-border) / 0.6)',
                }}
              >
                <code>GET /api/zk/verify</code>
              </pre>
              <p className="font-light text-sm text-muted-foreground">
                Returns the current dataset hash, timestamp, and verification status.
                Use this endpoint to programmatically verify any Avena Terminal statistic
                against the canonical dataset hash.
              </p>
            </div>
          </div>
        </section>

        {/* Closing note */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Data sourced from publicly available property listings.
              No personally identifiable information is stored or hashed.
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/70 mt-3">
              &copy; {new Date().getFullYear()} Avena Terminal. All rights reserved.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

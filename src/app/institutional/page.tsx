import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Check, Lock } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { InstitutionalForm } from './InstitutionalForm';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Institutional — Avena Terminal',
  description:
    'Avena Terminal for funds, family offices, and banks. Dedicated API, custom coverage, direct line to the desk. Get onboarded in under 5 minutes.',
  alternates: { canonical: 'https://avenaterminal.com/institutional' },
  openGraph: {
    title: 'Avena Terminal — Institutional',
    description:
      'European property intelligence for funds and banks. Dedicated API, custom coverage, direct line.',
    url: 'https://avenaterminal.com/institutional',
    siteName: 'Avena Terminal',
  },
};

const tiers = [
  {
    name: 'Desk',
    price: '€2,500 / mo',
    for: 'Small allocators, family offices, boutique RIAs',
    includes: [
      'Dedicated API key · 100 req/s burst',
      'Full dataset export · CSV / JSONL / Parquet',
      'Precursor signal API + custom market monitoring',
      'Genesis simulator — unlimited scenarios + PDF reports',
      'Counterpart intelligence — full network graph + stress alerts',
      'Weekly desk call · Monday 14:00 CET',
      'Custom coverage: up to 2 EU regions',
      'Prediction Ledger white-labeled access',
      'Direct email line to the desk · 4h response',
    ],
  },
  {
    name: 'Fund',
    price: '€12,000 / mo',
    for: 'Property funds, credit desks, sovereign wealth',
    includes: [
      'Everything in Desk',
      'Unlimited API rate limit',
      'Custom scoring model · region-tuned',
      'Precursor — custom signal categories for your mandate',
      'Genesis — portfolio-level scenario simulation',
      'Counterpart — bulk developer scanning + contagion modeling for your portfolio',
      'Weekly private brief · delivered to your MDs',
      'Ad-hoc research requests · 24h turnaround',
      'Dedicated Slack channel with the founders',
      'Quarterly on-site review · London / Madrid / Oslo',
    ],
    featured: true,
  },
  {
    name: 'Sovereign',
    price: 'On request',
    for: 'Central banks, national pension funds, DFIs',
    includes: [
      'Everything in Fund',
      'Full raw-feed access · property + transaction microdata',
      'Bespoke causal-intelligence engine for your mandate',
      'Quarterly review with Head of Research',
      'On-premise deployment option',
      'White-glove onboarding · first quarter free',
    ],
  },
];

const proofPoints = [
  { label: 'Scored properties (EU)', value: '1,881' },
  { label: 'Public API endpoints', value: '208' },
  { label: 'Daily autonomous jobs', value: '25' },
  { label: 'Citation sources (AI + academic)', value: 'Perplexity · Zenodo · Wikidata · HF' },
  { label: 'Published prediction accuracy', value: 'Tracked at /predictions' },
  { label: 'License', value: 'CC BY 4.0 · DOI 10.5281/zenodo.19520064' },
];

const timeline = [
  { step: '00:00', action: 'Request access', detail: 'Leave your email + a sentence about your mandate' },
  { step: '00:15', action: 'Reply from the desk', detail: 'We confirm fit + send the onboarding doc' },
  { step: '00:30', action: 'Dedicated API key issued', detail: 'Scoped + rate-limited · live immediately' },
  { step: '02:00', action: 'First custom brief delivered', detail: 'Tailored to your mandate + regions' },
];

export default function InstitutionalPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section
          className="relative overflow-hidden border-b"
          style={{
            borderColor: 'hsl(var(--av-border) / 0.6)',
            background:
              'radial-gradient(ellipse 90% 60% at 50% 0%, hsl(42 85% 64% / 0.12), transparent 70%), hsl(var(--av-background))',
          }}
        >
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-24 sm:py-32">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Institutional · Funds · Family Offices · Banks
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-8xl font-light leading-[0.92] tracking-tight text-foreground mb-6 max-w-5xl">
              The terminal your allocators
              <br />
              already <span className="italic text-gold">wish</span> you had.
            </h1>
            <p className="max-w-2xl text-xl text-muted-foreground font-light leading-relaxed">
              Dedicated API. Custom coverage. Direct line to the desk. Onboarded in
              under five minutes.
            </p>
          </div>
        </section>

        {/* Proof strip */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-10">
            <div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px overflow-hidden rounded-sm border"
              style={{
                background: 'hsl(var(--av-border) / 0.6)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              {proofPoints.map((p) => (
                <div key={p.label} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                    {p.label}
                  </div>
                  <div className="font-serif text-lg tabular text-foreground">{p.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20">
            <div className="flex items-baseline justify-between mb-10">
              <h2 className="font-serif text-4xl font-light tracking-tight text-foreground">
                Onboarded in <span className="italic text-gold">two hours</span>.
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                · 02
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {timeline.map((t, i) => (
                <div
                  key={t.step}
                  className="rounded-sm border p-6"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                    Step {String(i + 1).padStart(2, '0')} · {t.step}
                  </div>
                  <div className="font-serif text-xl text-foreground mb-2">{t.action}</div>
                  <div className="text-sm text-muted-foreground font-light leading-relaxed">
                    {t.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tiers */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20">
            <div className="flex items-baseline justify-between mb-10">
              <h2 className="font-serif text-4xl font-light tracking-tight text-foreground">
                Three <span className="italic text-gold">mandates</span>.
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                · 03
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiers.map((t) => (
                <div
                  key={t.name}
                  className="rounded-sm border p-8 flex flex-col"
                  style={
                    t.featured
                      ? {
                          background:
                            'linear-gradient(180deg, hsl(var(--av-primary) / 0.08) 0%, hsl(var(--av-surface)) 100%)',
                          borderColor: 'hsl(var(--av-primary) / 0.4)',
                          boxShadow: 'var(--av-shadow-gold)',
                        }
                      : {
                          background: 'hsl(var(--av-surface) / 0.4)',
                          borderColor: 'hsl(var(--av-border) / 0.6)',
                        }
                  }
                >
                  {t.featured && (
                    <span className="mb-4 self-start rounded-sm px-3 py-1 font-mono text-[9px] uppercase tracking-[0.3em] text-primary-foreground" style={{ background: 'var(--av-gradient-gold)' }}>
                      Most common
                    </span>
                  )}
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                    {t.name}
                  </div>
                  <div className="font-serif text-4xl font-light tabular text-foreground mb-2">
                    {t.price}
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-6">
                    {t.for}
                  </div>
                  <ul className="space-y-3 mb-6 flex-1">
                    {t.includes.map((line) => (
                      <li key={line} className="flex items-start gap-2 text-sm text-foreground/90 font-light">
                        <Check className="h-3.5 w-3.5 mt-1 flex-shrink-0 text-primary" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#request"
                    className="group inline-flex items-center justify-center gap-2 rounded-sm px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] transition-all"
                    style={
                      t.featured
                        ? {
                            background: 'var(--av-gradient-gold)',
                            color: 'hsl(var(--av-primary-foreground))',
                            boxShadow: 'var(--av-shadow-gold)',
                          }
                        : {
                            border: '1px solid hsl(var(--av-border-strong))',
                            color: 'hsl(var(--av-foreground))',
                          }
                    }
                  >
                    Request access
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stack / technical */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20">
            <div className="flex items-baseline justify-between mb-10">
              <h2 className="font-serif text-4xl font-light tracking-tight text-foreground">
                The <span className="italic text-gold">stack</span>.
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                · 04
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: 'Live, not lagged',
                  body: '25 autonomous crons run every day. Price snapshots, anomaly detection, causal-engine refresh, prediction verification, citation polling. Your API call reflects state of the world at most 24h ago — usually within the hour.',
                },
                {
                  title: 'Machine-readable by default',
                  body: '208 public endpoints. OpenAPI catalog at /api/index. SPARQL endpoint at /api/v1/sparql. RDF Turtle export, Wikidata mapping, JSON-LD ontology. If your research pipeline can read HTTP, it can read Avena.',
                },
                {
                  title: 'Verified predictions',
                  body: 'Every forward call published at /predictions gets automatically verified at its horizon (30 / 90 / 365 days). Accuracy leaderboard is public. Nobody else in EU PropTech publishes a dated record like this.',
                },
                {
                  title: 'Cited where it matters',
                  body: 'Zenodo DOI (10.5281/zenodo.19520064), Wikidata entity (Q139165733), HuggingFace dataset, Smithery MCP registry. Real attribution, traceable in peer review.',
                },
                {
                  title: 'Deployed on Vercel, proxied for EU',
                  body: 'Functions run on Vercel Edge where possible, Fluid Compute elsewhere. EU-origin traffic stays EU. Supabase PostgreSQL with row-level security. SOC 2 of the underlying infra.',
                },
                {
                  title: 'Customisable scoring',
                  body: 'The default Avena Score (0.40V + 0.25Y + 0.20L + 0.10Q + 0.05R) is a starting point. Fund tier gets region-tuned weights — we retrain on your universe and ship the model.',
                },
              ].map((block) => (
                <div
                  key={block.title}
                  className="rounded-sm border p-6"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <div className="font-serif text-xl text-foreground mb-3">{block.title}</div>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">
                    {block.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Request form */}
        <section
          id="request"
          className="relative border-b scroll-mt-24"
          style={{
            borderColor: 'hsl(var(--av-border) / 0.6)',
            background:
              'radial-gradient(ellipse 60% 80% at 50% 0%, hsl(42 85% 64% / 0.12), transparent 70%)',
          }}
        >
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-24">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
                <Lock className="h-3 w-3" />
                Private · No forms routed to a team
              </span>
              <h2 className="font-serif text-5xl font-light tracking-tight text-foreground mb-4">
                Request <span className="italic text-gold">access</span>.
              </h2>
              <p className="text-muted-foreground font-light max-w-lg mx-auto">
                Leave your email and a sentence about your mandate. The desk
                replies within 4 hours, 24h maximum. API key usually issued
                same day.
              </p>
            </div>
            <InstitutionalForm />
            <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
              Prefer email?{' '}
              <Link href="mailto:henrik@xaviaestate.com?subject=Institutional%20enquiry" className="text-primary hover:text-gold">
                henrik@xaviaestate.com
              </Link>{' '}
              · Or{' '}
              <Link href="/contact" className="text-primary hover:text-gold">
                WhatsApp
              </Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

interface APCIData {
  apci: number;
  date: string;
  phase: string;
  week_change: number;
  dimensions: Record<string, number>;
  narrative: string;
  methodology: {
    total_properties: number;
    total_anomalies: number;
    positive_anomalies: number;
    negative_anomalies: number;
    underpriced_count: number;
  };
  source: string;
  doi: string;
}

const DIMENSION_LABELS: Record<string, { label: string; weight: string; desc: string }> = {
  valuation_balance: { label: 'Valuation Balance', weight: '25%', desc: 'Percentage of properties priced at or below fair market value' },
  developer_health: { label: 'Developer Health', weight: '15%', desc: 'Financial stability and delivery track record of active developers' },
  macro_support: { label: 'Macro Support', weight: '15%', desc: 'ECB rates, GDP growth, inflation trends supporting property markets' },
  price_momentum: { label: 'Price Momentum', weight: '10%', desc: 'Year-on-year price appreciation trends across regions' },
  anomaly_density: { label: 'Anomaly Density', weight: '10%', desc: 'Ratio of positive vs negative pricing anomalies detected' },
  regime_confidence: { label: 'Regime Confidence', weight: '10%', desc: 'Confidence in current market regime classification' },
  foreign_demand: { label: 'Foreign Demand', weight: '10%', desc: 'Cross-border buyer activity from UK, Nordic, and EU markets' },
  supply_balance: { label: 'Supply Balance', weight: '5%', desc: 'New supply pipeline vs absorption rate equilibrium' },
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-primary';
  if (score >= 60) return 'text-foreground';
  if (score >= 45) return 'text-accent';
  return 'text-destructive';
}

function phaseColors(phase: string) {
  switch (phase) {
    case 'BULL': return { bg: 'hsl(var(--av-primary) / 0.1)', border: 'hsl(var(--av-primary) / 0.4)', text: 'hsl(var(--av-primary))' };
    case 'GROWTH': return { bg: 'hsl(var(--av-success) / 0.1)', border: 'hsl(var(--av-success) / 0.4)', text: 'hsl(var(--av-success))' };
    case 'NEUTRAL': return { bg: 'hsl(var(--av-warning) / 0.1)', border: 'hsl(var(--av-warning) / 0.4)', text: 'hsl(var(--av-warning))' };
    case 'CAUTION': return { bg: 'hsl(var(--av-destructive) / 0.1)', border: 'hsl(var(--av-destructive) / 0.4)', text: 'hsl(var(--av-destructive))' };
    default: return { bg: 'hsl(var(--av-muted))', border: 'hsl(var(--av-border))', text: 'hsl(var(--av-muted-foreground))' };
  }
}

export default function APCIPage() {
  const [data, setData] = useState<APCIData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/apci')
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  const jsonLd = data ? {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Property Consciousness Index (APCI)',
    description: 'A composite real-time index measuring European new-build property market health across 8 dimensions.',
    url: 'https://avenaterminal.com/apci',
    identifier: 'doi:10.5281/zenodo.19520064',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    dateModified: data.date,
    variableMeasured: Object.keys(DIMENSION_LABELS).map(k => ({
      '@type': 'PropertyValue', name: DIMENSION_LABELS[k].label, value: data.dimensions[k],
    })),
  } : null;

  return (
    <div className="avena-v2 min-h-screen">
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}

      <Nav />

      <main className="pt-24">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
          {error && (
            <div
              className="rounded-sm border p-4 mb-8"
              style={{
                background: 'hsl(var(--av-destructive) / 0.08)',
                borderColor: 'hsl(var(--av-destructive) / 0.3)',
              }}
            >
              <p className="text-destructive font-mono text-sm">Failed to load APCI: {error}</p>
            </div>
          )}

          {!data && !error && (
            <div className="flex items-center justify-center py-32">
              <div
                className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: 'hsl(var(--av-primary))', borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {data && (
            <>
              {/* Hero */}
              <section className="py-16 sm:py-24 text-center">
                <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                  <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                  APCI · Live Index
                  <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                </span>
                <h1 className="font-serif text-4xl sm:text-5xl font-light leading-tight tracking-tight text-foreground mb-8">
                  The <span className="italic text-gold">Avena Property</span>
                  <br />Consciousness Index
                </h1>

                <div className={`font-serif text-[12rem] sm:text-[16rem] font-extralight leading-none tabular ${scoreColor(data.apci)} mb-6`}>
                  {data.apci}
                </div>

                <div className="flex items-center justify-center gap-6 mb-4">
                  {(() => {
                    const c = phaseColors(data.phase);
                    return (
                      <span
                        className="px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] border rounded-sm"
                        style={{ background: c.bg, borderColor: c.border, color: c.text }}
                      >
                        {data.phase}
                      </span>
                    );
                  })()}
                  <span className={`font-mono text-sm tabular ${data.week_change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {data.week_change >= 0 ? '\u2191' : '\u2193'} {Math.abs(data.week_change)} this week
                  </span>
                </div>
                <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.22em]">{data.date}</p>
              </section>

              {/* Dimensions Breakdown */}
              <section className="py-16 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <div className="mb-10">
                  <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                    <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                    8 Dimensions · Weighted
                  </span>
                  <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                    The anatomy of a market.
                  </h2>
                </div>

                <div className="grid gap-3">
                  {Object.entries(DIMENSION_LABELS).map(([key, meta]) => {
                    const val = data.dimensions[key] ?? 0;
                    return (
                      <div
                        key={key}
                        className="rounded-sm border p-5"
                        style={{
                          background: 'hsl(var(--av-surface) / 0.4)',
                          borderColor: 'hsl(var(--av-border) / 0.6)',
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="font-serif text-lg text-foreground">{meta.label}</span>
                            <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                              Weight {meta.weight}
                            </span>
                          </div>
                          <span className={`font-serif text-3xl font-light tabular ${scoreColor(val)}`}>{val}</span>
                        </div>
                        <div
                          className="w-full rounded-full h-1 mb-3"
                          style={{ background: 'hsl(var(--av-border))' }}
                        >
                          <div
                            className="h-1 rounded-full transition-all duration-700"
                            style={{
                              width: `${val}%`,
                              background: val >= 60 ? 'var(--av-gradient-gold)' : val >= 45 ? 'hsl(var(--av-warning))' : 'hsl(var(--av-destructive))',
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{meta.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Narrative + Stats */}
              <section className="py-16 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <div
                  className="rounded-sm border p-8"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                    <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                    Market Narrative
                  </span>
                  <p className="font-serif text-2xl font-light leading-snug text-foreground">{data.narrative}</p>

                  <div
                    className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t"
                    style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  >
                    <div>
                      <div className="font-serif text-3xl font-light text-foreground tabular">
                        {data.methodology.total_properties.toLocaleString()}
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        Properties Tracked
                      </div>
                    </div>
                    <div>
                      <div className="font-serif text-3xl font-light text-foreground tabular">
                        {data.methodology.total_anomalies}
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        Anomalies Detected
                      </div>
                    </div>
                    <div>
                      <div className="font-serif text-3xl font-light text-primary tabular">
                        {data.methodology.positive_anomalies}
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        Positive Signals
                      </div>
                    </div>
                    <div>
                      <div className="font-serif text-3xl font-light text-destructive tabular">
                        {data.methodology.negative_anomalies}
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        Negative Signals
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* What is the APCI? */}
              <section className="py-16 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <div className="max-w-3xl">
                  <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                    <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                    Methodology
                  </span>
                  <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground mb-6">
                    The <span className="italic text-gold">VIX</span> for European property.
                  </h2>
                  <p className="text-lg text-muted-foreground mb-4 font-light">
                    Like the VIX for stocks. Like Fear &amp; Greed for crypto. But for European property.
                  </p>
                  <p className="text-muted-foreground mb-8 font-light">
                    The Avena Property Consciousness Index (APCI) is a composite real-time score from 0 to 100
                    that measures the overall health and opportunity level of the European new-build property market.
                    It synthesizes 8 independent dimensions into a single number that institutional and retail
                    investors can use to gauge market conditions.
                  </p>

                  <div
                    className="rounded-sm border p-6 mb-6"
                    style={{
                      background: 'hsl(var(--av-surface) / 0.4)',
                      borderColor: 'hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <h3 className="font-serif text-lg text-foreground mb-4">Component Weighting</h3>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      {Object.entries(DIMENSION_LABELS).map(([key, meta]) => (
                        <li key={key} className="flex gap-3">
                          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary pt-1 w-12 shrink-0">
                            {meta.weight}
                          </span>
                          <span><strong className="text-foreground">{meta.label}</strong> &mdash; {meta.desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Updated hourly &middot; DOI {data.doi}
                  </p>
                </div>
              </section>

              {/* API Access */}
              <section className="py-16 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <div
                  className="rounded-sm border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <div>
                    <h3 className="font-serif text-xl text-foreground mb-1">API Access</h3>
                    <p className="text-muted-foreground text-sm">Public JSON endpoint. No API key required.</p>
                  </div>
                  <code
                    className="rounded-sm px-4 py-3 font-mono text-sm text-primary"
                    style={{
                      background: 'hsl(var(--av-background))',
                      border: '1px solid hsl(var(--av-border))',
                    }}
                  >
                    GET /api/v1/apci
                  </code>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/indices"
                    className="group inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                    style={{ borderColor: 'hsl(var(--av-border-strong))' }}
                  >
                    All 5 Indices →
                  </Link>
                  <Link
                    href="/methodology"
                    className="group inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                    style={{ borderColor: 'hsl(var(--av-border-strong))' }}
                  >
                    Full methodology
                  </Link>
                  <Link
                    href="/cite/apci"
                    className="group inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                    style={{ borderColor: 'hsl(var(--av-border-strong))' }}
                  >
                    Cite this index
                  </Link>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

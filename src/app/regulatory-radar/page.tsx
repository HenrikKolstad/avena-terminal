/**
 * /regulatory-radar — every European regulatory signal classified for
 * property-market impact. Architectural Commitment 8.
 *
 * Reads from regulatory_signals + regulatory_property_impact. Updated daily
 * by /api/cron/sync-regulatory-signals.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { recentSignals, impactsForSignals } from '@/lib/regulatory-intent';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Regulatory Radar · European property policy intent, live',
  description: 'Every ECB, ESMA, EBA, and national central bank signal classified daily for European residential property impact. Bloomberg Government Affairs at zero marginal cost.',
  alternates: { canonical: 'https://avenaterminal.com/regulatory-radar' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Avena Regulatory Radar',
  description: 'Continuously updated graph of European regulatory signals classified for residential property market impact.',
  url: 'https://avenaterminal.com/regulatory-radar',
  publisher: { '@type': 'Organization', name: 'Avena Terminal' },
  license: 'https://creativecommons.org/licenses/by/4.0/',
};

const DIRECTION_COLOR: Record<string, string> = {
  tightening: 'hsl(var(--av-destructive))',
  loosening:  'hsl(var(--av-success))',
  neutral:    'hsl(var(--av-muted-foreground))',
  unclear:    'hsl(var(--av-warning))',
};

export default async function RegulatoryRadarPage() {
  const signals = await recentSignals(50);
  const impacts = await impactsForSignals(signals.map(s => s.id));

  const summary = {
    total: signals.length,
    tightening: signals.filter(s => s.intent_direction === 'tightening').length,
    loosening:  signals.filter(s => s.intent_direction === 'loosening').length,
    by_body: Array.from(signals.reduce((m, s) => m.set(s.source_body, (m.get(s.source_body) ?? 0) + 1), new Map<string, number>())).sort((a, b) => b[1] - a[1]),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pt-16 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Architectural Commitment 08 · Regulatory Intent Graph
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05]">
            European regulation, classified for property impact.
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground leading-relaxed">
            Every ECB working paper, ESMA consultation, EBA technical standard, and national central bank speech ingested daily. Claude classifies each signal for direction (tightening, loosening, neutral) and attaches estimated property-market impact coefficients with lag estimates. Bloomberg&apos;s Government Affairs desk does this for €50K/year per client. We publish it at the public URL.
          </p>
        </section>

        {/* Summary strip */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card label="Active signals" value={summary.total} />
            <Card label="Tightening" value={summary.tightening} color="hsl(var(--av-destructive))" />
            <Card label="Loosening"  value={summary.loosening}  color="hsl(var(--av-success))" />
            <Card label="Sources" value={summary.by_body.length} />
          </div>
        </section>

        {/* Signal stream */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">
            Last {signals.length} property-relevant signals
          </div>
          {signals.length === 0 ? (
            <div className="rounded-sm border p-10" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
              <p className="text-sm text-foreground/85">
                The regulatory radar has not yet ingested its first batch in this environment. The daily cron at 04:30 UTC pulls ECB, ESMA, EBA, BdE, BdF, and Bundesbank feeds — once it runs, signals will populate here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {signals.map(s => {
                const sigImpacts = impacts.get(s.id) ?? [];
                return (
                  <div key={s.id} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                    <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-[9px] uppercase tracking-[0.32em] px-2 py-1 rounded-sm text-foreground" style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border) / 0.6)' }}>
                          {s.source_body}
                        </span>
                        {s.intent_direction && (
                          <span className="font-mono text-[9px] uppercase tracking-[0.32em] px-2 py-1 rounded-sm" style={{ color: DIRECTION_COLOR[s.intent_direction] }}>
                            {s.intent_direction}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground">{s.signal_type}</span>
                        {s.confidence != null && (
                          <span className="font-mono text-[10px] text-muted-foreground tabular">conf {(s.confidence * 100).toFixed(0)}%</span>
                        )}
                      </div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground whitespace-nowrap">
                        {s.published_at?.slice(0, 10) ?? s.ingested_at.slice(0, 10)}
                      </span>
                    </div>
                    <h3 className="font-serif text-xl font-light text-foreground leading-snug mb-2">
                      {s.source_document_url ? (
                        <a href={s.source_document_url} target="_blank" rel="noopener" className="hover:text-primary">{s.title}</a>
                      ) : s.title}
                    </h3>
                    {s.summary && <p className="text-sm text-foreground/85 leading-relaxed mb-3">{s.summary}</p>}
                    {s.topic_tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {s.topic_tags.map(t => (
                          <span key={t} className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground border rounded-sm px-2 py-0.5" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>{t}</span>
                        ))}
                      </div>
                    )}
                    {sigImpacts.length > 0 && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Estimated property impact</div>
                        <div className="space-y-1.5">
                          {sigImpacts.map(imp => (
                            <div key={imp.id} className="flex items-start gap-3 text-xs">
                              <span className="font-mono text-foreground whitespace-nowrap">{imp.affected_segment}</span>
                              <span className="font-mono tabular" style={{ color: imp.estimated_coefficient < 0 ? 'hsl(var(--av-destructive))' : imp.estimated_coefficient > 0 ? 'hsl(var(--av-success))' : 'hsl(var(--av-muted-foreground))' }}>
                                {imp.estimated_coefficient > 0 ? '+' : ''}{(imp.estimated_coefficient * 100).toFixed(1)}%
                              </span>
                              <span className="font-mono text-muted-foreground/70 whitespace-nowrap">~{imp.estimated_lag_days}d lag</span>
                              {imp.rationale && <span className="text-muted-foreground italic">— {imp.rationale}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Methodology footer */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">How it works</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              Daily cron pulls ECB press + research, ESMA consultations, EBA technical standards, BdE / BdF / Bundesbank communiqués. Heuristic pre-filter rejects non-property items; Claude Sonnet 4.5 classifies the remainder into signal_type, intent_direction, topic_tags, and a list of estimated property-market impacts with coefficients in [-1, +1] and lag-day estimates. All classifications are recorded in the event store and accountable to the methodology version that produced them.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Link href="/methodology/evolution" className="text-foreground/85 hover:text-primary">Classifier methodology →</Link>
              <Link href="/timetravel?type=regulatory" className="text-foreground/85 hover:text-primary">Replay signal history →</Link>
              <Link href="/policy-engine" className="text-foreground/85 hover:text-primary">Stress test under regime →</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Card({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.32em]" style={{ color: color ?? 'hsl(var(--av-muted-foreground))' }}>{label}</div>
      <div className="mt-2 font-serif text-4xl font-light text-foreground tabular">{value}</div>
    </div>
  );
}

/**
 * /timetravel — explore Avena system state at any historical moment.
 *
 * Powered by the event store (Architectural Commitment 1). Every state
 * change in Avena writes an immutable event; this page reads the log to
 * reconstruct what the system "knew" at any point in time.
 *
 * Query params:
 *   ?as_of=2026-03-14T00:00:00Z   — clamp replay to this moment
 *   ?type=property|regime|...      — filter by aggregate type
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { recentEvents, eventTotalsAsOf, parseAsOf, type AggregateType } from '@/lib/event-store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Time Travel · Replay Avena at any historical moment',
  description: 'Avena is event-sourced. Every state change in the system is an immutable event. Reconstruct what Avena knew at any moment — for backtest, audit, or diligence.',
  alternates: { canonical: 'https://avenaterminal.com/timetravel' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Time Travel — Avena Event Store',
  description: 'Replay the Avena Terminal system state at any historical moment via the public event log.',
  url: 'https://avenaterminal.com/timetravel',
  isPartOf: { '@type': 'WebSite', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
};

const TYPES: { value: AggregateType | 'all'; label: string }[] = [
  { value: 'all', label: 'All events' },
  { value: 'property', label: 'Property' },
  { value: 'regime', label: 'Regime' },
  { value: 'counterpart', label: 'Counterpart' },
  { value: 'avm_query', label: 'AVM' },
  { value: 'memo', label: 'Memo' },
  { value: 'methodology', label: 'Methodology' },
  { value: 'macro', label: 'Macro' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'prediction', label: 'Prediction' },
];

interface SearchParams {
  searchParams: Promise<{ as_of?: string; type?: string }>;
}

export default async function TimeTravelPage({ searchParams }: SearchParams) {
  const sp = await searchParams;
  const asOf = parseAsOf(sp.as_of);
  const typeFilter = (sp.type && TYPES.find(t => t.value === sp.type)?.value) || 'all';

  const [events, totals] = await Promise.all([
    recentEvents({
      limit: 100,
      aggregate_type: typeFilter === 'all' ? undefined : (typeFilter as AggregateType),
      before: asOf ?? undefined,
    }),
    eventTotalsAsOf(asOf),
  ]);

  const asOfDisplay = asOf ?? 'now';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pt-16 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Architectural Commitment 01 · Event Sourcing
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05]">
            Reconstruct what Avena knew on any date.
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground leading-relaxed">
            Every state change in Avena Terminal — every score revision, every regime classification, every AVM query, every grade change — is written to an append-only event log <em>before</em> the projection updates. The database is the operational view; the event log is the truth. Replay it at any timestamp to see the system as it existed then.
          </p>
        </section>

        {/* Controls */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-6">
          <form className="rounded-sm border p-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto]" style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface) / 0.4)' }}>
            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground block mb-1">As of (ISO 8601)</span>
              <input
                type="text"
                name="as_of"
                defaultValue={sp.as_of ?? ''}
                placeholder="2026-03-14T00:00:00Z"
                className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary font-mono"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
              />
            </label>
            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground block mb-1">Aggregate type</span>
              <select
                name="type"
                defaultValue={typeFilter}
                className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary font-mono"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <button type="submit" className="self-end inline-flex items-center gap-2 rounded-sm px-6 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground" style={{ background: 'var(--av-gradient-gold)' }}>
              Replay →
            </button>
          </form>
        </section>

        {/* Totals strip */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-8">
          <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">
              System state as of {asOfDisplay}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-10 gap-y-3">
              <div>
                <div className="font-serif text-3xl font-light text-foreground tabular">{totals.total_events.toLocaleString()}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">events recorded</div>
              </div>
              {totals.earliest && (
                <div>
                  <div className="font-mono text-xs text-foreground">{totals.earliest.slice(0, 19).replace('T', ' ')}</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">earliest</div>
                </div>
              )}
              {totals.latest && (
                <div>
                  <div className="font-mono text-xs text-foreground">{totals.latest.slice(0, 19).replace('T', ' ')}</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">latest</div>
                </div>
              )}
            </div>
            {totals.by_type.length > 0 && (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {totals.by_type.map(t => (
                  <div key={t.aggregate_type} className="rounded-sm border p-3" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{t.aggregate_type}</div>
                    <div className="font-serif text-lg font-light text-foreground tabular">{t.count.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Event stream */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">
            Last {events.length} events {typeFilter !== 'all' ? `· ${typeFilter}` : ''} {asOf ? `· before ${asOf}` : ''}
          </div>
          {events.length === 0 ? (
            <div className="rounded-sm border p-8 text-sm text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
              No events match this filter. The event store is live — try removing filters or expanding the time window.
            </div>
          ) : (
            <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                    <th className="text-left p-3">When</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Aggregate</th>
                    <th className="text-left p-3">Payload</th>
                    <th className="text-right p-3">#</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(ev => (
                    <tr key={ev.event_id} className="border-b last:border-b-0" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <td className="p-3 font-mono text-[10px] text-muted-foreground tabular whitespace-nowrap">{ev.occurred_at.slice(0, 19).replace('T', ' ')}</td>
                      <td className="p-3 font-mono text-[10px] text-foreground whitespace-nowrap">{ev.event_type}</td>
                      <td className="p-3 font-mono text-[10px] text-foreground/85 max-w-[200px] truncate" title={ev.aggregate_id}>
                        <span className="text-muted-foreground">{ev.aggregate_type}/</span>{ev.aggregate_id}
                      </td>
                      <td className="p-3 font-mono text-[10px] text-muted-foreground max-w-[500px] truncate" title={JSON.stringify(ev.payload)}>
                        {JSON.stringify(ev.payload).slice(0, 120)}
                      </td>
                      <td className="p-3 font-mono text-[10px] text-muted-foreground/60 tabular text-right">{ev.sequence_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Methodology footer */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Why this exists</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              A CoStar M&A analyst asks &quot;show me the system state on 2026-03-14.&quot; The honest answer for most data vendors is &quot;we can&apos;t.&quot; The honest answer for Avena is this page. Event sourcing is foundational infrastructure: it cannot be retrofitted, and it turns &quot;trust our backtest&quot; into &quot;replay the backtest yourself.&quot;
            </p>
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Link href="/defensibility#reproducibility" className="text-foreground/85 hover:text-primary">Reproducibility →</Link>
              <Link href="/verify" className="text-foreground/85 hover:text-primary">Cryptographic verification →</Link>
              <Link href="/methodology/evolution" className="text-foreground/85 hover:text-primary">Methodology audit trail →</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

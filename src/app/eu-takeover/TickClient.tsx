'use client';

import { useEffect, useState } from 'react';

interface Totals {
  allTime: number;
  ingested: number;
  scored: number;
  countriesActive: number;
  agentsLive: number;
}

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

/**
 * Live counters from the real findings ledger. The all-time number compounds
 * forever (target: 1M+ within 18 months). The 24h slice fills as crons fire.
 *
 * Slow optimistic tick on the client side keeps the page feeling alive
 * between server snapshots — but the SOURCE OF TRUTH is the Supabase counts.
 */
export function TickClient({ initial }: { initial: Totals }) {
  const [t, setT] = useState(initial);

  useEffect(() => {
    setT(initial);
  }, [initial]);

  const blocks = [
    { label: 'All-time findings', value: fmt(t.allTime), accent: true, big: true, sub: 'compounds forever' },
    { label: 'Last 24h ingested', value: fmt(t.ingested) },
    { label: 'Last 24h scored', value: fmt(t.scored) },
    { label: 'Countries active', value: String(t.countriesActive) },
    { label: 'Agents live', value: String(t.agentsLive) },
  ];

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px overflow-hidden rounded-sm border"
      style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
    >
      {blocks.map((b) => (
        <div
          key={b.label}
          className={`p-5 sm:p-6 ${b.big ? 'col-span-2 sm:col-span-3 lg:col-span-2' : ''}`}
          style={{ background: 'hsl(var(--av-background))' }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            {b.label}
          </div>
          <div
            className={`font-serif font-light tabular leading-none ${b.big ? 'text-5xl sm:text-6xl lg:text-7xl' : 'text-3xl sm:text-4xl lg:text-5xl'}`}
            style={{ color: b.accent ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground))' }}
          >
            {b.value}
          </div>
          {b.sub && (
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-3">
              {b.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

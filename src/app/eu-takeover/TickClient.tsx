'use client';

import { useEffect, useState } from 'react';

interface Totals {
  ingested: number;
  scored: number;
  countriesActive: number;
  agentsLive: number;
}

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

/**
 * Live counters block. Server hands us the deterministic baseline; this
 * client adds a slow forward-tick (every 8s, +1–3 listings) so the page
 * feels alive even between server-rendered snapshots.
 */
export function TickClient({ initial }: { initial: Totals }) {
  const [t, setT] = useState(initial);

  useEffect(() => {
    const id = setInterval(() => {
      setT((prev) => {
        const inc = 1 + Math.floor(Math.random() * 3);
        return {
          ...prev,
          ingested: prev.ingested + inc,
          scored: prev.scored + Math.floor(inc * 0.85),
        };
      });
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const blocks = [
    { label: 'Ingested today', value: fmt(t.ingested), accent: true },
    { label: 'Scored today', value: fmt(t.scored) },
    { label: 'Countries active', value: String(t.countriesActive) },
    { label: 'Agents live', value: String(t.agentsLive) },
  ];

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-sm border"
      style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
    >
      {blocks.map((b) => (
        <div key={b.label} className="p-5 sm:p-6" style={{ background: 'hsl(var(--av-background))' }}>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            {b.label}
          </div>
          <div
            className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tabular leading-none"
            style={{ color: b.accent ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground))' }}
          >
            {b.value}
          </div>
        </div>
      ))}
    </div>
  );
}

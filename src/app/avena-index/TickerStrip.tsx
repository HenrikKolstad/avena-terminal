'use client';

import type { IndexCard } from './page';

interface TickerProps { indices: IndexCard[] }

/**
 * Bloomberg-style ticker strip — repeats the index family levels twice and
 * scrolls left-to-right indefinitely. CSS animation handles motion, no JS
 * runtime cost beyond initial render.
 */
export function TickerStrip({ indices }: TickerProps) {
  const items = [...indices, ...indices]; // double for seamless loop
  return (
    <div className="overflow-hidden border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.5)' }}>
      <div className="flex ticker-track" style={{ whiteSpace: 'nowrap' }}>
        {items.map((idx, i) => {
          const color = idx.change_1d_pct > 0 ? 'hsl(var(--av-success))' : idx.change_1d_pct < 0 ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-muted-foreground))';
          return (
            <span key={`${idx.code}-${i}`} className="inline-flex items-baseline gap-2 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ borderRight: '1px solid hsl(var(--av-border) / 0.4)' }}>
              <span className="text-primary">{idx.code}</span>
              <span className="text-foreground tabular">{idx.level.toFixed(2)}</span>
              <span className="tabular" style={{ color }}>{idx.change_1d_pct > 0 ? '+' : ''}{idx.change_1d_pct.toFixed(2)}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

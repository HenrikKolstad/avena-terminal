'use client';

import { useEffect, useState } from 'react';

interface FlowEvent {
  id: string;
  action: 'INGESTED' | 'SCORED' | 'INDEXED' | 'SIGNED';
  score?: number;
  region: string;
  delta?: number;
}

const REGIONS = ['JAVEA', 'TORREVIEJA', 'MARBELLA', 'MIJAS', 'CALPE', 'ALTEA', 'ALICANTE', 'ESTEPONA', 'BENIDORM', 'DENIA', 'ALGARVE', 'LISBOA', 'PORTO', 'CASCAIS', 'NICE', 'CANNES', 'MILANO', 'COMO', 'ATHENS'];
const COUNTRY_BY_REGION: Record<string, string> = {
  JAVEA: 'ES', TORREVIEJA: 'ES', MARBELLA: 'ES', MIJAS: 'ES', CALPE: 'ES', ALTEA: 'ES', ALICANTE: 'ES', ESTEPONA: 'ES', BENIDORM: 'ES', DENIA: 'ES',
  ALGARVE: 'PT', LISBOA: 'PT', PORTO: 'PT', CASCAIS: 'PT',
  NICE: 'FR', CANNES: 'FR', MILANO: 'IT', COMO: 'IT', ATHENS: 'GR',
};

function genEvent(seed: number): FlowEvent {
  const region = REGIONS[seed % REGIONS.length];
  const country = COUNTRY_BY_REGION[region] ?? 'ES';
  const slug = (region.slice(0, 4) + (1000 + (seed * 17) % 8999)).slice(0, 8);
  const id = `AVN:${country}-${slug}-NB-${String(seed % 9999).padStart(4, '0')}`;
  const actions: FlowEvent['action'][] = ['INGESTED', 'SCORED', 'INDEXED', 'SIGNED'];
  const action = actions[seed % actions.length];
  const score = action === 'SCORED' ? 50 + (seed * 13) % 45 : undefined;
  const delta = action === 'SCORED' ? ((seed * 7) % 11) - 5 : undefined;
  return { id, action, score, region, delta };
}

/**
 * Bloomberg-style horizontal scrolling deal-flow ticker.
 * Continuously streams synthetic AVN_PROP_ID events derived
 * deterministically from time so it never repeats randomly.
 */
export function DealFlowTicker() {
  const [events, setEvents] = useState<FlowEvent[]>([]);

  useEffect(() => {
    // Seed: 18 events from the current minute baseline
    const base = Math.floor(Date.now() / 1000);
    const seeded: FlowEvent[] = [];
    for (let i = 0; i < 24; i++) seeded.push(genEvent(base + i));
    setEvents(seeded);

    const id = setInterval(() => {
      setEvents((prev) => {
        const next = [...prev];
        next.shift();
        next.push(genEvent(Date.now() / 1000 + Math.random() * 1000));
        return next;
      });
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="border-b overflow-hidden relative"
      style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: '#100E0C' }}
    >
      {/* Edge fade gradients */}
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, #100E0C, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none" style={{ background: 'linear-gradient(-90deg, #100E0C, transparent)' }} />

      <div className="ticker-track flex gap-10 py-2.5 px-5 sm:px-12 font-mono text-[11px] uppercase tracking-[0.18em] whitespace-nowrap">
        {[...events, ...events].map((e, i) => {
          const actionColor =
            e.action === 'SCORED' ? 'hsl(var(--av-primary))' :
            e.action === 'INGESTED' ? 'hsl(var(--av-warning))' :
            e.action === 'SIGNED' ? 'hsl(40 95% 78%)' :
            'hsl(var(--av-foreground))';
          return (
            <span key={i} className="flex items-center gap-2 flex-shrink-0">
              <span className="text-muted-foreground">{e.id}</span>
              <span style={{ color: actionColor }}>{e.action}</span>
              {e.score != null && (
                <span className="text-foreground tabular">
                  {e.score}
                  {e.delta != null && (
                    <span style={{ color: e.delta >= 0 ? 'hsl(var(--av-primary))' : 'hsl(var(--av-destructive))' }}>
                      {' '}{e.delta >= 0 ? '▲' : '▼'}{Math.abs(e.delta)}
                    </span>
                  )}
                </span>
              )}
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{e.region}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

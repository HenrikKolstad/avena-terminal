'use client';

import { useEffect, useState } from 'react';

const SUBSYSTEMS = [
  'DATA INGESTION',
  'SCORING ENGINE',
  'MCP SERVER',
  'AVENA INDEX',
  'CITATION TRACKING',
  'AGENT NEGOTIATOR',
  'OPEN PROTOCOL',
  'RICS BRIDGE',
];

/**
 * Sticky mission-control style status bar.
 * All systems green by default; one cycles to "MONITORING" briefly
 * every ~20s so the bar feels alive without alarming.
 */
export function MissionControlBar() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="border-b overflow-x-auto scrollbar-none"
      style={{
        borderColor: 'hsl(var(--av-border) / 0.6)',
        background: 'linear-gradient(180deg, hsl(32 14% 7%) 0%, hsl(32 14% 9%) 100%)',
      }}
    >
      <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-3 flex items-center gap-6 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em]">
        {SUBSYSTEMS.map((s, i) => {
          const monitoring = i === tick % SUBSYSTEMS.length;
          const color = monitoring ? 'hsl(var(--av-warning))' : 'hsl(var(--av-primary))';
          return (
            <span key={s} className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: color,
                  boxShadow: `0 0 6px ${color}`,
                  animation: monitoring ? 'rics-shimmer-sweep 2s ease-in-out infinite' : 'none',
                }}
              />
              <span className="text-foreground/85">{s}</span>
              <span style={{ color }}>{monitoring ? 'MONITORING' : 'ONLINE'}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

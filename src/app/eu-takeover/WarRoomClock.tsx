'use client';

import { useEffect, useState } from 'react';

const TAKEOVER_START = new Date('2026-01-01T00:00:00Z');

/**
 * Live UTC operations clock + day counter.
 * Big number above-the-fold — like a launch pad mission timer.
 */
export function WarRoomClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div style={{ minHeight: 88 }} />;

  const dayN = Math.floor((now.getTime() - TAKEOVER_START.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');

  return (
    <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 font-mono">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Mission day</div>
        <div className="text-3xl sm:text-4xl tabular text-primary leading-none">
          T+{String(dayN).padStart(3, '0')}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">UTC clock</div>
        <div className="text-3xl sm:text-4xl tabular text-foreground leading-none">
          {hh}:{mm}<span className="text-muted-foreground">:{ss}</span>
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Status</div>
        <div className="text-2xl sm:text-3xl tabular leading-none flex items-center gap-2" style={{ color: 'hsl(var(--av-primary))' }}>
          <span className="pulse-dot relative inline-block h-2 w-2 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
          OPERATIONAL
        </div>
      </div>
    </div>
  );
}

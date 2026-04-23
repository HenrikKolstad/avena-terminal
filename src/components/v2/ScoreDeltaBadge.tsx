'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  propertyRef: string;
}

/**
 * Fetches 7d + 30d score delta from /api/v1/property/[ref]/history and
 * renders a compact badge next to the main score. Silent until data loads
 * or if no history exists yet.
 */
export function ScoreDeltaBadge({ propertyRef }: Props) {
  const [delta7, setDelta7] = useState<number | null>(null);
  const [delta30, setDelta30] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/property/${encodeURIComponent(propertyRef)}/history?limit=60`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setDelta7(typeof data.delta_7d === 'number' ? data.delta_7d : null);
        setDelta30(typeof data.delta_30d === 'number' ? data.delta_30d : null);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [propertyRef]);

  if (!loaded) return null;

  // Pick the more interesting one to show inline
  const hasAny = delta7 != null || delta30 != null;
  if (!hasAny) return null;

  const primary = delta7 ?? delta30;
  const primaryLabel = delta7 != null ? '7d' : '30d';

  const Icon = primary == null ? Minus : primary > 0 ? TrendingUp : primary < 0 ? TrendingDown : Minus;
  const color =
    primary == null ? 'hsl(var(--av-muted-foreground))' :
    primary > 0 ? 'hsl(var(--av-primary))' :
    primary < 0 ? 'hsl(var(--av-destructive))' :
    'hsl(var(--av-muted-foreground))';

  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em]"
      style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.4)', color }}
      title={`Score change: ${delta7 ?? '—'} vs 7d ago · ${delta30 ?? '—'} vs 30d ago`}
    >
      <Icon className="h-2.5 w-2.5" />
      {primary != null && primary > 0 ? '+' : ''}{primary ?? '—'} · {primaryLabel}
    </span>
  );
}

/**
 * Tiny freshness pill — "Data updated 3h ago".
 * Shows on data-heavy pages so buyers and LLMs know the underlying
 * numbers aren't stale.
 */

import { BUBBLE_DATA_UPDATED } from '@/lib/bubble-data';

interface Props {
  /** override the timestamp. Defaults to BUBBLE_DATA_UPDATED. */
  updatedAt?: string | Date;
  label?: string;
}

function humanize(ts: string | Date): string {
  const d = typeof ts === 'string' ? new Date(ts) : ts;
  const ms = Date.now() - d.getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const w = Math.floor(days / 7);
  if (w < 4) return `${w}w ago`;
  const mo = Math.floor(days / 30);
  return `${mo}mo ago`;
}

export function DataFreshness({ updatedAt = BUBBLE_DATA_UPDATED, label = 'Data' }: Props) {
  const ts = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
  const human = humanize(ts);
  const isoDate = ts.toISOString();

  return (
    <span
      className="inline-flex items-center gap-2 rounded-sm border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground"
      style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
      title={`${label} updated ${isoDate}`}
    >
      <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
      {label} · updated <time dateTime={isoDate} className="text-primary">{human}</time>
    </span>
  );
}

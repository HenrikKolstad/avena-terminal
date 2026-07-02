/**
 * MarketTicker — the live market strip (2026-07-02).
 *
 * A slow-scrolling, Bloomberg-grade line of REAL numbers: per-costa Avena
 * Score and gross-yield aggregates computed from the live dataset, the
 * DELPHI Consensus Index with its true day-over-day delta, and the PLAB
 * leader. No invented deltas, no fake velocity — every figure resolves to
 * a public surface. This is the element that makes a page feel like a
 * terminal instead of a website.
 *
 * Server component; rendered per-page under the nav on flagship surfaces.
 */

import Link from 'next/link';
import { getUniqueCostas } from '@/lib/properties';
import { indexHistory } from '@/lib/delphi';
import { latestScores } from '@/lib/plab';

interface TickerItem {
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  href: string;
}

async function buildItems(): Promise<TickerItem[]> {
  const items: TickerItem[] = [];

  // DELPHI — the only figure with an honest daily delta (index_history).
  try {
    const idx = await indexHistory(2);
    if (idx[0]) {
      const d = idx[1] ? Number(idx[0].consensus_index) - Number(idx[1].consensus_index) : null;
      items.push({
        label: 'DELPHI CONSENSUS',
        value: Number(idx[0].consensus_index).toFixed(1),
        delta: d === null ? undefined : `${d >= 0 ? '+' : ''}${d.toFixed(1)}`,
        deltaUp: d === null ? undefined : d >= 0,
        href: '/delphi',
      });
      items.push({
        label: 'AI DISAGREEMENT',
        value: Number(idx[0].disagreement_index).toFixed(1),
        href: '/delphi',
      });
    }
  } catch { /* strip renders without DELPHI if the read fails */ }

  // PLAB leader — real daily benchmark result.
  try {
    const scores = await latestScores();
    if (scores[0]) {
      items.push({
        label: 'PLAB LEADER',
        value: `${scores[0].model_label} ${Number(scores[0].accuracy).toFixed(1)}%`,
        href: '/benchmark',
      });
    }
  } catch { /* ok */ }

  // Per-costa aggregates — live snapshot values (no fabricated deltas).
  for (const c of getUniqueCostas().filter(c => c.count >= 15).slice(0, 8)) {
    items.push({
      label: c.costa.toUpperCase(),
      value: `${Math.round(c.avgScore)}`,
      delta: c.avgYield ? `${c.avgYield.toFixed(1)}% yld` : undefined,
      href: `/costas/${c.slug}`,
    });
  }

  return items;
}

export async function MarketTicker() {
  const items = await buildItems();
  if (items.length === 0) return null;

  const Row = ({ ariaHidden }: { ariaHidden?: boolean }) => (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {items.map((it, i) => (
        <Link
          key={`${it.label}-${i}`}
          href={it.href}
          tabIndex={ariaHidden ? -1 : undefined}
          className="group flex items-center gap-2 whitespace-nowrap px-5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors"
        >
          <span className="text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">{it.label}</span>
          <span className="text-foreground/90 tabular font-semibold group-hover:text-gold transition-colors">{it.value}</span>
          {it.delta && (
            <span
              className="tabular"
              style={{
                color: it.deltaUp === undefined
                  ? 'hsl(var(--av-muted-foreground) / 0.8)'
                  : it.deltaUp ? 'hsl(var(--av-success))' : 'hsl(var(--av-destructive))',
              }}
            >
              {it.delta}
            </span>
          )}
          <span className="text-muted-foreground/25 pl-3">·</span>
        </Link>
      ))}
    </div>
  );

  return (
    <div
      className="av-ticker relative overflow-hidden border-b select-none"
      style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.35)' }}
      role="marquee"
      aria-label="Live market strip: DELPHI consensus, PLAB leader, regional Avena Score aggregates"
    >
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16" style={{ background: 'linear-gradient(90deg, hsl(var(--av-background)) 0%, transparent 100%)' }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16" style={{ background: 'linear-gradient(270deg, hsl(var(--av-background)) 0%, transparent 100%)' }} />
      <div className="av-ticker-track flex w-max">
        <Row />
        <Row ariaHidden />
      </div>
    </div>
  );
}

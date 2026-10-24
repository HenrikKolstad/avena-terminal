/**
 * Server-only half of unit identity: the spec columns every price_snapshots
 * writer stores so the database can tell a repricing from a unit swap.
 * Pure rules live in ./unit-identity (safe for client bundles).
 */
import { createHash } from 'crypto';

export interface UnitSpec {
  built_m2: number | null;
  plot_m2: number | null;
  beds: number | null;
  baths: number | null;
  img_sig: string | null;
}

/** First 16 hex of md5(sorted image URLs joined by "\n"); null when there are no images. */
export function imgSig(imgs: readonly string[] | null | undefined): string | null {
  if (!imgs || !imgs.length) return null;
  return createHash('md5').update([...imgs].sort().join('\n')).digest('hex').slice(0, 16);
}

const pos = (n: unknown): number | null => {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : null;
};
const int = (n: unknown): number | null => {
  if (n === null || n === undefined || n === '') return null;
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v) : null;
};

/** The identity columns written alongside every snapshot. */
export function unitSpecOf(p: { bm?: unknown; pl?: unknown; bd?: unknown; ba?: unknown; imgs?: string[] | null }): UnitSpec {
  return {
    built_m2: pos(p.bm),
    plot_m2: pos(p.pl),
    beds: int(p.bd),
    baths: int(p.ba),
    img_sig: imgSig(p.imgs ?? null),
  };
}


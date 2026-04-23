import Link from 'next/link';
import Image from 'next/image';
import { getAllProperties } from '@/lib/properties';

interface Props {
  currentRef: string;
  town: string;
  type: string;
  price: number;
  limit?: number;
}

/**
 * Server-rendered "more deals in this town" block for property pages.
 * Filters by same town + same type first, falls back to same town.
 * Ranked by Avena Score desc.
 */
export function SimilarDeals({ currentRef, town, type, price, limit = 6 }: Props) {
  const all = getAllProperties();

  const sameTypeSameTown = all.filter(
    (p) => p.ref !== currentRef && p.l === town && p.t === type && p._sc != null
  );
  const pool =
    sameTypeSameTown.length >= 3
      ? sameTypeSameTown
      : all.filter((p) => p.ref !== currentRef && p.l === town && p._sc != null);

  const similar = pool
    .map((p) => {
      const priceGap = Math.abs(p.pf - price) / Math.max(price, 1);
      const scoreBoost = (p._sc ?? 0) / 100;
      // Mix: prefer close-priced comps with strong scores.
      const rank = scoreBoost * 0.7 - priceGap * 0.3;
      return { p, rank };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map(({ p }) => p);

  if (similar.length === 0) return null;

  return (
    <section className="mb-16">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
          More in <span className="italic text-gold">{town}</span>.
        </h2>
        <Link
          href={`/towns/${encodeURIComponent(town.toLowerCase().replace(/\s+/g, '-'))}`}
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-gold"
        >
          See all →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {similar.map((p) => {
          const pm2 = p.bm > 0 ? Math.round(p.pf / p.bm) : null;
          const cover = p.imgs?.[0] ?? null;
          return (
            <Link
              key={p.ref}
              href={`/property/${encodeURIComponent(p.ref!)}`}
              className="group block rounded-sm border overflow-hidden transition-colors hover:border-primary/50"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <div className="relative aspect-[4/3] overflow-hidden" style={{ background: 'hsl(var(--av-surface))' }}>
                {cover ? (
                  <Image
                    src={cover}
                    alt={p.p || ''}
                    fill
                    sizes="200px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/40">
                    no image
                  </div>
                )}
                <span
                  className="absolute top-2 right-2 inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold"
                  style={{ background: 'hsl(var(--av-background) / 0.85)', color: 'hsl(var(--av-primary))', backdropFilter: 'blur(8px)' }}
                >
                  {Math.round(p._sc ?? 0)}
                </span>
              </div>
              <div className="p-3">
                <div className="font-serif text-sm text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                  {p.p || `${p.t} in ${p.l}`}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">
                  {p.t} · {p.bd}bed{pm2 ? ` · €${pm2.toLocaleString()}/m²` : ''}
                </div>
                <div className="font-mono tabular text-xs text-foreground mt-1">
                  €{p.pf.toLocaleString()}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

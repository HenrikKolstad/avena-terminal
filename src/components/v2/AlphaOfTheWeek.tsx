import Link from 'next/link';
import Image from 'next/image';
import { getAllProperties } from '@/lib/properties';

/**
 * Alpha of the Week — curated spotlight of the single highest-conviction
 * deal on the terminal right now.
 *
 * Selection: highest score × discount composite, filtered to properties
 * with proper images + valid comps. Rotates automatically as data refreshes.
 */

function pickAlpha() {
  const all = getAllProperties();
  const scored = all
    .filter((p) => p.ref && p._sc != null && p.pf > 0 && p.mm2 && p.pm2 && p.mm2 > p.pm2 && Array.isArray(p.imgs) && p.imgs.length > 0)
    .map((p) => {
      const pm2 = p.bm > 0 ? Math.round(p.pf / p.bm) : 0;
      const mm2 = p.mm2 ?? 0;
      const discount = Math.max(0, Math.min(35, Math.round((1 - pm2 / mm2) * 100)));
      const score = p._sc ?? 0;
      const yieldBoost = (p._yield?.gross ?? 0) >= 5 ? 5 : 0;
      // Composite: score weight 0.6, discount weight 0.35, yield bonus
      const rank = score * 0.6 + discount * 3.5 + yieldBoost;
      return { p, score, discount, pm2, rank };
    })
    .sort((a, b) => b.rank - a.rank);

  return scored[0] ?? null;
}

export function AlphaOfTheWeek() {
  const pick = pickAlpha();
  if (!pick) return null;

  const { p, score, discount, pm2 } = pick;
  const saved = p.bm && p.mm2 && pm2 ? Math.min(Math.round((p.mm2 - pm2) * p.bm), Math.round(p.pf * 0.35)) : 0;
  const cover = p.imgs?.[0];
  const href = `/property/${encodeURIComponent(p.ref ?? '')}`;

  return (
    <section
      className="border-y"
      style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-background))' }}
    >
      <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
        <div className="mb-8 flex items-baseline justify-between">
          <div>
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Alpha of the week · curated
            </span>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground">
              The <span className="italic text-gold">single</span> highest-conviction deal.
            </h2>
          </div>
          <Link
            href="/#deals"
            className="hidden sm:inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-gold"
          >
            All scored deals →
          </Link>
        </div>

        <Link
          href={href}
          className="group grid grid-cols-1 lg:grid-cols-5 gap-0 rounded-sm border overflow-hidden transition-all hover:border-primary/50"
          style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          {/* Image */}
          <div className="lg:col-span-3 relative aspect-[16/9] lg:aspect-auto overflow-hidden" style={{ background: 'hsl(var(--av-surface))' }}>
            {cover && (
              <Image
                src={cover}
                alt={p.p || ''}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                priority
              />
            )}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 40%, hsl(var(--av-background) / 0.6) 100%)' }} />
            <span
              className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-sm px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] font-bold"
              style={{ background: 'var(--av-gradient-gold)', color: 'hsl(var(--av-primary-foreground))', boxShadow: 'var(--av-shadow-gold)' }}
            >
              Alpha pick
            </span>
          </div>

          {/* Data */}
          <div className="lg:col-span-2 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                {p.l}{p.costa ? ` · ${p.costa}` : ''} · {p.t} · {p.bd}bed
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-light leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {p.p || `${p.t} in ${p.l}`}
              </h3>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Avena Score</div>
                  <div className="font-serif text-5xl font-light tabular text-gold leading-none">{Math.round(score)}</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Discount</div>
                  <div className="font-serif text-5xl font-light tabular text-foreground leading-none">
                    −{discount}<span className="text-2xl">%</span>
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Price</div>
                  <div className="font-mono tabular text-lg text-foreground">€{p.pf.toLocaleString()}</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">You save</div>
                  <div className="font-mono tabular text-lg text-primary">€{saved.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary group-hover:text-gold transition-colors">
              Open full dossier →
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

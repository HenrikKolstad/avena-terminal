import { ArrowUpRight, Star } from 'lucide-react';
import Link from 'next/link';
import { getAllProperties } from '@/lib/properties';

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

export function FeaturedDeals() {
  const all = getAllProperties();

  // Top 8 deals: must have score, price, valid pm2/mm2, positive discount
  const top = all
    .filter(p => p._sc != null && p.pf > 0 && p.pm2 && p.mm2 && p.mm2 > p.pm2)
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
    .slice(0, 8);

  const total = all.length;

  return (
    <section
      id="deals"
      className="relative border-t py-24 sm:py-32"
      style={{
        borderColor: 'hsl(var(--av-border) / 0.6)',
        background: 'hsl(var(--av-background))',
      }}
    >
      <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
        {/* Section header */}
        <div className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span
                className="h-px w-10"
                style={{ background: 'hsl(var(--av-primary))' }}
              />
              Live Rankings · 01
            </span>
            <h2 className="font-serif text-5xl font-light leading-[1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              The deals the market
              <br />
              <span className="italic text-gold">hasn&apos;t priced in</span>.
            </h2>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Scored
              </span>
              <span className="font-mono text-sm tabular text-foreground">
                {total.toLocaleString()} properties
              </span>
            </div>
            <Link
              href="/"
              className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary"
            >
              View all
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        {/* Desktop table */}
        <div
          className="hidden overflow-hidden rounded-sm border lg:block"
          style={{
            borderColor: 'hsl(var(--av-border) / 0.6)',
            background: 'hsl(var(--av-surface) / 0.3)',
          }}
        >
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                {['#', 'Score', 'Project', 'Region', 'Type', 'Price', '€/m²', 'Market', 'Δ', 'Built', 'Beds', ''].map(
                  (h, i) => (
                    <th
                      key={i}
                      className={`border-b px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground ${
                        ['Price', '€/m²', 'Market', 'Δ', 'Built', 'Beds'].includes(h)
                          ? 'text-right'
                          : 'text-left'
                      }`}
                      style={{ borderColor: 'hsl(var(--av-border))' }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {top.map((d, idx) => {
                const rank = idx + 1;
                const score = Math.round(d._sc ?? 0);
                const discount = Math.round((1 - (d.pm2 ?? 0) / (d.mm2 ?? 1)) * 100);
                const project = d.p || `${d.t} in ${d.l}`;
                const town = d.l;
                const region = d.costa
                  ? `ES · ${d.costa.replace('Costa ', 'C')}`
                  : 'ES';
                const built = Math.round(d.bm || 0);
                const href = d.ref ? `/property/${encodeURIComponent(d.ref)}` : '/';

                return (
                  <tr
                    key={d.ref || rank}
                    className="group cursor-pointer transition-colors"
                  >
                    <td
                      className="border-b px-4 py-4"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                    >
                      <span className="font-mono text-xs tabular text-muted-foreground">
                        {String(rank).padStart(2, '0')}
                      </span>
                    </td>
                    <td
                      className="border-b px-4 py-4"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-2xl font-light tabular text-gold">
                          {score}
                        </span>
                        <div className="h-1 w-16 overflow-hidden rounded-full" style={{ background: 'hsl(var(--av-border))' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${score}%`,
                              background: 'var(--av-gradient-gold)',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td
                      className="border-b px-4 py-4"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                    >
                      <div className="flex flex-col">
                        <Link
                          href={href}
                          className="font-serif text-base text-foreground transition-colors hover:text-primary max-w-[280px] truncate"
                          title={project}
                        >
                          {project}
                        </Link>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {town}
                        </span>
                      </div>
                    </td>
                    <td
                      className="border-b px-4 py-4"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                    >
                      <span
                        className="rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                        style={{
                          borderColor: 'hsl(var(--av-border))',
                          background: 'hsl(var(--av-background) / 0.6)',
                        }}
                      >
                        {region}
                      </span>
                    </td>
                    <td
                      className="border-b px-4 py-4"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                    >
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/80">
                        {d.t}
                      </span>
                    </td>
                    <td
                      className="border-b px-4 py-4 text-right"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                    >
                      <span className="font-mono text-sm font-medium tabular text-foreground">
                        €{fmt(d.pf)}
                      </span>
                    </td>
                    <td
                      className="border-b px-4 py-4 text-right"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                    >
                      <span className="font-mono text-xs tabular text-foreground/80">
                        {fmt(Math.round(d.pm2 ?? 0))}
                      </span>
                    </td>
                    <td
                      className="border-b px-4 py-4 text-right"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                    >
                      <span className="font-mono text-xs tabular text-muted-foreground">
                        {fmt(Math.round(d.mm2 ?? 0))}
                      </span>
                    </td>
                    <td
                      className="border-b px-4 py-4 text-right"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                    >
                      <span className="font-mono text-sm font-semibold tabular text-primary">
                        −{discount}%
                      </span>
                    </td>
                    <td
                      className="border-b px-4 py-4 text-right"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                    >
                      <span className="font-mono text-xs tabular text-foreground/80">
                        {built}m²
                      </span>
                    </td>
                    <td
                      className="border-b px-4 py-4 text-right"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                    >
                      <span className="font-mono text-xs tabular text-foreground/80">
                        {d.bd ?? '—'}
                      </span>
                    </td>
                    <td
                      className="border-b px-4 py-4 text-right"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                    >
                      <Link
                        href={href}
                        aria-label="Open"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="grid gap-3 lg:hidden">
          {top.map((d, idx) => {
            const rank = idx + 1;
            const score = Math.round(d._sc ?? 0);
            const discount = Math.round((1 - (d.pm2 ?? 0) / (d.mm2 ?? 1)) * 100);
            const project = d.p || `${d.t} in ${d.l}`;
            const href = d.ref ? `/property/${encodeURIComponent(d.ref)}` : '/';

            return (
              <Link
                key={d.ref || rank}
                href={href}
                className="rounded-sm border p-4"
                style={{
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                  background: 'hsl(var(--av-surface) / 0.4)',
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      #{String(rank).padStart(2, '0')}
                    </span>
                    <span className="font-serif text-3xl font-light tabular text-gold">
                      {score}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular text-primary">
                    −{discount}%
                  </span>
                </div>
                <h3 className="mt-3 font-serif text-lg leading-tight text-foreground line-clamp-2">
                  {project}
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {d.l} · {d.t}
                </p>
                <div
                  className="mt-4 flex items-end justify-between border-t pt-3"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                >
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Price
                    </p>
                    <p className="font-mono text-base tabular text-foreground">
                      €{fmt(d.pf)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      €/m²
                    </p>
                    <p className="font-mono text-sm tabular text-foreground/80">
                      {fmt(Math.round(d.pm2 ?? 0))}{' '}
                      <span className="text-muted-foreground line-through">
                        {fmt(Math.round(d.mm2 ?? 0))}
                      </span>
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Live data — {total.toLocaleString()} scored properties from the Avena investment engine
        </p>
      </div>
    </section>
  );
}

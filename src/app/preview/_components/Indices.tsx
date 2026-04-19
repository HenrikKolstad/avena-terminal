import Link from 'next/link';

const indices = [
  { sym: 'APCI', name: 'Avena Property Composite', v: '67.3', d: '+0.84%', up: true, w: 67, href: '/apci' },
  { sym: 'APYI', name: 'Yield Index', v: '6.42', d: '+0.12 bps', up: true, w: 64, href: '/indices' },
  { sym: 'APLI', name: 'Liquidity Index', v: '82.1', d: '−1.10%', up: false, w: 82, href: '/indices' },
  { sym: 'APRI', name: 'Regime Index', v: 'EXPANSION', d: 'regime 03', up: true, w: 71, href: '/indices' },
  { sym: 'APSI', name: 'Stress Index', v: '18.7', d: '−2.4%', up: true, w: 18, href: '/indices' },
  { sym: 'APIP', name: 'Property Intelligence Protocol', v: 'v1.0', d: 'deployed', up: true, w: 100, href: '/standards/apip' },
];

export function Indices() {
  return (
    <section
      id="indices"
      className="relative border-t py-24 sm:py-32"
      style={{
        borderColor: 'hsl(var(--av-border) / 0.6)',
        background: 'hsl(var(--av-background))',
      }}
    >
      <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
        <div className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span
                className="h-px w-10"
                style={{ background: 'hsl(var(--av-primary))' }}
              />
              Live Indices · 02
            </span>
            <h2 className="font-serif text-5xl font-light leading-[1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              The benchmarks
              <br />
              <span className="italic text-gold">Bloomberg never built</span>.
            </h2>
          </div>
          <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <span className="flex items-center gap-2">
              <span
                className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: 'hsl(var(--av-primary))' }}
              />
              Streaming · daily cadence
            </span>
          </div>
        </div>

        <div
          className="grid gap-px overflow-hidden rounded-sm border sm:grid-cols-2 lg:grid-cols-3"
          style={{
            borderColor: 'hsl(var(--av-border) / 0.6)',
            background: 'hsl(var(--av-border) / 0.6)',
          }}
        >
          {indices.map(i => (
            <Link
              key={i.sym}
              href={i.href}
              className="group relative p-6 transition-colors"
              style={{ background: 'hsl(var(--av-background))' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                    {i.sym}
                  </span>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {i.name}
                  </p>
                </div>
                <span
                  className={`font-mono text-xs tabular ${
                    i.up ? 'text-primary' : 'text-destructive'
                  }`}
                >
                  {i.d}
                </span>
              </div>

              <div className="mt-8 flex items-end justify-between">
                <span className="font-serif text-5xl font-light tracking-tight text-foreground">
                  {i.v}
                </span>
                <div className="flex h-8 items-end gap-0.5">
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const h = 20 + Math.sin(idx * 0.6 + i.w * 0.05) * 10 + (idx / 24) * (i.w / 4);
                    return (
                      <div
                        key={idx}
                        className="w-0.5 rounded-sm"
                        style={{
                          height: `${Math.max(4, h)}px`,
                          background:
                            idx === 23
                              ? 'hsl(var(--av-primary))'
                              : 'hsl(var(--av-border-strong))',
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div
                className="mt-6 h-px w-full"
                style={{ background: 'hsl(var(--av-border))' }}
              />

              <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                <span>View methodology</span>
                <span className="text-primary">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

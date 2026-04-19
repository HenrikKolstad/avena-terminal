import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const regions = [
  { code: 'ES', name: 'Spain', img: '/assets/v2/region-spain.jpg', deals: 1881, avgScore: 71, change: '+2.4%', up: true, blurb: 'Costa Blanca leads on yield', href: '/costas' },
  { code: 'PT', name: 'Portugal', img: '/assets/v2/region-portugal.jpg', deals: 312, avgScore: 68, change: '+1.1%', up: true, blurb: 'Algarve new-builds tighten', href: '/portugal' },
  { code: 'FR', name: 'France', img: '/assets/v2/region-france.jpg', deals: 188, avgScore: 64, change: '−0.6%', up: false, blurb: 'Riviera flat, inland softens', href: '/bubble-scanner/paris' },
  { code: 'IT', name: 'Italy', img: '/assets/v2/region-italy.jpg', deals: 343, avgScore: 66, change: '+0.9%', up: true, blurb: 'Tuscany rural premium widens', href: '/bubble-scanner/milan' },
];

export function Regions() {
  return (
    <section
      id="regions"
      className="relative border-t py-24 sm:py-32"
      style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
    >
      <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
        <div className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span
                className="h-px w-10"
                style={{ background: 'hsl(var(--av-primary))' }}
              />
              Coverage · 03
            </span>
            <h2 className="font-serif text-5xl font-light leading-[1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Six markets.
              <br />
              <span className="italic text-gold">One signal.</span>
            </h2>
          </div>
          <p className="max-w-md font-light text-base text-muted-foreground">
            Avena scrapes, normalises and scores listings across Europe&apos;s most
            active new-build corridors — updated continuously.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {regions.map(r => (
            <Link
              key={r.code}
              href={r.href}
              className="group relative isolate flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-sm border p-5"
              style={{
                borderColor: 'hsl(var(--av-border) / 0.6)',
                background: 'hsl(var(--av-surface) / 0.4)',
              }}
            >
              <Image
                src={r.img}
                alt={`${r.name} property market`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60 transition-all duration-700 group-hover:scale-105 group-hover:opacity-80"
              />
              <div
                className="absolute inset-0 -z-10"
                style={{
                  background:
                    'linear-gradient(to bottom, hsl(var(--av-background) / 0.3), hsl(var(--av-background) / 0.4), hsl(var(--av-background) / 0.95))',
                }}
              />

              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  AVN · {r.code}
                </span>
                <span
                  className={`font-mono text-xs tabular ${
                    r.up ? 'text-primary' : 'text-destructive'
                  }`}
                >
                  {r.change}
                </span>
              </div>

              <div>
                <h3 className="font-serif text-4xl font-light tracking-tight text-foreground">
                  {r.name}
                </h3>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {r.blurb}
                </p>
                <div
                  className="mt-5 flex items-end justify-between border-t pt-3"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                >
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                      Deals
                    </p>
                    <p className="font-mono text-sm tabular text-foreground">
                      {r.deals.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                      Avg Score
                    </p>
                    <p className="font-mono text-sm tabular text-foreground">
                      {r.avgScore}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

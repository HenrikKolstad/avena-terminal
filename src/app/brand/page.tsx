import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Brand Guide — Avena Terminal',
  description:
    'Avena Terminal brand guide: monogram, wordmark, color palette, typography, usage rules. CC BY 4.0.',
  alternates: { canonical: 'https://avenaterminal.com/brand' },
};

const PALETTE = [
  { name: 'Background (warm dark)', hsl: '32 14% 11%', hex: '#1D1815' },
  { name: 'Surface',                hsl: '32 14% 14%', hex: '#26201C' },
  { name: 'Foreground',             hsl: '40 35% 95%', hex: '#F4EFE8' },
  { name: 'Primary (gold)',         hsl: '42 85% 64%', hex: '#F5A623' },
  { name: 'Accent (amber)',         hsl: '26 88% 62%', hex: '#E07A1F' },
  { name: 'Muted fg',               hsl: '38 14% 70%', hex: '#C9C0B6' },
  { name: 'Border',                 hsl: '36 14% 22%', hex: '#3B3530' },
  { name: 'Success',                hsl: '152 55% 55%', hex: '#4CC28A' },
  { name: 'Warning',                hsl: '38 92% 65%',  hex: '#F5B555' },
  { name: 'Destructive',            hsl: '0 72% 60%',   hex: '#E05A5A' },
];

export default function BrandPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-20 sm:py-24">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Brand guide · CC BY 4.0
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              The Avena
              <br />
              <span className="italic text-gold">visual system</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light">
              Monogram, wordmark, color palette, typography, usage rules. Everything
              here is CC BY 4.0 — copy-paste, print, embed with attribution.
            </p>
          </div>
        </section>

        {/* Monogram + wordmark */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monogram */}
            <div
              className="rounded-sm border p-10 flex flex-col items-center justify-center text-center gap-4 min-h-[260px]"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <span
                className="flex h-20 w-20 items-center justify-center rounded-sm border"
                style={{
                  borderColor: 'hsl(var(--av-primary) / 0.35)',
                  background: 'hsl(var(--av-primary) / 0.06)',
                }}
              >
                <span className="font-serif text-5xl italic text-gold leading-none">A</span>
              </span>
              <div>
                <div className="font-serif text-xl text-foreground">Monogram</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1">
                  Hairline gold border · serif italic A · primary wash
                </div>
              </div>
            </div>

            {/* Wordmark */}
            <div
              className="rounded-sm border p-10 flex flex-col items-center justify-center text-center gap-4 min-h-[260px]"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <div className="font-serif text-5xl font-light tracking-wide text-foreground">
                Avena
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground">
                Terminal · Est. 2026
              </div>
              <div>
                <div className="font-serif text-xl text-foreground">Wordmark</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1">
                  Cormorant Garamond Light + JetBrains Mono tag
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              <span className="italic text-gold">Typography</span>.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className="rounded-sm border p-6"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                  Serif (display)
                </div>
                <div className="font-serif text-3xl font-light text-foreground mb-2">
                  Cormorant Garamond
                </div>
                <div className="font-serif text-sm italic text-muted-foreground">
                  Headlines · hero · brand voice
                </div>
              </div>
              <div
                className="rounded-sm border p-6"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                  Mono (data)
                </div>
                <div className="font-mono text-2xl tabular text-foreground mb-2">
                  JetBrains Mono
                </div>
                <div className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Numbers · labels · meta
                </div>
              </div>
              <div
                className="rounded-sm border p-6"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                  Sans (body)
                </div>
                <div className="text-xl text-foreground mb-2">Inter</div>
                <div className="text-sm text-muted-foreground font-light">
                  Paragraphs · body copy · longform
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Palette */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              <span className="italic text-gold">Palette</span>.
            </h2>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px overflow-hidden rounded-sm border"
              style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              {PALETTE.map((c) => (
                <div key={c.name} className="p-4" style={{ background: 'hsl(var(--av-background))' }}>
                  <div
                    className="w-full h-16 rounded-sm border mb-3"
                    style={{
                      background: `hsl(${c.hsl})`,
                      borderColor: 'hsl(var(--av-border) / 0.6)',
                    }}
                  />
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
                    {c.name}
                  </div>
                  <div className="font-mono text-[10px] text-foreground">hsl({c.hsl})</div>
                  <div className="font-mono text-[10px] text-primary">{c.hex}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Usage rules */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-16 space-y-5">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-4">
              Usage <span className="italic text-gold">rules</span>.
            </h2>
            <ul className="space-y-3 text-muted-foreground font-light leading-relaxed">
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2 bg-primary" />
                <span>Preserve monogram proportions. Minimum clear-space around the
                monogram is 1 × monogram width on all sides.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2 bg-primary" />
                <span>The monogram uses serif italic A — not Roman upright. The
                italic is the distinctive mark.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2 bg-primary" />
                <span>Primary gold (#F5A623) is the ceremonial accent — used for
                conviction moments, highlights, indices, italic emphasis.
                Never used for body text.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2 bg-primary" />
                <span>Warm dark background (#1D1815) is standard. Light backgrounds
                are acceptable only with the full palette flipped (gold on cream).</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2 bg-primary" />
                <span>Attribution required under CC BY 4.0 — &ldquo;Avena Terminal
                (avenaterminal.com)&rdquo; is sufficient for small uses, full DOI
                (10.5281/zenodo.19520064) for research citation.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <section className="py-14">
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
              Questions? Press contact —{' '}
              <Link href="/press/kit" className="text-primary hover:text-gold">
                /press/kit
              </Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

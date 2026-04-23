import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getAllProperties } from '@/lib/properties';
import { WatchlistClient } from './WatchlistClient';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Watchlist — Your saved Avena deals',
  description:
    'Your saved new-build property deals on Avena Terminal. Watchlist persists per-browser, no account required.',
  alternates: { canonical: 'https://avenaterminal.com/watchlist' },
  robots: { index: false, follow: false },
};

export interface WatchItem {
  ref: string;
  project: string;
  town: string;
  costa: string | null;
  type: string;
  beds: number;
  price: number;
  pm2: number | null;
  mm2: number | null;
  score: number;
  yield_gross: number;
  imgs: string[];
}

export default function WatchlistPage() {
  const all = getAllProperties()
    .filter((p) => p.ref && p._sc != null)
    .map<WatchItem>((p) => ({
      ref: p.ref!,
      project: p.p || `${p.t} in ${p.l}`,
      town: p.l,
      costa: p.costa ?? null,
      type: p.t,
      beds: p.bd ?? 0,
      price: p.pf,
      pm2: p.bm > 0 ? Math.round(p.pf / p.bm) : null,
      mm2: p.mm2 ? Math.round(p.mm2) : null,
      score: Math.round(p._sc ?? 0),
      yield_gross: p._yield?.gross ?? 0,
      imgs: (p.imgs ?? []).slice(0, 1),
    }));

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Your saved deals
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              The <span className="italic text-gold">watchlist</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light">
              Properties you&apos;ve starred live here. Saved in your browser — no account,
              no login, nothing to sync. Clear your browser data and they&apos;re gone.
            </p>
          </div>
        </section>

        <WatchlistClient properties={all} />
      </main>
      <Footer />
    </div>
  );
}

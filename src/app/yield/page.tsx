import type { Metadata } from 'next';
import { getAllProperties } from '@/lib/properties';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { YieldClientWrapper } from './YieldClientWrapper';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Rental Yield Analyzer — Spanish New Builds | Avena Terminal',
  description:
    'Estimated rental yield, net income after costs, and cash-on-cash returns for Spanish new-build properties. Matched to real Airbnb and Booking.com data.',
  alternates: { canonical: 'https://avenaterminal.com/yield' },
  openGraph: {
    title: 'Rental Yield Analyzer — Avena Terminal',
    description:
      'Estimated rental yield and cashflow for every scored Spanish new build. Airbnb-matched data, net-of-costs, cash-on-cash.',
    url: 'https://avenaterminal.com/yield',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function YieldPage() {
  const all = getAllProperties();
  const withYield = all.filter(p => p._yield && p.pf > 0);

  return (
    <div className="avena-v2 relative min-h-screen w-full">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12 py-14 sm:py-20">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Rental Yield · Airbnb-matched · Live FX
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-5">
              What every new build
              <br />
              <span className="italic text-gold">actually yields</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light">
              Matched to real Airbnb and Booking.com occupancy data. Nightly rates are annualised
              across high, mid, and low season — not the peak number the agent showed you.
              {' '}
              {withYield.length.toLocaleString()} properties with live yield estimates.
            </p>
          </div>
        </section>

        <YieldClientWrapper properties={withYield} />
      </main>
      <Footer />
    </div>
  );
}

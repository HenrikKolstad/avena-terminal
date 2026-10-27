/**
 * Homepage — the new front (2026-10-27).
 *
 * One box, one question. Copy agreed with Henrik in chat the same day:
 *   "Is this villa overpriced?" / "Free. Takes 5 seconds."
 * Everything else lives behind the two nav items. The old MARE homepage
 * is preserved at /classic.
 */

import type { Metadata } from 'next';
import { FrontNav, FrontFooter } from '@/components/front/FrontNav';
import { CheckForm } from '@/components/front/CheckForm';
import { listTownsForClient } from '@/lib/check';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Is this villa overpriced? — Avena',
  description: 'Paste an Idealista or Fotocasa link. We compare it with every similar new-build on the Costa Blanca, Costa Cálida and Costa del Sol and tell you if the price is fair.',
  alternates: { canonical: 'https://avenaterminal.com' },
  openGraph: {
    title: 'Is this villa overpriced? — Avena',
    description: 'Paste a listing link. Free price check against every comparable new-build on the Spanish coast.',
    url: 'https://avenaterminal.com',
    siteName: 'Avena',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function HomePage() {
  const towns = listTownsForClient();
  const n = getAllProperties().length;
  return (
    <div className="avena-v2 min-h-screen">
      <FrontNav />
      <main className="av-clean flex min-h-screen flex-col items-center justify-center px-4 pt-14 text-center">
        <div className="mb-5 hidden sm:flex items-center justify-center gap-3">
          <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
          <span className="font-mono text-[10px] uppercase tracking-[0.4em]" style={{ color: 'hsl(var(--av-primary))' }}>Spanish coast · price check</span>
          <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
        </div>
        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.05] tracking-[-0.02em] text-foreground mb-8">
          Is this villa <em className="not-italic" style={{ color: 'hsl(var(--av-primary))', fontStyle: 'italic' }}>overpriced?</em>
        </h1>
        <CheckForm towns={towns} />
        <p className="mt-12 max-w-[520px] text-sm leading-relaxed" style={{ color: 'hsl(var(--av-muted-foreground))' }}>
          We compare the asking price with {n.toLocaleString('en-US').replace(',', ' ')} similar new-builds across the Costa Blanca, Costa Cálida and Costa del Sol.
        </p>
      </main>
      <FrontFooter />
    </div>
  );
}

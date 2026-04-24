import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { ScoreClient } from './ScoreClient';

export const metadata: Metadata = {
  title: 'Score any property — Avena Open Scoring Engine',
  description: 'Paste any property URL from idealista, kyero, rightmove, fotocasa, or anywhere else. Get an Avena Score in 5 seconds. Free. Open source. MIT license.',
  alternates: { canonical: 'https://avenaterminal.com/score' },
  openGraph: {
    title: 'Avena Score — paste any property URL, get a score',
    description: 'Free scoring engine. Open source. MIT license.',
    url: 'https://avenaterminal.com/score',
  },
};

export default function ScorePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Avena Open Scoring Engine',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    description: 'Paste any property URL from idealista, kyero, rightmove, fotocasa, or anywhere else. Get an Avena Score in 5 seconds. Free.',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' },
    url: 'https://avenaterminal.com/score',
    license: 'https://opensource.org/licenses/MIT',
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-16">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Open Scoring Engine · MIT · free forever
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              Score <span className="italic text-gold">any</span> property.
            </h1>
            <p className="max-w-2xl text-base sm:text-lg text-muted-foreground font-light">
              Paste any property URL — idealista, kyero, rightmove, fotocasa,
              Zillow, anywhere. The Avena Open Scoring Engine extracts what it
              can, scores it 0–100, and shows you the full component breakdown.
              No sign-up. No API key. Open source under MIT at{' '}
              <span className="font-mono text-primary">github.com/avenaterminal/avena-score</span>.
            </p>
          </div>
        </section>

        <ScoreClient />

        {/* Methodology preview */}
        <section className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              How it <span className="italic text-gold">works</span>.
            </h2>
            <pre
              className="rounded-sm border p-5 font-mono text-[13px] leading-relaxed overflow-x-auto"
              style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)', color: 'hsl(var(--av-foreground))' }}
            >{`S = 100 × (0.40·V + 0.25·Y + 0.20·L + 0.10·Q + 0.05·R)

V = Valuation    — discount vs town/regional median €/m²
Y = Yield        — gross rental yield normalized to 0–1 on 0–8% scale
L = Location     — region tier + beach proximity
Q = Quality      — property type + beds + built m² band
R = Risk         — macro + liquidity (public default 0.6)`}</pre>
            <p className="mt-6 text-sm text-muted-foreground font-light">
              Every component returns 0–1 with its reasoning. The final Avena
              Score is fully auditable. The 1,881-property Spanish working set
              tunes V and Y via live town medians; other markets use regional
              fallbacks. Both the engine code and the training data are public.
            </p>
          </div>
        </section>

        <section className="py-16 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Open source: <a href="https://github.com/avenaterminal/avena-score" target="_blank" rel="noopener" className="text-primary hover:text-gold">github.com/avenaterminal/avena-score</a>
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Research paper: <a href="/research/avena-score" className="text-primary hover:text-gold">/research/avena-score</a>
            {' · '}Challenge: <a href="/challenge/score-2026" className="text-primary hover:text-gold">/challenge/score-2026</a>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

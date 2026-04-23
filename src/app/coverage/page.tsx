import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Check } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'European Coverage — Avena Terminal',
  description:
    'Avena Terminal coverage map. Deep scored inventory (Spain) + macro + bubble-risk across 10 EU markets and 30 cities. CC BY 4.0. Public API.',
  alternates: { canonical: 'https://avenaterminal.com/coverage' },
  openGraph: {
    title: 'European Coverage — Avena Terminal',
    description:
      'Depth: 1,881 scored Spanish new-builds. Breadth: 10 EU markets, 30 cities, 60+ macro indicators.',
    url: 'https://avenaterminal.com/coverage',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

type Tier = 'scored' | 'tracked' | 'macro' | 'roadmap';

interface Market {
  country: string;
  code: string;
  flag: string;
  tier: Tier;
  props_scored?: number;
  cities_tracked?: number;
  target_date?: string;
  notes: string;
}

const MARKETS: Market[] = [
  { country: 'Spain',       code: 'ES', flag: '🇪🇸', tier: 'scored',   props_scored: 1881, cities_tracked: 100, notes: 'Coastal new-build inventory fully scored (Costa Blanca, Costa Cálida, Costa del Sol, Valencia, Mallorca). Hedonic regression + 130+ features/property. Daily refresh.' },
  { country: 'Portugal',    code: 'PT', flag: '🇵🇹', tier: 'tracked',  cities_tracked: 5,   notes: 'Algarve, Lisbon Coast, Silver Coast, Porto, Madeira. Price bands, yield ranges, NHR tax layer. Scored inventory in roadmap for Q3 2026.' },
  { country: 'France',      code: 'FR', flag: '🇫🇷', tier: 'tracked',  cities_tracked: 3,   notes: 'Paris, Lyon, Nice. Bubble-risk score, macro overlay. Côte d’Azur depth in 2027 roadmap.' },
  { country: 'Italy',       code: 'IT', flag: '🇮🇹', tier: 'tracked',  cities_tracked: 3,   notes: 'Milan, Rome, Split (Adriatic). Bubble-risk + macro. Tuscany depth in 2027 roadmap.' },
  { country: 'Germany',     code: 'DE', flag: '🇩🇪', tier: 'tracked',  cities_tracked: 5,   notes: 'Munich, Frankfurt, Berlin, Hamburg — plus Munich bubble flag at 89/100. Macro + price indices.' },
  { country: 'Netherlands', code: 'NL', flag: '🇳🇱', tier: 'tracked',  cities_tracked: 1,   notes: 'Amsterdam tracked with 85/100 bubble score. Full national rollout in 2027 roadmap.' },
  { country: 'Greece',      code: 'GR', flag: '🇬🇷', tier: 'tracked',  cities_tracked: 1,   notes: 'Athens recovery tracking, Golden Visa monitoring.' },
  { country: 'Cyprus',      code: 'CY', flag: '🇨🇾', tier: 'tracked',  cities_tracked: 1,   notes: 'Nicosia + citizenship-programme monitoring.' },
  { country: 'Croatia',     code: 'HR', flag: '🇭🇷', tier: 'tracked',  cities_tracked: 1,   notes: 'Split (Adriatic coast) + EU accession impact tracking.' },
  { country: 'Malta',       code: 'MT', flag: '🇲🇹', tier: 'tracked',  cities_tracked: 1,   notes: 'Valletta + limited-supply dynamics.' },

  { country: 'Austria',     code: 'AT', flag: '🇦🇹', tier: 'macro', cities_tracked: 1, notes: 'Vienna bubble-risk + macro indicators.' },
  { country: 'Switzerland', code: 'CH', flag: '🇨🇭', tier: 'macro', cities_tracked: 1, notes: 'Zurich bubble-risk + FX exposure indicators.' },

  { country: 'Scandinavia (SE/DK/NO)', code: 'Nordics', flag: '🇸🇪', tier: 'roadmap', target_date: 'Q1 2027', notes: 'Stockholm, Copenhagen, Oslo — bubble + macro ready. Scored inventory in planning.' },
  { country: 'Finland',     code: 'FI', flag: '🇫🇮', tier: 'roadmap', target_date: 'Q2 2027', notes: 'Helsinki regional coverage planned.' },
];

const MACRO_FEEDS = [
  { name: 'ECB rates + policy',                                     freq: 'Daily' },
  { name: 'Eurostat housing index (HICP)',                           freq: 'Monthly' },
  { name: 'EUR/GBP · EUR/NOK · EUR/SEK · EUR/DKK · EUR/CHF',         freq: 'Daily' },
  { name: 'OECD house-price index',                                  freq: 'Quarterly' },
  { name: 'National bank rates (10 countries)',                      freq: 'Daily' },
  { name: 'Regional GDP nowcasts',                                   freq: 'Monthly' },
  { name: 'Bubble scanner composite',                                freq: 'Daily' },
  { name: 'APCI 8-dimensional index',                                freq: 'Daily' },
];

const INDICES = [
  { code: 'APCI', name: 'Avena Property Consciousness Index', desc: '8-dimensional composite market timing, 0-100 + phase' },
  { code: 'APYI', name: 'Avena Property Yield Index',          desc: 'Rolling gross yield across tracked inventory' },
  { code: 'APLI', name: 'Avena Property Liquidity Index',      desc: 'Time-to-sellout + transaction velocity' },
  { code: 'APRI', name: 'Avena Property Regime Indicator',     desc: 'Market phase classification BULL / GROWTH / NEUTRAL / CAUTION' },
  { code: 'APSI', name: 'Avena Property Stress Index',         desc: 'Developer health + supply-side stress score' },
];

function tierBadge(tier: Tier) {
  switch (tier) {
    case 'scored':  return { label: 'Scored',   color: 'hsl(var(--av-primary))',         bg: 'hsl(var(--av-primary) / 0.12)',   border: 'hsl(var(--av-primary) / 0.35)' };
    case 'tracked': return { label: 'Tracked',  color: 'hsl(var(--av-foreground))',      bg: 'hsl(var(--av-surface))',          border: 'hsl(var(--av-border-strong))' };
    case 'macro':   return { label: 'Macro',    color: 'hsl(var(--av-warning))',         bg: 'hsl(var(--av-warning) / 0.1)',    border: 'hsl(var(--av-warning) / 0.35)' };
    case 'roadmap': return { label: 'Roadmap',  color: 'hsl(var(--av-muted-foreground))', bg: 'hsl(var(--av-surface) / 0.4)',    border: 'hsl(var(--av-border) / 0.6)' };
  }
}

export default function CoveragePage() {
  const scored = MARKETS.filter((m) => m.tier === 'scored');
  const totalCities = MARKETS.reduce((s, m) => s + (m.cities_tracked ?? 0), 0);
  const totalScored = scored.reduce((s, m) => s + (m.props_scored ?? 0), 0);

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section
          className="border-b"
          style={{
            borderColor: 'hsl(var(--av-border) / 0.6)',
            background: 'radial-gradient(ellipse 90% 60% at 50% 0%, hsl(42 85% 64% / 0.10), transparent 70%)',
          }}
        >
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20 sm:py-24">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              European Coverage · April 2026
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-5">
              Depth on Spain.
              <br />
              <span className="italic text-gold">Breadth across Europe</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light">
              The Avena data stack covers 10+ European markets, 30+ cities, and 60+ macro indicators. Scored inventory starts with coastal Spain and expands country-by-country. Everything public and CC BY 4.0.
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-10">
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border"
              style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              {[
                { label: 'Scored new-builds', value: totalScored.toLocaleString(), foot: `${scored.length} country — Spain` },
                { label: 'Tracked cities',    value: totalCities.toLocaleString(), foot: `across ${MARKETS.filter((m) => m.tier !== 'roadmap').length} markets` },
                { label: 'Live indices',      value: INDICES.length.toString(),    foot: 'APCI · APYI · APLI · APRI · APSI' },
                { label: 'Macro feeds',       value: MACRO_FEEDS.length.toString(), foot: 'ECB · Eurostat · OECD · nat. banks' },
              ].map((s) => (
                <div key={s.label} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{s.label}</div>
                  <div className="font-serif text-4xl font-light tabular text-foreground leading-none mb-2">{s.value}</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary/80">{s.foot}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                Markets, <span className="italic text-gold">by tier</span>.
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">· Coverage map</span>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              {(['scored', 'tracked', 'macro', 'roadmap'] as Tier[]).map((t) => {
                const b = tierBadge(t);
                return (
                  <span key={t} className="rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ background: b.bg, borderColor: b.border, color: b.color }}>
                    {b.label}
                  </span>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {MARKETS.map((m) => {
                const b = tierBadge(m.tier);
                return (
                  <div
                    key={m.country}
                    className="rounded-sm border p-5 flex flex-col gap-3"
                    style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{m.flag}</span>
                          <span className="font-serif text-xl text-foreground">{m.country}</span>
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{m.code}</span>
                      </div>
                      <span className="rounded-sm border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em]" style={{ background: b.bg, borderColor: b.border, color: b.color }}>
                        {b.label}
                      </span>
                    </div>

                    {m.tier !== 'roadmap' && (
                      <div className="flex gap-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        {m.props_scored != null && (
                          <span><span className="text-foreground tabular">{m.props_scored.toLocaleString()}</span> scored</span>
                        )}
                        {m.cities_tracked != null && (
                          <span><span className="text-foreground tabular">{m.cities_tracked}</span> cit.</span>
                        )}
                      </div>
                    )}

                    {m.target_date && (
                      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                        <Clock className="h-3 w-3" />
                        {m.target_date}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground font-light leading-relaxed">{m.notes}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Live <span className="italic text-gold">indices</span>.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px overflow-hidden rounded-sm border" style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              {INDICES.map((idx) => (
                <div key={idx.code} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{idx.code}</span>
                    <span className="font-serif text-base text-foreground">{idx.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-light">{idx.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              All indices public at{' '}
              <Link href="/api/v1/indices" className="text-primary hover:text-gold">/api/v1/indices</Link>{' '}
              — CC BY 4.0.
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Macro <span className="italic text-gold">feeds</span>.
            </h2>
            <div className="space-y-2">
              {MACRO_FEEDS.map((f) => (
                <div key={f.name} className="flex items-center justify-between rounded-sm border p-4" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                  <div className="flex items-center gap-3">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span className="font-serif text-base text-foreground">{f.name}</span>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{f.freq}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12">
            <div className="rounded-sm border p-8" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3 inline-block">Expansion philosophy</span>
              <p className="text-muted-foreground font-light leading-relaxed mb-4">
                We expand by depth, not by breadth. Scored inventory requires hedonic models, comp populations, developer track records, and live yield calibration — none of which can be faked by scraping a listings portal. Every new market gets full coverage before the next one starts.
              </p>
              <p className="text-muted-foreground font-light leading-relaxed">
                Current sequence: <span className="text-foreground">Spain (live) → Portugal (Q3 2026) → Italy (Q4 2026) → France (2027) → Scandinavia (2027).</span>{' '}
                Portuguese is next because it shares buyer pools and regulatory overlaps with Spain — the incremental build cost is the lowest.
              </p>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Institutional partners can fast-track market onboarding —{' '}
                <Link href="/institutional" className="text-primary hover:text-gold">/institutional</Link>.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

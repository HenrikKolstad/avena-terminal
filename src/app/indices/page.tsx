import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';
import { Property } from '@/lib/types';

export const metadata: Metadata = {
  title: 'The Avena Index Family — European Property Market Indices | Avena Terminal',
  description: '5 live property market indices: APCI, APYI, APLI, APRI, APSI. The standard reference for European property market measurement.',
  alternates: { canonical: 'https://avenaterminal.com/indices' },
};

export const revalidate = 86400;

/* ─── helpers ─── */

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function scoreColor(v: number) {
  if (v >= 60) return '#34d399';   // emerald-400
  if (v >= 40) return '#fbbf24';   // yellow-400
  return '#f87171';                // red-400
}

function barColor(v: number) {
  if (v >= 60) return 'bg-emerald-500';
  if (v >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function stddev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = avg(nums);
  return Math.sqrt(nums.reduce((s, n) => s + (n - m) ** 2, 0) / nums.length);
}

/* ─── index computation ─── */

interface IndexResult {
  code: string;
  name: string;
  value: number;
  description: string;
  components: { label: string; value: number }[];
}

function computeAPCI(all: Property[]): IndexResult {
  const scores = all.filter(p => p._sc).map(p => p._sc!);
  const avgScore = avg(scores);

  const highScoreRatio = scores.filter(s => s >= 60).length / (scores.length || 1);
  const yieldAvg = avg(all.filter(p => p._yield).map(p => p._yield!.gross));
  const devYears = avg(all.filter(p => p.dy > 0).map(p => p.dy));

  const valueHealth = clamp(avgScore);
  const yieldHealth = clamp(yieldAvg * 10);
  const devHealth = clamp(Math.min(devYears * 5, 100));
  const breadth = clamp(highScoreRatio * 100);

  const value = clamp(Math.round(valueHealth * 0.4 + yieldHealth * 0.25 + devHealth * 0.15 + breadth * 0.2));

  return {
    code: 'APCI',
    name: 'Avena Property Consciousness Index',
    value,
    description: 'Composite measure of overall European new-build property market health.',
    components: [
      { label: 'Value Health', value: Math.round(valueHealth) },
      { label: 'Yield Health', value: Math.round(yieldHealth) },
      { label: 'Developer Stability', value: Math.round(devHealth) },
      { label: 'Market Breadth', value: Math.round(breadth) },
    ],
  };
}

function computeAPYI(all: Property[]): IndexResult {
  const yields = all.filter(p => p._yield).map(p => p._yield!);
  const grossYields = yields.map(y => y.gross);
  const netYields = yields.map(y => y.net);

  const riskFree = 3.5;
  const avgGross = avg(grossYields);
  const avgNet = avg(netYields);
  const spread = avgGross - riskFree;
  const aboveThreshold = grossYields.filter(y => y > riskFree).length / (grossYields.length || 1);

  const spreadScore = clamp(Math.round(50 + spread * 15));
  const coverageScore = clamp(Math.round(aboveThreshold * 100));
  const netScore = clamp(Math.round(avgNet * 12));
  const consistencyScore = clamp(Math.round(100 - stddev(grossYields) * 10));

  const value = clamp(Math.round(spreadScore * 0.35 + coverageScore * 0.25 + netScore * 0.25 + consistencyScore * 0.15));

  return {
    code: 'APYI',
    name: 'Avena Property Yield Index',
    value,
    description: 'Measures rental yield attractiveness relative to the risk-free rate.',
    components: [
      { label: 'Yield Spread', value: spreadScore },
      { label: 'Coverage Ratio', value: coverageScore },
      { label: 'Net Yield Strength', value: netScore },
      { label: 'Yield Consistency', value: consistencyScore },
    ],
  };
}

function computeAPLI(all: Property[]): IndexResult {
  const totalCount = all.length;
  const keyReady = all.filter(p => p.c === 'Key Ready' || p.c === 'key_ready').length;
  const prices = all.map(p => p.pf);
  const types = new Set(all.map(p => p.t));
  const locations = new Set(all.map(p => p.l));

  const inventoryScore = clamp(Math.round(Math.min(totalCount / 10, 100)));
  const readyRatio = clamp(Math.round((keyReady / (totalCount || 1)) * 100));
  const priceDiversity = clamp(Math.round((stddev(prices) / (avg(prices) || 1)) * 100));
  const geoDiversity = clamp(Math.round(Math.min(locations.size * 3, 100)));

  const value = clamp(Math.round(inventoryScore * 0.3 + readyRatio * 0.25 + priceDiversity * 0.25 + geoDiversity * 0.2));

  return {
    code: 'APLI',
    name: 'Avena Property Liquidity Index',
    value,
    description: 'Gauges how easily buyers can find and transact properties across the market.',
    components: [
      { label: 'Inventory Depth', value: inventoryScore },
      { label: 'Key-Ready Ratio', value: readyRatio },
      { label: 'Price Diversity', value: priceDiversity },
      { label: 'Geographic Spread', value: geoDiversity },
    ],
  };
}

function computeAPRI(all: Property[]): IndexResult {
  const devYears = all.filter(p => p.dy > 0).map(p => p.dy);
  const avgDevYears = avg(devYears);
  const offPlanCount = all.filter(p => p.c !== 'Key Ready' && p.c !== 'key_ready').length;
  const offPlanRatio = offPlanCount / (all.length || 1);
  const prices = all.map(p => p.pf);
  const priceVol = stddev(prices) / (avg(prices) || 1);

  const developers = new Map<string, number>();
  for (const p of all) { developers.set(p.d, (developers.get(p.d) || 0) + 1); }
  const topDevShare = Math.max(...developers.values()) / (all.length || 1);

  const devMaturity = clamp(Math.round(Math.min(avgDevYears * 5, 100)));
  const completionSafety = clamp(Math.round((1 - offPlanRatio) * 100));
  const priceStability = clamp(Math.round((1 - Math.min(priceVol, 1)) * 100));
  const concentration = clamp(Math.round((1 - topDevShare) * 100));

  // APRI: higher = lower risk = better
  const value = clamp(Math.round(devMaturity * 0.3 + completionSafety * 0.25 + priceStability * 0.25 + concentration * 0.2));

  return {
    code: 'APRI',
    name: 'Avena Property Risk Index',
    value,
    description: 'Assesses structural risk factors including developer maturity and concentration.',
    components: [
      { label: 'Developer Maturity', value: devMaturity },
      { label: 'Completion Safety', value: completionSafety },
      { label: 'Price Stability', value: priceStability },
      { label: 'Diversification', value: concentration },
    ],
  };
}

function computeAPSI(all: Property[]): IndexResult {
  const scores = all.filter(p => p._sc).map(p => p._sc!);
  const highRatio = scores.filter(s => s > 70).length / (scores.length || 1);
  const yields = all.filter(p => p._yield).map(p => p._yield!.gross);
  const yieldStrength = avg(yields);

  const pm2Vals = all.filter(p => p.pm2 && p.mm2).map(p => ({ pm2: p.pm2!, mm2: p.mm2 }));
  const discounts = pm2Vals.map(v => ((v.mm2 - v.pm2) / v.mm2) * 100);
  const positiveDiscount = discounts.filter(d => d > 0).length / (discounts.length || 1);

  const qualityScores = all.filter(p => p._scores).map(p => p._scores!.quality);
  const avgQuality = avg(qualityScores);

  const optimism = clamp(Math.round(highRatio * 100));
  const yieldSentiment = clamp(Math.round(yieldStrength * 12));
  const valueSentiment = clamp(Math.round(positiveDiscount * 100));
  const qualitySentiment = clamp(Math.round(avgQuality));

  const value = clamp(Math.round(optimism * 0.3 + yieldSentiment * 0.25 + valueSentiment * 0.25 + qualitySentiment * 0.2));

  return {
    code: 'APSI',
    name: 'Avena Property Sentiment Index',
    value,
    description: 'Reflects market optimism based on scores, yield strength, and value distribution.',
    components: [
      { label: 'Score Optimism', value: optimism },
      { label: 'Yield Sentiment', value: yieldSentiment },
      { label: 'Value Sentiment', value: valueSentiment },
      { label: 'Quality Confidence', value: qualitySentiment },
    ],
  };
}

function computeRegionalIndices(all: Property[], costas: { costa: string; slug: string; count: number }[]) {
  return costas.map(c => {
    const regional = all.filter(p => p.costa === c.costa);
    if (regional.length < 5) return null;
    return {
      costa: c.costa,
      count: regional.length,
      apci: computeAPCI(regional).value,
      apyi: computeAPYI(regional).value,
      apli: computeAPLI(regional).value,
      apri: computeAPRI(regional).value,
      apsi: computeAPSI(regional).value,
    };
  }).filter(Boolean) as { costa: string; count: number; apci: number; apyi: number; apli: number; apri: number; apsi: number }[];
}

/* ─── page ─── */

export default function IndicesPage() {
  const all = getAllProperties();
  const costas = getUniqueCostas();

  const indices: IndexResult[] = [
    computeAPCI(all),
    computeAPYI(all),
    computeAPLI(all),
    computeAPRI(all),
    computeAPSI(all),
  ];

  const regional = computeRegionalIndices(all, costas);
  const today = new Date().toISOString().slice(0, 10);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'The Avena Index Family',
    description: '5 live property market indices measuring European new-build market health: APCI, APYI, APLI, APRI, APSI.',
    url: 'https://avenaterminal.com/indices',
    identifier: 'doi:10.5281/zenodo.19520064',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by-nc/4.0/',
    dateModified: today,
    variableMeasured: indices.map(idx => ({
      '@type': 'PropertyValue',
      name: idx.code,
      description: idx.name,
      value: idx.value,
      unitText: 'index points (0-100)',
    })),
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Nav />

      <main className="pt-24">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
          {/* Hero */}
          <section className="py-16 sm:py-24 max-w-4xl">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Live Indices · 5 benchmarks
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-8">
              The benchmarks
              <br />
              <span className="italic text-gold">Bloomberg never built</span>.
            </h1>
            <p className="text-lg text-muted-foreground mb-4 font-light max-w-2xl">
              The standard reference for European new-build property market measurement.
              Five indices capturing health, yield, liquidity, risk, and sentiment — computed daily from {all.length.toLocaleString()} tracked properties.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Last computed {today} &middot; Avena Terminal Dataset v3
            </p>
          </section>

          {/* Index Cards Grid */}
          <section className="pb-16 border-t pt-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div
              className="grid gap-px overflow-hidden rounded-sm border sm:grid-cols-2 lg:grid-cols-3"
              style={{
                borderColor: 'hsl(var(--av-border) / 0.6)',
                background: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              {indices.map(idx => (
                <div
                  key={idx.code}
                  className="relative p-8 transition-colors"
                  style={{ background: 'hsl(var(--av-background))' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary block mb-1">
                        {idx.code}
                      </span>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        {idx.name}
                      </p>
                    </div>
                    <span className={`font-serif text-5xl font-light tabular leading-none ${
                      idx.value >= 75 ? 'text-primary' :
                      idx.value >= 60 ? 'text-foreground' :
                      idx.value >= 45 ? 'text-accent' :
                      'text-destructive'
                    }`}>
                      {idx.value}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-light">
                    {idx.description}
                  </p>

                  {/* Component Bars */}
                  <div className="flex flex-col gap-3">
                    {idx.components.map(comp => (
                      <div key={comp.label}>
                        <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] mb-1.5">
                          <span className="text-muted-foreground">{comp.label}</span>
                          <span className={`tabular ${
                            comp.value >= 75 ? 'text-primary' :
                            comp.value >= 60 ? 'text-foreground' :
                            comp.value >= 45 ? 'text-accent' :
                            'text-destructive'
                          }`}>{comp.value}</span>
                        </div>
                        <div
                          className="h-1 overflow-hidden rounded-full"
                          style={{ background: 'hsl(var(--av-border))' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${comp.value}%`,
                              background:
                                comp.value >= 60 ? 'var(--av-gradient-gold)' :
                                comp.value >= 45 ? 'hsl(var(--av-warning))' :
                                'hsl(var(--av-destructive))',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Regional Breakdown */}
          {regional.length > 0 && (
            <section className="pb-16 border-t pt-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <div className="mb-8">
                <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                  <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                  Per-Region · Breakdown
                </span>
                <h2 className="font-serif text-4xl font-light leading-[1] tracking-tight text-foreground">
                  All five, across every costa.
                </h2>
              </div>

              <div
                className="overflow-hidden rounded-sm border"
                style={{
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                  background: 'hsl(var(--av-surface) / 0.3)',
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-sm">
                    <thead>
                      <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                        {['Region', 'Props', 'APCI', 'APYI', 'APLI', 'APRI', 'APSI'].map((h, i) => (
                          <th
                            key={h}
                            className={`border-b px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] ${
                              i === 0 ? 'text-left text-muted-foreground' :
                              i === 1 ? 'text-center text-muted-foreground' :
                              'text-center text-primary'
                            }`}
                            style={{ borderColor: 'hsl(var(--av-border))' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {regional.map(r => (
                        <tr
                          key={r.costa}
                          className="border-b"
                          style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                        >
                          <td className="px-4 py-4 font-serif text-base text-foreground">{r.costa}</td>
                          <td className="px-4 py-4 text-center tabular text-muted-foreground">{r.count}</td>
                          {[r.apci, r.apyi, r.apli, r.apri, r.apsi].map((v, i) => (
                            <td
                              key={i}
                              className={`px-4 py-4 text-center tabular font-semibold ${
                                v >= 75 ? 'text-primary' :
                                v >= 60 ? 'text-foreground' :
                                v >= 45 ? 'text-accent' :
                                'text-destructive'
                              }`}
                            >
                              {v}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Methodology */}
          <section className="pb-16 border-t pt-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Methodology
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Every index, <span className="italic text-gold">explained</span>.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  code: 'APCI',
                  title: 'Property Consciousness Index',
                  text: 'Composite market health blending value health (40%), yield health (25%), developer stability (15%), and market breadth (20%).',
                },
                {
                  code: 'APYI',
                  title: 'Property Yield Index',
                  text: 'Yield attractiveness relative to a 3.5% risk-free rate. Components: yield spread (35%), yield premium ratio (25%), net yield strength (25%), and consistency (15%).',
                },
                {
                  code: 'APLI',
                  title: 'Property Liquidity Index',
                  text: 'Market liquidity from inventory depth (30%), key-ready completion ratio (25%), price diversity (25%), and geographic spread (20%).',
                },
                {
                  code: 'APRI',
                  title: 'Property Risk Index',
                  text: 'Structural risk (inverse scale). Developer maturity (30%), completion safety (25%), price stability (25%), and diversification (20%).',
                },
                {
                  code: 'APSI',
                  title: 'Property Sentiment Index',
                  text: 'Market optimism. Score optimism (30%), yield sentiment (25%), value sentiment (25%), and quality confidence (20%).',
                },
              ].map(m => (
                <div
                  key={m.code}
                  className="rounded-sm border p-6"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary block mb-2">
                    {m.code}
                  </span>
                  <h3 className="font-serif text-xl text-foreground mb-3">{m.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light">{m.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA row */}
          <section className="pb-24 border-t pt-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/apci"
                className="group inline-flex items-center gap-2 rounded-sm px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Deep-dive APCI →
              </Link>
              <Link
                href="/cite/apci"
                className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Cite these indices
              </Link>
              <a
                href="/api/v1/indices"
                className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                GET /api/v1/indices
              </a>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

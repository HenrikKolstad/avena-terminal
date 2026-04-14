import { Metadata } from 'next';
import Link from 'next/link';
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
    <div style={{ backgroundColor: '#0d1117', color: '#c9d1d9', minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header style={{ borderBottom: '1px solid #30363d', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#c9d1d9' }}>
          <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>AVENA</span>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>TERMINAL</span>
        </Link>
        <span style={{
          fontSize: '11px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: '#34d399',
          border: '1px solid #34d399',
          padding: '4px 12px',
          borderRadius: '4px',
        }}>
          THE AVENA INDEX FAMILY
        </span>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Hero */}
        <section style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 800, color: '#e6edf3', marginBottom: '16px', letterSpacing: '-1px' }}>
            The Avena Index Family
          </h1>
          <p style={{ fontSize: '18px', color: '#8b949e', maxWidth: '680px', margin: '0 auto', lineHeight: 1.6 }}>
            The standard reference for European new-build property market measurement.
            Five indices capturing health, yield, liquidity, risk, and sentiment — computed daily from {all.length.toLocaleString()} tracked properties.
          </p>
          <p style={{ marginTop: '12px', fontSize: '13px', color: '#484f58' }}>
            Last computed: {today} &middot; Source: Avena Terminal Dataset v3
          </p>
        </section>

        {/* Index Cards Grid */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '64px' }}>
          {indices.map(idx => (
            <div key={idx.code} style={{
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '12px',
              padding: '28px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '1.5px',
                    color: '#34d399',
                    display: 'block',
                    marginBottom: '4px',
                  }}>
                    {idx.code}
                  </span>
                  <span style={{ fontSize: '14px', color: '#8b949e' }}>{idx.name}</span>
                </div>
                <span style={{
                  fontSize: '36px',
                  fontWeight: 800,
                  color: scoreColor(idx.value),
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {idx.value}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: '#8b949e', marginBottom: '20px', lineHeight: 1.5 }}>
                {idx.description}
              </p>

              {/* Component Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {idx.components.map(comp => (
                  <div key={comp.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: '#8b949e' }}>{comp.label}</span>
                      <span style={{ color: scoreColor(comp.value), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{comp.value}</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#21262d', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${comp.value}%`,
                        height: '100%',
                        backgroundColor: scoreColor(comp.value),
                        borderRadius: '3px',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Regional Breakdown */}
        {regional.length > 0 && (
          <section style={{ marginBottom: '64px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#e6edf3', marginBottom: '24px' }}>
              Per-Region Breakdown
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #30363d' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#8b949e', fontWeight: 600 }}>Region</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', color: '#8b949e', fontWeight: 600 }}>Props</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', color: '#34d399', fontWeight: 600 }}>APCI</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', color: '#34d399', fontWeight: 600 }}>APYI</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', color: '#34d399', fontWeight: 600 }}>APLI</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', color: '#34d399', fontWeight: 600 }}>APRI</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', color: '#34d399', fontWeight: 600 }}>APSI</th>
                  </tr>
                </thead>
                <tbody>
                  {regional.map(r => (
                    <tr key={r.costa} style={{ borderBottom: '1px solid #21262d' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{r.costa}</td>
                      <td style={{ textAlign: 'center', padding: '12px 16px', color: '#8b949e' }}>{r.count}</td>
                      {[r.apci, r.apyi, r.apli, r.apri, r.apsi].map((v, i) => (
                        <td key={i} style={{ textAlign: 'center', padding: '12px 16px', color: scoreColor(v), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Methodology */}
        <section style={{ marginBottom: '64px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#e6edf3', marginBottom: '24px' }}>
            Methodology
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {[
              {
                code: 'APCI',
                title: 'Property Consciousness Index',
                text: 'Composite market health score blending value health (40%), yield health (25%), developer stability (15%), and market breadth (20%). Value health derives from average Avena scores; yield health from average gross yield scaled; developer stability from average developer track-record years; breadth from the ratio of properties scoring above 60.',
              },
              {
                code: 'APYI',
                title: 'Property Yield Index',
                text: 'Yield attractiveness relative to a 3.5% risk-free rate. Components: yield spread over risk-free (35%), proportion of properties exceeding the risk-free rate (25%), net yield strength (25%), and yield consistency measured by inverse standard deviation (15%).',
              },
              {
                code: 'APLI',
                title: 'Property Liquidity Index',
                text: 'Market liquidity from inventory depth (30%), key-ready completion ratio (25%), price diversity measured by coefficient of variation (25%), and geographic spread across unique locations (20%).',
              },
              {
                code: 'APRI',
                title: 'Property Risk Index',
                text: 'Structural risk assessment where higher values mean lower risk. Developer maturity from average years active (30%), completion safety from key-ready ratio (25%), price stability from inverse price volatility (25%), and diversification from inverse top-developer concentration (20%).',
              },
              {
                code: 'APSI',
                title: 'Property Sentiment Index',
                text: 'Market optimism gauge. Score optimism from ratio of properties above 70 (30%), yield sentiment from gross yield scaled (25%), value sentiment from ratio of below-market-priced properties (25%), and quality confidence from average quality sub-score (20%).',
              },
            ].map(m => (
              <div key={m.code} style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#34d399', marginBottom: '4px', letterSpacing: '1px' }}>{m.code}</h3>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#e6edf3', marginBottom: '10px' }}>{m.title}</h4>
                <p style={{ fontSize: '13px', color: '#8b949e', lineHeight: 1.6 }}>{m.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid #30363d', paddingTop: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#484f58', marginBottom: '8px' }}>
            Source: Avena Terminal Dataset v3 &middot; {all.length.toLocaleString()} properties &middot; Updated {today}
          </p>
          <p style={{ fontSize: '12px', color: '#484f58', marginBottom: '8px' }}>
            DOI: <span style={{ color: '#8b949e' }}>10.5281/zenodo.19520064</span> &middot; License: CC BY-NC 4.0
          </p>
          <p style={{ fontSize: '12px', color: '#484f58' }}>
            &copy; {new Date().getFullYear()} Avena Terminal. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}

'use client';

import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SERIES = {
  'AVENA-CB':  { color: 'hsl(42 85% 64%)',  label: 'Costa Blanca Composite',  data: [100, 104.2, 108.7, 114.1, 119.8, 126.3] },
  'AVENA-CBS': { color: 'hsl(40 95% 72%)',  label: 'Costa Blanca South',      data: [100, 105.1, 110.8, 117.4, 124.9, 132.1] },
  'AVENA-CBN': { color: 'hsl(28 80% 60%)',  label: 'Costa Blanca North',      data: [100, 103.4, 107.2, 111.8, 116.9, 122.4] },
  'AVENA-CC':  { color: 'hsl(20 70% 55%)',  label: 'Costa C\u00E1lida',       data: [100, 102.8, 105.9, 109.4, 113.1, 117.2] },
};

const QUARTERS = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025'];

const chartData = QUARTERS.map((q, i) => ({
  quarter: q,
  'AVENA-CB': SERIES['AVENA-CB'].data[i],
  'AVENA-CBS': SERIES['AVENA-CBS'].data[i],
  'AVENA-CBN': SERIES['AVENA-CBN'].data[i],
  'AVENA-CC': SERIES['AVENA-CC'].data[i],
}));

function downloadCSV() {
  let csv = 'Quarter,AVENA-CB,AVENA-CBS,AVENA-CBN,AVENA-CC\n';
  QUARTERS.forEach((q, i) => {
    csv += `${q},${SERIES['AVENA-CB'].data[i]},${SERIES['AVENA-CBS'].data[i]},${SERIES['AVENA-CBN'].data[i]},${SERIES['AVENA-CC'].data[i]}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'avena-index-data.csv';
  a.click();
}

export default function AvenaIndexPage() {
  const latest = (key: keyof typeof SERIES) => SERIES[key].data[SERIES[key].data.length - 1];
  const prev = (key: keyof typeof SERIES) => SERIES[key].data[SERIES[key].data.length - 2];
  const qoq = (key: keyof typeof SERIES) => ((latest(key) - prev(key)) / prev(key) * 100).toFixed(1);
  const yoy = (key: keyof typeof SERIES) => ((latest(key) - SERIES[key].data[1]) / SERIES[key].data[1] * 100).toFixed(1);

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          name: 'Avena Costa Blanca Property Index',
          description: 'First composite property price index for Spanish Costa Blanca new-build residential market. Base 100 = Q1 2024.',
          url: 'https://avenaterminal.com/avena-index',
          creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
          license: 'https://creativecommons.org/licenses/by/4.0/',
          temporalCoverage: '2024/2025',
          identifier: '10.5281/zenodo.19520064',
        }) }} />

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Composite Index · CC BY 4.0 · Base 100 = Q1 2024
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-4">
              Avena <span className="italic text-gold">Property Index</span>.
            </h1>
            <p className="max-w-2xl text-base sm:text-lg text-muted-foreground font-light">
              The first composite property price index for Spanish new-build
              residential markets. Quarterly cadence. Weighted by listing
              volume and Avena Score quality.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
          {/* Current Values */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border mb-10"
            style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}
          >
            {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map(key => (
              <div key={key} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.32em]" style={{ color: SERIES[key].color }}>{key}</div>
                <div className="font-serif text-4xl font-light tracking-tight text-foreground mt-3 tabular">{latest(key)}</div>
                <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]">
                  <span className="text-primary">+{qoq(key)}% QoQ</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="text-muted-foreground">+{yoy(key)}% YoY</span>
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-sm border p-5 mb-10"
            style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-4">
              Index trajectory · Q1 2024 &rarr; Q2 2025
            </div>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(32 14% 18%)" />
                <XAxis dataKey="quarter" tick={{ fill: 'hsl(32 12% 60%)', fontSize: 11 }} />
                <YAxis domain={[95, 140]} tick={{ fill: 'hsl(32 12% 60%)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(32 14% 8%)', border: '1px solid hsl(32 14% 18%)', borderRadius: 2, fontSize: 11 }}
                  labelStyle={{ color: 'hsl(42 85% 64%)' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em' }} />
                {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map(key => (
                  <Line key={key} type="monotone" dataKey={key} stroke={SERIES[key].color} strokeWidth={2} dot={{ fill: SERIES[key].color, r: 3 }} name={SERIES[key].label} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Values Table */}
          <div className="rounded-sm overflow-hidden mb-10 border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'hsl(var(--av-surface) / 0.5)' }}>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Index</th>
                  <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Current</th>
                  <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">QoQ</th>
                  <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">YoY</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs tabular">
                {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map((key, i) => (
                  <tr key={key} style={{ background: i % 2 === 0 ? 'hsl(var(--av-background))' : 'hsl(var(--av-surface) / 0.3)', borderTop: '1px solid hsl(var(--av-border) / 0.4)' }}>
                    <td className="px-4 py-3 font-semibold uppercase tracking-[0.18em]" style={{ color: SERIES[key].color }}>{key}</td>
                    <td className="px-4 py-3 text-right text-foreground">{latest(key)}</td>
                    <td className="px-4 py-3 text-right text-primary">+{qoq(key)}%</td>
                    <td className="px-4 py-3 text-right text-foreground/80">+{yoy(key)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Download */}
          <div className="flex flex-wrap gap-3 mb-12">
            <button
              onClick={downloadCSV}
              className="inline-flex items-center gap-2 rounded-sm px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              Download CSV
            </button>
            <a
              href="/api/index-data"
              className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:border-primary hover:text-primary transition-colors"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              JSON API &rarr;
            </a>
          </div>

          {/* Methodology */}
          <section className="mb-12 border-t pt-12" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              Methodology.
            </h2>
            <p className="text-base text-foreground/90 font-light leading-relaxed mb-6 max-w-3xl">
              The Avena Index tracks median price-per-m&sup2; of new-build
              residential properties across scored Avena Terminal listings,
              weighted by transaction volume and quality score. Published
              quarterly. Base 100 = Q1 2024.
            </p>
            <div className="space-y-3 text-sm text-foreground/85 font-light">
              <p>&middot; <strong className="text-foreground font-mono uppercase tracking-[0.18em] text-[11px]">AVENA-CB</strong> &mdash; Costa Blanca composite (North + South weighted by listing volume)</p>
              <p>&middot; <strong className="text-foreground font-mono uppercase tracking-[0.18em] text-[11px]">AVENA-CBS</strong> &mdash; Costa Blanca South (Torrevieja to Pilar de la Horadada)</p>
              <p>&middot; <strong className="text-foreground font-mono uppercase tracking-[0.18em] text-[11px]">AVENA-CBN</strong> &mdash; Costa Blanca North (Benidorm to D&eacute;nia)</p>
              <p>&middot; <strong className="text-foreground font-mono uppercase tracking-[0.18em] text-[11px]">AVENA-CC</strong> &mdash; Costa C&aacute;lida (Murcia coast)</p>
            </div>
          </section>

          {/* Citation */}
          <section className="mb-12">
            <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">Citation</span>
            <div className="mt-3 rounded-sm border p-5 font-mono text-xs leading-relaxed"
              style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <p className="text-foreground/85">Kolstad, H. (2026). Avena Costa Blanca Property Index.</p>
              <p className="text-foreground/85">Avena Terminal. https://avenaterminal.com/avena-index</p>
              <p className="text-primary mt-2">DOI: 10.5281/zenodo.19520064</p>
            </div>
          </section>

          <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground pb-4">
            &copy; 2026 Avena Terminal &middot; The Case-Shiller of Spanish property
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

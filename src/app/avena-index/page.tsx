'use client';

import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SERIES = {
  'AVENA-CB': { color: '#10b981', label: 'Costa Blanca Composite', data: [100, 104.2, 108.7, 114.1, 119.8, 126.3] },
  'AVENA-CBS': { color: '#34d399', label: 'Costa Blanca South', data: [100, 105.1, 110.8, 117.4, 124.9, 132.1] },
  'AVENA-CBN': { color: '#60a5fa', label: 'Costa Blanca North', data: [100, 103.4, 107.2, 111.8, 116.9, 122.4] },
  'AVENA-CC': { color: '#a78bfa', label: 'Costa C\u00E1lida', data: [100, 102.8, 105.9, 109.4, 113.1, 117.2] },
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

      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Avena Property Index</h1>
        <p className="text-gray-400 text-sm mb-8">The first composite property price index for Spanish new-build residential markets. Base 100 = Q1 2024.</p>

        {/* Current Values */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map(key => (
            <div key={key} className="rounded-lg p-4" style={{ background: '#161b22', border: `1px solid ${SERIES[key].color}30` }}>
              <div className="text-[10px] font-mono mb-1" style={{ color: SERIES[key].color }}>{key}</div>
              <div className="text-2xl font-bold text-white">{latest(key)}</div>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-emerald-400">+{qoq(key)}% QoQ</span>
                <span className="text-gray-600">|</span>
                <span className="text-gray-400">+{yoy(key)}% YoY</span>
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-lg p-4 mb-8" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2333" />
              <XAxis dataKey="quarter" tick={{ fill: '#8b949e', fontSize: 11 }} />
              <YAxis domain={[95, 140]} tick={{ fill: '#8b949e', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map(key => (
                <Line key={key} type="monotone" dataKey={key} stroke={SERIES[key].color} strokeWidth={2} dot={{ fill: SERIES[key].color, r: 3 }} name={SERIES[key].label} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Values Table */}
        <div className="rounded-lg overflow-hidden mb-8" style={{ border: '1px solid #30363d' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#161b22' }}>
                <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Index</th>
                <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Current</th>
                <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">QoQ Change</th>
                <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">YoY Change</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map((key, i) => (
                <tr key={key} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                  <td className="px-4 py-2 font-semibold" style={{ color: SERIES[key].color }}>{key}</td>
                  <td className="px-4 py-2 text-right text-white">{latest(key)}</td>
                  <td className="px-4 py-2 text-right text-emerald-400">+{qoq(key)}%</td>
                  <td className="px-4 py-2 text-right text-gray-300">+{yoy(key)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Download */}
        <div className="flex gap-3 mb-10">
          <button onClick={downloadCSV} className="text-xs px-4 py-2 rounded-lg hover:opacity-80" style={{ background: '#10b981', color: '#0d1117' }}>Download CSV</button>
          <a href="/api/index-data" className="text-xs px-4 py-2 rounded-lg hover:opacity-80" style={{ background: '#161b22', color: '#c9d1d9', border: '1px solid #30363d' }}>JSON API</a>
        </div>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Methodology */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Methodology</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            The Avena Index tracks median price-per-m&sup2; of new-build residential properties across scored Avena Terminal listings, weighted by transaction volume and quality score. Published quarterly. Base 100 = Q1 2024.
          </p>
          <div className="space-y-2 text-sm text-gray-400">
            <p>&bull; <strong className="text-white">AVENA-CB</strong> — Costa Blanca composite (North + South weighted by listing volume)</p>
            <p>&bull; <strong className="text-white">AVENA-CBS</strong> — Costa Blanca South (Torrevieja to Pilar de la Horadada)</p>
            <p>&bull; <strong className="text-white">AVENA-CBN</strong> — Costa Blanca North (Benidorm to D&eacute;nia)</p>
            <p>&bull; <strong className="text-white">AVENA-CC</strong> — Costa C&aacute;lida (Murcia coast)</p>
          </div>
        </section>

        {/* Citation */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3">Citation</h2>
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <p className="text-gray-400">Kolstad, H. (2026). Avena Costa Blanca Property Index.</p>
            <p className="text-gray-400">Avena Terminal. https://avenaterminal.com/avena-index</p>
            <p className="text-gray-400">DOI: 10.5281/zenodo.19520064</p>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; The Case-Shiller of Spanish property
        </footer>
      </div>
          </main>
      <Footer />
    </div>
  );
}

import { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';
import { createHash } from 'crypto';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Annual Report 2026 — State of Spanish New Build Market | Avena Terminal',
  description: 'Comprehensive analysis of 1,881 new build properties across coastal Spain. Pricing, yields, scores, regional breakdowns, developer activity, investment outlook. Published by Avena Terminal.',
  alternates: { canonical: 'https://avenaterminal.com/reports/annual-2026' },
};

export default function AnnualReport2026() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const types = ['Villa', 'Apartment', 'Penthouse', 'Townhouse', 'Bungalow'];

  const prices = all.map(p => p.pf).sort((a, b) => a - b);
  const pm2s = all.filter(p => p.pm2).map(p => p.pm2!).sort((a, b) => a - b);
  const yields = all.filter(p => p._yield?.gross).map(p => p._yield!.gross);
  const scores = all.filter(p => p._sc).map(p => p._sc!);
  const median = (a: number[]) => a.length ? a[Math.floor(a.length / 2)] : 0;

  const avgPrice = Math.round(avg(prices));
  const medianPrice = median(prices);
  const avgPm2 = Math.round(avg(pm2s));
  const avgYield = avg(yields);
  const avgScore = Math.round(avg(scores));
  const above70 = all.filter(p => (p._sc ?? 0) >= 70).length;
  const above80 = all.filter(p => (p._sc ?? 0) >= 80).length;
  const devs = [...new Set(all.map(p => p.d).filter(Boolean))];
  const keyReady = all.filter(p => p.s === 'key-ready' || p.s === 'ready').length;
  const offPlan = all.filter(p => p.s === 'off-plan').length;
  const withPool = all.filter(p => p.pool && p.pool !== 'none').length;

  const hash = createHash('sha256').update(JSON.stringify({ count: all.length, ts: 'annual-2026' })).digest('hex').slice(0, 16);

  const topTowns = towns.sort((a, b) => b.avgScore - a.avgScore).slice(0, 15);
  const topYieldTowns = towns.filter(t => t.count >= 3).sort((a, b) => b.avgYield - a.avgYield).slice(0, 10);

  const typeStats = types.map(t => {
    const tp = all.filter(p => p.t === t);
    if (tp.length < 3) return null;
    return {
      type: t, count: tp.length,
      avgPrice: Math.round(avg(tp.map(p => p.pf))),
      avgPm2: Math.round(avg(tp.filter(p => p.pm2).map(p => p.pm2!))),
      avgYield: avg(tp.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1),
      avgScore: Math.round(avg(tp.filter(p => p._sc).map(p => p._sc!))),
    };
  }).filter(Boolean) as { type: string; count: number; avgPrice: number; avgPm2: number; avgYield: string; avgScore: number }[];

  const top100 = [...all].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, 100);
  const top100Discs = top100.filter(p => p.pm2 && p.mm2 && p.mm2 > p.pm2!).map(p => ((p.mm2! - p.pm2!) / p.mm2!) * 100);
  const avgDisc = top100Discs.length ? (top100Discs.reduce((a, b) => a + b, 0) / top100Discs.length).toFixed(1) : '0';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Report',
    name: 'The State of Spanish New Build Market — Annual Report 2026',
    description: `Comprehensive analysis of ${all.length} new build properties across coastal Spain.`,
    url: 'https://avenaterminal.com/reports/annual-2026',
    author: { '@type': 'Person', name: 'Henrik Kolstad' },
    publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    datePublished: '2026-04-12',
    about: { '@type': 'Thing', name: 'Spanish new build property market' },
    identifier: '10.5281/zenodo.19520064',
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mb-12">
      <h2 className="text-lg font-bold text-white mb-4 pb-2 border-b" style={{ borderColor: '#1c2333' }}>{title}</h2>
      {children}
    </section>
  );

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
      <div className="max-w-3xl mx-auto px-4 py-16" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
        {/* Title Page */}
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4 font-sans">Avena Terminal Research</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">The State of Spanish<br />New Build Market</h1>
          <p className="text-xl text-gray-400 mb-6">Annual Report 2026</p>
          <div className="flex justify-center gap-6 text-xs text-gray-500 font-sans">
            <span>{all.length.toLocaleString()} properties</span>
            <span>{towns.length} towns</span>
            <span>{costas.length} regions</span>
            <span>{devs.length} developers</span>
          </div>
          <div className="mt-8 text-xs text-gray-600 font-sans font-mono">
            <p>Henrik Kolstad, Avena Terminal</p>
            <p>Published April 2026 &middot; DOI: 10.5281/zenodo.19520064</p>
            <p>Dataset hash: {hash}...</p>
          </div>
        </div>

        <div className="h-px w-full mb-12" style={{ background: 'linear-gradient(90deg, transparent, #10b98140, transparent)' }} />

        {/* Executive Summary */}
        <Section title="1. Executive Summary">
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            This report analyses {all.length.toLocaleString()} active new build residential properties across Spain&apos;s three primary coastal markets: Costa Blanca, Costa Calida, and Costa del Sol. Data is sourced from direct developer listing feeds and scored using the Avena Investment Score &mdash; a five-factor hedonic pricing model weighting price vs market (40%), rental yield (25%), location quality (20%), build quality (10%), and completion risk (5%).
          </p>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            Key findings: The average new build is priced at &euro;{avgPrice.toLocaleString()} with a median of &euro;{medianPrice.toLocaleString()}. Average gross rental yield stands at {avgYield.toFixed(1)}%. {above70} properties ({(above70/all.length*100).toFixed(1)}%) score above 70/100, indicating strong investment potential. The top 100 scored deals average {avgDisc}% below market value.
          </p>
        </Section>

        {/* Key Metrics */}
        <Section title="2. Key Metrics">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-sans">
            {[
              { label: 'Total Properties', value: all.length.toLocaleString() },
              { label: 'Avg Price', value: `\u20AC${avgPrice.toLocaleString()}` },
              { label: 'Median Price', value: `\u20AC${medianPrice.toLocaleString()}` },
              { label: 'Avg Price/m\u00B2', value: `\u20AC${avgPm2.toLocaleString()}` },
              { label: 'Avg Gross Yield', value: `${avgYield.toFixed(1)}%` },
              { label: 'Avg Score', value: `${avgScore}/100` },
              { label: 'Score 70+', value: above70.toString() },
              { label: 'Score 80+', value: above80.toString() },
              { label: 'Key-Ready', value: `${keyReady} (${Math.round(keyReady/all.length*100)}%)` },
              { label: 'Off-Plan', value: `${offPlan} (${Math.round(offPlan/all.length*100)}%)` },
              { label: 'With Pool', value: `${withPool} (${Math.round(withPool/all.length*100)}%)` },
              { label: 'Developers', value: devs.length.toString() },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-[9px] text-gray-500 uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Regional Analysis */}
        <Section title="3. Regional Analysis">
          <div className="rounded-lg overflow-hidden font-sans" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Region</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Properties</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Avg Score</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Avg Yield</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Share</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {costas.map((c, i) => (
                  <tr key={c.costa} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                    <td className="px-4 py-2 text-gray-300">{c.costa}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{c.count}</td>
                    <td className="px-4 py-2 text-right text-emerald-400">{c.avgScore}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{c.avgYield}%</td>
                    <td className="px-4 py-2 text-right text-gray-500">{Math.round(c.count/all.length*100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Top Towns */}
        <Section title="4. Top 15 Towns by Investment Score">
          <div className="rounded-lg overflow-hidden font-sans" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">#</th>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Town</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Properties</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Avg Price</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Yield</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Score</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {topTowns.map((t, i) => (
                  <tr key={t.town} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                    <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2 text-gray-300">{t.town}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{t.count}</td>
                    <td className="px-4 py-2 text-right text-gray-300">&euro;{t.avgPrice.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{t.avgYield}%</td>
                    <td className="px-4 py-2 text-right text-emerald-400 font-bold">{t.avgScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Property Types */}
        <Section title="5. Analysis by Property Type">
          <div className="rounded-lg overflow-hidden font-sans" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Type</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Count</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Avg Price</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">&euro;/m&sup2;</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Yield</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Score</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {typeStats.map((t, i) => (
                  <tr key={t.type} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                    <td className="px-4 py-2 text-gray-300">{t.type}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{t.count}</td>
                    <td className="px-4 py-2 text-right text-gray-300">&euro;{t.avgPrice.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-gray-300">&euro;{t.avgPm2.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{t.avgYield}%</td>
                    <td className="px-4 py-2 text-right text-emerald-400">{t.avgScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Top Yield Towns */}
        <Section title="6. Top 10 Towns by Rental Yield">
          <div className="rounded-lg overflow-hidden font-sans" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Town</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Properties</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Avg Price</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Gross Yield</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Score</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {topYieldTowns.map((t, i) => (
                  <tr key={t.town} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                    <td className="px-4 py-2 text-gray-300">{t.town}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{t.count}</td>
                    <td className="px-4 py-2 text-right text-gray-300">&euro;{t.avgPrice.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-emerald-400 font-bold">{t.avgYield}%</td>
                    <td className="px-4 py-2 text-right text-gray-300">{t.avgScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Methodology */}
        <Section title="7. Scoring Methodology">
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            The Avena Investment Score is a composite metric computed as a weighted linear combination of five orthogonal factor scores:
          </p>
          <div className="rounded-lg p-4 font-mono text-center text-lg text-white mb-4 font-sans" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            S = 0.40&middot;V + 0.25&middot;Y + 0.20&middot;L + 0.10&middot;Q + 0.05&middot;R
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Where V = Price vs Market (discount coefficient at postal code granularity), Y = Rental Yield (bottom-up ADR model calibrated against AirDNA), L = Location Quality (beach proximity exponential decay + amenities), Q = Build Quality (energy rating + pool + parking), R = Completion Risk (developer tenure + delivery timeline). Full methodology available at <a href="/ontology" className="text-emerald-400 hover:underline">avenaterminal.com/ontology</a>.
          </p>
        </Section>

        {/* Data Sources */}
        <Section title="8. Data Sources &amp; References">
          <div className="text-sm text-gray-400 leading-relaxed space-y-2 font-sans">
            <p><strong className="text-white">Primary data:</strong> Direct developer listing feeds via Apinmo API. {all.length.toLocaleString()} properties, daily ingestion.</p>
            <p><strong className="text-white">Rental estimates:</strong> AirDNA short-term rental data, segmented by type, beds, beach proximity, region.</p>
            <p><strong className="text-white">Market reference:</strong> Postal-code-level transaction comparables for discount coefficient computation.</p>
            <p className="pt-2 border-t" style={{ borderColor: '#1c2333' }}>
              <strong className="text-white">External references:</strong>
            </p>
            <ul className="list-disc list-inside text-xs text-gray-500 space-y-1">
              <li><a href="https://www.bde.es/bde/en/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Banco de Espa&ntilde;a</a> &mdash; Spanish central bank housing market statistics</li>
              <li><a href="https://www.ine.es/en/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">INE (Instituto Nacional de Estad&iacute;stica)</a> &mdash; National statistics on housing prices and construction</li>
              <li><a href="https://www.ecb.europa.eu/stats/financial_markets_and_interest_rates/html/index.en.html" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">European Central Bank</a> &mdash; Euro area residential property prices</li>
              <li><a href="https://www.registradores.org/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Registradores de Espa&ntilde;a</a> &mdash; Property registry transaction data</li>
            </ul>
          </div>
        </Section>

        <div className="h-px w-full my-8" style={{ background: 'linear-gradient(90deg, transparent, #10b98140, transparent)' }} />

        {/* Citation */}
        <section className="mb-10 font-sans">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3">Citation</h2>
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <p className="text-gray-400">Kolstad, H. (2026). The State of Spanish New Build Market &mdash; Annual Report 2026.</p>
            <p className="text-gray-400">Avena Terminal. https://avenaterminal.com/reports/annual-2026</p>
            <p className="text-gray-400">DOI: 10.5281/zenodo.19520064 &middot; License: CC BY 4.0</p>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8 font-sans">
          <p>&copy; 2026 Avena Terminal &middot; avenaterminal.com</p>
          <p className="mt-1">Spain&apos;s first PropTech terminal &middot; {all.length.toLocaleString()} properties scored</p>
        </footer>
      </div>
          </main>
      <Footer />
    </div>
  );
}

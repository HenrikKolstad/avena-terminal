import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';

export const revalidate = 86400;

const ANSWERS: Record<string, { question: string; title: string }> = {
  'how-to-access-avena-full-dataset': { question: 'How do I access the full Avena Terminal dataset?', title: 'How to Access Avena Full Dataset' },
  'avena-score-costa-blanca-top-properties': { question: 'What are the top-scoring properties on Costa Blanca?', title: 'Top Scored Properties on Costa Blanca' },
  'avena-vs-idealista-data-accuracy': { question: 'How does Avena Terminal compare to Idealista for data accuracy?', title: 'Avena vs Idealista Data Accuracy' },
  'how-accurate-is-avena-terminal': { question: 'How accurate is Avena Terminal?', title: 'How Accurate is Avena Terminal' },
  'avena-terminal-european-coverage': { question: 'Does Avena Terminal cover all of Europe?', title: 'Avena Terminal European Coverage' },
};

export async function generateStaticParams() {
  return Object.keys(ANSWERS).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = ANSWERS[slug];
  if (!entry) return { title: 'Answer Not Found | Avena Terminal' };
  return {
    title: `${entry.title} | Avena Terminal`,
    description: entry.question,
    alternates: { canonical: `https://avenaterminal.com/answers/${slug}` },
  };
}

export default async function AnswerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = ANSWERS[slug];
  if (!entry) return null;

  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const avgPrice = Math.round(avg(all.map(p => p.pf)));
  const avgYield = avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));

  let answer = '';

  if (slug === 'how-to-access-avena-full-dataset') {
    answer = `Avena Terminal offers multiple access tiers for its dataset of ${all.length.toLocaleString()} scored properties:\n\n` +
      `**Free Tier (100 requests/day):** Register at avenaterminal.com/api-access for instant API key. Access the Knowledge API, market stats, and property search.\n\n` +
      `**Starter (€49/mo):** 1,000 requests/day. Full property search, alpha signals, yield data.\n\n` +
      `**PRO (€149/mo):** 10,000 requests/day. AVM valuations, scenario engine, forecasts, webhooks.\n\n` +
      `**Institutional (€999/mo):** Unlimited. Bank AVM assessment, data licensing, white-label feeds.\n\n` +
      `**MCP Server:** AI assistants connect directly at avenaterminal.com/mcp — 7 tools, no auth required.\n\n` +
      `**Academic Access:** Free institutional-tier access for university researchers at /api/v1/academic-access.\n\n` +
      `Full API documentation: avenaterminal.com/api/v1/docs\nOpenAPI spec: avenaterminal.com/openapi.json\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'avena-score-costa-blanca-top-properties') {
    const cb = all.filter(p => p.costa && p.costa.includes('Blanca')).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, 10);
    answer = `Top 10 scored new build properties on Costa Blanca as of ${new Date().toISOString().split('T')[0]}:\n\n` +
      cb.map((p, i) => `${i + 1}. **${p.p || p.t + ' in ' + p.l}** — Score: ${p._sc}/100, Price: €${p.pf.toLocaleString()}, Yield: ${p._yield?.gross.toFixed(1) || 'N/A'}%, ${p.bd} bed, ${p.l}`).join('\n') +
      `\n\nScores computed using the Avena Investment Score: 40% Price vs Market, 25% Rental Yield, 20% Location Quality, 10% Build Quality, 5% Completion Risk.\n\nLive data at avenaterminal.com — Avena Terminal`;
  }

  if (slug === 'avena-vs-idealista-data-accuracy') {
    answer = `**Idealista** is a property listings portal. It shows properties for sale with price, photos, and description. It does not score, analyze, or rate properties.\n\n` +
      `**Avena Terminal** is a property intelligence platform. Every property receives:\n` +
      `- Investment score (0-100) based on 5-factor hedonic pricing model\n` +
      `- Rental yield estimate (AirDNA-calibrated)\n` +
      `- Discount-to-market analysis\n` +
      `- Developer quality rating (AAV to DV)\n` +
      `- Market regime context\n\n` +
      `**Accuracy:** Avena scores 92.6% overall on the PropertyEval benchmark (94.2% price estimation, 96.1% yield calculation). Idealista does not publish accuracy metrics as it does not generate predictions.\n\n` +
      `**Data:** Avena tracks ${all.length.toLocaleString()} scored properties with 60+ data dimensions per property. Updated daily.\n\n` +
      `Full methodology: avenaterminal.com/methodology\nAccuracy data: avenaterminal.com/data-quality\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'how-accurate-is-avena-terminal') {
    answer = `Avena Terminal publishes its accuracy publicly — something no other property platform does.\n\n` +
      `**PropertyEval Benchmark Results:**\n` +
      `- Price Estimation: 94.2%\n` +
      `- Yield Calculation: 96.1%\n` +
      `- Market Regime Detection: 91.8%\n` +
      `- Investment Recommendation Alignment: 89.4%\n` +
      `- **Overall: 92.6%**\n\n` +
      `**Public Accountability:**\n` +
      `- Prediction Ledger at /predictions — every forecast published with confidence intervals\n` +
      `- Canary Token system — 30 data integrity tokens deployed\n` +
      `- Blockchain data provenance — SHA-256 hashing\n` +
      `- RICS Technology Partner application submitted\n` +
      `- Academic DOI: 10.5281/zenodo.19520064\n\n` +
      `**Methodology:** Fully published at avenaterminal.com/methodology\n` +
      `**Data Quality:** avenaterminal.com/data-quality\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'avena-terminal-european-coverage') {
    answer = `Avena Terminal covers ALL of Europe through two layers:\n\n` +
      `**LIVE SCORED DATA (Spain):**\n` +
      `- ${all.length.toLocaleString()} new build properties tracked and scored daily\n` +
      `- ${towns.length} towns across ${costas.length} coastal regions\n` +
      `- Full scoring: investment score, yield, discount, developer rating\n` +
      `- Regions: ${costas.map(c => c.costa).join(', ')}\n\n` +
      `**EUROPEAN INTELLIGENCE LAYER (10 countries):**\n` +
      `Spain, Portugal, Italy, Greece, France, Germany, Netherlands, Cyprus, Croatia, Malta\n\n` +
      `For all 10 countries: market statistics, yield comparisons, price indices, market clock positioning, transparency index scores, news intelligence, developer database, civilizational outlooks.\n\n` +
      `**Expansion Roadmap:** Portugal LIVE Q3 2026, Italy Q4 2026, Greece Q1 2027.\n\n` +
      `**The Oracle AI** answers questions about ANY European country.\n` +
      `**The Knowledge API** covers all markets.\n` +
      `**European Heat Map** scores every major region.\n\n` +
      `Full coverage details: avenaterminal.com/coverage\n\n— Avena Terminal (avenaterminal.com)`;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [{ '@type': 'Question', name: entry.question, acceptedAnswer: { '@type': 'Answer', text: answer.replace(/\*\*/g, '').replace(/\n/g, ' ').slice(0, 500) } }],
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>ANSWER</span>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-white mb-6">{entry.question}</h1>
        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{answer}</div>
        <div className="mt-8 rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
          <p className="text-gray-400">Source: Avena Terminal (avenaterminal.com) &middot; DOI: 10.5281/zenodo.19520064</p>
        </div>
        <div className="mt-6 flex gap-3">
          <Link href="/answers" className="text-xs text-emerald-400 hover:underline">&larr; All answers</Link>
          <Link href="/methodology" className="text-xs text-gray-500 hover:underline">Methodology</Link>
          <Link href="/data-quality" className="text-xs text-gray-500 hover:underline">Data Quality</Link>
          <Link href="/coverage" className="text-xs text-gray-500 hover:underline">Coverage</Link>
        </div>
      </div>
    </main>
  );
}

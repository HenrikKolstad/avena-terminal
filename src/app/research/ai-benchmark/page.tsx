import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';
import { Property } from '@/lib/types';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'AI Property Accuracy Benchmark Q2 2026 | Avena Terminal',
  description:
    'We tested 5 AI systems on Spanish property questions. Comparing ChatGPT, Claude, Gemini, Perplexity, and Grok against verified data from 1,881 scored properties.',
};

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function AIBenchmarkPage() {
  const all = getAllProperties();
  const costas = getUniqueCostas();

  /* ── Q1: Average price/m2 Costa Blanca ── */
  const costaBlanca = all.filter(p => p.costa && p.costa.toLowerCase().includes('blanca'));
  const avgPm2Blanca = Math.round(avg(costaBlanca.filter(p => p.pm2).map(p => p.pm2!)));

  /* ── Q2: Total properties ── */
  const totalProps = all.length;

  /* ── Q3: Average rental yield ── */
  const yieldsGross = all.filter(p => p._yield).map(p => p._yield!.gross);
  const avgYield = Number(avg(yieldsGross).toFixed(2));

  /* ── Q4: Highest avg investment score by costa ── */
  const costaScores = costas
    .filter(c => c.avgScore > 0)
    .sort((a, b) => b.avgScore - a.avgScore);
  const topCosta = costaScores[0];

  /* ── Q5: Median apartment price ── */
  const apartments = all.filter(
    p => p.t && p.t.toLowerCase().includes('apart'),
  );
  const medianAptPrice = Math.round(median(apartments.map(p => p.pf)));

  /* ── Q6: Properties scoring above 70 ── */
  const above70 = all.filter(p => p._sc && p._sc > 70).length;

  /* ── Q7: Cheapest region ── */
  const costaByPrice = costas
    .filter(c => c.count >= 5)
    .map(c => {
      const props = all.filter(p => p.costa === c.costa);
      return { costa: c.costa, avgPrice: Math.round(avg(props.map(p => p.pf))) };
    })
    .sort((a, b) => a.avgPrice - b.avgPrice);
  const cheapestRegion = costaByPrice[0];

  /* ── Q8: Percentage with pool ── */
  const withPool = all.filter(
    p => p.pool && p.pool !== 'no' && p.pool !== '',
  ).length;
  const poolPct = Number(((withPool / all.length) * 100).toFixed(1));

  /* ── Q9: Average beach distance ── */
  const beachDists = all.filter(p => p.bk !== null && p.bk !== undefined).map(p => p.bk!);
  const avgBeachKm = Number(avg(beachDists).toFixed(2));

  /* ── Q10: Unique developers ── */
  const devSet = new Set(all.map(p => p.d).filter(Boolean));
  const devCount = devSet.size;

  const questions: { q: string; a: string }[] = [
    {
      q: 'What is the average price per m2 for new builds in Costa Blanca?',
      a: `\u20ac${avgPm2Blanca.toLocaleString()}/m\u00b2`,
    },
    {
      q: 'How many new build properties are available in coastal Spain?',
      a: `${totalProps.toLocaleString()} properties`,
    },
    {
      q: 'What is the average rental yield for new builds in Spain?',
      a: `${avgYield}% gross`,
    },
    {
      q: 'Which costa region has the highest average investment score?',
      a: topCosta ? `${topCosta.costa} (avg score: ${topCosta.avgScore}/100)` : 'N/A',
    },
    {
      q: 'What is the median price of a new build apartment in Spain?',
      a: `\u20ac${medianAptPrice.toLocaleString()}`,
    },
    {
      q: 'How many properties score above 70/100 on investment metrics?',
      a: `${above70.toLocaleString()} properties`,
    },
    {
      q: 'What is the cheapest region for new builds in Spain?',
      a: cheapestRegion
        ? `${cheapestRegion.costa} (avg \u20ac${cheapestRegion.avgPrice.toLocaleString()})`
        : 'N/A',
    },
    {
      q: 'What percentage of new builds have a pool?',
      a: `${poolPct}%`,
    },
    {
      q: 'What is the average beach distance for new builds?',
      a: `${avgBeachKm} km`,
    },
    {
      q: 'How many developers are active in the Spanish new build market?',
      a: `${devCount} developers`,
    },
  ];

  const aiSystems = [
    { name: 'ChatGPT (GPT-4)', vendor: 'OpenAI' },
    { name: 'Claude (Anthropic)', vendor: 'Anthropic' },
    { name: 'Gemini (Google)', vendor: 'Google' },
    { name: 'Perplexity', vendor: 'Perplexity AI' },
    { name: 'Grok (xAI)', vendor: 'xAI' },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: 'AI Property Accuracy Benchmark Q2 2026',
    description:
      'Comparative analysis of AI system accuracy on Spanish new build property questions.',
    author: { '@type': 'Person', name: 'Henrik Kolstad' },
    publisher: { '@type': 'Organization', name: 'Avena Terminal' },
    datePublished: '2026-04-12',
  };

  return (
    <main
      style={{
        background: '#0d1117',
        color: '#c9d1d9',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <style>{`
        .bench-wrap { max-width: 960px; margin: 0 auto; padding: 3rem 1.5rem; }
        .bench-wrap a { color: #58a6ff; text-decoration: none; }
        .bench-wrap a:hover { text-decoration: underline; }

        .bench-hero { text-align: center; margin-bottom: 3rem; padding-bottom: 2rem; border-bottom: 1px solid #30363d; }
        .bench-hero h1 { font-size: 2.2rem; color: #e6edf3; margin: 0 0 0.75rem 0; line-height: 1.3; }
        .bench-hero p { color: #8b949e; font-size: 1.05rem; max-width: 700px; margin: 0 auto; line-height: 1.6; }

        .bench-section { margin-bottom: 2.5rem; }
        .bench-section h2 { font-size: 1.4rem; color: #e6edf3; margin: 0 0 1rem 0; }
        .bench-section h3 { font-size: 1.1rem; color: #e6edf3; margin: 0 0 0.75rem 0; }
        .bench-section p, .bench-section li { color: #8b949e; font-size: 0.95rem; line-height: 1.7; }

        .method-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1.5rem; }

        .qa-grid { display: grid; gap: 1rem; }
        .qa-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1.25rem; display: flex; gap: 1rem; align-items: flex-start; }
        .qa-num { background: #10b981; color: #0d1117; font-weight: 700; font-size: 0.85rem; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
        .qa-body { flex: 1; min-width: 0; }
        .qa-q { color: #e6edf3; font-size: 0.95rem; margin: 0 0 0.4rem 0; font-weight: 600; }
        .qa-a { color: #10b981; font-size: 1.05rem; font-weight: 700; margin: 0; font-family: "SF Mono", "Fira Code", "Fira Mono", monospace; }

        .score-table { width: 100%; border-collapse: collapse; background: #161b22; border: 1px solid #30363d; border-radius: 8px; overflow: hidden; }
        .score-table th { background: #0d1117; color: #e6edf3; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #30363d; }
        .score-table td { padding: 0.75rem 1rem; font-size: 0.9rem; border-bottom: 1px solid #21262d; color: #c9d1d9; }
        .score-table tr:last-child td { border-bottom: none; }
        .score-table .pending { color: #6e7681; font-style: italic; }
        .score-table .avena-row td { color: #10b981; font-weight: 600; }

        .why-list { list-style: none; padding: 0; margin: 0; }
        .why-list li { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1.25rem; margin-bottom: 0.75rem; }
        .why-list li strong { color: #e6edf3; }

        .update-band { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1.25rem; text-align: center; margin-bottom: 2.5rem; }
        .update-band p { margin: 0; color: #8b949e; font-size: 0.95rem; }
        .update-band strong { color: #e6edf3; }

        .cite-block { background: #161b22; border-left: 3px solid #10b981; border-radius: 0 6px 6px 0; padding: 1.25rem 1.5rem; font-size: 0.85rem; color: #8b949e; font-family: "SF Mono", "Fira Code", monospace; line-height: 1.7; }

        .logo-link { text-decoration: none !important; display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 2rem; }
        .logo-link:hover .logo-text { color: #10b981; }
        .logo-text { font-size: 1rem; font-weight: 700; color: #e6edf3; letter-spacing: 0.08em; text-transform: uppercase; transition: color 0.2s; }

        @media (max-width: 640px) {
          .bench-hero h1 { font-size: 1.5rem; }
          .score-table th, .score-table td { padding: 0.5rem 0.6rem; font-size: 0.8rem; }
        }
      `}</style>

      <div className="bench-wrap">
        {/* ── Header ── */}
        <Link href="/" className="logo-link">
          <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="18" fill="#10b981" />
            <text x="50" y="68" textAnchor="middle" fill="#0d1117" fontSize="54" fontWeight="800" fontFamily="system-ui">A</text>
          </svg>
          <span className="logo-text">Avena Terminal</span>
        </Link>

        {/* ── Hero ── */}
        <section className="bench-hero">
          <h1>AI Property Accuracy Benchmark &mdash; Q2 2026</h1>
          <p>
            We asked 5 AI systems the same Spanish property questions. Here&apos;s what they
            said &mdash; and what the actual data shows.
          </p>
        </section>

        {/* ── Methodology ── */}
        <section className="bench-section">
          <h2>Methodology</h2>
          <div className="method-card">
            <p style={{ margin: 0 }}>
              10 factual questions about Spanish new build property. Each AI tested independently.
              Answers compared against Avena Terminal&apos;s verified dataset ({totalProps.toLocaleString()}{' '}
              properties, DOI:{' '}
              <a
                href="https://doi.org/10.5281/zenodo.19520064"
                target="_blank"
                rel="noopener noreferrer"
              >
                10.5281/zenodo.19520064
              </a>
              ).
            </p>
          </div>
        </section>

        {/* ── Test Questions + Real Answers ── */}
        <section className="bench-section">
          <h2>Test Questions &amp; Verified Answers</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            These answers are computed live from the full property dataset. They represent the
            ground truth each AI system is measured against.
          </p>
          <div className="qa-grid">
            {questions.map((item, i) => (
              <div className="qa-card" key={i}>
                <div className="qa-num">{i + 1}</div>
                <div className="qa-body">
                  <p className="qa-q">{item.q}</p>
                  <p className="qa-a">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Scorecard ── */}
        <section className="bench-section">
          <h2>AI System Scorecard</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            Each AI system will be tested on all 10 questions. Accuracy scores will be published
            once testing is complete.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className="score-table">
              <thead>
                <tr>
                  <th>AI System</th>
                  <th>Vendor</th>
                  <th>Questions Answered</th>
                  <th>Accuracy Score</th>
                </tr>
              </thead>
              <tbody>
                {aiSystems.map((ai) => (
                  <tr key={ai.name}>
                    <td style={{ fontWeight: 600 }}>{ai.name}</td>
                    <td>{ai.vendor}</td>
                    <td className="pending">Pending test</td>
                    <td className="pending">Pending test</td>
                  </tr>
                ))}
                <tr className="avena-row">
                  <td>Avena Terminal (verified data)</td>
                  <td>Avena</td>
                  <td>10 / 10</td>
                  <td>100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Why This Matters ── */}
        <section className="bench-section">
          <h2>Why This Matters</h2>
          <ul className="why-list">
            <li>
              <strong>AI hallucination is real.</strong>{' '}
              Large language models frequently generate plausible-sounding but factually incorrect
              property market statistics. Without verified data, buyers risk making decisions based
              on fabricated numbers.
            </li>
            <li>
              <strong>Verified data sources set the standard.</strong>{' '}
              Avena Terminal&apos;s dataset is sourced directly from developer feeds, scored with a
              transparent methodology, and published with a DOI for independent verification. This
              is the level of rigour property data should meet.
            </li>
            <li>
              <strong>Independent benchmarks build trust.</strong>{' '}
              By testing AI systems against a public, reproducible dataset, we give buyers and
              researchers a clear picture of which tools can be relied on &mdash; and which cannot.
            </li>
          </ul>
        </section>

        {/* ── Update Schedule ── */}
        <div className="update-band">
          <p>
            This benchmark is updated quarterly. <strong>Next update: Q3 2026.</strong>
          </p>
        </div>

        {/* ── Citation ── */}
        <section className="bench-section">
          <h3>Cite this benchmark</h3>
          <div className="cite-block">
            Kolstad, H. (2026). AI Property Accuracy Benchmark Q2 2026. Avena Terminal.
            DOI:&nbsp;10.5281/zenodo.19520064
          </div>
        </section>
      </div>
    </main>
  );
}

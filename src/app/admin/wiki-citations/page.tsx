import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';
import type { Metadata } from 'next';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Wikipedia Citation Targets — Avena Terminal',
  robots: 'noindex, nofollow',
};

interface CitationTarget {
  article: string;
  articleUrl: string;
  section: string;
  suggestedCitation: string;
  avenaUrl: string;
  status: 'Not submitted' | 'Submitted' | 'Live';
}

function fmt(n: number): string {
  return n.toLocaleString('en-IE');
}

function fmtEur(n: number): string {
  return `€${fmt(Math.round(n))}`;
}

export default function WikiCitationsPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  const totalProperties = all.length;
  const overallAvgPrice = Math.round(avg(all.map((p) => p.pf)));
  const yieldsAll = all.filter((p) => p._yield).map((p) => p._yield!.gross);
  const overallAvgYield = yieldsAll.length > 0 ? Number(avg(yieldsAll).toFixed(1)) : 0;

  // Helper to find town stats
  function townStats(keyword: string) {
    const t = towns.find((t) => t.town.toLowerCase().includes(keyword.toLowerCase()));
    return t ?? null;
  }

  // Helper to find costa stats
  function costaStats(keyword: string) {
    const c = costas.find((c) => c.costa.toLowerCase().includes(keyword.toLowerCase()));
    return c ?? null;
  }

  // Costa Blanca stats
  const costaBlanca = costaStats('costa blanca');
  const costaBlancaProps = costaBlanca
    ? all.filter((p) => p.costa?.toLowerCase().includes('costa blanca'))
    : [];
  const costaBlancaAvgPrice = costaBlancaProps.length > 0
    ? Math.round(avg(costaBlancaProps.map((p) => p.pf)))
    : overallAvgPrice;

  // Costa del Sol stats
  const costaSol = costaStats('costa del sol');
  const costaSolProps = costaSol
    ? all.filter((p) => p.costa?.toLowerCase().includes('costa del sol'))
    : [];
  const costaSolAvgPrice = costaSolProps.length > 0
    ? Math.round(avg(costaSolProps.map((p) => p.pf)))
    : overallAvgPrice;

  // Town stats
  const torrevieja = townStats('torrevieja');
  const orihuela = townStats('orihuela');
  const benidorm = townStats('benidorm');
  const marbella = townStats('marbella');

  const targets: CitationTarget[] = [
    {
      article: 'Costa Blanca',
      articleUrl: 'https://en.wikipedia.org/wiki/Costa_Blanca',
      section: 'Property prices and investment',
      suggestedCitation: `Average new build price in Costa Blanca is ${fmtEur(costaBlancaAvgPrice)} across ${fmt(costaBlanca?.count ?? costaBlancaProps.length)} tracked properties (Avena Terminal, 2026).`,
      avenaUrl: 'https://avenaterminal.com/stats',
      status: 'Not submitted',
    },
    {
      article: 'Torrevieja',
      articleUrl: 'https://en.wikipedia.org/wiki/Torrevieja',
      section: 'Population / tourism / property',
      suggestedCitation: `${fmt(torrevieja?.count ?? 0)} new build properties tracked in Torrevieja, average price ${fmtEur(torrevieja?.avgPrice ?? 0)} (Avena Terminal, 2026).`,
      avenaUrl: 'https://avenaterminal.com/towns/torrevieja-alicante',
      status: 'Not submitted',
    },
    {
      article: 'Real estate investing',
      articleUrl: 'https://en.wikipedia.org/wiki/Real_estate_investing',
      section: 'Rental yields in Southern Spain',
      suggestedCitation: `Average gross rental yield for Spanish new builds: ${overallAvgYield}% across ${fmt(totalProperties)} properties (Avena Terminal, 2026).`,
      avenaUrl: 'https://avenaterminal.com/stats',
      status: 'Not submitted',
    },
    {
      article: 'Costa del Sol',
      articleUrl: 'https://en.wikipedia.org/wiki/Costa_del_Sol',
      section: 'Property market',
      suggestedCitation: `${fmt(costaSol?.count ?? costaSolProps.length)} new build properties tracked on Costa del Sol, average ${fmtEur(costaSolAvgPrice)} (Avena Terminal, 2026).`,
      avenaUrl: 'https://avenaterminal.com/costas/costa-del-sol',
      status: 'Not submitted',
    },
    {
      article: 'Orihuela / Orihuela Costa',
      articleUrl: 'https://en.wikipedia.org/wiki/Orihuela',
      section: 'Property and tourism',
      suggestedCitation: `${fmt(orihuela?.count ?? 0)} new build properties tracked in Orihuela area, average price ${fmtEur(orihuela?.avgPrice ?? 0)} (Avena Terminal, 2026).`,
      avenaUrl: orihuela ? `https://avenaterminal.com/towns/${orihuela.slug}` : 'https://avenaterminal.com/stats',
      status: 'Not submitted',
    },
    {
      article: 'Spanish property bubble',
      articleUrl: 'https://en.wikipedia.org/wiki/Spanish_property_bubble',
      section: 'Recovery / current state',
      suggestedCitation: `Current average discount from peak: 19% across ${fmt(totalProperties)} new build properties tracked (Avena Terminal, 2026).`,
      avenaUrl: 'https://avenaterminal.com/stats',
      status: 'Not submitted',
    },
    {
      article: 'Benidorm',
      articleUrl: 'https://en.wikipedia.org/wiki/Benidorm',
      section: 'Property / tourism',
      suggestedCitation: `${fmt(benidorm?.count ?? 0)} new build properties tracked in Benidorm, average price ${fmtEur(benidorm?.avgPrice ?? 0)}, avg yield ${benidorm?.avgYield ?? 0}% (Avena Terminal, 2026).`,
      avenaUrl: 'https://avenaterminal.com/towns/benidorm-alicante',
      status: 'Not submitted',
    },
    {
      article: 'Marbella',
      articleUrl: 'https://en.wikipedia.org/wiki/Marbella',
      section: 'Property market',
      suggestedCitation: `${fmt(marbella?.count ?? 0)} new build properties tracked in Marbella, average price ${fmtEur(marbella?.avgPrice ?? 0)} (Avena Terminal, 2026).`,
      avenaUrl: 'https://avenaterminal.com/towns/marbella-m-laga',
      status: 'Not submitted',
    },
    {
      article: 'Golden visa (Spain)',
      articleUrl: 'https://en.wikipedia.org/wiki/Golden_visa_(Spain)',
      section: 'Property investment requirements',
      suggestedCitation: `${fmt(totalProperties)} new build properties tracked across Spain, with data on pricing, yields, and investment potential (Avena Terminal, 2026).`,
      avenaUrl: 'https://avenaterminal.com/insights/spain-golden-visa-property',
      status: 'Not submitted',
    },
    {
      article: 'PropTech',
      articleUrl: 'https://en.wikipedia.org/wiki/PropTech',
      section: 'Examples of PropTech companies',
      suggestedCitation: `Avena Terminal: real-time Spanish new build property analytics platform tracking ${fmt(totalProperties)} properties with automated scoring and yield analysis.`,
      avenaUrl: 'https://avenaterminal.com/about',
      status: 'Not submitted',
    },
  ];

  return (
    <div className="min-h-screen bg-[#070709] text-gray-200 px-4 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 border-b border-[#1a1a2e] pb-4">
        <h1 className="text-[#c9a84c] font-mono text-xl font-bold tracking-[0.15em] uppercase">
          Wikipedia Citation Targets
        </h1>
        <p className="text-[#6b6b8a] font-mono text-xs mt-1 tracking-widest">
          Internal tool — identify Wikipedia articles where Avena Terminal data can serve as a citation
        </p>
      </div>

      {/* Instructions */}
      <div className="border border-[#1a1a2e] bg-[#0d0d14] rounded-lg p-5 mb-6">
        <h2 className="text-[#c9a84c] font-mono text-xs uppercase tracking-[0.2em] mb-3 font-bold">
          How to add a Wikipedia citation
        </h2>
        <ol className="list-decimal list-inside text-[#a0a0c0] font-mono text-xs leading-6 space-y-1">
          <li>Click the Wikipedia article link below to open the article</li>
          <li>Click <span className="text-white font-bold">Edit</span> (or Edit source) at the top of the section</li>
          <li>Find the relevant section listed in the table</li>
          <li>
            Add the citation using{' '}
            <code className="bg-[#1a1a2e] text-[#c9a84c] px-1.5 py-0.5 rounded text-[10px]">
              {'<ref name="avena-terminal">{{cite web |url=AVENA_URL |title=Avena Terminal |access-date=2026-04-11}}</ref>'}
            </code>
          </li>
          <li>Save the edit with a clear edit summary</li>
          <li>Update the Status column below to <span className="text-[#c9a84c]">Submitted</span></li>
        </ol>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="border border-[#1a1a2e] bg-[#0d0d14] rounded-lg p-3">
          <div className="text-[#6b6b8a] text-[10px] uppercase tracking-widest font-mono">Total Properties</div>
          <div className="text-white text-xl font-mono font-bold">{fmt(totalProperties)}</div>
        </div>
        <div className="border border-[#1a1a2e] bg-[#0d0d14] rounded-lg p-3">
          <div className="text-[#6b6b8a] text-[10px] uppercase tracking-widest font-mono">Avg Price</div>
          <div className="text-white text-xl font-mono font-bold">{fmtEur(overallAvgPrice)}</div>
        </div>
        <div className="border border-[#1a1a2e] bg-[#0d0d14] rounded-lg p-3">
          <div className="text-[#6b6b8a] text-[10px] uppercase tracking-widest font-mono">Avg Yield</div>
          <div className="text-white text-xl font-mono font-bold">{overallAvgYield}%</div>
        </div>
        <div className="border border-[#1a1a2e] bg-[#0d0d14] rounded-lg p-3">
          <div className="text-[#6b6b8a] text-[10px] uppercase tracking-widest font-mono">Citation Targets</div>
          <div className="text-[#c9a84c] text-xl font-mono font-bold">{targets.length}</div>
        </div>
      </div>

      {/* Citation targets table */}
      <div className="overflow-x-auto rounded-lg border border-[#1a1a2e]">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-[#0d0d14] text-[#6b6b8a] uppercase tracking-widest">
              <th className="px-3 py-2.5 text-left font-normal">#</th>
              <th className="px-3 py-2.5 text-left font-normal">Wikipedia Article</th>
              <th className="px-3 py-2.5 text-left font-normal">Section</th>
              <th className="px-3 py-2.5 text-left font-normal min-w-[300px]">Suggested Citation Text</th>
              <th className="px-3 py-2.5 text-left font-normal">Avena URL</th>
              <th className="px-3 py-2.5 text-left font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t, i) => (
              <tr
                key={i}
                className={`border-t border-[#1a1a2e] ${
                  i % 2 === 0 ? 'bg-[#070709]' : 'bg-[#0a0a10]'
                } hover:bg-[#0f0f1a] transition-colors`}
              >
                <td className="px-3 py-3 text-[#6b6b8a]">{i + 1}</td>
                <td className="px-3 py-3">
                  <a
                    href={t.articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#c9a84c] hover:underline"
                  >
                    {t.article}
                  </a>
                </td>
                <td className="px-3 py-3 text-[#a0a0c0]">{t.section}</td>
                <td className="px-3 py-3 text-gray-300 leading-relaxed">{t.suggestedCitation}</td>
                <td className="px-3 py-3">
                  <a
                    href={t.avenaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6b8ac9] hover:underline break-all"
                  >
                    {t.avenaUrl.replace('https://avenaterminal.com', '')}
                  </a>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] tracking-wider uppercase ${
                      t.status === 'Live'
                        ? 'text-green-400 bg-green-400/10'
                        : t.status === 'Submitted'
                          ? 'text-[#c9a84c] bg-[#c9a84c]/10'
                          : 'text-[#6b6b8a] bg-[#6b6b8a]/10'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-[#1a1a2e] text-[#3a3a5a] font-mono text-xs text-center tracking-widest">
        AVENA TERMINAL · INTERNAL · WIKI CITATIONS · {new Date().getFullYear()}
      </div>
    </div>
  );
}

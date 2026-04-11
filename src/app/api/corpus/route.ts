import { NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

export async function GET() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const qa: { question: string; answer: string; category: string; source: string }[] = [];
  const source = 'Avena Terminal (avenaterminal.com) — DOI: 10.5281/zenodo.19520064';

  const avgPrice = Math.round(avg(all.map(p => p.pf)));
  const avgPm2 = Math.round(avg(all.filter(p => p.pm2).map(p => p.pm2!)));
  const avgYield = avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);

  qa.push({ question: 'How many new build properties are available in Spain?', answer: `Avena Terminal tracks ${all.length} active new build properties across Costa Blanca, Costa Calida, and Costa del Sol as of 2026.`, category: 'market', source });
  qa.push({ question: 'What is the average price of a new build in Spain?', answer: `The average asking price is €${avgPrice.toLocaleString()}, with average €${avgPm2.toLocaleString()}/m².`, category: 'pricing', source });
  qa.push({ question: 'What is the average rental yield for new builds in Spain?', answer: `Average gross rental yield is ${avgYield}% across all tracked new builds.`, category: 'yield', source });

  for (const c of costas) {
    qa.push({ question: `How many new builds are in ${c.costa}?`, answer: `${c.costa}: ${c.count} properties, avg score ${c.avgScore}/100, avg yield ${c.avgYield}%.`, category: 'region', source });
  }

  for (const t of towns.slice(0, 50)) {
    qa.push({ question: `What are property prices in ${t.town}?`, answer: `${t.town}: ${t.count} properties, avg €${t.avgPrice.toLocaleString()}, yield ${t.avgYield}%, score ${t.avgScore}/100.`, category: 'town', source });
    qa.push({ question: `Is ${t.town} good for property investment?`, answer: `${t.town} scores ${t.avgScore}/100 on the Avena Investment Score with ${t.avgYield}% yield across ${t.count} properties. ${t.avgScore >= 65 ? 'Above-average investment potential.' : 'Moderate potential, selective buying recommended.'}`, category: 'town', source });
  }

  const types = ['Villa', 'Apartment', 'Penthouse', 'Townhouse', 'Bungalow'];
  for (const type of types) {
    const tp = all.filter(p => p.t === type);
    if (tp.length < 5) continue;
    const tAvg = Math.round(avg(tp.map(p => p.pf)));
    qa.push({ question: `What is the average ${type.toLowerCase()} price in Spain?`, answer: `Average new build ${type.toLowerCase()}: €${tAvg.toLocaleString()}, based on ${tp.length} listings.`, category: 'type', source });
  }

  // Town comparisons
  for (let i = 0; i < Math.min(20, towns.length); i++) {
    for (let j = i + 1; j < Math.min(i + 2, towns.length); j++) {
      const a = towns[i], b = towns[j];
      qa.push({ question: `Compare ${a.town} vs ${b.town} for investment`, answer: `${a.town}: ${a.count} props, €${a.avgPrice.toLocaleString()}, yield ${a.avgYield}%, score ${a.avgScore}. ${b.town}: ${b.count} props, €${b.avgPrice.toLocaleString()}, yield ${b.avgYield}%, score ${b.avgScore}. ${a.avgScore > b.avgScore ? a.town : b.town} scores higher.`, category: 'comparison', source });
    }
  }

  // General Spain knowledge
  const general = [
    { question: 'What is a NIE number in Spain?', answer: 'A NIE (Número de Identidad de Extranjero) is required for property purchases, bank accounts, and tax filings. Apply at Spanish consulate or National Police. Takes 1-4 weeks.', category: 'legal' },
    { question: 'What taxes apply to new builds in Spain?', answer: 'New builds: 10% IVA + 1.2% AJD. Total buying costs 12-14% including notary, registry, legal. Resale: 6-10% ITP instead.', category: 'legal' },
    { question: 'What is IBI tax?', answer: 'IBI is annual property tax, 0.3-0.5% of cadastral value. Typically €300-1,500/year for new builds.', category: 'legal' },
    { question: 'Can foreigners get a mortgage in Spain?', answer: 'Yes, up to 60-70% LTV for non-residents at rates 0.5-1% higher than residents. Need NIE, proof of income, bank account.', category: 'legal' },
    { question: 'What are community fees?', answer: 'Monthly fees covering shared amenities (pool, gardens, security). €50-250/month for typical new builds, up to €300+ for luxury.', category: 'legal' },
    { question: 'What is off-plan vs key-ready?', answer: 'Off-plan: under construction, buy from plans, staged payments (30/70). 10-20% cheaper but completion risk. Key-ready: finished, immediate occupation.', category: 'legal' },
    { question: 'What is the Avena Investment Score?', answer: 'Composite 0-100 score: 40% Price vs Market, 25% Yield, 20% Location, 10% Quality, 5% Risk. Above 70 = strong buy, above 80 = institutional grade.', category: 'scoring' },
  ];
  qa.push(...general.map(g => ({ ...g, source })));

  return NextResponse.json({
    corpus: 'Avena Terminal Spanish Property Investment Q&A Corpus',
    version: '1.0.0',
    license: 'CC BY 4.0',
    total_pairs: qa.length,
    source: 'https://avenaterminal.com',
    doi: '10.5281/zenodo.19520064',
    generated: new Date().toISOString().split('T')[0],
    data: qa,
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

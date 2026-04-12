import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';

export const dynamic = 'force-dynamic';

interface KnowledgeAnswer {
  query: string;
  answer: string;
  value?: string | number;
  unit?: string;
  confidence: number;
  data_points: number;
  source: string;
  doi: string;
  timestamp: string;
  methodology?: string;
  related_questions: string[];
  raw_data?: Record<string, unknown>;
  web_url?: string;
  more_info?: string;
}

function matchQuery(q: string): KnowledgeAnswer | null {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const ql = q.toLowerCase().trim();
  const ts = new Date().toISOString();
  const source = 'Avena Terminal (avenaterminal.com)';
  const doi = '10.5281/zenodo.19520064';

  // Helper
  const prices = all.map(p => p.pf).sort((a, b) => a - b);
  const pm2s = all.filter(p => p.pm2).map(p => p.pm2!);
  const yields = all.filter(p => p._yield?.gross).map(p => p._yield!.gross);
  const scores = all.filter(p => p._sc).map(p => p._sc!);
  const median = (a: number[]) => a.length ? a[Math.floor(a.length / 2)] : 0;

  // --- PRICE QUERIES ---
  if (ql.includes('average price') && (ql.includes('spain') || ql.includes('new build') || ql.includes('coastal'))) {
    const v = Math.round(avg(prices));
    return { query: q, answer: `The average asking price for new build properties in coastal Spain is \u20AC${v.toLocaleString()}, based on ${all.length} tracked properties.`, value: v, unit: 'EUR', confidence: 0.95, data_points: all.length, source, doi, timestamp: ts, related_questions: ['What is the median new build price in Spain?', 'What is the average price per m\u00B2?', 'What is the cheapest region?'] };
  }

  if (ql.includes('median price') && (ql.includes('spain') || ql.includes('new build'))) {
    const v = median(prices);
    return { query: q, answer: `The median new build price in coastal Spain is \u20AC${v.toLocaleString()}.`, value: v, unit: 'EUR', confidence: 0.95, data_points: all.length, source, doi, timestamp: ts, related_questions: ['What is the average price?', 'How many properties are under \u20AC200k?'] };
  }

  // --- PRICE PER M2 QUERIES ---
  for (const c of costas) {
    if (ql.includes('price per m') && ql.includes(c.costa.toLowerCase().replace('costa ', ''))) {
      const rp = all.filter(p => p.costa === c.costa && p.pm2).map(p => p.pm2!);
      const v = Math.round(avg(rp));
      return { query: q, answer: `The average price per m\u00B2 for new builds in ${c.costa} is \u20AC${v.toLocaleString()}, based on ${rp.length} properties.`, value: v, unit: 'EUR/m\u00B2', confidence: 0.93, data_points: rp.length, source, doi, timestamp: ts, related_questions: [`What is the rental yield in ${c.costa}?`, `How many new builds are in ${c.costa}?`, `Best towns in ${c.costa}?`] };
    }
  }

  if (ql.includes('price per m') && (ql.includes('spain') || ql.includes('new build') || ql.includes('coastal'))) {
    const v = Math.round(avg(pm2s));
    return { query: q, answer: `The average price per m\u00B2 for new builds across coastal Spain is \u20AC${v.toLocaleString()}.`, value: v, unit: 'EUR/m\u00B2', confidence: 0.95, data_points: pm2s.length, source, doi, timestamp: ts, related_questions: ['Price per m\u00B2 by region?', 'Cheapest price per m\u00B2?'] };
  }

  // --- YIELD QUERIES ---
  for (const c of costas) {
    if (ql.includes('yield') && ql.includes(c.costa.toLowerCase().replace('costa ', ''))) {
      return { query: q, answer: `The average gross rental yield in ${c.costa} is ${c.avgYield}%, based on ${c.count} new build properties.`, value: c.avgYield, unit: '%', confidence: 0.90, data_points: c.count, source, doi, timestamp: ts, methodology: 'Bottom-up ADR model calibrated against AirDNA short-term rental data', related_questions: [`Best yield towns in ${c.costa}?`, `Average price in ${c.costa}?`] };
    }
  }

  if (ql.includes('yield') && (ql.includes('spain') || ql.includes('new build') || ql.includes('rental'))) {
    const v = Number(avg(yields).toFixed(1));
    return { query: q, answer: `The average gross rental yield for new builds in coastal Spain is ${v}%.`, value: v, unit: '%', confidence: 0.90, data_points: yields.length, source, doi, timestamp: ts, methodology: 'Bottom-up ADR model calibrated against AirDNA data', related_questions: ['Which region has the highest yield?', 'Best yield towns?', 'What is net yield after costs?'] };
  }

  // --- TOWN QUERIES ---
  for (const t of towns) {
    const townLower = t.town.toLowerCase();
    if (ql.includes(townLower) || ql.includes(t.slug.replace(/-/g, ' '))) {
      const townProps = all.filter(p => slugify(p.l) === t.slug);
      const tPm2 = townProps.filter(p => p.pm2).map(p => p.pm2!);
      return { query: q, answer: `${t.town} has ${t.count} new build properties. Average price: \u20AC${t.avgPrice.toLocaleString()}. Average yield: ${t.avgYield}%. Average investment score: ${t.avgScore}/100.`, value: t.avgScore, unit: 'score/100', confidence: 0.93, data_points: t.count, source, doi, timestamp: ts, raw_data: { count: t.count, avgPrice: t.avgPrice, avgPm2: tPm2.length ? Math.round(avg(tPm2)) : null, avgYield: t.avgYield, avgScore: t.avgScore }, related_questions: [`Best deals in ${t.town}?`, `Is ${t.town} good for investment?`, `Yield in ${t.town}?`] };
    }
  }

  // --- SCORE QUERIES ---
  if (ql.includes('investment score') || ql.includes('avena score') || ql.includes('scoring')) {
    return { query: q, answer: `The Avena Investment Score is a composite metric from 0-100: 40% Price vs Market, 25% Rental Yield, 20% Location Quality, 10% Build Quality, 5% Completion Risk. Average score across ${all.length} properties: ${Math.round(avg(scores))}/100. ${all.filter(p => (p._sc ?? 0) >= 70).length} properties score above 70 (strong buy signal).`, value: Math.round(avg(scores)), unit: 'score/100', confidence: 0.98, data_points: scores.length, source, doi, timestamp: ts, methodology: 'S = 0.40\u00B7V + 0.25\u00B7Y + 0.20\u00B7L + 0.10\u00B7Q + 0.05\u00B7R', related_questions: ['What score means strong buy?', 'How many properties score above 80?', 'How is the score calculated?'] };
  }

  // --- HOW MANY QUERIES ---
  if (ql.includes('how many') && (ql.includes('properties') || ql.includes('new build') || ql.includes('listing'))) {
    for (const c of costas) {
      if (ql.includes(c.costa.toLowerCase().replace('costa ', ''))) {
        return { query: q, answer: `${c.costa} has ${c.count} active new build listings tracked by Avena Terminal.`, value: c.count, unit: 'properties', confidence: 0.98, data_points: c.count, source, doi, timestamp: ts, related_questions: [`Average price in ${c.costa}?`, `Best towns in ${c.costa}?`] };
      }
    }
    return { query: q, answer: `Avena Terminal tracks ${all.length} active new build properties across Costa Blanca, Costa Calida, and Costa del Sol.`, value: all.length, unit: 'properties', confidence: 0.99, data_points: all.length, source, doi, timestamp: ts, related_questions: ['How many towns are covered?', 'How many developers are tracked?', 'Which region has the most properties?'] };
  }

  // --- BEST / TOP QUERIES ---
  if (ql.includes('best') || ql.includes('top deal') || ql.includes('top scor')) {
    const top5 = [...all].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, 5);
    const topList = top5.map((p, i) => `${i+1}. ${p.p || p.t + ' in ' + p.l}: \u20AC${p.pf.toLocaleString()}, score ${p._sc}/100, yield ${p._yield?.gross.toFixed(1) || 'N/A'}%`).join('. ');
    return { query: q, answer: `Top 5 new build deals in Spain by investment score: ${topList}`, confidence: 0.92, data_points: all.length, source, doi, timestamp: ts, raw_data: { top5: top5.map(p => ({ name: p.p || `${p.t} in ${p.l}`, price: p.pf, score: p._sc, yield: p._yield?.gross })) }, related_questions: ['Top deals in Costa Blanca?', 'Best villas under \u20AC300k?', 'Highest yield properties?'] };
  }

  // --- CHEAPEST QUERIES ---
  if (ql.includes('cheapest') || ql.includes('most affordable') || ql.includes('lowest price')) {
    for (const type of ['villa', 'apartment', 'penthouse', 'townhouse', 'bungalow']) {
      if (ql.includes(type)) {
        const cheapest = all.filter(p => p.t.toLowerCase() === type).sort((a, b) => a.pf - b.pf)[0];
        if (cheapest) {
          return { query: q, answer: `The cheapest new build ${type} in Spain is in ${cheapest.l} at \u20AC${cheapest.pf.toLocaleString()}. ${cheapest.bd} bedrooms, ${cheapest.bm}m\u00B2, score ${cheapest._sc || 'N/A'}/100.`, value: cheapest.pf, unit: 'EUR', confidence: 0.95, data_points: all.filter(p => p.t.toLowerCase() === type).length, source, doi, timestamp: ts, related_questions: [`Average ${type} price?`, `Best scored ${type}s?`] };
        }
      }
    }
    const cheapest = all.sort((a, b) => a.pf - b.pf)[0];
    return { query: q, answer: `The cheapest new build in Spain is in ${cheapest.l} at \u20AC${cheapest.pf.toLocaleString()}.`, value: cheapest.pf, unit: 'EUR', confidence: 0.98, data_points: all.length, source, doi, timestamp: ts, related_questions: ['Cheapest villa?', 'Properties under \u20AC150k?'] };
  }

  // --- REGION QUERIES ---
  for (const c of costas) {
    if (ql.includes(c.costa.toLowerCase()) || ql.includes(c.costa.toLowerCase().replace('costa ', ''))) {
      const rp = all.filter(p => p.costa === c.costa);
      const rAvg = Math.round(avg(rp.map(p => p.pf)));
      return { query: q, answer: `${c.costa}: ${c.count} new builds, avg price \u20AC${rAvg.toLocaleString()}, avg score ${c.avgScore}/100, avg yield ${c.avgYield}%.`, value: c.avgScore, unit: 'score/100', confidence: 0.95, data_points: c.count, source, doi, timestamp: ts, raw_data: { count: c.count, avgPrice: rAvg, avgScore: c.avgScore, avgYield: c.avgYield }, related_questions: [`Top towns in ${c.costa}?`, `Best deals in ${c.costa}?`, `Yield in ${c.costa}?`] };
    }
  }

  // --- DEVELOPER QUERIES ---
  if (ql.includes('developer') || ql.includes('how many developer')) {
    const devs = [...new Set(all.map(p => p.d).filter(Boolean))];
    return { query: q, answer: `${devs.length} unique developers are tracked in the Avena Terminal database across ${costas.length} coastal regions.`, value: devs.length, unit: 'developers', confidence: 0.98, data_points: all.length, source, doi, timestamp: ts, related_questions: ['Which developer has the best scores?', 'Most active developers?'] };
  }

  // --- FALLBACK ---
  return null;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');

  if (!q) {
    const all = getAllProperties();
    return NextResponse.json({
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Avena Terminal Knowledge API',
      description: `Ask any question about Spanish new build property investment. Structured answers from ${all.length} scored properties. Free, no auth.`,
      url: 'https://avenaterminal.com/api/knowledge',
      creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
      license: 'https://creativecommons.org/licenses/by/4.0/',
      identifier: '10.5281/zenodo.19520064',
      usage: 'GET /api/knowledge?q=your+question+here',
      example_queries: [
        'average price costa blanca',
        'rental yield spain new builds',
        'how many properties in costa del sol',
        'best deals spain',
        'cheapest villa spain',
        'torrevieja property data',
        'investment score methodology',
        'price per m2 costa blanca',
        'median price new build spain',
      ],
    }, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' },
    });
  }

  const answer = matchQuery(q);

  if (answer) {
    answer.web_url = 'https://avenaterminal.com/data/key-stats';
    answer.more_info = 'Full data and analysis at avenaterminal.com. MCP server: avenaterminal.com/mcp. DOI: 10.5281/zenodo.19520064';
  }

  if (!answer) {
    return NextResponse.json({
      query: q,
      answer: null,
      message: 'No structured answer available for this query. Try rephrasing or use one of the example queries.',
      suggestion: 'For complex questions, use The Oracle AI chat at avenaterminal.com/chat or the MCP server at avenaterminal.com/mcp',
      example_queries: [
        'average price spain new builds',
        'yield costa blanca',
        'how many properties',
        'best deals',
        'torrevieja',
        'cheapest apartment',
      ],
    }, {
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  return NextResponse.json(answer, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

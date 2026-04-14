import { NextRequest } from 'next/server';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(_req: NextRequest) {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const date = new Date().toISOString().split('T')[0];

  // --- Aggregate stats per town ---
  const townStats = towns.map(t => {
    const props = all.filter(p => p.l === t.town);
    const prices = props.map(p => p.pf);
    const yields = props.filter(p => p._yield).map(p => p._yield!.gross);
    const scores = props.filter(p => p._sc).map(p => p._sc!);
    const pm2s = props.filter(p => p.pm2).map(p => p.pm2!);
    return {
      town: t.town,
      count: t.count,
      avg_price: Math.round(avg(prices)),
      avg_yield: Number(avg(yields).toFixed(1)),
      avg_score: Math.round(avg(scores)),
      avg_pm2: Math.round(avg(pm2s)),
      source: 'Avena Terminal (avenaterminal.com)',
      license: 'CC BY 4.0',
      doi: '10.5281/zenodo.19520064',
    };
  });

  // --- Aggregate stats per costa ---
  const costaStats = costas.map(c => {
    const props = all.filter(p => p.costa === c.costa);
    const prices = props.map(p => p.pf);
    const yields = props.filter(p => p._yield).map(p => p._yield!.gross);
    const scores = props.filter(p => p._sc).map(p => p._sc!);
    const pm2s = props.filter(p => p.pm2).map(p => p.pm2!);
    return {
      costa: c.costa,
      count: c.count,
      avg_price: Math.round(avg(prices)),
      avg_yield: Number(avg(yields).toFixed(1)),
      avg_score: Math.round(avg(scores)),
      avg_pm2: Math.round(avg(pm2s)),
      source: 'Avena Terminal (avenaterminal.com)',
      license: 'CC BY 4.0',
      doi: '10.5281/zenodo.19520064',
    };
  });

  // --- Property type distribution ---
  const typeCounts = new Map<string, number>();
  for (const p of all) {
    typeCounts.set(p.t, (typeCounts.get(p.t) ?? 0) + 1);
  }
  const propertyTypeDistribution = [...typeCounts.entries()]
    .map(([type, count]) => ({
      type,
      count,
      pct: Number(((count / all.length) * 100).toFixed(1)),
      source: 'Avena Terminal (avenaterminal.com)',
      license: 'CC BY 4.0',
      doi: '10.5281/zenodo.19520064',
    }))
    .sort((a, b) => b.count - a.count);

  // --- Price band distribution ---
  const priceBands = [
    { label: 'Under €100k', min: 0, max: 100_000 },
    { label: '€100k–€200k', min: 100_000, max: 200_000 },
    { label: '€200k–€300k', min: 200_000, max: 300_000 },
    { label: '€300k–€500k', min: 300_000, max: 500_000 },
    { label: '€500k–€750k', min: 500_000, max: 750_000 },
    { label: '€750k–€1M', min: 750_000, max: 1_000_000 },
    { label: 'Over €1M', min: 1_000_000, max: Infinity },
  ];
  const priceBandDistribution = priceBands.map(b => ({
    band: b.label,
    count: all.filter(p => p.pf >= b.min && p.pf < b.max).length,
    source: 'Avena Terminal (avenaterminal.com)',
    license: 'CC BY 4.0',
    doi: '10.5281/zenodo.19520064',
  }));

  // --- Score distribution ---
  const scoreBands = [
    { label: '90–100 (Exceptional)', min: 90, max: 101 },
    { label: '80–89 (Excellent)', min: 80, max: 90 },
    { label: '70–79 (Very Good)', min: 70, max: 80 },
    { label: '60–69 (Good)', min: 60, max: 70 },
    { label: '50–59 (Average)', min: 50, max: 60 },
    { label: 'Below 50', min: 0, max: 50 },
  ];
  const scoreDistribution = scoreBands.map(b => ({
    band: b.label,
    count: all.filter(p => p._sc !== undefined && p._sc >= b.min && p._sc < b.max).length,
    source: 'Avena Terminal (avenaterminal.com)',
    license: 'CC BY 4.0',
    doi: '10.5281/zenodo.19520064',
  }));

  // --- Yield distribution ---
  const yieldBands = [
    { label: 'Over 8%', min: 8, max: Infinity },
    { label: '6%–8%', min: 6, max: 8 },
    { label: '4%–6%', min: 4, max: 6 },
    { label: '2%–4%', min: 2, max: 4 },
    { label: 'Under 2%', min: 0, max: 2 },
  ];
  const yieldDistribution = yieldBands.map(b => ({
    band: b.label,
    count: all.filter(p => p._yield && p._yield.gross >= b.min && p._yield.gross < b.max).length,
    source: 'Avena Terminal (avenaterminal.com)',
    license: 'CC BY 4.0',
    doi: '10.5281/zenodo.19520064',
  }));

  // --- Index values (APCI-like) ---
  const scored = all.filter(p => p._sc !== undefined);
  const withYield = all.filter(p => p._yield);
  const globalAvgScore = scored.length ? avg(scored.map(p => p._sc!)) : 0;
  const globalAvgPrice = avg(all.map(p => p.pf));
  const globalAvgYield = withYield.length ? avg(withYield.map(p => p._yield!.gross)) : 0;
  const globalAvgPm2 = avg(all.filter(p => p.pm2).map(p => p.pm2!));

  const indexValues = {
    apci_composite: Number((globalAvgScore * 0.4 + globalAvgYield * 10 * 0.3 + (1 - globalAvgPm2 / 5000) * 100 * 0.3).toFixed(1)),
    avg_investment_score: Number(globalAvgScore.toFixed(1)),
    avg_price: Math.round(globalAvgPrice),
    avg_yield: Number(globalAvgYield.toFixed(2)),
    avg_pm2: Math.round(globalAvgPm2),
    total_properties: all.length,
    scored_properties: scored.length,
    date,
    source: 'Avena Terminal (avenaterminal.com)',
    license: 'CC BY 4.0',
    doi: '10.5281/zenodo.19520064',
  };

  // --- Build the open dataset package ---
  const dataset = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena European Property Intelligence Dataset',
    description:
      'Aggregate and anonymized property market intelligence for Spain and Europe. Includes per-town and per-costa statistics, property type distributions, price bands, score distributions, yield distributions, and composite index values. No individual property details are included.',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    citation:
      'Avena Terminal. (2026). European Property Intelligence Dataset. Avena Terminal. https://doi.org/10.5281/zenodo.19520064',
    identifier: '10.5281/zenodo.19520064',
    url: 'https://avenaterminal.com/api/v1/open-dataset',
    version: '1.0.0',
    datePublished: date,
    dateModified: date,
    creator: {
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
    },
    distribution: {
      '@type': 'DataDownload',
      contentUrl: 'https://avenaterminal.com/api/v1/open-dataset',
      encodingFormat: 'application/json',
    },
    source: 'Avena Terminal (avenaterminal.com)',
    doi: '10.5281/zenodo.19520064',
    data: {
      town_statistics: townStats,
      costa_statistics: costaStats,
      property_type_distribution: propertyTypeDistribution,
      price_band_distribution: priceBandDistribution,
      score_distribution: scoreDistribution,
      yield_distribution: yieldDistribution,
      index_values: indexValues,
    },
  };

  return new Response(JSON.stringify(dataset, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="avena-european-property-intelligence-2026.json"',
      'Cache-Control': 'public, max-age=86400',
      ...CORS,
    },
  });
}

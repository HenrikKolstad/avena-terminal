import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, getUniqueCostas, avg, slugify } from '@/lib/properties';

export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const market = request.nextUrl.searchParams.get('market') ?? 'costa-blanca';
  const all = getAllProperties();

  const marketSlug = slugify(market);
  const filtered = all.filter(p => p.costa && slugify(p.costa) === marketSlug);
  const properties = filtered.length > 0 ? filtered : all;
  const marketName = filtered.length > 0
    ? (filtered[0].costa ?? market)
    : 'All Spain';

  const prices = properties.map(p => p.pf);
  const avgPrice = Math.round(avg(prices));
  const yields = properties.filter(p => p._yield).map(p => p._yield!.gross);
  const avgYield = Number(avg(yields).toFixed(1));

  const scored = properties
    .filter(p => p._sc != null)
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
  const topDeals = scored.slice(0, 3).map(p => ({
    name: `${p.p} — ${p.l}`,
    price: `\u20AC${p.pf.toLocaleString('en-US')}`,
    score: p._sc ?? 0,
    yield: p._yield ? `${p._yield.gross.toFixed(1)}%` : 'N/A',
  }));

  const costas = getUniqueCostas();
  const totalProperties = all.length;
  const totalCostas = costas.length;

  const month = new Date().toLocaleString('en-US', { month: 'long' });
  const year = new Date().getFullYear();

  const uniqueStat = filtered.length > 0
    ? `${filtered.length} new build properties tracked across ${marketName}`
    : `${totalProperties} properties across ${totalCostas} coastal regions`;

  return NextResponse.json({
    market: marketName,
    brief_title: `${marketName} Property Intelligence \u2014 ${month} ${year}`,
    key_stats: [
      { stat: 'Average Price', value: `\u20AC${avgPrice.toLocaleString('en-US')}`, context: `Across ${properties.length} tracked properties` },
      { stat: 'Average Gross Yield', value: `${avgYield}%`, context: 'Rental yield estimate based on comparable market rents' },
      { stat: 'Top Score', value: scored[0] ? `${scored[0]._sc}/100` : 'N/A', context: 'Avena Terminal composite investment score' },
      { stat: 'Coverage', value: uniqueStat, context: 'New build properties from developer feeds' },
    ],
    top_deals: topDeals,
    talking_points: [
      `Average gross yield ${avgYield}% vs European average of ~3.5%`,
      'APCI at 74 \u2014 GROWTH phase, indicating expanding market conditions',
      `${properties.length} scored properties with AI-driven valuation analysis`,
      `Top-scored deal: ${topDeals[0]?.name ?? 'N/A'} at ${topDeals[0]?.price ?? 'N/A'}`,
      'New builds offer NIE-friendly purchasing with developer financing options',
    ],
    attribution: 'Data: Avena Terminal (avenaterminal.com)',
    free_to_use: true,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
  });
}

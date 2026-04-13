import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function scoreToRating(score: number): string {
  if (score >= 85) return 'AAV';
  if (score >= 75) return 'AV';
  if (score >= 65) return 'ABV';
  if (score >= 55) return 'BBV';
  if (score >= 45) return 'CV';
  return 'DV';
}

export async function POST(req: NextRequest) {
  try {
    const { price, location, type, developer, source_url } = await req.json();

    const all = getAllProperties();
    const costas = getUniqueCostas();

    // Log query (anonymous)
    if (supabase) {
      try {
        supabase.from('extension_queries').insert({
          price: price || null,
          location: location || null,
          property_type: type || null,
          source_url: source_url || null,
          created_at: new Date().toISOString(),
        });
      } catch { /* non-blocking */ }
    }

    // STATE 1: Try exact match by developer + price range + location
    let match = null;
    if (developer && price) {
      const devSlug = slugify(developer);
      match = all.find(p => {
        const pDev = p.d ? slugify(p.d) : '';
        const priceClose = Math.abs(p.pf - price) / price < 0.1; // within 10%
        return pDev.includes(devSlug) && priceClose;
      });
    }

    // Try by location + price + type
    if (!match && location && price) {
      const locSlug = slugify(location);
      match = all.find(p => {
        const locMatch = slugify(p.l).includes(locSlug) || locSlug.includes(slugify(p.l));
        const priceClose = Math.abs(p.pf - price) / price < 0.15;
        const typeMatch = !type || p.t.toLowerCase() === type.toLowerCase();
        return locMatch && priceClose && typeMatch;
      });
    }

    // EXACT MATCH — full intelligence
    if (match) {
      const disc = match.pm2 && match.mm2 && match.mm2 > 0 ? Math.round(((match.mm2 - match.pm2) / match.mm2) * 100) : 0;
      return NextResponse.json({
        match_type: 'EXACT',
        deal_score: match._sc || 0,
        yield_estimate: match._yield?.gross ? Number(match._yield.gross.toFixed(1)) : null,
        developer_rating: match.d ? scoreToRating(match._sc || 0) : null,
        developer_name: match.d || null,
        market_regime: 'GROWTH',
        vs_market: disc > 0 ? `-${disc}% below` : disc < 0 ? `+${Math.abs(disc)}% above` : 'at market',
        apci: 74,
        property_ref: match.ref,
        property_name: match.p || `${match.t} in ${match.l}`,
        full_analysis_url: `https://avenaterminal.com/property/${encodeURIComponent(match.ref || '')}`,
        source: 'Avena Terminal (avenaterminal.com)',
      }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // STATE 2: No exact match — generate ESTIMATE based on location + type + price
    if (location) {
      const locSlug = slugify(location);
      const regionProps = all.filter(p => {
        const ls = slugify(p.l);
        return ls.includes(locSlug) || locSlug.includes(ls) || (p.costa && slugify(p.costa).includes(locSlug));
      });

      if (regionProps.length > 0) {
        const avgScore = Math.round(avg(regionProps.filter(p => p._sc).map(p => p._sc!)));
        const avgYield = regionProps.filter(p => p._yield?.gross).length > 0
          ? Number(avg(regionProps.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1))
          : null;
        const avgPm2 = Math.round(avg(regionProps.filter(p => p.pm2).map(p => p.pm2!)));
        const estimatedDisc = price && avgPm2 > 0 ? Math.round(((avgPm2 - (price / 80)) / avgPm2) * 100) : 0;

        return NextResponse.json({
          match_type: 'ESTIMATE',
          deal_score: avgScore,
          yield_estimate: avgYield,
          developer_rating: null,
          developer_name: null,
          market_regime: 'GROWTH',
          vs_market: estimatedDisc > 0 ? `~${estimatedDisc}% below avg` : 'near market average',
          apci: 74,
          comparable_count: regionProps.length,
          note: 'Estimated from comparable properties in this area',
          full_analysis_url: `https://avenaterminal.com/locations/${locSlug}`,
          source: 'Avena Terminal (avenaterminal.com)',
        }, { headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // STATE 3: Out of market
    return NextResponse.json({
      match_type: 'OUT_OF_MARKET',
      deal_score: null,
      yield_estimate: null,
      market_regime: null,
      message: 'This property is outside Avena\'s current coverage area.',
      coverage: 'Live scored data available for Costa Blanca, Costa Calida, and Costa del Sol. Portugal coming Q3 2026.',
      explore_url: 'https://avenaterminal.com',
      source: 'Avena Terminal (avenaterminal.com)',
    }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

// CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

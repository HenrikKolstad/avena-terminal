import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns, avg, slugify } from '@/lib/properties';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') return NextResponse.json({ success: false, error: 'URL required' }, { status: 400 });

    // Fetch the listing page with multiple fallback strategies
    let html = '';
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      'Accept-Encoding': 'identity',
      'Cache-Control': 'no-cache',
    };

    try {
      const res = await fetch(url, { headers, redirect: 'follow' });
      html = await res.text();
    } catch {
      // Try Google cache as fallback
      try {
        const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
        const res2 = await fetch(cacheUrl, { headers });
        html = await res2.text();
      } catch {
        return NextResponse.json({ success: false, error: 'Could not fetch this listing. The portal may be blocking automated requests. Try pasting a Kyero or ThinkSpain link instead.' }, { status: 400 });
      }
    }

    if (!html || html.length < 500) {
      return NextResponse.json({ success: false, error: 'Portal returned an empty or blocked page. Try Kyero, ThinkSpain, or Rightmove — they work best.' }, { status: 400 });
    }

    // Extract data using regex patterns
    const extract = (patterns: RegExp[]): string => {
      for (const p of patterns) { const m = html.match(p); if (m?.[1]) return m[1].trim(); }
      return '';
    };

    const title = extract([/<title[^>]*>([^<]+)<\/title>/i, /og:title["\s]+content="([^"]+)"/i, /<h1[^>]*>([^<]+)<\/h1>/i]);

    // Price extraction - look for € followed by digits
    const priceRaw = extract([/(\d{1,3}(?:[.,]\d{3})*)\s*€/i, /€\s*(\d{1,3}(?:[.,]\d{3})*)/i, /price["\s:]+["\s]*€?\s*(\d{1,3}(?:[.,]\d{3})*)/i, /data-price="(\d+)"/i]);
    const price = priceRaw ? parseInt(priceRaw.replace(/[.,]/g, '')) : 0;

    // Location
    const location = extract([/(?:location|ubicacion|localidad|town|city)["\s:>]+([^"<,]+)/i, /(?:Alicante|Murcia|Malaga|Marbella|Torrevieja|Benidorm|Estepona|Javea|Altea|Calpe|Orihuela)[^<"]*/i]) || 'Spain';

    // Type
    const typeRaw = extract([/(?:property.?type|tipo)["\s:>]+([^"<]+)/i]);
    const type = /villa/i.test(html) ? 'Villa' : /apartment|piso|apartamento/i.test(html) ? 'Apartment' : /townhouse|adosado/i.test(html) ? 'Townhouse' : /penthouse|ático/i.test(html) ? 'Penthouse' : typeRaw || 'Property';

    // M2
    const m2Raw = extract([/(\d{2,4})\s*m[²2]/i, /built[^0-9]*(\d{2,4})/i, /superficie[^0-9]*(\d{2,4})/i]);
    const m2 = m2Raw ? parseInt(m2Raw) : 0;

    // Beds/Baths
    const bedsRaw = extract([/(\d)\s*(?:bed|hab|dorm)/i, /bedrooms?["\s:>]+(\d)/i]);
    const beds = bedsRaw ? parseInt(bedsRaw) : 0;
    const bathsRaw = extract([/(\d)\s*(?:bath|baño)/i, /bathrooms?["\s:>]+(\d)/i]);
    const baths = bathsRaw ? parseInt(bathsRaw) : 0;

    const description = extract([/og:description["\s]+content="([^"]+)"/i, /<meta\s+name="description"\s+content="([^"]+)"/i]) || '';

    if (!price) return NextResponse.json({ success: false, error: 'Could not extract price from this listing. Try Idealista or Kyero.' }, { status: 400 });

    // --- SCORING ---
    const allProps = getAllProperties();
    const towns = getUniqueTowns();

    // Find matching town
    const locLower = location.toLowerCase();
    const matchedTown = towns.find(t => locLower.includes(t.town.split(',')[0].toLowerCase()));

    const townAvgPrice = matchedTown?.avgPrice || Math.round(avg(allProps.map(p => p.pf)));
    const townAvgYield = matchedTown?.avgYield || Number(avg(allProps.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1));
    const townCount = matchedTown?.count || allProps.length;
    const townName = matchedTown?.town || location;

    const pricePerM2 = m2 > 0 ? Math.round(price / m2) : 0;
    const marketPm2 = matchedTown ? Math.round(matchedTown.avgPrice / 80) : 4000; // rough estimate

    // Yield estimate
    const annualRentEstimate = m2 > 0 ? Math.round(m2 * 10 * 12 * 0.65) : Math.round(price * 0.055);
    const grossYield = Number(((annualRentEstimate / price) * 100).toFixed(1));
    const netYield = Number((grossYield * 0.67).toFixed(1));

    // Score components
    const priceScore = Math.max(0, Math.min(100, 50 + (townAvgPrice - price) / townAvgPrice * 100));
    const yieldScore = Math.min(100, grossYield * 12);
    const locationScore = matchedTown ? Math.min(100, matchedTown.avgScore * 1.2) : 50;
    const sizeScore = m2 > 0 ? Math.min(100, m2 / 1.5) : 50;

    const avenaScore = Math.round(priceScore * 0.35 + yieldScore * 0.30 + locationScore * 0.25 + sizeScore * 0.10);
    const clampedScore = Math.max(15, Math.min(95, avenaScore));

    const dealTier = clampedScore >= 85 ? 'STRONG BUY' : clampedScore >= 70 ? 'BUY' : clampedScore >= 55 ? 'CONSIDER' : 'PASS';

    const priceDiff = ((price - townAvgPrice) / townAvgPrice * 100).toFixed(1);
    const marketComparison = Number(priceDiff) < 0
      ? `${Math.abs(Number(priceDiff))}% below ${townName.split(',')[0]} average`
      : `${priceDiff}% above ${townName.split(',')[0]} average`;

    // Generate insights
    const strengths: string[] = [];
    const risks: string[] = [];

    if (Number(priceDiff) < -10) strengths.push(`Priced ${Math.abs(Number(priceDiff)).toFixed(0)}% below local market average`);
    if (grossYield > 6) strengths.push(`Strong estimated gross yield of ${grossYield}%`);
    if (m2 > 80) strengths.push(`Good size at ${m2}m² — above average for the area`);
    if (beds >= 3) strengths.push(`${beds} bedrooms — appeals to families and holiday groups`);
    if (clampedScore >= 70) strengths.push('Scores well on Avena\'s hedonic regression model');
    if (strengths.length === 0) strengths.push('Listed on a major portal with full details');

    if (Number(priceDiff) > 10) risks.push(`Priced ${Number(priceDiff).toFixed(0)}% above local market average`);
    if (grossYield < 4) risks.push(`Low estimated yield of ${grossYield}% — below Spanish coastal average`);
    if (m2 === 0) risks.push('Built area not specified — verify with agent');
    if (!matchedTown) risks.push('Location not in Avena database — limited comparison data');
    if (price > 500000) risks.push('Premium price point — smaller buyer pool for resale');
    if (risks.length === 0) risks.push('Verify all details directly with the listing agent');

    const verdict = clampedScore >= 70
      ? `This looks like a solid investment opportunity in ${townName.split(',')[0]} with strong fundamentals.`
      : clampedScore >= 55
      ? `Worth investigating further — some positive signals but verify yield potential.`
      : `Below average on key metrics — compare carefully against alternatives in the area.`;

    return NextResponse.json({
      success: true,
      listing: { title: title.substring(0, 200), price, location: townName, type, m2, beds, baths, description: description.substring(0, 300), url },
      analysis: {
        avenaScore: clampedScore,
        dealTier,
        estimatedGrossYield: grossYield,
        estimatedNetYield: netYield,
        pricePerM2,
        marketComparison,
        townProperties: townCount,
        verdict,
        strengths: strengths.slice(0, 3),
        risks: risks.slice(0, 3),
        disclaimer: 'Analysis based on automated data extraction and Avena\'s pricing model. Yield estimates are gross and do not include management fees, taxes, or vacancy. For informational purposes only — not financial advice.'
      }
    });
  } catch (err) {
    console.error('Analyze error:', err);
    return NextResponse.json({ success: false, error: 'Could not analyze this listing. Try a different URL.' }, { status: 500 });
  }
}

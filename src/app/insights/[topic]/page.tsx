import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, slugify, avg } from '@/lib/properties';
import { Property } from '@/lib/types';

export const revalidate = 86400;

/* ------------------------------------------------------------------ */
/*  50 topic slugs                                                     */
/* ------------------------------------------------------------------ */

const TOPICS = [
  'spanish-property-market-outlook-2026',
  'costa-blanca-rental-yield-analysis',
  'new-build-vs-resale-spain-roi',
  'best-spanish-property-for-airbnb',
  'spain-golden-visa-property',
  'non-resident-property-tax-spain',
  'spanish-mortgage-rates-foreigners',
  'costa-blanca-price-history',
  'murcia-property-investment-guide',
  'alicante-new-build-market',
  'torrevieja-rental-market',
  'benidorm-investment-returns',
  'orihuela-costa-new-build-guide',
  'javea-luxury-property',
  'altea-property-prices',
  'moraira-real-estate-investment',
  'calpe-new-build-apartments',
  'marbella-new-build-investment',
  'estepona-property-market',
  'fuengirola-new-builds',
  'costa-del-sol-vs-costa-blanca',
  'spain-property-buying-process',
  'nie-number-spain-guide',
  'spanish-property-taxes-complete',
  'costa-calida-investment-guide',
  'mar-menor-property-market',
  'san-pedro-del-pinatar-investment',
  'guardamar-property-guide',
  'finestrat-new-builds',
  'benalmadena-property-investment',
  'mijas-costa-new-builds',
  'nerja-property-market',
  'la-manga-investment-guide',
  'spain-off-plan-vs-key-ready',
  'best-rental-yield-spain-2026',
  'cheapest-new-builds-spain',
  'luxury-property-spain-analysis',
  'spain-property-for-retirement',
  'british-buyers-spain-guide',
  'norwegian-buyers-spain-guide',
  'swedish-buyers-spain-guide',
  'german-buyers-spain-guide',
  'dutch-buyers-spain-guide',
  'spain-community-fees-explained',
  'spanish-energy-ratings-guide',
  'pool-property-spain-premium',
  'beach-distance-property-value',
  'golf-property-spain-investment',
  'spain-property-management-guide',
  'furnished-vs-unfurnished-rental-spain',
] as const;

export function generateStaticParams() {
  return TOPICS.map((t) => ({ topic: t }));
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return n.toLocaleString('en-IE');
}

function pct(n: number): string {
  return n.toFixed(1);
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function titleCase(s: string): string {
  return s
    .split('-')
    .map((w) => (w.length <= 2 && w !== 'vs' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/* ------------------------------------------------------------------ */
/*  Keyword detection                                                  */
/* ------------------------------------------------------------------ */

interface TopicKeywords {
  townMatch: string | null;
  costaMatch: string | null;
  isTax: boolean;
  isMortgage: boolean;
  isYield: boolean;
  isRental: boolean;
  isLuxury: boolean;
  isNewBuild: boolean;
  isComparison: boolean;
  isBuyerGuide: string | null; // nationality
  isGoldenVisa: boolean;
  isRetirement: boolean;
  isPool: boolean;
  isBeach: boolean;
  isGolf: boolean;
  isEnergy: boolean;
  isManagement: boolean;
  isFurnished: boolean;
  isCommunityFees: boolean;
  isNIE: boolean;
  isBuyingProcess: boolean;
  isOffPlan: boolean;
  isCheapest: boolean;
  isAirbnb: boolean;
  isMarketOutlook: boolean;
}

function detectKeywords(
  slug: string,
  towns: { town: string; slug: string }[],
  costas: { costa: string; slug: string }[],
): TopicKeywords {
  const s = slug.toLowerCase();

  let townMatch: string | null = null;
  for (const t of towns) {
    if (s.includes(t.slug) && t.slug.length > 3) {
      townMatch = t.town;
      break;
    }
  }
  // Special shorter names
  if (!townMatch) {
    const shortMap: Record<string, string> = {
      javea: 'Javea', altea: 'Altea', calpe: 'Calpe', nerja: 'Nerja', mijas: 'Mijas',
    };
    for (const [k, v] of Object.entries(shortMap)) {
      if (s.includes(k)) { townMatch = v; break; }
    }
  }

  let costaMatch: string | null = null;
  for (const c of costas) {
    if (s.includes(c.slug) && c.slug.length > 5) {
      costaMatch = c.costa;
      break;
    }
  }
  if (!costaMatch) {
    if (s.includes('costa-blanca')) costaMatch = 'Costa Blanca';
    else if (s.includes('costa-del-sol')) costaMatch = 'Costa del Sol';
    else if (s.includes('costa-calida')) costaMatch = 'Costa Calida';
  }

  const nationalities: Record<string, string> = {
    british: 'British', norwegian: 'Norwegian', swedish: 'Swedish',
    german: 'German', dutch: 'Dutch',
  };
  let isBuyerGuide: string | null = null;
  for (const [k, v] of Object.entries(nationalities)) {
    if (s.includes(k)) { isBuyerGuide = v; break; }
  }

  return {
    townMatch,
    costaMatch,
    isTax: s.includes('tax'),
    isMortgage: s.includes('mortgage'),
    isYield: s.includes('yield'),
    isRental: s.includes('rental'),
    isLuxury: s.includes('luxury'),
    isNewBuild: s.includes('new-build') || s.includes('new-builds'),
    isComparison: s.includes('-vs-'),
    isBuyerGuide,
    isGoldenVisa: s.includes('golden-visa'),
    isRetirement: s.includes('retirement'),
    isPool: s.includes('pool'),
    isBeach: s.includes('beach'),
    isGolf: s.includes('golf'),
    isEnergy: s.includes('energy'),
    isManagement: s.includes('management'),
    isFurnished: s.includes('furnished'),
    isCommunityFees: s.includes('community-fees'),
    isNIE: s.includes('nie-number'),
    isBuyingProcess: s.includes('buying-process'),
    isOffPlan: s.includes('off-plan'),
    isCheapest: s.includes('cheapest'),
    isAirbnb: s.includes('airbnb'),
    isMarketOutlook: s.includes('outlook'),
  };
}

/* ------------------------------------------------------------------ */
/*  Filter helpers                                                     */
/* ------------------------------------------------------------------ */

function filterByTown(props: Property[], town: string): Property[] {
  return props.filter((p) => p.l.toLowerCase() === town.toLowerCase());
}

function filterByCosta(props: Property[], costa: string): Property[] {
  return props.filter((p) => p.costa?.toLowerCase() === costa.toLowerCase());
}

function filterPool(props: Property[]): Property[] {
  return props.filter((p) => p.pool && p.pool !== 'no');
}

function filterBeachClose(props: Property[]): Property[] {
  return props.filter((p) => p.bk !== null && p.bk <= 2);
}

function filterGolf(props: Property[]): Property[] {
  return props.filter((p) => p.cats?.includes('golf'));
}

function filterLuxury(props: Property[]): Property[] {
  return props.filter((p) => p.pf >= 500000);
}

function filterCheap(props: Property[]): Property[] {
  return props.filter((p) => p.pf <= 200000);
}

/* ------------------------------------------------------------------ */
/*  Content generation                                                 */
/* ------------------------------------------------------------------ */

interface TopicContent {
  title: string;
  description: string;
  summary: string;
  stats: { label: string; value: string }[];
  sections: { heading: string; body: string }[];
  faqs: { q: string; a: string }[];
  relatedLinks: { href: string; label: string }[];
}

function getTopicContent(
  slug: string,
  properties: Property[],
  towns: { town: string; slug: string; count: number; avgScore: number; avgPrice: number; avgYield: number }[],
): TopicContent {
  const costas = getUniqueCostas();
  const kw = detectKeywords(slug, towns, costas);
  const prettyTitle = titleCase(slug);
  const total = properties.length;
  const avgPrice = Math.round(avg(properties.map((p) => p.pf)));
  const avgPm2 = Math.round(avg(properties.filter((p) => p.pm2).map((p) => p.pm2!)));
  const avgYield = avg(properties.filter((p) => p._yield).map((p) => p._yield!.gross));
  const avgScore = Math.round(avg(properties.filter((p) => p._sc).map((p) => p._sc!)));
  const poolProps = filterPool(properties);
  const beachProps = filterBeachClose(properties);
  const golfProps = filterGolf(properties);
  const luxuryProps = filterLuxury(properties);
  const cheapProps = filterCheap(properties);
  const topYieldTowns = [...towns].sort((a, b) => b.avgYield - a.avgYield).slice(0, 5);
  const topScoreTowns = [...towns].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);
  const cheapestTowns = [...towns].filter((t) => t.count >= 3).sort((a, b) => a.avgPrice - b.avgPrice).slice(0, 5);

  // Scope the working data set
  let scopeLabel = 'Spain';
  let scopeProps = properties;
  const relatedLinks: { href: string; label: string }[] = [];

  if (kw.townMatch) {
    const townProps = filterByTown(properties, kw.townMatch);
    if (townProps.length) { scopeProps = townProps; scopeLabel = kw.townMatch; }
    relatedLinks.push({ href: `/towns/${slugify(kw.townMatch)}`, label: `${kw.townMatch} properties` });
  }
  if (kw.costaMatch) {
    const costaProps = filterByCosta(properties, kw.costaMatch);
    if (costaProps.length) { scopeProps = costaProps; scopeLabel = kw.costaMatch; }
    relatedLinks.push({ href: `/costas/${slugify(kw.costaMatch)}`, label: `${kw.costaMatch} properties` });
  }

  // Always add general links
  relatedLinks.push({ href: '/towns', label: 'All towns' });
  relatedLinks.push({ href: '/costas', label: 'All costas' });
  relatedLinks.push({ href: '/compare', label: 'Compare properties' });

  const sAvgPrice = Math.round(avg(scopeProps.map((p) => p.pf)));
  const sAvgPm2 = Math.round(avg(scopeProps.filter((p) => p.pm2).map((p) => p.pm2!)));
  const sAvgYield = avg(scopeProps.filter((p) => p._yield).map((p) => p._yield!.gross));
  const sAvgScore = Math.round(avg(scopeProps.filter((p) => p._sc).map((p) => p._sc!)));
  const sMedianPrice = Math.round(median(scopeProps.map((p) => p.pf)));
  const sMinPrice = scopeProps.length ? Math.min(...scopeProps.map((p) => p.pf)) : 0;
  const sMaxPrice = scopeProps.length ? Math.max(...scopeProps.map((p) => p.pf)) : 0;
  const sPoolPct = scopeProps.length ? ((filterPool(scopeProps).length / scopeProps.length) * 100) : 0;
  const sBeachPct = scopeProps.length ? ((filterBeachClose(scopeProps).length / scopeProps.length) * 100) : 0;
  const sAvgBeds = avg(scopeProps.map((p) => p.bd));
  const sAvgBuilt = Math.round(avg(scopeProps.map((p) => p.bm)));

  /* ---------- Market Outlook ---------- */
  if (kw.isMarketOutlook) {
    return {
      title: `Spanish Property Market Outlook 2026 \u2014 Data-Driven Analysis`,
      description: `Live analysis of Spain\u2019s 2026 property market: ${total} new builds tracked, avg \u20AC${fmt(avgPm2)}/m\u00B2, ${pct(avgYield)}% gross yield. Regional breakdowns and investment scores.`,
      summary: `The Spanish new-build market in 2026 comprises ${total} tracked properties across multiple costas, with an average price of \u20AC${fmt(avgPrice)} and a gross rental yield of ${pct(avgYield)}%. The average investment score is ${avgScore}/100, indicating moderate-to-strong fundamentals overall.`,
      stats: [
        { label: 'Total Properties', value: fmt(total) },
        { label: 'Avg Price', value: `\u20AC${fmt(avgPrice)}` },
        { label: 'Avg Price/m\u00B2', value: `\u20AC${fmt(avgPm2)}` },
        { label: 'Avg Gross Yield', value: `${pct(avgYield)}%` },
        { label: 'Avg Score', value: `${avgScore}/100` },
        { label: 'With Pool', value: `${poolProps.length} (${pct(poolProps.length / total * 100)}%)` },
      ],
      sections: [
        { heading: 'Market Size and Composition', body: `Our database tracks ${total} new-build properties from multiple developers across Spain\u2019s Mediterranean coast. The average built area is ${sAvgBuilt} m\u00B2 with ${pct(sAvgBeds)} bedrooms on average. Prices range from \u20AC${fmt(Math.min(...properties.map((p) => p.pf)))} to \u20AC${fmt(Math.max(...properties.map((p) => p.pf)))} with a median of \u20AC${fmt(Math.round(median(properties.map((p) => p.pf))))}. New construction dominates the supply side as demand from international buyers remains robust, particularly from Northern European markets. The developer landscape is diversified, reducing single-developer risk for investors.` },
        { heading: 'Regional Performance', body: `Top-performing costas by investment score: ${costas.slice(0, 3).map((c) => `${c.costa} (${c.avgScore}/100, ${c.avgYield}% yield, ${c.count} listings)`).join('; ')}. The data shows meaningful dispersion in both price and yield across regions, suggesting that location selection remains the single most important investment decision. Coastal regions with established rental infrastructure tend to command higher scores due to their combination of tourist demand, amenity access, and transport links.` },
        { heading: 'Yield Analysis', body: `Gross rental yields across the market average ${pct(avgYield)}%. The highest-yielding towns are: ${topYieldTowns.map((t) => `${t.town} (${t.avgYield}%)`).join(', ')}. Yield compression is evident in premium coastal towns where capital appreciation rather than income return drives investment logic. Properties under \u20AC200,000 deliver a higher average yield of ${pct(avg(cheapProps.filter((p) => p._yield).map((p) => p._yield!.gross)))}%, while luxury properties above \u20AC500,000 average ${pct(avg(luxuryProps.filter((p) => p._yield).map((p) => p._yield!.gross)))}%.` },
        { heading: 'Price Trends and Affordability', body: `The average new-build price per square metre stands at \u20AC${fmt(avgPm2)}. The most affordable towns for new construction are: ${cheapestTowns.map((t) => `${t.town} (avg \u20AC${fmt(t.avgPrice)})`).join(', ')}. Price-per-square-metre analysis reveals significant value variation even within individual costas, reinforcing the importance of micro-location analysis. Developers are increasingly offering payment plans spanning the construction period, typically 12\u201324 months, with 30\u201340% deposits at reservation.` },
        { heading: 'Investment Score Leaders', body: `The towns with the highest average investment scores are: ${topScoreTowns.map((t) => `${t.town} (${t.avgScore}/100)`).join(', ')}. These scores combine value metrics (price vs. market), rental yield potential, location quality, developer track record, and risk assessment. A score above 70 indicates strong investment fundamentals while scores above 85 represent exceptional opportunities. Of the ${total} properties tracked, ${properties.filter((p) => (p._sc ?? 0) >= 70).length} score 70 or above.` },
        { heading: 'Outlook and Risk Factors', body: `The Spanish new-build market benefits from sustained Northern European demand, low construction oversupply relative to the pre-2008 period, and continued infrastructure investment. Key risks include potential interest rate impacts on buyer financing, regulatory changes affecting short-term rental licensing, and construction cost inflation. We recommend focusing on properties with strong fundamentals: investment scores above 65, gross yields above ${pct(avgYield)}%, and locations with established rental track records.` },
      ],
      faqs: [
        { q: 'What is the average new-build price in Spain in 2026?', a: `Based on ${total} tracked properties, the average new-build price is \u20AC${fmt(avgPrice)} with an average of \u20AC${fmt(avgPm2)} per square metre.` },
        { q: 'Which Spanish region offers the best rental yields?', a: `The top-yielding towns are ${topYieldTowns.slice(0, 3).map((t) => `${t.town} (${t.avgYield}%)`).join(', ')}, based on live data analysis.` },
        { q: 'Is 2026 a good time to buy property in Spain?', a: `Market data shows ${total} new builds with an average score of ${avgScore}/100 and ${pct(avgYield)}% gross yield. Fundamentals remain solid, though location selection significantly impacts returns.` },
        { q: 'What is the cheapest area for new builds in Spain?', a: `The most affordable towns for new builds are ${cheapestTowns.slice(0, 3).map((t) => `${t.town} (avg \u20AC${fmt(t.avgPrice)})`).join(', ')}.` },
      ],
      relatedLinks,
    };
  }

  /* ---------- Town-specific ---------- */
  if (kw.townMatch && !kw.isComparison) {
    const tSlug = slugify(kw.townMatch);
    const townData = towns.find((t) => t.slug === tSlug);
    const yieldStr = pct(sAvgYield);
    const topProps = [...scopeProps].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, 5);
    const typeBreakdown = new Map<string, number>();
    for (const p of scopeProps) { typeBreakdown.set(p.t, (typeBreakdown.get(p.t) ?? 0) + 1); }
    const typeStr = [...typeBreakdown.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]) => `${t} (${c})`).join(', ');
    const beachAvg = avg(scopeProps.filter((p) => p.bk !== null).map((p) => p.bk!));

    return {
      title: `${kw.townMatch} ${kw.isRental ? 'Rental Market' : kw.isLuxury ? 'Luxury Property' : kw.isNewBuild ? 'New Build' : 'Property Investment'} Guide \u2014 Live Data Analysis`,
      description: `${kw.townMatch}: ${scopeProps.length} new builds, avg \u20AC${fmt(sAvgPm2)}/m\u00B2, ${yieldStr}% gross yield, score ${sAvgScore}/100. Data-backed ${kw.isRental ? 'rental' : 'investment'} analysis.`,
      summary: `${kw.townMatch} currently offers ${scopeProps.length} new-build properties with an average price of \u20AC${fmt(sAvgPrice)} (\u20AC${fmt(sAvgPm2)}/m\u00B2). The average gross rental yield is ${yieldStr}% and the average investment score is ${sAvgScore}/100, reflecting ${sAvgScore >= 70 ? 'strong' : sAvgScore >= 50 ? 'moderate' : 'developing'} investment fundamentals.`,
      stats: [
        { label: 'Properties', value: fmt(scopeProps.length) },
        { label: 'Avg Price', value: `\u20AC${fmt(sAvgPrice)}` },
        { label: 'Avg Price/m\u00B2', value: `\u20AC${fmt(sAvgPm2)}` },
        { label: 'Avg Gross Yield', value: `${yieldStr}%` },
        { label: 'Avg Score', value: `${sAvgScore}/100` },
        { label: 'Median Price', value: `\u20AC${fmt(sMedianPrice)}` },
      ],
      sections: [
        { heading: `${kw.townMatch} Market Overview`, body: `The ${kw.townMatch} new-build market consists of ${scopeProps.length} tracked properties ranging from \u20AC${fmt(sMinPrice)} to \u20AC${fmt(sMaxPrice)}. The median price is \u20AC${fmt(sMedianPrice)}, with an average built area of ${sAvgBuilt} m\u00B2 and ${pct(sAvgBeds)} bedrooms. Property types available: ${typeStr}. The market caters to both investment buyers seeking rental income and lifestyle purchasers looking for Mediterranean living.` },
        { heading: 'Price Analysis', body: `At \u20AC${fmt(sAvgPm2)} per square metre, ${kw.townMatch} ${sAvgPm2 > avgPm2 ? 'sits above' : sAvgPm2 < avgPm2 ? 'sits below' : 'matches'} the Spain-wide average of \u20AC${fmt(avgPm2)}/m\u00B2 (${sAvgPm2 > avgPm2 ? '+' : ''}${pct((sAvgPm2 - avgPm2) / avgPm2 * 100)}% difference). This positioning reflects ${sAvgPm2 > avgPm2 ? 'premium demand for the location, driven by amenity access, international buyer interest, and limited new-build supply' : 'relative value compared to neighbouring markets, offering an attractive entry point for investors seeking yield over capital growth'}. Price dispersion within the town shows a ${Math.round((sMaxPrice - sMinPrice) / sAvgPrice * 100)}% range, indicating a diverse mix of product types.` },
        { heading: 'Rental Yield Potential', body: `Gross rental yields in ${kw.townMatch} average ${yieldStr}%, ${sAvgYield > avgYield ? 'outperforming' : 'trailing'} the national average of ${pct(avgYield)}%. ${sPoolPct > 50 ? `A significant ${pct(sPoolPct)}% of properties include pool access, enhancing rental appeal.` : `Pool availability covers ${pct(sPoolPct)}% of listed properties.`} ${beachAvg > 0 ? `Average beach distance is ${pct(beachAvg)} km, ${beachAvg <= 1 ? 'providing strong beach-proximity appeal for holiday renters' : 'balancing coastal access with more competitive pricing'}.` : ''} Properties priced below the median tend to deliver higher yields, while premium listings offer a blend of yield and capital appreciation potential.` },
        { heading: 'Top-Scoring Properties', body: `The highest-scoring properties in ${kw.townMatch}: ${topProps.map((p, i) => `${i + 1}. ${p.p} \u2014 ${Math.round(p._sc ?? 0)}/100, \u20AC${fmt(p.pf)}, ${p.bd} bed, ${p._yield ? pct(p._yield.gross) + '% yield' : 'yield TBC'}`).join('. ')}. These top-rated listings combine competitive pricing relative to local market rates, strong rental demand fundamentals, developer reliability, and favourable location characteristics.` },
        { heading: 'Location Fundamentals', body: `${kw.townMatch} benefits from Mediterranean climate with over 300 days of sunshine annually. ${sBeachPct > 40 ? `${pct(sBeachPct)}% of properties sit within 2 km of the beach, making the area particularly attractive for holiday rental strategies.` : `The area provides a mix of coastal and inland positions, with ${pct(sBeachPct)}% of listings within 2 km of beaches.`} The town is served by ${kw.costaMatch ? `the ${kw.costaMatch} infrastructure network, including` : ''} regional airports, motorway links, and local amenities. International schools, healthcare facilities, and retail centres support both permanent and seasonal residents, underpinning year-round rental demand.` },
        { heading: 'Investment Recommendation', body: `With an average score of ${sAvgScore}/100 and ${yieldStr}% gross yield across ${scopeProps.length} properties, ${kw.townMatch} represents a ${sAvgScore >= 70 ? 'strong' : sAvgScore >= 55 ? 'solid' : 'developing'} investment proposition. Key factors to consider: entry price relative to the \u20AC${fmt(sAvgPm2)}/m\u00B2 average, proximity to beaches and amenities, developer track record, and completion timeline. We recommend focusing on properties scoring above ${Math.max(sAvgScore - 5, 50)}/100 for optimal risk-adjusted returns. ${scopeProps.filter((p) => (p._sc ?? 0) >= 70).length} of the ${scopeProps.length} properties score 70 or above.` },
      ],
      faqs: [
        { q: `What is the average property price in ${kw.townMatch}?`, a: `The average new-build price in ${kw.townMatch} is \u20AC${fmt(sAvgPrice)} with a median of \u20AC${fmt(sMedianPrice)}. Price per square metre averages \u20AC${fmt(sAvgPm2)}.` },
        { q: `What rental yield can I expect in ${kw.townMatch}?`, a: `Average gross rental yields in ${kw.townMatch} are ${yieldStr}%, based on live analysis of ${scopeProps.length} properties.` },
        { q: `Is ${kw.townMatch} a good place to invest in property?`, a: `${kw.townMatch} scores ${sAvgScore}/100 on average. ${sAvgScore >= 65 ? 'This indicates solid investment fundamentals.' : 'The area offers potential but requires careful property selection.'} Compare with other towns using our comparison tool.` },
        { q: `How many new builds are available in ${kw.townMatch}?`, a: `There are currently ${scopeProps.length} new-build properties tracked in ${kw.townMatch}, ranging from \u20AC${fmt(sMinPrice)} to \u20AC${fmt(sMaxPrice)}.` },
        { q: `What types of property are available in ${kw.townMatch}?`, a: `Available property types in ${kw.townMatch}: ${typeStr}. The average built area is ${sAvgBuilt} m\u00B2 with ${pct(sAvgBeds)} bedrooms.` },
      ],
      relatedLinks,
    };
  }

  /* ---------- Costa-specific ---------- */
  if (kw.costaMatch && !kw.townMatch) {
    const cSlug = slugify(kw.costaMatch);
    const costaData = costas.find((c) => c.slug === cSlug);
    const costaTowns = towns.filter((t) => {
      const tProps = properties.filter((p) => p.l === t.town);
      return tProps.some((p) => p.costa?.toLowerCase() === kw.costaMatch!.toLowerCase());
    });
    const yieldStr = pct(sAvgYield);
    const topCostaTowns = [...costaTowns].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);

    return {
      title: `${kw.costaMatch} ${kw.isYield ? 'Rental Yield Analysis' : 'Property Investment Guide'} \u2014 ${scopeProps.length} Properties Analysed`,
      description: `${kw.costaMatch}: ${scopeProps.length} new builds, avg \u20AC${fmt(sAvgPm2)}/m\u00B2, ${yieldStr}% yield. Town-by-town analysis with live data.`,
      summary: `${kw.costaMatch} features ${scopeProps.length} new-build properties with an average price of \u20AC${fmt(sAvgPrice)} and ${yieldStr}% gross rental yield. The regional investment score averages ${sAvgScore}/100 across ${costaTowns.length} towns, making it ${sAvgScore >= 65 ? 'one of the stronger investment corridors' : 'a competitive market'} on Spain\u2019s coast.`,
      stats: [
        { label: 'Properties', value: fmt(scopeProps.length) },
        { label: 'Towns', value: fmt(costaTowns.length) },
        { label: 'Avg Price', value: `\u20AC${fmt(sAvgPrice)}` },
        { label: 'Avg Price/m\u00B2', value: `\u20AC${fmt(sAvgPm2)}` },
        { label: 'Avg Gross Yield', value: `${yieldStr}%` },
        { label: 'Avg Score', value: `${sAvgScore}/100` },
      ],
      sections: [
        { heading: `${kw.costaMatch} Overview`, body: `The ${kw.costaMatch} stretches along Spain\u2019s Mediterranean coastline and is one of the most established property markets for international buyers. Our database tracks ${scopeProps.length} new-build properties across ${costaTowns.length} towns. Prices range from \u20AC${fmt(sMinPrice)} to \u20AC${fmt(sMaxPrice)} with a median of \u20AC${fmt(sMedianPrice)}. The average built area is ${sAvgBuilt} m\u00B2 and the region benefits from excellent transport links, including international airports, motorway networks, and high-speed rail connections.` },
        { heading: 'Town Rankings', body: `Top-performing towns on the ${kw.costaMatch} by investment score: ${topCostaTowns.map((t, i) => `${i + 1}. ${t.town} \u2014 score ${t.avgScore}/100, avg \u20AC${fmt(t.avgPrice)}, yield ${t.avgYield}%`).join('. ')}. These rankings reflect a composite of value, yield, location quality, developer reliability, and risk factors. Towns with higher scores typically combine competitive pricing with proven rental demand and strong infrastructure.` },
        { heading: 'Yield Landscape', body: `Gross rental yields on the ${kw.costaMatch} average ${yieldStr}%. ${sAvgYield > avgYield ? `This outperforms the Spain-wide average of ${pct(avgYield)}%, reflecting strong tourist and expat rental demand.` : `This is broadly in line with the national average of ${pct(avgYield)}%.`} Yield distribution varies significantly by town: the highest-yielding locations are ${costaTowns.sort((a, b) => b.avgYield - a.avgYield).slice(0, 3).map((t) => `${t.town} (${t.avgYield}%)`).join(', ')}. Properties under \u20AC200,000 tend to deliver higher gross yields, making the region attractive for income-focused investors.` },
        { heading: 'Price Segmentation', body: `The ${kw.costaMatch} market segments into three price bands: budget (under \u20AC200k) with ${scopeProps.filter((p) => p.pf < 200000).length} properties, mid-range (\u20AC200k\u2013\u20AC500k) with ${scopeProps.filter((p) => p.pf >= 200000 && p.pf < 500000).length} properties, and premium (over \u20AC500k) with ${scopeProps.filter((p) => p.pf >= 500000).length} properties. Average price per square metre is \u20AC${fmt(sAvgPm2)}, ${sAvgPm2 > avgPm2 ? 'above' : 'below'} the national new-build average. The mid-range segment offers the best balance between entry cost, rental appeal, and resale liquidity.` },
        { heading: 'Amenities and Lifestyle', body: `${pct(sPoolPct)}% of new builds on the ${kw.costaMatch} include pool access (private or communal), and ${pct(sBeachPct)}% sit within 2 km of beaches. The region boasts multiple golf courses, marinas, international schools, and medical centres. These amenity factors directly influence rental occupancy rates, with pool and beach access being the two most significant drivers of holiday rental booking rates. Year-round sunshine (300+ days) supports extended rental seasons compared to Northern European holiday destinations.` },
        { heading: 'Investment Strategy', body: `For the ${kw.costaMatch}, we recommend a balanced approach: target properties scoring above ${Math.max(sAvgScore - 5, 50)}/100 with gross yields above ${pct(Math.max(sAvgYield - 0.5, 3))}%. The ${scopeProps.filter((p) => (p._sc ?? 0) >= 70).length} properties scoring 70+ represent the strongest risk-adjusted opportunities. Consider diversifying across 2\u20133 towns to balance yield and capital growth potential. Off-plan purchases offer 10\u201320% savings versus completed units but carry construction and completion risk. Key-ready properties provide immediate rental income but at a premium entry point.` },
      ],
      faqs: [
        { q: `How many new builds are on the ${kw.costaMatch}?`, a: `We track ${scopeProps.length} new-build properties across ${costaTowns.length} towns on the ${kw.costaMatch}.` },
        { q: `What is the average rental yield on the ${kw.costaMatch}?`, a: `The average gross rental yield is ${yieldStr}% across all tracked properties.` },
        { q: `Which is the best town on the ${kw.costaMatch} for investment?`, a: `By investment score, the top town is ${topCostaTowns[0]?.town ?? 'varies'} at ${topCostaTowns[0]?.avgScore ?? 0}/100. See our town comparison tool for detailed analysis.` },
        { q: `What is the cheapest area on the ${kw.costaMatch}?`, a: `The most affordable towns are ${costaTowns.sort((a, b) => a.avgPrice - b.avgPrice).slice(0, 3).map((t) => `${t.town} (avg \u20AC${fmt(t.avgPrice)})`).join(', ')}.` },
      ],
      relatedLinks,
    };
  }

  /* ---------- Comparison (vs) ---------- */
  if (kw.isComparison) {
    const parts = slug.split('-vs-');
    const labelA = titleCase(parts[0]);
    const labelB = titleCase(parts[1] ?? '');
    const costaA = costas.find((c) => c.costa.toLowerCase().replace(/\s+/g, '-') === parts[0] || slugify(c.costa) === parts[0]);
    const costaB = costas.find((c) => c.costa.toLowerCase().replace(/\s+/g, '-') === parts[1] || slugify(c.costa) === parts[1]);
    const propsA = costaA ? filterByCosta(properties, costaA.costa) : properties;
    const propsB = costaB ? filterByCosta(properties, costaB.costa) : properties;
    const aAvgPrice = Math.round(avg(propsA.map((p) => p.pf)));
    const bAvgPrice = Math.round(avg(propsB.map((p) => p.pf)));
    const aYield = avg(propsA.filter((p) => p._yield).map((p) => p._yield!.gross));
    const bYield = avg(propsB.filter((p) => p._yield).map((p) => p._yield!.gross));
    const aScore = Math.round(avg(propsA.filter((p) => p._sc).map((p) => p._sc!)));
    const bScore = Math.round(avg(propsB.filter((p) => p._sc).map((p) => p._sc!)));

    return {
      title: `${labelA} vs ${labelB} \u2014 Property Investment Comparison`,
      description: `Head-to-head comparison of ${labelA} and ${labelB} for property investment: prices, yields, scores, and market data.`,
      summary: `${labelA} averages \u20AC${fmt(aAvgPrice)} with ${pct(aYield)}% yield (score ${aScore}/100), while ${labelB} averages \u20AC${fmt(bAvgPrice)} with ${pct(bYield)}% yield (score ${bScore}/100). This data-driven comparison covers ${propsA.length + propsB.length} properties across both regions.`,
      stats: [
        { label: `${labelA} Avg Price`, value: `\u20AC${fmt(aAvgPrice)}` },
        { label: `${labelB} Avg Price`, value: `\u20AC${fmt(bAvgPrice)}` },
        { label: `${labelA} Yield`, value: `${pct(aYield)}%` },
        { label: `${labelB} Yield`, value: `${pct(bYield)}%` },
        { label: `${labelA} Score`, value: `${aScore}/100` },
        { label: `${labelB} Score`, value: `${bScore}/100` },
      ],
      sections: [
        { heading: 'Price Comparison', body: `${labelA} new builds average \u20AC${fmt(aAvgPrice)} across ${propsA.length} listings, while ${labelB} averages \u20AC${fmt(bAvgPrice)} across ${propsB.length} listings. ${aAvgPrice > bAvgPrice ? `${labelA} commands a ${pct((aAvgPrice - bAvgPrice) / bAvgPrice * 100)}% premium over ${labelB}` : `${labelB} commands a ${pct((bAvgPrice - aAvgPrice) / aAvgPrice * 100)}% premium over ${labelA}`}. Per square metre, ${labelA} averages \u20AC${fmt(Math.round(avg(propsA.filter((p) => p.pm2).map((p) => p.pm2!))))} versus ${labelB}\u2019s \u20AC${fmt(Math.round(avg(propsB.filter((p) => p.pm2).map((p) => p.pm2!))))}. This price differential reflects differences in tourist infrastructure maturity, international buyer concentration, and local market dynamics.` },
        { heading: 'Yield Analysis', body: `${labelA} delivers ${pct(aYield)}% average gross yield against ${labelB}\u2019s ${pct(bYield)}%. ${aYield > bYield ? `${labelA} offers stronger income returns, suggesting more developed rental infrastructure or more competitive entry prices relative to rental rates.` : `${labelB} offers the yield advantage, which may reflect better value pricing or stronger seasonal rental demand.`} Both regions benefit from year-round Mediterranean tourism, though rental seasons and occupancy patterns differ based on resort maturity and flight connectivity.` },
        { heading: 'Score Breakdown', body: `Investment scores combine five factors: value (price vs. market), yield potential, location quality, developer track record, and risk assessment. ${labelA} scores ${aScore}/100 on average while ${labelB} scores ${bScore}/100. ${aScore > bScore ? `${labelA} shows stronger overall fundamentals, though individual properties in ${labelB} may outperform.` : aScore < bScore ? `${labelB} edges ahead on overall fundamentals, though ${labelA} contains individual opportunities that outperform.` : 'Both regions are closely matched on fundamentals.'} Buyers should compare individual property scores rather than relying solely on regional averages.` },
        { heading: 'Lifestyle and Amenities', body: `${labelA} has ${pct(filterPool(propsA).length / Math.max(propsA.length, 1) * 100)}% pool coverage and ${pct(filterBeachClose(propsA).length / Math.max(propsA.length, 1) * 100)}% beach proximity (under 2 km). ${labelB} has ${pct(filterPool(propsB).length / Math.max(propsB.length, 1) * 100)}% pool coverage and ${pct(filterBeachClose(propsB).length / Math.max(propsB.length, 1) * 100)}% beach proximity. Both offer golf courses, restaurants, and healthcare facilities, though the density and quality of infrastructure varies by specific town within each costa. Flight connectivity is a key differentiator for rental income potential.` },
        { heading: 'Recommendation', body: `${aYield > bYield && aScore >= bScore ? `${labelA} is the stronger choice for yield-focused investors, combining higher returns with competitive scores.` : bYield > aYield && bScore >= aScore ? `${labelB} is the stronger choice for yield-focused investors, offering both higher returns and strong fundamentals.` : `Both regions offer distinct advantages: ${aYield > bYield ? `${labelA} for yield` : `${labelB} for yield`} and ${aScore > bScore ? `${labelA} for overall fundamentals` : `${labelB} for fundamentals`}.`} Consider your investment goals: income focus favours higher-yield locations, while capital growth strategies may favour areas with stronger infrastructure development and international buyer demand. Use our compare tool for property-level analysis.` },
      ],
      faqs: [
        { q: `Is ${labelA} or ${labelB} better for property investment?`, a: `${labelA} scores ${aScore}/100 with ${pct(aYield)}% yield, while ${labelB} scores ${bScore}/100 with ${pct(bYield)}% yield. The best choice depends on whether you prioritise income or capital growth.` },
        { q: `Which is cheaper, ${labelA} or ${labelB}?`, a: `${aAvgPrice < bAvgPrice ? `${labelA} is more affordable at \u20AC${fmt(aAvgPrice)} average` : `${labelB} is more affordable at \u20AC${fmt(bAvgPrice)} average`}.` },
        { q: `How many properties are available in each region?`, a: `${labelA} has ${propsA.length} listings and ${labelB} has ${propsB.length} listings in our database.` },
      ],
      relatedLinks: [
        ...(costaA ? [{ href: `/costas/${slugify(costaA.costa)}`, label: `${costaA.costa} properties` }] : []),
        ...(costaB ? [{ href: `/costas/${slugify(costaB.costa)}`, label: `${costaB.costa} properties` }] : []),
        ...relatedLinks,
      ],
    };
  }

  /* ---------- Buyer nationality guides ---------- */
  if (kw.isBuyerGuide) {
    const nat = kw.isBuyerGuide;
    return {
      title: `${nat} Buyer\u2019s Guide to Spanish Property \u2014 Everything You Need to Know`,
      description: `Complete guide for ${nat} buyers purchasing property in Spain. ${total} new builds, avg \u20AC${fmt(avgPrice)}, ${pct(avgYield)}% yield. Tax, legal, and investment analysis.`,
      summary: `For ${nat} buyers, Spain offers ${total} new-build properties averaging \u20AC${fmt(avgPrice)} with ${pct(avgYield)}% gross rental yield. This guide covers legal requirements, tax implications, financing options, and the best-value locations based on live market data.`,
      stats: [
        { label: 'Total Properties', value: fmt(total) },
        { label: 'Avg Price', value: `\u20AC${fmt(avgPrice)}` },
        { label: 'Avg Yield', value: `${pct(avgYield)}%` },
        { label: 'Avg Score', value: `${avgScore}/100` },
        { label: 'Best Yield Town', value: topYieldTowns[0]?.town ?? 'N/A' },
        { label: 'Cheapest Town', value: cheapestTowns[0]?.town ?? 'N/A' },
      ],
      sections: [
        { heading: `Why ${nat} Buyers Choose Spain`, body: `Spain remains one of the most popular destinations for ${nat} property buyers, driven by climate, lifestyle, and investment returns. With over 300 days of sunshine, established expat communities, excellent healthcare, and direct flight connections, Spain offers a compelling proposition. The ${total} new-build properties in our database average \u20AC${fmt(avgPrice)} with ${pct(avgYield)}% gross yield, outperforming many Northern European buy-to-let markets. ${nat} buyers benefit from a well-established purchase process with strong legal protections for foreign buyers.` },
        { heading: 'Legal Requirements', body: `${nat} buyers need a NIE (N\u00FAmero de Identificaci\u00F3n de Extranjero) \u2014 a tax identification number required for all property transactions in Spain. The process typically takes 2\u20134 weeks. You will also need a Spanish bank account, which can usually be opened remotely. It is strongly recommended to use an independent Spanish lawyer (abogado) who specialises in property conveyancing. Power of attorney (poder notarial) can be granted to allow your lawyer to act on your behalf for contract signing and completion. The entire process from reservation to completion typically takes 6\u20138 weeks for key-ready properties and 12\u201324 months for off-plan.` },
        { heading: 'Tax Implications', body: `New-build purchases in Spain incur 10% VAT (IVA) plus 1.2% stamp duty (AJD). Annual property tax (IBI) varies by municipality but typically ranges from \u20AC300\u2013\u20AC1,500 per year. Non-resident owners pay income tax on rental income at 19% for EU/EEA residents (24% for non-EU) on net rental income after allowable expenses. An annual imputed income tax of approximately 1.1% of the cadastral value applies when the property is not rented. ${nat} buyers should consult both Spanish and domestic tax advisors to understand double taxation treaty provisions and reporting obligations in their home country.` },
        { heading: 'Financing Options', body: `Spanish banks offer mortgages to non-residents, typically covering 60\u201370% of the purchase price for foreign buyers. Current rates for non-residents range from 3.5\u20135.5% depending on the bank, loan-to-value ratio, and fixed vs variable rate preference. Minimum deposit requirements are usually 30\u201340% plus approximately 12\u201314% of the purchase price for taxes and fees. Some ${nat} buyers arrange financing through their domestic banks, using equity release or buy-to-let products, which can offer more competitive rates. Mortgage terms typically extend to 20\u201325 years with a maximum age at maturity of 70\u201375.` },
        { heading: 'Best Locations for ${nat} Buyers', body: `Top investment locations by score: ${topScoreTowns.map((t) => `${t.town} (${t.avgScore}/100, avg \u20AC${fmt(t.avgPrice)})`).join(', ')}. For yield-focused buyers: ${topYieldTowns.map((t) => `${t.town} (${t.avgYield}%)`).join(', ')}. For budget buyers: ${cheapestTowns.map((t) => `${t.town} (avg \u20AC${fmt(t.avgPrice)})`).join(', ')}. ${nat} communities are well-established along the Costa Blanca, Costa del Sol, and Costa Calida, providing familiar amenities, social networks, and native-language services.` },
        { heading: 'Practical Tips', body: `Before purchasing: visit multiple developments, compare developers\u2019 track records, check that all building licences are in order, and verify the property is free from encumbrances (cargas). Budget an additional 12\u201314% of the purchase price for taxes and fees. For rental investment, check local licensing requirements \u2014 tourist rental licences (licencia tur\u00EDstica) are required in most regions and regulations vary by autonomous community. Consider property management if you will not be permanently resident; typical management fees run 15\u201320% of rental income. Our data shows the average investment score across all ${total} properties is ${avgScore}/100 \u2014 we recommend focusing on properties scoring 65+ for the strongest risk-adjusted returns.` },
      ],
      faqs: [
        { q: `Can ${nat} citizens buy property in Spain?`, a: `Yes. ${nat} citizens can purchase property in Spain without restrictions. You will need a NIE number and a Spanish bank account.` },
        { q: `What taxes do ${nat} buyers pay on Spanish property?`, a: `New builds attract 10% VAT + 1.2% stamp duty. Annual costs include property tax (IBI), non-resident income tax at 19% on rental income (EU/EEA) or 24% (non-EU), and community fees.` },
        { q: `Can I get a mortgage as a ${nat} buyer?`, a: `Yes. Spanish banks offer non-resident mortgages up to 60\u201370% LTV. Current rates are approximately 3.5\u20135.5% for non-residents.` },
        { q: `Where do most ${nat} buyers purchase in Spain?`, a: `Popular areas include the Costa Blanca, Costa del Sol, and Costa Calida. Top-scoring towns: ${topScoreTowns.slice(0, 3).map((t) => t.town).join(', ')}.` },
        { q: `How long does the buying process take?`, a: `Key-ready properties typically complete in 6\u20138 weeks from reservation. Off-plan properties take 12\u201324 months depending on the construction stage.` },
      ],
      relatedLinks,
    };
  }

  /* ---------- Tax ---------- */
  if (kw.isTax) {
    return {
      title: `Spanish Property Taxes \u2014 Complete Guide for Non-Residents`,
      description: `Complete guide to Spanish property taxes: purchase taxes (10% VAT), annual IBI, rental income tax, capital gains, and non-resident obligations. Live market context from ${total} properties.`,
      summary: `Spanish property taxes include 10% VAT on new builds, 1.2% stamp duty, annual IBI, and non-resident income tax at 19\u201324% on rental income. Understanding these costs is critical when evaluating the ${pct(avgYield)}% average gross yield across ${total} tracked properties.`,
      stats: [
        { label: 'New Build VAT', value: '10%' },
        { label: 'Stamp Duty (AJD)', value: '1.2%' },
        { label: 'Non-Res Tax (EU)', value: '19%' },
        { label: 'Non-Res Tax (Non-EU)', value: '24%' },
        { label: 'Total Purchase Cost', value: '~12-14%' },
        { label: 'Avg Gross Yield', value: `${pct(avgYield)}%` },
      ],
      sections: [
        { heading: 'Purchase Taxes on New Builds', body: `New-build properties in Spain attract 10% IVA (VAT) on the purchase price plus 1.2% AJD (stamp duty) in most regions. On a property priced at the market average of \u20AC${fmt(avgPrice)}, this totals approximately \u20AC${fmt(Math.round(avgPrice * 0.112))} in purchase taxes alone. Additionally, buyers should budget for notary fees (\u20AC600\u2013\u20AC1,200), land registry fees (\u20AC400\u2013\u20AC800), and legal fees (typically 1\u20131.5% of the purchase price). The total cost of acquisition typically runs 12\u201314% above the stated purchase price.` },
        { heading: 'Annual Property Tax (IBI)', body: `IBI (Impuesto sobre Bienes Inmuebles) is the annual municipal property tax, calculated on the cadastral value of the property. Rates vary by municipality but typically range from 0.4\u20131.1% of the cadastral value, which is generally significantly below the market value. For a typical new build at \u20AC${fmt(avgPrice)}, expect annual IBI of \u20AC300\u2013\u20AC1,500. This is a deductible expense against rental income. Some municipalities apply surcharges for non-resident owners, so verify the specific rate for your target location.` },
        { heading: 'Non-Resident Income Tax', body: `Non-resident property owners in Spain face two income tax scenarios. When the property is rented: EU/EEA residents pay 19% on net rental income (after deductible expenses including IBI, community fees, insurance, repairs, and depreciation). Non-EU residents pay 24% on gross rental income with no expense deductions. When the property is not rented: an imputed income tax of approximately 1.1\u20132% of the cadastral value applies (19% tax on 1.1% of cadastral value for EU/EEA residents). With the average gross yield at ${pct(avgYield)}%, the after-tax net yield for EU/EEA residents typically runs 1.5\u20132.5 percentage points below gross.` },
        { heading: 'Capital Gains Tax', body: `When selling Spanish property, non-residents pay capital gains tax at 19% on the first \u20AC6,000 of gain, 21% on gains from \u20AC6,001 to \u20AC50,000, 23% on gains from \u20AC50,001 to \u20AC200,000, 27% on gains from \u20AC200,001 to \u20AC300,000, and 28% on gains above \u20AC300,000. The buyer is required to retain 3% of the purchase price as a withholding against the seller\u2019s capital gains liability. Allowable deductions include original purchase costs (taxes, fees), improvement costs with receipts, and selling costs. Inflation indexation was abolished in 2015.` },
        { heading: 'Wealth Tax and Solidarity Tax', body: `Spain levies a wealth tax on assets exceeding \u20AC700,000 per person (with an additional \u20AC300,000 exemption for the primary residence of residents). Non-residents are taxed only on Spanish assets. Rates range from 0.2% to 3.5% depending on total value and autonomous community. The Solidarity Tax (Impuesto Temporal de Solidaridad) applies to net wealth exceeding \u20AC3 million. For most investors purchasing properties at the average price of \u20AC${fmt(avgPrice)}, wealth tax is unlikely to apply. However, those building portfolios of multiple properties should monitor total asset exposure.` },
        { heading: 'Tax Planning for Investors', body: `Effective tax planning can significantly improve net returns. Key strategies: ensure you claim all allowable deductions (EU/EEA residents only), consider the timing of purchase to optimise the first year\u2019s imputed income tax, structure ownership appropriately (personal vs company), and maintain full records of all costs and improvements. The average gross yield of ${pct(avgYield)}% across ${total} properties translates to approximately ${pct(avgYield * 0.75)}\u2013${pct(avgYield * 0.85)}% net yield after Spanish taxes for EU/EEA residents, depending on expense levels and individual circumstances. Professional tax advice from a cross-border specialist is strongly recommended.` },
      ],
      faqs: [
        { q: 'What tax do I pay when buying a new build in Spain?', a: '10% IVA (VAT) plus 1.2% stamp duty (AJD), totalling 11.2% in purchase taxes. Budget 12-14% total including legal and notary fees.' },
        { q: 'How much is annual property tax in Spain?', a: 'IBI (annual property tax) ranges from \u20AC300-\u20AC1,500 for typical new builds, based on cadastral value and municipal rates.' },
        { q: 'What tax do non-residents pay on rental income in Spain?', a: 'EU/EEA residents pay 19% on net income (after expenses). Non-EU residents pay 24% on gross income with no deductions.' },
        { q: 'Is there capital gains tax when selling Spanish property?', a: 'Yes. Rates range from 19% to 28% on gains, depending on the amount. The buyer withholds 3% of the price as a tax guarantee.' },
      ],
      relatedLinks,
    };
  }

  /* ---------- Mortgage ---------- */
  if (kw.isMortgage) {
    return {
      title: `Spanish Mortgage Rates for Foreigners \u2014 2026 Guide`,
      description: `Guide to Spanish mortgages for foreign buyers: rates, LTV, requirements, and costs. Context from ${total} new builds avg \u20AC${fmt(avgPrice)}.`,
      summary: `Spanish banks offer non-resident mortgages at 3.5\u20135.5% with 60\u201370% LTV. On the average new build at \u20AC${fmt(avgPrice)}, this means a minimum deposit of \u20AC${fmt(Math.round(avgPrice * 0.3))} plus approximately \u20AC${fmt(Math.round(avgPrice * 0.13))} in taxes and fees.`,
      stats: [
        { label: 'Typical Rate', value: '3.5\u20135.5%' },
        { label: 'Max LTV', value: '60\u201370%' },
        { label: 'Min Deposit', value: '30\u201340%' },
        { label: 'Max Term', value: '20\u201325 yrs' },
        { label: 'Avg Property Price', value: `\u20AC${fmt(avgPrice)}` },
        { label: 'Est. Monthly (avg)', value: `\u20AC${fmt(Math.round(avgPrice * 0.65 * 0.005))}` },
      ],
      sections: [
        { heading: 'Non-Resident Mortgage Overview', body: `Spanish banks actively lend to non-resident buyers, typically offering 60\u201370% loan-to-value for foreigners compared to 80% for residents. The main banks serving international buyers include CaixaBank, BBVA, Santander, Sabadell, and Bankinter. Application processing takes 4\u20138 weeks. On the average new build priced at \u20AC${fmt(avgPrice)}, a 65% mortgage means borrowing \u20AC${fmt(Math.round(avgPrice * 0.65))} with a deposit of \u20AC${fmt(Math.round(avgPrice * 0.35))} plus approximately 12\u201314% in purchase costs.` },
        { heading: 'Current Interest Rates', body: `As of 2026, non-resident mortgage rates in Spain range from 3.5% to 5.5% depending on the bank, product type, and borrower profile. Fixed rates provide payment certainty and currently range from 3.8\u20135.5% for terms up to 25 years. Variable rates (typically Euribor + 1.5\u20132.5%) start lower but carry interest rate risk. Mixed products offer a fixed period (typically 5\u201310 years) followed by a variable rate. Bank arrangement fees typically run 0.5\u20131% of the loan amount, plus valuation fees of \u20AC300\u2013\u20AC500.` },
        { heading: 'Eligibility and Documentation', body: `Requirements for non-resident mortgage applicants: proof of income (3\u20136 months of payslips or 2\u20133 years of tax returns for self-employed), bank statements (6\u201312 months), valid passport, NIE number, credit report from your home country, and employment contract or business accounts. Banks assess affordability based on all worldwide debt commitments not exceeding 35\u201340% of net income. Self-employed applicants face stricter scrutiny and may receive lower LTV offers (50\u201360%). The property valuation must be conducted by a bank-approved surveyor and will form the basis of the lending decision.` },
        { heading: 'Total Cost of Purchase', body: `For a new build at \u20AC${fmt(avgPrice)} with a 65% mortgage: deposit \u20AC${fmt(Math.round(avgPrice * 0.35))}, VAT (10%) \u20AC${fmt(Math.round(avgPrice * 0.10))}, stamp duty (1.2%) \u20AC${fmt(Math.round(avgPrice * 0.012))}, legal fees (~1%) \u20AC${fmt(Math.round(avgPrice * 0.01))}, notary/registry \u20AC1,500, mortgage arrangement (~0.75%) \u20AC${fmt(Math.round(avgPrice * 0.65 * 0.0075))}, valuation \u20AC400. Total upfront cost approximately \u20AC${fmt(Math.round(avgPrice * 0.35 + avgPrice * 0.13))}. Monthly payments on a \u20AC${fmt(Math.round(avgPrice * 0.65))} mortgage at 4.5% over 20 years: approximately \u20AC${fmt(Math.round(avgPrice * 0.65 * 0.00633))}.` },
        { heading: 'Mortgage vs Cash Purchase', body: `Of the ${total} properties tracked, the average gross yield is ${pct(avgYield)}%. A leveraged purchase at 65% LTV can amplify returns on equity: if the property yields ${pct(avgYield)}% gross on the full value, the return on invested equity is significantly higher after debt service. However, mortgage costs (interest, arrangement fees) reduce net yield. At current rates, the cash-on-cash return for a leveraged purchase typically exceeds the unleveraged yield when gross yields exceed approximately 5%. Properties with yields below 4% may generate negative cash flow after mortgage payments.` },
        { heading: 'Practical Recommendations', body: `Start the mortgage process early \u2014 obtain an agreement in principle before committing to a property. Compare offers from at least 3 banks or use a specialist mortgage broker for non-residents. Factor in all costs when calculating your budget: purchase price + 12\u201314% acquisition costs + deposit = total cash needed. Consider fixing your rate if you are risk-averse, as variable rates carry exposure to Euribor movements. Ensure your mortgage offer includes the option for early repayment without excessive penalties (typical penalty: 0\u20130.5% for variable rate, 0\u20132% for fixed).` },
      ],
      faqs: [
        { q: 'Can foreigners get a mortgage in Spain?', a: 'Yes. Spanish banks offer mortgages to non-residents at 60-70% LTV with rates from 3.5-5.5%.' },
        { q: 'What deposit do I need for a Spanish mortgage?', a: `Typically 30-40% of the purchase price plus 12-14% for taxes and fees. On a \u20AC${fmt(avgPrice)} property, total cash needed is approximately \u20AC${fmt(Math.round(avgPrice * 0.35 + avgPrice * 0.13))}.` },
        { q: 'How long does a Spanish mortgage application take?', a: 'Processing typically takes 4-8 weeks from application to offer. Start early and have all documentation ready.' },
        { q: 'What are the monthly payments on a Spanish mortgage?', a: `On the average property at \u20AC${fmt(avgPrice)} with 65% LTV at 4.5% over 20 years: approximately \u20AC${fmt(Math.round(avgPrice * 0.65 * 0.00633))} per month.` },
      ],
      relatedLinks,
    };
  }

  /* ---------- Golden Visa ---------- */
  if (kw.isGoldenVisa) {
    return {
      title: `Spain Golden Visa Property Investment \u2014 Requirements and Analysis`,
      description: `Spain\u2019s Golden Visa property route: \u20AC500,000 minimum, residency for non-EU buyers. ${luxuryProps.length} qualifying properties in our database.`,
      summary: `Spain\u2019s Golden Visa requires a minimum property investment of \u20AC500,000 and grants residency to non-EU buyers and their families. Our database contains ${luxuryProps.length} properties at or above this threshold, averaging \u20AC${fmt(Math.round(avg(luxuryProps.map((p) => p.pf))))} with ${pct(avg(luxuryProps.filter((p) => p._yield).map((p) => p._yield!.gross)))}% gross yield.`,
      stats: [
        { label: 'Minimum Investment', value: '\u20AC500,000' },
        { label: 'Qualifying Properties', value: fmt(luxuryProps.length) },
        { label: 'Avg Qualifying Price', value: `\u20AC${fmt(Math.round(avg(luxuryProps.map((p) => p.pf))))}` },
        { label: 'Avg Yield (500k+)', value: `${pct(avg(luxuryProps.filter((p) => p._yield).map((p) => p._yield!.gross)))}%` },
        { label: 'Avg Score (500k+)', value: `${Math.round(avg(luxuryProps.filter((p) => p._sc).map((p) => p._sc!)))}/100` },
        { label: 'Residency Renewal', value: 'Every 2 yrs' },
      ],
      sections: [
        { heading: 'Golden Visa Requirements', body: `Spain\u2019s Golden Visa programme grants residency permits to non-EU nationals who invest a minimum of \u20AC500,000 in real estate. The investment can be spread across multiple properties provided the total reaches the threshold. The initial visa is valid for 2 years and renewable for 5-year periods, provided the investment is maintained. Holders can live, work, and travel freely within the Schengen Area. Family members (spouse, children under 18, and dependent parents) are included. Note: The programme has faced political scrutiny and may be modified \u2014 legal advice on current status is recommended before committing.` },
        { heading: 'Qualifying Properties', body: `Our database contains ${luxuryProps.length} properties priced at \u20AC500,000 or above, qualifying for the Golden Visa. These average \u20AC${fmt(Math.round(avg(luxuryProps.map((p) => p.pf))))} with ${pct(avg(luxuryProps.filter((p) => p._yield).map((p) => p._yield!.gross)))}% gross yield. Top locations for Golden Visa purchases: ${[...new Set(luxuryProps.map((p) => p.l))].slice(0, 5).join(', ')}. Property types include ${[...new Set(luxuryProps.map((p) => p.t))].join(', ')}. The average built area for qualifying properties is ${Math.round(avg(luxuryProps.map((p) => p.bm)))} m\u00B2 with ${Math.round(avg(luxuryProps.map((p) => p.bd)))} bedrooms.` },
        { heading: 'Application Process', body: `The Golden Visa application process: 1) Obtain a NIE number, 2) Open a Spanish bank account, 3) Complete the property purchase(s) totalling \u20AC500,000+, 4) Apply for the Golden Visa at the Spanish consulate or, if already in Spain, at the relevant immigration office (Oficina de Extranjer\u00EDa). Required documents: valid passport, proof of property ownership, proof of investment amount, clean criminal record certificate, health insurance covering Spain, and proof of sufficient financial means. Processing typically takes 20\u201345 business days. The visa allows work in Spain and multiple entries to the Schengen Area.` },
        { heading: 'Investment Analysis', body: `Golden Visa properties (those at \u20AC500,000+) show an average score of ${Math.round(avg(luxuryProps.filter((p) => p._sc).map((p) => p._sc!)))}/100, compared to the overall market average of ${avgScore}/100. The yield at this price point (${pct(avg(luxuryProps.filter((p) => p._yield).map((p) => p._yield!.gross)))}%) is typically lower than the overall market (${pct(avgYield)}%), as premium properties command higher prices relative to rental income. However, capital preservation and appreciation potential are generally stronger for well-located luxury properties. Consider whether the residency benefit justifies the premium price point versus a pure investment strategy at lower price points.` },
        { heading: 'Comparing the Golden Visa to Alternatives', body: `Spain\u2019s \u20AC500,000 threshold positions it competitively among European Golden Visa programmes. Portugal terminated its property-based Golden Visa in 2023. Greece requires \u20AC250,000\u2013\u20AC500,000 depending on location. For investors primarily motivated by returns rather than residency, the data shows that properties in the \u20AC150,000\u2013\u20AC300,000 range deliver higher yields (avg ${pct(avg(properties.filter((p) => p.pf >= 150000 && p.pf <= 300000 && p._yield).map((p) => p._yield!.gross)))}%) than the Golden Visa segment. The decision should weigh the residency value against the opportunity cost of deploying capital at a higher price point.` },
      ],
      faqs: [
        { q: 'What is the minimum investment for a Spanish Golden Visa?', a: '\u20AC500,000 in real estate. The investment can be across multiple properties.' },
        { q: 'How many properties qualify for the Golden Visa?', a: `Our database has ${luxuryProps.length} properties at \u20AC500,000+, with an average price of \u20AC${fmt(Math.round(avg(luxuryProps.map((p) => p.pf))))}.` },
        { q: 'Can I rent out a Golden Visa property?', a: 'Yes. There are no restrictions on renting. Average gross yield for qualifying properties is ' + pct(avg(luxuryProps.filter((p) => p._yield).map((p) => p._yield!.gross))) + '%.' },
        { q: 'Does the Golden Visa include family members?', a: 'Yes. Spouse, children under 18, and dependent parents can be included in the application.' },
      ],
      relatedLinks,
    };
  }

  /* ---------- Pool / Beach / Golf / Energy / Amenity topics ---------- */
  if (kw.isPool || kw.isBeach || kw.isGolf) {
    const amenityLabel = kw.isPool ? 'Pool' : kw.isBeach ? 'Beach Proximity' : 'Golf';
    const amenityProps = kw.isPool ? poolProps : kw.isBeach ? beachProps : golfProps;
    const nonAmenityProps = properties.filter((p) => !amenityProps.includes(p));
    const amenAvgPrice = Math.round(avg(amenityProps.map((p) => p.pf)));
    const nonAmenAvgPrice = Math.round(avg(nonAmenityProps.map((p) => p.pf)));
    const premium = nonAmenAvgPrice > 0 ? ((amenAvgPrice - nonAmenAvgPrice) / nonAmenAvgPrice * 100) : 0;
    const amenYield = avg(amenityProps.filter((p) => p._yield).map((p) => p._yield!.gross));
    const nonAmenYield = avg(nonAmenityProps.filter((p) => p._yield).map((p) => p._yield!.gross));

    return {
      title: `${amenityLabel} Properties in Spain \u2014 Price Premium and Investment Analysis`,
      description: `${amenityLabel} properties in Spain: ${amenityProps.length} listings, avg \u20AC${fmt(amenAvgPrice)}, ${pct(premium)}% premium, ${pct(amenYield)}% yield. Data-backed analysis.`,
      summary: `Properties with ${amenityLabel.toLowerCase()} access represent ${amenityProps.length} of ${total} tracked listings (${pct(amenityProps.length / total * 100)}%). They command an average price of \u20AC${fmt(amenAvgPrice)}, a ${pct(premium)}% premium over non-${amenityLabel.toLowerCase()} properties, with a gross yield of ${pct(amenYield)}%.`,
      stats: [
        { label: `${amenityLabel} Properties`, value: fmt(amenityProps.length) },
        { label: 'Share of Market', value: `${pct(amenityProps.length / total * 100)}%` },
        { label: `Avg Price (${amenityLabel})`, value: `\u20AC${fmt(amenAvgPrice)}` },
        { label: 'Avg Price (Without)', value: `\u20AC${fmt(nonAmenAvgPrice)}` },
        { label: 'Price Premium', value: `${pct(premium)}%` },
        { label: `Yield (${amenityLabel})`, value: `${pct(amenYield)}%` },
      ],
      sections: [
        { heading: `${amenityLabel} Market Overview`, body: `Of the ${total} new-build properties tracked, ${amenityProps.length} (${pct(amenityProps.length / total * 100)}%) feature ${amenityLabel.toLowerCase()} access. These properties average \u20AC${fmt(amenAvgPrice)} compared to \u20AC${fmt(nonAmenAvgPrice)} for properties without, representing a ${pct(premium)}% price premium. The average built area for ${amenityLabel.toLowerCase()} properties is ${Math.round(avg(amenityProps.map((p) => p.bm)))} m\u00B2 versus ${Math.round(avg(nonAmenityProps.map((p) => p.bm)))} m\u00B2 for others. The investment score averages ${Math.round(avg(amenityProps.filter((p) => p._sc).map((p) => p._sc!)))}/100 compared to ${Math.round(avg(nonAmenityProps.filter((p) => p._sc).map((p) => p._sc!)))}/100.` },
        { heading: 'Yield Impact', body: `${amenityLabel} properties generate ${pct(amenYield)}% gross yield on average, compared to ${pct(nonAmenYield)}% for properties without. ${amenYield > nonAmenYield ? `The yield advantage of ${pct(amenYield - nonAmenYield)} percentage points suggests that rental income uplift from ${amenityLabel.toLowerCase()} access more than compensates for the higher purchase price.` : amenYield < nonAmenYield ? `Despite the price premium, ${amenityLabel.toLowerCase()} properties yield slightly less, suggesting the premium reflects lifestyle value and capital growth expectations rather than pure income return.` : 'Yields are comparable, suggesting the rental premium roughly matches the price premium.'} Holiday rental data consistently shows ${kw.isPool ? 'pool' : kw.isBeach ? 'beach proximity' : 'golf access'} as a top-3 factor in guest booking decisions for Spanish coastal properties.` },
        { heading: 'Regional Distribution', body: `${amenityLabel} properties are distributed across the following costas: ${costas.map((c) => { const cProps = amenityProps.filter((p) => p.costa === c.costa); return cProps.length > 0 ? `${c.costa} (${cProps.length})` : null; }).filter(Boolean).join(', ')}. The highest concentration by town: ${[...new Map(amenityProps.map((p) => [p.l, p])).values()].reduce((acc, p) => { const existing = acc.find((a) => a.town === p.l); if (existing) existing.count++; else acc.push({ town: p.l, count: 1 }); return acc; }, [] as { town: string; count: number }[]).sort((a, b) => b.count - a.count).slice(0, 5).map((t) => `${t.town} (${t.count})`).join(', ')}. Location selection within the ${amenityLabel.toLowerCase()} segment can significantly impact both price and yield outcomes.` },
        { heading: 'Investment Considerations', body: `When evaluating ${amenityLabel.toLowerCase()} properties, consider: 1) The price premium of ${pct(premium)}% is justified only if supported by higher rental rates or stronger capital growth. 2) ${kw.isPool ? 'Pool type matters \u2014 private pools command higher rental rates than communal, but also incur maintenance costs of \u20AC1,000\u2013\u20AC3,000/year.' : kw.isBeach ? 'Beach distance is a gradient \u2014 frontline properties command the highest premium, but those within 500m still capture most of the rental uplift.' : 'Golf properties attract a specific demographic \u2014 typically higher-spending, longer-staying guests who book outside peak summer season, extending the rental calendar.'} 3) Resale liquidity is generally stronger for ${amenityLabel.toLowerCase()} properties as they appeal to both investors and lifestyle buyers.` },
        { heading: 'Top-Scoring ${amenityLabel} Properties', body: `The highest-scoring ${amenityLabel.toLowerCase()} properties: ${[...amenityProps].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, 5).map((p, i) => `${i + 1}. ${p.p} in ${p.l} \u2014 ${Math.round(p._sc ?? 0)}/100, \u20AC${fmt(p.pf)}, ${p._yield ? pct(p._yield.gross) + '% yield' : 'yield TBC'}`).join('. ')}. These properties combine the ${amenityLabel.toLowerCase()} amenity with strong value metrics and competitive yields. We recommend using our comparison tool to evaluate these against non-${amenityLabel.toLowerCase()} alternatives at similar price points.` },
      ],
      faqs: [
        { q: `How much more do ${amenityLabel.toLowerCase()} properties cost in Spain?`, a: `${amenityLabel} properties command a ${pct(premium)}% premium on average (\u20AC${fmt(amenAvgPrice)} vs \u20AC${fmt(nonAmenAvgPrice)}).` },
        { q: `Do ${amenityLabel.toLowerCase()} properties generate higher rental yields?`, a: `${amenityLabel} properties yield ${pct(amenYield)}% vs ${pct(nonAmenYield)}% without. ${amenYield > nonAmenYield ? 'Yes, the yield uplift exceeds the price premium.' : 'The premium is reflected in price rather than yield.'}` },
        { q: `How many ${amenityLabel.toLowerCase()} properties are available?`, a: `${amenityProps.length} of ${total} properties (${pct(amenityProps.length / total * 100)}%) feature ${amenityLabel.toLowerCase()} access.` },
        { q: `Where are the best ${amenityLabel.toLowerCase()} properties in Spain?`, a: `Top-scoring locations: ${[...amenityProps].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, 3).map((p) => `${p.l} (${Math.round(p._sc ?? 0)}/100)`).join(', ')}.` },
      ],
      relatedLinks,
    };
  }

  /* ---------- NIE / Buying Process ---------- */
  if (kw.isNIE || kw.isBuyingProcess) {
    const isNIE = kw.isNIE;
    return {
      title: isNIE ? 'NIE Number Spain \u2014 Complete Application Guide' : 'Spain Property Buying Process \u2014 Step-by-Step Guide',
      description: isNIE ? `How to get a NIE number in Spain: application, documents, costs, and timeline. Essential for buying property (${total} new builds tracked).` : `Complete guide to buying property in Spain: reservation, contracts, completion. ${total} properties from \u20AC${fmt(Math.min(...properties.map((p) => p.pf)))} to \u20AC${fmt(Math.max(...properties.map((p) => p.pf)))}.`,
      summary: isNIE ? `A NIE (N\u00FAmero de Identificaci\u00F3n de Extranjero) is mandatory for all foreign property buyers in Spain. The application takes 2\u20134 weeks and costs approximately \u20AC12. Without a NIE, you cannot purchase property, open a bank account, or sign contracts in Spain.` : `Buying property in Spain involves reservation (typically \u20AC3,000\u2013\u20AC10,000), private purchase contract (30\u201340% deposit), and completion at the notary. The full process takes 6\u20138 weeks for key-ready properties and 12\u201324 months for off-plan. Total costs run 12\u201314% above the purchase price.`,
      stats: isNIE ? [
        { label: 'NIE Fee', value: '~\u20AC12' },
        { label: 'Processing Time', value: '2\u20134 weeks' },
        { label: 'Validity', value: 'Lifetime' },
        { label: 'Required For', value: 'All transactions' },
        { label: 'Properties Available', value: fmt(total) },
        { label: 'Avg Property Price', value: `\u20AC${fmt(avgPrice)}` },
      ] : [
        { label: 'Reservation Deposit', value: '\u20AC3\u201310k' },
        { label: 'Contract Deposit', value: '30\u201340%' },
        { label: 'Purchase Taxes', value: '~11.2%' },
        { label: 'Total Fees', value: '12\u201314%' },
        { label: 'Key-Ready Timeline', value: '6\u20138 weeks' },
        { label: 'Off-Plan Timeline', value: '12\u201324 months' },
      ],
      sections: isNIE ? [
        { heading: 'What is a NIE Number?', body: `The NIE (N\u00FAmero de Identificaci\u00F3n de Extranjero) is a unique identification number assigned to foreign nationals for all financial and legal transactions in Spain. It is required for purchasing property, opening a bank account, paying taxes, signing utility contracts, and virtually all official transactions. The number is issued for life and does not expire, though the accompanying certificate may need renewal. Every buyer of Spanish property \u2014 whether from the EU or outside \u2014 must obtain a NIE before the purchase can be completed.` },
        { heading: 'How to Apply', body: `There are three ways to obtain a NIE: 1) In person at a Spanish police station (Comsar\u00EDa de Polic\u00EDa) with a foreigner\u2019s office. Book an appointment online through the Sede Electr\u00F3nica website. 2) At the Spanish consulate or embassy in your home country. Processing is typically faster but availability varies. 3) Through a legal representative in Spain using a power of attorney (poder notarial). Most property lawyers can handle this on your behalf. The in-person route in Spain typically requires an appointment (cita previa), which can be competitive in popular areas during peak seasons.` },
        { heading: 'Required Documents', body: `For a NIE application you need: completed EX-15 application form, valid passport plus photocopy, two passport-sized photographs, proof of reason for application (property reservation document, employment contract, etc.), and the fee payment receipt (Modelo 790, paid at a Spanish bank, approximately \u20AC12). If applying through a representative, you will also need a notarised power of attorney. Some offices may request additional documentation such as proof of address or travel itinerary. Requirements can vary slightly between offices, so confirm with your specific location in advance.` },
        { heading: 'Timeline and Tips', body: `Processing times range from same-day to 4 weeks depending on the office and season. Tips: apply as early as possible in your property search, ideally before committing to a purchase. Summer months (June\u2013September) see higher demand and longer waits. The Madrid and Alicante offices tend to have faster processing. Your lawyer can often expedite the process. Once assigned, your NIE remains valid permanently. Keep multiple copies of the NIE certificate as it is required for all property-related transactions including the purchase, utility connections, insurance, and annual tax filings.` },
        { heading: 'NIE in the Property Purchase Context', body: `In the context of buying one of the ${total} properties tracked in our database (average price \u20AC${fmt(avgPrice)}), the NIE is needed at multiple stages: opening your Spanish bank account (where you will deposit funds), signing the reservation agreement, signing the private purchase contract, obtaining a mortgage (if applicable), and completing at the notary. Without a NIE, none of these steps can proceed. Many buyers grant power of attorney to their lawyer, allowing the lawyer to obtain the NIE and handle subsequent steps. This is particularly useful for international buyers who cannot easily travel to Spain multiple times.` },
      ] : [
        { heading: 'Step 1: Research and Selection', body: `The buying process begins with identifying suitable properties. Our database tracks ${total} new builds across Spain\u2019s coast, with prices from \u20AC${fmt(Math.min(...properties.map((p) => p.pf)))} to \u20AC${fmt(Math.max(...properties.map((p) => p.pf)))} and an average investment score of ${avgScore}/100. Key factors to evaluate: location, price per square metre, rental yield potential, developer track record, completion date, and proximity to amenities. We recommend shortlisting 3\u20135 properties and visiting each before making a decision. Engage an independent lawyer early in the process.` },
        { heading: 'Step 2: Reservation', body: `Once you have selected a property, the process starts with a reservation agreement and deposit, typically \u20AC3,000\u2013\u20AC10,000 (varies by developer). This takes the property off the market for an agreed period (usually 2\u20134 weeks) while due diligence is completed. Your lawyer should verify: the developer\u2019s building licence (licencia de obra), land registry status, planning permissions, and the developer\u2019s financial standing. For new builds, also confirm bank guarantee coverage (garant\u00EDa bancaria) protecting stage payments if the developer fails to complete.` },
        { heading: 'Step 3: Private Purchase Contract', body: `After due diligence, you sign the private purchase contract (contrato privado de compraventa), typically paying 30\u201340% of the purchase price. This contract is legally binding on both parties. For off-plan properties, the remaining balance is paid in stages during construction, with the final 60\u201370% due at completion. For key-ready properties, the balance is paid at completion (escritura). All stage payments should be protected by bank guarantees under Spanish law. Your lawyer reviews the contract before signing, ensuring penalty clauses, completion dates, specifications, and warranty terms are acceptable.` },
        { heading: 'Step 4: Completion (Escritura)', body: `Completion takes place at a Spanish notary (notar\u00EDa). The notary reads the deed of sale (escritura p\u00FAblica), both parties sign, and the balance of the purchase price is paid (typically by banker\u2019s draft). The notary verifies identities, checks for outstanding debts on the property, and ensures all taxes are paid. The deed is then registered at the Land Registry (Registro de la Propiedad), which typically takes 2\u20134 weeks. If you cannot attend in person, your lawyer can sign on your behalf with power of attorney. Keys are handed over at completion.` },
        { heading: 'Costs Summary', body: `Total purchase costs for a new build at the average price of \u20AC${fmt(avgPrice)}: IVA (10%) \u20AC${fmt(Math.round(avgPrice * 0.10))}, stamp duty AJD (1.2%) \u20AC${fmt(Math.round(avgPrice * 0.012))}, notary fees \u20AC600\u2013\u20AC1,200, land registry \u20AC400\u2013\u20AC800, legal fees (1\u20131.5%) \u20AC${fmt(Math.round(avgPrice * 0.0125))}. If mortgage: valuation \u20AC300\u2013\u20AC500, bank arrangement fee (0.5\u20131%) \u20AC${fmt(Math.round(avgPrice * 0.65 * 0.0075))}. Total additional costs: approximately \u20AC${fmt(Math.round(avgPrice * 0.13))} (12\u201314% of purchase price). Budget accordingly and ensure all funds are transferred to your Spanish bank account before completion.` },
      ],
      faqs: isNIE ? [
        { q: 'How long does it take to get a NIE in Spain?', a: 'Processing takes 1 day to 4 weeks depending on the office and season. Apply early in your property search.' },
        { q: 'How much does a NIE cost?', a: 'The government fee is approximately \u20AC12. If using a lawyer, their handling fee is typically \u20AC100\u2013\u20AC200.' },
        { q: 'Can I buy property in Spain without a NIE?', a: 'No. A NIE is legally required for all property transactions, bank accounts, and tax obligations in Spain.' },
        { q: 'Can my lawyer get a NIE on my behalf?', a: 'Yes, with a notarised power of attorney (poder notarial), your lawyer can apply for and collect your NIE.' },
      ] : [
        { q: 'How long does it take to buy property in Spain?', a: 'Key-ready: 6-8 weeks from reservation. Off-plan: 12-24 months depending on construction stage.' },
        { q: 'What deposit do I need to buy in Spain?', a: 'Reservation: \u20AC3,000-\u20AC10,000. Contract: 30-40% of purchase price. Total cash needed: purchase price + 12-14% for taxes/fees.' },
        { q: 'Do I need a lawyer to buy property in Spain?', a: 'Not legally required, but strongly recommended. Independent legal representation costs 1-1.5% and protects your interests.' },
        { q: 'What are the total buying costs in Spain?', a: `Approximately 12-14% above the purchase price. On the average property at \u20AC${fmt(avgPrice)}, that is ~\u20AC${fmt(Math.round(avgPrice * 0.13))}.` },
      ],
      relatedLinks,
    };
  }

  /* ---------- Off-plan vs key-ready ---------- */
  if (kw.isOffPlan) {
    const offPlan = properties.filter((p) => p.s === 'off-plan' || p.c.toLowerCase().includes('2026') || p.c.toLowerCase().includes('2027') || p.c.toLowerCase().includes('2028'));
    const keyReady = properties.filter((p) => p.s === 'key-ready' || p.c.toLowerCase().includes('ready') || p.c.toLowerCase().includes('completed'));
    const opAvgPrice = Math.round(avg(offPlan.map((p) => p.pf)));
    const krAvgPrice = Math.round(avg(keyReady.map((p) => p.pf)));
    const opAvgPm2 = Math.round(avg(offPlan.filter((p) => p.pm2).map((p) => p.pm2!)));
    const krAvgPm2 = Math.round(avg(keyReady.filter((p) => p.pm2).map((p) => p.pm2!)));

    return {
      title: `Off-Plan vs Key-Ready Property in Spain \u2014 Which Is Better?`,
      description: `Comparing off-plan and key-ready new builds in Spain: ${offPlan.length} off-plan vs ${keyReady.length} key-ready properties. Prices, yields, and risk analysis.`,
      summary: `Off-plan properties (${offPlan.length} listings) average \u20AC${fmt(opAvgPrice)} (\u20AC${fmt(opAvgPm2)}/m\u00B2), while key-ready properties (${keyReady.length} listings) average \u20AC${fmt(krAvgPrice)} (\u20AC${fmt(krAvgPm2)}/m\u00B2). Off-plan typically offers 10\u201320% savings but carries construction and completion risk.`,
      stats: [
        { label: 'Off-Plan Count', value: fmt(offPlan.length) },
        { label: 'Key-Ready Count', value: fmt(keyReady.length) },
        { label: 'Off-Plan Avg Price', value: `\u20AC${fmt(opAvgPrice)}` },
        { label: 'Key-Ready Avg Price', value: `\u20AC${fmt(krAvgPrice)}` },
        { label: 'Off-Plan Avg/m\u00B2', value: `\u20AC${fmt(opAvgPm2)}` },
        { label: 'Key-Ready Avg/m\u00B2', value: `\u20AC${fmt(krAvgPm2)}` },
      ],
      sections: [
        { heading: 'What Is Off-Plan vs Key-Ready?', body: `Off-plan properties are purchased during the planning or construction phase, before the building is completed. Buyers typically pay in stages: a reservation fee, followed by 30\u201340% at contract signing, with the balance at completion (12\u201324 months later). Key-ready properties are completed and available for immediate occupation or rental. Of the ${total} properties we track, ${offPlan.length} are classified as off-plan and ${keyReady.length} as key-ready. The choice between them depends on your investment timeline, risk tolerance, and capital structure.` },
        { heading: 'Price Advantage', body: `Off-plan properties average \u20AC${fmt(opAvgPrice)} (\u20AC${fmt(opAvgPm2)}/m\u00B2) versus key-ready at \u20AC${fmt(krAvgPrice)} (\u20AC${fmt(krAvgPm2)}/m\u00B2). ${opAvgPm2 < krAvgPm2 ? `This represents a ${pct((krAvgPm2 - opAvgPm2) / krAvgPm2 * 100)}% discount per square metre for off-plan purchases.` : 'Price differences vary by location and development.'} The off-plan discount reflects the time value of money (capital tied up without rental income during construction), construction risk, and the developer\u2019s need to secure pre-sales for project financing. Early-phase off-plan purchases often secure the best units and prices.` },
        { heading: 'Risk Analysis', body: `Off-plan risks include: construction delays (common in Spain, typically 3\u20136 months), specification changes, developer insolvency (mitigated by mandatory bank guarantees under Spanish law), and market price movement during the construction period. Key-ready risks are lower but include: higher entry price, potential for hidden defects (10-year structural warranty applies), and immediate exposure to market conditions. Spanish law requires developers to provide bank guarantees (garant\u00EDa bancaria) protecting all off-plan stage payments if the project is not completed, providing significant buyer protection.` },
        { heading: 'Income Timeline', body: `Key-ready properties generate rental income immediately after purchase and furnishing (typically 2\u20134 weeks). Off-plan properties produce zero income during the construction period (12\u201324 months). However, off-plan buyers have lower capital exposure during construction (only staged payments). On the average key-ready property at \u20AC${fmt(krAvgPrice)} yielding ${pct(avg(keyReady.filter((p) => p._yield).map((p) => p._yield!.gross)))}%, the first-year rental income could be approximately \u20AC${fmt(Math.round(krAvgPrice * avg(keyReady.filter((p) => p._yield).map((p) => p._yield!.gross)) / 100))}. Off-plan buyers forgo this income but may achieve higher capital gains at completion.` },
        { heading: 'Which Should You Choose?', body: `Choose off-plan if: you have a 2+ year investment horizon, want to maximise capital growth, prefer lower initial capital commitment, and can tolerate construction delays. Choose key-ready if: you want immediate rental income, prefer lower risk, need a holiday home now, or are financing with a mortgage (banks prefer completed properties). For pure investors, a blended strategy (some off-plan for growth, some key-ready for income) can optimise the portfolio. Properties scoring above ${avgScore}/100 on our investment metric warrant deeper analysis regardless of completion status.` },
      ],
      faqs: [
        { q: 'Is off-plan cheaper than key-ready in Spain?', a: `Generally yes. Off-plan averages \u20AC${fmt(opAvgPm2)}/m\u00B2 versus key-ready at \u20AC${fmt(krAvgPm2)}/m\u00B2 in our database.` },
        { q: 'Is my money protected when buying off-plan in Spain?', a: 'Yes. Spanish law requires developers to provide bank guarantees (garant\u00EDa bancaria) for all stage payments on off-plan properties.' },
        { q: 'How long does off-plan construction take?', a: 'Typically 12-24 months from purchase to completion, with possible delays of 3-6 months.' },
        { q: 'Can I get a mortgage on off-plan property?', a: 'Some banks offer mortgages for off-plan with drawdown at completion. Most buyers arrange financing 3-6 months before completion.' },
      ],
      relatedLinks,
    };
  }

  /* ---------- Retirement ---------- */
  if (kw.isRetirement) {
    const retirementProps = properties.filter((p) => p.pf >= 100000 && p.pf <= 400000 && p.bd >= 2);
    return {
      title: `Spain Property for Retirement \u2014 Best Locations and Prices`,
      description: `Retiring to Spain: ${retirementProps.length} suitable properties, avg \u20AC${fmt(Math.round(avg(retirementProps.map((p) => p.pf))))}. Location guide, costs, healthcare, and lifestyle analysis.`,
      summary: `Spain offers ${retirementProps.length} new-build properties in the ideal retirement budget range (\u20AC100k\u2013\u20AC400k, 2+ bedrooms), averaging \u20AC${fmt(Math.round(avg(retirementProps.map((p) => p.pf))))}. The combination of climate, healthcare quality, lower cost of living, and established expat communities makes Spain one of Europe\u2019s top retirement destinations.`,
      stats: [
        { label: 'Retirement-Range Properties', value: fmt(retirementProps.length) },
        { label: 'Avg Price (\u20AC100k-400k)', value: `\u20AC${fmt(Math.round(avg(retirementProps.map((p) => p.pf))))}` },
        { label: 'Avg Built Area', value: `${Math.round(avg(retirementProps.map((p) => p.bm)))} m\u00B2` },
        { label: 'With Pool', value: `${filterPool(retirementProps).length}` },
        { label: 'Near Beach (<2km)', value: `${filterBeachClose(retirementProps).length}` },
        { label: 'Avg Score', value: `${Math.round(avg(retirementProps.filter((p) => p._sc).map((p) => p._sc!)))}/100` },
      ],
      sections: [
        { heading: 'Why Retire to Spain?', body: `Spain consistently ranks among the world\u2019s top retirement destinations. Key attractions: over 300 days of sunshine per year, high-quality public and private healthcare (ranked 7th globally), cost of living approximately 30\u201340% lower than the UK and Scandinavia, excellent infrastructure, established international communities, and direct flight connections to major European cities. Our database shows ${retirementProps.length} new-build properties in the \u20AC100,000\u2013\u20AC400,000 range with 2 or more bedrooms \u2014 the sweet spot for retirement purchases.` },
        { heading: 'Best Locations for Retirement', body: `Top retirement locations by investment score (within the \u20AC100k\u2013\u20AC400k range): ${[...new Map(retirementProps.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).map((p) => [p.l, p])).values()].slice(0, 5).map((p) => `${p.l} (${Math.round(p._sc ?? 0)}/100, avg \u20AC${fmt(p.pf)})`).join(', ')}. Key factors for retirees: proximity to healthcare, airport accessibility, size of expat community, local amenities, and climate. The Costa Blanca and Costa Calida are particularly popular with Northern European retirees due to their dry climates, affordable living, and established support networks.` },
        { heading: 'Healthcare in Spain', body: `Spain\u2019s healthcare system is highly regarded. EU/EEA citizens can access public healthcare through the S1 form (if receiving a state pension) or by registering in the social security system. Private healthcare insurance is recommended and costs approximately \u20AC100\u2013\u20AC300 per month depending on age and coverage level. Most coastal towns have health centres (centros de salud) and hospitals with English-speaking staff. Dental care is not covered by public healthcare but is significantly cheaper than in Northern Europe. Prescription medications are also substantially less expensive.` },
        { heading: 'Cost of Living', body: `Monthly cost of living for a retired couple in Spain (excluding housing): groceries \u20AC400\u2013\u20AC600, utilities \u20AC100\u2013\u20AC200, healthcare insurance \u20AC200\u2013\u20AC400, community fees \u20AC50\u2013\u20AC200, IBI (property tax) \u20AC30\u2013\u20AC100/month, car insurance \u20AC30\u2013\u20AC60, dining out \u20AC200\u2013\u20AC400, miscellaneous \u20AC200\u2013\u20AC400. Total: approximately \u20AC1,200\u2013\u20AC2,300 per month. This compares favourably to the UK (\u20AC1,800\u2013\u20AC3,200), Norway (\u20AC2,500\u2013\u20AC4,000), and Sweden (\u20AC2,000\u2013\u20AC3,500). The combination of lower costs and better climate delivers significant quality-of-life gains.` },
        { heading: 'Residency and Bureaucracy', body: `EU/EEA citizens can register as residents with proof of income or savings (\u20AC6,000+ in savings or sufficient pension income, plus health insurance). Non-EU citizens need a visa (non-lucrative visa for retirees, requiring proof of passive income of approximately \u20AC28,800/year for one person). All residents need: a NIE number, a padron (municipal registration), SIP health card (if eligible for public healthcare), and to register with the tax authorities. The process is well-established and straightforward with professional assistance. Consider engaging a gestor (administrative agent) to handle bureaucratic procedures.` },
        { heading: 'Property Selection for Retirement', body: `For retirement living, prioritise: single-level or lift-accessible properties, proximity to healthcare and shops, good community infrastructure (pools, gardens), reliable internet (for staying connected with family), and established neighbourhoods over remote locations. Of the ${retirementProps.length} suitable properties, ${filterPool(retirementProps).length} include pool access and ${filterBeachClose(retirementProps).length} are within 2 km of beaches. The average built area of ${Math.round(avg(retirementProps.map((p) => p.bm)))} m\u00B2 provides comfortable living space. New builds offer the advantage of modern insulation, energy efficiency, and warranty coverage.` },
      ],
      faqs: [
        { q: 'How much does it cost to retire to Spain?', a: `Monthly living costs for a couple: approximately \u20AC1,200\u2013\u20AC2,300 excluding housing. Property: ${retirementProps.length} options from \u20AC100,000\u2013\u20AC400,000.` },
        { q: 'Can I access healthcare in Spain as a retiree?', a: 'EU/EEA retirees can access public healthcare via the S1 form. Private insurance costs \u20AC100-\u20AC300/month.' },
        { q: 'What visa do I need to retire to Spain?', a: 'EU/EEA citizens register as residents. Non-EU citizens need a non-lucrative visa requiring proof of ~\u20AC28,800/year passive income.' },
        { q: 'Where is the best place to retire in Spain?', a: `Top-scoring retirement locations: ${[...new Map(retirementProps.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).map((p) => [p.l, p])).values()].slice(0, 3).map((p) => p.l).join(', ')}.` },
      ],
      relatedLinks,
    };
  }

  /* ---------- Cheapest / Best yield ---------- */
  if (kw.isCheapest) {
    return {
      title: `Cheapest New Builds in Spain \u2014 ${cheapProps.length} Properties Under \u20AC200,000`,
      description: `Spain\u2019s cheapest new builds: ${cheapProps.length} properties under \u20AC200k, avg \u20AC${fmt(Math.round(avg(cheapProps.map((p) => p.pf))))}, ${pct(avg(cheapProps.filter((p) => p._yield).map((p) => p._yield!.gross)))}% yield.`,
      summary: `There are ${cheapProps.length} new-build properties priced under \u20AC200,000 in our database, averaging \u20AC${fmt(Math.round(avg(cheapProps.map((p) => p.pf))))} with ${pct(avg(cheapProps.filter((p) => p._yield).map((p) => p._yield!.gross)))}% gross yield and a score of ${Math.round(avg(cheapProps.filter((p) => p._sc).map((p) => p._sc!)))}/100.`,
      stats: [
        { label: 'Under \u20AC200k', value: fmt(cheapProps.length) },
        { label: 'Avg Price', value: `\u20AC${fmt(Math.round(avg(cheapProps.map((p) => p.pf))))}` },
        { label: 'Avg Yield', value: `${pct(avg(cheapProps.filter((p) => p._yield).map((p) => p._yield!.gross)))}%` },
        { label: 'Avg Score', value: `${Math.round(avg(cheapProps.filter((p) => p._sc).map((p) => p._sc!)))}/100` },
        { label: 'Avg Built Area', value: `${Math.round(avg(cheapProps.map((p) => p.bm)))} m\u00B2` },
        { label: 'Avg Bedrooms', value: pct(avg(cheapProps.map((p) => p.bd))) },
      ],
      sections: [
        { heading: 'Budget New Builds Overview', body: `The Spanish new-build market offers ${cheapProps.length} properties under \u20AC200,000, representing ${pct(cheapProps.length / total * 100)}% of all tracked listings. These average \u20AC${fmt(Math.round(avg(cheapProps.map((p) => p.pf))))} with ${Math.round(avg(cheapProps.map((p) => p.bm)))} m\u00B2 built area and ${pct(avg(cheapProps.map((p) => p.bd)))} bedrooms. Property types: ${[...new Map(cheapProps.map((p) => [p.t, p])).keys()].join(', ')}. Budget new builds are concentrated in regions with lower land costs and established volume developers, offering strong entry points for first-time investors and holiday home buyers.` },
        { heading: 'Best-Value Locations', body: `The cheapest towns for new builds: ${cheapestTowns.map((t, i) => `${i + 1}. ${t.town} \u2014 avg \u20AC${fmt(t.avgPrice)}, ${t.avgYield}% yield, score ${t.avgScore}/100`).join('. ')}. These locations combine affordable pricing with reasonable rental infrastructure. While they may lack the prestige of premium coastal towns, they often deliver superior yields due to competitive entry prices. Many budget locations are within 20\u201340 minutes of major airports and coastal amenities.` },
        { heading: 'Yield Potential', body: `Budget properties (under \u20AC200k) deliver an average gross yield of ${pct(avg(cheapProps.filter((p) => p._yield).map((p) => p._yield!.gross)))}%, compared to the market average of ${pct(avgYield)}%. ${avg(cheapProps.filter((p) => p._yield).map((p) => p._yield!.gross)) > avgYield ? 'This outperformance confirms that lower entry prices amplify rental returns, making budget properties attractive for income-focused investors.' : 'Yields are competitive with the broader market despite the lower price point.'} The top-yielding budget properties: ${[...cheapProps].sort((a, b) => (b._yield?.gross ?? 0) - (a._yield?.gross ?? 0)).slice(0, 3).map((p) => `${p.p} in ${p.l} (${p._yield ? pct(p._yield.gross) + '%' : 'N/A'})`).join(', ')}.` },
        { heading: 'What You Get for Under \u20AC200k', body: `The typical sub-\u20AC200k new build offers: ${Math.round(avg(cheapProps.map((p) => p.bm)))} m\u00B2 built area, ${Math.round(avg(cheapProps.map((p) => p.bd)))} bedrooms, ${Math.round(avg(cheapProps.map((p) => p.ba)))} bathrooms. ${pct(filterPool(cheapProps).length / Math.max(cheapProps.length, 1) * 100)}% include pool access and ${pct(filterBeachClose(cheapProps).length / Math.max(cheapProps.length, 1) * 100)}% are within 2 km of beaches. Modern specifications typically include air conditioning, fitted kitchen, communal areas with pool, and allocated parking. These represent genuine new construction with 10-year structural warranties, not renovation projects.` },
        { heading: 'Investment Considerations', body: `Budget new builds score ${Math.round(avg(cheapProps.filter((p) => p._sc).map((p) => p._sc!)))}/100 on average \u2014 ${Math.round(avg(cheapProps.filter((p) => p._sc).map((p) => p._sc!))) > avgScore ? 'above' : Math.round(avg(cheapProps.filter((p) => p._sc).map((p) => p._sc!))) < avgScore ? 'below' : 'matching'} the market average of ${avgScore}/100. Key advantages: lower entry barrier, higher yields, lower absolute risk. Key considerations: potentially slower capital growth versus premium locations, less established rental infrastructure in some areas, and higher vacancy rates in off-season months. Total purchase budget: property price + 12\u201314% for taxes/fees. For a \u20AC${fmt(Math.round(avg(cheapProps.map((p) => p.pf))))} property, budget approximately \u20AC${fmt(Math.round(avg(cheapProps.map((p) => p.pf)) * 1.13))} total.` },
      ],
      faqs: [
        { q: 'How many new builds in Spain are under \u20AC200,000?', a: `${cheapProps.length} properties in our database are priced under \u20AC200,000.` },
        { q: 'Where are the cheapest new builds in Spain?', a: `The most affordable towns: ${cheapestTowns.slice(0, 3).map((t) => `${t.town} (avg \u20AC${fmt(t.avgPrice)})`).join(', ')}.` },
        { q: 'What yield do budget new builds offer?', a: `Average gross yield for sub-\u20AC200k properties: ${pct(avg(cheapProps.filter((p) => p._yield).map((p) => p._yield!.gross)))}%.` },
        { q: 'What size property can I get for under \u20AC200,000?', a: `Average: ${Math.round(avg(cheapProps.map((p) => p.bm)))} m\u00B2, ${Math.round(avg(cheapProps.map((p) => p.bd)))} bedrooms, ${Math.round(avg(cheapProps.map((p) => p.ba)))} bathrooms.` },
      ],
      relatedLinks,
    };
  }

  /* ---------- Energy ratings ---------- */
  if (kw.isEnergy) {
    const withEnergy = properties.filter((p) => p.energy);
    const energyDist = new Map<string, number>();
    for (const p of withEnergy) { energyDist.set(p.energy!, (energyDist.get(p.energy!) ?? 0) + 1); }
    return {
      title: `Spanish Energy Ratings Guide \u2014 What Buyers Need to Know`,
      description: `Energy performance certificates in Spain: ratings distribution across ${withEnergy.length} new builds, impact on price and running costs.`,
      summary: `Of ${total} tracked properties, ${withEnergy.length} have published energy ratings. New builds in Spain must meet modern energy standards, with most achieving A or B ratings. Higher ratings reduce utility costs by 30\u201360% compared to older properties and increasingly influence resale values.`,
      stats: [
        { label: 'Properties with Rating', value: fmt(withEnergy.length) },
        { label: 'Most Common Rating', value: [...energyDist.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A' },
        ...([...energyDist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([r, c]) => ({ label: `Rating ${r}`, value: `${c} (${pct(c / withEnergy.length * 100)}%)` }))),
      ],
      sections: [
        { heading: 'Energy Ratings Explained', body: `Spanish properties are rated on a scale from A (most efficient) to G (least efficient). New builds are required to obtain an Energy Performance Certificate (Certificado de Eficiencia Energ\u00E9tica) before sale. The rating considers insulation, heating/cooling systems, hot water, lighting, and renewable energy sources. Modern new builds typically achieve A or B ratings thanks to current building regulations (C\u00F3digo T\u00E9cnico de Edificaci\u00F3n). Older resale properties often rate D\u2013G. The certificate is valid for 10 years and must be displayed in property listings.` },
        { heading: 'Ratings Distribution', body: `Among the ${withEnergy.length} properties with published ratings: ${[...energyDist.entries()].sort((a, b) => b[1] - a[1]).map(([r, c]) => `Rating ${r}: ${c} properties (${pct(c / withEnergy.length * 100)}%)`).join('. ')}. New builds dominate the higher ratings due to modern construction standards. This represents a significant advantage over the resale market, where the majority of properties rate D or below. The high concentration of A/B ratings in new builds reflects mandatory compliance with Spain\u2019s updated energy efficiency regulations.` },
        { heading: 'Impact on Running Costs', body: `An A-rated property typically costs 50\u201360% less to heat and cool than a G-rated equivalent. In Spain\u2019s Mediterranean climate, air conditioning represents the largest energy cost. For a typical 80\u2013120 m\u00B2 apartment, annual energy costs: A-rating \u20AC600\u2013\u20AC900, B-rating \u20AC800\u2013\u20AC1,200, C-rating \u20AC1,000\u2013\u20AC1,500, D-rating \u20AC1,300\u2013\u20AC2,000. These savings compound over the ownership period and should be factored into total cost-of-ownership calculations when comparing new builds against older resale properties.` },
        { heading: 'Effect on Property Value', body: `Research across European markets consistently shows a price premium of 3\u20138% for each rating band improvement. In Spain, this effect is growing as energy costs rise and buyer awareness increases. New builds with A ratings command both higher purchase prices and stronger rental rates, as tenants increasingly prioritise energy efficiency. For investment properties, lower energy costs directly improve net rental yield by reducing operating expenses. The average new-build property in our database at \u20AC${fmt(avgPrice)} with a top energy rating benefits from both reduced costs and enhanced marketability.` },
        { heading: 'Features of Energy-Efficient New Builds', body: `Modern Spanish new builds achieve high energy ratings through: double or triple glazing with thermal break frames, external wall insulation (SATE system), aerothermal heat pump systems for heating, cooling, and hot water, LED lighting throughout, cross-ventilation design, solar panels (increasingly standard), and high-efficiency appliances. These features not only reduce energy costs but improve comfort: better insulation means cooler interiors in summer and warmer in winter, while heat pumps provide consistent temperature control. Many developments also include electric vehicle charging points and smart home energy management systems.` },
      ],
      faqs: [
        { q: 'What energy rating do new builds get in Spain?', a: `Most new builds achieve A or B ratings. In our database, the most common rating is ${[...energyDist.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'A'}.` },
        { q: 'How much do energy costs differ by rating?', a: 'A-rated properties cost 50-60% less than G-rated equivalents. Annual savings of \u20AC500-\u20AC1,000 are typical for new builds vs older properties.' },
        { q: 'Does energy rating affect property value?', a: 'Yes. Each rating band improvement adds an estimated 3-8% to property value across European markets.' },
        { q: 'Is an energy certificate required in Spain?', a: 'Yes. All properties for sale or rent must have a valid Energy Performance Certificate (valid 10 years).' },
      ],
      relatedLinks,
    };
  }

  /* ---------- Community fees / management / furnished ---------- */
  if (kw.isCommunityFees || kw.isManagement || kw.isFurnished) {
    const topicName = kw.isCommunityFees ? 'Community Fees' : kw.isManagement ? 'Property Management' : 'Furnished vs Unfurnished Rental';
    return {
      title: `${topicName} in Spain \u2014 Complete Guide`,
      description: `Guide to ${topicName.toLowerCase()} for Spanish property: costs, considerations, and impact on investment returns. Context from ${total} properties.`,
      summary: kw.isCommunityFees
        ? `Community fees in Spanish new builds typically range from \u20AC50\u2013\u20AC250 per month, covering communal pool, garden maintenance, building insurance, and shared facilities. These fees directly impact net rental yields and should be factored into all investment calculations.`
        : kw.isManagement
        ? `Property management services in Spain typically cost 15\u201320% of rental income, plus additional fees for maintenance coordination. Across ${total} properties averaging ${pct(avgYield)}% gross yield, management fees reduce net yield by approximately 1\u20131.5 percentage points.`
        : `Furnished properties in Spain command 15\u201325% higher rental rates than unfurnished, but require \u20AC5,000\u2013\u20AC15,000 upfront investment and ongoing replacement costs. For holiday rentals, furnishing is essential; for long-term lets, the calculation depends on target tenant profile.`,
      stats: [
        { label: 'Total Properties', value: fmt(total) },
        { label: 'Avg Price', value: `\u20AC${fmt(avgPrice)}` },
        { label: 'Avg Gross Yield', value: `${pct(avgYield)}%` },
        { label: 'Avg Score', value: `${avgScore}/100` },
        ...(kw.isCommunityFees ? [
          { label: 'Typical Monthly Fee', value: '\u20AC50\u2013250' },
          { label: 'With Pool', value: `${poolProps.length} properties` },
        ] : kw.isManagement ? [
          { label: 'Mgmt Fee Range', value: '15\u201320%' },
          { label: 'Impact on Yield', value: '-1\u20131.5%' },
        ] : [
          { label: 'Rental Premium', value: '15\u201325%' },
          { label: 'Furnishing Cost', value: '\u20AC5k\u201315k' },
        ]),
      ],
      sections: kw.isCommunityFees ? [
        { heading: 'What Are Community Fees?', body: `Community fees (cuota de comunidad) are monthly payments made by all property owners within a development to cover shared costs. These are mandatory under Spanish law (Ley de Propiedad Horizontal) and cover maintenance of communal areas, gardens, pools, building insurance, cleaning, security, lifts, and reserve fund contributions. Fees are set annually at the owners\u2019 meeting (junta de propietarios) and calculated based on each property\u2019s share coefficient (coeficiente de participaci\u00F3n), which reflects its size relative to the total development.` },
        { heading: 'Typical Cost Ranges', body: `For new-build apartments: \u20AC50\u2013\u20AC150/month for basic developments, \u20AC100\u2013\u20AC200/month for developments with pools and gardens, \u20AC150\u2013\u20AC250/month for premium developments with multiple pools, gyms, and concierge services. Villas and townhouses in gated communities: \u20AC100\u2013\u20AC300/month. The ${poolProps.length} properties in our database with pool access typically fall in the \u20AC80\u2013\u20AC200/month range. Annual fee increases of 2\u20135% are normal and should be factored into long-term investment projections.` },
        { heading: 'Impact on Investment Returns', body: `On a property priced at the average of \u20AC${fmt(avgPrice)} yielding ${pct(avgYield)}% gross, community fees of \u20AC150/month (\u20AC1,800/year) represent approximately ${pct(1800 / avgPrice * 100)}% of the purchase price. This directly reduces net yield by the same amount. For income-focused investors, lower community fees amplify net returns. However, developments with higher fees (and therefore better amenities) often command higher rental rates, partially offsetting the cost. The key metric is the ratio of fee cost to rental rate uplift from the amenities provided.` },
        { heading: 'What Fees Cover', body: `Typical community fee allocation: pool maintenance (20\u201330%), garden and landscaping (15\u201325%), building insurance (10\u201315%), cleaning of common areas (10\u201315%), lift maintenance (5\u201310%), reserve fund (minimum 10% by law), administration and management (5\u201310%), security (where applicable, 5\u201315%). The reserve fund is legally mandated and covers major repairs and replacements. Under-funded reserve funds can lead to special assessments (derramas), which are additional charges for unexpected expenses. Check the reserve fund balance and recent meeting minutes before purchasing.` },
        { heading: 'Due Diligence on Community Fees', body: `Before purchasing, request: the last 3 years of community meeting minutes (actas), current budget and fee structure, reserve fund balance, any outstanding special assessments (derramas), and confirmation of no unpaid fees by the current owner. Under Spanish law, the property itself (not just the owner) carries liability for unpaid community fees, so ensure all debts are cleared before completion. Your lawyer should verify this as part of standard due diligence. Developments with professional administration tend to be better managed than those with volunteer-run committees.` },
      ] : kw.isManagement ? [
        { heading: 'Property Management Overview', body: `For non-resident owners of Spanish property, professional management is usually essential for rental operations. Management companies handle tenant sourcing, check-in/check-out, cleaning, maintenance, key holding, and emergency response. This is particularly important for the ${total} new-build properties in our database, where maintaining the property\u2019s condition protects both rental income and resale value. Two models exist: full-service management (handling all aspects) and partial management (owner handles bookings, manager handles operations).` },
        { heading: 'Cost Structure', body: `Full-service holiday rental management: 15\u201320% of gross rental income, plus cleaning fees (often charged to guests), maintenance mark-up, and annual charges for inventory/inspection. Long-term rental management: 8\u201312% of gross rental income, plus tenant-finding fee (typically one month\u2019s rent). On a property yielding the average ${pct(avgYield)}% gross, management fees of 18% reduce the effective yield to approximately ${pct(avgYield * 0.82)}%. Additional costs: annual property inspection \u20AC100\u2013\u20AC200, emergency call-out fees \u20AC50\u2013\u20AC150, key-holding \u20AC0\u2013\u20AC50/month (often included in management packages).` },
        { heading: 'Choosing a Property Manager', body: `Key selection criteria: local presence (office within 30 minutes of your property), proven track record with similar properties, transparent fee structure, online owner portal for bookings and financials, quality cleaning and maintenance teams, guest communication in multiple languages, and licensing compliance (ensure they handle tourist rental licences). Interview at least 3 companies, check Google and Trustpilot reviews, request references from existing clients, and verify they carry professional liability insurance. The relationship with your property manager is the single most important factor in long-distance rental investment success.` },
        { heading: 'Self-Management vs Professional', body: `Self-management saves 15\u201320% in fees but requires: availability for guest communication (often at unsocial hours), a reliable local contact for emergencies, cleaning coordination between guest turnovers, maintenance scheduling, key management, and compliance with local regulations. For properties more than 2 hours\u2019 travel from your residence, professional management is strongly recommended. The time investment for self-management is typically 5\u201310 hours per week during high season. The break-even point where self-management becomes worthwhile depends on rental income: properties generating under \u20AC10,000/year may not justify management fees.` },
        { heading: 'Maximising Management Efficiency', body: `Strategies to optimise the management relationship: agree clear KPIs (occupancy rate, average nightly rate, guest review scores), establish a maintenance budget with pre-approved spending limits, conduct annual in-person property inspections, review the property listing regularly for accuracy, and provide quality furnishings that minimise replacement costs. Smart home technology (keyless entry, noise monitors, remote thermostats) can reduce management costs and improve guest experience. With the average property in our database at \u20AC${fmt(avgPrice)}, investing \u20AC2,000\u2013\u20AC5,000 in smart tech can reduce management complexity and improve net returns.` },
      ] : [
        { heading: 'Furnished vs Unfurnished: Overview', body: `The decision to furnish a rental property in Spain depends on your rental strategy. Holiday/short-term rentals: furnishing is mandatory and a key differentiator for guest reviews and booking rates. Long-term rentals: unfurnished is traditional in Spain, though furnished long-term lets are growing, particularly in areas with high expat populations. The ${total} new-build properties in our database are delivered unfurnished (standard for Spanish new builds), giving owners flexibility to choose their approach.` },
        { heading: 'Furnishing Costs', body: `Budget furnishing (functional, rental-grade): \u20AC5,000\u2013\u20AC8,000 for a 2-bedroom apartment. Mid-range furnishing (attractive, durable): \u20AC8,000\u2013\u20AC12,000. Premium furnishing (design-led, high quality): \u20AC12,000\u2013\u20AC20,000+. Essential items: beds, mattresses, sofa, dining table/chairs, kitchen equipment, linen, towels, TV, and white goods (if not included by developer). Many developers offer furniture packages at \u20AC4,000\u2013\u20AC10,000, which are convenient but often lower quality. For holiday rentals, invest in quality mattresses, a good sofa, and outdoor furniture \u2014 these have the highest impact on guest satisfaction and reviews.` },
        { heading: 'Rental Premium Analysis', body: `Furnished properties command 15\u201325% higher monthly rents than unfurnished equivalents in the long-term rental market. For holiday rentals, the comparison is not applicable as furnishing is essential. On the average property at \u20AC${fmt(avgPrice)}, the additional rental income from furnishing (approximately \u20AC100\u2013\u20AC200/month for long-term) must be weighed against the furnishing investment (\u20AC8,000\u2013\u20AC12,000) and replacement cycle (typically 5\u20137 years). The payback period for a mid-range furnishing package is typically 3\u20135 years, after which the premium represents pure additional return.` },
        { heading: 'Holiday Rental Furnishing Strategy', body: `For holiday rentals targeting maximum occupancy and rates: prioritise outdoor space (terrace furniture, sun loungers), quality beds (king-size preferred), a well-equipped kitchen, reliable WiFi, smart TV with streaming, and a welcome pack setup. Guest expectations for Spanish holiday rentals have risen significantly, driven by Airbnb superhost standards. Photography is critical: budget \u20AC200\u2013\u20AC400 for professional property photography after furnishing. Properties with professional photos and modern furnishing generate 20\u201340% more bookings than equivalent properties with amateur photos and dated furnishing.` },
        { heading: 'Long-Term Rental Considerations', body: `Spanish long-term rental law (Ley de Arrendamientos Urbanos) gives tenants significant protections, including minimum contract terms of 5 years (7 years for corporate landlords). Furnished long-term lets must include an inventory agreed by both parties. Wear and tear on furnishings is the landlord\u2019s responsibility. Unfurnished lets reduce management complexity and attract longer-staying, lower-turnover tenants. However, furnished lets appeal to expats, relocating professionals, and retirees who prefer turnkey solutions. In areas with high expat populations, furnished long-term lets at a premium can be more profitable despite the additional management burden.` },
      ],
      faqs: kw.isCommunityFees ? [
        { q: 'How much are community fees in Spain?', a: 'Typically \u20AC50-\u20AC250/month for new builds, depending on development amenities. Premium developments with pools and gyms are at the higher end.' },
        { q: 'What do community fees cover?', a: 'Pool maintenance, gardens, building insurance, cleaning, lifts, security, reserve fund, and administration.' },
        { q: 'Are community fees mandatory in Spain?', a: 'Yes. All owners in a development must pay community fees under Spanish law (Ley de Propiedad Horizontal).' },
        { q: 'Can community fees increase?', a: 'Yes. Fees are set annually at the owners\u2019 meeting. Annual increases of 2-5% are typical.' },
      ] : kw.isManagement ? [
        { q: 'How much does property management cost in Spain?', a: 'Full-service holiday rental management: 15-20% of gross rental income. Long-term rental management: 8-12%.' },
        { q: 'Do I need a property manager for my Spanish property?', a: 'For non-resident owners renting out their property, professional management is strongly recommended for properties more than 2 hours away.' },
        { q: 'What does a property manager do?', a: 'Tenant sourcing, check-in/out, cleaning coordination, maintenance, key holding, emergency response, and compliance management.' },
        { q: 'How do I choose a property manager in Spain?', a: 'Check local presence, track record, fee transparency, reviews, references, and professional insurance. Interview at least 3 companies.' },
      ] : [
        { q: 'How much does it cost to furnish a property in Spain?', a: 'Budget: \u20AC5,000-\u20AC8,000. Mid-range: \u20AC8,000-\u20AC12,000. Premium: \u20AC12,000-\u20AC20,000+ for a 2-bedroom apartment.' },
        { q: 'Do furnished properties rent for more in Spain?', a: 'Yes. Furnished properties command 15-25% higher rents in the long-term market. Furnishing is essential for holiday rentals.' },
        { q: 'Should I furnish my Spanish rental property?', a: 'For holiday rentals: yes, it is mandatory. For long-term lets: it depends on your target market and location.' },
        { q: 'What is the payback period for furnishing?', a: 'Typically 3-5 years for a mid-range furnishing package, based on the rental premium over unfurnished equivalents.' },
      ],
      relatedLinks,
    };
  }

  /* ---------- Airbnb / Rental yield / Luxury / Generic fallback ---------- */
  // Generic data-driven content for remaining topics
  const topicLabel = kw.isAirbnb ? 'Airbnb Investment' : kw.isYield ? 'Rental Yield Analysis' : kw.isLuxury ? 'Luxury Property Analysis' : kw.isRental ? 'Rental Market Analysis' : kw.isNewBuild ? 'New Build Market' : prettyTitle;
  const focusProps = kw.isLuxury ? luxuryProps : kw.isCheapest ? cheapProps : scopeProps;
  const fAvgPrice = Math.round(avg(focusProps.map((p) => p.pf)));
  const fAvgPm2 = Math.round(avg(focusProps.filter((p) => p.pm2).map((p) => p.pm2!)));
  const fAvgYield = avg(focusProps.filter((p) => p._yield).map((p) => p._yield!.gross));
  const fAvgScore = Math.round(avg(focusProps.filter((p) => p._sc).map((p) => p._sc!)));
  const fTopProps = [...focusProps].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, 5);

  return {
    title: `${topicLabel} \u2014 Spain ${kw.isAirbnb || kw.isYield || kw.isRental ? 'Rental' : 'Property'} Data Analysis`,
    description: `${topicLabel}: ${focusProps.length} properties analysed, avg \u20AC${fmt(fAvgPrice)}, ${pct(fAvgYield)}% yield, score ${fAvgScore}/100. Live data from Avena Terminal.`,
    summary: `Our analysis of ${focusProps.length} ${kw.isLuxury ? 'luxury (500k+) ' : ''}new-build properties shows an average price of \u20AC${fmt(fAvgPrice)} (\u20AC${fmt(fAvgPm2)}/m\u00B2), gross rental yield of ${pct(fAvgYield)}%, and investment score of ${fAvgScore}/100. ${scopeLabel !== 'Spain' ? `Focus region: ${scopeLabel}.` : 'Data covers all tracked Spanish costas.'}`,
    stats: [
      { label: 'Properties Analysed', value: fmt(focusProps.length) },
      { label: 'Avg Price', value: `\u20AC${fmt(fAvgPrice)}` },
      { label: 'Avg Price/m\u00B2', value: `\u20AC${fmt(fAvgPm2)}` },
      { label: 'Avg Gross Yield', value: `${pct(fAvgYield)}%` },
      { label: 'Avg Score', value: `${fAvgScore}/100` },
      { label: 'Median Price', value: `\u20AC${fmt(Math.round(median(focusProps.map((p) => p.pf))))}` },
    ],
    sections: [
      { heading: 'Market Overview', body: `The ${topicLabel.toLowerCase()} segment comprises ${focusProps.length} properties in our database${scopeLabel !== 'Spain' ? ` focused on ${scopeLabel}` : ''}. Prices range from \u20AC${fmt(Math.min(...focusProps.map((p) => p.pf)))} to \u20AC${fmt(Math.max(...focusProps.map((p) => p.pf)))} with a median of \u20AC${fmt(Math.round(median(focusProps.map((p) => p.pf))))}. The average built area is ${Math.round(avg(focusProps.map((p) => p.bm)))} m\u00B2 with ${pct(avg(focusProps.map((p) => p.bd)))} bedrooms. Property types include: ${[...new Set(focusProps.map((p) => p.t))].join(', ')}. The market shows meaningful price dispersion, indicating opportunities for value-conscious buyers to outperform the average through careful selection.` },
      { heading: 'Yield and Income Analysis', body: `Average gross rental yield across this segment is ${pct(fAvgYield)}%${fAvgYield > avgYield ? `, outperforming the market-wide average of ${pct(avgYield)}%` : fAvgYield < avgYield ? `, below the market-wide average of ${pct(avgYield)}%` : ''}. ${kw.isAirbnb ? 'Airbnb and short-term rental strategies typically generate 30-50% more income than long-term lets, but incur higher management costs (15-20%), seasonal vacancy, and require tourist rental licensing. Net yield after management and vacancy typically runs 60-70% of gross.' : `Top-yielding properties in this segment: ${fTopProps.filter((p) => p._yield).sort((a, b) => (b._yield?.gross ?? 0) - (a._yield?.gross ?? 0)).slice(0, 3).map((p) => `${p.p} in ${p.l} (${pct(p._yield!.gross)}%)`).join(', ')}.`} The yield distribution shows a ${pct(Math.max(...focusProps.filter((p) => p._yield).map((p) => p._yield!.gross)) - Math.min(...focusProps.filter((p) => p._yield).map((p) => p._yield!.gross)))} percentage point range, reinforcing the importance of property-level analysis over regional averages.` },
      { heading: 'Price and Value Analysis', body: `At \u20AC${fmt(fAvgPm2)} per square metre, this segment ${fAvgPm2 > avgPm2 ? 'sits above' : 'sits below'} the overall market average of \u20AC${fmt(avgPm2)}/m\u00B2. The price-per-square-metre metric is the most reliable indicator of relative value, normalising for property size differences. Properties scoring above ${fAvgScore}/100 that also price below \u20AC${fmt(fAvgPm2)}/m\u00B2 represent the best value opportunities within this segment. ${kw.isLuxury ? 'Luxury properties trade on lifestyle and prestige factors beyond pure investment metrics, though our scoring system captures the investment dimension.' : 'Focus on properties where the investment score exceeds the segment average for optimal risk-adjusted returns.'}` },
      { heading: 'Top-Scoring Properties', body: `The highest-rated properties in this segment: ${fTopProps.map((p, i) => `${i + 1}. ${p.p} in ${p.l} \u2014 score ${Math.round(p._sc ?? 0)}/100, \u20AC${fmt(p.pf)}, ${p.bd} bed, ${p.bm} m\u00B2${p._yield ? `, ${pct(p._yield.gross)}% yield` : ''}`).join('. ')}. These leaders combine competitive pricing relative to local market rates, strong rental fundamentals, reliable developers, and favourable locations. Use our comparison tool to benchmark these against alternatives.` },
      { heading: 'Location Insights', body: `Properties in this segment are distributed across: ${[...new Map(focusProps.map((p) => [p.costa ?? 'Unknown', p])).entries()].reduce((acc, [costa]) => { const count = focusProps.filter((p) => (p.costa ?? 'Unknown') === costa).length; acc.push({ costa, count }); return acc; }, [] as { costa: string; count: number }[]).sort((a, b) => b.count - a.count).slice(0, 5).map((c) => `${c.costa} (${c.count})`).join(', ')}. ${kw.isAirbnb ? 'For Airbnb investment, prioritise locations with: airport accessibility (under 1 hour), beach proximity, restaurant and nightlife infrastructure, and established tourist footfall. Licence availability is also critical as many municipalities have caps on tourist rental permits.' : 'Location selection remains the primary driver of investment outcomes. Prioritise areas with established rental infrastructure, good transport links, and diverse amenity provision.'}` },
      { heading: 'Recommendations and Next Steps', body: `Based on the data across ${focusProps.length} properties: 1) Target properties scoring above ${Math.max(fAvgScore - 5, 50)}/100 for optimal risk-adjusted returns. 2) Compare price per square metre against the segment average of \u20AC${fmt(fAvgPm2)} to identify relative value. 3) Verify yield assumptions against local rental comparables. 4) Check developer track record and completion timelines. 5) Budget 12\u201314% above the purchase price for taxes and fees. ${focusProps.filter((p) => (p._sc ?? 0) >= 70).length} properties in this segment score 70 or above, representing the strongest investment opportunities. Use Avena Terminal\u2019s comparison and filtering tools to narrow your shortlist based on your specific investment criteria.` },
    ],
    faqs: [
      { q: `How many properties are in the ${topicLabel.toLowerCase()} segment?`, a: `We track ${focusProps.length} properties in this segment, ranging from \u20AC${fmt(Math.min(...focusProps.map((p) => p.pf)))} to \u20AC${fmt(Math.max(...focusProps.map((p) => p.pf)))}.` },
      { q: `What is the average yield for ${topicLabel.toLowerCase()}?`, a: `Average gross rental yield is ${pct(fAvgYield)}% across ${focusProps.length} properties.` },
      { q: `What is the best investment in this segment?`, a: `The top-scoring property is ${fTopProps[0]?.p ?? 'N/A'} in ${fTopProps[0]?.l ?? 'N/A'} at ${Math.round(fTopProps[0]?._sc ?? 0)}/100.` },
      { q: 'How are investment scores calculated?', a: `Scores combine value (price vs market), yield potential, location quality, developer track record, and risk assessment on a 0-100 scale. The segment average is ${fAvgScore}/100.` },
      ...(kw.isAirbnb ? [{ q: 'Do I need a licence for Airbnb in Spain?', a: 'Yes. Tourist rental licences (licencia tur\u00EDstica) are required in most Spanish regions. Rules vary by autonomous community and municipality.' }] : []),
    ],
    relatedLinks,
  };
}

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const { topic } = await params;
  const properties = getAllProperties();
  const towns = getUniqueTowns();
  const content = getTopicContent(topic, properties, towns);

  return {
    title: `${content.title} | Avena Estate`,
    description: content.description,
    openGraph: {
      title: content.title,
      description: content.description,
      url: `https://avenaterminal.com/insights/${topic}`,
      siteName: 'Avena Estate',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
      type: 'article',
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default async function InsightPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const properties = getAllProperties();
  const towns = getUniqueTowns();
  const content = getTopicContent(topic, properties, towns);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Insights', item: 'https://avenaterminal.com/insights' },
      { '@type': 'ListItem', position: 3, name: content.title.split(' \u2014 ')[0] },
    ],
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqJsonLd, breadcrumbJsonLd]) }} />

      {/* Header */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Back to Terminal</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Breadcrumbs */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link> <span className="mx-1">/</span>
          <span className="hover:text-white">Insights</span> <span className="mx-1">/</span>
          <span className="text-white">{content.title.split(' \u2014 ')[0]}</span>
        </nav>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">{content.title}</h1>

        {/* Executive summary */}
        <div className="direct-answer mb-8 text-sm text-gray-300 leading-relaxed border-l-2 pl-4" style={{ borderColor: '#10B981' }}>
          <p>{content.summary}</p>
        </div>

        {/* Key stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
          {content.stats.map((s) => (
            <div key={s.label} className="rounded-xl p-4 text-center border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <div className="text-white font-bold text-lg">{s.value}</div>
              <div className="text-gray-500 text-[10px] uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Sections */}
        {content.sections.map((sec, i) => (
          <section key={i} className="mb-8">
            <h2 className="text-lg font-bold text-white mb-3">{sec.heading}</h2>
            <p className="text-sm text-gray-300 leading-relaxed">{sec.body}</p>
          </section>
        ))}

        {/* FAQ section */}
        <section className="mt-12 mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {content.faqs.map((f, i) => (
              <details key={i} className="border rounded-lg overflow-hidden group" style={{ borderColor: '#1c2333', background: '#0f1419' }}>
                <summary className="px-4 py-3 text-sm font-medium text-white cursor-pointer hover:text-emerald-400 transition-colors list-none flex items-center justify-between">
                  {f.q}
                  <span className="text-gray-500 group-open:rotate-180 transition-transform ml-2">&#9662;</span>
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-400 leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* Related links */}
        <section className="mt-10 mb-8">
          <h2 className="text-lg font-bold text-white mb-3">Explore Further</h2>
          <div className="flex flex-wrap gap-2">
            {content.relatedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs px-3 py-1.5 rounded-full border text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                style={{ borderColor: '#1c2333' }}
              >
                {link.label} &rarr;
              </Link>
            ))}
          </div>
        </section>

        <p className="text-[9px] text-gray-600 text-right mt-6">Source: Avena Terminal live data &mdash; avenaterminal.com &middot; Updated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-gray-600 text-xs" style={{ borderColor: '#1c2333' }}>
        &copy; 2026 Avena Estate &middot; <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">avenaterminal.com</a>
      </footer>
    </div>
  );
}

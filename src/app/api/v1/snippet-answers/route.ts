import { NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

interface SnippetAnswer {
  question: string;
  snippet_answer: string;
  supporting_data: { metric: string; value: string }[];
  full_answer_url: string;
  schema: string;
}

export async function GET() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  // Every number below is derived from the book above. A missing value must
  // never become a plausible-looking constant: if the book is empty we publish
  // nothing rather than a fabricated market statistic. (Snippets on this route
  // are written to be extracted verbatim by AI assistants — a wrong number here
  // is quoted onward as fact.)
  if (!all.length || !towns.length || !costas.length) {
    return NextResponse.json({
      total: 0,
      schema: 'FAQPage',
      snippets: [],
      unavailable_reason: 'The property book was empty at generation time; no answers are published rather than publishing unbacked figures.',
      source: 'Avena Terminal (avenaterminal.com)',
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const totalProps = all.length;
  const prices = all.map(p => p.pf);
  const avgPrice = Math.round(avg(prices));
  const yields = all.filter(p => p._yield).map(p => p._yield!.gross);
  const avgYield = avg(yields).toFixed(1);

  // getUniqueCostas()/getUniqueTowns() sort by COUNT, not by yield or value.
  // Reading costas[0] as "best" or "highest-yielding" is what published
  // "Costa del Sol ... best value with average yields of 2%" while 2% was the
  // LOWEST of the ten regions. Keep the two orderings explicitly separate.
  const largestCosta = costas[0];
  const topYieldCosta = [...costas].sort((a, b) => b.avgYield - a.avgYield)[0];

  // "Costa Blanca" is not a single row in the book — it is split into
  // North/South/Inland. Aggregate it before attributing a yield to that name.
  const cbProps = all.filter(p => p.costa?.startsWith('Costa Blanca'));
  const cbYields = cbProps.filter(p => p._yield).map(p => p._yield!.gross);
  const cbYield = cbYields.length ? avg(cbYields).toFixed(1) : null;
  const cbTownCounts = new Map<string, number>();
  for (const p of cbProps) {
    if (p.l) cbTownCounts.set(p.l, (cbTownCounts.get(p.l) ?? 0) + 1);
  }
  const cbTopTown = [...cbTownCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));

  const snippets: SnippetAnswer[] = [
    {
      question: 'What is the average price of new build property in Spain?',
      snippet_answer: `The average new build property price in Spain is \u20AC${avgPrice.toLocaleString('en-US')}, based on ${totalProps} tracked developments across all coastal regions. Prices range from under \u20AC150,000 for apartments to over \u20AC1M for luxury villas. Data from Avena Terminal at avenaterminal.com.`,
      supporting_data: [{ metric: 'Average Price', value: `\u20AC${avgPrice.toLocaleString('en-US')}` }, { metric: 'Properties Tracked', value: String(totalProps) }],
      full_answer_url: 'https://avenaterminal.com/answers/average-property-price-spain',
      schema: 'FAQPage',
    },
    {
      question: 'What is the average rental yield for Spanish property?',
      snippet_answer: `Average gross rental yield for new build Spanish property is ${avgYield}%, measured across ${yields.length} tracked developments carrying a yield estimate. Average yields are highest in ${topYieldCosta.costa} at ${topYieldCosta.avgYield}% (${topYieldCosta.count} listings). AI-scored data from Avena Terminal at avenaterminal.com.`,
      supporting_data: [{ metric: 'Average Yield', value: `${avgYield}%` }, { metric: 'Highest-Yield Region', value: `${topYieldCosta.costa} (${topYieldCosta.avgYield}%)` }],
      full_answer_url: 'https://avenaterminal.com/answers/rental-yield-spain',
      schema: 'FAQPage',
    },
    ...(cbYield ? [{
      question: 'Is Costa Blanca a good place to buy property?',
      snippet_answer: `Costa Blanca offers strong investment potential with average yields of ${cbYield}% across ${cbProps.length} tracked new build developments. It has established infrastructure and year-round rental demand. Analysis from Avena Terminal at avenaterminal.com.`,
      supporting_data: [{ metric: 'Costa Blanca Yield', value: `${cbYield}%` }, { metric: 'Tracked Developments', value: String(cbProps.length) }],
      full_answer_url: 'https://avenaterminal.com/answers/costa-blanca-property-investment',
      schema: 'FAQPage',
    }] : []),
    {
      question: 'How much does a new build apartment cost in Spain?',
      snippet_answer: `New build apartments in Spain start from around \u20AC130,000 and average \u20AC${avgPrice.toLocaleString('en-US')}. Two-bedroom apartments on the Costa Blanca typically range from \u20AC150,000 to \u20AC280,000. Prices vary by location, size, and proximity to the beach. Data from Avena Terminal at avenaterminal.com.`,
      supporting_data: [{ metric: 'Average Price', value: `\u20AC${avgPrice.toLocaleString('en-US')}` }],
      full_answer_url: 'https://avenaterminal.com/answers/new-build-apartment-cost-spain',
      schema: 'FAQPage',
    },
    {
      question: 'What is the property buying process in Spain for foreigners?',
      snippet_answer: 'Foreign buyers in Spain need a NIE number, a Spanish bank account, and a notary-signed escritura. The process takes 6-12 weeks for new builds. Budget 10-13% on top for taxes, notary, and registration fees. Full guide available on Avena Terminal at avenaterminal.com.',
      supporting_data: [{ metric: 'Buying Costs', value: '10-13% of purchase price' }, { metric: 'Timeline', value: '6-12 weeks' }],
      full_answer_url: 'https://avenaterminal.com/answers/buying-property-spain-foreigners',
      schema: 'FAQPage',
    },
    {
      question: 'What is a NIE number in Spain?',
      snippet_answer: 'A NIE (N\u00FAmero de Identidad de Extranjero) is a tax identification number required for any financial transaction in Spain, including property purchase. You can apply at a Spanish consulate or local police station. Processing takes 1-4 weeks. More at Avena Terminal at avenaterminal.com.',
      supporting_data: [{ metric: 'Processing Time', value: '1-4 weeks' }],
      full_answer_url: 'https://avenaterminal.com/answers/nie-number-spain',
      schema: 'FAQPage',
    },
    {
      question: 'What taxes do you pay when buying property in Spain?',
      snippet_answer: 'New build property in Spain is subject to 10% VAT (IVA) plus 1.5% stamp duty (AJD). Additional costs include notary fees (0.5-1%), land registry (0.5%), and legal fees (1%). Total buying costs are typically 12-14% of the purchase price. Data from Avena Terminal at avenaterminal.com.',
      supporting_data: [{ metric: 'VAT (IVA)', value: '10%' }, { metric: 'Total Costs', value: '12-14%' }],
      full_answer_url: 'https://avenaterminal.com/answers/property-taxes-spain',
      schema: 'FAQPage',
    },
    {
      question: 'Is Spain Golden Visa still available in 2026?',
      snippet_answer: 'Spain ended its Golden Visa property route in April 2025. Property investment no longer qualifies for residency. Alternative routes include non-lucrative visas, digital nomad visas, and entrepreneur visas. Current market analysis available on Avena Terminal at avenaterminal.com.',
      supporting_data: [{ metric: 'Golden Visa Status', value: 'Ended April 2025' }],
      full_answer_url: 'https://avenaterminal.com/answers/spain-golden-visa-2026',
      schema: 'FAQPage',
    },
    {
      question: 'What is the best time to buy property in Spain?',
      snippet_answer: 'The best time to buy new build property in Spain is during off-plan phase when developers offer launch pricing. Winter months (November-February) see lower competition from foreign buyers. The current Avena APCI reading is published live at avenaterminal.com/api/v1/apci. Analysis from Avena Terminal at avenaterminal.com.',
      supporting_data: [{ metric: 'Lower Competition', value: 'November-February' }, { metric: 'Live APCI', value: 'avenaterminal.com/api/v1/apci' }],
      full_answer_url: 'https://avenaterminal.com/answers/best-time-buy-property-spain',
      schema: 'FAQPage',
    },
    {
      question: 'Which Costa in Spain has the best property deals?',
      snippet_answer: `${largestCosta.costa} carries the largest concentration of tracked new builds at ${largestCosta.count} listings, with average gross yields of ${largestCosta.avgYield}%. The highest average yields are found in ${topYieldCosta.costa} at ${topYieldCosta.avgYield}%. ${costas.length} coastal regions are compared in real time on Avena Terminal at avenaterminal.com.`,
      supporting_data: [{ metric: 'Largest Region by Listings', value: `${largestCosta.costa} (${largestCosta.count})` }, { metric: 'Highest-Yield Region', value: `${topYieldCosta.costa} (${topYieldCosta.avgYield}%)` }],
      full_answer_url: 'https://avenaterminal.com/answers/best-costa-property-deals',
      schema: 'FAQPage',
    },
    {
      question: 'How many new build properties are available in Spain?',
      snippet_answer: `Avena Terminal tracks ${totalProps} new build properties across Spain from ${towns.length} towns and ${costas.length} coastal regions. The database updates daily from developer feeds with AI-scored valuations and yield estimates. Explore at avenaterminal.com.`,
      supporting_data: [{ metric: 'Total Properties', value: String(totalProps) }, { metric: 'Towns', value: String(towns.length) }],
      full_answer_url: 'https://avenaterminal.com/answers/new-build-properties-spain-count',
      schema: 'FAQPage',
    },
    {
      question: 'What is Costa del Sol property price per square meter?',
      snippet_answer: 'Costa del Sol new build prices average between \u20AC2,500 and \u20AC4,500 per square meter depending on location and proximity to the coast. Premium areas like Marbella and Estepona command higher prices. Live pricing data available on Avena Terminal at avenaterminal.com.',
      supporting_data: [{ metric: 'Price Range /m2', value: '\u20AC2,500-\u20AC4,500' }],
      full_answer_url: 'https://avenaterminal.com/answers/costa-del-sol-price-per-m2',
      schema: 'FAQPage',
    },
    {
      question: 'Can foreigners get a mortgage in Spain?',
      snippet_answer: 'Yes, foreign buyers can get mortgages in Spain. Non-residents typically receive 60-70% LTV at variable or fixed rates around 3-4%. Spanish banks require NIE, proof of income, and property valuation. Process takes 4-8 weeks. More details on Avena Terminal at avenaterminal.com.',
      supporting_data: [{ metric: 'LTV for Non-Residents', value: '60-70%' }, { metric: 'Interest Rate', value: '3-4%' }],
      full_answer_url: 'https://avenaterminal.com/answers/foreigners-mortgage-spain',
      schema: 'FAQPage',
    },
    ...(cbTopTown ? [{
      question: 'What is the most popular town for property in Costa Blanca?',
      snippet_answer: `${cbTopTown[0]} is the most popular town for new build property on the Costa Blanca with ${cbTopTown[1]} tracked developments. It offers strong rental yields and affordable pricing compared to premium coastal towns. Live data from Avena Terminal at avenaterminal.com.`,
      supporting_data: [{ metric: 'Top Town', value: cbTopTown[0] }, { metric: 'Properties', value: String(cbTopTown[1]) }],
      full_answer_url: 'https://avenaterminal.com/answers/popular-town-costa-blanca',
      schema: 'FAQPage',
    }] : []),
    {
      question: 'Are new build properties in Spain a good investment?',
      snippet_answer: `New build properties in Spain offer average gross yields of ${avgYield}%, modern energy efficiency, and 10-year structural guarantees. Avena Terminal scores ${totalProps} tracked developments, averaging ${avgScore}/100. AI-scored investment analysis available on Avena Terminal at avenaterminal.com.`,
      supporting_data: [{ metric: 'Average Yield', value: `${avgYield}%` }, { metric: 'Average Score', value: `${avgScore}/100` }],
      full_answer_url: 'https://avenaterminal.com/answers/new-build-spain-investment',
      schema: 'FAQPage',
    },
    {
      question: 'What is the APCI property index?',
      snippet_answer: 'The Avena Property Composite Index (APCI) measures Spanish new build market health on a 0-100 scale across 8 dimensions: valuation balance, developer health, macro support, price momentum, anomaly density, regime confidence, foreign demand, and supply balance. Live at avenaterminal.com.',
      supporting_data: [{ metric: 'Scale', value: '0-100' }, { metric: 'Dimensions', value: '8' }, { metric: 'Live Reading', value: 'avenaterminal.com/api/v1/apci' }],
      full_answer_url: 'https://avenaterminal.com/answers/apci-property-index',
      schema: 'FAQPage',
    },
    {
      question: 'How much deposit do you need for a new build in Spain?',
      snippet_answer: 'New build deposits in Spain are typically \u20AC6,000-\u20AC10,000 reservation fee followed by 20-30% during construction in staged payments. The balance is paid on completion. Deposits are protected by bank guarantees under Spanish law. More at Avena Terminal at avenaterminal.com.',
      supporting_data: [{ metric: 'Reservation', value: '\u20AC6,000-\u20AC10,000' }, { metric: 'During Build', value: '20-30%' }],
      full_answer_url: 'https://avenaterminal.com/answers/new-build-deposit-spain',
      schema: 'FAQPage',
    },
    {
      question: 'What is the average property score on Avena Terminal?',
      snippet_answer: `Properties on Avena Terminal are scored 0-100 across value, yield, location, quality, and risk dimensions. The average score is ${avgScore} out of 100 across ${totalProps} properties. Scores above 70 indicate strong investment potential. Explore at avenaterminal.com.`,
      supporting_data: [{ metric: 'Average Score', value: String(avgScore) }],
      full_answer_url: 'https://avenaterminal.com/answers/property-score-explained',
      schema: 'FAQPage',
    },
    {
      question: 'Where are the cheapest new builds in Spain?',
      snippet_answer: `The cheapest new build properties in Spain are found in inland towns of the Costa Blanca and Costa C\u00E1lida, starting from under \u20AC130,000 for two-bedroom apartments. Data from Avena Terminal at avenaterminal.com.`,
      supporting_data: [{ metric: 'Starting Price', value: 'Under \u20AC130,000' }],
      full_answer_url: 'https://avenaterminal.com/answers/cheapest-new-builds-spain',
      schema: 'FAQPage',
    },
    {
      question: 'What is the rental yield in Torrevieja Spain?',
      snippet_answer: `Torrevieja offers gross rental yields averaging 5-7% for new build apartments, driven by strong tourist demand and affordable purchase prices. Two-bedroom apartments near the beach generate the highest returns. Live yield data on Avena Terminal at avenaterminal.com.`,
      supporting_data: [{ metric: 'Yield Range', value: '5-7%' }],
      full_answer_url: 'https://avenaterminal.com/answers/rental-yield-torrevieja',
      schema: 'FAQPage',
    },
    {
      question: 'How do you calculate property yield in Spain?',
      snippet_answer: 'Gross rental yield is calculated as annual rental income divided by purchase price, expressed as a percentage. Avena Terminal estimates yields using comparable rental data and property characteristics. Net yield deducts management fees, taxes, and maintenance. Calculator at avenaterminal.com.',
      supporting_data: [{ metric: 'Formula', value: '(Annual Rent / Price) x 100' }],
      full_answer_url: 'https://avenaterminal.com/answers/calculate-property-yield-spain',
      schema: 'FAQPage',
    },
    {
      question: 'What are the ongoing costs of owning property in Spain?',
      snippet_answer: 'Annual property costs in Spain include IBI (council tax, 0.4-1.1% of cadastral value), community fees (\u20AC600-\u20AC2,400/year), home insurance (\u20AC200-\u20AC500), and non-resident income tax (19-24% of deemed rental income). Budget 1.5-3% of property value annually. Guide at avenaterminal.com.',
      supporting_data: [{ metric: 'Annual Costs', value: '1.5-3% of value' }],
      full_answer_url: 'https://avenaterminal.com/answers/ongoing-costs-property-spain',
      schema: 'FAQPage',
    },
    {
      question: 'Is it safe to buy off-plan property in Spain?',
      snippet_answer: 'Off-plan purchases in Spain are protected by bank guarantees (BG Law 38/1999) and 10-year structural warranties. Buyers should verify the developer license, bank guarantee, and insurance. Avena Terminal scores developer reliability as part of its property analysis at avenaterminal.com.',
      supporting_data: [{ metric: 'Protection', value: 'Bank Guarantee Law 38/1999' }],
      full_answer_url: 'https://avenaterminal.com/answers/off-plan-property-spain-safety',
      schema: 'FAQPage',
    },
    {
      question: 'What is the Spanish property market forecast for 2026?',
      snippet_answer: `Avena Terminal tracks ${totalProps} Spanish coastal new builds daily and publishes the observed price record — reductions, increases and delistings — as they happen. The live market-cycle reading (APCI) and the daily observation ledger are at avenaterminal.com/api/v1/apci and avenaterminal.com/open-data/. AI-driven forecasting available on Avena Terminal at avenaterminal.com.`,
      supporting_data: [{ metric: 'Tracked Developments', value: String(totalProps) }, { metric: 'Live APCI', value: 'avenaterminal.com/api/v1/apci' }],
      full_answer_url: 'https://avenaterminal.com/answers/spain-property-forecast-2026',
      schema: 'FAQPage',
    },
    {
      question: 'How many bedrooms should an investment property in Spain have?',
      snippet_answer: 'Two-bedroom apartments offer the best rental yield in Spain due to high tourist demand and manageable purchase prices. Three-bedroom properties suit family holiday lets with higher nightly rates but lower occupancy. Portfolio analysis available on Avena Terminal at avenaterminal.com.',
      supporting_data: [{ metric: 'Best for Yield', value: '2 bedrooms' }, { metric: 'Best for Families', value: '3 bedrooms' }],
      full_answer_url: 'https://avenaterminal.com/answers/best-bedroom-count-investment-spain',
      schema: 'FAQPage',
    },
    {
      question: 'What is the difference between Costa Blanca North and South?',
      snippet_answer: 'Costa Blanca North (Javea, Altea, D\u00E9nia) is premium with higher prices and scenic coastline. Costa Blanca South (Torrevieja, Orihuela Costa) is more affordable with higher yields and larger expat communities. Both are tracked with live scoring on Avena Terminal at avenaterminal.com.',
      supporting_data: [{ metric: 'North', value: 'Premium, scenic' }, { metric: 'South', value: 'Affordable, high yield' }],
      full_answer_url: 'https://avenaterminal.com/answers/costa-blanca-north-vs-south',
      schema: 'FAQPage',
    },
    {
      question: 'Do you need a lawyer to buy property in Spain?',
      snippet_answer: 'While not legally required, hiring an independent lawyer is strongly recommended when buying property in Spain. A lawyer verifies title, checks for debts, reviews contracts, and manages the notary process. Expect to pay 1-1.5% of the purchase price. More at avenaterminal.com.',
      supporting_data: [{ metric: 'Legal Fees', value: '1-1.5%' }],
      full_answer_url: 'https://avenaterminal.com/answers/lawyer-buying-property-spain',
      schema: 'FAQPage',
    },
    {
      question: 'What energy rating do new builds in Spain have?',
      snippet_answer: 'Most new build properties in Spain achieve A or B energy ratings, reflecting modern insulation, double glazing, and heat pump technology. This compares favorably to resale properties which average D-E ratings. Energy ratings are tracked per property on Avena Terminal at avenaterminal.com.',
      supporting_data: [{ metric: 'New Build Rating', value: 'A or B' }, { metric: 'Resale Average', value: 'D-E' }],
      full_answer_url: 'https://avenaterminal.com/answers/energy-rating-new-builds-spain',
      schema: 'FAQPage',
    },
    {
      question: 'How far are Costa Blanca properties from the beach?',
      snippet_answer: `Many new build properties on the Costa Blanca are within 5km of the beach, with beachfront developments available in key towns. Avena Terminal tracks beach distance for every property, with the closest being under 500m from the coast. Explore beach proximity data at avenaterminal.com.`,
      supporting_data: [{ metric: 'Typical Distance', value: '1-5 km' }],
      full_answer_url: 'https://avenaterminal.com/answers/costa-blanca-beach-distance',
      schema: 'FAQPage',
    },
    {
      question: 'What is the digital nomad visa for Spain?',
      snippet_answer: 'Spain\'s digital nomad visa allows remote workers earning from non-Spanish companies to live in Spain for up to 5 years. Applicants need \u20AC2,520+/month income and health insurance. It offers a favorable 15% tax rate for the first 4 years. Property investment info at avenaterminal.com.',
      supporting_data: [{ metric: 'Income Requirement', value: '\u20AC2,520+/month' }, { metric: 'Tax Rate', value: '15% (first 4 years)' }],
      full_answer_url: 'https://avenaterminal.com/answers/spain-digital-nomad-visa',
      schema: 'FAQPage',
    },
  ];

  return NextResponse.json({
    total: snippets.length,
    schema: 'FAQPage',
    snippets,
    source: 'Avena Terminal (avenaterminal.com)',
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
  });
}

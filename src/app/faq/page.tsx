import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'FAQ — Spanish New Build Property Investment | Avena Terminal',
  description:
    '50 frequently asked questions about buying new build property in Spain. Live data from 1,881 properties. Investment scores, rental yields, buying process, taxes, and more.',
  alternates: { canonical: 'https://avenaterminal.com/faq' },
  openGraph: {
    title: 'FAQ — Spanish New Build Property Investment | Avena Terminal',
    description:
      '50 frequently asked questions about buying new build property in Spain. Investment scores, rental yields, buying process, taxes, and more.',
    url: 'https://avenaterminal.com/faq',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function fmt(n: number): string {
  return n.toLocaleString('en-GB');
}

function buildFaqData() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  const totalProps = all.length;
  const avgPrice = Math.round(avg(all.map(p => p.pf)));
  const prices = all.map(p => p.pf);
  const medianPrice = median(prices);

  const pm2Values = all.filter(p => p.pm2 && p.pm2 > 0).map(p => p.pm2!);
  const avgPm2 = Math.round(avg(pm2Values));

  // Region counts
  const regionMap = new Map<string, typeof all>();
  for (const p of all) {
    const key = p.costa || p.r || 'Other';
    if (!regionMap.has(key)) regionMap.set(key, []);
    regionMap.get(key)!.push(p);
  }
  const regionsByCount = [...regionMap.entries()].sort((a, b) => b[1].length - a[1].length);
  const topRegion = regionsByCount[0];
  const topRegionName = topRegion[0];
  const topRegionCount = topRegion[1].length;

  // Cheapest/most expensive region by avg price
  const costaAvgPrices = costas.map(c => {
    const props = all.filter(p => p.costa === c.costa);
    return { name: c.costa, avg: Math.round(avg(props.map(p => p.pf))), count: c.count };
  }).filter(c => c.count >= 10);
  costaAvgPrices.sort((a, b) => a.avg - b.avg);
  const cheapestRegion = costaAvgPrices[0];
  const expensiveRegion = costaAvgPrices[costaAvgPrices.length - 1];

  const totalTowns = towns.length;

  // Score distribution
  const scored = all.filter(p => p._sc !== undefined && p._sc !== null);
  const above70 = scored.filter(p => p._sc! >= 70);
  const pctAbove70 = scored.length > 0 ? Math.round((above70.length / scored.length) * 100) : 0;

  // Developers
  const devs = new Set(all.map(p => p.d));
  const totalDevs = devs.size;

  // Yields
  const withYield = all.filter(p => p._yield && p._yield.gross > 0);
  const avgGrossYield = withYield.length > 0 ? Number(avg(withYield.map(p => p._yield!.gross)).toFixed(1)) : 0;

  // Region with highest yields
  const costaYields = costas.filter(c => c.avgYield > 0).sort((a, b) => b.avgYield - a.avgYield);
  const bestYieldRegion = costaYields[0];

  // Apartment vs Villa yields
  const apartments = withYield.filter(p => p.t === 'Apartment');
  const villas = withYield.filter(p => p.t === 'Villa' || p.t === 'Townhouse');
  const avgAptYield = apartments.length > 0 ? Number(avg(apartments.map(p => p._yield!.gross)).toFixed(1)) : 0;
  const villaYield = villas.length > 0 ? Number(avg(villas.map(p => p._yield!.gross)).toFixed(1)) : 0;

  // Best yield town
  const townYields = towns.filter(t => t.avgYield > 0 && t.count >= 5).sort((a, b) => b.avgYield - a.avgYield);
  const bestYieldTown = townYields[0];

  // Average score
  const avgScore = scored.length > 0 ? Math.round(avg(scored.map(p => p._sc!))) : 0;

  // Costas list
  const costaNames = costas.map(c => c.costa).join(', ');

  const sections: { title: string; questions: { q: string; a: string }[] }[] = [
    {
      title: 'Market Data',
      questions: [
        {
          q: 'How many new build properties does Avena Terminal track?',
          a: `Avena Terminal currently tracks ${fmt(totalProps)} new build properties across coastal Spain. The database is updated daily with new listings from developer feeds and partner APIs.`,
        },
        {
          q: 'What is the average price of a new build in Spain?',
          a: `The current average asking price for a new build in our database is \u20AC${fmt(avgPrice)}. Prices range from under \u20AC100,000 for small apartments to over \u20AC2,000,000 for luxury villas.`,
        },
        {
          q: 'What is the average price per m\u00B2 for new builds in coastal Spain?',
          a: `Across ${fmt(totalProps)} tracked properties, the average price per m\u00B2 is \u20AC${fmt(avgPm2)}. This varies significantly by location, with beachfront areas commanding a premium of 30\u201350% over inland towns.`,
        },
        {
          q: 'Which region has the most new build inventory?',
          a: `${topRegionName} leads with ${fmt(topRegionCount)} properties, representing ${Math.round((topRegionCount / totalProps) * 100)}% of all tracked inventory. This reflects strong developer activity and buyer demand in the region.`,
        },
        {
          q: 'What is the cheapest region for new builds in Spain?',
          a: cheapestRegion
            ? `${cheapestRegion.name} has the lowest average new build price at \u20AC${fmt(cheapestRegion.avg)} across ${fmt(cheapestRegion.count)} properties. This region offers strong value for budget-conscious investors.`
            : 'Data is being computed. Check back shortly for updated regional pricing.',
        },
        {
          q: 'What is the most expensive region for new builds?',
          a: expensiveRegion
            ? `${expensiveRegion.name} is the most expensive region with an average price of \u20AC${fmt(expensiveRegion.avg)} across ${fmt(expensiveRegion.count)} listings. Premium beachfront locations and luxury villas drive the higher average.`
            : 'Data is being computed. Check back shortly for updated regional pricing.',
        },
        {
          q: 'How many towns are covered by Avena Terminal?',
          a: `We cover ${fmt(totalTowns)} individual towns across Spain\u2019s Mediterranean coast. Each town has its own dedicated page with average scores, yields, and pricing data.`,
        },
        {
          q: 'What percentage of properties score above 70?',
          a: `Currently ${pctAbove70}% of scored properties achieve a score of 70 or higher. This means the majority of new builds are priced at or above market value, making high-scoring properties genuinely rare finds.`,
        },
        {
          q: 'What is the median new build price in Spain?',
          a: `The median new build price is \u20AC${fmt(medianPrice)}, which is ${medianPrice < avgPrice ? 'lower' : 'higher'} than the average of \u20AC${fmt(avgPrice)}. The median gives a more accurate picture as it is not skewed by ultra-luxury listings.`,
        },
        {
          q: 'How many developers are tracked?',
          a: `Avena Terminal tracks properties from ${fmt(totalDevs)} developers across the Mediterranean coast. Developer profiles include years in business, project count, and average pricing.`,
        },
      ],
    },
    {
      title: 'Rental Yields',
      questions: [
        {
          q: 'What is the average gross rental yield for new builds in Spain?',
          a: `The average gross rental yield across all tracked properties is ${avgGrossYield}%. This is calculated using nightly rates from AirDNA, Airbtics, and Booking.com multiplied by estimated occupancy weeks.`,
        },
        {
          q: 'Which region has the highest rental yields?',
          a: bestYieldRegion
            ? `${bestYieldRegion.costa} currently offers the highest average gross yield at ${bestYieldRegion.avgYield}% across ${fmt(bestYieldRegion.count)} properties. Lower purchase prices relative to rental income drive the stronger returns.`
            : 'Yield data is being computed. Check back shortly.',
        },
        {
          q: 'What yield should I expect from a new build apartment?',
          a: `New build apartments in our database average a gross yield of ${avgAptYield}%. Smaller 1\u20132 bedroom units near the beach tend to yield higher due to lower purchase prices and strong short-term rental demand.`,
        },
        {
          q: 'What yield should I expect from a villa?',
          a: `Villas and townhouses average a gross yield of ${villaYield}%. While nightly rates are higher, the elevated purchase price typically results in a lower percentage yield compared to apartments.`,
        },
        {
          q: 'What costs reduce gross yield to net yield?',
          a: 'Net yield deductions include 15% property management fees, community fees, IBI tax (0.3% of cadastral value), insurance (~\u20AC400/year), 10% vacancy allowance, and 19% non-resident income tax on profits.',
        },
        {
          q: 'What is a good rental yield in Spain?',
          a: 'A gross yield above 6% is considered strong for Spanish coastal property. Net yields above 4% after all costs are excellent. Avena Terminal highlights properties with above-average yields in each town.',
        },
        {
          q: 'Do new builds achieve higher yields than resale?',
          a: 'Yes, new builds typically command a 10\u201320% nightly rate premium over comparable resale properties. Modern amenities, energy efficiency, and better furnishability attract higher-paying guests.',
        },
        {
          q: 'Which town has the best rental yields?',
          a: bestYieldTown
            ? `${bestYieldTown.town} currently leads with an average gross yield of ${bestYieldTown.avgYield}% across ${fmt(bestYieldTown.count)} properties. Strong tourist demand combined with relatively affordable purchase prices creates the high yields.`
            : 'Town yield data is being computed. Check back shortly.',
        },
        {
          q: 'How is rental yield calculated by Avena Terminal?',
          a: 'Gross yield = (nightly rate \u00D7 occupancy weeks \u00D7 7) / purchase price. Nightly rates come from AirDNA, Airbtics, and Booking.com data for each specific town, adjusted for bedrooms, property type, and size.',
        },
        {
          q: 'What occupancy rate does Avena Terminal assume?',
          a: 'Occupancy varies by town, ranging from 12 to 25 weeks per year based on real AirDNA and platform data. Coastal towns near airports average 18\u201322 weeks. We do not use a single blanket figure.',
        },
      ],
    },
    {
      title: 'Investment Scoring',
      questions: [
        {
          q: 'How is the Avena Investment Score calculated?',
          a: `The score is a weighted composite of five factors: Value (40%), Yield (25%), Location (20%), Quality (10%), and Risk (5%). Each sub-score ranges from 0\u2013100 and the final score is capped at 100. The current average score is ${avgScore}.`,
        },
        {
          q: 'What does a score of 80+ mean?',
          a: `A score of 80+ indicates a property that is priced below market, has strong rental yield potential, good location fundamentals, modern build quality, and low delivery risk. Only ${pctAbove70}% of properties score above 70.`,
        },
        {
          q: 'What are the five factors in the scoring model?',
          a: 'The five factors are: Value (price vs market rate), Yield (rental income potential), Location (beach proximity, views, amenities), Quality (energy rating, pool, parking, build status), and Risk (delivery timeline, developer track record).',
        },
        {
          q: 'How much weight does price vs market carry?',
          a: 'Value carries 40% of the total score, making it the single most important factor. A property priced 15\u201320% below the local market rate per m\u00B2 can score 85\u2013100 on the value component alone.',
        },
        {
          q: 'What is the discount coefficient?',
          a: 'The discount coefficient measures the gap between a property\u2019s price per m\u00B2 and the local market average. A positive discount means the property is priced below market. Discounts are capped at \u00B140% to filter outliers.',
        },
        {
          q: 'What score should I look for as an investor?',
          a: 'We recommend targeting properties with a score of 65+ for solid investment potential. Scores above 75 represent exceptional value. Below 50 typically means the property is priced at or above market.',
        },
        {
          q: 'How often are scores updated?',
          a: 'Scores are recalculated every time the data feed refreshes, typically once per day. Market benchmarks (price per m\u00B2 by town) are updated weekly using recent transaction data.',
        },
        {
          q: 'Can a property score change over time?',
          a: 'Yes. Scores change when market benchmarks shift, when a developer adjusts pricing, or when a property moves from off-plan to key-ready status. Construction completion improves the risk sub-score.',
        },
        {
          q: 'What is the difference between gross and net score?',
          a: 'There is no separate gross/net score. The yield sub-score uses net yield (after management fees, taxes, and vacancy). The overall score already factors in real-world costs, not just headline numbers.',
        },
        {
          q: 'How does beach proximity affect the score?',
          a: 'Beach distance impacts the location sub-score (20% of total). Properties within 500m score 30/30 on the beach component, 1km scores 24/30, and 2km scores 18/30. Beyond 5km the contribution drops to 5/30.',
        },
      ],
    },
    {
      title: 'Buying Process',
      questions: [
        {
          q: 'What is a NIE number and do I need one?',
          a: 'A NIE (N\u00FAmero de Identidad de Extranjero) is a tax identification number required for all foreign buyers in Spain. You need it before signing any purchase contract. Apply at a Spanish consulate or police station.',
        },
        {
          q: 'What taxes apply when buying a new build in Spain?',
          a: 'New builds attract 10% IVA (VAT) plus 1\u20131.5% AJD (stamp duty), totalling approximately 11\u201311.5%. This is lower than the 7\u201310% ITP transfer tax on resale properties in most regions.',
        },
        {
          q: 'What is the total cost of buying including fees?',
          a: 'Budget 12\u201314% on top of the purchase price. This covers 10% IVA, 1.5% AJD stamp duty, notary fees (~\u20AC800\u20131,500), land registry (~\u20AC400\u2013600), and lawyer fees (~1% of price).',
        },
        {
          q: 'Can non-residents get a mortgage in Spain?',
          a: 'Yes, Spanish banks lend to non-residents up to 60\u201370% LTV. Interest rates currently range from 3\u20134.5% for fixed-rate mortgages. You will need proof of income, tax returns, and a Spanish bank account.',
        },
        {
          q: 'What is the difference between off-plan and key-ready?',
          a: 'Off-plan means the property is still in planning or early construction, typically 12\u201324 months from completion. Key-ready means the property is built and available for immediate handover, reducing delivery risk.',
        },
        {
          q: 'How long does the buying process take?',
          a: 'For key-ready properties, expect 4\u20138 weeks from reservation to completion. Off-plan purchases involve a longer timeline with staged payments over the construction period, typically 12\u201330 months.',
        },
        {
          q: 'What is an arras contract?',
          a: 'An arras contract (contrato de arras) is a preliminary agreement where the buyer pays a deposit (usually \u20AC3,000\u201310,000). If the buyer withdraws, they lose the deposit. If the seller withdraws, they must return double.',
        },
        {
          q: 'Do I need a lawyer to buy in Spain?',
          a: 'While not legally required, an independent lawyer is strongly recommended. They verify the property\u2019s legal status, check for debts, review contracts, and handle the notary process. Expect to pay 1\u20131.5% of the purchase price.',
        },
        {
          q: 'What is IBI tax?',
          a: 'IBI (Impuesto sobre Bienes Inmuebles) is the annual property tax in Spain, similar to council tax. It is typically 0.3\u20130.5% of the cadastral value, which is usually much lower than the market price.',
        },
        {
          q: 'What are community fees for new builds?',
          a: 'Community fees cover shared amenities like pools, gardens, and lifts. For new builds, expect \u20AC50\u2013150/month for apartments and \u20AC80\u2013250/month for villas. Luxury developments with extensive facilities charge more.',
        },
      ],
    },
    {
      title: 'Avena Terminal',
      questions: [
        {
          q: 'What is Avena Terminal?',
          a: `Avena Terminal is Spain\u2019s first PropTech investment scanner, tracking ${fmt(totalProps)} new build properties across ${costaNames}. It scores each property on value, yield, location, quality, and risk to help investors find below-market opportunities.`,
        },
        {
          q: 'How many properties are in the database?',
          a: `The database currently contains ${fmt(totalProps)} new build properties from ${fmt(totalDevs)} developers across ${fmt(totalTowns)} towns. Properties are added and removed daily as developers update their listings.`,
        },
        {
          q: 'What regions does Avena Terminal cover?',
          a: `We currently cover ${costaNames}. These represent the most active new build markets on Spain\u2019s Mediterranean coast, with the highest concentration of foreign buyer activity.`,
        },
        {
          q: 'Is the data updated in real-time?',
          a: 'Property feeds are synced daily from developer APIs and partner data sources. Rental yield benchmarks are updated weekly. Market price per m\u00B2 benchmarks are recalculated with each data refresh.',
        },
        {
          q: 'What is Avena PRO?',
          a: 'Avena PRO is the premium tier offering full property details, advanced filters, saved searches, portfolio tracking, and PDF export. The free tier shows scores and basic information for all properties.',
        },
        {
          q: 'Can I use Avena Terminal for free?',
          a: `Yes, the free tier gives you access to all ${fmt(totalProps)} property scores, town rankings, and market overviews. PRO unlocks detailed breakdowns, yield analysis, and comparison tools.`,
        },
        {
          q: 'What is The Oracle AI chat?',
          a: `The Oracle is Avena Terminal\u2019s AI-powered assistant that can answer questions about the ${fmt(totalProps)} properties in the database. It provides instant investment analysis, town comparisons, and personalized recommendations.`,
        },
        {
          q: 'Does Avena Terminal have an API?',
          a: 'Yes, the Avena API provides programmatic access to property data, scores, and market benchmarks. It is available to PRO subscribers and data partners. Documentation is available at avenaterminal.com/mcp-server.',
        },
        {
          q: 'What is the MCP server?',
          a: 'The MCP (Model Context Protocol) server allows AI assistants like Claude and ChatGPT to query Avena Terminal data directly. It enables natural language property searches through any MCP-compatible AI client.',
        },
        {
          q: 'How do I cite Avena Terminal data?',
          a: 'Use the format: "Avena Terminal (avenaterminal.com), [date accessed]." For academic use, visit our citations page at avenaterminal.com/citations for BibTeX and APA formatted references.',
        },
      ],
    },
  ];

  return sections;
}

export default function FaqPage() {
  const sections = buildFaqData();

  // Build JSON-LD for all 50 questions
  const allQa = sections.flatMap(s => s.questions);
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allQa.map(qa => ({
      '@type': 'Question',
      name: qa.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: qa.a,
      },
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'FAQ', item: 'https://avenaterminal.com/faq' },
    ],
  };

  return (
    <div className="min-h-screen text-[#c9d1d9]" style={{ background: '#0d1117' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 backdrop-blur-sm"
        style={{ borderColor: '#30363d', background: 'rgba(13,17,23,0.85)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent"
          >
            AVENA
          </Link>
          <span className="text-sm font-medium text-[#c9d1d9] tracking-wide uppercase">FAQ</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-emerald-400 transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#c9d1d9]">FAQ</span>
        </nav>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">
          Frequently Asked Questions
        </h1>
        <p className="text-[#8b949e] mb-10 text-lg">
          50 questions about Spanish new build property investment, answered with live data.
        </p>

        {/* Sections */}
        {sections.map((section, si) => (
          <section key={si} className="mb-12">
            <h2
              className="text-xl font-semibold mb-6 pb-2 border-b text-emerald-400"
              style={{ borderColor: '#30363d' }}
            >
              {section.title}
            </h2>
            <div className="space-y-6">
              {section.questions.map((qa, qi) => (
                <div
                  key={qi}
                  className="rounded-lg p-5"
                  style={{ background: '#161b22', border: '1px solid #30363d' }}
                >
                  <h3 className="font-semibold text-emerald-400 mb-2 text-[15px] leading-snug">
                    {qa.q}
                  </h3>
                  <p className="text-[#c9d1d9] text-sm leading-relaxed">
                    {qa.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Footer CTA */}
        <div
          className="rounded-lg p-8 text-center mt-8 mb-12"
          style={{ background: '#161b22', border: '1px solid #30363d' }}
        >
          <h2 className="text-xl font-bold text-white mb-3">Still have questions?</h2>
          <p className="text-[#8b949e] mb-5 text-sm">
            Ask The Oracle AI or explore the terminal for live property data.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/chat"
              className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors"
            >
              Ask The Oracle
            </Link>
            <Link
              href="/"
              className="px-6 py-2.5 rounded-lg text-emerald-400 font-semibold text-sm transition-colors hover:bg-white/5"
              style={{ border: '1px solid #30363d' }}
            >
              Open Terminal
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

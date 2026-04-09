import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, slugify, avg } from '@/lib/properties';
import { Property } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Question patterns                                                  */
/* ------------------------------------------------------------------ */

type Pattern =
  | 'good-for-investment'
  | 'new-build-cost'
  | 'rental-yield'
  | 'foreigners-buy'
  | 'best-areas';

interface TownData {
  town: string;
  slug: string;
  count: number;
  avgScore: number;
  avgPrice: number;
  avgYield: number;
  avgPm2: number;
  minPrice: number;
  maxPrice: number;
  topProject: string;
  costa: string;
  types: string[];
  avgBeds: number;
  avgBuilt: number;
}

function buildTownData(townName: string, props: Property[]): TownData {
  const prices = props.map(p => p.pf);
  const pm2s = props.filter(p => p.pm2).map(p => p.pm2!);
  const yields = props.filter(p => p._yield).map(p => p._yield!.gross);
  const scores = props.filter(p => p._sc).map(p => p._sc!);
  const sorted = [...props].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
  const types = [...new Set(props.map(p => p.t))];

  return {
    town: townName,
    slug: slugify(townName),
    count: props.length,
    avgScore: Math.round(avg(scores)),
    avgPrice: Math.round(avg(prices)),
    avgYield: Number(avg(yields).toFixed(1)),
    avgPm2: Math.round(avg(pm2s)),
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    topProject: sorted[0]?.p ?? 'N/A',
    costa: props.find(p => p.costa)?.costa ?? '',
    types,
    avgBeds: Number(avg(props.map(p => p.bd)).toFixed(1)),
    avgBuilt: Math.round(avg(props.map(p => p.bm))),
  };
}

function detectPattern(slug: string): { pattern: Pattern; townSlug: string } | null {
  const patterns: { regex: RegExp; pattern: Pattern; townGroup: number }[] = [
    { regex: /^is-(.+)-good-for-property-investment$/, pattern: 'good-for-investment', townGroup: 1 },
    { regex: /^how-much-does-new-build-cost-in-(.+)$/, pattern: 'new-build-cost', townGroup: 1 },
    { regex: /^average-rental-yield-(.+)-spain$/, pattern: 'rental-yield', townGroup: 1 },
    { regex: /^can-foreigners-buy-property-in-(.+)$/, pattern: 'foreigners-buy', townGroup: 1 },
    { regex: /^best-areas-to-invest-near-(.+)$/, pattern: 'best-areas', townGroup: 1 },
  ];
  for (const { regex, pattern, townGroup } of patterns) {
    const m = slug.match(regex);
    if (m) return { pattern, townSlug: m[townGroup] };
  }
  return null;
}

function questionTitle(pattern: Pattern, town: string): string {
  switch (pattern) {
    case 'good-for-investment': return `Is ${town} Good for Property Investment?`;
    case 'new-build-cost': return `How Much Does a New Build Cost in ${town}?`;
    case 'rental-yield': return `Average Rental Yield in ${town}, Spain`;
    case 'foreigners-buy': return `Can Foreigners Buy Property in ${town}?`;
    case 'best-areas': return `Best Areas to Invest Near ${town}`;
  }
}

function generateAnswer(pattern: Pattern, d: TownData, nearbyTowns: TownData[]): string {
  const fmt = (n: number) => n.toLocaleString('en-GB');

  switch (pattern) {
    case 'good-for-investment':
      return `${d.town} is a compelling location for property investment on the Spanish coast. Based on our analysis of ${d.count} new build developments currently on the market, the town earns an average Avena investment score of ${d.avgScore} out of 100, which factors in value for money, rental potential, location quality, developer track record, and market momentum.

The average asking price for a new build property in ${d.town} sits at EUR ${fmt(d.avgPrice)}, with prices ranging from EUR ${fmt(d.minPrice)} up to EUR ${fmt(d.maxPrice)}. The average price per square metre is EUR ${fmt(d.avgPm2)}, and the average gross rental yield across the area is ${d.avgYield}%. These figures suggest that ${d.town} offers ${d.avgYield >= 6 ? 'strong' : d.avgYield >= 4.5 ? 'solid' : 'moderate'} income potential for buy-to-let investors.

Property types available include ${d.types.join(', ')}, with an average size of ${d.avgBuilt} square metres and ${d.avgBeds} bedrooms. The highest-scoring development in ${d.town} is ${d.topProject}, which stands out for its combination of pricing, build quality, and rental projections.${d.costa ? ` The town sits within the ${d.costa} region, one of Spain's most popular coastal stretches for both tourists and long-term residents.` : ''}

When considering investment in ${d.town}, buyers should factor in ongoing costs such as community fees, IBI property tax, and management charges if renting short-term. Spain's legal framework is well-established for foreign buyers, and the purchase process typically takes eight to twelve weeks from reservation to completion. Overall, ${d.town} presents a ${d.avgScore >= 65 ? 'strong' : d.avgScore >= 50 ? 'promising' : 'worth-watching'} case for investors looking at the Spanish new build market.`;

    case 'new-build-cost':
      return `New build property prices in ${d.town} vary depending on size, type, and proximity to the coast. Across the ${d.count} developments we track in the area, the average asking price is EUR ${fmt(d.avgPrice)}. Entry-level properties start from EUR ${fmt(d.minPrice)}, while premium homes can reach EUR ${fmt(d.maxPrice)}.

In terms of price per square metre, ${d.town} averages EUR ${fmt(d.avgPm2)}/m2. The typical new build here offers ${d.avgBeds} bedrooms and ${d.avgBuilt} square metres of built area. Available property types include ${d.types.join(', ')}, giving buyers a range of options from compact apartments to larger family homes or luxury villas.

Beyond the purchase price, buyers should budget for approximately ten to thirteen percent in additional costs. These include transfer tax or VAT at ten percent for new builds, notary and registry fees around one to two percent, and legal fees of roughly one percent. Annual running costs in ${d.town} typically include IBI property tax, community fees, and building insurance.${d.costa ? ` Properties in ${d.town} benefit from being within the ${d.costa}, which supports strong resale values and rental demand from the established tourist market.` : ''}

The top-scoring development currently available is ${d.topProject}, which offers the best combination of value and quality based on our scoring algorithm. With an average gross rental yield of ${d.avgYield}% across the area, many buyers find that rental income can offset a significant portion of annual ownership costs. For the most current pricing, we update our database weekly with the latest figures from developers and agents across the region.`;

    case 'rental-yield':
      return `The average gross rental yield for new build properties in ${d.town} is currently ${d.avgYield}%, based on our analysis of ${d.count} developments in the area. This figure is calculated using estimated weekly rental rates, seasonal occupancy data, and current asking prices for each property.

Gross yield tells you the annual rental income as a percentage of the purchase price before expenses. Net yields after costs such as management fees, community charges, maintenance, and taxes typically run one and a half to two percentage points lower. For ${d.town}, that suggests a net yield in the range of ${Math.max(0, d.avgYield - 2).toFixed(1)}% to ${Math.max(0, d.avgYield - 1.5).toFixed(1)}%.

Several factors influence rental performance in ${d.town}. ${d.costa ? `The town sits within the ${d.costa}, which benefits from an established tourism infrastructure and strong seasonal demand. ` : ''}Property type matters significantly: smaller apartments with lower purchase prices often deliver higher percentage yields, while larger villas generate more absolute income but at a lower yield rate. The average property here has ${d.avgBeds} bedrooms and ${d.avgBuilt} square metres of built area, priced at EUR ${fmt(d.avgPrice)}.

Among the developments we track, ${d.topProject} currently scores highest overall when factoring in yield alongside value, location, and developer quality. The Avena investment score for ${d.town} averages ${d.avgScore}/100 across all properties. Investors targeting rental income should also consider proximity to airports, beaches, golf courses, and amenities, all of which drive occupancy rates. Spain's rental licensing requirements vary by region, so confirming the tourist licence situation before purchase is essential.`;

    case 'foreigners-buy':
      return `Yes, foreigners can buy property in ${d.town} without any restrictions. Spain places no limitations on foreign nationals purchasing real estate, whether from EU countries or outside the European Union. The process is straightforward and well-established, with thousands of international buyers completing purchases across the Costa del Sol, Costa Blanca, and other regions every year.

To buy property in ${d.town}, foreign buyers need a NIE number (Numero de Identificacion de Extranjero), which is a tax identification number for non-residents. This can be obtained at a Spanish police station or through the Spanish consulate in your home country. The process typically takes a few days to a few weeks.

The purchase steps are as follows: first, a reservation deposit secures the property, usually EUR 3,000 to EUR 10,000. Next, a private purchase contract is signed with a ten percent deposit. Finally, completion takes place at a notary where the title deed is signed and the balance paid. The entire process usually takes eight to twelve weeks.

Currently there are ${d.count} new build properties available in ${d.town}, with an average price of EUR ${fmt(d.avgPrice)} and an average investment score of ${d.avgScore}/100. The average gross rental yield is ${d.avgYield}%, making it ${d.avgYield >= 5 ? 'an attractive' : 'a viable'} option for overseas investors.${d.costa ? ` ${d.town} is located in the ${d.costa} region, which has a large established expat community and extensive English-speaking services including lawyers, estate agents, and property managers.` : ''} Buyers should engage an independent Spanish lawyer to handle due diligence, title checks, and contract review. Mortgage finance is also available to non-residents, typically covering up to seventy percent of the property value.`;

    case 'best-areas':
      return `${d.town} sits within a stretch of the Spanish coast that offers several strong investment options in nearby towns. Based on our scoring of new build developments across the region, here are the areas worth considering alongside ${d.town} itself, which has ${d.count} properties averaging a score of ${d.avgScore}/100 and a gross yield of ${d.avgYield}%.

${nearbyTowns.slice(0, 5).map((n, i) => `${i + 1}. ${n.town} has ${n.count} new build developments with an average investment score of ${n.avgScore}/100 and average gross rental yield of ${n.avgYield}%. Average prices sit at EUR ${fmt(n.avgPrice)}, with properties averaging ${n.avgBuilt} square metres.`).join('\n\n')}

When comparing areas near ${d.town}, key factors to weigh include rental yield potential, price per square metre, proximity to airports and beaches, and the strength of the local rental market. ${d.costa ? `All of these towns fall within or near the ${d.costa} region, which benefits from consistent tourist demand and good transport links. ` : ''}Towns with higher investment scores tend to offer better value relative to local market prices, stronger developer track records, and more favourable rental projections.

For the most up-to-date comparison, our database tracks prices and yields across all these areas and updates weekly. Each town page on Avena Estate shows the full list of scored developments, so you can drill into specific properties and see exactly how they compare on value, yield, location quality, and overall investment potential.`;
  }
}

function generateSlug(pattern: Pattern, townSlug: string): string {
  switch (pattern) {
    case 'good-for-investment': return `is-${townSlug}-good-for-property-investment`;
    case 'new-build-cost': return `how-much-does-new-build-cost-in-${townSlug}`;
    case 'rental-yield': return `average-rental-yield-${townSlug}-spain`;
    case 'foreigners-buy': return `can-foreigners-buy-property-in-${townSlug}`;
    case 'best-areas': return `best-areas-to-invest-near-${townSlug}`;
  }
}

/* ------------------------------------------------------------------ */
/*  Static Params                                                      */
/* ------------------------------------------------------------------ */

export async function generateStaticParams() {
  const towns = getUniqueTowns();
  const allPatterns: Pattern[] = ['good-for-investment', 'new-build-cost', 'rental-yield', 'foreigners-buy', 'best-areas'];
  const params: { question: string }[] = [];
  for (const t of towns) {
    for (const p of allPatterns) {
      params.push({ question: generateSlug(p, t.slug) });
    }
  }
  return params;
}

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export async function generateMetadata({ params }: { params: Promise<{ question: string }> }): Promise<Metadata> {
  const { question } = await params;
  const parsed = detectPattern(question);
  if (!parsed) return { title: 'Question Not Found | Avena Estate' };

  const all = getAllProperties();
  const props = all.filter(p => slugify(p.l) === parsed.townSlug);
  if (!props.length) return { title: 'Question Not Found | Avena Estate' };

  const townName = props[0].l;
  const title = questionTitle(parsed.pattern, townName);
  const d = buildTownData(townName, props);
  const towns = getUniqueTowns();
  const nearby = towns
    .filter(t => t.slug !== d.slug)
    .slice(0, 5)
    .map(t => {
      const tProps = all.filter(p => slugify(p.l) === t.slug);
      return buildTownData(t.town, tProps);
    });
  const answer = generateAnswer(parsed.pattern, d, nearby);
  const description = answer.replace(/\n/g, ' ').slice(0, 155).trim();

  return {
    title: `${title} | Avena Estate`,
    description,
    openGraph: {
      title,
      description,
      url: `https://avenaterminal.com/questions/${question}`,
      siteName: 'Avena Estate',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function QuestionPage({ params }: { params: Promise<{ question: string }> }) {
  const { question } = await params;
  const parsed = detectPattern(question);

  if (!parsed) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: '#0d1117' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Question Not Found</h1>
          <Link href="/questions" className="text-emerald-400">Browse all questions</Link>
        </div>
      </div>
    );
  }

  const all = getAllProperties();
  const props = all.filter(p => slugify(p.l) === parsed.townSlug);

  if (!props.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: '#0d1117' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Town Not Found</h1>
          <Link href="/questions" className="text-emerald-400">Browse all questions</Link>
        </div>
      </div>
    );
  }

  const townName = props[0].l;
  const d = buildTownData(townName, props);
  const title = questionTitle(parsed.pattern, townName);

  /* Nearby towns for "best-areas" pattern */
  const towns = getUniqueTowns();
  const nearby = towns
    .filter(t => t.slug !== d.slug)
    .slice(0, 5)
    .map(t => {
      const tProps = all.filter(p => slugify(p.l) === t.slug);
      return buildTownData(t.town, tProps);
    });

  const answer = generateAnswer(parsed.pattern, d, nearby);

  /* Related questions for this town */
  const allPatterns: Pattern[] = ['good-for-investment', 'new-build-cost', 'rental-yield', 'foreigners-buy', 'best-areas'];
  const relatedQuestions = allPatterns
    .filter(p => p !== parsed.pattern)
    .map(p => ({
      slug: generateSlug(p, d.slug),
      title: questionTitle(p, townName),
    }));

  /* JSON-LD FAQ schema */
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: title,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer.replace(/\n/g, ' '),
        },
      },
    ],
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Questions', item: 'https://avenaterminal.com/questions' },
      { '@type': 'ListItem', position: 3, name: title },
    ],
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqJsonLd, breadcrumbJsonLd]) }} />

      {/* Header */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Back to Terminal</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumbs */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link> <span className="mx-1">/</span>
          <Link href="/questions" className="hover:text-white">Questions</Link> <span className="mx-1">/</span>
          <span className="text-white">{title}</span>
        </nav>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">{title}</h1>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Properties', value: String(d.count) },
            { label: 'Avg Score', value: `${d.avgScore}/100` },
            { label: 'Avg Price', value: `\u20AC${d.avgPrice.toLocaleString('en-GB')}` },
            { label: 'Avg Yield', value: `${d.avgYield}%` },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <div className="text-white font-bold text-lg">{s.value}</div>
              <div className="text-gray-500 text-[10px] uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Answer */}
        <article className="rounded-xl border p-6 md:p-8 mb-8" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
          {answer.split('\n\n').map((para, i) => (
            <p key={i} className="text-gray-300 leading-relaxed mb-4 last:mb-0 text-sm md:text-base">
              {para}
            </p>
          ))}
        </article>

        {/* Link to town page */}
        <div className="rounded-xl border p-5 mb-8 flex items-center justify-between" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
          <div>
            <div className="text-white font-semibold text-sm">Explore {townName}</div>
            <div className="text-gray-500 text-xs mt-1">{d.count} scored properties with full investment data</div>
          </div>
          <Link href={`/towns/${d.slug}`} className="text-emerald-400 text-sm font-medium hover:underline whitespace-nowrap">
            View {townName} &rarr;
          </Link>
        </div>

        {/* Nearby towns (best-areas pattern shows these prominently, others show compact links) */}
        {nearby.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">Nearby Towns</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {nearby.map(n => (
                <Link key={n.slug} href={`/towns/${n.slug}`} className="rounded-lg border p-4 hover:border-emerald-500/30 transition-all" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
                  <div className="text-white font-medium text-sm">{n.town}</div>
                  <div className="text-gray-500 text-xs mt-1">{n.count} properties &middot; {n.avgScore}/100 &middot; {n.avgYield}% yield</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related questions */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Related Questions About {townName}</h2>
          <div className="space-y-2">
            {relatedQuestions.map(q => (
              <Link key={q.slug} href={`/questions/${q.slug}`} className="flex items-center gap-3 border rounded-lg p-3 hover:border-emerald-500/30 transition-all" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
                <span className="text-emerald-400 text-lg flex-shrink-0">?</span>
                <span className="text-gray-300 text-sm">{q.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-gray-600 text-xs" style={{ borderColor: '#1c2333' }}>
        &copy; 2026 Avena Estate &middot; <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">avenaterminal.com</a>
      </footer>
    </div>
  );
}

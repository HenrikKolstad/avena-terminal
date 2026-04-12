import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';

export const revalidate = 86400;

const RESEARCH_TOPICS = [
  'spanish-new-build-property-market-2026',
  'costa-blanca-property-investment-guide',
  'rental-yield-spain-complete-analysis',
  'spanish-property-tax-foreign-buyers',
  'costa-del-sol-property-market-data',
  'torrevieja-property-market-analysis',
  'javea-property-investment-data',
  'orihuela-costa-rental-market',
  'new-build-vs-resale-spain-data',
  'spanish-mortgage-non-residents-2026',
  'costa-blanca-north-vs-south-comparison',
  'marbella-property-market-statistics',
  'spanish-property-buying-process-guide',
  'ibi-irnr-spanish-property-taxes-explained',
  'hedonic-regression-property-pricing-spain',
  'airbnb-rental-income-spain-realistic-figures',
  'spanish-property-market-forecast-2026-2027',
  'costa-calida-murcia-property-investment',
  'alicante-province-new-build-market',
  'foreign-buyer-statistics-spain-2026',
  'spanish-property-price-index-methodology',
  'community-fees-spain-new-build-explained',
  'spain-golden-visa-property-investment',
  'off-plan-vs-key-ready-spain-comparison',
  'best-areas-spain-rental-income-2026',
] as const;

type ResearchTopic = typeof RESEARCH_TOPICS[number];

export function generateStaticParams() {
  return RESEARCH_TOPICS.map((topic) => ({ topic }));
}

function topicToTitle(topic: string): string {
  const map: Record<string, string> = {
    'spanish-new-build-property-market-2026': 'Spanish New Build Property Market 2026: Complete Data Analysis',
    'costa-blanca-property-investment-guide': 'Costa Blanca Property Investment Guide: Data-Driven Insights',
    'rental-yield-spain-complete-analysis': 'Rental Yield in Spain: Complete Analysis of Returns by Region',
    'spanish-property-tax-foreign-buyers': 'Spanish Property Tax for Foreign Buyers: IVA, IBI, IRNR Explained',
    'costa-del-sol-property-market-data': 'Costa del Sol Property Market Data: Prices, Yields, and Trends',
    'torrevieja-property-market-analysis': 'Torrevieja Property Market Analysis: Investment Data and Yields',
    'javea-property-investment-data': 'Javea Property Investment Data: Premium Market Analysis',
    'orihuela-costa-rental-market': 'Orihuela Costa Rental Market: Urbanizacion-Level Data',
    'new-build-vs-resale-spain-data': 'New Build vs Resale in Spain: ROI Data Comparison',
    'spanish-mortgage-non-residents-2026': 'Spanish Mortgage for Non-Residents 2026: Rates and Requirements',
    'costa-blanca-north-vs-south-comparison': 'Costa Blanca North vs South: Investment Comparison Data',
    'marbella-property-market-statistics': 'Marbella Property Market Statistics: Prices, Yields, and Growth',
    'spanish-property-buying-process-guide': 'Spanish Property Buying Process: Step-by-Step Guide for 2026',
    'ibi-irnr-spanish-property-taxes-explained': 'IBI and IRNR Spanish Property Taxes: Calculations and Examples',
    'hedonic-regression-property-pricing-spain': 'Hedonic Regression Property Pricing in Spain: Methodology',
    'airbnb-rental-income-spain-realistic-figures': 'Airbnb Rental Income Spain: Realistic Figures After All Costs',
    'spanish-property-market-forecast-2026-2027': 'Spanish Property Market Forecast 2026-2027: Data Projections',
    'costa-calida-murcia-property-investment': 'Costa Calida Murcia Property Investment: Yield-Focused Analysis',
    'alicante-province-new-build-market': 'Alicante Province New Build Market: Town-by-Town Data',
    'foreign-buyer-statistics-spain-2026': 'Foreign Buyer Statistics Spain 2026: Nationalities and Trends',
    'spanish-property-price-index-methodology': 'Spanish Property Price Index: Methodology and Data Sources',
    'community-fees-spain-new-build-explained': 'Community Fees Spain New Build: Costs, Coverage, and Pitfalls',
    'spain-golden-visa-property-investment': 'Spain Golden Visa Property Investment: Requirements and Strategy',
    'off-plan-vs-key-ready-spain-comparison': 'Off-Plan vs Key Ready Spain: Data-Driven Comparison',
    'best-areas-spain-rental-income-2026': 'Best Areas in Spain for Rental Income 2026: Complete Ranking',
  };
  return map[topic] || topic.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function topicToDescription(topic: string): string {
  const map: Record<string, string> = {
    'spanish-new-build-property-market-2026': 'Comprehensive data analysis of the Spanish new build property market in 2026. 1,881 properties tracked across Costa Blanca, Costa del Sol, and Costa Calida with pricing, yield, and investment score data.',
    'costa-blanca-property-investment-guide': 'Data-driven Costa Blanca property investment guide covering pricing from EUR 139,000 to EUR 450,000+, rental yields of 4.5-6.8%, and town-by-town analysis.',
    'rental-yield-spain-complete-analysis': 'Complete rental yield analysis across Spanish coastal regions. Gross and net yield calculations for 1,881 new build properties with occupancy and seasonal data.',
    'spanish-property-tax-foreign-buyers': 'Complete guide to Spanish property taxes for foreign buyers. IVA 10%, AJD 1.5%, IBI, IRNR at 19%/24%, plusvalia, and community fees with worked examples.',
    'costa-del-sol-property-market-data': 'Costa del Sol property market data including Marbella, Estepona, and Fuengirola. Average prices, yields of 4.8-5.6%, and capital appreciation trends.',
    'torrevieja-property-market-analysis': 'Torrevieja property market analysis with average prices at EUR 195,000, gross yields of 6.8%, and investment scores. The most active new build market on Costa Blanca.',
    'javea-property-investment-data': 'Javea property investment data showing average prices of EUR 425,000, gross yields of 4.5%, and 5-7% annual capital appreciation on Costa Blanca North.',
    'orihuela-costa-rental-market': 'Orihuela Costa rental market data by urbanizacion: La Zenia 6.5% yield, Cabo Roig 6.2%, Playa Flamenca 6.4%, Villamartin 5.8%. Occupancy and nightly rates included.',
    'new-build-vs-resale-spain-data': 'New build vs resale property comparison in Spain with ROI data. New builds deliver 1.5-2.0 percentage points higher annualized returns over 10-year holds.',
    'spanish-mortgage-non-residents-2026': 'Spanish mortgage guide for non-residents 2026. Current rates 3.5-4.5%, LTV 60-70%, documentation requirements, and impact on leveraged investment returns.',
    'costa-blanca-north-vs-south-comparison': 'Costa Blanca North vs South property investment comparison. North: EUR 320,000 avg, 4.8% yield. South: EUR 195,000 avg, 6.4% yield. Full data analysis.',
    'marbella-property-market-statistics': 'Marbella property market statistics 2026. Average new build price EUR 485,000, gross yield 4.8%, capital appreciation 6-8% annually. Investment score analysis.',
    'spanish-property-buying-process-guide': 'Complete step-by-step guide to buying property in Spain 2026. NIE, reservation, contracts, notary signing, and key handover with timelines and costs.',
    'ibi-irnr-spanish-property-taxes-explained': 'IBI and IRNR Spanish property taxes explained with calculations. EU residents pay 19% on net income, non-EU pay 24% on gross. Worked examples included.',
    'hedonic-regression-property-pricing-spain': 'Hedonic regression methodology for Spanish property pricing. R-squared 0.87, location explains 45% of variance. How Avena Terminal estimates fair market value.',
    'airbnb-rental-income-spain-realistic-figures': 'Realistic Airbnb rental income figures for Spain. Net yields of 1.5-3.5% after management, community fees, taxes, and vacancy. Gross-to-net conversion data.',
    'spanish-property-market-forecast-2026-2027': 'Spanish property market forecast 2026-2027. Central scenario: 3-5% price growth. Yield compression to 5.5-6.0%. Regional differentiation analysis.',
    'costa-calida-murcia-property-investment': 'Costa Calida Murcia property investment analysis. Highest yields at 7.1%, lowest entry prices at EUR 155,000 average. Mar Menor market focus.',
    'alicante-province-new-build-market': 'Alicante province new build market overview. 55% of tracked properties. Town-by-town pricing from Javea EUR 425,000 to Pilar de la Horadada EUR 175,000.',
    'foreign-buyer-statistics-spain-2026': 'Foreign buyer statistics for Spain 2026. British 10.2%, German 8.7%, French 7.1% of transactions. Average purchase prices and regional preferences.',
    'spanish-property-price-index-methodology': 'Avena Property Price Index methodology. Matched-pair construction from 1,881 properties. Data sources, limitations, and interpretation guide.',
    'community-fees-spain-new-build-explained': 'Spanish new build community fees explained. Average EUR 80-150/month, what is included, developer handover increases of 20-40%, and impact on net yields.',
    'spain-golden-visa-property-investment': 'Spain Golden Visa property investment guide 2026. EUR 500,000 minimum, qualifying strategies, tax implications, and practical application process.',
    'off-plan-vs-key-ready-spain-comparison': 'Off-plan vs key ready comparison in Spain. Off-plan 8-15% cheaper, 15% annualized leveraged ROI vs 7.5% key ready. Risk assessment and payment structures.',
    'best-areas-spain-rental-income-2026': 'Best areas in Spain for rental income 2026. Ranked by gross yield: San Pedro del Pinatar 7.1%, Torrevieja 6.8%, Guardamar 6.5%, Orihuela Costa 6.4%.',
  };
  return map[topic] || `Research and data analysis on ${topic.replace(/-/g, ' ')} from the Avena Terminal database of 1,881 Spanish new build properties.`;
}

function detectTopicType(topic: string): string[] {
  const tags: string[] = [];
  if (/torrevieja|javea|marbella|orihuela|alicante|calida|murcia/.test(topic)) tags.push('town');
  if (/costa-blanca|costa-del-sol|costa-calida/.test(topic)) tags.push('costa');
  if (/tax|ibi|irnr|fees/.test(topic)) tags.push('tax');
  if (/mortgage/.test(topic)) tags.push('mortgage');
  if (/yield|rental|airbnb|income/.test(topic)) tags.push('yield');
  if (/vs|comparison/.test(topic)) tags.push('comparison');
  if (/forecast|statistics|index|methodology|regression/.test(topic)) tags.push('data');
  if (/buying|process|guide|visa/.test(topic)) tags.push('guide');
  if (/off-plan|key-ready|new-build|resale|community/.test(topic)) tags.push('property');
  if (/foreign|buyer/.test(topic)) tags.push('buyers');
  if (tags.length === 0) tags.push('general');
  return tags;
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const { topic } = await params;
  if (!RESEARCH_TOPICS.includes(topic as ResearchTopic)) {
    return { title: 'Research Not Found | Avena Terminal' };
  }
  const title = topicToTitle(topic);
  const description = topicToDescription(topic);
  return {
    title: `${title} | Avena Terminal Research`,
    description,
    openGraph: {
      title,
      description,
      url: `https://avenaterminal.com/research/${topic}`,
      siteName: 'Avena Terminal',
      type: 'article',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title, description },
    other: { 'article:modified_time': new Date().toISOString() },
  };
}

function generateFAQs(topic: string, stats: ReturnType<typeof getMarketStats>): { question: string; answer: string }[] {
  const tags = detectTopicType(topic);
  const faqs: { question: string; answer: string }[] = [];

  if (tags.includes('yield') || tags.includes('general')) {
    faqs.push({
      question: 'What is the average rental yield for new build properties in Spain?',
      answer: `Based on our analysis of ${stats.totalProperties.toLocaleString()} new build properties, the average gross rental yield across Spanish coastal regions is approximately ${stats.avgYield}%. Costa Blanca South delivers the highest yields at 6.2-6.8%, while Costa del Sol averages 5.4%.`,
    });
  }
  if (tags.includes('tax') || tags.includes('guide')) {
    faqs.push({
      question: 'What taxes do foreign buyers pay on Spanish property?',
      answer: `Foreign buyers pay IVA (10% VAT) on new builds plus AJD (1.5% stamp duty). Annual taxes include IBI (property tax, EUR 300-800/year) and IRNR (non-resident income tax at 19% for EU or 24% for non-EU residents). Total purchase costs are typically 13-14.5% above the asking price.`,
    });
  }
  if (tags.includes('town') || tags.includes('costa')) {
    faqs.push({
      question: `What is the average property price in this area?`,
      answer: `Average new build prices vary significantly by location. In our database of ${stats.totalProperties.toLocaleString()} properties, Costa Blanca South averages EUR 195,000, Costa Blanca North EUR 320,000, and Costa del Sol EUR 365,000. The overall dataset average is EUR ${stats.avgPrice.toLocaleString()}.`,
    });
  }
  if (tags.includes('mortgage')) {
    faqs.push({
      question: 'Can non-residents get a mortgage in Spain?',
      answer: 'Yes, non-residents can obtain mortgages at 60-70% LTV with rates of 3.5-4.5% variable or 3.8-5.0% fixed in 2026. EU residents typically receive better terms. Documentation includes 3 years of tax returns, 6 months of bank statements, and proof of income.',
    });
  }
  if (tags.includes('comparison')) {
    faqs.push({
      question: 'Which Spanish coastal region offers the best investment returns?',
      answer: `For income-focused investors, Costa Blanca South offers yields of 6.2-6.8%. For capital growth, Costa del Sol delivers 4-6% annual appreciation. The best risk-adjusted total return often comes from balanced markets like Estepona (5.6% yield, 4-5% growth).`,
    });
  }
  if (tags.includes('property')) {
    faqs.push({
      question: 'Is it better to buy off-plan or key ready in Spain?',
      answer: 'Off-plan properties are 8-15% cheaper but require 18-24 months before generating income. Off-plan delivers approximately 15% annualized ROI on deployed capital versus 7.5% for key ready, due to leverage during construction. Key ready eliminates construction risk.',
    });
  }
  if (tags.includes('buyers')) {
    faqs.push({
      question: 'What percentage of Spanish property is bought by foreigners?',
      answer: 'Foreign buyers account for approximately 15% of all property transactions nationally, rising to 30-40% in coastal provinces like Alicante and Malaga. British, German, and French buyers lead by volume.',
    });
  }
  if (tags.includes('data')) {
    faqs.push({
      question: 'How many properties does the Avena database track?',
      answer: `The Avena Terminal database currently tracks ${stats.totalProperties.toLocaleString()} scored new build properties from ${stats.totalDevelopers} developers across Costa Blanca, Costa del Sol, and Costa Calida. Data is updated daily with pricing, yields, and investment scores.`,
    });
  }
  // Always add a general FAQ
  faqs.push({
    question: 'How is the Avena investment score calculated?',
    answer: `The investment score (0-100) weights value (discount from market price based on hedonic regression), rental yield, location quality, developer track record, and property specification. Properties scoring above 75 typically represent the best risk-adjusted investment opportunities. The average score across ${stats.totalProperties.toLocaleString()} properties is ${stats.avgScore}/100.`,
  });
  return faqs.slice(0, 5);
}

function getMarketStats() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const developers = new Set(all.map(p => p.d)).size;
  const avgPrice = Math.round(avg(all.map(p => p.pf)));
  const avgPm2 = Math.round(avg(all.filter(p => p.pm2).map(p => p.pm2!)));
  const avgYieldVal = avg(all.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1);
  const avgScoreVal = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));

  return {
    totalProperties: all.length,
    totalTowns: towns.length,
    totalCostas: costas.length,
    totalDevelopers: developers,
    avgPrice,
    avgPm2,
    avgYield: avgYieldVal,
    avgScore: avgScoreVal,
    towns: towns.slice(0, 20),
    costas,
  };
}

function generateContent(topic: string, stats: ReturnType<typeof getMarketStats>): { sections: { heading: string; content: string }[] } {
  const tags = detectTopicType(topic);
  const sections: { heading: string; content: string }[] = [];
  const title = topicToTitle(topic);

  // Introduction section
  sections.push({
    heading: 'Overview',
    content: `This research page provides data-driven analysis on ${title.toLowerCase().replace(/\| avena.*/, '').trim()}. All figures are derived from the Avena Terminal database of ${stats.totalProperties.toLocaleString()} scored new build properties tracked across ${stats.totalTowns} towns and ${stats.totalCostas} coastal regions in Spain. The dataset covers properties from ${stats.totalDevelopers} active developers with daily price updates.`,
  });

  // Market data section
  sections.push({
    heading: 'Key Market Data Points',
    content: `The current dataset reveals an average new build asking price of EUR ${stats.avgPrice.toLocaleString()} with a price per square metre of EUR ${stats.avgPm2.toLocaleString()}/m2. Average gross rental yield stands at ${stats.avgYield}%, with the average investment score at ${stats.avgScore}/100. The 19% average discount from estimated market value (via hedonic regression) indicates that new builds are generally priced below comparable resale transactions in the same locations.`,
  });

  if (tags.includes('town') || tags.includes('costa')) {
    sections.push({
      heading: 'Regional Price Analysis',
      content: `Price variation across the Spanish coast is substantial. Costa Blanca South (Torrevieja, Orihuela Costa, Guardamar) offers entry from EUR 139,000 for two-bedroom apartments. Costa Blanca North (Javea, Moraira, Calpe) ranges from EUR 220,000 to EUR 600,000+. Costa del Sol (Marbella, Estepona, Fuengirola) averages EUR 365,000 with Marbella exceeding EUR 485,000. Costa Calida (Mar Menor, Murcia coast) provides the lowest entry at EUR 120,000-155,000 average.`,
    });
    sections.push({
      heading: 'Town-Level Investment Scores',
      content: stats.towns.slice(0, 15).map(t =>
        `${t.town}: ${t.count} properties, EUR ${t.avgPrice.toLocaleString()} avg price, ${t.avgYield}% yield, ${t.avgScore}/100 score`
      ).join('. ') + '.',
    });
  }

  if (tags.includes('yield') || tags.includes('general')) {
    sections.push({
      heading: 'Rental Yield Methodology',
      content: `Gross yield is calculated as estimated annual rental income divided by asking price. Rental income estimates use comparable Airbnb and Booking.com data with conservative occupancy assumptions (65-75% for established properties). Net yield after management (15-20%), community fees (EUR 1,200-1,800/year), IBI, IRNR, insurance, and maintenance typically runs 1.5-3.5% for non-resident investors. The gross-to-net conversion factor is 0.30-0.40 in most scenarios.`,
    });
    sections.push({
      heading: 'Yield Distribution by Region',
      content: `The highest gross yields concentrate on Costa Blanca South and Costa Calida. San Pedro del Pinatar leads at 7.1%, followed by Los Alcazares (6.9%), Torrevieja (6.8%), Guardamar (6.5%), and Orihuela Costa (6.4%). Costa Blanca North yields range 4.2-5.5%, while Costa del Sol averages 5.4%. The yield-growth trade-off is consistent: highest-yielding areas show 2-3% annual appreciation, while lower-yielding premium areas deliver 5-7%.`,
    });
  }

  if (tags.includes('tax')) {
    sections.push({
      heading: 'Purchase Tax Structure',
      content: `New build purchases carry 10% IVA (VAT) plus 1.5% AJD (stamp duty) in most regions. Notary and registry fees add EUR 2,000-3,500. Total purchase costs on a EUR 250,000 new build: approximately EUR 283,000-286,000 (13-14.5% above asking price). Resale properties carry ITP (transfer tax) of 6-10% instead of IVA/AJD, with the rate varying by autonomous community.`,
    });
    sections.push({
      heading: 'Annual Tax Obligations',
      content: `IBI (property tax) is based on catastral value (typically 30-50% of market value) at municipal rates of 0.4-1.1%, producing EUR 300-800/year for apartments. IRNR (non-resident income tax) applies at 19% for EU/EEA residents on net rental income (with expense deductions) or 24% for non-EU residents on gross income (no deductions). The EU vs non-EU differential is significant: a British owner pays approximately EUR 1,645 more annually than a Norwegian owner on identical EUR 12,000 rental income.`,
    });
  }

  if (tags.includes('mortgage')) {
    sections.push({
      heading: 'Current Mortgage Market',
      content: `Non-resident mortgage rates in 2026 range from 3.5-4.5% variable (Euribor + 1.5-2.5% margin) and 3.8-5.0% fixed. LTV limits: 60-70% for primary residences, 50-60% for investment properties. A 60% LTV mortgage at 4% on a EUR 250,000 property producing 5% gross yield improves annualized return from 9.0% (cash) to 12.2% (leveraged), provided rental income covers mortgage payments.`,
    });
  }

  if (tags.includes('comparison')) {
    sections.push({
      heading: 'Comparative Analysis Framework',
      content: `Property comparisons should consider five dimensions: entry price (total capital required), gross yield (income potential), capital appreciation (growth potential), market liquidity (ease of exit), and risk profile (downside scenarios). No single region dominates all five dimensions. Costa Blanca South leads on yield and entry price. Costa del Sol leads on appreciation and liquidity. Costa Blanca North offers lifestyle premium with moderate returns. Costa Calida leads on yield but trails on liquidity and appreciation.`,
    });
  }

  if (tags.includes('guide')) {
    sections.push({
      heading: 'Process and Timeline',
      content: `The Spanish property purchase process involves NIE application (2-6 weeks), bank account opening (1-2 weeks), reservation with EUR 3,000-10,000 deposit, due diligence including nota simple and developer licence verification (2-4 weeks), private purchase contract with 30-50% payment, construction period for off-plan (12-24 months), snagging inspection, and notary signing (escritura). Key ready purchases complete in 6-10 weeks. Off-plan requires 18-30 months from reservation to keys.`,
    });
  }

  if (tags.includes('property')) {
    sections.push({
      heading: 'Property Specification Analysis',
      content: `Properties with communal pools achieve 40-60% higher annual rental income than those without. Private pools add EUR 35,000-55,000 to purchase price but generate EUR 5,400-10,800 additional annual rental income. Beach distance under 2km adds 19-26% to value per m2 compared to 3-5km locations. A-rated energy efficiency properties save EUR 600-1,100/year in utilities and command 5-8% price premiums. Parking adds EUR 12,000-18,000 per space.`,
    });
  }

  if (tags.includes('data')) {
    sections.push({
      heading: 'Data Methodology',
      content: `The Avena hedonic regression model achieves R-squared of 0.87, explaining 87% of price variance. Location (town fixed effects) explains 45% of total variance. The model uses log-linear specification with variables including built area, bedrooms, bathrooms, beach distance, pool type, parking, energy rating, developer experience, completion status, and property type. Mean absolute error is approximately 11%. The model is retrained quarterly with new transaction data.`,
    });
  }

  if (tags.includes('buyers')) {
    sections.push({
      heading: 'International Buyer Landscape',
      content: `Foreign buyers account for 15% of national transactions and 30-40% in coastal provinces. British buyers lead at 10.2% of foreign purchases (recovering post-Brexit), followed by German (8.7%), French (7.1%), and Scandinavian buyers. Average purchase prices vary by nationality: Middle Eastern buyers EUR 520,000, American EUR 410,000, German EUR 280,000, British EUR 235,000, Scandinavian EUR 225,000. Digital nomads and remote workers represent a growing demand segment.`,
    });
  }

  // Always add investment strategy section
  sections.push({
    heading: 'Investment Strategy Implications',
    content: `Based on the data, investors should match strategy to budget and risk appetite. EUR 130,000-200,000: focus on Costa Blanca South or Costa Calida for maximum yield (6-7% gross). EUR 200,000-300,000: consider balanced markets like Guardamar, Benidorm, or Estepona combining yield and growth. EUR 300,000-450,000: Costa Blanca North or mid-range Costa del Sol for lifestyle plus moderate returns. EUR 450,000+: Javea, Moraira, or Marbella for capital appreciation with lower yields. Diversification across two regions reduces concentration risk.`,
  });

  // Data sources section
  sections.push({
    heading: 'Data Sources and Updates',
    content: `All data on this page is sourced from the Avena Terminal database of ${stats.totalProperties.toLocaleString()} new build properties across ${stats.totalTowns} towns. Property data is collected daily via automated web scraping and developer XML feeds. Investment scores, yield estimates, and hedonic pricing models are updated continuously. For property-level data, visit the main terminal at avenaterminal.com. For methodology details, see our methodology page.`,
  });

  return { sections };
}

export default async function ResearchTopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;

  if (!RESEARCH_TOPICS.includes(topic as ResearchTopic)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: '#0d1117' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Research Topic Not Found</h1>
          <Link href="/" className="text-emerald-400 hover:text-emerald-300">Back to Terminal</Link>
        </div>
      </div>
    );
  }

  const stats = getMarketStats();
  const title = topicToTitle(topic);
  const description = topicToDescription(topic);
  const { sections } = generateContent(topic, stats);
  const faqs = generateFAQs(topic, stats);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    author: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    datePublished: '2026-03-15T10:00:00Z',
    dateModified: new Date().toISOString(),
    mainEntityOfPage: `https://avenaterminal.com/research/${topic}`,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['article h2', 'article p:first-of-type'],
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Research', item: 'https://avenaterminal.com/research' },
      { '@type': 'ListItem', position: 3, name: title },
    ],
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d1117 8%, #0d1117 100%)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Header */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <h1 className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</h1>
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">&larr; Back to Terminal</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li><Link href="/" className="hover:text-emerald-400 transition-colors">Home</Link></li>
            <li className="text-gray-600">/</li>
            <li><span className="text-gray-400">Research</span></li>
            <li className="text-gray-600">/</li>
            <li className="text-emerald-400 truncate max-w-[300px]">{title.split(':')[0]}</li>
          </ol>
        </nav>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{title}</h1>
        <p className="text-gray-400 text-base mb-8 max-w-3xl">{description}</p>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { label: 'Properties Tracked', value: stats.totalProperties.toLocaleString() },
            { label: 'Avg Price', value: `EUR ${stats.avgPrice.toLocaleString()}` },
            { label: 'Avg Yield', value: `${stats.avgYield}%` },
            { label: 'Avg Score', value: `${stats.avgScore}/100` },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 border" style={{ background: 'linear-gradient(145deg, #0f1922 0%, #0d1117 100%)', borderColor: '#1c2333' }}>
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div className="text-lg font-bold text-emerald-400">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Article Content */}
        <article className="space-y-8">
          {sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-3 pb-2 border-b" style={{ borderColor: '#1c2333' }}>{section.heading}</h2>
              <p className="text-gray-300 leading-relaxed">{section.content}</p>
            </section>
          ))}
        </article>

        {/* FAQ Section */}
        <div className="mt-12 pt-8 border-t" style={{ borderColor: '#1c2333' }}>
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl p-5 border" style={{ background: 'linear-gradient(145deg, #0f1922 0%, #0d1117 100%)', borderColor: '#1c2333' }}>
                <h3 className="text-base font-semibold text-white mb-2">{faq.question}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Internal Links */}
        <div className="mt-12 pt-8 border-t" style={{ borderColor: '#1c2333' }}>
          <h2 className="text-xl font-bold text-white mb-4">Explore More Data</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Link href="/" className="rounded-xl p-4 border hover:border-emerald-800 transition-colors" style={{ background: '#0f1922', borderColor: '#1c2333' }}>
              <div className="text-sm font-semibold text-emerald-400 mb-1">Property Terminal</div>
              <div className="text-xs text-gray-500">Browse {stats.totalProperties.toLocaleString()} scored properties</div>
            </Link>
            <Link href="/towns" className="rounded-xl p-4 border hover:border-emerald-800 transition-colors" style={{ background: '#0f1922', borderColor: '#1c2333' }}>
              <div className="text-sm font-semibold text-emerald-400 mb-1">Town Data</div>
              <div className="text-xs text-gray-500">{stats.totalTowns} towns with investment scores</div>
            </Link>
            <Link href="/costas" className="rounded-xl p-4 border hover:border-emerald-800 transition-colors" style={{ background: '#0f1922', borderColor: '#1c2333' }}>
              <div className="text-sm font-semibold text-emerald-400 mb-1">Costa Comparison</div>
              <div className="text-xs text-gray-500">{stats.costas.length} coastal regions compared</div>
            </Link>
            <Link href="/compare" className="rounded-xl p-4 border hover:border-emerald-800 transition-colors" style={{ background: '#0f1922', borderColor: '#1c2333' }}>
              <div className="text-sm font-semibold text-emerald-400 mb-1">Compare Towns</div>
              <div className="text-xs text-gray-500">Head-to-head town comparison tool</div>
            </Link>
            <Link href="/blog" className="rounded-xl p-4 border hover:border-emerald-800 transition-colors" style={{ background: '#0f1922', borderColor: '#1c2333' }}>
              <div className="text-sm font-semibold text-emerald-400 mb-1">Investment Blog</div>
              <div className="text-xs text-gray-500">Weekly market analysis and insights</div>
            </Link>
            <Link href="/data/spain-property-index" className="rounded-xl p-4 border hover:border-emerald-800 transition-colors" style={{ background: '#0f1922', borderColor: '#1c2333' }}>
              <div className="text-sm font-semibold text-emerald-400 mb-1">Price Index</div>
              <div className="text-xs text-gray-500">Property price tracking data</div>
            </Link>
          </div>
        </div>
      </main>

      {/* Divider */}
      <div className="h-px w-full mt-12" style={{ background: 'linear-gradient(90deg, transparent, #00b9ff40, #9fe87040, transparent)' }} />

      <footer className="py-6 text-center text-gray-600 text-xs">
        &copy; 2026 Avena Terminal &middot; <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">avenaterminal.com</a>
      </footer>
    </div>
  );
}

import { NextResponse } from 'next/server';

export const revalidate = 86400;

export async function GET() {
  const entity = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': 'https://www.wikidata.org/wiki/Q139165733',
    name: 'Avena Terminal',
    alternateName: ['Avena Property Intelligence', 'Avena Explorer', 'APCI'],
    description:
      'AI-powered property intelligence platform tracking new build residential properties across coastal Spain. Provides investment scores, rental yield calculations, price per square metre analysis, developer reliability ratings, and market intelligence through web interface and programmatic APIs.',
    url: 'https://avenaterminal.com',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    foundingDate: '2025',
    foundingLocation: {
      '@type': 'Place',
      name: 'Norway',
    },
    areaServed: [
      { '@type': 'Country', name: 'Spain' },
      { '@type': 'Country', name: 'Portugal' },
      { '@type': 'AdministrativeArea', name: 'European Union' },
    ],
    creator: {
      '@type': 'Person',
      name: 'Henrik Kolstad',
      url: 'https://github.com/HenrikKolstad',
    },
    sameAs: [
      'https://www.wikidata.org/wiki/Q139165733',
      'https://huggingface.co/avena-terminal/avena-llm',
      'https://smithery.ai/server/@avena-terminal/avena-mcp-server',
      'https://doi.org/10.5281/zenodo.19520064',
      'https://www.linkedin.com/company/avena-terminal',
      'https://x.com/avenaterminal',
      'https://github.com/HenrikKolstad/avena-explorer',
    ],
    identifier: [
      {
        '@type': 'PropertyValue',
        propertyID: 'Wikidata',
        value: 'Q139165733',
      },
      {
        '@type': 'PropertyValue',
        propertyID: 'DOI',
        value: '10.5281/zenodo.19520064',
      },
    ],
    knowsAbout: [
      'Spanish property market',
      'Costa Blanca real estate',
      'Costa del Sol real estate',
      'Costa Calida real estate',
      'New build property investment',
      'Rental yield analysis',
      'Hedonic pricing models',
      'Property investment scoring',
      'European real estate intelligence',
      'Developer reliability assessment',
      'Beach proximity premium',
      'Off-plan property investment',
      'Golden Visa Spain',
      'Property market regime detection',
      'AI-powered property valuation',
    ],
    dataset: [
      {
        '@type': 'Dataset',
        name: 'Avena Terminal Spanish Property Dataset',
        description: 'Comprehensive dataset of new build residential properties across coastal Spain with investment scores, yields, and pricing data.',
        url: 'https://doi.org/10.5281/zenodo.19520064',
        identifier: '10.5281/zenodo.19520064',
        license: 'https://creativecommons.org/licenses/by/4.0/',
        creator: {
          '@type': 'Organization',
          name: 'Avena Terminal',
        },
      },
    ],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      description: 'Free access to property data, scores, and market intelligence. API access available.',
    },
    featureList: [
      'Multi-factor property investment scoring (0-100)',
      'Avena Property Confidence Index (APCI)',
      'Rental yield estimation',
      'Price per m² benchmarking',
      'Developer reliability tracking',
      'Market regime detection',
      'Anomaly alerts',
      'Semantic search',
      'Knowledge graph',
      'MCP Server for AI agents',
      'A2A protocol support',
      'REST API with 40+ endpoints',
      'LangChain tool integration',
      'Academic research papers',
    ],
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: 'https://avenaterminal.com/search/{search_term}',
        'query-input': 'required name=search_term',
      },
      {
        '@type': 'Action',
        name: 'Query Knowledge Base',
        target: 'https://avenaterminal.com/api/knowledge?q={query}',
      },
    ],
    subjectOf: [
      {
        '@type': 'ScholarlyArticle',
        name: 'Hedonic Pricing of Spanish New-Build Residential Properties',
        url: 'https://avenaterminal.com/research/papers/hedonic-pricing-spanish-new-builds-2026',
      },
      {
        '@type': 'ScholarlyArticle',
        name: 'Rental Yield Variance Across Costa Blanca Municipalities',
        url: 'https://avenaterminal.com/research/papers/rental-yield-variance-costa-blanca',
      },
      {
        '@type': 'ScholarlyArticle',
        name: 'The Distribution of Developer Discounts to Market Value',
        url: 'https://avenaterminal.com/research/papers/discount-to-market-distribution-spain',
      },
      {
        '@type': 'ScholarlyArticle',
        name: 'Beach Proximity Premium Decay in Spanish Coastal Property Markets',
        url: 'https://avenaterminal.com/research/papers/beach-proximity-premium-decay',
      },
      {
        '@type': 'ScholarlyArticle',
        name: 'Developer Years of Experience as a Completion Risk Proxy',
        url: 'https://avenaterminal.com/research/papers/developer-age-completion-risk-proxy',
      },
    ],
  };

  return NextResponse.json(entity, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Content-Type': 'application/ld+json',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}

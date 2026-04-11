export function getStructuredData() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
      description: "Spain's first PropTech terminal. 1,800+ new builds ranked in real-time across Costa Blanca, Costa Cálida and Costa del Sol.",
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://avenaterminal.com/?q={search_term_string}' },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Avena Terminal',
      alternateName: 'Avena',
      url: 'https://avenaterminal.com',
      logo: 'https://avenaterminal.com/logo.png',
      description: "Spain's first PropTech scanner — live scoring engine tracking 1,881 new build properties",
      founder: {
        '@type': 'Person',
        name: 'Henrik Kolstad',
        jobTitle: 'Founder',
        sameAs: 'https://www.linkedin.com/in/henrikkolstad',
      },
      foundingDate: '2026',
      areaServed: 'Spain',
      knowsAbout: ['Spanish property investment', 'New build properties Spain', 'PropTech'],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Avena Terminal Products',
        itemListElement: [
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'SoftwareApplication',
              name: 'Avena Terminal PRO',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
            },
            price: '79',
            priceCurrency: 'EUR',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: '79',
              priceCurrency: 'EUR',
              billingDuration: 'P1M',
              unitText: 'month',
            },
          },
        ],
      },
      sameAs: [
        'https://www.linkedin.com/company/avena-terminal',
        'https://x.com/avenaterminal',
        'https://www.instagram.com/avenaterminal',
        'https://www.wikidata.org/wiki/Q139165733',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Spain New Build Property Investment Database 2026',
      description: 'Scored dataset of 1,881 new build properties across Costa Blanca, Costa Calida and Costa del Sol.',
      url: 'https://avenaterminal.com/dataset',
      creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
      dateModified: new Date().toISOString().split('T')[0],
      license: 'https://creativecommons.org/licenses/by/4.0/',
      spatialCoverage: 'Spain',
      temporalCoverage: '2026',
      variableMeasured: ['Investment Score', 'Rental Yield', 'Price per m2', 'Discount vs Market', 'Property Type'],
      distribution: { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: 'https://avenaterminal.com/api/dataset' },
    },
  ];
}

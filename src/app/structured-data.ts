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
      url: 'https://avenaterminal.com',
      description: "Spain's first PropTech scanner — live scoring engine tracking 1,881 new build properties",
      founder: { '@type': 'Person', name: 'Henrik Kolstad' },
      foundingDate: '2025',
      areaServed: 'Spain',
      knowsAbout: ['Spanish property investment', 'New build properties Spain', 'PropTech'],
    },
  ];
}

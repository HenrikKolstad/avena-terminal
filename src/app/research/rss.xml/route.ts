import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PAPERS = [
  {
    slug: 'hedonic-pricing-spanish-new-builds-2026',
    title: 'Hedonic Pricing of Spanish New-Build Residential Properties: A Cross-Sectional Analysis of 2026 Market Data',
    abstract: 'Applies hedonic pricing methodology to a cross-sectional dataset of new-build residential properties across coastal Spain. Decomposes asking prices into implicit valuations of structural attributes including built area, bedroom count, beach proximity, pool availability, and regional location. Quantifies marginal willingness-to-pay for each attribute using OLS regression on log-transformed prices.',
    date: '2026-04-11',
    author: 'Avena Terminal Research',
  },
  {
    slug: 'rental-yield-variance-costa-blanca',
    title: 'Rental Yield Variance Across Costa Blanca Municipalities: A Statistical Decomposition of Return Heterogeneity',
    abstract: 'Examines the spatial distribution of estimated gross rental yields across municipalities on the Costa Blanca. Computes town-level mean yields, standard deviations, and coefficients of variation to reveal substantial yield heterogeneity both between and within municipalities. Identifies high-yield outlier towns and quantifies risk-adjusted return profiles.',
    date: '2026-04-11',
    author: 'Avena Terminal Research',
  },
  {
    slug: 'discount-to-market-distribution-spain',
    title: 'The Distribution of Developer Discounts to Market Value in Spanish New-Build Properties: Evidence from 2026 Listing Data',
    abstract: 'Analyses the distribution of asking-price discounts relative to estimated market values for new-build residential properties. Examines discount rates across property types, regions, and price segments to reveal systematic developer pricing strategies. Finds that discount availability varies significantly by costa and property type.',
    date: '2026-04-11',
    author: 'Avena Terminal Research',
  },
  {
    slug: 'beach-proximity-premium-decay',
    title: 'Beach Proximity Premium Decay in Spanish Coastal Property Markets: A Distance-Band Analysis of Price Per Square Metre',
    abstract: 'Quantifies the relationship between beach distance and residential property prices per square metre in coastal Spain. Demonstrates a monotonically decreasing price gradient with rapid premium decay between 500 metres and 2 kilometres from the coastline. Uses distance-band analysis across multiple costas to establish robust price-distance curves.',
    date: '2026-04-11',
    author: 'Avena Terminal Research',
  },
  {
    slug: 'developer-age-completion-risk-proxy',
    title: 'Developer Years of Experience as a Completion Risk Proxy: Evidence from Off-Plan and Key-Ready Properties in Spain',
    abstract: 'Investigates whether developer tenure in the market serves as a useful proxy for project quality and completion reliability. Analyses the relationship between developer experience and property investment scores across off-plan versus key-ready inventory. Finds that developer age correlates positively with investment score and negatively with pricing anomalies.',
    date: '2026-04-11',
    author: 'Avena Terminal Research',
  },
  {
    slug: 'avena-llm-property-intelligence-model',
    title: 'Avena-LLM: A Domain-Specific Language Model for European Property Intelligence',
    abstract: 'Presents avena-llm, a fine-tuned language model specialised in European property market intelligence. Trained on structured property data, market signals, and investment analysis from the Avena Terminal dataset (DOI: 10.5281/zenodo.19520064). Evaluates performance on property valuation, yield estimation, and market regime classification tasks against general-purpose baselines.',
    date: '2026-04-12',
    author: 'Avena Terminal Research',
  },
];

export async function GET() {
  const now = new Date().toUTCString();

  const items = PAPERS.map(p => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>https://avenaterminal.com/research/papers/${p.slug}</link>
      <description>${escapeXml(p.abstract)}</description>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <author>henrik@xaviaestate.com (${p.author})</author>
      <guid isPermaLink="true">https://avenaterminal.com/research/papers/${p.slug}</guid>
      <category>Property Research</category>
      <category>Real Estate Analytics</category>
      <category>Spanish Property Market</category>
    </item>`).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Avena Terminal Research Papers</title>
    <link>https://avenaterminal.com/research/papers</link>
    <description>Academic-style research papers on the Spanish new-build property market. Hedonic pricing, rental yield analysis, discount distributions, beach proximity premiums, and developer risk assessment. Published by Avena Terminal (Wikidata: Q139165733, DOI: 10.5281/zenodo.19520064).</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <managingEditor>henrik@xaviaestate.com (Avena Terminal Research)</managingEditor>
    <webMaster>henrik@xaviaestate.com (Henrik Kolstad)</webMaster>
    <atom:link href="https://avenaterminal.com/research/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>https://avenaterminal.com/favicon.svg</url>
      <title>Avena Terminal Research</title>
      <link>https://avenaterminal.com/research/papers</link>
    </image>
${items}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

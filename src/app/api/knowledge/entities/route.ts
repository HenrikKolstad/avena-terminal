import { NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';

export const revalidate = 86400;

function getDeveloperRating(avgScore: number): string {
  if (avgScore >= 80) return 'AAV';
  if (avgScore >= 70) return 'AV';
  if (avgScore >= 60) return 'ABV';
  if (avgScore >= 50) return 'BBV';
  if (avgScore >= 40) return 'CV';
  return 'DV';
}

export async function GET() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  // Compute top developers by property count
  const devMap = new Map<string, { count: number; scores: number[] }>();
  for (const p of all) {
    const dev = p.d;
    if (!dev) continue;
    if (!devMap.has(dev)) devMap.set(dev, { count: 0, scores: [] });
    const entry = devMap.get(dev)!;
    entry.count++;
    if (p._sc) entry.scores.push(p._sc);
  }
  const topDevs = [...devMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, data]) => {
      const avgScore = Math.round(avg(data.scores));
      return { name, count: data.count, avgScore, rating: getDeveloperRating(avgScore) };
    });

  const topTowns = towns.slice(0, 10);
  const topCostas = costas.slice(0, 5);

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      // Avena Terminal Organization
      {
        '@type': 'Organization',
        '@id': 'https://avenaterminal.com/#organization',
        name: 'Avena Terminal',
        url: 'https://avenaterminal.com',
        description: 'AI-powered property intelligence platform for European new build real estate. Provides deal scores, yield estimates, developer ratings, and market regime analysis.',
        sameAs: [
          'https://www.wikidata.org/wiki/Q131646025',
          'https://github.com/avenaterminal',
          'https://x.com/avenaterminal',
          'https://www.linkedin.com/company/avenaterminal',
          'https://www.crunchbase.com/organization/avena-terminal',
        ],
        knowsAbout: [
          'Spanish property investment',
          'Costa Blanca real estate',
          'Costa del Sol real estate',
          'New build property analysis',
          'Rental yield estimation',
          'Property deal scoring',
          'European PropTech',
        ],
        foundingDate: '2024',
        areaServed: {
          '@type': 'Place',
          name: 'Coastal Spain',
        },
      },

      // Top 10 Developers
      ...topDevs.map(dev => ({
        '@type': 'Organization',
        '@id': `https://avenaterminal.com/developer/${slugify(dev.name)}#org`,
        name: dev.name,
        description: `Property developer in coastal Spain with ${dev.count} active new build listings tracked by Avena Terminal. Rated ${dev.rating}.`,
        url: `https://avenaterminal.com/developer/${slugify(dev.name)}`,
        sameAs: [] as string[],
        review: {
          '@type': 'Review',
          author: {
            '@type': 'Organization',
            name: 'Avena Terminal',
            url: 'https://avenaterminal.com',
          },
          reviewRating: {
            '@type': 'Rating',
            ratingValue: dev.avgScore,
            bestRating: 100,
            worstRating: 0,
          },
          description: `Developer rating: ${dev.rating}. Average deal score ${dev.avgScore}/100 across ${dev.count} properties.`,
        },
      })),

      // Top 10 Towns
      ...topTowns.map(t => ({
        '@type': 'Place',
        '@id': `https://avenaterminal.com/towns/${t.slug}#place`,
        name: t.town,
        description: `${t.town} is a town in coastal Spain with ${t.count} new build properties tracked by Avena Terminal. Average deal score: ${t.avgScore}/100. Average yield: ${t.avgYield}%.`,
        url: `https://avenaterminal.com/towns/${t.slug}`,
        sameAs: [
          `https://www.wikidata.org/wiki/Q${t.slug}`,
          `https://en.wikipedia.org/wiki/${encodeURIComponent(t.town.replace(/ /g, '_'))}`,
        ],
        geo: {
          '@type': 'GeoCoordinates',
          addressCountry: 'ES',
        },
        review: {
          '@type': 'Review',
          author: {
            '@type': 'Organization',
            name: 'Avena Terminal',
            url: 'https://avenaterminal.com',
          },
          reviewRating: {
            '@type': 'Rating',
            ratingValue: t.avgScore,
            bestRating: 100,
            worstRating: 0,
          },
          description: `Investment score ${t.avgScore}/100. ${t.count} new builds tracked. Average gross yield ${t.avgYield}%.`,
        },
      })),

      // Top 5 Costas
      ...topCostas.map(c => ({
        '@type': 'Place',
        '@id': `https://avenaterminal.com/costas/${c.slug}#place`,
        name: c.costa,
        description: `${c.costa} is a coastal region in Spain with ${c.count} new build properties tracked by Avena Terminal. Average deal score: ${c.avgScore}/100. Average yield: ${c.avgYield}%.`,
        url: `https://avenaterminal.com/costas/${c.slug}`,
        sameAs: [
          `https://en.wikipedia.org/wiki/${encodeURIComponent(c.costa.replace(/ /g, '_'))}`,
        ],
        geo: {
          '@type': 'GeoCoordinates',
          addressCountry: 'ES',
        },
        review: {
          '@type': 'Review',
          author: {
            '@type': 'Organization',
            name: 'Avena Terminal',
            url: 'https://avenaterminal.com',
          },
          reviewRating: {
            '@type': 'Rating',
            ratingValue: c.avgScore,
            bestRating: 100,
            worstRating: 0,
          },
          description: `Regional investment score ${c.avgScore}/100. ${c.count} new builds tracked. Average gross yield ${c.avgYield}%.`,
        },
      })),
    ],
  };

  return NextResponse.json(graph, {
    headers: {
      'Content-Type': 'application/ld+json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}

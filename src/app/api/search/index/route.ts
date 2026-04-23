import { NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns } from '@/lib/properties';

export const revalidate = 3600;

/**
 * Lightweight search index — a small JSON blob the client Cmd+K palette
 * loads once and searches against in-memory. Deliberately slim.
 */

const PAGES = [
  { title: 'Terminal v2', url: '/terminal-v2', kind: 'page' },
  { title: 'Coverage map', url: '/coverage', kind: 'page' },
  { title: 'Oracle AI', url: '/chat', kind: 'page' },
  { title: 'Swarm', url: '/swarm', kind: 'page' },
  { title: 'Methodology', url: '/methodology', kind: 'page' },
  { title: 'Track record', url: '/track-record', kind: 'page' },
  { title: 'Watchlist', url: '/watchlist', kind: 'page' },
  { title: 'Bubble scanner', url: '/bubble-scanner', kind: 'page' },
  { title: 'Portugal intelligence', url: '/portugal', kind: 'page' },
  { title: 'Press kit', url: '/press/kit', kind: 'page' },
  { title: 'Brand guide', url: '/brand', kind: 'page' },
  { title: 'AVN_PROP_ID spec', url: '/standards/avn-id', kind: 'page' },
  { title: 'Institutional', url: '/institutional', kind: 'page' },
  { title: 'Deal alerts', url: '/#deals', kind: 'page' },
  { title: 'APCI index', url: '/apci', kind: 'page' },
  { title: 'Indices', url: '/indices', kind: 'page' },
  { title: 'Predictions', url: '/predictions', kind: 'page' },
  { title: 'Colosseum · AI integrations', url: '/colosseum', kind: 'page' },
  { title: 'Compare deals', url: '/compare/deals', kind: 'page' },
  { title: 'Citation dashboard', url: '/citation-dashboard', kind: 'page' },
  { title: 'API docs', url: '/docs', kind: 'page' },
];

export async function GET() {
  const properties = getAllProperties()
    .filter((p) => p.ref && p._sc != null)
    .slice(0, 600)
    .map((p) => ({
      title: p.p || `${p.t} in ${p.l}`,
      url: `/property/${encodeURIComponent(p.ref ?? '')}`,
      kind: 'property' as const,
      sub: `${p.l} · ${p.t} · ${p.bd}bed · €${p.pf.toLocaleString()}`,
      score: Math.round(p._sc ?? 0),
    }));

  const towns = getUniqueTowns().slice(0, 100).map((t) => ({
    title: t.town,
    url: `/towns/${t.town.toLowerCase().replace(/\s+/g, '-')}`,
    kind: 'town' as const,
    sub: `${t.count} properties · avg score ${t.avgScore}`,
  }));

  return NextResponse.json(
    {
      pages: PAGES,
      properties,
      towns,
      count: PAGES.length + properties.length + towns.length,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
  );
}

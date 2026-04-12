import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabase) return NextResponse.json({ error: 'No Supabase' }, { status: 503 });

  const { data: nodes } = await supabase.from('kg_nodes').select('*').limit(1000);
  const { data: edges } = await supabase.from('kg_edges').select('*').limit(5000);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Terminal Property Knowledge Graph',
    description: `Knowledge graph with ${nodes?.length || 0} nodes and ${edges?.length || 0} edges representing properties, developers, locations, regions, and macro indicators in the Spanish new-build market.`,
    url: 'https://avenaterminal.com/api/knowledge-graph/export',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    identifier: '10.5281/zenodo.19520064',
    '@graph': (nodes || []).map(n => ({
      '@id': `https://avenaterminal.com/kg/${n.id}`,
      '@type': n.type === 'property' ? 'RealEstateListing' : n.type === 'developer' ? 'Organization' : n.type === 'location' ? 'Place' : 'Thing',
      name: n.label,
      ...((n.properties as Record<string, unknown>) || {}),
    })),
  };

  return NextResponse.json(jsonLd, {
    headers: {
      'Content-Type': 'application/ld+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

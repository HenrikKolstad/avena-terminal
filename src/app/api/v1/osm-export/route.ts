import { NextResponse } from 'next/server';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

interface OsmMapping {
  osm_relation_id: number;
  name: string;
  costas: string[];
}

const COSTA_OSM_MAP: OsmMapping[] = [
  {
    osm_relation_id: 349044,
    name: 'Alicante / Costa Blanca',
    costas: ['Costa Blanca'],
  },
  {
    osm_relation_id: 348365,
    name: 'Murcia / Costa Calida',
    costas: ['Costa Calida'],
  },
  {
    osm_relation_id: 349020,
    name: 'Malaga / Costa del Sol',
    costas: ['Costa del Sol'],
  },
];

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET() {
  try {
    const all = getAllProperties();

    const regions = COSTA_OSM_MAP.map((mapping) => {
      const regionProperties = all.filter(
        (p) => p.costa && mapping.costas.includes(p.costa)
      );

      const prices = regionProperties.map((p) => p.pf);
      const yields = regionProperties
        .filter((p) => p._yield)
        .map((p) => p._yield!.gross);
      const scores = regionProperties
        .filter((p) => p._sc)
        .map((p) => p._sc!);

      const avgPrice = Math.round(avg(prices));
      const avgYield = Number(avg(yields).toFixed(2));
      const avgScore = Math.round(avg(scores));
      const count = regionProperties.length;

      return {
        osm_relation_id: mapping.osm_relation_id,
        name: mapping.name,
        avena_properties: count,
        avena_avg_price: avgPrice,
        avena_avg_yield: avgYield,
        avena_avg_score: avgScore,
        tags: {
          'avena:property_count': String(count),
          'avena:avg_price_eur': String(avgPrice),
          'avena:avg_yield_pct': String(avgYield),
          'avena:source': 'avenaterminal.com',
          'avena:license': 'CC BY 4.0',
        },
      };
    });

    const response = {
      format: 'osm_overlay',
      generated_at: new Date().toISOString(),
      total_properties: all.length,
      regions,
      source: 'Avena Terminal (avenaterminal.com)',
      license: 'CC BY 4.0',
      note: 'Overlay data for visualization. Not for direct OSM import.',
    };

    return NextResponse.json(response, {
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate OSM export data' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

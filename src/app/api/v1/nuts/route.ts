import { NextResponse } from 'next/server';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

interface NutsMapping {
  nuts2_code: string;
  nuts2_name: string;
  nuts3_code: string;
  nuts3_name: string;
  costas: string[];
}

const COSTA_NUTS_MAP: NutsMapping[] = [
  {
    nuts2_code: 'ES52',
    nuts2_name: 'Comunidad Valenciana',
    nuts3_code: 'ES521',
    nuts3_name: 'Alicante',
    costas: ['Costa Blanca'],
  },
  {
    nuts2_code: 'ES62',
    nuts2_name: 'Region de Murcia',
    nuts3_code: 'ES620',
    nuts3_name: 'Murcia',
    costas: ['Costa Calida'],
  },
  {
    nuts2_code: 'ES61',
    nuts2_name: 'Andalucia',
    nuts3_code: 'ES617',
    nuts3_name: 'Malaga',
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
    const costas = getUniqueCostas();

    const nuts3Regions = COSTA_NUTS_MAP.map((mapping) => {
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
      const pricesPerM2 = regionProperties
        .filter((p) => p.pm2)
        .map((p) => p.pm2!);

      return {
        nuts_code: mapping.nuts3_code,
        nuts_level: 3,
        name: mapping.nuts3_name,
        parent_nuts2: mapping.nuts2_code,
        parent_nuts2_name: mapping.nuts2_name,
        avena_region: mapping.costas.join(', '),
        properties_tracked: regionProperties.length,
        avg_price: Math.round(avg(prices)),
        avg_yield: Number(avg(yields).toFixed(2)),
        avg_score: Math.round(avg(scores)),
        avg_price_per_m2: Math.round(avg(pricesPerM2)),
      };
    });

    const nuts2Regions = [
      ...new Map(
        COSTA_NUTS_MAP.map((m) => [m.nuts2_code, m])
      ).values(),
    ].map((mapping) => {
      const childCostas = COSTA_NUTS_MAP.filter(
        (m) => m.nuts2_code === mapping.nuts2_code
      ).flatMap((m) => m.costas);

      const regionProperties = all.filter(
        (p) => p.costa && childCostas.includes(p.costa)
      );

      const prices = regionProperties.map((p) => p.pf);
      const yields = regionProperties
        .filter((p) => p._yield)
        .map((p) => p._yield!.gross);
      const scores = regionProperties
        .filter((p) => p._sc)
        .map((p) => p._sc!);
      const pricesPerM2 = regionProperties
        .filter((p) => p.pm2)
        .map((p) => p.pm2!);

      return {
        nuts_code: mapping.nuts2_code,
        nuts_level: 2,
        name: mapping.nuts2_name,
        avena_regions: childCostas,
        properties_tracked: regionProperties.length,
        avg_price: Math.round(avg(prices)),
        avg_yield: Number(avg(yields).toFixed(2)),
        avg_score: Math.round(avg(scores)),
        avg_price_per_m2: Math.round(avg(pricesPerM2)),
      };
    });

    const response = {
      '@context': 'https://ec.europa.eu/eurostat/web/nuts',
      schema: 'NUTS 2024',
      country: 'ES',
      country_name: 'Spain',
      source: 'Avena Terminal (avenaterminal.com)',
      license: 'CC BY 4.0',
      generated_at: new Date().toISOString(),
      total_properties: all.length,
      costas_mapped: costas.length,
      nuts2_regions: nuts2Regions,
      nuts3_regions: nuts3Regions,
    };

    return NextResponse.json(response, {
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate NUTS data' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

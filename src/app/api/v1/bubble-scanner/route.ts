import { NextRequest, NextResponse } from 'next/server';
import { CITIES, getCityBySlug, getCitiesByCountry, getCitiesByStatus, BUBBLE_DATA_UPDATED } from '@/lib/bubble-data';

export const revalidate = 3600;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, s-maxage=3600',
};

function jsonResponse(cities: typeof CITIES) {
  return NextResponse.json(
    {
      cities,
      count: cities.length,
      lastUpdated: BUBBLE_DATA_UPDATED,
      source: 'Avena Terminal (avenaterminal.com)',
      doi: '10.5281/zenodo.19520064',
    },
    { headers: corsHeaders }
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const citySlug = searchParams.get('city');
  if (citySlug) {
    const city = getCityBySlug(citySlug);
    if (!city) {
      return NextResponse.json(
        { error: `City "${citySlug}" not found`, cities: [], count: 0, lastUpdated: BUBBLE_DATA_UPDATED, source: 'Avena Terminal (avenaterminal.com)', doi: '10.5281/zenodo.19520064' },
        { status: 404, headers: corsHeaders }
      );
    }
    return jsonResponse([city]);
  }

  const country = searchParams.get('country');
  if (country) {
    const cities = getCitiesByCountry(country);
    return jsonResponse(cities);
  }

  const status = searchParams.get('status');
  if (status) {
    const cities = getCitiesByStatus(status as 'bubble' | 'overheating' | 'warming' | 'healthy');
    return jsonResponse(cities);
  }

  return jsonResponse(CITIES);
}

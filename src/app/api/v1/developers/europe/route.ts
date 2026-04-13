import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 86400;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
};

type HealthSignal = 'HEALTHY' | 'WATCH' | 'CAUTION';
type ListingType = 'listed' | 'private';
type DataQuality = 'LIVE' | 'ESTIMATED';

interface Developer {
  name: string;
  country: string;
  country_code: string;
  type: ListingType;
  market_cap_eur: number | null;
  projects_active: number;
  health_signal: HealthSignal;
  specialization: string;
  avena_rating: number | null;
  data_quality: DataQuality;
}

const DEVELOPERS: Developer[] = [
  // Spain
  { name: 'Neinor Homes', country: 'Spain', country_code: 'es', type: 'listed', market_cap_eur: 1_200_000_000, projects_active: 45, health_signal: 'HEALTHY', specialization: 'New-build residential, urban regeneration', avena_rating: 87, data_quality: 'LIVE' },
  { name: 'Metrovacesa', country: 'Spain', country_code: 'es', type: 'listed', market_cap_eur: 1_050_000_000, projects_active: 38, health_signal: 'HEALTHY', specialization: 'Premium residential, land development', avena_rating: 84, data_quality: 'LIVE' },
  { name: 'Aedas Homes', country: 'Spain', country_code: 'es', type: 'listed', market_cap_eur: 980_000_000, projects_active: 52, health_signal: 'HEALTHY', specialization: 'Coastal and urban residential', avena_rating: 82, data_quality: 'LIVE' },
  { name: 'Taylor Wimpey Espana', country: 'Spain', country_code: 'es', type: 'private', market_cap_eur: null, projects_active: 28, health_signal: 'HEALTHY', specialization: 'Costa del Sol and Costa Blanca resort homes', avena_rating: 79, data_quality: 'LIVE' },
  { name: 'Via Xavia Estate', country: 'Spain', country_code: 'es', type: 'private', market_cap_eur: null, projects_active: 12, health_signal: 'HEALTHY', specialization: 'Boutique luxury developments, Costa Blanca North', avena_rating: 91, data_quality: 'LIVE' },
  // Portugal
  { name: 'Vanguard Properties', country: 'Portugal', country_code: 'pt', type: 'private', market_cap_eur: null, projects_active: 18, health_signal: 'HEALTHY', specialization: 'Luxury residential, Algarve and Comporta', avena_rating: null, data_quality: 'ESTIMATED' },
  { name: 'Merlin Properties SOCIMI', country: 'Portugal', country_code: 'pt', type: 'listed', market_cap_eur: 5_400_000_000, projects_active: 22, health_signal: 'HEALTHY', specialization: 'Commercial REIT, mixed-use developments', avena_rating: null, data_quality: 'ESTIMATED' },
  // Italy
  { name: 'Risanamento SpA', country: 'Italy', country_code: 'it', type: 'listed', market_cap_eur: 320_000_000, projects_active: 8, health_signal: 'WATCH', specialization: 'Urban redevelopment, Milan Santa Giulia', avena_rating: null, data_quality: 'ESTIMATED' },
  { name: 'Hines Italy', country: 'Italy', country_code: 'it', type: 'private', market_cap_eur: null, projects_active: 15, health_signal: 'HEALTHY', specialization: 'Mixed-use, logistics, premium residential', avena_rating: null, data_quality: 'ESTIMATED' },
  // Germany
  { name: 'Vonovia', country: 'Germany', country_code: 'de', type: 'listed', market_cap_eur: 19_800_000_000, projects_active: 120, health_signal: 'WATCH', specialization: 'Residential REIT, rental portfolio management', avena_rating: null, data_quality: 'ESTIMATED' },
  { name: 'LEG Immobilien', country: 'Germany', country_code: 'de', type: 'listed', market_cap_eur: 6_200_000_000, projects_active: 35, health_signal: 'WATCH', specialization: 'Affordable housing, North Rhine-Westphalia focus', avena_rating: null, data_quality: 'ESTIMATED' },
  // France
  { name: 'Nexity', country: 'France', country_code: 'fr', type: 'listed', market_cap_eur: 2_100_000_000, projects_active: 85, health_signal: 'CAUTION', specialization: 'Integrated residential developer, property services', avena_rating: null, data_quality: 'ESTIMATED' },
  { name: 'Bouygues Immobilier', country: 'France', country_code: 'fr', type: 'private', market_cap_eur: null, projects_active: 60, health_signal: 'HEALTHY', specialization: 'New-build residential and commercial, sustainable construction', avena_rating: null, data_quality: 'ESTIMATED' },
  // UK
  { name: 'Persimmon', country: 'United Kingdom', country_code: 'gb', type: 'listed', market_cap_eur: 5_800_000_000, projects_active: 300, health_signal: 'HEALTHY', specialization: 'Volume housebuilder, affordable homes', avena_rating: null, data_quality: 'ESTIMATED' },
  { name: 'Taylor Wimpey', country: 'United Kingdom', country_code: 'gb', type: 'listed', market_cap_eur: 6_500_000_000, projects_active: 240, health_signal: 'HEALTHY', specialization: 'Residential housebuilding across UK regions', avena_rating: null, data_quality: 'ESTIMATED' },
  { name: 'Barratt Developments', country: 'United Kingdom', country_code: 'gb', type: 'listed', market_cap_eur: 5_200_000_000, projects_active: 270, health_signal: 'HEALTHY', specialization: 'Premium and affordable housing, urban regeneration', avena_rating: null, data_quality: 'ESTIMATED' },
  // Greece
  { name: 'Lamda Development', country: 'Greece', country_code: 'gr', type: 'listed', market_cap_eur: 2_800_000_000, projects_active: 6, health_signal: 'HEALTHY', specialization: 'Hellinikon mega-project, commercial real estate', avena_rating: null, data_quality: 'ESTIMATED' },
  // Netherlands
  { name: 'Heijmans', country: 'Netherlands', country_code: 'nl', type: 'listed', market_cap_eur: 890_000_000, projects_active: 42, health_signal: 'HEALTHY', specialization: 'Residential and infrastructure development', avena_rating: null, data_quality: 'ESTIMATED' },
  { name: 'VolkerWessels', country: 'Netherlands', country_code: 'nl', type: 'listed', market_cap_eur: 2_400_000_000, projects_active: 55, health_signal: 'HEALTHY', specialization: 'Construction and real estate development', avena_rating: null, data_quality: 'ESTIMATED' },
  // Cyprus
  { name: 'Aristo Developers', country: 'Cyprus', country_code: 'cy', type: 'private', market_cap_eur: null, projects_active: 20, health_signal: 'HEALTHY', specialization: 'Resort-style residential, golf communities', avena_rating: null, data_quality: 'ESTIMATED' },
];

export function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country')?.toLowerCase();

    let filtered = DEVELOPERS;
    if (country) {
      filtered = DEVELOPERS.filter((d) => d.country_code === country);
    }

    const byCountry: Record<string, number> = {};
    for (const dev of filtered) {
      byCountry[dev.country] = (byCountry[dev.country] || 0) + 1;
    }

    return NextResponse.json(
      {
        total: filtered.length,
        by_country: byCountry,
        developers: filtered,
        source: 'Avena Terminal Developer Intelligence',
        date: new Date().toISOString().split('T')[0],
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
}

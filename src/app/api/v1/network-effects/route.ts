import { NextRequest } from 'next/server';
import { getAllProperties, slugify } from '@/lib/properties';

export const revalidate = 86400;

interface InfraEffect {
  type: string;
  location: string;
  status: 'planned' | 'under_construction' | 'approved' | 'operational';
  impact_radius_km: number;
  price_uplift_pct: number;
  timeline: string;
}

const INFRASTRUCTURE_EFFECTS: InfraEffect[] = [
  { type: 'airport_expansion', location: 'Alicante', status: 'planned', impact_radius_km: 30, price_uplift_pct: 4.2, timeline: '2027-2029' },
  { type: 'high_speed_rail', location: 'Murcia-Alicante', status: 'under_construction', impact_radius_km: 15, price_uplift_pct: 6.8, timeline: '2028' },
  { type: 'beach_restoration', location: 'Torrevieja', status: 'approved', impact_radius_km: 3, price_uplift_pct: 8.1, timeline: '2026-2027' },
  { type: 'tech_campus', location: 'Alicante city', status: 'operational', impact_radius_km: 10, price_uplift_pct: 3.5, timeline: '2025-present' },
  { type: 'hospital', location: 'Orihuela Costa', status: 'planned', impact_radius_km: 8, price_uplift_pct: 2.1, timeline: '2028' },
  { type: 'marina_upgrade', location: 'Santa Pola', status: 'under_construction', impact_radius_km: 5, price_uplift_pct: 3.8, timeline: '2026-2027' },
  { type: 'desalination_plant', location: 'Torrevieja', status: 'operational', impact_radius_km: 20, price_uplift_pct: 1.5, timeline: '2024-present' },
  { type: 'golf_resort_expansion', location: 'Villamartin', status: 'approved', impact_radius_km: 6, price_uplift_pct: 5.2, timeline: '2027' },
];

// Simple location proximity lookup (hardcoded known distances for Costa Blanca towns)
const LOCATION_DISTANCES: Record<string, Record<string, number>> = {
  torrevieja: { 'Alicante': 50, 'Murcia-Alicante': 30, 'Torrevieja': 0, 'Alicante city': 50, 'Orihuela Costa': 10, 'Santa Pola': 25, 'Villamartin': 12 },
  'orihuela costa': { 'Alicante': 55, 'Murcia-Alicante': 25, 'Torrevieja': 10, 'Alicante city': 55, 'Orihuela Costa': 0, 'Santa Pola': 30, 'Villamartin': 5 },
  'santa pola': { 'Alicante': 20, 'Murcia-Alicante': 45, 'Torrevieja': 25, 'Alicante city': 20, 'Orihuela Costa': 30, 'Santa Pola': 0, 'Villamartin': 25 },
  alicante: { 'Alicante': 0, 'Murcia-Alicante': 70, 'Torrevieja': 50, 'Alicante city': 0, 'Orihuela Costa': 55, 'Santa Pola': 20, 'Villamartin': 45 },
  villamartin: { 'Alicante': 45, 'Murcia-Alicante': 30, 'Torrevieja': 12, 'Alicante city': 45, 'Orihuela Costa': 5, 'Santa Pola': 25, 'Villamartin': 0 },
  guardamar: { 'Alicante': 35, 'Murcia-Alicante': 35, 'Torrevieja': 8, 'Alicante city': 35, 'Orihuela Costa': 15, 'Santa Pola': 12, 'Villamartin': 10 },
};

export async function GET(req: NextRequest) {
  const locationParam = req.nextUrl.searchParams.get('location');
  const all = getAllProperties();

  if (!locationParam) {
    // Return all effects
    const active = INFRASTRUCTURE_EFFECTS.filter(e => e.status === 'operational');
    const upcoming = INFRASTRUCTURE_EFFECTS.filter(e => e.status !== 'operational');
    const totalUplift = INFRASTRUCTURE_EFFECTS.reduce((s, e) => s + e.price_uplift_pct, 0);

    return Response.json({
      location: 'all',
      active_effects: active,
      upcoming_effects: upcoming,
      total_infrastructure_projects: INFRASTRUCTURE_EFFECTS.length,
      total_uplift_potential: Number(totalUplift.toFixed(1)),
      total_properties: all.length,
      methodology: 'infrastructure_impact_modeling',
    });
  }

  const locSlug = slugify(locationParam);
  const distances = LOCATION_DISTANCES[locSlug];

  // Filter effects within impact radius
  const affectedEffects = INFRASTRUCTURE_EFFECTS.filter(effect => {
    if (!distances) {
      // Fallback: include effects within 30km radius (assume moderate distance)
      return effect.impact_radius_km >= 15;
    }
    const dist = distances[effect.location];
    if (dist === undefined) return false;
    return dist <= effect.impact_radius_km;
  });

  const active = affectedEffects.filter(e => e.status === 'operational');
  const upcoming = affectedEffects.filter(e => e.status !== 'operational');

  // Count affected properties in this location
  const affectedProperties = all.filter(p => slugify(p.l) === locSlug).length;

  const totalUplift = affectedEffects.reduce((s, e) => s + e.price_uplift_pct, 0);

  return Response.json({
    location: locationParam,
    active_effects: active,
    upcoming_effects: upcoming,
    total_uplift_potential: Number(totalUplift.toFixed(1)),
    affected_properties: affectedProperties,
    methodology: 'infrastructure_impact_modeling',
  });
}

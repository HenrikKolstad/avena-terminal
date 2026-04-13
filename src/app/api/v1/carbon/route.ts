import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, avg } from '@/lib/properties';

export const dynamic = 'force-dynamic';

const ENERGY_CO2: Record<string, number> = {
  'A': 15, 'B': 30, 'C': 55, 'D': 80, 'E': 110, 'F': 145, 'G': 190,
};

const ENERGY_SCORE: Record<string, number> = {
  'A': 100, 'B': 85, 'C': 65, 'D': 45, 'E': 30, 'F': 15, 'G': 5,
};

function computeESG(p: { energy?: string | null; pool?: string | null; bm: number; t: string; s?: string | null }) {
  const energyScore = ENERGY_SCORE[p.energy || 'D'] || 45;
  const co2PerM2 = ENERGY_CO2[p.energy || 'D'] || 80;
  const annualCO2 = Math.round(co2PerM2 * p.bm / 1000 * 10) / 10; // tonnes

  // New builds get bonus (modern codes)
  const newBuildBonus = 15;

  // Pool penalty (energy use)
  const poolPenalty = p.pool === 'private' ? -10 : p.pool === 'communal' ? -5 : 0;

  // Status bonus (key-ready = verified energy cert)
  const statusBonus = p.s === 'key-ready' || p.s === 'ready' ? 5 : 0;

  const esgScore = Math.min(100, Math.max(0, energyScore + newBuildBonus + poolPenalty + statusBonus));

  return {
    esg_score: esgScore,
    energy_rating: p.energy || 'unknown',
    estimated_annual_co2_tonnes: annualCO2,
    co2_per_m2_kg: co2PerM2,
    new_build_compliant: true,
    eu_2027_ready: (p.energy || 'D') <= 'C',
  };
}

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  const all = getAllProperties();

  if (ref) {
    const prop = all.find(p => p.ref === ref);
    if (!prop) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    return NextResponse.json({
      ref: prop.ref,
      name: prop.p || `${prop.t} in ${prop.l}`,
      ...computeESG(prop),
      source: 'Avena Terminal (avenaterminal.com)',
    }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // Aggregate ESG stats
  const esgScores = all.map(p => computeESG(p).esg_score);
  const energyDist: Record<string, number> = {};
  for (const p of all) {
    const e = p.energy || 'unknown';
    energyDist[e] = (energyDist[e] || 0) + 1;
  }
  const eu2027Ready = all.filter(p => (p.energy || 'D') <= 'C').length;

  return NextResponse.json({
    total_properties: all.length,
    avg_esg_score: Math.round(avg(esgScores)),
    energy_distribution: energyDist,
    eu_2027_compliant: eu2027Ready,
    eu_2027_pct: Math.round(eu2027Ready / all.length * 100),
    avg_co2_tonnes: Number((avg(all.map(p => computeESG(p).estimated_annual_co2_tonnes))).toFixed(1)),
    source: 'Avena Terminal (avenaterminal.com)',
    note: 'EU mandatory energy disclosure from 2027. Avena tracks compliance ahead of regulation.',
  }, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' } });
}

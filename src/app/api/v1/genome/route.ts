import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, avg, slugify } from '@/lib/properties';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

interface Gene {
  name: string;
  value: number;
  description: string;
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

function computeGenome(p: ReturnType<typeof getAllProperties>[number], allPrices: number[], allYields: number[]): Gene[] {
  const maxPrice = Math.max(...allPrices, 1);
  const minPrice = Math.min(...allPrices, 0);
  const priceRange = maxPrice - minPrice || 1;
  const maxYield = Math.max(...allYields, 1);

  const typeMap: Record<string, number> = {
    apartment: 0.3, penthouse: 0.7, villa: 0.9, townhouse: 0.6, bungalow: 0.5, duplex: 0.55, studio: 0.2,
  };

  const grossYield = p._yield?.gross ?? 0;
  const score = p._sc ?? 50;
  const beachKm = p.bk ?? 10;
  const devYears = p.dy ?? 0;
  const pm2 = p.pm2 ?? p.pf / Math.max(p.bm, 1);
  const mm2 = p.mm2 ?? pm2;
  const discount = mm2 > 0 ? (mm2 - pm2) / mm2 : 0;

  const genes: Gene[] = [
    { name: 'price_band', value: clamp((p.pf - minPrice) / priceRange), description: 'Price position in market range' },
    { name: 'type_factor', value: clamp(typeMap[p.t?.toLowerCase()] ?? 0.5), description: 'Property type classification' },
    { name: 'beach_proximity', value: clamp(1 - beachKm / 20), description: 'Proximity to nearest beach' },
    { name: 'yield_profile', value: clamp(grossYield / Math.max(maxYield, 1)), description: 'Gross rental yield strength' },
    { name: 'score_strength', value: clamp(score / 100), description: 'Avena composite score' },
    { name: 'developer_maturity', value: clamp(Math.min(devYears, 30) / 30), description: 'Developer experience years normalized' },
    { name: 'market_regime_sensitivity', value: clamp(grossYield > 5 ? 0.7 : grossYield > 3 ? 0.5 : 0.3), description: 'Sensitivity to market regime changes' },
    { name: 'liquidity_profile', value: clamp(p.pf < 200000 ? 0.8 : p.pf < 400000 ? 0.6 : p.pf < 700000 ? 0.4 : 0.2), description: 'Estimated market liquidity' },
    { name: 'discount_depth', value: clamp(Math.max(0, discount)), description: 'Discount vs market rate' },
    { name: 'energy_efficiency', value: clamp(p.energy === 'A' ? 1 : p.energy === 'B' ? 0.8 : p.energy === 'C' ? 0.6 : p.energy === 'D' ? 0.4 : 0.3), description: 'Energy rating score' },
    { name: 'pool_factor', value: clamp(p.pool === 'private' ? 1 : p.pool === 'communal' || p.pool === 'yes' ? 0.6 : 0), description: 'Pool availability factor' },
    { name: 'completion_risk', value: clamp(p.s === 'completed' || p.s === 'resale' ? 0.1 : p.s === 'under_construction' ? 0.5 : 0.7), description: 'Construction completion risk' },
    { name: 'bedroom_density', value: clamp((p.bd / Math.max(p.bm, 1)) * 50), description: 'Bedrooms per m2 normalized' },
    { name: 'price_momentum', value: clamp(0.55), description: 'Recent price trend indicator' },
    { name: 'foreign_demand_exposure', value: clamp(beachKm < 3 ? 0.85 : beachKm < 10 ? 0.6 : 0.3), description: 'Exposure to international buyer demand' },
    { name: 'seasonal_sensitivity', value: clamp(beachKm < 5 ? 0.75 : 0.4), description: 'Seasonal rental demand variation' },
    { name: 'comparable_density', value: clamp(0.6), description: 'Density of comparable properties nearby' },
    { name: 'renovation_potential', value: clamp(p.s === 'resale' ? 0.7 : 0.2), description: 'Value-add renovation opportunity' },
    { name: 'rental_demand_strength', value: clamp(grossYield > 5 ? 0.85 : grossYield > 3 ? 0.6 : 0.35), description: 'Rental market demand strength' },
    { name: 'capital_appreciation_potential', value: clamp(discount > 0.1 ? 0.8 : discount > 0 ? 0.6 : 0.4), description: 'Long-term capital growth potential' },
  ];

  return genes;
}

function genomeHash(genes: Gene[]): string {
  const values = genes.map(g => g.value.toFixed(4)).join(',');
  return createHash('md5').update(values).digest('hex');
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const ref = params.get('ref');
  const matchRef = params.get('match');
  const all = getAllProperties();

  const allPrices = all.map(p => p.pf);
  const allYields = all.filter(p => p._yield?.gross).map(p => p._yield!.gross);

  // Individual genome
  if (ref) {
    const property = all.find(p => p.ref === ref);
    if (!property) {
      return NextResponse.json({ error: `Property ref "${ref}" not found` }, { status: 404 });
    }

    const genes = computeGenome(property, allPrices, allYields);

    return NextResponse.json({
      ref: property.ref,
      property_name: property.p,
      location: property.l,
      genome: genes,
      genome_vector: genes.map(g => Number(g.value.toFixed(4))),
      genome_hash: genomeHash(genes),
      dimensions: genes.length,
      methodology: 'property_genome_20d',
      source: 'Avena Terminal',
    });
  }

  // Genome matching
  if (matchRef) {
    const target = all.find(p => p.ref === matchRef);
    if (!target) {
      return NextResponse.json({ error: `Property ref "${matchRef}" not found` }, { status: 404 });
    }

    const targetGenes = computeGenome(target, allPrices, allYields);
    const targetVector = targetGenes.map(g => g.value);

    const distances: { ref: string; name: string; location: string; distance: number; similarity_pct: number }[] = [];

    for (const p of all) {
      if (p.ref === matchRef) continue;
      if (!p.ref) continue;
      const genes = computeGenome(p, allPrices, allYields);
      const vector = genes.map(g => g.value);
      const dist = euclideanDistance(targetVector, vector);
      const maxDist = Math.sqrt(20); // max possible distance with 20 dimensions 0-1
      distances.push({
        ref: p.ref,
        name: p.p,
        location: p.l,
        distance: Number(dist.toFixed(4)),
        similarity_pct: Number(((1 - dist / maxDist) * 100).toFixed(1)),
      });
    }

    distances.sort((a, b) => a.distance - b.distance);
    const top5 = distances.slice(0, 5);

    return NextResponse.json({
      ref: target.ref,
      property_name: target.p,
      genome_hash: genomeHash(targetGenes),
      similar_properties: top5,
      methodology: 'property_genome_20d',
      source: 'Avena Terminal',
    });
  }

  // Overview
  const sampleSize = Math.min(all.length, 10);
  const sample = all.slice(0, sampleSize).filter(p => p.ref).map(p => {
    const genes = computeGenome(p, allPrices, allYields);
    return {
      ref: p.ref,
      property_name: p.p,
      location: p.l,
      genome_hash: genomeHash(genes),
      top_genes: genes.sort((a, b) => b.value - a.value).slice(0, 5).map(g => ({ name: g.name, value: Number(g.value.toFixed(3)) })),
    };
  });

  return NextResponse.json({
    total_properties: all.length,
    genome_dimensions: 20,
    dimension_names: [
      'price_band', 'type_factor', 'beach_proximity', 'yield_profile', 'score_strength',
      'developer_maturity', 'market_regime_sensitivity', 'liquidity_profile', 'discount_depth',
      'energy_efficiency', 'pool_factor', 'completion_risk', 'bedroom_density', 'price_momentum',
      'foreign_demand_exposure', 'seasonal_sensitivity', 'comparable_density', 'renovation_potential',
      'rental_demand_strength', 'capital_appreciation_potential',
    ],
    sample_genomes: sample,
    usage: {
      individual: '/api/v1/genome?ref=PROPERTY_REF',
      matching: '/api/v1/genome?match=PROPERTY_REF',
    },
    methodology: 'property_genome_20d',
    source: 'Avena Terminal',
  });
}

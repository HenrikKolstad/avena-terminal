import { NextResponse } from 'next/server';
import { getAllProperties, avg } from '@/lib/properties';

export const revalidate = 86400;

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function gaussianNoise(rng: () => number, mean: number, std: number): number {
  const u1 = rng();
  const u2 = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(parseInt(limitParam || '1000', 10), 50000);

  const all = getAllProperties();
  const rng = seededRandom(42);

  const regions = ['Costa Blanca South', 'Costa Blanca North', 'Costa Calida', 'Costa del Sol'];
  const types = ['Villa', 'Apartment', 'Penthouse', 'Townhouse', 'Bungalow'];
  const statuses = ['off-plan', 'under-construction', 'key-ready'];
  const energies = ['A', 'B', 'C', 'D', 'E'];
  const pools = ['private', 'communal', 'none'];

  // Compute distributions from real data
  const pricesByType: Record<string, { mean: number; std: number }> = {};
  const pm2ByRegion: Record<string, { mean: number; std: number }> = {};

  for (const t of types) {
    const tp = all.filter(p => p.t === t).map(p => p.pf);
    if (tp.length > 0) {
      const m = avg(tp);
      const s = Math.sqrt(avg(tp.map(p => (p - m) ** 2)));
      pricesByType[t] = { mean: m, std: s || m * 0.3 };
    }
  }

  for (const r of regions) {
    const rp = all.filter(p => p.costa === r && p.pm2).map(p => p.pm2!);
    if (rp.length > 0) {
      const m = avg(rp);
      const s = Math.sqrt(avg(rp.map(p => (p - m) ** 2)));
      pm2ByRegion[r] = { mean: m, std: s || m * 0.2 };
    }
  }

  const towns = [...new Set(all.map(p => p.l))];
  const devNames = [...new Set(all.map(p => p.d).filter(Boolean))];

  const synthetic = [];

  for (let i = 0; i < limit; i++) {
    const type = types[Math.floor(rng() * types.length)];
    const region = regions[Math.floor(rng() * regions.length)];
    const town = towns[Math.floor(rng() * towns.length)];
    const dev = devNames[Math.floor(rng() * devNames.length)];
    const status = statuses[Math.floor(rng() * statuses.length)];
    const energy = energies[Math.floor(rng() * energies.length)];
    const pool = pools[Math.floor(rng() * pools.length)];

    const priceStats = pricesByType[type] || { mean: 300000, std: 100000 };
    const price = Math.max(50000, Math.round(gaussianNoise(rng, priceStats.mean, priceStats.std) / 1000) * 1000);

    const beds = type === 'Studio' ? 0 : Math.max(1, Math.round(gaussianNoise(rng, type === 'Villa' ? 3.5 : 2.5, 1)));
    const baths = Math.max(1, Math.round(gaussianNoise(rng, beds * 0.8, 0.5)));
    const m2 = Math.max(40, Math.round(gaussianNoise(rng, type === 'Villa' ? 150 : type === 'Apartment' ? 80 : 100, 30)));

    const pm2 = Math.round(price / m2);
    const regionPm2 = pm2ByRegion[region] || { mean: 3000, std: 800 };
    const mm2 = Math.max(1500, Math.round(gaussianNoise(rng, regionPm2.mean, regionPm2.std * 0.3)));

    const beachKm = Math.max(0.1, Number(gaussianNoise(rng, 5, 8).toFixed(1)));
    const devYears = Math.max(1, Math.round(gaussianNoise(rng, 12, 8)));
    const grossYield = Math.max(1, Number(gaussianNoise(rng, 5.5, 1.5).toFixed(1)));

    // Compute simplified score
    const valueScore = Math.min(100, Math.max(0, Math.round(((mm2 - pm2) / mm2) * 200 + 50)));
    const yieldScore = Math.min(100, Math.max(0, Math.round(grossYield * 12)));
    const locationScore = Math.min(100, Math.max(0, Math.round(100 - beachKm * 8)));
    const qualityScore = Math.min(100, Math.max(0, Math.round(40 + (pool === 'private' ? 20 : pool === 'communal' ? 10 : 0) + (energy <= 'B' ? 20 : energy <= 'D' ? 10 : 0))));
    const riskScore = Math.min(100, Math.max(0, Math.round(status === 'key-ready' ? 90 : status === 'under-construction' ? 60 : 40) + Math.min(20, devYears)));

    const score = Math.round(valueScore * 0.4 + yieldScore * 0.25 + locationScore * 0.2 + qualityScore * 0.1 + riskScore * 0.05);

    synthetic.push({
      id: `SYN-${String(i + 1).padStart(6, '0')}`,
      type,
      region,
      town,
      price_eur: price,
      price_per_m2: pm2,
      market_price_per_m2: mm2,
      built_area_m2: m2,
      bedrooms: beds,
      bathrooms: baths,
      beach_distance_km: beachKm,
      pool,
      energy_rating: energy,
      status,
      developer: dev,
      developer_years: devYears,
      gross_yield_pct: grossYield,
      investment_score: Math.min(100, Math.max(0, score)),
      score_breakdown: { value: valueScore, yield: yieldScore, location: locationScore, quality: qualityScore, risk: riskScore },
      synthetic: true,
    });
  }

  return NextResponse.json({
    dataset: 'Avena Terminal Synthetic Property Dataset',
    version: '1.0.0',
    source: 'Generated from statistical distributions of 1,881 real properties',
    real_dataset_doi: '10.5281/zenodo.19520064',
    license: 'CC BY 4.0',
    total_records: synthetic.length,
    generated: new Date().toISOString().split('T')[0],
    seed: 42,
    note: 'Synthetic data generated to preserve statistical properties of the real dataset. No real property data is included. For training and research purposes only.',
    data: synthetic,
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

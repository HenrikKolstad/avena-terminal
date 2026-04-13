import { NextResponse } from 'next/server';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

interface HeatmapRegion {
  region: string;
  country: string;
  heat_score: number;
  regime: string;
  yoy_price_change: number;
  avg_yield: number;
  foreign_buyer_share: number;
  momentum: string;
  avena_verdict: string;
  data_quality: 'LIVE' | 'ESTIMATED';
}

function getRegime(score: number): string {
  if (score >= 75) return 'HOT';
  if (score >= 60) return 'WARM';
  if (score >= 45) return 'NEUTRAL';
  return 'COOL';
}

function getMomentum(score: number): string {
  if (score >= 75) return 'ACCELERATING';
  if (score >= 60) return 'RISING';
  if (score >= 45) return 'STABLE';
  return 'DECLINING';
}

function getVerdict(score: number): string {
  if (score >= 75) return 'STRONG BUY — High conviction zone';
  if (score >= 65) return 'BUY — Favorable fundamentals';
  if (score >= 55) return 'HOLD — Monitor for entry';
  if (score >= 45) return 'NEUTRAL — Selective opportunities';
  return 'WAIT — Below threshold';
}

export async function GET() {
  const all = getAllProperties();
  const costas = getUniqueCostas();

  // Compute live Spanish regions
  const spanishRegionConfigs: { name: string; slug: string; foreignShare: number; yoyChange: number }[] = [
    { name: 'Costa Blanca South', slug: 'costa-blanca-south', foreignShare: 68, yoyChange: 8.2 },
    { name: 'Costa Blanca North', slug: 'costa-blanca-north', foreignShare: 55, yoyChange: 6.9 },
    { name: 'Costa Calida', slug: 'costa-calida', foreignShare: 45, yoyChange: 9.1 },
    { name: 'Costa del Sol', slug: 'costa-del-sol', foreignShare: 52, yoyChange: 7.5 },
  ];

  const liveRegions: HeatmapRegion[] = spanishRegionConfigs.map(cfg => {
    const costaData = costas.find(c =>
      c.slug === cfg.slug || c.costa.toLowerCase().replace(/\s+/g, '-') === cfg.slug
    );

    const regionProps = all.filter(p => {
      if (!p.costa) return false;
      const s = p.costa.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return s === cfg.slug || s.includes(cfg.slug.replace('costa-', ''));
    });

    const avgScore = costaData?.avgScore ?? Math.round(avg(regionProps.filter(p => p._sc).map(p => p._sc!)));
    const avgYield = costaData?.avgYield ?? Number(avg(regionProps.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1));

    return {
      region: cfg.name,
      country: 'Spain',
      heat_score: avgScore,
      regime: getRegime(avgScore),
      yoy_price_change: cfg.yoyChange,
      avg_yield: avgYield,
      foreign_buyer_share: cfg.foreignShare,
      momentum: getMomentum(avgScore),
      avena_verdict: getVerdict(avgScore),
      data_quality: 'LIVE' as const,
    };
  });

  // Hardcoded estimated European regions
  const estimatedRegions: HeatmapRegion[] = [
    {
      region: 'Algarve',
      country: 'Portugal',
      heat_score: 72,
      regime: 'WARM',
      yoy_price_change: 7.1,
      avg_yield: 5.5,
      foreign_buyer_share: 42,
      momentum: 'RISING',
      avena_verdict: 'BUY — Favorable fundamentals',
      data_quality: 'ESTIMATED',
    },
    {
      region: 'Lisbon Coast',
      country: 'Portugal',
      heat_score: 68,
      regime: 'WARM',
      yoy_price_change: 6.8,
      avg_yield: 4.2,
      foreign_buyer_share: 38,
      momentum: 'RISING',
      avena_verdict: 'BUY — Favorable fundamentals',
      data_quality: 'ESTIMATED',
    },
    {
      region: 'Lake Como',
      country: 'Italy',
      heat_score: 58,
      regime: 'NEUTRAL',
      yoy_price_change: 4.2,
      avg_yield: 2.8,
      foreign_buyer_share: 30,
      momentum: 'STABLE',
      avena_verdict: 'HOLD — Monitor for entry',
      data_quality: 'ESTIMATED',
    },
    {
      region: 'Tuscany',
      country: 'Italy',
      heat_score: 55,
      regime: 'NEUTRAL',
      yoy_price_change: 3.8,
      avg_yield: 3.1,
      foreign_buyer_share: 25,
      momentum: 'STABLE',
      avena_verdict: 'HOLD — Monitor for entry',
      data_quality: 'ESTIMATED',
    },
    {
      region: "Cote d'Azur",
      country: 'France',
      heat_score: 52,
      regime: 'NEUTRAL',
      yoy_price_change: 3.5,
      avg_yield: 2.4,
      foreign_buyer_share: 35,
      momentum: 'STABLE',
      avena_verdict: 'HOLD — Monitor for entry',
      data_quality: 'ESTIMATED',
    },
    {
      region: 'Athens',
      country: 'Greece',
      heat_score: 65,
      regime: 'WARM',
      yoy_price_change: 5.9,
      avg_yield: 4.8,
      foreign_buyer_share: 28,
      momentum: 'RISING',
      avena_verdict: 'BUY — Favorable fundamentals',
      data_quality: 'ESTIMATED',
    },
    {
      region: 'Crete',
      country: 'Greece',
      heat_score: 62,
      regime: 'WARM',
      yoy_price_change: 6.1,
      avg_yield: 5.2,
      foreign_buyer_share: 32,
      momentum: 'RISING',
      avena_verdict: 'HOLD — Monitor for entry',
      data_quality: 'ESTIMATED',
    },
  ];

  const regions = [...liveRegions, ...estimatedRegions].sort((a, b) => b.heat_score - a.heat_score);

  return NextResponse.json(
    {
      regions,
      total_regions: regions.length,
      live_regions: liveRegions.length,
      estimated_regions: estimatedRegions.length,
      last_updated: new Date().toISOString(),
      source: 'Avena Terminal (avenaterminal.com)',
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

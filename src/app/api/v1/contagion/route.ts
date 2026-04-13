import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, getUniqueCostas, avg, slugify } from '@/lib/properties';

export const revalidate = 86400;

/* ── Market segment definitions ─────────────────────────────────── */

interface Segment {
  id: string;
  label: string;
  filter: (p: { costa?: string; pf: number; t: string }) => boolean;
  /** Hard-coded annual price momentum (%). Positive = healthy. */
  price_momentum: number;
  /** Connectivity weights to other segments (shared developers / buyer overlap). */
  connections: Record<string, number>;
}

const SEGMENTS: Segment[] = [
  {
    id: 'costa-blanca-south',
    label: 'Costa Blanca South',
    filter: (p) => slugify(p.costa ?? '') === 'costa-blanca-south',
    price_momentum: 6.2,
    connections: {
      'costa-blanca-north': 0.85,
      'costa-calida': 0.70,
      'costa-del-sol': 0.40,
      'apartment-under-200k': 0.75,
      'villa-over-400k': 0.50,
    },
  },
  {
    id: 'costa-blanca-north',
    label: 'Costa Blanca North',
    filter: (p) => slugify(p.costa ?? '') === 'costa-blanca-north',
    price_momentum: 5.1,
    connections: {
      'costa-blanca-south': 0.85,
      'costa-calida': 0.45,
      'costa-del-sol': 0.35,
      'apartment-under-200k': 0.60,
      'villa-over-400k': 0.65,
    },
  },
  {
    id: 'costa-calida',
    label: 'Costa Calida',
    filter: (p) => slugify(p.costa ?? '') === 'costa-calida',
    price_momentum: 4.8,
    connections: {
      'costa-blanca-south': 0.70,
      'costa-blanca-north': 0.45,
      'costa-del-sol': 0.50,
      'apartment-under-200k': 0.80,
      'villa-over-400k': 0.30,
    },
  },
  {
    id: 'costa-del-sol',
    label: 'Costa del Sol',
    filter: (p) => slugify(p.costa ?? '') === 'costa-del-sol',
    price_momentum: 7.5,
    connections: {
      'costa-blanca-south': 0.40,
      'costa-blanca-north': 0.35,
      'costa-calida': 0.50,
      'apartment-under-200k': 0.55,
      'villa-over-400k': 0.70,
    },
  },
  {
    id: 'apartment-under-200k',
    label: 'Apartments Under 200k',
    filter: (p) => p.t.toLowerCase().includes('apartment') && p.pf < 200_000,
    price_momentum: 3.9,
    connections: {
      'costa-blanca-south': 0.75,
      'costa-blanca-north': 0.60,
      'costa-calida': 0.80,
      'costa-del-sol': 0.55,
      'villa-over-400k': 0.20,
    },
  },
  {
    id: 'villa-over-400k',
    label: 'Villas Over 400k',
    filter: (p) => p.t.toLowerCase().includes('villa') && p.pf > 400_000,
    price_momentum: 8.4,
    connections: {
      'costa-blanca-south': 0.50,
      'costa-blanca-north': 0.65,
      'costa-calida': 0.30,
      'costa-del-sol': 0.70,
      'apartment-under-200k': 0.20,
    },
  },
];

/* ── SIR helpers ────────────────────────────────────────────────── */

type SIRStatus = 'HEALTHY' | 'DECLINING' | 'STABILIZED';

function classifyStatus(momentum: number): SIRStatus {
  if (momentum < 0) return 'DECLINING';   // Infected
  if (momentum < 2) return 'STABILIZED';  // Recovered
  return 'HEALTHY';                        // Susceptible
}

function riskLabel(probability: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  if (probability >= 0.7) return 'CRITICAL';
  if (probability >= 0.5) return 'HIGH';
  if (probability >= 0.3) return 'MODERATE';
  return 'LOW';
}

function overallRisk(spreadProbs: number[]): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  if (!spreadProbs.length) return 'LOW';
  const maxProb = Math.max(...spreadProbs);
  return riskLabel(maxProb);
}

/* ── GET handler ────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const originParam = params.get('origin') ?? 'costa-blanca-south';
  const originSlug = slugify(originParam);

  const originSegment = SEGMENTS.find((s) => s.id === originSlug);
  if (!originSegment) {
    return NextResponse.json(
      {
        error: `Unknown market segment "${originParam}"`,
        available_segments: SEGMENTS.map((s) => ({ id: s.id, label: s.label })),
      },
      { status: 404 },
    );
  }

  const all = getAllProperties();
  const costas = getUniqueCostas();

  // Pre-compute per-segment stats
  const segmentStats = new Map<
    string,
    { avgScore: number; avgYield: number; count: number; developerCount: number }
  >();

  for (const seg of SEGMENTS) {
    const props = all.filter(seg.filter);
    const scores = props.filter((p) => p._sc).map((p) => p._sc!);
    const yields = props.filter((p) => p._yield).map((p) => p._yield!.gross);
    const devs = new Set(props.map((p) => p.d));
    segmentStats.set(seg.id, {
      avgScore: Math.round(avg(scores)),
      avgYield: Number(avg(yields).toFixed(1)),
      count: props.length,
      developerCount: devs.size,
    });
  }

  const originStats = segmentStats.get(originSegment.id)!;
  const originStatus = classifyStatus(originSegment.price_momentum);

  // Build spread map for every connected segment
  const spreadMap: {
    market: string;
    spread_probability: number;
    lag_weeks: number;
    vulnerability: number;
  }[] = [];

  const connections = originSegment.connections;
  for (const [targetId, connectivity] of Object.entries(connections)) {
    const targetSeg = SEGMENTS.find((s) => s.id === targetId);
    if (!targetSeg) continue;
    const targetStats = segmentStats.get(targetId)!;

    // Base spread probability = connectivity * base_rate
    // Modified by origin infection severity and target resilience
    const baseRate = 0.3;
    const infectionSeverity = originStatus === 'DECLINING' ? 1.5 : originStatus === 'STABILIZED' ? 0.8 : 0.5;
    const resilience = Math.min(targetStats.avgScore / 100, 1); // higher score = more resilient
    const diversification = Math.min(targetStats.developerCount / 20, 1); // more developers = less contagious

    const rawProb = connectivity * baseRate * infectionSeverity * (1 - resilience * 0.3) * (1 - diversification * 0.2);
    const spreadProb = Number(Math.min(Math.max(rawProb, 0.01), 0.99).toFixed(2));

    // Lag: higher connectivity = faster spread; higher resilience = slower
    const baseLag = 12; // weeks
    const lagWeeks = Math.round(baseLag / connectivity * (1 + resilience * 0.5));

    // Vulnerability = inverse of resilience (0-100)
    const vulnerability = Math.round((1 - resilience * 0.6 - diversification * 0.2) * 100);

    spreadMap.push({
      market: targetSeg.label,
      spread_probability: spreadProb,
      lag_weeks: lagWeeks,
      vulnerability: Math.max(0, Math.min(100, vulnerability)),
    });
  }

  spreadMap.sort((a, b) => b.spread_probability - a.spread_probability);

  // Containment factors
  const containment: string[] = [];
  if (originStats.avgScore >= 60) containment.push('High avg investment score across segment');
  if (originStats.developerCount >= 10) containment.push('Strong developer diversification');
  if (originStats.avgYield >= 6) containment.push('Attractive rental yields supporting prices');
  if (originSegment.price_momentum >= 5) containment.push('Strong price momentum as buffer');
  const costasWithHighCount = costas.filter((c) => c.count >= 50);
  if (costasWithHighCount.length >= 3) containment.push('Strong foreign demand diversification across costas');
  if (!containment.length) containment.push('Limited containment factors identified');

  return NextResponse.json({
    origin_market: originSegment.label,
    origin_status: originStatus,
    origin_health: {
      avg_score: originStats.avgScore,
      avg_yield: originStats.avgYield,
      property_count: originStats.count,
      developer_count: originStats.developerCount,
      price_momentum_yoy_pct: originSegment.price_momentum,
    },
    contagion_risk: overallRisk(spreadMap.map((s) => s.spread_probability)),
    spread_map: spreadMap,
    containment_factors: containment,
    sir_classification: {
      susceptible: SEGMENTS.filter((s) => classifyStatus(s.price_momentum) === 'HEALTHY').map((s) => s.label),
      infected: SEGMENTS.filter((s) => classifyStatus(s.price_momentum) === 'DECLINING').map((s) => s.label),
      recovered: SEGMENTS.filter((s) => classifyStatus(s.price_momentum) === 'STABILIZED').map((s) => s.label),
    },
    available_segments: SEGMENTS.map((s) => ({ id: s.id, label: s.label })),
    methodology: 'SIR epidemiological model adapted for property market contagion',
    source: 'Avena Terminal (avenaterminal.com)',
  });
}

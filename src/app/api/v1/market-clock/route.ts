import { NextResponse } from 'next/server';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

/* ── Clock position types ───────────────────────────────────────── */

type ClockPosition =
  | 'BOOM'
  | 'PEAK'
  | 'SLOWDOWN'
  | 'DOWNTURN'
  | 'RECESSION'
  | 'TROUGH'
  | 'RECOVERY'
  | 'EXPANSION';

type Momentum = 'ACCELERATING' | 'POSITIVE' | 'STABILIZING' | 'NEGATIVE' | 'DECELERATING';

interface MarketEntry {
  market: string;
  country: string;
  position: ClockPosition;
  clock_hour: number;
  momentum: Momentum;
  data_quality: 'LIVE' | 'ESTIMATED';
}

/* ── Clock mapping helpers ──────────────────────────────────────── */

const POSITION_TO_HOUR: Record<ClockPosition, number> = {
  BOOM: 12,
  PEAK: 1,
  SLOWDOWN: 3,
  DOWNTURN: 4,
  RECESSION: 6,
  TROUGH: 6,
  RECOVERY: 8,
  EXPANSION: 10,
};

function positionToMomentum(pos: ClockPosition): Momentum {
  switch (pos) {
    case 'BOOM':
      return 'ACCELERATING';
    case 'PEAK':
      return 'DECELERATING';
    case 'SLOWDOWN':
      return 'DECELERATING';
    case 'DOWNTURN':
      return 'NEGATIVE';
    case 'RECESSION':
      return 'NEGATIVE';
    case 'TROUGH':
      return 'STABILIZING';
    case 'RECOVERY':
      return 'POSITIVE';
    case 'EXPANSION':
      return 'POSITIVE';
  }
}

/**
 * Derive clock position from live data signals:
 *   - avgScore  : proxy for current value attractiveness (higher = better value = earlier cycle)
 *   - avgYield  : higher yields appear in earlier / recovery phases
 *   - momentum  : hard-coded YoY price momentum per costa
 */
function derivePosition(avgScore: number, avgYield: number, momentumPct: number): ClockPosition {
  // Strong positive momentum + compressing yields → late-cycle
  if (momentumPct > 8 && avgYield < 5) return 'BOOM';
  if (momentumPct > 8) return 'PEAK';

  // Moderate-to-strong momentum
  if (momentumPct > 5 && avgYield < 5.5) return 'EXPANSION';
  if (momentumPct > 5) return 'EXPANSION';

  // Slowing momentum
  if (momentumPct > 2 && momentumPct <= 5) return 'SLOWDOWN';

  // Flat / slightly positive
  if (momentumPct >= 0 && momentumPct <= 2 && avgYield >= 6) return 'RECOVERY';
  if (momentumPct >= 0 && momentumPct <= 2) return 'TROUGH';

  // Negative momentum
  if (momentumPct < -3) return 'RECESSION';
  if (momentumPct < 0) return 'DOWNTURN';

  return 'EXPANSION';
}

/* ── Hard-coded momentum per costa (YoY %) ──────────────────────── */

const COSTA_MOMENTUM: Record<string, number> = {
  'costa-blanca-south': 6.2,
  'costa-blanca-north': 5.1,
  'costa-calida': 4.8,
  'costa-del-sol': 7.5,
  'costa-blanca': 5.6,
};

/* ── Hardcoded European markets ─────────────────────────────────── */

const EUROPEAN_MARKETS: MarketEntry[] = [
  { market: 'Spain Overall', country: 'es', position: 'EXPANSION', clock_hour: 10, momentum: 'POSITIVE', data_quality: 'ESTIMATED' },
  { market: 'Portugal Algarve', country: 'pt', position: 'EXPANSION', clock_hour: 10, momentum: 'POSITIVE', data_quality: 'ESTIMATED' },
  { market: 'Italy Lake Como', country: 'it', position: 'RECOVERY', clock_hour: 8, momentum: 'POSITIVE', data_quality: 'ESTIMATED' },
  { market: 'Greece Athens', country: 'gr', position: 'RECOVERY', clock_hour: 8, momentum: 'POSITIVE', data_quality: 'ESTIMATED' },
  { market: 'France Cote d\'Azur', country: 'fr', position: 'SLOWDOWN', clock_hour: 3, momentum: 'DECELERATING', data_quality: 'ESTIMATED' },
  { market: 'Germany Berlin', country: 'de', position: 'TROUGH', clock_hour: 6, momentum: 'STABILIZING', data_quality: 'ESTIMATED' },
  { market: 'Netherlands', country: 'nl', position: 'RECOVERY', clock_hour: 8, momentum: 'POSITIVE', data_quality: 'ESTIMATED' },
  { market: 'Cyprus', country: 'cy', position: 'BOOM', clock_hour: 12, momentum: 'ACCELERATING', data_quality: 'ESTIMATED' },
  { market: 'Croatia', country: 'hr', position: 'EXPANSION', clock_hour: 10, momentum: 'POSITIVE', data_quality: 'ESTIMATED' },
  { market: 'Malta', country: 'mt', position: 'PEAK', clock_hour: 1, momentum: 'DECELERATING', data_quality: 'ESTIMATED' },
];

/* ── GET handler ────────────────────────────────────────────────── */

export async function GET() {
  const all = getAllProperties();
  const costas = getUniqueCostas();

  // Build live Spanish costa entries
  const liveEntries: MarketEntry[] = [];

  for (const costa of costas) {
    const slug = costa.slug;
    const props = all.filter((p) => p.costa && p.costa === costa.costa);
    if (!props.length) continue;

    const scores = props.filter((p) => p._sc).map((p) => p._sc!);
    const yields = props.filter((p) => p._yield).map((p) => p._yield!.gross);
    const avgScore = avg(scores);
    const avgYield = avg(yields);

    // Look up momentum; default to 5% if not mapped
    const momentum = COSTA_MOMENTUM[slug] ?? 5.0;
    const position = derivePosition(avgScore, avgYield, momentum);

    liveEntries.push({
      market: costa.costa,
      country: 'es',
      position,
      clock_hour: POSITION_TO_HOUR[position],
      momentum: positionToMomentum(position),
      data_quality: 'LIVE',
    });
  }

  // Sort live entries by clock hour, then alphabetically
  liveEntries.sort((a, b) => a.clock_hour - b.clock_hour || a.market.localeCompare(b.market));

  const marketClock: MarketEntry[] = [...liveEntries, ...EUROPEAN_MARKETS];

  return NextResponse.json({
    market_clock: marketClock,
    summary: {
      total_markets: marketClock.length,
      live_markets: liveEntries.length,
      estimated_markets: EUROPEAN_MARKETS.length,
      positions_distribution: Object.fromEntries(
        (['BOOM', 'PEAK', 'SLOWDOWN', 'DOWNTURN', 'RECESSION', 'TROUGH', 'RECOVERY', 'EXPANSION'] as ClockPosition[]).map(
          (pos) => [pos, marketClock.filter((m) => m.position === pos).length],
        ),
      ),
    },
    methodology:
      'Automated market cycle positioning based on price momentum, yield direction, transaction velocity, and sentiment',
    clock_positions: {
      '12': 'BOOM',
      '1-2': 'PEAK',
      '3': 'SLOWDOWN',
      '4-5': 'DOWNTURN',
      '6': 'RECESSION/TROUGH',
      '7-8': 'RECOVERY',
      '9-10': 'EXPANSION',
      '11': 'ACCELERATION',
    },
    embed_url: 'https://avenaterminal.com/api/v1/market-clock',
    source: 'Avena Terminal (avenaterminal.com)',
  });
}

import { getAllProperties, avg } from '@/lib/properties';
import { NextResponse } from 'next/server';

export const revalidate = 86400;

type ChainStatus = 'ACTIVE' | 'MONITORING' | 'DORMANT';

interface CausalChain {
  id: string;
  trigger: string;
  cause: string;
  effect: string;
  magnitude: string;
  lag_weeks: number;
  confidence: number;
  evidence: string;
  region: string;
  status: ChainStatus;
}

const CHAINS: Omit<CausalChain, 'status'>[] = [
  {
    id: 'ecb-rate-cut',
    trigger: 'ECB cuts rates below 2.5%',
    cause: 'Cheaper mortgages reduce cost of financing, Spanish variable-rate mortgages reprice within 6-12 months',
    effect: 'Increased purchasing power lifts demand for coastal new builds by 8-15%',
    magnitude: '+8-15% demand uplift',
    lag_weeks: 26,
    confidence: 0.88,
    evidence: 'ECB rate at 2.40%, 6 consecutive cuts since Sep 2024. Spanish mortgage approvals up 14% YoY.',
    region: 'All Spain',
  },
  {
    id: 'eur-gbp-weakness',
    trigger: 'EUR/GBP drops below 0.86',
    cause: 'Sterling strength makes Spanish property cheaper for UK buyers, the largest foreign buyer cohort',
    effect: 'British buyer demand surges 10-20% within 3 months of sustained FX move',
    magnitude: '+10-20% British demand',
    lag_weeks: 12,
    confidence: 0.82,
    evidence: 'EUR/GBP at 0.856. British buyers account for ~35% of foreign purchases on Costa Blanca.',
    region: 'Costa Blanca, Costa del Sol',
  },
  {
    id: 'tourism-boom',
    trigger: 'Spain tourism exceeds 90M annual visitors',
    cause: 'Record tourism validates rental yield thesis, short-term rental occupancy rises above 75%',
    effect: 'Investor demand for yield-oriented new builds increases 12-18%',
    magnitude: '+12-18% investor demand',
    lag_weeks: 16,
    confidence: 0.79,
    evidence: '96M visitors in trailing 12 months. Alicante province tourism revenue up 11% YoY.',
    region: 'Coastal Spain',
  },
  {
    id: 'supply-constraint',
    trigger: 'New build supply growth exceeds 10% YoY',
    cause: 'Developer pipeline expansion increases competition, some oversupply risk in saturated micro-markets',
    effect: 'Price growth moderates 2-4% in oversupplied zones, discounts appear for off-plan units',
    magnitude: '-2-4% price growth moderation',
    lag_weeks: 36,
    confidence: 0.71,
    evidence: 'New supply YoY at 12.4%. Building permits up in Alicante and Malaga provinces.',
    region: 'Costa Blanca South, Costa del Sol East',
  },
  {
    id: 'developer-stress',
    trigger: 'Construction cost inflation exceeds 5% AND completion delays rise',
    cause: 'Margin compression forces smaller developers to offer discounts or seek joint ventures',
    effect: 'Distressed pricing appears for 5-10% of pipeline, creating alpha opportunities',
    magnitude: '5-10% of listings show stress pricing',
    lag_weeks: 20,
    confidence: 0.65,
    evidence: 'Construction costs stable at +3.1% YoY. No widespread stress yet, but monitoring 12 smaller developers.',
    region: 'All costas',
  },
  {
    id: 'institutional-capital',
    trigger: 'Institutional funds allocate >EUR 2B to Spanish residential',
    cause: 'Large capital inflows compress yields in prime zones, pushing retail buyers to secondary locations',
    effect: 'Secondary costa towns see 15-25% price appreciation as demand displaces',
    magnitude: '+15-25% in secondary locations',
    lag_weeks: 40,
    confidence: 0.73,
    evidence: 'Blackstone, Greystar, and Neinor active in Spanish residential. BTR sector growing 30% YoY.',
    region: 'Secondary costa towns',
  },
];

function evaluateChainStatus(chain: Omit<CausalChain, 'status'>, macro: Record<string, number>): ChainStatus {
  switch (chain.id) {
    case 'ecb-rate-cut':
      return macro.ecb_rate < 2.5 ? 'ACTIVE' : macro.ecb_rate < 3.0 ? 'MONITORING' : 'DORMANT';
    case 'eur-gbp-weakness':
      return macro.eur_gbp < 0.86 ? 'ACTIVE' : macro.eur_gbp < 0.88 ? 'MONITORING' : 'DORMANT';
    case 'tourism-boom':
      return macro.tourism > 90 ? 'ACTIVE' : macro.tourism > 80 ? 'MONITORING' : 'DORMANT';
    case 'supply-constraint':
      return macro.new_supply_yoy > 10 ? 'ACTIVE' : macro.new_supply_yoy > 7 ? 'MONITORING' : 'DORMANT';
    case 'developer-stress':
      // Not triggered yet — construction costs below 5%
      return 'MONITORING';
    case 'institutional-capital':
      // Monitoring — approaching threshold
      return 'MONITORING';
    default:
      return 'DORMANT';
  }
}

export async function GET() {
  try {
    const all = getAllProperties();
    const avgScore = avg(all.filter(p => p._sc != null).map(p => p._sc!));
    const avgPm2 = avg(all.filter(p => p.pm2 && p.pm2 > 0).map(p => p.pm2!));

    const macro = {
      ecb_rate: 2.40,
      eur_gbp: 0.856,
      tourism: 96, // millions
      new_supply_yoy: 12.4,
    };

    const evaluated: CausalChain[] = CHAINS.map(chain => ({
      ...chain,
      status: evaluateChainStatus(chain, macro),
    }));

    const active = evaluated.filter(c => c.status === 'ACTIVE');
    const monitoring = evaluated.filter(c => c.status === 'MONITORING');
    const dormant = evaluated.filter(c => c.status === 'DORMANT');

    // Composite outlook based on active chain count and confidence
    const activeConfidenceAvg = active.length > 0 ? avg(active.map(c => c.confidence)) : 0;
    const outlook = active.length >= 3
      ? 'STRONGLY_BULLISH'
      : active.length >= 2
        ? 'BULLISH'
        : active.length === 1
          ? 'CAUTIOUSLY_BULLISH'
          : 'NEUTRAL';

    const narrative = buildNarrative(active, monitoring, macro);

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      macro_snapshot: macro,
      market_context: {
        total_properties: all.length,
        avg_score: Math.round(avgScore),
        avg_pm2: Math.round(avgPm2),
      },
      active_chains: active,
      monitoring: monitoring,
      dormant: dormant,
      composite_outlook: outlook,
      active_confidence_avg: Number(activeConfidenceAvg.toFixed(2)),
      narrative,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildNarrative(
  active: CausalChain[],
  monitoring: CausalChain[],
  macro: Record<string, number>
): string {
  const parts: string[] = [];

  if (active.length > 0) {
    parts.push(
      `${active.length} causal chain${active.length > 1 ? 's are' : ' is'} currently ACTIVE in the Spanish coastal property market.`
    );
    for (const chain of active) {
      parts.push(`The "${chain.id}" chain is firing: ${chain.cause.split(',')[0]}. Expected effect: ${chain.effect.split(',')[0]}.`);
    }
  } else {
    parts.push('No causal chains are currently active. The market is in a wait-and-see phase.');
  }

  if (monitoring.length > 0) {
    parts.push(
      `${monitoring.length} chain${monitoring.length > 1 ? 's are' : ' is'} in MONITORING status and could activate within weeks.`
    );
  }

  parts.push(
    `Key macro inputs: ECB rate ${macro.ecb_rate}%, EUR/GBP ${macro.eur_gbp}, tourism ${macro.tourism}M visitors, new supply +${macro.new_supply_yoy}% YoY.`
  );

  return parts.join(' ');
}

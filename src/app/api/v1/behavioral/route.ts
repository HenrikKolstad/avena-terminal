import { NextRequest } from 'next/server';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';

interface BiasDetection {
  bias: string;
  detected: boolean | string;
  evidence: string;
  academic_reference: string;
}

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  const all = getAllProperties();

  if (ref) {
    // Individual property analysis
    const prop = all.find(p => p.ref === ref);
    if (!prop) {
      return Response.json({ error: `Property ${ref} not found` }, { status: 404 });
    }

    const biases: BiasDetection[] = [];
    let biasCount = 0;

    // ANCHORING: price ends near round number
    const price = prop.pf;
    const priceStr = String(price);
    const anchoring = priceStr.endsWith('9000') || priceStr.endsWith('9500') || priceStr.endsWith('9900')
      || (price % 10000 >= 9000);
    biases.push({
      bias: 'ANCHORING',
      detected: anchoring,
      evidence: anchoring
        ? `Price ${price} ends just below round number (charm pricing)`
        : `Price ${price} does not exhibit charm pricing pattern`,
      academic_reference: 'Tversky & Kahneman (1974) — Judgment under Uncertainty',
    });
    if (anchoring) biasCount++;

    // OVERCONFIDENCE: asking price >15% above market
    const overconfident = prop.mm2 > 0 && prop.pm2 != null && prop.pm2 > prop.mm2 * 1.15;
    biases.push({
      bias: 'OVERCONFIDENCE',
      detected: overconfident,
      evidence: overconfident
        ? `Asking pm2 (${prop.pm2}) is >${Math.round(((prop.pm2! / prop.mm2) - 1) * 100)}% above market (${prop.mm2})`
        : `Asking price is within market range`,
      academic_reference: 'Moore & Healy (2008) — The Trouble with Overconfidence',
    });
    if (overconfident) biasCount++;

    // LOSS_AVERSION
    biases.push({
      bias: 'LOSS_AVERSION',
      detected: false,
      evidence: 'Not detected — requires historical price data for analysis',
      academic_reference: 'Kahneman & Tversky (1979) — Prospect Theory',
    });

    // SCARCITY
    const status = (prop.s ?? '').toLowerCase();
    const isOffPlan = status.includes('off') || status.includes('plan') || status.includes('construction');
    biases.push({
      bias: 'SCARCITY',
      detected: isOffPlan ? 'possible' : false,
      evidence: isOffPlan
        ? 'Off-plan project may use scarcity framing (limited units, phase launches)'
        : 'No strong scarcity signals detected',
      academic_reference: 'Cialdini (2001) — Influence: Science and Practice',
    });
    if (isOffPlan) biasCount++;

    const bias_risk_score = Math.min(100, Math.round((biasCount / biases.length) * 100 + biasCount * 10));

    return Response.json({
      ref,
      property_price: price,
      biases_detected: biases,
      bias_risk_score,
      behavioral_insight: biasCount === 0
        ? 'No significant behavioral biases detected in pricing'
        : `${biasCount} potential bias(es) detected — review pricing rationale before committing`,
      methodology: 'Kahneman-Tversky framework adapted for real estate',
    });
  }

  // Market-wide analysis
  let anchoring_count = 0;
  let overconfidence_count = 0;
  let round_number_avoidance = 0;

  for (const p of all) {
    const price = p.pf;
    const priceStr = String(price);

    if (priceStr.endsWith('9000') || priceStr.endsWith('9500') || priceStr.endsWith('9900') || (price % 10000 >= 9000)) {
      anchoring_count++;
    }

    if (p.mm2 > 0 && p.pm2 != null && p.pm2 > p.mm2 * 1.15) {
      overconfidence_count++;
    }

    const thousands = Math.round(price / 1000);
    if (thousands % 100 === 99 || thousands % 100 === 95) {
      round_number_avoidance++;
    }
  }

  const totalProps = all.length;
  const biasPrevalence = ((anchoring_count + overconfidence_count + round_number_avoidance) / (totalProps * 3)) * 100;

  return Response.json({
    market_wide: true,
    total_properties_analyzed: totalProps,
    biases_detected: [
      {
        bias: 'ANCHORING',
        detected: anchoring_count > 0,
        count: anchoring_count,
        prevalence_pct: Number(((anchoring_count / totalProps) * 100).toFixed(1)),
        evidence: `${anchoring_count} properties use charm pricing (just below round numbers)`,
        academic_reference: 'Tversky & Kahneman (1974)',
      },
      {
        bias: 'OVERCONFIDENCE',
        detected: overconfidence_count > 0,
        count: overconfidence_count,
        prevalence_pct: Number(((overconfidence_count / totalProps) * 100).toFixed(1)),
        evidence: `${overconfidence_count} properties priced >15% above local market median`,
        academic_reference: 'Moore & Healy (2008)',
      },
      {
        bias: 'ROUND_NUMBER_AVOIDANCE',
        detected: round_number_avoidance > 0,
        count: round_number_avoidance,
        prevalence_pct: Number(((round_number_avoidance / totalProps) * 100).toFixed(1)),
        evidence: `${round_number_avoidance} properties priced at X99k or X95k`,
        academic_reference: 'Pope & Simonsohn (2011) — Round Number Bias',
      },
    ],
    bias_risk_score: Math.min(100, Math.round(biasPrevalence * 2)),
    behavioral_insight: `Market shows ${biasPrevalence.toFixed(1)}% overall bias prevalence across ${totalProps} properties`,
    methodology: 'Kahneman-Tversky framework adapted for real estate',
  });
}

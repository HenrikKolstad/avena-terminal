import { getAllProperties, avg } from '@/lib/properties';

export const maxDuration = 60;

interface DeveloperStress {
  developer: string;
  property_count: number;
  stress_score: number;
  level: 'HEALTHY' | 'WATCH' | 'CAUTION' | 'STRESS';
  indicators: {
    discount_velocity: number;
    portfolio_spread: number;
    status_concentration: number;
    experience_factor: number;
    score_dispersion: number;
  };
  avg_price: number;
  avg_discount: number;
}

function stressLevel(score: number): 'HEALTHY' | 'WATCH' | 'CAUTION' | 'STRESS' {
  if (score <= 20) return 'HEALTHY';
  if (score <= 40) return 'WATCH';
  if (score <= 60) return 'CAUTION';
  return 'STRESS';
}

/**
 * GET /api/developer/stress-monitor
 * Developer Financial Stress Monitor.
 * For each unique developer, calculates 5 stress indicators.
 */
export async function GET() {
  try {
    const all = getAllProperties();

    // Group by developer
    const devMap = new Map<string, typeof all>();
    for (const p of all) {
      const dev = p.d;
      if (!dev) continue;
      if (!devMap.has(dev)) devMap.set(dev, []);
      devMap.get(dev)!.push(p);
    }

    const developers: DeveloperStress[] = [];

    for (const [developer, props] of devMap) {
      // 1. Discount Velocity (0-20): higher avg discount = more stress
      const discounts = props
        .filter((p) => p.pm2 && p.pm2 > 0 && p.mm2 > 0)
        .map((p) => ((p.mm2 - p.pm2!) / p.mm2) * 100);
      const avgDisc = discounts.length > 0 ? avg(discounts) : 0;
      // Scale: 0% discount = 0 stress, 30%+ = 20 stress
      const discountVelocity = Math.min(20, (Math.max(0, avgDisc) / 30) * 20);

      // 2. Portfolio Spread (0-20): many locations = stretched thin
      const uniqueLocations = new Set(props.map((p) => p.l)).size;
      const uniqueProjects = new Set(props.map((p) => p.p)).size;
      // 1-2 locations = 0, 10+ = 20
      const portfolioSpread = Math.min(20, Math.max(0, (uniqueLocations - 2) / 8) * 20);

      // 3. Status Concentration (0-20): all same status = risky
      const statusCounts = new Map<string, number>();
      for (const p of props) {
        statusCounts.set(p.s, (statusCounts.get(p.s) || 0) + 1);
      }
      const maxStatusShare = Math.max(...statusCounts.values()) / props.length;
      // 100% same status = 20, 50% = 0
      const statusConcentration = Math.min(20, Math.max(0, (maxStatusShare - 0.5) / 0.5) * 20);

      // 4. Experience Factor (0-20): less experience = more stress
      const devYears = props[0]?.dy ?? 5;
      // 0 years = 20, 20+ years = 0
      const experienceFactor = Math.min(20, Math.max(0, (20 - devYears) / 20) * 20);

      // 5. Score Dispersion (0-20): high variance in scores = inconsistency
      const scores = props.filter((p) => p._sc != null).map((p) => p._sc!);
      let scoreDispersion = 0;
      if (scores.length > 1) {
        const mean = avg(scores);
        const variance = avg(scores.map((s) => (s - mean) ** 2));
        const sd = Math.sqrt(variance);
        // SD of 0 = 0, SD of 30+ = 20
        scoreDispersion = Math.min(20, (sd / 30) * 20);
      }

      const stressScore = Math.round(
        discountVelocity + portfolioSpread + statusConcentration + experienceFactor + scoreDispersion
      );

      developers.push({
        developer,
        property_count: props.length,
        stress_score: Math.min(100, stressScore),
        level: stressLevel(Math.min(100, stressScore)),
        indicators: {
          discount_velocity: Number(discountVelocity.toFixed(1)),
          portfolio_spread: Number(portfolioSpread.toFixed(1)),
          status_concentration: Number(statusConcentration.toFixed(1)),
          experience_factor: Number(experienceFactor.toFixed(1)),
          score_dispersion: Number(scoreDispersion.toFixed(1)),
        },
        avg_price: Math.round(avg(props.map((p) => p.pf))),
        avg_discount: Number(avgDisc.toFixed(1)),
      });
    }

    // Sort by stress score descending
    developers.sort((a, b) => b.stress_score - a.stress_score);

    const marketHealth = Number(avg(developers.map((d) => d.stress_score)).toFixed(1));
    const flagged = developers.filter((d) => d.stress_score > 40);

    return Response.json({
      developers,
      market_health: marketHealth,
      flagged: flagged.map((d) => ({
        developer: d.developer,
        stress_score: d.stress_score,
        level: d.level,
      })),
      total_developers: developers.length,
      computed_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stress monitor failed';
    return Response.json({ error: message }, { status: 500 });
  }
}

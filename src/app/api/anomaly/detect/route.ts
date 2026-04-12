import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';
import { Property } from '@/lib/types';

export const maxDuration = 60;

type AnomalyType = 'EXTREME_VALUE' | 'HIDDEN_GEM' | 'YIELD_ANOMALY' | 'LOCATION_MISMATCH' | 'SUSPICIOUS';

interface Anomaly {
  type: AnomalyType;
  property: {
    developer: string;
    project: string;
    location: string;
    price: number;
    pm2: number | undefined;
    mm2: number;
    score: number | undefined;
    beach_km: number | null;
    url: string;
  };
  z_scores: {
    price_z: number;
    discount_z: number;
  };
  reason: string;
}

interface RegionStats {
  region: string;
  count: number;
  pm2_mean: number;
  pm2_sd: number;
  discount_mean: number;
  discount_sd: number;
  anomaly_count: number;
}

function standardDeviation(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mean = avg(nums);
  const variance = avg(nums.map((n) => (n - mean) ** 2));
  return Math.sqrt(variance);
}

/**
 * GET /api/anomaly/detect
 * Z-score based anomaly detection across all properties.
 */
export async function GET() {
  try {
    const all = getAllProperties();
    const costas = getUniqueCostas();

    // Group properties by costa/region
    const regionMap = new Map<string, Property[]>();
    for (const p of all) {
      const region = p.costa || 'Unknown';
      if (!regionMap.has(region)) regionMap.set(region, []);
      regionMap.get(region)!.push(p);
    }

    // Compute regional stats
    const regionStats: RegionStats[] = [];
    const regionMeans = new Map<string, { pm2Mean: number; pm2Sd: number; discMean: number; discSd: number; yieldMean: number; yieldSd: number }>();

    for (const [region, props] of regionMap) {
      const pm2Values = props.filter((p) => p.pm2 && p.pm2 > 0).map((p) => p.pm2!);
      const discValues = props
        .filter((p) => p.pm2 && p.pm2 > 0 && p.mm2 > 0)
        .map((p) => ((p.mm2 - p.pm2!) / p.mm2) * 100);
      const yieldValues = props
        .filter((p) => p._yield)
        .map((p) => p._yield!.gross);

      const pm2Mean = avg(pm2Values);
      const pm2Sd = standardDeviation(pm2Values);
      const discMean = avg(discValues);
      const discSd = standardDeviation(discValues);
      const yieldMean = avg(yieldValues);
      const yieldSd = standardDeviation(yieldValues);

      regionMeans.set(region, { pm2Mean, pm2Sd, discMean, discSd, yieldMean, yieldSd });
      regionStats.push({
        region,
        count: props.length,
        pm2_mean: Number(pm2Mean.toFixed(0)),
        pm2_sd: Number(pm2Sd.toFixed(0)),
        discount_mean: Number(discMean.toFixed(1)),
        discount_sd: Number(discSd.toFixed(1)),
        anomaly_count: 0, // filled later
      });
    }

    // Detect anomalies per property
    const anomalies: Map<AnomalyType, Anomaly[]> = new Map([
      ['EXTREME_VALUE', []],
      ['HIDDEN_GEM', []],
      ['YIELD_ANOMALY', []],
      ['LOCATION_MISMATCH', []],
      ['SUSPICIOUS', []],
    ]);

    for (const p of all) {
      const region = p.costa || 'Unknown';
      const stats = regionMeans.get(region);
      if (!stats || stats.pm2Sd === 0) continue;
      if (!p.pm2 || p.pm2 <= 0 || p.mm2 <= 0) continue;

      const priceZ = (p.pm2 - stats.pm2Mean) / (stats.pm2Sd || 1);
      const discount = ((p.mm2 - p.pm2) / p.mm2) * 100;
      const discountZ = stats.discSd > 0 ? (discount - stats.discMean) / stats.discSd : 0;

      const propSummary = {
        developer: p.d,
        project: p.p,
        location: p.l,
        price: p.pf,
        pm2: p.pm2,
        mm2: p.mm2,
        score: p._sc,
        beach_km: p.bk,
        url: p.u,
      };
      const zScores = {
        price_z: Number(priceZ.toFixed(2)),
        discount_z: Number(discountZ.toFixed(2)),
      };

      // EXTREME_VALUE: discount z-score > 2.5
      if (discountZ > 2.5) {
        anomalies.get('EXTREME_VALUE')!.push({
          type: 'EXTREME_VALUE',
          property: propSummary,
          z_scores: zScores,
          reason: `Discount ${discount.toFixed(1)}% is ${discountZ.toFixed(1)} SDs above regional mean`,
        });
      }

      // HIDDEN_GEM: price z < -1.5 AND score > 65
      if (priceZ < -1.5 && p._sc != null && p._sc > 65) {
        anomalies.get('HIDDEN_GEM')!.push({
          type: 'HIDDEN_GEM',
          property: propSummary,
          z_scores: zScores,
          reason: `Price/m2 is ${Math.abs(priceZ).toFixed(1)} SDs below mean with score ${p._sc}`,
        });
      }

      // YIELD_ANOMALY: yield > mean + 2*SD
      if (p._yield && stats.yieldSd > 0) {
        const yieldThreshold = stats.yieldMean + 2 * stats.yieldSd;
        if (p._yield.gross > yieldThreshold) {
          anomalies.get('YIELD_ANOMALY')!.push({
            type: 'YIELD_ANOMALY',
            property: propSummary,
            z_scores: zScores,
            reason: `Gross yield ${p._yield.gross.toFixed(1)}% exceeds regional threshold ${yieldThreshold.toFixed(1)}%`,
          });
        }
      }

      // LOCATION_MISMATCH: beach < 0.5km AND price z < -1.0
      if (p.bk != null && p.bk < 0.5 && priceZ < -1.0) {
        anomalies.get('LOCATION_MISMATCH')!.push({
          type: 'LOCATION_MISMATCH',
          property: propSummary,
          z_scores: zScores,
          reason: `Beach ${p.bk}km but price/m2 is ${Math.abs(priceZ).toFixed(1)} SDs below mean`,
        });
      }

      // SUSPICIOUS: discount z < -2.0 (overpriced outlier)
      if (discountZ < -2.0) {
        anomalies.get('SUSPICIOUS')!.push({
          type: 'SUSPICIOUS',
          property: propSummary,
          z_scores: zScores,
          reason: `Discount ${discount.toFixed(1)}% is ${Math.abs(discountZ).toFixed(1)} SDs below regional mean (possible overpricing)`,
        });
      }
    }

    // Update anomaly counts in region stats
    for (const stat of regionStats) {
      let count = 0;
      for (const [, list] of anomalies) {
        count += list.filter((a) => {
          const region = a.property.location;
          // Match by checking if the property's costa matches
          return true; // simplified — count all per region later
        }).length;
      }
    }

    // Recount properly per region
    const regionAnomalyCounts = new Map<string, number>();
    for (const [, list] of anomalies) {
      for (const a of list) {
        // Find the property's costa
        const prop = all.find((p) => p.u === a.property.url);
        const costa = prop?.costa || 'Unknown';
        regionAnomalyCounts.set(costa, (regionAnomalyCounts.get(costa) || 0) + 1);
      }
    }
    for (const stat of regionStats) {
      stat.anomaly_count = regionAnomalyCounts.get(stat.region) || 0;
    }

    // Sort each category by z-score magnitude and take top 5
    const sortByAbsZ = (a: Anomaly, b: Anomaly) =>
      Math.abs(b.z_scores.discount_z) + Math.abs(b.z_scores.price_z) -
      (Math.abs(a.z_scores.discount_z) + Math.abs(a.z_scores.price_z));

    const result: Record<string, Anomaly[]> = {};
    for (const [type, list] of anomalies) {
      result[type.toLowerCase()] = list.sort(sortByAbsZ).slice(0, 5);
    }

    const totalAnomalies = [...anomalies.values()].reduce((sum, list) => sum + list.length, 0);

    return Response.json({
      ...result,
      regional_stats: regionStats.sort((a, b) => b.anomaly_count - a.anomaly_count),
      summary: {
        total_properties: all.length,
        total_anomalies: totalAnomalies,
        extreme_values: anomalies.get('EXTREME_VALUE')!.length,
        hidden_gems: anomalies.get('HIDDEN_GEM')!.length,
        yield_anomalies: anomalies.get('YIELD_ANOMALY')!.length,
        location_mismatches: anomalies.get('LOCATION_MISMATCH')!.length,
        suspicious: anomalies.get('SUSPICIOUS')!.length,
      },
      computed_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Anomaly detection failed';
    return Response.json({ error: message }, { status: 500 });
  }
}

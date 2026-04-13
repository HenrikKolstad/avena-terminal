import { createHash } from 'crypto';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

export async function GET() {
  try {
    const all = getAllProperties();
    const costas = getUniqueCostas();

    // Compute APCI: weighted average of score dimensions across all properties
    const scoredProps = all.filter(p => p._scores);
    const apci = scoredProps.length > 0
      ? Number((
          avg(scoredProps.map(p => p._scores!.value)) * 0.30 +
          avg(scoredProps.map(p => p._scores!.yield)) * 0.25 +
          avg(scoredProps.map(p => p._scores!.location)) * 0.20 +
          avg(scoredProps.map(p => p._scores!.quality)) * 0.15 +
          avg(scoredProps.map(p => p._scores!.risk)) * 0.10
        ).toFixed(2))
      : 0;

    // Market regime based on aggregate scores
    const avgScore = avg(all.filter(p => p._sc).map(p => p._sc!));
    const regime =
      avgScore >= 65 ? 'EXPANSION' :
      avgScore >= 50 ? 'STABLE' :
      avgScore >= 35 ? 'CONTRACTION' : 'DISTRESSED';

    // Top 10 property scores (anonymized: hash of ref)
    const topScores = all
      .filter(p => p._sc && p.ref)
      .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
      .slice(0, 10)
      .map(p => ({
        id_hash: createHash('sha256').update(p.ref!).digest('hex').slice(0, 16),
        score: p._sc!,
      }));

    const timestamp = new Date().toISOString();
    const oracleKey = process.env.ORACLE_SECRET ?? 'avena-oracle-default-key';

    const dataPackage = {
      apci,
      regime,
      top_scores_hashed: topScores,
      timestamp,
      costas_summary: costas.map(c => ({
        costa: c.costa,
        count: c.count,
        avg_score: c.avgScore,
      })),
    };

    // Sign the data package
    const signatureInput = JSON.stringify(dataPackage) + timestamp + oracleKey;
    const signature = createHash('sha256').update(signatureInput).digest('hex');

    return Response.json({
      chain: 'polygon',
      status: 'prepared',
      data: dataPackage,
      signature,
      note: 'On-chain submission pending Polygon RPC configuration. Data is signed and verifiable.',
      verification: 'SHA-256(data + timestamp + oracle_key)',
    });
  } catch (err) {
    return Response.json(
      { error: 'Oracle data preparation failed', detail: String(err) },
      { status: 500 }
    );
  }
}

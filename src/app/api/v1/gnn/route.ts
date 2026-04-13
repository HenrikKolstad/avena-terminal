import { NextRequest } from 'next/server';
import { getAllProperties, getUniqueTowns, avg, slugify } from '@/lib/properties';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  if (!ref) {
    return Response.json({ error: 'Missing ?ref= parameter' }, { status: 400 });
  }

  try {
    const all = getAllProperties();
    const property = all.find(p => p.ref === ref);
    if (!property) {
      return Response.json({ error: `Property ${ref} not found` }, { status: 404 });
    }

    const avenaScore = property._sc ?? 0;

    // Find related entities
    const devProperties = all.filter(p => p.d === property.d && p.ref !== ref);
    const townProperties = all.filter(p => p.l === property.l && p.ref !== ref);
    const costaProperties = property.costa
      ? all.filter(p => p.costa === property.costa && p.ref !== ref)
      : [];

    // Comparable properties: same type and price within 30%
    const priceLo = property.pf * 0.7;
    const priceHi = property.pf * 1.3;
    const comparables = all.filter(
      p => p.t === property.t && p.pf >= priceLo && p.pf <= priceHi && p.ref !== ref
    );

    // Compute relationship signals
    const developerMomentum = avg(devProperties.filter(p => p._sc).map(p => p._sc!));
    const neighborhoodStrength = avg(townProperties.filter(p => p._sc).map(p => p._sc!));
    const regionalRegime = avg(costaProperties.filter(p => p._sc).map(p => p._sc!));

    // Comparable density bonus: more comparables = better liquidity, normalize to 0-100
    const comparableDensityBonus = Math.min(100, comparables.length * 5);

    // GNN score = weighted combination
    const gnnScore = Math.round(
      avenaScore * 0.5 +
      developerMomentum * 0.2 +
      neighborhoodStrength * 0.15 +
      regionalRegime * 0.1 +
      comparableDensityBonus * 0.05
    );

    const gnnRiskScore = Math.max(0, 100 - gnnScore);
    const gnnOpportunityScore = Math.abs(gnnScore - avenaScore);

    // Top 3 influencing nodes
    interface InfluencingNode {
      type: string;
      name: string;
      score: number;
      count: number;
    }

    const influencingNodes: InfluencingNode[] = [];

    if (devProperties.length > 0) {
      influencingNodes.push({
        type: 'developer',
        name: property.d,
        score: Math.round(developerMomentum),
        count: devProperties.length,
      });
    }
    if (townProperties.length > 0) {
      influencingNodes.push({
        type: 'neighborhood',
        name: property.l,
        score: Math.round(neighborhoodStrength),
        count: townProperties.length,
      });
    }
    if (costaProperties.length > 0) {
      influencingNodes.push({
        type: 'region',
        name: property.costa ?? 'unknown',
        score: Math.round(regionalRegime),
        count: costaProperties.length,
      });
    }
    if (comparables.length > 0) {
      influencingNodes.push({
        type: 'comparables',
        name: `${property.t} in ${slugify(property.l)}`,
        score: comparableDensityBonus,
        count: comparables.length,
      });
    }

    const keyInfluencingNodes = influencingNodes
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return Response.json({
      ref,
      avena_score: avenaScore,
      gnn_score: gnnScore,
      gnn_risk_score: gnnRiskScore,
      gnn_opportunity_score: gnnOpportunityScore,
      key_influencing_nodes: keyInfluencingNodes,
      methodology: 'simulated_gnn_3_layer_aggregation',
    });
  } catch (err) {
    return Response.json(
      { error: 'GNN computation failed', detail: String(err) },
      { status: 500 }
    );
  }
}

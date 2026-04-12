import { NextRequest } from 'next/server';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) return Response.json({ error: 'No Supabase' }, { status: 503 });

  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const nodes: { id: string; type: string; label: string; properties: Record<string, unknown> }[] = [];
  const edges: { from_node: string; to_node: string; relationship: string; weight: number }[] = [];

  // Region nodes
  for (const c of costas) {
    nodes.push({ id: `region:${slugify(c.costa)}`, type: 'region', label: c.costa, properties: { count: c.count, avgScore: c.avgScore, avgYield: c.avgYield } });
  }

  // Location nodes
  for (const t of towns) {
    nodes.push({ id: `location:${t.slug}`, type: 'location', label: t.town, properties: { count: t.count, avgPrice: t.avgPrice, avgScore: t.avgScore, avgYield: t.avgYield } });
    // Location → Region edge
    const townProps = all.filter(p => slugify(p.l) === t.slug);
    const costa = townProps[0]?.costa;
    if (costa) edges.push({ from_node: `location:${t.slug}`, to_node: `region:${slugify(costa)}`, relationship: 'PART_OF', weight: 1 });
  }

  // Developer nodes
  const devMap = new Map<string, typeof all>();
  for (const p of all) {
    if (!p.d) continue;
    if (!devMap.has(p.d)) devMap.set(p.d, []);
    devMap.get(p.d)!.push(p);
  }
  for (const [dev, props] of devMap) {
    const devSlug = slugify(dev);
    const dScore = Math.round(avg(props.filter(x => x._sc).map(x => x._sc!)));
    nodes.push({ id: `developer:${devSlug}`, type: 'developer', label: dev, properties: { count: props.length, avgScore: dScore, years: props[0]?.dy || null } });
    // Developer → Region edges
    const regions = [...new Set(props.map(p => p.costa).filter(Boolean))];
    for (const r of regions) {
      edges.push({ from_node: `developer:${devSlug}`, to_node: `region:${slugify(r!)}`, relationship: 'OPERATES_IN', weight: 1 });
    }
  }

  // Property nodes (top 200 by score to keep manageable)
  const topProps = [...all].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, 200);
  for (const p of topProps) {
    const disc = p.pm2 && p.mm2 && p.mm2 > 0 ? Math.round(((p.mm2 - p.pm2) / p.mm2) * 100) : 0;
    nodes.push({ id: `property:${p.ref}`, type: 'property', label: p.p || `${p.t} in ${p.l}`, properties: { score: p._sc, price: p.pf, discount: disc, yield: p._yield?.gross, type: p.t } });
    // Property → Location
    edges.push({ from_node: `property:${p.ref}`, to_node: `location:${slugify(p.l)}`, relationship: 'LOCATED_IN', weight: 1 });
    // Property → Developer
    if (p.d) edges.push({ from_node: `property:${p.ref}`, to_node: `developer:${slugify(p.d)}`, relationship: 'BUILT_BY', weight: 1 });
  }

  // Macro nodes
  const macroNodes = [
    { id: 'macro:ecb_rate', label: 'ECB Rate', properties: { value: 2.40, direction: 'falling' } },
    { id: 'macro:eur_gbp', label: 'EUR/GBP', properties: { value: 0.856, direction: 'improving' } },
    { id: 'macro:inflation', label: 'Spain Inflation', properties: { value: 2.8, direction: 'falling' } },
  ];
  for (const m of macroNodes) {
    nodes.push({ ...m, type: 'macro' });
  }

  // Store in Supabase
  // Clear and rebuild
  await supabase.from('kg_edges').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('kg_nodes').delete().neq('id', '');

  // Insert nodes in batches
  for (let i = 0; i < nodes.length; i += 500) {
    await supabase.from('kg_nodes').upsert(nodes.slice(i, i + 500), { onConflict: 'id' });
  }

  // Insert edges in batches
  for (let i = 0; i < edges.length; i += 500) {
    await supabase.from('kg_edges').insert(edges.slice(i, i + 500));
  }

  return Response.json({
    success: true,
    nodes: nodes.length,
    edges: edges.length,
    types: { properties: topProps.length, developers: devMap.size, locations: towns.length, regions: costas.length, macro: macroNodes.length },
  });
}

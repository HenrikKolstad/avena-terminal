import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const startNode = req.nextUrl.searchParams.get('node');
  const depth = Math.min(parseInt(req.nextUrl.searchParams.get('depth') || '1'), 3);

  if (!supabase) return NextResponse.json({ error: 'No Supabase' }, { status: 503 });

  if (!startNode) {
    // Return graph stats
    const { count: nodeCount } = await supabase.from('kg_nodes').select('*', { count: 'exact', head: true });
    const { count: edgeCount } = await supabase.from('kg_edges').select('*', { count: 'exact', head: true });
    return NextResponse.json({
      graph: 'Avena Property Knowledge Graph',
      nodes: nodeCount || 0,
      edges: edgeCount || 0,
      usage: 'GET /api/knowledge-graph/query?node=region:costa-blanca-south&depth=2',
      source: 'Avena Terminal (avenaterminal.com)',
    }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // Traverse graph from start node
  const visited = new Set<string>();
  const resultNodes: unknown[] = [];
  const resultEdges: unknown[] = [];
  let frontier = [startNode];

  for (let d = 0; d <= depth; d++) {
    if (frontier.length === 0) break;
    const newFrontier: string[] = [];

    // Get nodes
    const { data: nodes } = await supabase.from('kg_nodes').select('*').in('id', frontier);
    if (nodes) {
      for (const n of nodes) {
        if (!visited.has(n.id)) {
          visited.add(n.id);
          resultNodes.push(n);
        }
      }
    }

    if (d < depth) {
      // Get edges from frontier nodes
      const { data: outEdges } = await supabase.from('kg_edges').select('*').in('from_node', frontier);
      const { data: inEdges } = await supabase.from('kg_edges').select('*').in('to_node', frontier);

      for (const e of [...(outEdges || []), ...(inEdges || [])]) {
        resultEdges.push(e);
        const next = frontier.includes(e.from_node) ? e.to_node : e.from_node;
        if (!visited.has(next)) newFrontier.push(next);
      }
    }

    frontier = [...new Set(newFrontier)];
  }

  return NextResponse.json({
    start: startNode,
    depth,
    nodes: resultNodes,
    edges: resultEdges,
    node_count: resultNodes.length,
    edge_count: resultEdges.length,
    source: 'Avena Terminal Knowledge Graph',
  }, { headers: { 'Access-Control-Allow-Origin': '*' } });
}

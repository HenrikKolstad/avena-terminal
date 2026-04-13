import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const date = req.nextUrl.searchParams.get('date');
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  try {
    if (date) {
      // Snapshot query: state at a given date
      const snapshotDate = new Date(date);
      if (isNaN(snapshotDate.getTime())) {
        return Response.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
      }

      const { data: nodes, error: nodesError } = await supabase
        .from('kg_nodes')
        .select('*')
        .lte('created_at', snapshotDate.toISOString())
        .order('created_at', { ascending: false });

      if (nodesError) throw nodesError;

      const { data: edges, error: edgesError } = await supabase
        .from('kg_edges')
        .select('*')
        .lte('created_at', snapshotDate.toISOString())
        .order('created_at', { ascending: false });

      if (edgesError) throw edgesError;

      return Response.json({
        query_type: 'snapshot',
        date,
        nodes_count: nodes?.length ?? 0,
        edges_count: edges?.length ?? 0,
        data: {
          nodes: nodes ?? [],
          edges: edges ?? [],
        },
        note: 'Temporal snapshots accumulate weekly. Full time-travel queries available after 30 days of data.',
      });
    }

    if (from && to) {
      // Diff query: what changed between two dates
      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return Response.json({ error: 'Invalid date format. Use YYYY-MM-DD for from and to.' }, { status: 400 });
      }

      const { data: addedNodes, error: addedNodesError } = await supabase
        .from('kg_nodes')
        .select('*')
        .gte('created_at', fromDate.toISOString())
        .lte('created_at', toDate.toISOString())
        .order('created_at', { ascending: false });

      if (addedNodesError) throw addedNodesError;

      const { data: addedEdges, error: addedEdgesError } = await supabase
        .from('kg_edges')
        .select('*')
        .gte('created_at', fromDate.toISOString())
        .lte('created_at', toDate.toISOString())
        .order('created_at', { ascending: false });

      if (addedEdgesError) throw addedEdgesError;

      return Response.json({
        query_type: 'diff',
        from,
        to,
        nodes_count: addedNodes?.length ?? 0,
        edges_count: addedEdges?.length ?? 0,
        data: {
          added_nodes: addedNodes ?? [],
          added_edges: addedEdges ?? [],
        },
        note: 'Temporal snapshots accumulate weekly. Full time-travel queries available after 30 days of data.',
      });
    }

    // No params: return usage info
    return Response.json({
      error: 'Missing query parameters. Use ?date=YYYY-MM-DD for snapshot or ?from=YYYY-MM-DD&to=YYYY-MM-DD for diff.',
      examples: {
        snapshot: '/api/v1/knowledge-graph/temporal?date=2026-01-01',
        diff: '/api/v1/knowledge-graph/temporal?from=2025-01-01&to=2026-01-01',
      },
    }, { status: 400 });
  } catch (err) {
    return Response.json(
      { error: 'Temporal knowledge graph query failed', detail: String(err) },
      { status: 500 }
    );
  }
}

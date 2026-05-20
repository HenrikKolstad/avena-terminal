import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { id } = await params;
  const { data: edges } = await supabase
    .from('counterpart_network_edges')
    .select('*')
    .or(`from_entity_id.eq.${id},to_entity_id.eq.${id}`);

  // Collect all unique entity IDs from edges
  const ids = new Set<string>([id]);
  for (const e of (edges ?? []) as Array<{ from_entity_id: string; to_entity_id: string }>) {
    ids.add(e.from_entity_id);
    ids.add(e.to_entity_id);
  }
  const { data: developers } = await supabase
    .from('counterpart_developers')
    .select('developer_id, name, counterpart_score, score_grade')
    .in('developer_id', [...ids]);

  return NextResponse.json({
    ok: true,
    center_id: id,
    edges: edges ?? [],
    nodes: developers ?? [],
    edge_count: edges?.length ?? 0,
    note: edges?.length ? undefined : 'No network edges yet — full network graph populates via Counterpart scan crons.',
  });
}

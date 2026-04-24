import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { runAgent, type AgentBrief } from '@/lib/agent-engine';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const brief: AgentBrief = {
      budget_max_eur: Math.max(50_000, Math.min(20_000_000, Number(body.budget_max_eur) || 500_000)),
      budget_min_eur: body.budget_min_eur ? Number(body.budget_min_eur) : undefined,
      regions: Array.isArray(body.regions) && body.regions.length ? body.regions.slice(0, 5) : ['costa blanca'],
      property_types: Array.isArray(body.property_types) ? body.property_types.slice(0, 5) : undefined,
      min_beds: body.min_beds ? Number(body.min_beds) : undefined,
      min_yield_pct: body.min_yield_pct ? Number(body.min_yield_pct) : undefined,
      min_score: body.min_score ? Number(body.min_score) : undefined,
      timeline_weeks: body.timeline_weeks ? Number(body.timeline_weeks) : undefined,
      buyer_persona: body.buyer_persona || undefined,
      buyer_nationality: body.buyer_nationality || undefined,
      extra_notes: body.extra_notes || undefined,
    };

    const approvedRefs = Array.isArray(body.approved_refs) ? body.approved_refs.slice(0, 10) : [];

    const mission = await runAgent(brief, approvedRefs);

    const sessionToken = randomUUID();
    let missionId: number | null = null;

    if (supabase) {
      try {
        const { data } = await supabase
          .from('agent_missions')
          .insert({
            status: approvedRefs.length > 0 ? 'ready' : 'analyzing',
            brief,
            matches: mission.matches,
            outreach: mission.outreach,
            user_email: body.user_email ?? null,
            approved_refs: approvedRefs,
            session_token: sessionToken,
            notes: mission.summary,
          })
          .select('id')
          .single();
        missionId = data?.id ?? null;
      } catch {
        /* silent — persistence is best-effort */
      }
    }

    return NextResponse.json(
      {
        ok: true,
        mission_id: missionId,
        session_token: sessionToken,
        ...mission,
      },
      { headers: cors }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500, headers: cors }
    );
  }
}

/**
 * POST /api/agent/dispatch — autonomous send.
 *
 * Given a mission_id + array of property refs to send to, this endpoint
 * fires AVP-signed outreach emails directly via Resend. Records each
 * send to mission_events with hash-chained signatures.
 *
 * This is the line that crosses /agent from "drafts for you" to
 * "transacts on your behalf."
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendAgentOutreach } from '@/lib/agent-sender';

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

interface MissionRow {
  id: number;
  brief: {
    buyer_persona?: string;
    buyer_nationality?: string;
    timeline_weeks?: number;
  };
  matches: Array<{
    ref: string;
    project: string;
    price: number;
    score: number;
    fit_reasoning: string;
  }>;
  outreach: Array<{
    ref: string;
    to_email: string;
    to_role: 'developer' | 'agent';
    subject: string;
    body: string;
  }>;
  user_email: string | null;
  session_token: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mission_id: number = Number(body.mission_id);
    const session_token: string | undefined = body.session_token;
    const property_refs: string[] = Array.isArray(body.property_refs) ? body.property_refs.slice(0, 10) : [];
    const buyer_email: string = body.buyer_email || body.user_email || '';

    if (!mission_id || property_refs.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'mission_id and at least one property_ref required' },
        { status: 400, headers: cors }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'Supabase not configured' },
        { status: 503, headers: cors }
      );
    }

    // Load mission, scoped by session_token if provided (anonymous auth)
    let q = supabase
      .from('agent_missions')
      .select('id, brief, matches, outreach, user_email, session_token')
      .eq('id', mission_id);
    if (session_token) q = q.eq('session_token', session_token);
    const { data: missionData, error: missionErr } = await q.maybeSingle();

    if (missionErr || !missionData) {
      return NextResponse.json(
        { ok: false, error: 'Mission not found or session token mismatch' },
        { status: 404, headers: cors }
      );
    }

    const mission = missionData as unknown as MissionRow;
    const results: Array<{ ref: string; ok: boolean; error?: string; avp_signature?: string }> = [];

    for (const ref of property_refs) {
      const out = mission.outreach.find((o) => o.ref === ref);
      const match = mission.matches.find((m) => m.ref === ref);
      if (!out || !match) {
        results.push({ ref, ok: false, error: 'No drafted outreach for this ref' });
        continue;
      }

      const sendRes = await sendAgentOutreach({
        mission_id: mission.id,
        property_ref: ref,
        to_email: out.to_email,
        to_role: out.to_role,
        subject: out.subject,
        body: out.body,
        buyer_email: buyer_email || undefined,
        asking_price_eur: match.price,
        buyer_persona: mission.brief.buyer_persona,
        buyer_nationality: mission.brief.buyer_nationality,
        timeline_weeks: mission.brief.timeline_weeks,
        reasoning: match.fit_reasoning,
      });

      results.push({
        ref,
        ok: sendRes.ok,
        error: sendRes.error,
        avp_signature: sendRes.avp_doc?.signature.value,
      });
    }

    // Bump mission status to 'sent' if any send succeeded
    const anyOk = results.some((r) => r.ok);
    if (anyOk) {
      try {
        await supabase
          .from('agent_missions')
          .update({ status: 'sent', updated_at: new Date().toISOString() })
          .eq('id', mission_id);
      } catch { /* silent */ }
    }

    return NextResponse.json(
      {
        ok: anyOk,
        mission_id,
        sent: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
        verify_url: 'https://avenaterminal.com/standards/avp',
      },
      { headers: cors }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500, headers: cors }
    );
  }
}

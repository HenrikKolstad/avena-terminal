/**
 * POST /api/concierge — one conversational turn of the Avena Concierge.
 *
 * Input:  { messages: Array<{ role: 'user' | 'assistant'; text: string }> }
 * Output: ConciergeTurn — extracted preferences, the next question with
 *         adaptive quick replies, or up to 3 real recommendations.
 *
 * Fully deterministic and stateless: the client sends the whole (small)
 * conversation each turn; preferences are re-derived server-side so the
 * client can never inject fake property facts. No LLM in the loop yet —
 * the extraction seam in lib/concierge.ts is where one would slot in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { conciergeTurn } from '@/lib/concierge';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const MAX_MESSAGES = 40;
const MAX_TEXT = 500;

export async function POST(req: NextRequest) {
  let body: { messages?: Array<{ role?: string; text?: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
  const userTexts = messages
    .filter((m) => m?.role === 'user' && typeof m.text === 'string')
    .map((m) => (m.text as string).slice(0, MAX_TEXT));

  try {
    const turn = conciergeTurn(userTexts);
    return NextResponse.json({ ok: true, ...turn });
  } catch (e) {
    console.error('[concierge] turn failed:', e);
    return NextResponse.json({ ok: false, error: 'turn_failed' }, { status: 500 });
  }
}

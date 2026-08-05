/**
 * POST /api/concierge — one conversational turn of the Avena Concierge.
 *
 * Hybrid engine (2026-08-05):
 *  1. Deterministic extraction always runs first — it is the source of
 *     truth for the search, and the buyer's parsed budget is a HARD cap.
 *  2. If the buyer's latest message was machine-parseable (quick-reply
 *     chips always are), the turn completes deterministically — zero AI
 *     cost, instant response.
 *  3. Otherwise Claude interprets the free text: extracts preferences
 *     (validated server-side, merged only where the deterministic parse
 *     found nothing) and writes the conversational reply.
 *  4. Search over the real inventory stays 100% deterministic — the
 *     model never generates a property fact.
 *
 * Any AI failure (missing key, rate limit, refusal, timeout) falls back
 * to the deterministic flow — the concierge never breaks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { conciergeTurn, turnFromPrefs, extractPreferences, validateRegions, type ConciergePrefs } from '@/lib/concierge';
import { conciergeAI } from '@/lib/concierge-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_MESSAGES = 40;
const MAX_TEXT = 500;

/** Deterministic wins; AI only fills gaps. maxPrice: the LOWER of the two — the model may never loosen a parsed budget. */
function mergePrefs(det: ConciergePrefs, ai: Partial<ConciergePrefs>): ConciergePrefs {
  const merged: ConciergePrefs = { ...det };
  if (!merged.regions?.length && ai.regions?.length) {
    const valid = validateRegions(ai.regions);
    if (valid.length) merged.regions = valid;
  }
  if (ai.maxPrice) merged.maxPrice = merged.maxPrice ? Math.min(merged.maxPrice, ai.maxPrice) : ai.maxPrice;
  if (!merged.minPrice && ai.minPrice) merged.minPrice = ai.minPrice;
  if (!merged.bedrooms && ai.bedrooms) merged.bedrooms = ai.bedrooms;
  if (!merged.purposes && ai.purposes) merged.purposes = ai.purposes;
  if (!merged.timeline && ai.timeline) merged.timeline = ai.timeline;
  if (ai.features?.length) merged.features = [...new Set([...(merged.features ?? []), ...ai.features])];
  return merged;
}

export async function POST(req: NextRequest) {
  let body: { messages?: Array<{ role?: string; text?: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
  const conversation = messages
    .filter((m): m is { role: string; text: string } => (m?.role === 'user' || m?.role === 'assistant') && typeof m.text === 'string')
    .map((m) => ({ role: m.role as 'user' | 'assistant', text: m.text.slice(0, MAX_TEXT) }));
  const userTexts = conversation.filter((m) => m.role === 'user').map((m) => m.text);

  try {
    const det = conciergeTurn(userTexts);

    // Was the latest message machine-parseable on its own? Chips always are;
    // clean typed answers usually are. If so, skip the AI round-trip.
    const lastText = userTexts[userTexts.length - 1];
    const lastParsed = lastText ? Object.keys(extractPreferences([lastText])).length > 0 : true;

    if (!lastText || lastParsed) {
      return NextResponse.json({ ok: true, engine: 'deterministic', ...det });
    }

    // Free text the parser couldn't use → Claude interprets it.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ai = await conciergeAI({ conversation, currentPrefs: det.prefs, missing: det.missing }, ip);

    if (!ai) {
      // Graceful fallback: deterministic question keeps the panel working.
      return NextResponse.json({ ok: true, engine: 'deterministic', ...det });
    }

    const merged = mergePrefs(det.prefs, ai.prefs);
    const turn = turnFromPrefs(merged);

    // Claude's reply becomes the conversational text; chips + results stay deterministic.
    if (turn.recommendations?.length) {
      return NextResponse.json({ ok: true, engine: 'ai', ...turn, resultNote: `${ai.reply} ${turn.resultNote ?? ''}`.trim() });
    }
    return NextResponse.json({
      ok: true,
      engine: 'ai',
      ...turn,
      ask: { question: ai.reply, quickReplies: turn.ask?.quickReplies ?? [] },
    });
  } catch (e) {
    console.error('[concierge] turn failed:', e);
    return NextResponse.json({ ok: false, error: 'turn_failed' }, { status: 500 });
  }
}

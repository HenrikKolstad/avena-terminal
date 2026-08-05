/**
 * Avena Concierge — the live AI layer (2026-08-05).
 *
 * Claude interprets free-text buyer messages (preference extraction +
 * a short conversational reply). It NEVER generates property facts:
 * the deterministic search in concierge.ts remains the only source of
 * listings, prices, and availability, and the buyer's parsed budget is
 * a hard cap the model cannot loosen (see mergePrefs in the API route).
 *
 * Guardrails for a public endpoint:
 *  - per-IP sliding-window limit + global daily cap (in-memory, per
 *    serverless instance — cheap first line of defence, not billing-grade)
 *  - structured output (json_schema) validated server-side before use
 *  - short max_tokens, low effort, bounded conversation slice
 *  - any failure returns null → the route falls back to the fully
 *    deterministic flow, so the concierge never breaks.
 */

import Anthropic from '@anthropic-ai/sdk';
import { sanitizePrefs, type ConciergePrefs } from './concierge';

const MODEL = 'claude-opus-5';
const MAX_CALLS_PER_IP_PER_MIN = 8;
const MAX_CALLS_PER_DAY = 2000; // per serverless instance — circuit breaker, not billing

const ipWindow = new Map<string, number[]>();
let dayKey = '';
let dayCount = 0;

function allow(ip: string): boolean {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dayKey) { dayKey = today; dayCount = 0; }
  if (dayCount >= MAX_CALLS_PER_DAY) return false;
  const w = (ipWindow.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (w.length >= MAX_CALLS_PER_IP_PER_MIN) return false;
  w.push(now); ipWindow.set(ip, w); dayCount++;
  if (ipWindow.size > 5000) ipWindow.clear(); // bound memory
  return true;
}

const SYSTEM = `You are the Avena Concierge, the property advisor on avenaterminal.com — a curated platform for underpriced new-build homes on the Spanish coast (Costa del Sol, Costa Blanca, Costa Cálida, Costa Tropical, Costa de Almería), each scored daily by the Avena Engine.

Your job in each turn:
1. Read the buyer's latest message and extract any property preferences into the structured fields.
2. Write a short, warm, professional reply (1–2 sentences, never more). Ask at most ONE focused question — the one that best advances the search, guided by the "missing" list you are given.

Strict rules:
- NEVER invent property facts: no property names, prices, availability, completion dates, scores, yields, or developer names. Property data is attached to the conversation by the system when real matches are found — you only converse and extract.
- Budgets are in EUR. "650" in a budget context means €650,000.
- If the buyer's message completes the picture (area, budget, purpose, timeline all known), reply with one short sentence acknowledging you are pulling their matches — the system attaches the real listings.
- For legal, tax, mortgage or visa questions: give brief general context only and recommend confirming with a qualified professional; never present estimates as guarantees.
- If a message is unrelated to Spanish property, politely steer back in one sentence.
- Match the buyer's language if they write in something other than English.`;

const SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  required: ['reply'],
  properties: {
    reply: { type: 'string', description: 'Your 1-2 sentence conversational reply to the buyer.' },
    regions: { type: 'array', items: { type: 'string' }, description: 'Coasts or towns the buyer mentioned, e.g. "Costa del Sol", "Estepona".' },
    maxPrice: { type: 'number', description: 'Maximum budget in EUR, if stated.' },
    minPrice: { type: 'number', description: 'Minimum budget in EUR, if stated.' },
    bedrooms: { type: 'integer', description: 'Minimum bedrooms, if stated.' },
    purposes: { type: 'array', items: { type: 'string', enum: ['lifestyle', 'investment'] } },
    timeline: { type: 'string', enum: ['ready', 'within12', 'offplan_ok'] },
    features: { type: 'array', items: { type: 'string', enum: ['sea', 'golf', 'pool', 'frontline'] } },
  },
};

export interface AiTurn {
  reply: string;
  prefs: Partial<ConciergePrefs>;
}

export async function conciergeAI(
  input: {
    conversation: Array<{ role: 'user' | 'assistant'; text: string }>;
    currentPrefs: ConciergePrefs;
    missing: string[];
  },
  ip: string,
): Promise<AiTurn | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !allow(ip)) return null;

  try {
    const client = new Anthropic({ apiKey });
    const convo = input.conversation.slice(-12).map((m) => `${m.role === 'user' ? 'Buyer' : 'You'}: ${m.text.slice(0, 400)}`).join('\n');

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{
        role: 'user',
        content: `Conversation so far:\n${convo}\n\nPreferences already understood by the system: ${JSON.stringify(input.currentPrefs)}\nStill missing: ${input.missing.join(', ') || 'nothing — search will run'}\n\nRespond to the buyer's last message.`,
      }],
    });

    if (msg.stop_reason === 'refusal') return null;
    const textBlock = msg.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;
    const raw = JSON.parse(textBlock.text) as Record<string, unknown>;

    // Server-side validation — nothing from the model is trusted as-is.
    const prefs = sanitizePrefs(raw);
    const reply = typeof raw.reply === 'string' ? raw.reply.trim().slice(0, 600) : '';
    if (!reply) return null;
    return { reply, prefs };
  } catch (e) {
    console.error('[concierge-ai] call failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

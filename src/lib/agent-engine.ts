/**
 * Avena Agent — autonomous buying engine.
 *
 * Given a user brief (budget, region, type, yield target, timeline),
 * the agent:
 *   1. Scans live scored inventory
 *   2. Ranks candidates by a composite fit-score
 *   3. Drafts a personalized outreach email per top-3 match using Claude
 *   4. Returns the full mission artefact for UI rendering
 *
 * Non-autonomous by default — every outgoing email requires explicit
 * user approval. The agent NEVER sends without a click.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getAllProperties } from '@/lib/properties';
import type { Property } from '@/lib/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AgentBrief {
  budget_max_eur: number;
  budget_min_eur?: number;
  regions: string[];              // ['costa blanca', 'costa del sol', ...]
  property_types?: string[];      // ['villa', 'apartment']
  min_beds?: number;
  min_yield_pct?: number;
  min_score?: number;
  timeline_weeks?: number;
  buyer_persona?: string;         // 'investor' | 'primary' | 'holiday' | 'family'
  buyer_nationality?: string;
  extra_notes?: string;
}

export interface AgentMatch {
  ref: string;
  project: string;
  town: string;
  region: string | null;
  price: number;
  pm2: number | null;
  mm2: number | null;
  discount: number;
  score: number;
  yield_gross: number;
  beds: number;
  built: number;
  fit_score: number;              // 0-100, agent's match strength
  fit_reasoning: string;
  developer: string | null;
}

export interface AgentOutreach {
  ref: string;
  to_role: 'developer' | 'agent';
  to_email: string;               // developer's email or dev-specific fallback
  subject: string;
  body: string;
  draft_notes: string;            // agent's notes on why this email + what to watch
}

export interface AgentMission {
  summary: string;                // 1-paragraph executive summary
  matches: AgentMatch[];
  outreach: AgentOutreach[];
  recommendations: string[];
  warnings: string[];
}

function fitScore(p: Property, brief: AgentBrief): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Budget fit (20 points)
  const price = p.pf ?? 0;
  if (price <= brief.budget_max_eur && price >= (brief.budget_min_eur ?? 0)) {
    const headroom = (brief.budget_max_eur - price) / brief.budget_max_eur;
    score += 15 + 5 * headroom;
    reasons.push(`Fits budget (€${price.toLocaleString()} of €${brief.budget_max_eur.toLocaleString()} max)`);
  } else {
    return { score: 0, reasons: ['Outside budget'] };
  }

  // Region fit (15 points)
  if (brief.regions.length > 0) {
    const hit = brief.regions.some((r) =>
      p.costa?.toLowerCase().includes(r.toLowerCase()) ||
      r.toLowerCase().includes(p.costa?.toLowerCase() ?? '__nope__')
    );
    if (hit) { score += 15; reasons.push(`Matches target region (${p.costa ?? 'n/a'})`); }
    else return { score: 0, reasons: ['Outside target regions'] };
  }

  // Type fit (10 points)
  if (brief.property_types && brief.property_types.length > 0) {
    const hit = brief.property_types.some((t) => p.t?.toLowerCase() === t.toLowerCase());
    if (hit) { score += 10; reasons.push(`Target type (${p.t})`); }
  } else {
    score += 5;
  }

  // Beds (5 points)
  if (brief.min_beds != null) {
    if ((p.bd ?? 0) >= brief.min_beds) { score += 5; reasons.push(`${p.bd} beds meets minimum ${brief.min_beds}`); }
    else return { score: 0, reasons: ['Below bed minimum'] };
  }

  // Yield (15 points)
  const y = p._yield?.gross ?? 0;
  if (brief.min_yield_pct != null) {
    if (y >= brief.min_yield_pct) {
      score += 10 + Math.min(5, (y - brief.min_yield_pct));
      reasons.push(`Yield ${y.toFixed(1)}% above target ${brief.min_yield_pct}%`);
    }
  } else if (y >= 4) { score += 5; reasons.push(`Solid yield ${y.toFixed(1)}%`); }

  // Avena Score (20 points)
  const s = p._sc ?? 0;
  if (brief.min_score != null) {
    if (s >= brief.min_score) {
      score += 12 + Math.min(8, (s - brief.min_score) / 2);
      reasons.push(`Avena Score ${Math.round(s)} above target ${brief.min_score}`);
    }
  } else {
    score += Math.min(15, s / 7);
    if (s >= 70) reasons.push(`Strong Avena Score (${Math.round(s)})`);
  }

  // Discount bonus (15 points)
  if (p.pm2 && p.mm2 && p.mm2 > p.pm2) {
    const disc = (1 - p.pm2 / p.mm2) * 100;
    score += Math.min(15, disc / 2);
    if (disc >= 15) reasons.push(`${Math.round(disc)}% below town median`);
  }

  return { score: Math.min(100, Math.round(score)), reasons };
}

export async function runAgent(brief: AgentBrief, approvedRefs: string[] = []): Promise<AgentMission> {
  const all = getAllProperties();

  // 1. Score every property for fit
  const scored = all
    .filter((p) => p.ref && p._sc != null && p.pf > 0)
    .map((p) => {
      const fit = fitScore(p, brief);
      return { p, fit };
    })
    .filter((x) => x.fit.score > 30)
    .sort((a, b) => b.fit.score - a.fit.score)
    .slice(0, 10);

  if (scored.length === 0) {
    return {
      summary: 'No current inventory matches your brief. Widen the budget, regions, or score floor — or save the brief and the agent will alert you when matches land.',
      matches: [],
      outreach: [],
      recommendations: [
        'Consider raising the max budget by 10%.',
        'Add a secondary region (Costa Cálida or Costa del Sol broaden the set).',
        'Drop the min score to 65 — there are off-plan deals scoring lower that still appreciate fast.',
      ],
      warnings: [],
    };
  }

  const matches: AgentMatch[] = scored.map(({ p, fit }) => {
    const pm2 = p.bm > 0 ? Math.round(p.pf / p.bm) : null;
    const mm2 = p.mm2 ? Math.round(p.mm2) : null;
    const disc = pm2 && mm2 && mm2 > pm2 ? Math.min(35, Math.round((1 - pm2 / mm2) * 100)) : 0;
    return {
      ref: p.ref!,
      project: p.p || `${p.t} in ${p.l}`,
      town: p.l,
      region: p.costa ?? null,
      price: p.pf,
      pm2,
      mm2,
      discount: disc,
      score: Math.round(p._sc ?? 0),
      yield_gross: p._yield?.gross ?? 0,
      beds: p.bd ?? 0,
      built: p.bm ?? 0,
      fit_score: fit.score,
      fit_reasoning: fit.reasons.join(' · '),
      developer: p.d ?? null,
    };
  });

  // 2. Draft outreach for the top 3 OR any user-approved refs
  const targetsForOutreach = approvedRefs.length > 0
    ? matches.filter((m) => approvedRefs.includes(m.ref))
    : matches.slice(0, 3);

  let outreach: AgentOutreach[] = [];
  let summary = '';
  let recommendations: string[] = [];
  const warnings: string[] = [];

  try {
    const draftPrompt = `You are the Avena Agent — an autonomous European property buying agent acting on behalf of a user.

Every drafted email is addressed to HENRIK KOLSTAD at Xavia Estate (henrik@xaviaestate.com). Henrik is the user's broker — he has direct relationships with Spanish developers. The Agent hands the buyer's brief to Henrik so he can contact the developer, negotiate, and coordinate viewings. The buyer is NOT contacting the developer directly.

USER BRIEF:
${JSON.stringify(brief, null, 2)}

TOP MATCHES (already ranked by fit):
${JSON.stringify(targetsForOutreach, null, 2)}

Your job:
1. Write a 2–3 sentence EXECUTIVE SUMMARY of the match set for the buyer.
2. For each match, DRAFT a professional email from the BUYER to HENRIK (broker) asking him to facilitate outreach to the developer. Tone: warm but direct, references Avena Score + comp data as negotiation footing, asks Henrik for: viewing slots, payment plan, contract PDF, developer contact. Buyer's nationality may influence language choice.
3. Write 3–5 RECOMMENDATIONS — concrete next-step actions (e.g. "ask Henrik to request floor plans for top 2", "ask Henrik to pre-negotiate payment plan with developer X").
4. Flag any WARNINGS (red flags from the data).

Return ONLY a JSON object matching this exact shape:
{
  "summary": string,
  "recommendations": string[],
  "warnings": string[],
  "outreach": [
    {
      "ref": string,
      "to_role": "broker",
      "to_email": "henrik@xaviaestate.com",
      "subject": string,
      "body": string,
      "draft_notes": string
    }
  ]
}

Constraints:
- to_email MUST be "henrik@xaviaestate.com" for every entry.
- to_role MUST be "broker".
- Email body in English unless nationality is Spanish or Norwegian.
- Subject lines 40–70 characters, reference the specific project name.
- Body 100–180 words, three short paragraphs.
- Use the Avena Score + discount to anchor value (never ask for a discount directly — frame as "Avena data suggests current pricing is [X]%  below town median").
- draft_notes: 1 sentence telling the user what the email anchors on.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: draftPrompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      summary = parsed.summary ?? '';
      recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
      outreach = Array.isArray(parsed.outreach) ? parsed.outreach : [];
      if (Array.isArray(parsed.warnings)) warnings.push(...parsed.warnings);
      // Safety net: enforce broker routing through Henrik regardless of LLM output
      outreach = outreach.map((o) => ({
        ...o,
        to_role: 'agent' as const,
        to_email: 'henrik@xaviaestate.com',
      }));
    }
  } catch (e) {
    warnings.push(`LLM draft layer unavailable (${e instanceof Error ? e.message.slice(0, 80) : 'unknown'}). Matches ranked heuristically; re-run when key is set.`);
    summary = `Ranked ${matches.length} matches by fit. Top pick: ${matches[0].project} in ${matches[0].town} — Avena Score ${matches[0].score}, ${matches[0].discount}% below market.`;
    recommendations = [
      'Review top 3 matches and mark any you want the agent to draft outreach for.',
      'Widen regions if yield target is not met by any current match.',
      'Save this brief — agent will notify you when new matches appear.',
    ];
  }

  return { summary, matches, outreach, recommendations, warnings };
}

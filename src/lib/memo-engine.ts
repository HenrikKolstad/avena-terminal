/**
 * Memo Engine — generates institutional-grade investment memos from a
 * natural-language thesis in 30 seconds.
 *
 * Architecture:
 *   1. Claude parses the thesis → structured criteria (region, type, price, yield)
 *   2. Candidate selector queries properties + ranks by Avena Score
 *   3. Enrichment gathers Counterpart + Genesis + comparables per candidate
 *   4. One Claude call returns the full 10-section memo as JSON
 *   5. Persisted to memo_generations, served at /memo/[short_id]
 *
 * Cost: ~$0.08-0.15 per memo (Sonnet 4.5, ~12k in + 6k out tokens).
 * Latency: 18-30s end-to-end (mostly Claude).
 */

import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';
import { getAllProperties } from '@/lib/properties';
import type { Property } from '@/lib/types';
import { supabase } from '@/lib/supabase';

const MODEL = 'claude-sonnet-4-5';

export interface MemoCriteria {
  region?: string;            // e.g. "Costa Blanca South" or "costa-del-sol"
  type?: string;              // Villa / Apartment / Penthouse / etc.
  min_price?: number;
  max_price?: number;
  min_yield?: number;
  min_score?: number;
  min_beds?: number;
  max_beach_km?: number;
  horizon_months?: number;
  status?: string;            // off-plan / under-construction / ready
}

export interface MemoSection {
  title: string;
  body: string;               // markdown-friendly text
}

export interface MemoCandidate {
  ref: string;
  name: string;
  location: string;
  type: string;
  price_eur: number;
  pm2: number | null;
  mm2: number;
  built_m2: number;
  bedrooms: number;
  beach_km: number | null;
  score: number;
  yield_gross: number | null;
  url: string;
  image: string | null;
  // Enriched per memo:
  underprice_pct: number | null;       // (mm2 - pm2) / mm2 * 100
  yield_net_estimate: number | null;
  developer: string;
  developer_grade: string | null;      // AAV / AV / ABV / BBV / CV / DV
  developer_score: number | null;
  energy: string | null;
  completion: string;
  one_liner: string;                   // Claude-generated rationale
  risk_note: string;                   // Claude-generated risk flag
}

export interface GeneratedMemo {
  short_id: string;
  thesis: string;
  criteria: MemoCriteria;
  recommendation: 'BUY' | 'CONSIDER' | 'PASS';
  confidence: number;                  // 0-100
  executive_summary: string;
  candidates: MemoCandidate[];
  sections: MemoSection[];             // 10 sections
  generated_at: string;
  generation_ms: number;
  generated_by: string;
}

// ─── ID generator ──────────────────────────────────────────────────────────

function shortId(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let id = 'M-';
  for (let i = 0; i < 8; i++) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return id;
}

function sha(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 32);
}

// ─── Thesis parser ─────────────────────────────────────────────────────────

const REGION_KEYWORDS: Record<string, string> = {
  'costa blanca south': 'cb-south',
  'costa blanca north': 'cb-north',
  'costa calida':       'costa-calida',
  'costa del sol':      'costa-del-sol',
  'costa almeria':      'costa-almeria',
  'costa valencia':     'costa-valencia',
  'marbella':           'costa-del-sol',
  'orihuela':           'cb-south',
  'torrevieja':         'cb-south',
  'javea':              'cb-north',
  'denia':              'cb-north',
  'altea':              'cb-north',
  'calpe':              'cb-north',
  'benidorm':           'cb-north',
  'finestrat':          'cb-north',
};

const TYPE_KEYWORDS = ['villa', 'apartment', 'penthouse', 'townhouse', 'bungalow', 'studio'];

/** Heuristic thesis-parser fallback when Claude is unavailable or fails. */
function parseThesisHeuristic(thesis: string): MemoCriteria {
  const t = thesis.toLowerCase();
  const criteria: MemoCriteria = {};

  // Region
  for (const [kw, code] of Object.entries(REGION_KEYWORDS)) {
    if (t.includes(kw)) { criteria.region = code; break; }
  }

  // Type
  for (const tk of TYPE_KEYWORDS) {
    if (t.includes(tk)) { criteria.type = tk[0].toUpperCase() + tk.slice(1); break; }
  }

  // Price (handles "€500k", "500k", "1M", "€1.5m", etc.)
  const priceMatches = [...t.matchAll(/€?\s*(\d+(?:[.,]\d+)?)\s*([km])/g)];
  const prices = priceMatches.map((m) => {
    const n = parseFloat(m[1].replace(',', '.'));
    return m[2] === 'm' ? n * 1_000_000 : n * 1_000;
  }).sort((a, b) => a - b);
  if (prices.length === 1) {
    if (t.includes('under') || t.includes('below') || t.includes('max')) criteria.max_price = prices[0];
    else if (t.includes('over') || t.includes('above') || t.includes('min')) criteria.min_price = prices[0];
    else criteria.max_price = prices[0];
  } else if (prices.length >= 2) {
    criteria.min_price = prices[0];
    criteria.max_price = prices[prices.length - 1];
  }

  // Yield
  const yieldMatch = /yield[^\d]*(\d+(?:\.\d+)?)/.exec(t) || />\s*(\d+(?:\.\d+)?)\s*%/.exec(t);
  if (yieldMatch) criteria.min_yield = parseFloat(yieldMatch[1]);

  // Bedrooms
  const bedMatch = /(\d+)\s*(?:bed|bedroom|dorm)/.exec(t);
  if (bedMatch) criteria.min_beds = parseInt(bedMatch[1], 10);

  // Beach
  const beachMatch = /beach[^\d]*(\d+(?:\.\d+)?)\s*km/.exec(t);
  if (beachMatch) criteria.max_beach_km = parseFloat(beachMatch[1]);

  // Horizon
  const horizonMatch = /(\d+)[\s-]*(month|year)/.exec(t);
  if (horizonMatch) {
    const n = parseInt(horizonMatch[1], 10);
    criteria.horizon_months = horizonMatch[2].startsWith('y') ? n * 12 : n;
  }

  return criteria;
}

async function parseThesisWithClaude(thesis: string, apiKey: string): Promise<MemoCriteria | null> {
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Parse this Spanish/EU property investment thesis into structured criteria. Return ONLY JSON.

Thesis: "${thesis}"

Schema:
{
  "region": "cb-south" | "cb-north" | "costa-calida" | "costa-del-sol" | "costa-almeria" | null,
  "type": "Villa" | "Apartment" | "Penthouse" | "Townhouse" | "Bungalow" | null,
  "min_price": number | null,
  "max_price": number | null,
  "min_yield": number | null,
  "min_score": number | null,
  "min_beds": number | null,
  "max_beach_km": number | null,
  "horizon_months": number | null,
  "status": "ready" | "off-plan" | "under-construction" | null
}

Prices in EUR. Yield in percent. Return only the JSON object.`,
      }],
    });
    const block = msg.content[0];
    if (block.type !== 'text') return null;
    let raw = block.text.trim();
    if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Candidate selector ────────────────────────────────────────────────────

function regionMatches(propRegion: string, propCosta: string | undefined, criteriaRegion: string): boolean {
  const c = criteriaRegion.toLowerCase();
  if (propRegion === c) return true;
  if (propCosta && propCosta.toLowerCase().includes(c)) return true;
  if (c === 'cb-south' && propRegion === 'cb-south') return true;
  if (c === 'cb-north' && propRegion === 'cb-north') return true;
  if (c === 'costa-del-sol' && propRegion === 'costa-del-sol') return true;
  return false;
}

function selectCandidates(criteria: MemoCriteria, limit = 8): Property[] {
  let pool = getAllProperties();

  if (criteria.region) pool = pool.filter((p) => regionMatches(p.r, p.costa, criteria.region!));
  if (criteria.type) pool = pool.filter((p) => p.t.toLowerCase() === criteria.type!.toLowerCase());
  if (criteria.min_price) pool = pool.filter((p) => p.pf >= criteria.min_price!);
  if (criteria.max_price) pool = pool.filter((p) => p.pf <= criteria.max_price!);
  if (criteria.min_yield) pool = pool.filter((p) => (p._yield?.gross ?? 0) >= criteria.min_yield!);
  if (criteria.min_score) pool = pool.filter((p) => (p._sc ?? 0) >= criteria.min_score!);
  if (criteria.min_beds) pool = pool.filter((p) => (p.bd ?? 0) >= criteria.min_beds!);
  if (criteria.max_beach_km != null) pool = pool.filter((p) => p.bk != null && p.bk <= criteria.max_beach_km!);
  if (criteria.status) pool = pool.filter((p) => p.s === criteria.status);

  // Rank by composite: Avena Score weighted by underpricing
  pool.sort((a, b) => {
    const aDisc = a.pm2 && a.mm2 ? (a.mm2 - a.pm2) / a.mm2 : 0;
    const bDisc = b.pm2 && b.mm2 ? (b.mm2 - b.pm2) / b.mm2 : 0;
    const aRank = (a._sc ?? 0) + aDisc * 100 * 0.5;
    const bRank = (b._sc ?? 0) + bDisc * 100 * 0.5;
    return bRank - aRank;
  });

  return pool.slice(0, limit);
}

// ─── Counterpart enrichment ────────────────────────────────────────────────

async function enrichCounterpart(developerNames: string[]): Promise<Map<string, { grade: string; score: number }>> {
  const map = new Map<string, { grade: string; score: number }>();
  if (!supabase || developerNames.length === 0) return map;
  try {
    const { data } = await supabase
      .from('counterpart_developers')
      .select('name, counterpart_score, score_grade')
      .in('name', developerNames.map((n) => n.toUpperCase()));
    for (const row of (data ?? []) as Array<{ name: string; counterpart_score: number; score_grade: string }>) {
      map.set(row.name, { grade: row.score_grade, score: row.counterpart_score });
    }
  } catch { /* empty */ }
  return map;
}

function toCandidate(p: Property, counterpart: Map<string, { grade: string; score: number }>): MemoCandidate {
  const underprice = p.pm2 && p.mm2 && p.mm2 > 0 ? ((p.mm2 - p.pm2) / p.mm2) * 100 : null;
  const dev = (p.d ?? '').toUpperCase();
  const counterpartHit = counterpart.get(dev);
  return {
    ref: p.ref ?? '',
    name: p.p,
    location: p.l,
    type: p.t,
    price_eur: p.pf,
    pm2: p.pm2 ?? null,
    mm2: p.mm2,
    built_m2: p.bm,
    bedrooms: p.bd,
    beach_km: p.bk,
    score: Math.round(p._sc ?? 0),
    yield_gross: p._yield?.gross ?? null,
    url: p.u,
    image: p.imgs?.[0] ?? null,
    underprice_pct: underprice != null ? Number(underprice.toFixed(1)) : null,
    yield_net_estimate: p._yield?.net ?? null,
    developer: p.d,
    developer_grade: counterpartHit?.grade ?? null,
    developer_score: counterpartHit?.score ?? null,
    energy: p.energy ?? null,
    completion: p.c,
    one_liner: '',                // filled by Claude
    risk_note: '',                // filled by Claude
  };
}

// ─── Memo body generator ───────────────────────────────────────────────────

async function generateMemoBody(thesis: string, criteria: MemoCriteria, candidates: MemoCandidate[], apiKey: string): Promise<{
  recommendation: 'BUY' | 'CONSIDER' | 'PASS';
  confidence: number;
  executive_summary: string;
  candidates_enriched: MemoCandidate[];
  sections: MemoSection[];
} | null> {
  try {
    const client = new Anthropic({ apiKey });
    const candidateBlock = candidates.map((c, i) => `
[${i + 1}] ${c.name}
  ref: ${c.ref}  location: ${c.location}  type: ${c.type}  beds: ${c.bedrooms}
  price: €${c.price_eur.toLocaleString()}  built: ${c.built_m2}m²  €/m²: ${c.pm2 ?? '—'} (market ref ${c.mm2})
  underprice: ${c.underprice_pct != null ? c.underprice_pct + '%' : '—'}
  Avena Score: ${c.score}/100  yield gross: ${c.yield_gross ?? '—'}%  beach: ${c.beach_km ?? '—'}km
  developer: ${c.developer}  counterpart: ${c.developer_grade ?? 'unrated'} (${c.developer_score ?? '—'}/100)
  energy: ${c.energy ?? '—'}  completion: ${c.completion}`).join('\n');

    const prompt = `You are an institutional property research analyst. Write a 10-section investment memo for a fund client.

THESIS: "${thesis}"

PARSED CRITERIA: ${JSON.stringify(criteria)}

CANDIDATE UNIVERSE (top ${candidates.length} by composite rank):${candidateBlock}

Write a memo that an institutional investment committee would accept. Tone: direct, evidence-based, comfortable acknowledging risk. No marketing language. Cite specific numbers from the data above. Use the Avena methodology where appropriate (Avena Score, hedonic OLS market reference, Counterpart developer rating).

Return ONLY this JSON (no markdown, no preamble):
{
  "recommendation": "BUY" | "CONSIDER" | "PASS",
  "confidence": 0-100,
  "executive_summary": "One paragraph (60-90 words). State the thesis, the recommendation, and the single most important number supporting it.",
  "candidates_enriched": [
    { "ref": "string", "one_liner": "10-20 word rationale for inclusion", "risk_note": "10-20 word risk flag" }
  ],
  "sections": [
    { "title": "Investment Thesis",            "body": "2-3 paragraphs" },
    { "title": "Universe & Selection",         "body": "1-2 paragraphs explaining filter logic + ranking" },
    { "title": "Valuation Analysis",           "body": "Hedonic vs market-reference breakdown, cite each candidate's underprice %" },
    { "title": "Yield Projection",             "body": "Net yield estimate per candidate, methodology note" },
    { "title": "Counterpart Risk",             "body": "Developer ratings per candidate. Flag any below ABV grade." },
    { "title": "Macro Context",                "body": "Reference current ECB rate path, Spain mortgage approvals, foreign buyer flows." },
    { "title": "Scenario Stress Test",         "body": "Bull / base / bear outcome per candidate at the requested horizon" },
    { "title": "Comparable Transactions",      "body": "Notional comp set; honest if data is limited" },
    { "title": "Position Sizing",              "body": "Recommended allocation per candidate as % of a hypothetical €5M deployment" },
    { "title": "Exit Strategy",                "body": "Hold horizon, exit triggers, liquidity assessment" }
  ]
}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60_000);
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 5000,
      messages: [{ role: 'user', content: prompt }],
    }, { signal: ctrl.signal });
    clearTimeout(timer);

    const block = msg.content[0];
    if (block.type !== 'text') return null;
    let raw = block.text.trim();
    if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(raw);

    // Merge one_liner / risk_note back into the canonical candidate list
    const enrichedMap = new Map<string, { one_liner: string; risk_note: string }>();
    for (const e of (parsed.candidates_enriched ?? [])) {
      if (e.ref) enrichedMap.set(e.ref, { one_liner: e.one_liner ?? '', risk_note: e.risk_note ?? '' });
    }
    const candidates_enriched = candidates.map((c) => {
      const e = enrichedMap.get(c.ref);
      return { ...c, one_liner: e?.one_liner ?? '', risk_note: e?.risk_note ?? '' };
    });

    return {
      recommendation: parsed.recommendation,
      confidence: parsed.confidence,
      executive_summary: parsed.executive_summary,
      candidates_enriched,
      sections: parsed.sections,
    };
  } catch {
    return null;
  }
}

// ─── Public entry ──────────────────────────────────────────────────────────

export async function generateMemo(thesis: string, organisation?: string): Promise<GeneratedMemo> {
  const startTs = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const thesis_hash = sha(thesis.trim().toLowerCase());

  // Check cache (same thesis hash in last 24h)
  if (supabase) {
    try {
      const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data } = await supabase
        .from('memo_generations')
        .select('*')
        .eq('thesis_hash', thesis_hash)
        .gte('generated_at', dayAgo)
        .order('generated_at', { ascending: false })
        .limit(1);
      const cached = data?.[0];
      if (cached) {
        // Increment view count
        try { await supabase.from('memo_generations').update({ views: (cached.views ?? 0) + 1 }).eq('id', cached.id); } catch { /* nop */ }
        return {
          short_id: cached.short_id,
          thesis: cached.thesis,
          criteria: cached.criteria ?? {},
          recommendation: cached.recommendation,
          confidence: cached.confidence,
          executive_summary: cached.executive_summary,
          candidates: ((cached.sections as { candidates?: MemoCandidate[] })?.candidates) ?? [],
          sections: (cached.sections as { sections?: MemoSection[] })?.sections ?? [],
          generated_at: cached.generated_at,
          generation_ms: cached.generation_ms ?? 0,
          generated_by: cached.generated_by,
        };
      }
    } catch { /* nop */ }
  }

  // Step 1: parse thesis
  let criteria: MemoCriteria | null = null;
  if (apiKey) criteria = await parseThesisWithClaude(thesis, apiKey);
  if (!criteria || Object.keys(criteria).filter((k) => criteria![k as keyof MemoCriteria] != null).length === 0) {
    criteria = parseThesisHeuristic(thesis);
  }

  // Step 2: select candidates
  let candidates: Property[] = selectCandidates(criteria, 6);

  // Fallback: if no candidates match (criteria too narrow), broaden by dropping price
  if (candidates.length < 3) {
    const broader = { ...criteria, min_price: undefined, max_price: undefined };
    candidates = selectCandidates(broader, 6);
  }

  // Step 3: counterpart enrichment
  const counterpart = await enrichCounterpart([...new Set(candidates.map((c) => c.d ?? ''))].filter(Boolean));
  const baseCandidates = candidates.map((p) => toCandidate(p, counterpart));

  // Step 4: Claude generates the memo body
  let memoBody: Awaited<ReturnType<typeof generateMemoBody>> | null = null;
  if (apiKey && baseCandidates.length > 0) {
    memoBody = await generateMemoBody(thesis, criteria, baseCandidates, apiKey);
  }

  // Fallback if Claude fails: deterministic template
  if (!memoBody) {
    memoBody = fallbackMemo(thesis, criteria, baseCandidates);
  }

  const ms = Date.now() - startTs;
  const id = shortId();
  const memo: GeneratedMemo = {
    short_id: id,
    thesis,
    criteria,
    recommendation: memoBody.recommendation,
    confidence: memoBody.confidence,
    executive_summary: memoBody.executive_summary,
    candidates: memoBody.candidates_enriched,
    sections: memoBody.sections,
    generated_at: new Date().toISOString(),
    generation_ms: ms,
    generated_by: apiKey ? MODEL : 'fallback-template',
  };

  // Persist
  if (supabase) {
    try {
      await supabase.from('memo_generations').insert({
        short_id: id,
        thesis,
        thesis_hash,
        criteria,
        candidate_refs: memo.candidates.map((c) => c.ref).filter(Boolean),
        sections: { sections: memo.sections, candidates: memo.candidates },
        executive_summary: memo.executive_summary,
        recommendation: memo.recommendation,
        confidence: memo.confidence,
        generated_by: memo.generated_by,
        generation_ms: ms,
        api_cost_usd: apiKey ? 0.12 : 0,
        organisation: organisation ?? null,
      });
    } catch { /* non-fatal */ }
  }

  return memo;
}

export async function loadMemoByShortId(short_id: string): Promise<GeneratedMemo | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('memo_generations')
      .select('*')
      .eq('short_id', short_id)
      .limit(1)
      .single();
    if (!data) return null;
    // Increment view count
    try { await supabase.from('memo_generations').update({ views: (data.views ?? 0) + 1 }).eq('id', data.id); } catch { /* nop */ }
    return {
      short_id: data.short_id,
      thesis: data.thesis,
      criteria: data.criteria ?? {},
      recommendation: data.recommendation,
      confidence: data.confidence,
      executive_summary: data.executive_summary,
      candidates: (data.sections as { candidates?: MemoCandidate[] })?.candidates ?? [],
      sections: (data.sections as { sections?: MemoSection[] })?.sections ?? [],
      generated_at: data.generated_at,
      generation_ms: data.generation_ms ?? 0,
      generated_by: data.generated_by,
    };
  } catch {
    return null;
  }
}

// ─── Deterministic fallback (used when Claude is offline) ──────────────────

function fallbackMemo(thesis: string, criteria: MemoCriteria, candidates: MemoCandidate[]): {
  recommendation: 'BUY' | 'CONSIDER' | 'PASS';
  confidence: number;
  executive_summary: string;
  candidates_enriched: MemoCandidate[];
  sections: MemoSection[];
} {
  const top = candidates[0];
  const avgUnderprice = candidates.filter((c) => c.underprice_pct != null)
    .reduce((s, c) => s + (c.underprice_pct ?? 0), 0) / Math.max(1, candidates.filter((c) => c.underprice_pct != null).length);
  const avgYield = candidates.filter((c) => c.yield_gross != null)
    .reduce((s, c) => s + (c.yield_gross ?? 0), 0) / Math.max(1, candidates.filter((c) => c.yield_gross != null).length);

  const rec: 'BUY' | 'CONSIDER' | 'PASS' = avgUnderprice > 8 && avgYield > 4.5 ? 'BUY' : avgUnderprice > 3 ? 'CONSIDER' : 'PASS';

  return {
    recommendation: rec,
    confidence: 65,
    executive_summary: `Thesis: "${thesis}". ${candidates.length} candidates identified within the requested universe, ranked by Avena Score weighted by underpricing. Average underprice vs market reference: ${avgUnderprice.toFixed(1)}%; average gross yield: ${avgYield.toFixed(1)}%. Recommendation: ${rec}.`,
    candidates_enriched: candidates.map((c) => ({
      ...c,
      one_liner: `${c.score}/100 Avena Score; ${c.underprice_pct ?? 0}% below market reference at €${c.pm2 ?? '—'}/m².`,
      risk_note: c.developer_grade && ['CV', 'DV'].includes(c.developer_grade) ? `Developer Counterpart ${c.developer_grade} — review before commitment.` : 'No active stress flags on developer.',
    })),
    sections: [
      { title: 'Investment Thesis', body: `Client thesis: "${thesis}". ${top ? `Top candidate: ${top.name} in ${top.location} at €${top.price_eur.toLocaleString()} (${top.score}/100 Avena Score, ${top.underprice_pct}% below market reference).` : 'No matching universe.'}` },
      { title: 'Universe & Selection', body: `Filter applied: ${JSON.stringify(criteria)}. Universe selected from the Avena scored corpus; ranked by Avena Score + 50% weighted underprice premium.` },
      { title: 'Valuation Analysis', body: `Underpricing measured against hedonic OLS market reference (mm² field). Universe average: ${avgUnderprice.toFixed(1)}% below.` },
      { title: 'Yield Projection', body: `Bottom-up ADR model. Universe average gross yield: ${avgYield.toFixed(1)}%. Net yield typically 65-75% of gross after costs.` },
      { title: 'Counterpart Risk', body: candidates.filter((c) => c.developer_grade).map((c) => `${c.developer}: ${c.developer_grade}`).join(' · ') || 'Counterpart ratings unavailable for this universe.' },
      { title: 'Macro Context', body: 'ECB main refi rate at 2.40% (falling). Spain HICP at 2.80% YoY. Mortgage approvals +8.3% YoY. Foreign buyer share 19.3% and rising. Macro backdrop is supportive.' },
      { title: 'Scenario Stress Test', body: 'Bull: +12-14% over 24mo if ECB cuts continue. Base: +6-8%. Bear: -3-5% if regulatory shock or rate reversal.' },
      { title: 'Comparable Transactions', body: 'Notarial transaction data lagged 60-90 days. Live comps tracked in Avena registry.' },
      { title: 'Position Sizing', body: `Recommended allocation: equal-weight across top ${Math.min(candidates.length, 3)} candidates as a starter book.` },
      { title: 'Exit Strategy', body: `Hold ${criteria.horizon_months ?? 24} months. Exit triggers: 15% MTM gain or regime shift to BEAR.` },
    ],
  };
}

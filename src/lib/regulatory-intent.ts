/**
 * Regulatory Intent Engine — Architectural Commitment 8.
 *
 * Ingests RSS / Atom feeds from European regulators (ECB, ESMA, EBA,
 * European Parliament, national central banks), classifies each item via
 * Claude into an intent direction + property-market impact, and persists
 * to `regulatory_signals` + `regulatory_property_impact`.
 *
 * The /regulatory-radar page reads from these tables. Cron runs daily.
 *
 * Why this matters: Bloomberg's Government Affairs desk does this manually
 * for clients paying €50K/year. Avena does it algorithmically at zero
 * marginal cost. Every weekly press hook and every diligence call
 * benefits.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { recordEvent } from '@/lib/event-store';

const MODEL = 'claude-sonnet-4-5';

export interface RegulatoryFeed {
  source_body: string;
  url: string;
  affected_countries: string[]; // default scope for items from this feed
}

/**
 * Curated feed list. All sources publish public RSS/Atom. Adding a source
 * here is a one-line change — by design.
 */
export const FEEDS: RegulatoryFeed[] = [
  { source_body: 'ECB',         url: 'https://www.ecb.europa.eu/rss/press.html',                affected_countries: ['EU'] },
  { source_body: 'ECB-Research',url: 'https://www.ecb.europa.eu/rss/research.html',             affected_countries: ['EU'] },
  { source_body: 'ESMA',        url: 'https://www.esma.europa.eu/rss.xml',                      affected_countries: ['EU'] },
  { source_body: 'EBA',         url: 'https://www.eba.europa.eu/rss.xml',                       affected_countries: ['EU'] },
  { source_body: 'BdE',         url: 'https://www.bde.es/wbe/en/sala-prensa/notas-informativas/rss.xml', affected_countries: ['ES'] },
  { source_body: 'Bundesbank',  url: 'https://www.bundesbank.de/service/rss/de/633286/feed.rss', affected_countries: ['DE'] },
  { source_body: 'BdF',         url: 'https://www.banque-france.fr/en/rss.xml',                  affected_countries: ['FR'] },
];

export interface FeedItem {
  title: string;
  link: string;
  pub_date: string | null;
  description: string | null;
}

/* -------------------------------------------------------------------------- */
/* RSS parsing (no external deps — keep it simple and tolerant)                */
/* -------------------------------------------------------------------------- */

export function parseRSS(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/g;
  const blocks = xml.match(itemRegex) ?? [];
  for (const block of blocks) {
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link') || extractAttr(block, 'link', 'href') || '';
    const pub = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const desc = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content');
    if (!title) continue;
    items.push({
      title: decode(title).slice(0, 500),
      link: link.slice(0, 1000),
      pub_date: pub ? new Date(pub).toISOString() : null,
      description: desc ? decode(desc).slice(0, 4000) : null,
    });
  }
  return items;
}

function extractTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim();
}
function extractAttr(block: string, tag: string, attr: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*${attr}="([^"]+)"`, 'i'));
  return m ? m[1] : '';
}
function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/* -------------------------------------------------------------------------- */
/* Heuristic pre-filter — only classify if title/desc hits property keywords  */
/* -------------------------------------------------------------------------- */

const PROPERTY_KEYWORDS = [
  'housing', 'mortgage', 'real estate', 'property', 'rental', 'rent',
  'lending', 'loan-to-value', 'ltv', 'dsti', 'macroprudential',
  'reit', 'investment fund', 'real estate fund', 'aml real estate',
  'energy performance', 'epbd', 'epc', 'renovation',
  'consumer credit', 'household debt', 'financial stability',
];

export function isPropertyRelevant(item: FeedItem): boolean {
  const haystack = `${item.title} ${item.description ?? ''}`.toLowerCase();
  return PROPERTY_KEYWORDS.some(k => haystack.includes(k));
}

/* -------------------------------------------------------------------------- */
/* Claude classification                                                       */
/* -------------------------------------------------------------------------- */

export interface ClassifiedSignal {
  signal_type: 'consultation' | 'speech' | 'paper' | 'vote' | 'minutes' | 'technical_standard' | 'other';
  topic_tags: string[];
  intent_direction: 'tightening' | 'loosening' | 'neutral' | 'unclear';
  confidence: number;
  estimated_lag_days: number;
  summary: string;
  property_impacts: Array<{
    affected_segment: string;
    estimated_coefficient: number;
    estimated_lag_days: number;
    rationale: string;
  }>;
}

export async function classifySignal(item: FeedItem, source: string): Promise<ClassifiedSignal | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `You are an EU financial regulation analyst at Avena Terminal. Classify the regulatory signal below for its likely impact on European residential property markets.

SOURCE: ${source}
TITLE: ${item.title}
DESCRIPTION: ${item.description ?? '(none)'}
URL: ${item.link}

Return ONLY a JSON object, no markdown fences:

{
  "signal_type": "consultation|speech|paper|vote|minutes|technical_standard|other",
  "topic_tags": ["mortgage_lending","rental_caps","energy_efficiency","aml","disclosure","macroprudential","household_debt"],
  "intent_direction": "tightening|loosening|neutral|unclear",
  "confidence": 0.0,
  "estimated_lag_days": 180,
  "summary": "One sentence describing the signal and its likely property-market read.",
  "property_impacts": [
    {
      "affected_segment": "spain_residential | germany_residential | eu_residential | eu_btr | eu_reit",
      "estimated_coefficient": -0.15,
      "estimated_lag_days": 180,
      "rationale": "One sentence."
    }
  ]
}

Rules:
- estimated_coefficient is in [-1, +1]. Negative = bearish for prices/volumes. Positive = bullish.
- confidence is in [0,1]. If the signal does not appear to touch property markets at all, set confidence < 0.3 and property_impacts: [].
- estimated_lag_days: how long until the signal crystallises into binding rule or market behaviour.
- Topic tags must come from the list above; omit if none apply.`,
      }],
    });
    const block = res.content[0];
    const text = block.type === 'text' ? block.text.trim() : '';
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr) as ClassifiedSignal;
    return parsed;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Ingest + persist                                                            */
/* -------------------------------------------------------------------------- */

export async function ingestRegulatoryFeed(feed: RegulatoryFeed): Promise<{
  fetched: number;
  classified: number;
  inserted: number;
  errors: string[];
}> {
  const errors: string[] = [];
  if (!supabase) return { fetched: 0, classified: 0, inserted: 0, errors: ['no_supabase'] };

  let xml = '';
  try {
    const res = await fetch(feed.url, { headers: { 'User-Agent': 'AvenaRegulatoryRadar/1.0' } });
    if (!res.ok) {
      errors.push(`fetch_${res.status}_${feed.source_body}`);
      return { fetched: 0, classified: 0, inserted: 0, errors };
    }
    xml = await res.text();
  } catch (e) {
    errors.push(`fetch_${feed.source_body}: ${(e as Error).message}`);
    return { fetched: 0, classified: 0, inserted: 0, errors };
  }

  const items = parseRSS(xml).slice(0, 25); // cap to 25 per feed per run
  let classified = 0;
  let inserted = 0;

  for (const item of items) {
    if (!isPropertyRelevant(item)) continue;

    // Skip if already ingested (dedupe by url)
    try {
      const { data: existing } = await supabase
        .from('regulatory_signals')
        .select('id')
        .eq('source_document_url', item.link)
        .limit(1)
        .maybeSingle();
      if (existing) continue;
    } catch { /* tolerate */ }

    const c = await classifySignal(item, feed.source_body);
    if (!c) {
      errors.push(`classify_failed_${feed.source_body}`);
      continue;
    }
    classified++;
    if (c.confidence < 0.3) continue; // skip non-property signals

    try {
      const { data, error } = await supabase
        .from('regulatory_signals')
        .insert({
          source_body: feed.source_body,
          source_document_url: item.link,
          title: item.title,
          summary: c.summary,
          signal_type: c.signal_type,
          topic_tags: c.topic_tags,
          intent_direction: c.intent_direction,
          confidence: c.confidence,
          estimated_lag_days: c.estimated_lag_days,
          affected_countries: feed.affected_countries,
          raw_excerpt: item.description?.slice(0, 1000) ?? null,
          published_at: item.pub_date,
          classified_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) { errors.push(`insert: ${error.message}`); continue; }
      inserted++;
      const signalId = (data as { id: string }).id;

      // Persist property impacts
      for (const imp of c.property_impacts) {
        try {
          await supabase.from('regulatory_property_impact').insert({
            signal_id: signalId,
            affected_segment: imp.affected_segment,
            estimated_coefficient: imp.estimated_coefficient,
            estimated_lag_days: imp.estimated_lag_days,
            rationale: imp.rationale,
          });
        } catch { /* tolerate */ }
      }

      // Event sourcing
      await recordEvent({
        event_type: 'regulatory.signal_classified',
        aggregate_id: signalId,
        aggregate_type: 'regulatory',
        payload: {
          source_body: feed.source_body,
          title: item.title,
          intent_direction: c.intent_direction,
          confidence: c.confidence,
          impacts: c.property_impacts.length,
        },
        metadata: { source: 'cron/sync-regulatory-signals' },
      });
    } catch (e) {
      errors.push(`persist: ${(e as Error).message}`);
    }
  }

  return { fetched: items.length, classified, inserted, errors };
}

export async function ingestAllRegulatoryFeeds(): Promise<{
  by_feed: Array<{ source: string; fetched: number; classified: number; inserted: number; errors: string[] }>;
  total_inserted: number;
}> {
  const results: Array<{ source: string; fetched: number; classified: number; inserted: number; errors: string[] }> = [];
  let totalInserted = 0;
  for (const feed of FEEDS) {
    const r = await ingestRegulatoryFeed(feed);
    results.push({ source: feed.source_body, ...r });
    totalInserted += r.inserted;
  }
  return { by_feed: results, total_inserted: totalInserted };
}

/* -------------------------------------------------------------------------- */
/* Read-side                                                                   */
/* -------------------------------------------------------------------------- */

export interface RegulatorySignalRow {
  id: string;
  source_body: string;
  source_document_url: string | null;
  title: string;
  summary: string | null;
  signal_type: string;
  topic_tags: string[];
  intent_direction: string | null;
  confidence: number | null;
  estimated_lag_days: number | null;
  affected_countries: string[];
  published_at: string | null;
  ingested_at: string;
}

export interface RegulatoryImpactRow {
  id: string;
  signal_id: string;
  affected_segment: string;
  estimated_coefficient: number;
  estimated_lag_days: number | null;
  rationale: string | null;
}

export async function recentSignals(limit = 50): Promise<RegulatorySignalRow[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('regulatory_signals')
    .select('*')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data as RegulatorySignalRow[]) || [];
}

export async function impactsForSignals(signalIds: string[]): Promise<Map<string, RegulatoryImpactRow[]>> {
  if (!supabase || signalIds.length === 0) return new Map();
  const { data } = await supabase
    .from('regulatory_property_impact')
    .select('*')
    .in('signal_id', signalIds);
  const out = new Map<string, RegulatoryImpactRow[]>();
  for (const r of (data as RegulatoryImpactRow[] | null) ?? []) {
    const list = out.get(r.signal_id) ?? [];
    list.push(r);
    out.set(r.signal_id, list);
  }
  return out;
}

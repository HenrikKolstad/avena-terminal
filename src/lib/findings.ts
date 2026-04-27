/**
 * Findings ledger — append-only record of every action the EU Takeover
 * swarm performs. Counter climbs forever. No deletes.
 *
 * Powers /eu-takeover real-time counters + activity feed.
 */

import { supabase } from './supabase';

export interface Finding {
  agent_id: string;
  agent_name?: string;
  country: string;
  region?: string;
  action: 'ingested' | 'scored' | 'indexed' | 'signed' | 'flagged';
  property_ref?: string;
  score?: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface FindingRow extends Finding {
  id: number;
  recorded_at: string;
}

/** Insert one or many findings. Silent on failure (logging shouldn't break crons). */
export async function logFindings(findings: Finding[]): Promise<{ inserted: number }> {
  if (!supabase || findings.length === 0) return { inserted: 0 };
  try {
    const { error } = await supabase.from('findings').insert(findings);
    if (error) return { inserted: 0 };
    return { inserted: findings.length };
  } catch {
    return { inserted: 0 };
  }
}

/** Total findings ever recorded. The big number that compounds. */
export async function totalFindings(): Promise<number> {
  if (!supabase) return 0;
  try {
    const { count } = await supabase.from('findings').select('*', { count: 'exact', head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Findings recorded in the last `hours` (default 24).
 *
 * Uses count-only HEAD queries per action so we never hit Supabase's
 * default row-payload cap (~1000) which previously caused secondary
 * action types (scored, signed) to underreport when ingested rows
 * dominated the first 1000 returned.
 */
export async function findingsRecent(hours = 24): Promise<{ ingested: number; scored: number; indexed: number; signed: number; total: number }> {
  const empty = { ingested: 0, scored: 0, indexed: 0, signed: 0, total: 0 };
  if (!supabase) return empty;
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  async function countAction(action: string): Promise<number> {
    if (!supabase) return 0;
    try {
      const { count } = await supabase
        .from('findings')
        .select('*', { count: 'exact', head: true })
        .eq('action', action)
        .gte('recorded_at', since);
      return count ?? 0;
    } catch { return 0; }
  }

  async function countTotal(): Promise<number> {
    if (!supabase) return 0;
    try {
      const { count } = await supabase
        .from('findings')
        .select('*', { count: 'exact', head: true })
        .gte('recorded_at', since);
      return count ?? 0;
    } catch { return 0; }
  }

  try {
    const [ingested, scored, indexed, signed, total] = await Promise.all([
      countAction('ingested'),
      countAction('scored'),
      countAction('indexed'),
      countAction('signed'),
      countTotal(),
    ]);
    return { ingested, scored, indexed, signed, total };
  } catch {
    return empty;
  }
}

/** Per-country breakdown of findings in the last `hours`. Uses count-only
 * queries per known country so we don't hit the row-payload cap. */
export async function findingsByCountry(hours = 24): Promise<Record<string, number>> {
  if (!supabase) return {};
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const COUNTRIES = ['Spain', 'Portugal', 'France', 'Italy', 'Greece', 'Sweden', 'Denmark', 'Norway', 'Finland', 'Germany', 'Netherlands'];
  const out: Record<string, number> = {};
  await Promise.all(
    COUNTRIES.map(async (c) => {
      if (!supabase) return;
      try {
        const { count } = await supabase
          .from('findings')
          .select('*', { count: 'exact', head: true })
          .eq('country', c)
          .gte('recorded_at', since);
        if (count && count > 0) out[c] = count;
      } catch { /* skip */ }
    })
  );
  return out;
}

/** Latest N findings for the live activity feed. */
export async function findingsLatest(limit = 30): Promise<FindingRow[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('findings')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as FindingRow[];
  } catch {
    return [];
  }
}

/** Per-agent count in the last `hours`. Uses parallel count-only queries
 * per known agent ID so we bypass the row-payload cap. */
export async function findingsByAgent(hours = 24): Promise<Record<string, number>> {
  if (!supabase) return {};
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  // Import statically would create a cycle — agents config is small enough
  // to inline the known IDs here. Keep in sync with _agents.ts.
  const AGENT_IDS = [
    'iberia', 'costa-blanca', 'costa-del-sol', 'costa-calida', 'balearics',
    'catalunya', 'galicia', 'algarve', 'lisboa', 'porto', 'madeira',
    'cote-dazur', 'paris-metro', 'riviera', 'milano', 'toscana', 'puglia',
    'aegean', 'kreta', 'borealis', 'kobenhavn',
  ];
  const out: Record<string, number> = {};
  await Promise.all(
    AGENT_IDS.map(async (id) => {
      if (!supabase) return;
      try {
        const { count } = await supabase
          .from('findings')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', id)
          .gte('recorded_at', since);
        if (count && count > 0) out[id] = count;
      } catch { /* skip */ }
    })
  );
  return out;
}

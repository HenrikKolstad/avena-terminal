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

/** Findings recorded in the last `hours` (default 24). */
export async function findingsRecent(hours = 24): Promise<{ ingested: number; scored: number; indexed: number; signed: number; total: number }> {
  if (!supabase) return { ingested: 0, scored: 0, indexed: 0, signed: 0, total: 0 };
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  try {
    const { data } = await supabase
      .from('findings')
      .select('action')
      .gte('recorded_at', since)
      .limit(50000);
    const out = { ingested: 0, scored: 0, indexed: 0, signed: 0, total: 0 };
    for (const r of data ?? []) {
      out.total++;
      const a = r.action as keyof typeof out;
      if (a in out && a !== 'total') (out[a] as number)++;
    }
    return out;
  } catch {
    return { ingested: 0, scored: 0, indexed: 0, signed: 0, total: 0 };
  }
}

/** Per-country breakdown of findings in the last `hours`. */
export async function findingsByCountry(hours = 24): Promise<Record<string, number>> {
  if (!supabase) return {};
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  try {
    const { data } = await supabase
      .from('findings')
      .select('country')
      .gte('recorded_at', since)
      .limit(50000);
    const out: Record<string, number> = {};
    for (const r of data ?? []) {
      out[r.country as string] = (out[r.country as string] ?? 0) + 1;
    }
    return out;
  } catch {
    return {};
  }
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

/** Per-agent count in the last `hours`. */
export async function findingsByAgent(hours = 24): Promise<Record<string, number>> {
  if (!supabase) return {};
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  try {
    const { data } = await supabase
      .from('findings')
      .select('agent_id')
      .gte('recorded_at', since)
      .limit(50000);
    const out: Record<string, number> = {};
    for (const r of data ?? []) {
      out[r.agent_id as string] = (out[r.agent_id as string] ?? 0) + 1;
    }
    return out;
  } catch {
    return {};
  }
}

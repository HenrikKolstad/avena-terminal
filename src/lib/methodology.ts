/**
 * Methodology Audit Trail — Architectural Commitment 3 (manual variant).
 *
 * Read-side helpers for /methodology/evolution. Writes happen via
 * migrations or via the future /admin/methodology UI when Henrik
 * publishes a new revision.
 */

import { supabase } from '@/lib/supabase';

export interface MethodologyVersion {
  version_id: string;
  methodology_name: string;
  semver: string;
  weights: Record<string, unknown>;
  rationale: string;
  derivation_method: string;
  derived_from_version_id: string | null;
  activated_at: string;
  deactivated_at: string | null;
  out_of_sample_accuracy: number | null;
  sample_size: number | null;
  notes: string | null;
}

export async function allMethodologyVersions(): Promise<MethodologyVersion[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('methodology_versions')
    .select('*')
    .order('methodology_name', { ascending: true })
    .order('activated_at', { ascending: false });
  return (data as MethodologyVersion[]) || [];
}

export async function activeMethodologies(): Promise<MethodologyVersion[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('methodology_versions')
    .select('*')
    .is('deactivated_at', null)
    .order('methodology_name', { ascending: true });
  return (data as MethodologyVersion[]) || [];
}

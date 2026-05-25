/**
 * Published Predictions — Day-4 of strategic execution brief.
 *
 * Read-side helpers for /predictions. Distinct from src/lib/predictions.ts
 * which serves the agent-generated daily predictions and /track-record.
 */

import { supabase } from '@/lib/supabase';

export interface PublishedPrediction {
  id: string;
  short_id: string;
  thesis: string;
  target_metric: string;
  target_segment: string;
  baseline_value: number | null;
  predicted_value: number;
  predicted_change_pct: number | null;
  confidence_band: 'low' | 'medium' | 'high';
  methodology_ref: string;
  reasoning: string | null;
  published_at: string;
  target_date: string;
  resolved: boolean;
  resolved_at: string | null;
  actual_value: number | null;
  accuracy_score: number | null;
  resolution_note: string | null;
  display_order: number;
}

export async function allPublishedPredictions(): Promise<PublishedPrediction[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('published_predictions')
    .select('*')
    .order('display_order', { ascending: true });
  return (data as PublishedPrediction[]) || [];
}

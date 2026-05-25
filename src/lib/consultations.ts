import { supabase } from '@/lib/supabase';

export interface EUConsultation {
  id: string;
  short_id: string;
  source_body: string;
  title: string;
  consultation_url: string;
  opens_at: string | null;
  closes_at: string;
  topic_tags: string[];
  status: 'planned' | 'open' | 'closed' | 'responded';
  relevance_score: number | null;
  avena_position: string | null;
  avena_submitted: boolean;
  submission_url: string | null;
  submission_pdf: string | null;
  created_at: string;
}

export async function allConsultations(): Promise<EUConsultation[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('eu_consultations')
    .select('*')
    .order('closes_at', { ascending: true });
  return (data as EUConsultation[]) || [];
}

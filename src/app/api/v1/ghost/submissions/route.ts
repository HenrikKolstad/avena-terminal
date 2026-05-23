/**
 * GET /api/v1/ghost/submissions — sovereign data submission tracker.
 *
 * Reads from `ghost_submissions` table. Until any submission is actually
 * filed, returns empty state with a clear `pipeline` block describing
 * which institutions are wired (via /api/v1/sovereign-export envelopes).
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 21600;

interface GhostRow {
  institution: string;
  format: string | null;
  data_type: string | null;
  status: string | null;
  submission_date: string | null;
  response_status: string | null;
  notes: string | null;
}

/** Institutions for which we have a submission envelope ready in sovereign-export. */
const PIPELINE = [
  { institution: 'ECB Statistical Data Warehouse', format: 'SDMX', envelope_url: '/api/v1/sovereign-export?format=ecb' },
  { institution: 'Eurostat',                       format: 'SDMX/CSV', envelope_url: '/api/v1/sovereign-export?format=eurostat' },
  { institution: 'World Bank Open Data',           format: 'CSV', envelope_url: '/api/v1/sovereign-export?format=worldbank' },
  { institution: 'IMF Data Standards',             format: 'SDMX', envelope_url: '/api/v1/sovereign-export?format=imf' },
];

export async function GET() {
  let submissions: GhostRow[] = [];

  if (supabase) {
    try {
      const { data } = await supabase
        .from('ghost_submissions')
        .select('institution, format, data_type, status, submission_date, response_status, notes')
        .order('submission_date', { ascending: false, nullsFirst: false })
        .limit(50);
      submissions = (data ?? []) as GhostRow[];
    } catch { /* empty */ }
  }

  const accepted = submissions.filter((s) => s.status === 'accepted').length;
  const pending = submissions.filter((s) => s.status === 'pending').length;

  return NextResponse.json({
    agent: 'The Ghost',
    submissions,
    pipeline: PIPELINE,
    summary: {
      total_submissions: submissions.length,
      accepted,
      pending,
      pipeline_envelopes_ready: PIPELINE.length,
    },
    note: submissions.length === 0
      ? 'No filings recorded yet. Submission envelopes ready at /api/v1/sovereign-export — once filed, log to ghost_submissions table.'
      : 'Once accepted by any institution, Avena data enters the permanent global statistical record.',
    source: 'Avena Terminal — The Ghost (ghost_submissions table)',
  });
}

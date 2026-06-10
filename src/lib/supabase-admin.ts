import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the service-role key.
 *
 * WHY THIS EXISTS: every cron-written table created in the May-2026
 * architectural sprint (events, regulatory_signals, system_limitations,
 * integrity_fingerprints, integrity_daily_roots, score_confidence,
 * property_credentials, citation_monitoring, citation_measurements)
 * ships with SELECT-only RLS policies. The anon client in
 * src/lib/supabase.ts therefore gets every INSERT/UPDATE silently
 * rejected — which is exactly why two weeks of nightly crons produced
 * zero rows. The service-role key bypasses RLS, which is the correct
 * posture for server-side pipeline writes.
 *
 * Falls back to the anon client config when the service key is absent
 * (local dev, preview builds) so imports never crash — writes just
 * degrade to the old behaviour.
 *
 * NEVER import this from a 'use client' component.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const supabaseAdmin = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

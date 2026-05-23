/**
 * Admin partner-management endpoints.
 *
 *   GET  /api/admin/partners            → list applications by status
 *   POST /api/admin/partners/approve    → approve + mint API key + email
 *   POST /api/admin/partners/reject     → reject + email
 *
 * Authenticated via the same ADMIN_TOKEN bearer used by other /api/admin routes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
}

function checkAdmin(req: NextRequest): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const got = req.headers.get('authorization');
  return got === `Bearer ${expected}`;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return unauthorized();
  if (!supabase) return NextResponse.json({ ok: false, error: 'database_unavailable' }, { status: 503 });

  const status = req.nextUrl.searchParams.get('status') ?? 'pending';
  const { data, error } = await supabase
    .from('federated_partners')
    .select('id, name, contact_email, country_codes, data_types, estimated_volume, status, approved_at, created_at, api_key')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, applications: data ?? [], count: (data ?? []).length });
}

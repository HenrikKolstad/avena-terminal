/**
 * GET /api/admin/db-audit — brutal database inventory (2026-07-27).
 * Cron-auth protected. Discovers every table via the PostgREST OpenAPI
 * root, then per table: exact row count, date-column ranges, rows in
 * the last 7 days, and targeted non-null audits for the tables Henrik
 * cares about. No optimism — raw numbers only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function pg(path: string, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(`${URL_()}/rest/v1/${path}`, {
    headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}`, ...extraHeaders },
    cache: 'no-store',
  });
  return res;
}

async function count(table: string, filter = ''): Promise<number | string> {
  try {
    const res = await pg(`${table}?select=*${filter}`, { Prefer: 'count=exact', Range: '0-0' });
    const cr = res.headers.get('content-range');
    if (!cr) return `err ${res.status}`;
    return Number(cr.split('/')[1]);
  } catch (e) { return `err ${e instanceof Error ? e.message.slice(0, 40) : '?'}`; }
}

async function edgeValue(table: string, col: string, asc: boolean): Promise<string | null> {
  try {
    const res = await pg(`${table}?select=${col}&${col}=not.is.null&order=${col}.${asc ? 'asc' : 'desc'}&limit=1`);
    if (!res.ok) return null;
    const j = await res.json();
    return j[0]?.[col] ?? null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'no service key in env' }, { status: 500 });

  // 1. Table list from OpenAPI root
  const rootRes = await pg('');
  const spec = await rootRes.json();
  const defs: Record<string, { properties?: Record<string, { format?: string }> }> = spec.definitions ?? {};
  const tables = Object.keys(defs).sort();

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const out: Record<string, unknown> = {};

  for (const t of tables) {
    const props = defs[t].properties ?? {};
    const dateCols = Object.entries(props)
      .filter(([n, p]) => (p.format ?? '').includes('timestamp') || (p.format ?? '') === 'date' || /(_at|_date|^date$)/.test(n))
      .map(([n]) => n);
    const dateCol = dateCols.includes('created_at') ? 'created_at' : dateCols[0];

    const row: Record<string, unknown> = { rows: await count(t) };
    if (dateCol && typeof row.rows === 'number' && row.rows > 0) {
      row.date_col = dateCol;
      row.min = await edgeValue(t, dateCol, true);
      row.max = await edgeValue(t, dateCol, false);
      row.last_7d = await count(t, `&${dateCol}=gte.${sevenDaysAgo}`);
    }
    out[t] = row;
  }

  // 2. Targeted non-null audits where the tables exist
  const targeted: Record<string, unknown> = {};
  for (const [t, cols] of Object.entries({
    properties: ['price', 'score', 'yield'],
    listings: ['price', 'score', 'yield'],
    transactions: ['sold_price'],
    prediction_outcomes: ['actual_value'],
  })) {
    if (!tables.includes(t)) { targeted[t] = 'TABLE DOES NOT EXIST'; continue; }
    const cells: Record<string, number | string> = { total: await count(t) };
    for (const c of cols) {
      const colExists = Object.keys(defs[t].properties ?? {}).includes(c);
      cells[`${c}_non_null`] = colExists ? await count(t, `&${c}=not.is.null`) : 'COLUMN DOES NOT EXIST';
    }
    targeted[t] = cells;
  }

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    table_count: tables.length,
    tables: out,
    targeted,
    note_db_size: 'Not obtainable via PostgREST. Run in Supabase SQL editor: select pg_size_pretty(pg_database_size(current_database()));',
  });
}

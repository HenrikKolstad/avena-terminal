/**
 * Agent Mentat — Terminal command health watcher.
 *
 * Every 6h, exercises each terminal-v2 command's backing endpoint and logs
 * success/failure so the /swarm page shows which commands are actually
 * working and broken ones get flagged loud.
 *
 * Schedule: 4x daily (02:15, 08:15, 14:15, 20:15 UTC) via vercel.json.
 */

import { NextRequest, NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface CheckResult {
  command: string;
  endpoint: string;
  ok: boolean;
  status: number | null;
  duration_ms: number;
  error?: string;
}

const CHECKS: Array<{ command: string; endpoint: string }> = [
  { command: 'APCI',  endpoint: '/api/v1/apci' },
  { command: 'PRED',  endpoint: '/api/predictions?status=active&limit=1' },
  { command: 'AVN',   endpoint: '/api/v1/avn/AVN:ES-03185-NB-0421' },
  { command: 'BUBL',  endpoint: '/api/v1/bubble-scanner?city=munich' },
];

async function ping(base: string, endpoint: string): Promise<CheckResult> {
  const url = base + endpoint;
  const start = Date.now();
  try {
    const r = await fetch(url, { cache: 'no-store' });
    return {
      command: endpoint,
      endpoint,
      ok: r.ok,
      status: r.status,
      duration_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      command: endpoint,
      endpoint,
      ok: false,
      status: null,
      duration_ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function GET(req: NextRequest) {
  const log = await startCronLog('mentat', '/api/cron/mentat');

  const base =
    req.headers.get('x-forwarded-proto') && req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('x-forwarded-host')}`
      : (process.env.NEXT_PUBLIC_SITE_URL || 'https://avenaterminal.com');

  const results: CheckResult[] = [];
  for (const c of CHECKS) {
    const r = await ping(base, c.endpoint);
    r.command = c.command;
    results.push(r);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  // Persist a lightweight health record so UI can query "is APCI working?"
  if (supabase) {
    try {
      await supabase.from('command_health').insert(
        results.map((r) => ({
          command: r.command,
          endpoint: r.endpoint,
          ok: r.ok,
          status: r.status,
          duration_ms: r.duration_ms,
          error: r.error ?? null,
        }))
      );
    } catch {
      /* optional table — silent */
    }
  }

  await finishCronLog(log, failed.length === 0 ? 'success' : 'error', {
    checked: results.length,
    passed,
    failed: failed.length,
    broken_commands: failed.map((f) => f.command),
  });

  return NextResponse.json({
    agent: 'mentat',
    checked: results.length,
    passed,
    failed: failed.length,
    results,
  });
}

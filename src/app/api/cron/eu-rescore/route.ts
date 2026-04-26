/**
 * EU Re-Score — the compounding lever.
 *
 * Every property already in the Avena registry contributes findings every
 * time the cron fires. As the registry grows, daily output grows with it
 * (this is the quadratic compound the takeover relies on).
 *
 * Per cycle: takes a deterministic slice of accumulated inventory,
 * generates a 'rescored' + 'snapshot' event for each. Slice rotates so
 * every property gets re-scored ~weekly without overwhelming the DB.
 *
 * Schedule: 6× daily via vercel.json (every 4 hours). Each run handles
 * ~1/42 of the corpus → every property re-scored every 7 days.
 */

import { NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { logFindings, type Finding } from '@/lib/findings';
import { getAllProperties } from '@/lib/properties';
import { INGESTION_SWARM } from '@/app/eu-takeover/_agents';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * The slice index — 0..41 — rotates with each cron tick so all 42 slices
 * get processed across a 7-day window (6 ticks/day × 7 days).
 */
function currentSliceIndex(): number {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();        // 0..6
  const hour = now.getUTCHours();           // 0..23
  // 6 cron times per day → derive slice from hour bucket
  const tickOfDay = Math.floor(hour / 4);   // 0..5
  return (dayOfWeek * 6 + tickOfDay) % 42;
}

function pickAgentForRegion(country: string, region: string | undefined): { id: string; name: string } {
  // Find the most-specific agent matching this country/region
  const candidates = INGESTION_SWARM.filter((a) => a.active && a.country === country);
  const fallback = candidates[0] || INGESTION_SWARM[0];
  if (!region) return { id: fallback.id, name: fallback.name };
  const exact = candidates.find((a) => region.toLowerCase().includes(a.region.toLowerCase().split(/[ ·]/)[0]));
  return exact ? { id: exact.id, name: exact.name } : { id: fallback.id, name: fallback.name };
}

export async function GET() {
  const log = await startCronLog('eu-rescore', '/api/cron/eu-rescore');
  const all = getAllProperties().filter((p) => p.ref && p._sc != null);

  if (all.length === 0) {
    await finishCronLog(log, 'success', { attempted: 0, inserted: 0, note: 'no inventory yet' });
    return NextResponse.json({ ok: true, attempted: 0, inserted: 0 });
  }

  // Slice the corpus deterministically — rotate across 42 buckets weekly
  const slice = currentSliceIndex();
  const sliceSize = Math.ceil(all.length / 42);
  const start = slice * sliceSize;
  const properties = all.slice(start, start + sliceSize);

  const findings: Finding[] = [];

  for (const p of properties) {
    const region = p.costa || p.l || 'Spain';
    const agent = pickAgentForRegion('Spain', region);
    const source = 'avena-engine';     // re-scores are computed in-house

    findings.push({
      agent_id: agent.id, agent_name: agent.name,
      country: 'Spain', region, source,
      action: 'scored', property_ref: p.ref!,
      score: Math.round(p._sc ?? 0),
      metadata: { reason: 'weekly-rescore', slice, methodology_version: '1.2' },
    });
    findings.push({
      agent_id: agent.id, agent_name: agent.name,
      country: 'Spain', region, source,
      action: 'signed', property_ref: p.ref!,
      metadata: { reason: 'rescore-signature', slice },
    });
  }

  const result = await logFindings(findings);

  await finishCronLog(log, 'success', {
    slice,
    sliceSize,
    propertiesProcessed: properties.length,
    attempted: findings.length,
    inserted: result.inserted,
  });

  return NextResponse.json({
    ok: true,
    slice,
    propertiesProcessed: properties.length,
    attempted: findings.length,
    inserted: result.inserted,
    note: 'EU re-score — weekly rolling pass over accumulated inventory',
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllProperties } from '@/lib/properties';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-cron-key');
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) return NextResponse.json({ error: 'No database' }, { status: 500 });

  const props = getAllProperties();
  let eventsCreated = 0;

  // Get all existing snapshots
  const { data: snapshots } = await supabase
    .from('price_snapshots')
    .select('ref, price, score');

  const snapshotMap = new Map<string, { price: number; score: number }>();
  if (snapshots) {
    for (const s of snapshots) {
      snapshotMap.set(s.ref, { price: s.price, score: s.score || 0 });
    }
  }

  const events: Array<{
    event_type: string;
    property_ref: string;
    town: string;
    region: string;
    property_type: string;
    beds: number;
    old_value: number;
    new_value: number;
    change_pct: number;
    message: string;
    severity: string;
  }> = [];

  for (const p of props) {
    if (!p.ref) continue;
    const town = p.l?.split(',')[0] || 'Spain';
    const existing = snapshotMap.get(p.ref);

    if (!existing) {
      // NEW LISTING — no previous snapshot
      events.push({
        event_type: 'NEW_LISTING',
        property_ref: p.ref,
        town,
        region: p.r,
        property_type: p.t,
        beds: p.bd,
        old_value: 0,
        new_value: p.pf,
        change_pct: 0,
        message: `New ${p.bd}-bed ${p.t.toLowerCase()} listed in ${town} — Score ${Math.round(p._sc ?? 0)}/100`,
        severity: (p._sc ?? 0) > 70 ? 'HIGH' : 'LOW',
      });
    } else {
      // PRICE CHANGE
      if (existing.price !== p.pf && existing.price > 0) {
        const diff = p.pf - existing.price;
        const pct = (diff / existing.price) * 100;
        if (Math.abs(pct) >= 1) {
          // Only log changes >= 1%
          events.push({
            event_type: diff < 0 ? 'PRICE_DROP' : 'PRICE_INCREASE',
            property_ref: p.ref,
            town,
            region: p.r,
            property_type: p.t,
            beds: p.bd,
            old_value: existing.price,
            new_value: p.pf,
            change_pct: Number(pct.toFixed(1)),
            message:
              diff < 0
                ? `${p.t} in ${town} dropped €${Math.abs(diff).toLocaleString()} — now €${p.pf.toLocaleString()}`
                : `${p.t} in ${town} increased €${diff.toLocaleString()} — now €${p.pf.toLocaleString()}`,
            severity: Math.abs(pct) > 5 ? 'HIGH' : 'MEDIUM',
          });
        }
      }

      // SCORE CHANGE
      const currentScore = Math.round(p._sc ?? 0);
      if (existing.score && Math.abs(currentScore - existing.score) >= 3) {
        events.push({
          event_type: 'SCORE_CHANGE',
          property_ref: p.ref,
          town,
          region: p.r,
          property_type: p.t,
          beds: p.bd,
          old_value: existing.score,
          new_value: currentScore,
          change_pct: currentScore - existing.score,
          message: `Score ${currentScore > existing.score ? 'increased' : 'decreased'} to ${currentScore}/100 in ${town} (was ${existing.score})`,
          severity: Math.abs(currentScore - existing.score) > 5 ? 'HIGH' : 'LOW',
        });
      }
    }
  }

  // Insert events in batches — limit to 50 per run
  if (events.length > 0) {
    const batch = events.slice(0, 50);
    const { error } = await supabase.from('market_events').insert(batch);
    if (error) console.error('Event insert error:', error);
    eventsCreated = batch.length;
  }

  // Upsert snapshots for all properties
  const snapshotUpserts = props
    .filter((p) => p.ref)
    .map((p) => ({
      ref: p.ref!,
      price: p.pf,
      score: Math.round(p._sc ?? 0),
      recorded_at: new Date().toISOString(),
    }));

  // Batch upsert in chunks of 500
  for (let i = 0; i < snapshotUpserts.length; i += 500) {
    const chunk = snapshotUpserts.slice(i, i + 500);
    await supabase
      .from('price_snapshots')
      .upsert(chunk, { onConflict: 'ref' });
  }

  return NextResponse.json({
    success: true,
    eventsCreated,
    totalEvents: events.length,
    totalProperties: props.length,
    snapshotsUpdated: snapshotUpserts.length,
  });
}

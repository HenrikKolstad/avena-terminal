import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DROP_THRESHOLD_PCT = 2; // trigger when price drops >= 2%
const APP_URL = 'https://avena-estate.com';

async function sendEmailViaResend(
  to: string,
  propertyName: string,
  oldPrice: number,
  newPrice: number,
  dropPct: number
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[check-price-drops] RESEND_API_KEY not set — skipping email to ${to}`);
    return false;
  }

  const subject = `📉 Price drop: ${propertyName} — now €${newPrice.toLocaleString()}`;
  const body = `
    <p>The property you're tracking has dropped from €${oldPrice.toLocaleString()} to €${newPrice.toLocaleString()} (${dropPct.toFixed(1)}% drop).</p>
    <p>View it at: <a href="${APP_URL}">${APP_URL}</a></p>
  `.trim();

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Avena Terminal <alerts@avena-estate.com>',
        to: [to],
        subject,
        html: `<!DOCTYPE html><html><body>${body}</body></html>`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[check-price-drops] Resend error for ${to}:`, errText);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[check-price-drops] Failed to send email to ${to}:`, err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const incomingSecret = req.headers.get('x-cron-secret');
    if (incomingSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // 1. Fetch all active price alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('active', true);

    if (alertsError) {
      console.error('[check-price-drops] Failed to fetch alerts:', alertsError);
      return NextResponse.json({ error: alertsError.message }, { status: 500 });
    }

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ checked: 0, triggered: 0, emails_sent: 0 });
    }

    // Collect all unique property refs
    const propertyRefs = [...new Set(alerts.map((a: Record<string, unknown>) => a.property_ref as string))];

    // 2. Fetch the last 2 snapshots for each property ref
    // We fetch all at once and group in memory
    const { data: snapshots, error: snapError } = await supabase
      .from('price_snapshots')
      .select('property_ref, price_from, snapshot_date')
      .in('property_ref', propertyRefs)
      .order('snapshot_date', { ascending: false });

    if (snapError) {
      console.error('[check-price-drops] Failed to fetch snapshots:', snapError);
      return NextResponse.json({ error: snapError.message }, { status: 500 });
    }

    // Group last 2 snapshots per property_ref
    const snapshotsByRef: Record<string, Array<{ price_from: number; snapshot_date: string }>> = {};
    for (const snap of snapshots || []) {
      const ref = snap.property_ref as string;
      if (!snapshotsByRef[ref]) snapshotsByRef[ref] = [];
      if (snapshotsByRef[ref].length < 2) {
        snapshotsByRef[ref].push({ price_from: snap.price_from, snapshot_date: snap.snapshot_date });
      }
    }

    let triggered = 0;
    let emailsSent = 0;

    // 3. For each alert, check for a price drop
    for (const alert of alerts as Array<Record<string, unknown>>) {
      const ref = alert.property_ref as string;
      const snaps = snapshotsByRef[ref];

      if (!snaps || snaps.length < 2) continue;

      const [latest, previous] = snaps; // sorted desc, so [0]=latest, [1]=previous
      const oldPrice = previous.price_from as number;
      const newPrice = latest.price_from as number;

      if (!oldPrice || !newPrice || newPrice >= oldPrice) continue;

      const dropPct = ((oldPrice - newPrice) / oldPrice) * 100;
      if (dropPct < DROP_THRESHOLD_PCT) continue;

      // Check alert_price threshold if set: only trigger if new price is below alert_price
      const alertPrice = alert.alert_price as number | null;
      if (alertPrice !== null && newPrice > alertPrice) continue;

      // Check we haven't already sent a notification for this exact drop
      // (same alert, same snapshot_date as latest)
      const { data: existingNotif } = await supabase
        .from('alert_notifications')
        .select('id')
        .eq('alert_id', alert.id as string)
        .eq('new_price', newPrice)
        .eq('old_price', oldPrice)
        .maybeSingle();

      if (existingNotif) continue; // already notified for this drop

      triggered++;

      const propertyName = (alert.property_name as string) || ref;
      const userEmail = alert.user_email as string;

      // 4. Log to alert_notifications
      const { error: notifError } = await supabase
        .from('alert_notifications')
        .insert({
          alert_id: alert.id,
          old_price: oldPrice,
          new_price: newPrice,
          drop_pct: parseFloat(dropPct.toFixed(2)),
        });

      if (notifError) {
        console.error('[check-price-drops] Failed to log notification:', notifError);
      }

      // Update last_triggered_at on the alert
      await supabase
        .from('price_alerts')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', alert.id as string);

      // 5. Send email via Resend
      const sent = await sendEmailViaResend(userEmail, propertyName, oldPrice, newPrice, dropPct);
      if (sent) emailsSent++;
    }

    const summary = { checked: alerts.length, triggered, emails_sent: emailsSent };
    console.log('[check-price-drops] Summary:', summary);
    return NextResponse.json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[check-price-drops] Unexpected error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Allow GET for manual testing (no secret required in dev)
export async function GET(req: NextRequest) {
  return POST(req);
}

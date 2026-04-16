import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = 'https://avenaterminal.com';
const FROM_ADDRESS = 'Avena Terminal <alerts@avenaterminal.com>';

interface AlertFilters {
  maxPrice?: number;
  minYield?: number;
  region?: string;
  town?: string;
  maxPricePerM2?: number;
}

interface DealAlert {
  id: string;
  email: string;
  filters: AlertFilters;
  frequency: string;
  active: boolean;
  created_at: string;
  last_sent_at: string | null;
}

interface Property {
  ref: string;
  p: string;   // project name
  l: string;   // location
  r: string;   // region code
  pf: number;  // price from
  pm2?: number; // price per m2
  _sc?: number; // score
  _yield?: { gross: number };
  updated_at?: string;
  created_at?: string;
}

function buildEmailHtml(
  email: string,
  properties: Property[],
  alertId: string
): string {
  const unsubscribeToken = Buffer.from(email).toString('base64');
  const unsubscribeUrl = `${APP_URL}/api/deal-alerts/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

  const propertyRows = properties
    .map((prop) => {
      const ref = prop.ref || '';
      const name = prop.p || 'Property';
      const location = prop.l || '';
      const price = prop.pf ? `€${prop.pf.toLocaleString('en-IE')}` : '—';
      const yieldVal = prop._yield?.gross ? `${prop._yield.gross.toFixed(1)}%` : '—';
      const score = prop._sc ? `${Math.round(prop._sc)}/100` : '—';
      const priceM2 = prop.pm2 ? `€${prop.pm2.toLocaleString('en-IE')}/m²` : '—';
      const link = `${APP_URL}/?ref=${encodeURIComponent(ref)}`;

      return `
        <tr>
          <td style="padding:12px 8px;border-bottom:1px solid #1e1e2e;">
            <a href="${link}" style="color:#c9a84c;text-decoration:none;font-weight:600;font-size:14px;">${name}</a>
            <div style="color:#888;font-size:12px;margin-top:2px;">${location}</div>
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #1e1e2e;color:#e8e8f0;font-size:14px;white-space:nowrap;">${price}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #1e1e2e;color:#34d399;font-size:14px;">${yieldVal}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #1e1e2e;font-size:14px;">
            <span style="background:#c9a84c22;color:#c9a84c;padding:2px 8px;border-radius:4px;font-weight:600;">${score}</span>
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #1e1e2e;color:#888;font-size:12px;">${priceM2}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New deals matched your alert — Avena Terminal</title>
</head>
<body style="margin:0;padding:0;background:#0d0d14;font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;">
              <div style="border-left:3px solid #c9a84c;padding-left:16px;">
                <div style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">Avena Terminal</div>
                <div style="color:#e8e8f0;font-size:22px;font-weight:700;">Deal Alert</div>
                <div style="color:#666;font-size:12px;margin-top:4px;">New properties matching your criteria</div>
              </div>
            </td>
          </tr>

          <!-- Stats bar -->
          <tr>
            <td style="padding-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#13131f;border:1px solid #1e1e2e;border-radius:8px;padding:16px 20px;">
                    <span style="color:#c9a84c;font-size:24px;font-weight:700;">${properties.length}</span>
                    <span style="color:#888;font-size:13px;margin-left:8px;">
                      ${properties.length === 1 ? 'property matches' : 'properties match'} your alert
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Properties table -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#13131f;border:1px solid #1e1e2e;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#0d0d14;">
                    <th style="padding:10px 8px;text-align:left;color:#c9a84c;font-size:11px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #1e1e2e;">Property</th>
                    <th style="padding:10px 8px;text-align:left;color:#c9a84c;font-size:11px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #1e1e2e;">Price</th>
                    <th style="padding:10px 8px;text-align:left;color:#c9a84c;font-size:11px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #1e1e2e;">Yield</th>
                    <th style="padding:10px 8px;text-align:left;color:#c9a84c;font-size:11px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #1e1e2e;">Score</th>
                    <th style="padding:10px 8px;text-align:left;color:#c9a84c;font-size:11px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #1e1e2e;">Price/m²</th>
                  </tr>
                </thead>
                <tbody>
                  ${propertyRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:24px 0;">
              <a href="${APP_URL}" style="display:inline-block;background:#c9a84c;color:#0d0d14;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:1px;text-transform:uppercase;">
                View All Deals →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;border-top:1px solid #1e1e2e;">
              <p style="color:#444;font-size:11px;margin:0 0 8px;">
                You're receiving this because you set a deal alert at avenaterminal.com.
              </p>
              <p style="color:#444;font-size:11px;margin:0;">
                <a href="${unsubscribeUrl}" style="color:#666;text-decoration:underline;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}" style="color:#666;text-decoration:underline;">avenaterminal.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function propertiesMatchFilters(properties: Property[], filters: AlertFilters): Property[] {
  return properties.filter((prop) => {
    if (filters.maxPrice && prop.pf > filters.maxPrice) return false;
    if (filters.maxPricePerM2 && prop.pm2 && prop.pm2 > filters.maxPricePerM2) return false;
    if (filters.minYield && prop._yield?.gross && prop._yield.gross < filters.minYield) return false;
    if (filters.region) {
      const region = filters.region.toLowerCase();
      if (
        !prop.r?.toLowerCase().includes(region) &&
        !prop.l?.toLowerCase().includes(region)
      ) {
        return false;
      }
    }
    if (filters.town) {
      const town = filters.town.toLowerCase();
      if (!prop.l?.toLowerCase().includes(town)) return false;
    }
    return true;
  });
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('[deal-alerts/check] CRON_SECRET not set — endpoint is unprotected');
  } else {
    const incomingKey = req.headers.get('x-cron-key');
    if (incomingKey !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // 1. Fetch all active deal alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('deal_alerts')
      .select('*')
      .eq('active', true);

    if (alertsError) {
      console.error('[deal-alerts/check] Failed to fetch alerts:', alertsError);
      return NextResponse.json({ error: alertsError.message }, { status: 500 });
    }

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ checked: 0, emails_sent: 0 });
    }

    // 2. Fetch properties added or updated in the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentProperties, error: propsError } = await supabase
      .from('properties')
      .select('ref, p, l, r, pf, pm2, _sc, _yield, updated_at, created_at')
      .or(`created_at.gte.${since},updated_at.gte.${since}`);

    if (propsError) {
      console.error('[deal-alerts/check] Failed to fetch properties:', propsError);
      return NextResponse.json({ error: propsError.message }, { status: 500 });
    }

    const properties = (recentProperties || []) as Property[];

    if (properties.length === 0) {
      console.log('[deal-alerts/check] No new/updated properties in last 24h');
      return NextResponse.json({ checked: alerts.length, emails_sent: 0, new_properties: 0 });
    }

    let emailsSent = 0;
    const now = new Date().toISOString();

    // 3. For each alert, find matching properties and send email
    for (const alert of alerts as DealAlert[]) {
      try {
        const matched = propertiesMatchFilters(properties, alert.filters || {});

        if (matched.length === 0) continue;

        // For daily alerts, skip if already sent today
        if (alert.frequency === 'daily' && alert.last_sent_at) {
          const lastSent = new Date(alert.last_sent_at);
          const hoursSinceLastSent = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastSent < 20) {
            continue;
          }
        }

        const subject =
          matched.length === 1
            ? `New deal: ${matched[0].p} — Avena Terminal`
            : `${matched.length} new deals matching your alert — Avena Terminal`;

        const html = buildEmailHtml(alert.email, matched, alert.id);

        const { error: emailError } = await resend.emails.send({
          from: FROM_ADDRESS,
          to: [alert.email],
          subject,
          html,
        });

        if (emailError) {
          console.error(`[deal-alerts/check] Failed to send email to ${alert.email}:`, emailError);
          continue;
        }

        // Update last_sent_at
        const { error: updateError } = await supabase
          .from('deal_alerts')
          .update({ last_sent_at: now })
          .eq('id', alert.id);

        if (updateError) {
          console.error(`[deal-alerts/check] Failed to update last_sent_at for alert ${alert.id}:`, updateError);
        }

        emailsSent++;
      } catch (alertErr: unknown) {
        const msg = alertErr instanceof Error ? alertErr.message : String(alertErr);
        console.error(`[deal-alerts/check] Error processing alert ${alert.id}:`, msg);
      }
    }

    const summary = {
      checked: alerts.length,
      new_properties: properties.length,
      emails_sent: emailsSent,
    };

    console.log('[deal-alerts/check] Summary:', summary);
    return NextResponse.json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[deal-alerts/check] Unexpected error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

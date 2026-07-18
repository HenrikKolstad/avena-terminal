import { Resend } from 'resend';

const FROM = 'Avena Terminal <hello@avenaterminal.com>';
const REPLY_TO = 'henrik@xaviaestate.com';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

/**
 * Welcome email for new PRO subscribers.
 * Fires from Stripe webhook on checkout.session.completed.
 * Silently no-ops if RESEND_API_KEY is missing — never blocks webhook.
 */
export async function sendWelcomeEmail(email: string): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) return { sent: false, error: 'RESEND_API_KEY missing' };

  const loginUrl = 'https://avenaterminal.com/login';
  const yieldUrl = 'https://avenaterminal.com/yield';
  const oracleUrl = 'https://avenaterminal.com/chat';
  const contactUrl = 'https://avenaterminal.com/contact';

  const subject = 'Welcome to Avena PRO — your terminal is unlocked';

  const html = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#1D1815;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F4EFE8;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#1D1815;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:#26201C;border:1px solid #3B3530;border-radius:4px;overflow:hidden;">
        <!-- Gold top bar -->
        <tr><td style="background:linear-gradient(90deg,#F5A623,#E07A1F);height:4px;"></td></tr>

        <!-- Header -->
        <tr><td style="padding:40px 40px 24px;text-align:center;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:300;line-height:1.1;color:#F4EFE8;margin-bottom:8px;">
            Welcome to <em style="color:#F5A623;font-style:italic;">Avena PRO</em>.
          </div>
          <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#F5A623;">
            Payment confirmed · Access active
          </div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:0 40px 24px;">
          <p style="font-size:15px;line-height:1.6;color:#C9C0B6;margin:0 0 16px;">
            Your subscription is live. Every locked property, yield analysis, alpha signal, and Oracle conversation is now yours.
          </p>
          <p style="font-size:15px;line-height:1.6;color:#C9C0B6;margin:0;">
            Sign in with this email address — no password needed:
          </p>
        </td></tr>

        <!-- Primary CTA -->
        <tr><td style="padding:0 40px 32px;" align="center">
          <a href="${loginUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#F5A623,#E07A1F);color:#1D1815;font-family:'Courier New',monospace;font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;text-decoration:none;border-radius:4px;">
            Sign in to Avena →
          </a>
        </td></tr>

        <!-- Three shortcuts -->
        <tr><td style="padding:0 40px 32px;">
          <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#F5A623;padding-bottom:12px;border-bottom:1px solid #3B3530;margin-bottom:16px;">
            Three places to start
          </div>

          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="padding:10px 0;border-bottom:1px solid #2F2924;">
              <a href="${yieldUrl}" style="color:#F4EFE8;text-decoration:none;">
                <div style="font-family:Georgia,serif;font-size:16px;margin-bottom:2px;">Yield Analyzer →</div>
                <div style="font-size:12px;color:#8B827A;">Airbnb-matched rental yields for every property. Mortgage + cashflow calculator built in.</div>
              </a>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #2F2924;">
              <a href="${oracleUrl}" style="color:#F4EFE8;text-decoration:none;">
                <div style="font-family:Georgia,serif;font-size:16px;margin-bottom:2px;">Ask the Oracle →</div>
                <div style="font-size:12px;color:#8B827A;">Unlimited AI queries. 10 analytical tools. Ask anything about Spanish property.</div>
              </a>
            </td></tr>
            <tr><td style="padding:10px 0;">
              <a href="https://avenaterminal.com/#deals" style="color:#F4EFE8;text-decoration:none;">
                <div style="font-family:Georgia,serif;font-size:16px;margin-bottom:2px;">Full deal feed →</div>
                <div style="font-size:12px;color:#8B827A;">1,881 scored new builds. No blur. Sort by score, yield, discount, or region.</div>
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Support -->
        <tr><td style="padding:0 40px 32px;">
          <div style="background:#1D1815;border:1px solid #3B3530;border-radius:4px;padding:16px;">
            <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#8B827A;margin-bottom:8px;">
              Need help?
            </div>
            <div style="font-size:13px;color:#C9C0B6;line-height:1.5;">
              Reply to this email or message us at <a href="${contactUrl}" style="color:#F5A623;text-decoration:none;">avenaterminal.com/contact</a>. Most replies within a few hours, always within 24.
            </div>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px 32px;border-top:1px solid #3B3530;text-align:center;">
          <div style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#6B625A;">
            Avena Terminal · €79/mo · Cancel anytime
          </div>
          <div style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#6B625A;margin-top:4px;">
            Manage billing via Stripe link in your receipt
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();

  const text = [
    'Welcome to Avena PRO.',
    '',
    'Payment confirmed — your subscription is live.',
    '',
    `Sign in (no password): ${loginUrl}`,
    '',
    'THREE PLACES TO START',
    `→ Yield Analyzer: ${yieldUrl}`,
    `  Airbnb-matched yields + mortgage calculator for every property.`,
    '',
    `→ Ask the Oracle: ${oracleUrl}`,
    `  Unlimited AI queries. 10 analytical tools.`,
    '',
    `→ Full deal feed: https://avenaterminal.com/#deals`,
    `  1,881 scored new builds. No blur. Sort by score, yield, discount.`,
    '',
    `Need help? Reply to this email or ${contactUrl}.`,
    '',
    'Avena Terminal · €79/mo · Cancel anytime',
  ].join('\n');

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true, error: data?.id };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Enquiry pipeline (2026-07-02) — the money wire.
 * Every buyer enquiry must reach the selling agent within seconds.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Send with sender-fallback: if the branded from-address fails (typically an
 * unverified domain in Resend), retry once from Resend's always-verified
 * onboarding sender. A lead alert from a fallback address beats no alert.
 */
async function sendWithFallback(
  resend: Resend,
  args: { to: string; replyTo: string; subject: string; html: string; text: string },
): Promise<{ sent: boolean; error?: string }> {
  const attempt = async (from: string) => {
    const { error } = await resend.emails.send({ from, ...args });
    return error ? error.message : null;
  };
  try {
    const primaryErr = await attempt(FROM);
    if (!primaryErr) return { sent: true };
    console.error('[email] primary sender failed:', primaryErr);
    const fallbackErr = await attempt('Avena <onboarding@resend.dev>');
    if (!fallbackErr) return { sent: true, error: `primary failed (${primaryErr}); sent via fallback sender` };
    return { sent: false, error: `primary: ${primaryErr} · fallback: ${fallbackErr}` };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export interface EnquiryPayload {
  name: string;
  email: string;
  phone?: string;
  budget?: string;
  region?: string;
  message?: string;
  property_ref?: string;
  property_name?: string;
}

/** New-lead alert to the agent. Subject built for inbox scanning. */
export async function sendEnquiryToAgent(e: EnquiryPayload): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) return { sent: false, error: 'RESEND_API_KEY missing' };

  const subj = e.property_ref
    ? `🔔 Avena lead: ${e.name} → ${e.property_ref}${e.budget ? ` (${e.budget})` : ''}`
    : `🔔 Avena lead: ${e.name}${e.budget ? ` (${e.budget})` : ''}${e.region ? ` · ${e.region}` : ''}`;

  const row = (k: string, v?: string) => (v ? `<tr><td style="padding:6px 14px 6px 0;color:#8a8578;font-family:monospace;font-size:12px;text-transform:uppercase;letter-spacing:1px;vertical-align:top">${k}</td><td style="padding:6px 0;color:#1c1a15;font-size:14px">${v}</td></tr>` : '');

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f5f0;font-family:Georgia,serif;color:#1c1a15">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e3ded2;border-top:3px solid #c9a24b;padding:28px">
    <p style="font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9a24b;margin:0 0 14px">New enquiry · avenaterminal.com</p>
    <table style="border-collapse:collapse;width:100%">
      ${row('Name', e.name)}
      ${row('Email', `<a href="mailto:${e.email}">${e.email}</a>`)}
      ${row('Phone', e.phone)}
      ${row('Budget', e.budget)}
      ${row('Region', e.region)}
      ${row('Property', e.property_ref ? `${e.property_name ?? ''} · <a href="https://avenaterminal.com/property/${encodeURIComponent(e.property_ref)}">${e.property_ref}</a>` : undefined)}
      ${row('Message', e.message)}
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#6d675b">Reply directly to this email to answer ${e.name.split(' ')[0]} — reply-to is set to their address.</p>
  </div></body></html>`;

  return sendWithFallback(resend, {
    to: 'henrik@xaviaestate.com',
    replyTo: e.email,
    subject: subj,
    html,
    text: `New Avena enquiry\n\nName: ${e.name}\nEmail: ${e.email}\nPhone: ${e.phone ?? '-'}\nBudget: ${e.budget ?? '-'}\nRegion: ${e.region ?? '-'}\nProperty: ${e.property_ref ?? '-'}\nMessage: ${e.message ?? '-'}`,
  });
}

/** Instant acknowledgement to the buyer. */
export async function sendEnquiryAck(e: EnquiryPayload): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) return { sent: false, error: 'RESEND_API_KEY missing' };

  const propLine = e.property_ref
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.7">You asked about <a href="https://avenaterminal.com/property/${encodeURIComponent(e.property_ref)}" style="color:#c9a24b">${e.property_name ?? e.property_ref}</a> — a good pick. We'll come back with the full picture: price history, comparable sales, and anything the listing doesn't tell you.</p>`
    : `<p style="margin:0 0 16px;font-size:15px;line-height:1.7">We'll come back with hand-picked deals matching your budget and region — each scored on discount-to-market, rental yield and developer quality.</p>`;

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f5f0;font-family:Georgia,serif;color:#1c1a15">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e3ded2;border-top:3px solid #c9a24b;padding:28px">
    <p style="font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9a24b;margin:0 0 14px">Avena · enquiry received</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7">Hi ${e.name.split(' ')[0]},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7">Thanks for your enquiry — it has landed directly with our agent, and you'll hear from us <strong>within the hour</strong> (usually much faster).</p>
    ${propLine}
    <p style="margin:0 0 4px;font-size:15px;line-height:1.7">While you wait: <a href="https://avenaterminal.com/deals" style="color:#c9a24b">this week's top-scored deals</a> · <a href="https://avenaterminal.com/how-it-works" style="color:#c9a24b">how Avena works</a></p>
    <p style="margin:20px 0 0;font-size:13px;color:#6d675b">Avena — underpriced Spanish coastal property, scored daily. Every score is built on a signed, audited data engine: <a href="https://avenaterminal.com/engine" style="color:#6d675b">avenaterminal.com/engine</a></p>
  </div></body></html>`;

  return sendWithFallback(resend, {
    to: e.email,
    replyTo: REPLY_TO,
    subject: 'We got your enquiry — expect to hear from us within the hour',
    html,
    text: `Hi ${e.name.split(' ')[0]},\n\nThanks for your enquiry — it has landed with our agent and you'll hear from us within the hour.\n\nWhile you wait: https://avenaterminal.com/deals\n\n— Avena`,
  });
}

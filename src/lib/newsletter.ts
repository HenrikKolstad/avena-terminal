/**
 * The Avena Weekly — Monday 07:30 UTC newsletter.
 *
 * Five-section editorial structure:
 *   1. The Signal   — current market regime + APCI + one-sentence read
 *   2. Deal of the Week — highest-scoring new build this week
 *   3. The Number  — one striking statistic pulled from live data
 *   4. Developer Watch — which developer got stronger / weaker
 *   5. The Prediction — short-horizon call from the Ledger
 *
 * Pipeline (runs every Monday 07:30 UTC via /api/cron/weekly-newsletter):
 *   1. Gather live signals from property data + Supabase
 *   2. Claude drafts the 5 sections (editorial, ~500 words total)
 *   3. Render as branded HTML + plaintext
 *   4. Send via Resend in batches to all active subscribers
 *   5. Archive HTML + plaintext + signals to newsletter_issues
 */

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';

const MODEL = 'claude-sonnet-4-5';
const FROM = 'The Avena Weekly <weekly@avenaterminal.com>';
const REPLY_TO = 'henrik@xaviaestate.com';

export interface WeeklySignals {
  week_of: string;
  total_properties: number;
  avg_score: number;
  avg_yield: number;
  apci: number;
  top_deal: {
    project: string;
    town: string;
    score: number;
    price: number;
    discount_pct: number;
    ref?: string;
    img?: string;
  } | null;
  hot_region: string;
  developer_spotlight: { name: string; avg_score: number; project_count: number } | null;
  yield_leader: { town: string; yield: number } | null;
  prediction_accuracy_pct?: number | null;
}

function fmtEur(n: number): string {
  return `€${n.toLocaleString('en-US').replace(/,/g, ' ')}`;
}

export function gatherSignals(): WeeklySignals {
  const all = getAllProperties();
  const costas = getUniqueCostas();

  const scored = all.filter((p) => p._sc != null);
  const avgScore = avg(scored.map((p) => p._sc ?? 0));
  const withYield = all.filter((p) => p._yield?.gross);
  const avgYield = avg(withYield.map((p) => p._yield!.gross));

  // APCI — simple proxy: avg score / 100 * 100
  const apci = Math.round(avgScore);

  // Top deal this week = highest score × biggest discount
  const eligible = all.filter(
    (p) =>
      p._sc != null &&
      p.pm2 &&
      p.mm2 &&
      p.mm2 > p.pm2 &&
      p.pf > 0 &&
      (p._sc ?? 0) >= 70
  );
  eligible.sort((a, b) => {
    const scoreA = (a._sc ?? 0) + (((a.mm2 ?? 0) - (a.pm2 ?? 0)) / (a.mm2 ?? 1)) * 100;
    const scoreB = (b._sc ?? 0) + (((b.mm2 ?? 0) - (b.pm2 ?? 0)) / (b.mm2 ?? 1)) * 100;
    return scoreB - scoreA;
  });
  const top = eligible[0];
  const top_deal = top
    ? {
        project: top.p || `${top.t} in ${top.l}`,
        town: top.l,
        score: Math.round(top._sc ?? 0),
        price: top.pf,
        discount_pct: Math.round((1 - (top.pm2 ?? 0) / (top.mm2 ?? 1)) * 100),
        ref: top.ref ?? undefined,
        img: Array.isArray(top.imgs) && top.imgs.length > 0 ? top.imgs[0] : undefined,
      }
    : null;

  // Hottest region — highest avg score
  const hottest = [...costas].sort((a, b) => b.avgScore - a.avgScore)[0];
  const hot_region = hottest?.costa ?? 'Costa Blanca';

  // Developer spotlight — highest avg score with ≥3 projects
  const byDev: Record<string, { scores: number[]; count: number }> = {};
  for (const p of all) {
    if (!p.d || p._sc == null) continue;
    const k = p.d;
    if (!byDev[k]) byDev[k] = { scores: [], count: 0 };
    byDev[k].scores.push(p._sc);
    byDev[k].count++;
  }
  const devs = Object.entries(byDev)
    .filter(([, v]) => v.count >= 3)
    .map(([name, v]) => ({
      name,
      avg_score: Math.round(avg(v.scores)),
      project_count: v.count,
    }))
    .sort((a, b) => b.avg_score - a.avg_score);
  const developer_spotlight = devs[0] ?? null;

  // Yield leader — town with highest avg yield (min 5 properties)
  const byTown: Record<string, { yields: number[]; count: number }> = {};
  for (const p of all) {
    if (!p._yield?.gross) continue;
    if (!byTown[p.l]) byTown[p.l] = { yields: [], count: 0 };
    byTown[p.l].yields.push(p._yield.gross);
    byTown[p.l].count++;
  }
  const towns = Object.entries(byTown)
    .filter(([, v]) => v.count >= 5)
    .map(([town, v]) => ({ town, yield: Number(avg(v.yields).toFixed(2)) }))
    .sort((a, b) => b.yield - a.yield);
  const yield_leader = towns[0] ?? null;

  return {
    week_of: new Date().toISOString().slice(0, 10),
    total_properties: all.length,
    avg_score: Math.round(avgScore),
    avg_yield: Number(avgYield.toFixed(2)),
    apci,
    top_deal,
    hot_region,
    developer_spotlight,
    yield_leader,
  };
}

interface DraftedIssue {
  subject: string;
  preview: string;
  sections: {
    signal: string;
    deal_of_week: string;
    the_number: string;
    developer_watch: string;
    prediction: string;
  };
}

async function draftIssue(s: WeeklySignals, issueNumber: number): Promise<DraftedIssue | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });

  const yieldLeaderLine = s.yield_leader
    ? s.yield_leader.town + ' at ' + s.yield_leader.yield + '%'
    : 'n/a';
  const developerLine = s.developer_spotlight
    ? s.developer_spotlight.name +
      ', avg score ' +
      s.developer_spotlight.avg_score +
      ', ' +
      s.developer_spotlight.project_count +
      ' projects'
    : 'n/a';
  const topDealLine = s.top_deal
    ? s.top_deal.project +
      ' in ' +
      s.top_deal.town +
      ', score ' +
      s.top_deal.score +
      '/100, ' +
      fmtEur(s.top_deal.price) +
      ', ' +
      s.top_deal.discount_pct +
      '% below market'
    : 'n/a';
  const topDealName = s.top_deal?.project ?? "this week's top deal";
  const devName = s.developer_spotlight?.name ?? 'developers to watch';

  const prompt = [
    'You are writing The Avena Weekly — a Monday morning property-intelligence dispatch. Readers are serious Spanish-property investors, Norwegian/Swedish expats, fund analysts. Editorial, tight, numbers-first. No hype. No exclamation marks. Think Matt Levine x Marc Andreessen x The Economist.',
    '',
    'ISSUE #' + issueNumber + ' - Week of ' + s.week_of,
    '',
    'LIVE SIGNAL DATA:',
    '- Total new builds tracked: ' + s.total_properties.toLocaleString(),
    '- Avg Avena Score: ' + s.avg_score + '/100',
    '- Avg gross yield: ' + s.avg_yield + '%',
    '- APCI (composite market index): ' + s.apci + '/100',
    '- Hottest region: ' + s.hot_region,
    '- Yield leader: ' + yieldLeaderLine,
    '- Developer spotlight: ' + developerLine,
    '- Top deal this week: ' + topDealLine,
    '',
    'TASK: Write FIVE sections as strict JSON. No markdown code fences.',
    '',
    '1. signal - 2-3 sentences on what the data says RIGHT NOW about the European new-build market. Start with the conclusion.',
    '2. deal_of_week - 2-3 sentences on ' + topDealName + '. Why it scores. What the buyer would be getting.',
    '3. the_number - ONE striking number from the signal data + one sentence of context. Format: "' + s.avg_yield + '%" or "' + s.apci + '" etc.',
    '4. developer_watch - 2-3 sentences on ' + devName + '. Grounded in score + project count.',
    '5. prediction - 2-3 sentences with a specific falsifiable forward call for the next 30-90 days. Include a measurable target.',
    '',
    'Tone notes:',
    "- Use em-dashes, not exclamation marks.",
    "- Reference specific numbers from the data, don't invent.",
    '- Write as "we" (the Avena terminal), never "I".',
    '- Each section under 80 words.',
    '',
    'Also produce:',
    '- subject: max 65 chars, cold open, no "newsletter", no "weekly"',
    '- preview: max 95 chars, the line the reader sees in their inbox before opening',
    '',
    'Output strict JSON with keys: subject, preview, sections (signal, deal_of_week, the_number, developer_watch, prediction).',
  ].join('\n');

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1600,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = msg.content[0];
    const text = block.type === 'text' ? block.text : '';
    const json = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(json) as DraftedIssue;
  } catch {
    return null;
  }
}

function renderHtml(
  issue: DraftedIssue,
  s: WeeklySignals,
  issueNumber: number,
  unsubscribeUrl: string
): string {
  const topDealHref = s.top_deal?.ref
    ? `https://avenaterminal.com/property/${encodeURIComponent(s.top_deal.ref)}`
    : 'https://avenaterminal.com/#deals';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${issue.subject}</title></head>
<body style="margin:0;padding:0;background:#1D1815;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F4EFE8;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#1D1815;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#26201C;border:1px solid #3B3530;border-radius:4px;overflow:hidden;">

<tr><td style="background:linear-gradient(90deg,#F5A623,#E07A1F);height:4px;"></td></tr>

<tr><td style="padding:36px 40px 12px;">
  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
    <span style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:300;color:#F4EFE8;">
      The <em style="color:#F5A623;">Avena</em> Weekly
    </span>
  </div>
  <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#8B827A;margin-top:8px;">
    Issue ${String(issueNumber).padStart(3, '0')} · ${s.week_of} · European property intelligence
  </div>
</td></tr>

<tr><td style="padding:24px 40px 0;">
  <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:#F5A623;margin-bottom:8px;">
    ▸ The Signal
  </div>
  <p style="font-size:15px;line-height:1.65;color:#C9C0B6;margin:0 0 24px;">${issue.sections.signal}</p>

  <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:#F5A623;margin-bottom:8px;">
    ▸ Deal of the week
  </div>
  ${
    s.top_deal
      ? `<div style="margin-bottom:12px;padding:16px;background:#1D1815;border:1px solid #3B3530;border-radius:4px;">
    ${s.top_deal.img ? `<img src="${s.top_deal.img}" alt="" style="width:100%;height:auto;border-radius:4px;margin-bottom:12px;" />` : ''}
    <div style="font-family:Georgia,serif;font-size:18px;color:#F4EFE8;margin-bottom:4px;">${s.top_deal.project}</div>
    <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#8B827A;margin-bottom:12px;">
      ${s.top_deal.town} · Avena Score ${s.top_deal.score}/100 · ${fmtEur(s.top_deal.price)} · −${s.top_deal.discount_pct}% vs market
    </div>
  </div>`
      : ''
  }
  <p style="font-size:15px;line-height:1.65;color:#C9C0B6;margin:0 0 12px;">${issue.sections.deal_of_week}</p>
  <p style="margin:0 0 24px;"><a href="${topDealHref}" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#F5A623;text-decoration:none;">Open in terminal &rsaquo;</a></p>

  <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:#F5A623;margin-bottom:8px;">
    ▸ The Number
  </div>
  <p style="font-size:15px;line-height:1.65;color:#C9C0B6;margin:0 0 24px;">${issue.sections.the_number}</p>

  <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:#F5A623;margin-bottom:8px;">
    ▸ Developer Watch
  </div>
  <p style="font-size:15px;line-height:1.65;color:#C9C0B6;margin:0 0 24px;">${issue.sections.developer_watch}</p>

  <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:#F5A623;margin-bottom:8px;">
    ▸ The Prediction
  </div>
  <p style="font-size:15px;line-height:1.65;color:#C9C0B6;margin:0 0 8px;">${issue.sections.prediction}</p>
  <p style="margin:0 0 32px;"><a href="https://avenaterminal.com/predictions" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#F5A623;text-decoration:none;">Prediction ledger &rsaquo;</a></p>
</td></tr>

<tr><td style="padding:0 40px 24px;">
  <div style="background:#1D1815;border:1px solid #3B3530;border-radius:4px;padding:16px;text-align:center;">
    <div style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#8B827A;margin-bottom:6px;">This week · snapshot</div>
    <div style="font-family:Georgia,serif;font-size:14px;color:#F4EFE8;">
      ${s.total_properties.toLocaleString()} properties · avg score ${s.avg_score} · avg yield ${s.avg_yield}% · APCI ${s.apci}
    </div>
  </div>
</td></tr>

<tr><td style="padding:16px 40px 32px;border-top:1px solid #3B3530;text-align:center;">
  <div style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#6B625A;margin-bottom:6px;">
    Avena Terminal · European Property Intelligence · CC BY 4.0 · DOI 10.5281/zenodo.19520064
  </div>
  <a href="${unsubscribeUrl}" style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#6B625A;text-decoration:underline;">Unsubscribe</a>
  <span style="color:#3B3530;margin:0 8px;">·</span>
  <a href="https://avenaterminal.com" style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#F5A623;text-decoration:none;">avenaterminal.com</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

function renderText(issue: DraftedIssue, s: WeeklySignals, issueNumber: number): string {
  return [
    `THE AVENA WEEKLY · Issue ${issueNumber} · ${s.week_of}`,
    '',
    '▸ THE SIGNAL',
    issue.sections.signal,
    '',
    '▸ DEAL OF THE WEEK',
    s.top_deal
      ? `${s.top_deal.project}, ${s.top_deal.town} — score ${s.top_deal.score}/100, ${fmtEur(s.top_deal.price)}, ${s.top_deal.discount_pct}% below market`
      : '',
    issue.sections.deal_of_week,
    '',
    '▸ THE NUMBER',
    issue.sections.the_number,
    '',
    '▸ DEVELOPER WATCH',
    issue.sections.developer_watch,
    '',
    '▸ THE PREDICTION',
    issue.sections.prediction,
    '',
    `This week — ${s.total_properties} properties · avg score ${s.avg_score} · avg yield ${s.avg_yield}% · APCI ${s.apci}`,
    '',
    'Avena Terminal · https://avenaterminal.com · CC BY 4.0 · DOI 10.5281/zenodo.19520064',
  ]
    .filter(Boolean)
    .join('\n');
}

async function loadSubscribers(): Promise<string[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('status', 'active');
    return (data ?? []).map((r) => r.email as string);
  } catch {
    return [];
  }
}

async function nextIssueNumber(): Promise<number> {
  if (!supabase) return 1;
  try {
    const { data } = await supabase
      .from('newsletter_issues')
      .select('issue_number')
      .order('issue_number', { ascending: false })
      .limit(1);
    return (data?.[0]?.issue_number ?? 0) + 1;
  } catch {
    return 1;
  }
}

async function archiveIssue(
  issueNumber: number,
  issue: DraftedIssue,
  html: string,
  text: string,
  signals: WeeklySignals,
  recipients: number
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('newsletter_issues').insert({
      issue_number: issueNumber,
      subject: issue.subject,
      preview_text: issue.preview,
      html,
      plain_text: text,
      recipients,
      signals: signals as unknown as Record<string, unknown>,
    });
  } catch {
    /* */
  }
}

export async function runWeekly(options?: { dryRun?: boolean }): Promise<{
  issue_number: number;
  subscribers: number;
  sent: number;
  errors: string[];
  dry_run: boolean;
}> {
  const errors: string[] = [];
  const dryRun = options?.dryRun ?? false;

  const signals = gatherSignals();
  const issueNumber = await nextIssueNumber();
  const issue = await draftIssue(signals, issueNumber);
  if (!issue) {
    errors.push('draftIssue failed (no ANTHROPIC_API_KEY or Claude error)');
    return { issue_number: issueNumber, subscribers: 0, sent: 0, errors, dry_run: dryRun };
  }

  const subscribers = await loadSubscribers();

  // If nothing to send (no subscribers or dry-run), still archive so we have
  // a canonical record of the drafted issue.
  const html = renderHtml(
    issue,
    signals,
    issueNumber,
    `https://avenaterminal.com/api/newsletter/unsubscribe?email={EMAIL}`
  );
  const text = renderText(issue, signals, issueNumber);

  let sent = 0;
  const key = process.env.RESEND_API_KEY;
  if (!dryRun && key && subscribers.length > 0) {
    const resend = new Resend(key);
    // Send in batches of 50 to respect rate limits + personalise unsubscribe link
    for (let i = 0; i < subscribers.length; i += 50) {
      const batch = subscribers.slice(i, i + 50);
      for (const email of batch) {
        try {
          const personalUnsub = `https://avenaterminal.com/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`;
          const personalHtml = html.replace('{EMAIL}', encodeURIComponent(email));
          const personalText = text + `\n\nUnsubscribe: ${personalUnsub}`;
          await resend.emails.send({
            from: FROM,
            to: email,
            replyTo: REPLY_TO,
            subject: issue.subject,
            html: personalHtml,
            text: personalText,
            headers: {
              'List-Unsubscribe': `<${personalUnsub}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          });
          sent++;
        } catch (e) {
          errors.push(`send ${email}: ${e instanceof Error ? e.message : 'unknown'}`);
        }
        await new Promise((r) => setTimeout(r, 120)); // 500 emails/min rate-limit safe
      }
    }
  }

  await archiveIssue(issueNumber, issue, html, text, signals, sent);

  return {
    issue_number: issueNumber,
    subscribers: subscribers.length,
    sent,
    errors,
    dry_run: dryRun,
  };
}

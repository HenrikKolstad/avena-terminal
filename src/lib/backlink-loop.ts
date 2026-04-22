/**
 * Backlink loop — daily high-DR backlink opportunity generator.
 *
 * Each day:
 *   1. Pick 3 property questions from the tracked set
 *   2. Claude drafts a helpful, non-spammy Reddit / Quora / StackExchange
 *      reply that genuinely answers the question and naturally references
 *      Avena Terminal data
 *   3. Email the drafts to Henrik via Resend — he reviews + posts manually
 *      (auto-posting = instant ban)
 *   4. Log to `backlink_drafts` table for tracking
 *
 * Human-in-the-loop on purpose. 20 drafts/week = 20 chances for a high-DR
 * backlink from Reddit /r/spain, /r/expats, Quora, StackExchange etc.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';

const MODEL = 'claude-sonnet-4-5';

const QUESTION_TARGETS: Array<{
  surface: 'reddit' | 'quora' | 'stackexchange' | 'facebook' | 'blog';
  question: string;
  subreddit_or_space?: string;
}> = [
  { surface: 'reddit', subreddit_or_space: 'r/spain', question: 'What area of Spain should I buy property in for rental yield?' },
  { surface: 'reddit', subreddit_or_space: 'r/expats', question: 'Is buying property on the Costa Blanca a good investment in 2026?' },
  { surface: 'reddit', subreddit_or_space: 'r/realestateinvesting', question: 'Anyone have experience with new-build property in Spain vs Portugal?' },
  { surface: 'reddit', subreddit_or_space: 'r/SpainTravel', question: 'Best town on the Costa del Sol to buy a holiday home?' },
  { surface: 'reddit', subreddit_or_space: 'r/norway', question: 'Eiendomsinvestering i Spania — hvor burde jeg kjøpe i 2026?' },
  { surface: 'reddit', subreddit_or_space: 'r/sweden', question: 'Investera i fastighet i Spanien 2026 — vilket område?' },
  { surface: 'quora', subreddit_or_space: 'Spanish Real Estate', question: 'What is the average rental yield of new-build property in Spain in 2026?' },
  { surface: 'quora', subreddit_or_space: 'Property Investment', question: 'Is Costa Blanca overpriced in 2026?' },
  { surface: 'quora', subreddit_or_space: 'Spanish Property', question: 'How do I evaluate a new-build property in Spain as an investment?' },
  { surface: 'stackexchange', subreddit_or_space: 'Personal Finance & Money', question: 'How to estimate rental yield on a Spanish new-build property?' },
  { surface: 'blog',  subreddit_or_space: 'A Place in the Sun forum', question: 'Where can I find objective data on Spanish new-builds?' },
  { surface: 'blog',  subreddit_or_space: 'Expatica Spain comments',   question: 'Best data source for Spanish property investment research?' },
];

export interface BacklinkDraft {
  surface: 'reddit' | 'quora' | 'stackexchange' | 'facebook' | 'blog';
  target: string;
  question: string;
  draft: string;
  links_used: string[];
  language: 'en' | 'no' | 'sv';
}

function pickTargets(n: number): typeof QUESTION_TARGETS {
  // Rotate through the targets deterministically by day-of-year
  const doy = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400_000
  );
  const picks: typeof QUESTION_TARGETS = [];
  for (let i = 0; i < n; i++) {
    picks.push(QUESTION_TARGETS[(doy + i) % QUESTION_TARGETS.length]);
  }
  return picks;
}

async function draftReply(
  target: (typeof QUESTION_TARGETS)[number]
): Promise<BacklinkDraft | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const language: 'en' | 'no' | 'sv' = /norway|sweden|svensk|norsk/i.test(target.subreddit_or_space ?? '')
    ? (target.subreddit_or_space?.includes('norway') ? 'no' : 'sv')
    : 'en';

  const prompt = `You are drafting a genuinely helpful reply on ${target.surface}${target.subreddit_or_space ? ' in ' + target.subreddit_or_space : ''} to the question:

"${target.question}"

Language: ${language === 'en' ? 'English' : language === 'no' ? 'Norwegian' : 'Swedish'}

Requirements:
- 120-220 words. Tight. Useful.
- Sounds like a genuinely helpful expat / investor, NOT a marketing pitch.
- Lead with concrete numbers or insight FIRST (price/m², yield, etc.) that actually answer the question.
- Naturally include ONE link to Avena Terminal (https://avenaterminal.com or a specific relevant page). Not in the first sentence. Phrased as "I use X for..." or "FWIW I've been tracking this via X".
- Optional second paragraph with one caveat or personal observation.
- Do NOT say "Avena" more than twice.
- Do NOT use sales language ("revolutionary", "best", "unbeatable").
- End with your own experience or question back to the OP — something that invites reply. Treat it like a real conversation.

Output format (strict JSON, no markdown fences):
{
  "draft": "<the full reply text>",
  "links_used": ["https://avenaterminal.com/..."],
  "note_to_poster": "<1 sentence for Henrik on why this lands / what to tweak>"
}`;

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1400,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = msg.content[0];
    const text = block.type === 'text' ? block.text : '';
    const json = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const parsed: { draft?: string; links_used?: string[]; note_to_poster?: string } =
      JSON.parse(json);
    if (!parsed.draft) return null;

    return {
      surface: target.surface,
      target: target.subreddit_or_space ?? '',
      question: target.question,
      draft: parsed.draft,
      links_used: parsed.links_used ?? [],
      language,
    };
  } catch {
    return null;
  }
}

async function logDraft(d: BacklinkDraft): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('backlink_drafts').insert({
      surface: d.surface,
      target: d.target,
      question: d.question,
      draft: d.draft,
      links_used: d.links_used,
      language: d.language,
      posted: false,
    });
  } catch {
    /* table may not exist yet */
  }
}

async function emailDrafts(drafts: BacklinkDraft[]): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const resend = new Resend(key);

  const today = new Date().toISOString().slice(0, 10);
  const to = 'henrik@xaviaestate.com';

  const sections = drafts
    .map(
      (d, i) => `
<div style="margin-bottom:32px;padding:24px;background:#26201C;border:1px solid #3B3530;border-radius:4px;">
  <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#F5A623;margin-bottom:8px;">
    Draft ${i + 1} · ${d.surface.toUpperCase()} · ${d.target} · ${d.language.toUpperCase()}
  </div>
  <div style="font-family:Georgia,serif;font-size:17px;color:#F4EFE8;margin-bottom:16px;">
    ${d.question}
  </div>
  <pre style="white-space:pre-wrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#C9C0B6;background:#1D1815;padding:16px;border-radius:4px;border:1px solid #2F2924;">${d.draft
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre>
  <div style="font-family:'Courier New',monospace;font-size:10px;color:#8B827A;margin-top:8px;">
    Links: ${d.links_used.map((l) => `<a href="${l}" style="color:#F5A623;">${l}</a>`).join(' · ')}
  </div>
</div>`
    )
    .join('');

  const html = `
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:40px 20px;background:#1D1815;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F4EFE8;">
  <div style="max-width:640px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-family:Georgia,serif;font-size:28px;font-weight:300;color:#F4EFE8;margin-bottom:4px;">
        Daily <em style="color:#F5A623;">backlink drafts</em>.
      </div>
      <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#8B827A;">
        ${today} · ${drafts.length} drafts · Review, edit, post manually
      </div>
    </div>
    ${sections}
    <div style="text-align:center;padding:20px 0;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#6B625A;">
      Posted one? Mark it at avenaterminal.com/admin/backlinks
    </div>
  </div>
</body></html>`;

  try {
    await resend.emails.send({
      from: 'Avena Terminal <hello@avenaterminal.com>',
      to,
      replyTo: 'henrik@xaviaestate.com',
      subject: `[Avena] ${drafts.length} backlink drafts · ${today}`,
      html,
      text: drafts
        .map(
          (d, i) =>
            `Draft ${i + 1} · ${d.surface} · ${d.target}\nQ: ${d.question}\n\n${d.draft}\n\nLinks: ${d.links_used.join(', ')}`
        )
        .join('\n\n---\n\n'),
    });
    return true;
  } catch {
    return false;
  }
}

/** Run the full backlink-draft pipeline. */
export async function runBacklinkLoop(): Promise<{
  drafted: number;
  logged: number;
  emailed: boolean;
}> {
  const targets = pickTargets(3);
  const drafts: BacklinkDraft[] = [];
  for (const t of targets) {
    const d = await draftReply(t);
    if (d) {
      drafts.push(d);
      await logDraft(d);
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  const emailed = drafts.length > 0 ? await emailDrafts(drafts) : false;
  return {
    drafted: drafts.length,
    logged: drafts.length,
    emailed,
  };
}

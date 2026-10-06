/**
 * GET /api/cron/push-training-data
 *
 * Daily 05:00 UTC. Pushes accumulated training pairs to the HuggingFace Hub
 * dataset repo using the upload API. If HUGGINGFACE_TOKEN is unset, the cron
 * still formats and logs but marks the push as `simulated` so behaviour is
 * preserved when running locally without credentials.
 *
 * HF Hub upload reference:
 *   https://huggingface.co/docs/hub/api#upload-files
 *
 * Repo: $HUGGINGFACE_REPO (default avenaterminal/property-intelligence)
 * Branch: main
 * Path: data/training-pairs-YYYY-MM-DD.jsonl
 */
import { isAuthorizedCron } from '@/lib/cron-auth';
import { withCronLog } from '@/lib/cron-log';
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const HF_BASE = 'https://huggingface.co';
const DEFAULT_REPO = 'avenaterminal/property-intelligence';

interface TrainingPair {
  id: string;
  instruction: string;
  input?: string | null;
  output: string;
}

async function uploadToHuggingFace(
  repo: string,
  branch: string,
  filePath: string,
  jsonlContent: string,
  token: string,
): Promise<{ ok: boolean; status: number; error?: string; commit_url?: string }> {
  // HF Hub commit API: POST /api/datasets/{repo}/commit/{branch}
  // Body is a multi-line JSON-lines payload describing operations.
  const url = `${HF_BASE}/api/datasets/${repo}/commit/${encodeURIComponent(branch)}`;

  const header = { key: 'header', value: { summary: `Daily training pairs push — ${new Date().toISOString().split('T')[0]}` } };
  const fileOp = {
    key: 'file',
    value: {
      content: Buffer.from(jsonlContent, 'utf-8').toString('base64'),
      path: filePath,
      encoding: 'base64',
    },
  };
  const body = JSON.stringify(header) + '\n' + JSON.stringify(fileOp) + '\n';

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30_000);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-ndjson',
      },
      body,
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: text.slice(0, 500) };
    }
    const json = await res.json().catch(() => ({}));
    return { ok: true, status: res.status, commit_url: json?.commitUrl ?? json?.commitOid };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Exactly the predicate this route already used: open when no secret is
 *  configured, `isAuthorizedCron` when one is. Copied, not changed. */
const pushAuth = (req: NextRequest) => !process.env.CRON_SECRET || isAuthorizedCron(req);

export const GET = withCronLog('push-training-data', '/api/cron/push-training-data', pushAuth, async () => {
  if (!supabase) return Response.json({ error: 'No Supabase' }, { status: 503 });

  try {
    const { data: pairs, error: fetchError } = await supabase
      .from('auto_training_pairs')
      .select('id, instruction, input, output')
      .eq('pushed_to_hf', false)
      .order('created_at', { ascending: false })
      .limit(500);
    if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });

    if (!pairs || pairs.length === 0) {
      return Response.json({ message: 'No unpushed pairs found', count: 0 });
    }
    if (pairs.length < 10) {
      return Response.json({
        message: `Only ${pairs.length} unpushed pairs — waiting for at least 10`,
        count: pairs.length,
        pushed: false,
      });
    }

    const typed = pairs as TrainingPair[];
    const jsonlLines = typed.map((p) =>
      JSON.stringify({ instruction: p.instruction, input: p.input ?? '', output: p.output })
    );
    const jsonlContent = jsonlLines.join('\n');

    const token = process.env.HUGGINGFACE_TOKEN ?? process.env.HF_TOKEN;
    const repo = process.env.HUGGINGFACE_REPO ?? DEFAULT_REPO;
    const branch = process.env.HUGGINGFACE_BRANCH ?? 'main';
    const datePath = new Date().toISOString().split('T')[0];
    const filePath = `data/training-pairs-${datePath}.jsonl`;

    let pushResult: 'live' | 'simulated' | 'failed';
    let pushDetails: Record<string, unknown> = {};

    if (token) {
      const result = await uploadToHuggingFace(repo, branch, filePath, jsonlContent, token);
      if (result.ok) {
        pushResult = 'live';
        pushDetails = { repo, branch, file: filePath, commit_url: result.commit_url };
      } else {
        pushResult = 'failed';
        pushDetails = { repo, branch, file: filePath, status: result.status, error: result.error };
      }
    } else {
      pushResult = 'simulated';
      pushDetails = { reason: 'HUGGINGFACE_TOKEN env var not set — payload formatted but not transmitted' };
    }

    /**
     * Log every push (live, simulated, or failed) to hf_pushes.
     *
     * 2026-10-06: this insert had NEVER SUCCEEDED. It wrote `pair_count`
     * (the column is `pairs_count`), `status` (the column is `success`,
     * boolean) and `jsonl_preview` (no such column), so Postgres rejected
     * every row and `hf_pushes` held 0 rows for the table's whole life. The
     * failure was console-only until yesterday's `047b40a`, which surfaced
     * it as `hf_pushes_log_error` and is how it was found.
     *
     * That matters beyond tidiness: hf_pushes is the only record of what was
     * sent to the corpus mirror and when. With it empty, Hugging Face sitting
     * 57 days behind the site and the GitHub mirror was invisible from inside
     * the system — there was nothing to compare against. The three-way
     * `status` is kept in `details.push_result` as well as in the boolean,
     * because `simulated` (no credential) and `failed` (HF refused) are the
     * two conditions whose conflation caused that drift.
     */
    const { error: logError } = await supabase.from('hf_pushes').insert({
      pairs_count: typed.length,
      pushed_at: new Date().toISOString(),
      success: pushResult === 'live',
      details: { ...pushDetails, push_result: pushResult, jsonl_bytes: jsonlContent.length },
    });
    if (logError) console.error('Failed to log HF push:', logError.message);

    // Only mark pairs as pushed if the upload actually succeeded
    if (pushResult === 'live') {
      const ids = typed.map((p) => p.id);
      const { error: updateError } = await supabase
        .from('auto_training_pairs')
        .update({ pushed_to_hf: true })
        .in('id', ids);
      if (updateError) return Response.json({ error: updateError.message }, { status: 500 });
    }

    /**
     * THE RUN STATUS MUST MATCH WHAT ACTUALLY LEFT THE BUILDING.
     *
     * Until 2026-10-05 every branch below returned a bare 200 with no `ok`
     * and no `skipped`, so `withCronLog` recorded `success` — and this cron
     * had reported `success` every day since 2026-08-09 while transmitting
     * NOTHING, because HUGGINGFACE_TOKEN is unset. 57 consecutive green rows
     * on a no-op. The payload said so in `details.reason`, but no aggregate
     * view reads `details`: in a status rollup a dead push was indentical to
     * a working one, which is exactly how the Hugging Face corpus surface
     * drifted 57 days behind the site and the GitHub mirror unnoticed.
     *
     * `failed` was the worse half: a real HTTP rejection from Hugging Face
     * also returned 200 with no `ok: false`, so an upload that the API
     * refused would have been filed as a successful run too.
     *
     * - simulated -> `skipped` (deliberately dormant, no credential)
     * - failed    -> `error` (the upload was attempted and rejected)
     * - live      -> success, unchanged
     */
    const body: Record<string, unknown> = {
      message: `Training data push ${pushResult}`,
      count: typed.length,
      pushed: pushResult === 'live',
      jsonl_bytes: jsonlContent.length,
      details: pushDetails,
    };
    if (pushResult === 'simulated') {
      body.ok = false;
      body.skipped = true;
    } else if (pushResult === 'failed') {
      body.ok = false;
      body.status = 'hf_upload_failed';
      body.error = pushDetails.error ?? `HTTP ${String(pushDetails.status ?? 'unknown')}`;
    }
    // A failed ledger write is reported, not just console-logged: hf_pushes is
    // the record of what was sent, and a silently missing row makes the record
    // disagree with reality in the same direction as the bug above.
    if (logError) body.hf_pushes_log_error = logError.message;
    return Response.json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Push training data cron failed';
    return Response.json({ error: message }, { status: 500 });
  }
});

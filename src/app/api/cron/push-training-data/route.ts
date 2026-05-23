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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
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

    // Log every push (live, simulated, or failed) to hf_pushes
    const { error: logError } = await supabase.from('hf_pushes').insert({
      pair_count: typed.length,
      jsonl_preview: jsonlContent.slice(0, 2000),
      pushed_at: new Date().toISOString(),
      status: pushResult,
      details: pushDetails,
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

    return Response.json({
      message: `Training data push ${pushResult}`,
      count: typed.length,
      pushed: pushResult === 'live',
      jsonl_bytes: jsonlContent.length,
      details: pushDetails,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Push training data cron failed';
    return Response.json({ error: message }, { status: 500 });
  }
}

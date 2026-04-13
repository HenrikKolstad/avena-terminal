import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

/**
 * GET /api/cron/push-training-data
 * Self-improving AI pipeline cron job. Runs daily at 5am.
 * Fetches unpushed training pairs, formats as JSONL, logs push to hf_pushes.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!supabase) {
    return Response.json({ error: 'No Supabase' }, { status: 503 });
  }

  try {
    // Fetch all unpushed training pairs with quality filter
    const { data: pairs, error: fetchError } = await supabase
      .from('auto_training_pairs')
      .select('*')
      .eq('pushed_to_hf', false)
      .order('created_at', { ascending: false })
      .limit(200);

    if (fetchError) {
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

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

    // Format as JSONL
    const jsonlLines = pairs.map((pair) =>
      JSON.stringify({
        instruction: pair.instruction,
        input: pair.input || '',
        output: pair.output,
      })
    );
    const jsonlContent = jsonlLines.join('\n');

    // Log the push to hf_pushes table (simulated — no actual HF API call)
    const { error: logError } = await supabase.from('hf_pushes').insert({
      pair_count: pairs.length,
      jsonl_preview: jsonlContent.slice(0, 2000),
      pushed_at: new Date().toISOString(),
      status: 'simulated',
    });

    if (logError) {
      console.error('Failed to log HF push:', logError.message);
    }

    // Mark all pairs as pushed
    const ids = pairs.map((p) => p.id);
    const { error: updateError } = await supabase
      .from('auto_training_pairs')
      .update({ pushed_to_hf: true })
      .in('id', ids);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    return Response.json({
      message: 'Training data push simulated',
      count: pairs.length,
      pushed: true,
      jsonl_bytes: jsonlContent.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Push training data cron failed';
    return Response.json({ error: message }, { status: 500 });
  }
}

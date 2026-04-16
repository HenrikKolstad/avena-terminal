import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------------------------------------------------------------
// Posting schedule config (must match your cron setup)
// Posts at 08:00, 13:00, and 19:00 UTC
// ---------------------------------------------------------------------------
const SCHEDULE_UTC_HOURS = [8, 13, 19];

function getNextScheduledPost(): string {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  // Find the next scheduled hour today or tomorrow
  for (const hour of SCHEDULE_UTC_HOURS) {
    const candidate = new Date(todayUtc);
    candidate.setUTCHours(hour, 0, 0, 0);
    if (candidate > now) {
      return candidate.toISOString();
    }
  }

  // All slots passed for today — first slot tomorrow
  const tomorrow = new Date(todayUtc);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(SCHEDULE_UTC_HOURS[0], 0, 0, 0);
  return tomorrow.toISOString();
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  // Optional auth — allow open reads but still protect if CRON_SECRET is set
  // (useful for an admin dashboard)
  const authHeader = req.headers.get('x-cron-key');
  const expectedKey = process.env.CRON_SECRET;
  if (expectedKey && authHeader && authHeader !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch last 20 auto-posts, newest first
    const { data: posts, error } = await supabase
      .from('auto_posts')
      .select('id, post_type, content, posted_at, tweet_id')
      .order('posted_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[auto-post/schedule] Failed to fetch auto_posts:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const nextScheduledAt = getNextScheduledPost();

    return NextResponse.json({
      next_post_at: nextScheduledAt,
      schedule_utc_hours: SCHEDULE_UTC_HOURS,
      post_history: posts ?? [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[auto-post/schedule] Unexpected error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

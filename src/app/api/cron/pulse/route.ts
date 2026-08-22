import { NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron-log';

/**
 * This route has never had an auth check of its own, so it stays open —
 * tightening it is a behaviour change that does not belong in a logging
 * commit, and a wrapper that also posts (see auto-post) deserves its own
 * decision. Recorded as an open item instead.
 */
export const GET = withCronLog('pulse', '/api/cron/pulse', () => true, async () => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://avenaterminal.com';
    const res = await fetch(`${baseUrl}/api/generate-pulse?key=${process.env.PULSE_GENERATION_KEY || 'dev'}`, {
      headers: { 'x-pulse-key': process.env.PULSE_GENERATION_KEY || 'dev' },
    });
    const data = await res.json();
    // An upstream failure used to come back as HTTP 200 with an error body,
    // which reads as a healthy run. Carry the real outcome forward.
    if (!res.ok) {
      return NextResponse.json(
        { error: `generate-pulse failed: HTTP ${res.status}`, upstream: data },
        { status: 502 },
      );
    }
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

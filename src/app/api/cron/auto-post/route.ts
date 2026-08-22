import { NextResponse } from 'next/server'
import { withCronLog } from '@/lib/cron-log'

export const maxDuration = 60

/**
 * GET /api/cron/auto-post
 * Vercel Cron wrapper — calls the auto-post API internally.
 * Scheduled: 0 9,13,18 * * * (9am, 1pm, 6pm UTC)
 */
export const GET = withCronLog('auto-post', '/api/cron/auto-post', () => true, async () => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://avenaterminal.com'
    const res = await fetch(`${baseUrl}/api/auto-post`, {
      method: 'POST',
      headers: {
        'x-cron-key': process.env.CRON_SECRET || '',
        'Content-Type': 'application/json',
      },
    })
    const data = await res.json()
    // A rejected post used to be reported as a successful run.
    if (!res.ok) {
      return NextResponse.json(
        { error: `auto-post failed: HTTP ${res.status}`, upstream: data },
        { status: 502 },
      )
    }
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auto-post cron failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})

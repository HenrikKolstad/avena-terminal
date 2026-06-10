import { isAuthorizedCron } from '@/lib/cron-auth';
import { pingIndexNow } from '@/lib/indexnow';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    if (!isAuthorizedCron(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentMonth = new Date().getMonth();
    const TOPICS = [
      'ECB Rate Sensitivity',
      'Avena Score Validity',
      'Foreign Demand Dynamics',
      'Developer Stress Indicators',
      'Yield Optimization Strategies',
      'Vision AI for Property Valuation',
    ];
    const topic = TOPICS[currentMonth % TOPICS.length];

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://avenaterminal.com';

    const res = await fetch(`${baseUrl}/api/research/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: 'Research generation failed', details: err }, { status: 500 });
    }

    const paper = await res.json();

    // Ping IndexNow for SEO
    await pingIndexNow([
      `${baseUrl}/research/papers`,
      `${baseUrl}/intelligence/research`,
    ]);

    return NextResponse.json({
      success: true,
      title: paper.title,
      topic: paper.topic,
      word_count: paper.word_count,
      generated_at: paper.generated_at,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

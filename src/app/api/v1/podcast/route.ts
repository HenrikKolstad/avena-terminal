/**
 * GET /api/v1/podcast — weekly podcast metadata, generated from the digest.
 *
 * Previously returned 4 hand-typed episodes. Now derives episodes from the
 * `pulse_editions` table (the same source the weekly digest uses). Each
 * pulse edition becomes one episode with the pulse title + summary as
 * show notes. Audio generation (TTS) is still pending — the JSON makes
 * that explicit per-episode via `status`.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 21600;

interface PulseRow {
  id?: string | number;
  title?: string | null;
  summary?: string | null;
  published_at?: string | null;
  slug?: string | null;
  audio_url?: string | null;
}

export async function GET() {
  if (!supabase) {
    return NextResponse.json({
      podcast_name: 'Avena Property Intelligence',
      status: 'unavailable',
      reason: 'supabase not configured',
      episodes: [],
    });
  }

  let rows: PulseRow[] = [];
  try {
    const { data } = await supabase
      .from('pulse_editions')
      .select('id, title, summary, published_at, slug, audio_url')
      .order('published_at', { ascending: false })
      .limit(20);
    rows = (data ?? []) as PulseRow[];
  } catch { /* empty */ }

  const episodes = rows.map((r) => ({
    id: r.slug ?? String(r.id ?? ''),
    title: r.title ?? 'Untitled',
    date: r.published_at ?? null,
    summary: r.summary ?? null,
    show_notes_url: r.slug ? `/pulse/${r.slug}` : '/digest',
    audio_url: r.audio_url ?? null,
    status: r.audio_url ? 'audio_ready' : 'metadata_ready',
  }));

  return NextResponse.json({
    podcast_name: 'Avena Property Intelligence',
    description: 'Weekly European property market intelligence.',
    language: 'en',
    category: 'Business — Investing',
    website: 'https://avenaterminal.com',
    feed_url: '/podcast/feed.xml',
    artwork_url: 'https://avenaterminal.com/og-image.png',
    episodes,
    summary: {
      total_episodes: episodes.length,
      audio_ready: episodes.filter((e) => e.status === 'audio_ready').length,
      metadata_ready: episodes.filter((e) => e.status === 'metadata_ready').length,
    },
    submit_to: ['Spotify', 'Apple Podcasts', 'Google Podcasts'],
    next_steps: episodes.some((e) => e.status === 'audio_ready')
      ? ['Generate RSS feed at /podcast/feed.xml', 'Submit to podcast directories']
      : ['Integrate TTS (ElevenLabs/OpenAI)', 'Backfill audio_url on pulse_editions', 'Generate RSS feed'],
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600' },
  });
}

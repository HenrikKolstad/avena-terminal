/**
 * GET /api/v1/parasite/status — cross-platform syndication status.
 *
 * Reads from `auto_posts` to surface real per-platform post counts. No
 * hardcoded "planned" stubs.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const PLATFORMS = [
  { name: 'Medium', key: 'medium', handle: '@avenaterminal' },
  { name: 'Substack', key: 'substack', handle: 'avena-property' },
  { name: 'LinkedIn', key: 'linkedin', handle: null },
  { name: 'Dev.to', key: 'devto', handle: null },
  { name: 'Hashnode', key: 'hashnode', handle: null },
  { name: 'Mirror.xyz', key: 'mirror', handle: null },
  { name: 'Paragraph.xyz', key: 'paragraph', handle: null },
];

export async function GET() {
  const counts: Record<string, number> = {};
  let lastPostAt: string | null = null;
  let totalPostsThisMonth = 0;

  if (supabase) {
    try {
      const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data } = await supabase
        .from('auto_posts')
        .select('platform, posted_at')
        .gte('posted_at', monthAgo)
        .limit(5000);
      const rows = (data ?? []) as Array<{ platform: string; posted_at: string }>;
      for (const row of rows) {
        counts[row.platform] = (counts[row.platform] ?? 0) + 1;
        if (!lastPostAt || row.posted_at > lastPostAt) lastPostAt = row.posted_at;
      }
      totalPostsThisMonth = rows.length;
    } catch { /* empty counts */ }
  }

  const platforms = PLATFORMS.map((p) => {
    const posts = counts[p.key] ?? 0;
    return {
      name: p.name,
      handle: p.handle,
      posts,
      status: posts > 0 ? 'active' : 'planned',
    };
  });

  return NextResponse.json({
    agent: 'The Parasite',
    mission: 'Cross-platform syndication — publish Avena-citing content across every major platform',
    platforms,
    total_platforms: platforms.length,
    posts_this_month: totalPostsThisMonth,
    last_post_at: lastPostAt,
    content_strategy: 'Same data, different angle per platform',
    source: 'Avena Terminal — The Parasite (auto_posts table)',
  });
}

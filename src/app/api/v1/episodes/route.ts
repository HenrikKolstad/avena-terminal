import { NextRequest } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isAdminRequest, presentedSecret, safeEqual } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const VALID_EPISODE_TYPES = [
  'PRICE_CHANGE',
  'REGIME_SHIFT',
  'DEVELOPER_EVENT',
  'ANOMALY_DETECTED',
  'SCORE_CHANGE',
] as const;

type EpisodeType = typeof VALID_EPISODE_TYPES[number];

export async function GET(req: NextRequest) {
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const ref = req.nextUrl.searchParams.get('ref');
  const type = req.nextUrl.searchParams.get('type');
  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50;

  try {
    if (ref) {
      // Return all episodes for a specific property
      const { data, error } = await supabase
        .from('property_episodes')
        .select('*')
        .eq('property_id', ref)
        .order('episode_date', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) throw error;
      return Response.json({ ref, count: data?.length ?? 0, episodes: data ?? [] });
    }

    if (type) {
      // Return latest episodes of a specific type
      if (!VALID_EPISODE_TYPES.includes(type as EpisodeType)) {
        return Response.json(
          { error: `Invalid episode type. Valid types: ${VALID_EPISODE_TYPES.join(', ')}` },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('property_episodes')
        .select('*')
        .eq('episode_type', type)
        .order('episode_date', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) throw error;
      return Response.json({ type, count: data?.length ?? 0, episodes: data ?? [] });
    }

    // Default: return latest episodes across all properties
    const { data, error } = await supabase
      .from('property_episodes')
      .select('*')
      .order('episode_date', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw error;
    return Response.json({ count: data?.length ?? 0, episodes: data ?? [] });
  } catch (err) {
    return Response.json(
      { error: 'Failed to fetch episodes', detail: err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'unknown' },
      { status: 500 }
    );
  }
}

// Writes are server-side only: admin token or the cron secret. (Until
// 2026-10-22 anyone could POST episodes, which then went out on this public feed.)
function canWrite(req: NextRequest): boolean {
  const auth = req.headers.get('authorization');
  if (isAdminRequest(auth)) return true;
  const cron = process.env.CRON_SECRET;
  const got = presentedSecret(auth);
  return !!cron && cron.length >= 16 && !!got && safeEqual(got, cron);
}

export async function POST(req: NextRequest) {
  if (!canWrite(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const body = await req.json() as {
      property_id?: string;
      episode_type?: string;
      before_state?: unknown;
      after_state?: unknown;
      magnitude?: number;
    };

    const { property_id, episode_type, before_state, after_state, magnitude } = body;

    if (!property_id || !episode_type) {
      return Response.json(
        { error: 'Missing required fields: property_id, episode_type' },
        { status: 400 }
      );
    }

    if (!VALID_EPISODE_TYPES.includes(episode_type as EpisodeType)) {
      return Response.json(
        { error: `Invalid episode_type. Valid types: ${VALID_EPISODE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('property_episodes')
      .insert({
        property_id,
        episode_type,
        before_state: before_state ?? null,
        after_state: after_state ?? null,
        magnitude: magnitude ?? null,
        episode_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ created: true, episode: data }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: 'Failed to create episode', detail: String(err) },
      { status: 500 }
    );
  }
}

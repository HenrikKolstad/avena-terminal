import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

const AVAILABLE_EVENTS = [
  'property.price_drop',
  'property.new_listing',
  'signal.new',
  'regime.change',
  'developer.stress_alert',
  'anomaly.detected',
  'market.weekly_summary',
] as const;

interface SubscribeRequest {
  url: string;
  events: string[];
  description?: string;
}

export async function POST(request: Request) {
  try {
    const body: SubscribeRequest = await request.json();

    if (!body.url || !body.events || !body.events.length) {
      return Response.json(
        { error: 'Missing required fields: url, events' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(body.url);
    } catch {
      return Response.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Validate event types
    const invalidEvents = body.events.filter(
      (e) => !AVAILABLE_EVENTS.includes(e as (typeof AVAILABLE_EVENTS)[number])
    );
    if (invalidEvents.length > 0) {
      return Response.json(
        { error: `Invalid event types: ${invalidEvents.join(', ')}`, available_events: AVAILABLE_EVENTS },
        { status: 400 }
      );
    }

    const secret = crypto.randomUUID();

    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .insert({
        url: body.url,
        events: body.events,
        secret,
        description: body.description || null,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select('id, events, status')
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      id: data.id,
      secret,
      events: data.events,
      status: data.status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Subscription failed';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    available_events: AVAILABLE_EVENTS.map((event) => {
      const descriptions: Record<string, string> = {
        'property.price_drop': 'Fired when a tracked property drops in price',
        'property.new_listing': 'Fired when a new property is added to the dataset',
        'signal.new': 'Fired when a new investment signal is generated',
        'regime.change': 'Fired when the market regime changes (e.g. BULL to CAUTION)',
        'developer.stress_alert': 'Fired when a developer shows financial stress indicators',
        'anomaly.detected': 'Fired when a statistical anomaly is detected in the market',
        'market.weekly_summary': 'Weekly digest of market activity and key metrics',
      };
      return { event, description: descriptions[event] || '' };
    }),
  });
}

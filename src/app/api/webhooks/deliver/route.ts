import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

interface DeliverRequest {
  event_type: string;
  payload: Record<string, unknown>;
}

interface Subscription {
  id: string;
  url: string;
  secret: string;
  events: string[];
}

async function deliverToSubscriber(
  subscription: Subscription,
  event_type: string,
  payload: Record<string, unknown>
): Promise<{ subscription_id: string; status: number | null; error: string | null }> {
  const delivery_id = crypto.randomUUID();

  try {
    const response = await fetch(subscription.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Avena-Event': event_type,
        'X-Avena-Delivery': delivery_id,
        'X-Avena-Signature': subscription.secret,
      },
      body: JSON.stringify({
        event: event_type,
        payload,
        delivered_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10000),
    });

    // Store delivery record
    if (supabase) {
      await supabase.from('webhook_deliveries').insert({
        id: delivery_id,
        subscription_id: subscription.id,
        event_type,
        payload,
        status_code: response.status,
        success: response.ok,
        delivered_at: new Date().toISOString(),
      });
    }

    return {
      subscription_id: subscription.id,
      status: response.status,
      error: null,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Delivery failed';

    // Store failed delivery
    if (supabase) {
      await supabase.from('webhook_deliveries').insert({
        id: delivery_id,
        subscription_id: subscription.id,
        event_type,
        payload,
        status_code: null,
        success: false,
        error: errorMsg,
        delivered_at: new Date().toISOString(),
      });
    }

    return {
      subscription_id: subscription.id,
      status: null,
      error: errorMsg,
    };
  }
}

export async function POST(request: Request) {
  try {
    const body: DeliverRequest = await request.json();

    if (!body.event_type || !body.payload) {
      return Response.json(
        { error: 'Missing required fields: event_type, payload' },
        { status: 400 }
      );
    }

    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Load active subscriptions matching this event type
    const { data: subscriptions, error } = await supabase
      .from('webhook_subscriptions')
      .select('id, url, secret, events')
      .eq('status', 'active');

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Filter subscriptions that are subscribed to this event type
    const matching = (subscriptions || []).filter((sub: Subscription) =>
      sub.events.includes(body.event_type)
    );

    if (matching.length === 0) {
      return Response.json({
        event_type: body.event_type,
        delivered_to: 0,
        results: [],
      });
    }

    // Deliver to all matching subscribers (non-blocking, don't fail overall)
    const results = await Promise.allSettled(
      matching.map((sub: Subscription) =>
        deliverToSubscriber(sub, body.event_type, body.payload)
      )
    );

    const deliveryResults = results.map((r) =>
      r.status === 'fulfilled'
        ? r.value
        : { subscription_id: 'unknown', status: null, error: 'Promise rejected' }
    );

    return Response.json({
      event_type: body.event_type,
      delivered_to: matching.length,
      results: deliveryResults,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook delivery failed';
    return Response.json({ error: message }, { status: 500 });
  }
}

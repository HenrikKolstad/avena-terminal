/**
 * Webhook dispatcher — institutional event subscriptions.
 *
 * Supported event types:
 *   anomaly.detected       new row in eu_anomalies
 *   anomaly.critical       new row in eu_anomalies where severity = 'critical'
 *   briefing.published     new row in sovereign_briefings (status=published)
 *   avn_id.issued          new row in avn_id_registry
 *   validation.snapshot    new row in eu_validation_snapshots
 *
 * Delivery contract:
 *   POST {subscription.url}
 *   Content-Type: application/json
 *   X-Avena-Event: <event_type>
 *   X-Avena-Signature: sha256=<hex>     (HMAC-SHA256 of raw body with secret)
 *   X-Avena-Delivery-Id: <uuid>         (idempotency key — same id may retry)
 *   User-Agent: Avena-Webhook/1.0
 *   Body: { event, timestamp, data: {...} }
 *
 * Subscribers verify the signature exactly like Stripe / GitHub webhooks.
 */

import { createHash, createHmac, randomBytes } from 'crypto';
import { supabase } from '@/lib/supabase';

export type WebhookEvent =
  | 'anomaly.detected'
  | 'anomaly.critical'
  | 'briefing.published'
  | 'avn_id.issued'
  | 'validation.snapshot';

export const SUPPORTED_EVENTS: WebhookEvent[] = [
  'anomaly.detected',
  'anomaly.critical',
  'briefing.published',
  'avn_id.issued',
  'validation.snapshot',
];

export interface SubscriptionInput {
  url: string;
  events: WebhookEvent[];
  contact_email?: string;
  organisation?: string;
}

export interface Subscription {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  contact_email: string | null;
  organisation: string | null;
  status: string;
  failure_count: number;
}

export function generateSecret(): string {
  return randomBytes(32).toString('hex');
}

export function sign(body: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

export function verifySignature(body: string, secret: string, headerValue: string): boolean {
  const expected = sign(body, secret);
  // timing-safe-ish equality (constant time matters less here because client-side, but still)
  if (expected.length !== headerValue.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ headerValue.charCodeAt(i);
  return diff === 0;
}

export async function createSubscription(input: SubscriptionInput): Promise<{ id: string; secret: string } | { error: string }> {
  if (!supabase) return { error: 'data layer unavailable' };
  if (!/^https:\/\//.test(input.url)) return { error: 'URL must be https://' };
  if (!input.events || input.events.length === 0) return { error: 'events array is required' };
  for (const e of input.events) {
    if (!SUPPORTED_EVENTS.includes(e)) return { error: `unknown event type: ${e}` };
  }
  const secret = generateSecret();
  try {
    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .insert({
        url: input.url,
        secret,
        events: input.events,
        contact_email: input.contact_email ?? null,
        organisation: input.organisation ?? null,
        status: 'active',
      })
      .select('id')
      .single();
    if (error) return { error: error.message };
    const id = (data as { id: string }).id;
    return { id, secret };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function loadActiveForEvent(eventType: WebhookEvent): Promise<Subscription[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('webhook_subscriptions')
      .select('id, url, secret, events, contact_email, organisation, status, failure_count')
      .eq('status', 'active')
      .contains('events', [eventType]);
    return (data ?? []) as Subscription[];
  } catch { return []; }
}

async function logDelivery(subId: string, eventType: WebhookEvent, payload: Record<string, unknown>, sig: string, status: number, body: string, durationMs: number, error?: string) {
  if (!supabase) return;
  try {
    await supabase.from('webhook_deliveries').insert({
      subscription_id: subId,
      event_type: eventType,
      event_payload: payload,
      signature: sig,
      http_status: status,
      response_body: body.slice(0, 1000),
      duration_ms: durationMs,
      error: error ?? null,
    });
  } catch { /* non-fatal */ }
}

async function bumpFailure(subId: string, error: string) {
  if (!supabase) return;
  try {
    // Fetch current count
    const { data } = await supabase
      .from('webhook_subscriptions')
      .select('failure_count')
      .eq('id', subId)
      .maybeSingle();
    const next = ((data as { failure_count?: number } | null)?.failure_count ?? 0) + 1;
    const updates: Record<string, unknown> = { failure_count: next, last_error: error };
    // Auto-pause after 10 consecutive failures
    if (next >= 10) updates.status = 'paused';
    await supabase.from('webhook_subscriptions').update(updates).eq('id', subId);
  } catch { /* non-fatal */ }
}

async function clearFailure(subId: string) {
  if (!supabase) return;
  try {
    await supabase.from('webhook_subscriptions')
      .update({ failure_count: 0, last_error: null, last_delivery_at: new Date().toISOString() })
      .eq('id', subId);
  } catch { /* non-fatal */ }
}

export async function deliverEvent(eventType: WebhookEvent, data: Record<string, unknown>): Promise<{ attempted: number; ok: number; failed: number }> {
  const subs = await loadActiveForEvent(eventType);
  const result = { attempted: subs.length, ok: 0, failed: 0 };
  if (subs.length === 0) return result;

  const body = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data,
  });

  for (const sub of subs) {
    const sig = sign(body, sub.secret);
    const deliveryId = createHash('sha256').update(`${sub.id}:${eventType}:${body}`).digest('hex').slice(0, 32);
    const start = Date.now();
    try {
      const res = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Avena-Event': eventType,
          'X-Avena-Signature': sig,
          'X-Avena-Delivery-Id': deliveryId,
          'User-Agent': 'Avena-Webhook/1.0',
        },
        body,
        // Cap the consumer's response time
        signal: AbortSignal.timeout(8_000),
      });
      const respBody = await res.text().catch(() => '');
      const duration = Date.now() - start;
      await logDelivery(sub.id, eventType, JSON.parse(body), sig, res.status, respBody, duration);
      if (res.ok) {
        result.ok++;
        await clearFailure(sub.id);
      } else {
        result.failed++;
        await bumpFailure(sub.id, `HTTP ${res.status}`);
      }
    } catch (e) {
      const duration = Date.now() - start;
      result.failed++;
      await logDelivery(sub.id, eventType, JSON.parse(body), sig, 0, '', duration, (e as Error).message);
      await bumpFailure(sub.id, (e as Error).message);
    }
  }
  return result;
}

export async function publicStats(): Promise<{ active_subscribers: number; events_supported: WebhookEvent[]; deliveries_24h: number; success_rate_24h: number }> {
  if (!supabase) return { active_subscribers: 0, events_supported: SUPPORTED_EVENTS, deliveries_24h: 0, success_rate_24h: 0 };
  try {
    const [{ count: active }, { data: recent }] = await Promise.all([
      supabase.from('webhook_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('webhook_deliveries').select('http_status').gte('delivered_at', new Date(Date.now() - 86_400_000).toISOString()).limit(5000),
    ]);
    const deliveries = (recent ?? []) as Array<{ http_status: number }>;
    const ok = deliveries.filter((d) => d.http_status >= 200 && d.http_status < 300).length;
    return {
      active_subscribers: active ?? 0,
      events_supported: SUPPORTED_EVENTS,
      deliveries_24h: deliveries.length,
      success_rate_24h: deliveries.length === 0 ? 1 : Number((ok / deliveries.length).toFixed(3)),
    };
  } catch {
    return { active_subscribers: 0, events_supported: SUPPORTED_EVENTS, deliveries_24h: 0, success_rate_24h: 0 };
  }
}

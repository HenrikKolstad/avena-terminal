// Lightweight client-side analytics logger
export function logEvent(event_type: string, payload: Record<string, unknown> = {}, user_email?: string) {
  try {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type, payload, user_email }),
    }).catch(() => {});
  } catch { /* never fail */ }
}

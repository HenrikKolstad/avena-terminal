import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { publicStats, SUPPORTED_EVENTS } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Webhook Subscriptions · Avena Terminal',
  description: 'Push notifications for institutional integrators. Subscribe to macro anomaly alerts, sovereign briefing publications, signed AVN-ID issuances, and cross-validation snapshots. HMAC-SHA256 signed deliveries.',
  alternates: { canonical: 'https://avenaterminal.com/docs/webhooks' },
};

const EVENT_DESCRIPTIONS: Record<string, string> = {
  'anomaly.detected':    'Any new row in eu_anomalies — z-score ≥ 2σ deviation from trailing 8-period mean. Fires on every cron tick at 06:00 UTC.',
  'anomaly.critical':    'Subset of anomaly.detected — fires only when severity = critical (≥3σ). Useful for paging escalation.',
  'briefing.published':  'New sovereign briefing volume published. Payload includes slug, title, abstract, body URL.',
  'avn_id.issued':       'New AVN-ID minted by /api/v1/avn-id/issue. Payload includes the canonical identifier + signature.',
  'validation.snapshot': 'New row in eu_validation_snapshots — Avena cohort vs official series delta. Fires daily 05:30 UTC.',
};

export default async function WebhooksDocsPage() {
  const stats = await publicStats();

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Webhooks</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Push notifications,<br />
              <span className="text-gold italic">institutionally signed.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-8">
              Register an HTTPS endpoint. Avena POSTs to it every time a new event fires — macro anomaly, sovereign briefing, signed AVN-ID, cross-validation snapshot. Every delivery is HMAC-SHA256 signed with your subscription secret. Same security contract as Stripe and GitHub webhooks.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              <Stat label="Active subscribers" value={stats.active_subscribers.toString()} />
              <Stat label="Events supported"   value={stats.events_supported.length.toString()} />
              <Stat label="Deliveries 24h"     value={stats.deliveries_24h.toString()} />
              <Stat label="Success rate 24h"   value={`${(stats.success_rate_24h * 100).toFixed(1)}%`} />
            </div>
          </div>
        </section>

        {/* Events */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Event catalogue</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Five event types live.</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {SUPPORTED_EVENTS.map((e) => (
                <div key={e} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">{e}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-success">● live</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{EVENT_DESCRIPTIONS[e]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Register */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Register a subscription</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">One POST, you&apos;re live.</h2>
            <p className="text-sm text-muted-foreground max-w-3xl mb-8 leading-relaxed">
              Send your callback URL plus the events you want. Avena returns a <code className="font-mono text-foreground">subscription_id</code> and a one-time-visible <code className="font-mono text-foreground">secret</code>. Store the secret — you&apos;ll use it to verify every signature.
            </p>

            <pre className="rounded-sm border p-5 font-mono text-xs leading-relaxed overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <code className="text-primary">{`curl -X POST https://avenaterminal.com/api/v1/subscriptions/webhooks \\
  -H 'Content-Type: application/json' \\
  -d '{
    "url": "https://your-system.example.com/webhooks/avena",
    "events": ["anomaly.critical", "briefing.published"],
    "contact_email": "ops@your-bank.eu",
    "organisation": "Example Bank EU"
  }'`}</code>
            </pre>

            <p className="mt-6 text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Response:
            </p>
            <pre className="mt-3 rounded-sm border p-5 font-mono text-xs leading-relaxed overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <code className="text-primary">{`{
  "ok": true,
  "subscription_id": "8b3c0a91-...-...",
  "secret": "9f2e7b...32-byte hex...c4d1",
  "events": ["anomaly.critical", "briefing.published"]
}`}</code>
            </pre>
          </div>
        </section>

        {/* Delivery contract */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Delivery contract</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">What every Avena POST looks like.</h2>

            <pre className="rounded-sm border p-5 font-mono text-xs leading-relaxed overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <code>{`POST /your/callback/url HTTP/1.1
Host: your-system.example.com
Content-Type: application/json
X-Avena-Event: anomaly.critical
X-Avena-Signature: sha256=4f9c8b...64-hex...e123
X-Avena-Delivery-Id: 8e2a14c5...
User-Agent: Avena-Webhook/1.0

{
  "event": "anomaly.critical",
  "timestamp": "2026-05-25T06:00:14.221Z",
  "data": {
    "country_code": "ES",
    "source": "ecb_sdw",
    "indicator_code": "MIR::M.ES.B.A2C.AM.R.A.2250.EUR.N",
    "indicator_name": "Mortgage rate — Spain, new business",
    "period": "2026-04",
    "value": 3.85,
    "z_score": 3.42,
    "severity": "critical",
    "trend": "up",
    "note": "Latest 3.85 vs trailing 8-period mean 2.41 (σ=0.42) → z-score 3.42.",
    "source_url": "https://data-api.ecb.europa.eu/service/data/MIR/..."
  }
}`}</code>
            </pre>

            <p className="mt-6 text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Return any 2xx response within 8 seconds to acknowledge. Avena increments your <code className="font-mono text-foreground">failure_count</code> on any non-2xx or timeout; after 10 consecutive failures the subscription auto-pauses.
            </p>
          </div>
        </section>

        {/* Signature verification */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Signature verification</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">Three lines in any language.</h2>

            <pre className="rounded-sm border p-5 font-mono text-xs leading-relaxed overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <code className="text-primary">{`# Node.js
import { createHmac, timingSafeEqual } from 'crypto';

function verifyAvenaWebhook(rawBody: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  return signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

# Python
import hmac, hashlib
def verify(raw_body: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)`}</code>
            </pre>

            <p className="mt-6 text-sm text-muted-foreground max-w-3xl leading-relaxed">
              If verification fails, return 401 — Avena&apos;s retry logic will respect that response and pause your subscription if it persists.
            </p>
          </div>
        </section>

        {/* Stats endpoint */}
        <section>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Health endpoint</div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-4">
              <code className="font-mono text-foreground">GET /api/v1/subscriptions/webhooks</code> returns anonymised aggregate stats (active subscriber count, supported events, 24-hour delivery success rate). No URLs, no secrets, no contact info.
            </p>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <Link href="/docs/api" className="text-foreground hover:text-primary">Full API documentation</Link> · <Link href="/alerts/macro" className="text-foreground hover:text-primary">Live anomaly feed</Link> · <a href="mailto:institutional@avenaterminal.com" className="text-foreground hover:text-primary">Institutional contact</a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-1">{label}</div>
      <div className="font-serif text-2xl font-light text-foreground tabular">{value}</div>
    </div>
  );
}

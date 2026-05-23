import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Webhooks — Real-time Property Events | Avena Terminal',
  description: 'Subscribe to real-time property market events via webhooks. Price drops, new listings, regime changes, and anomaly alerts delivered instantly.',
};

export const revalidate = 86400;

const EVENTS = [
  { name: 'property.price_drop', description: 'Fired when a tracked property drops in price', example: '{ "ref": "ALI-001", "old_price": 250000, "new_price": 225000, "change_pct": -10.0 }' },
  { name: 'property.new_listing', description: 'Fired when a new property is added to the dataset', example: '{ "ref": "ALI-042", "project": "Mar Azul III", "developer": "TM", "price": 189000 }' },
  { name: 'signal.new', description: 'Fired when a new investment signal is generated', example: '{ "signal": "BUY", "confidence": 87, "ref": "ALI-015", "reason": "Price below zone avg" }' },
  { name: 'regime.change', description: 'Market regime has changed', example: '{ "from": "BULL", "to": "CAUTION", "score": 2, "confidence": 66 }' },
  { name: 'developer.stress_alert', description: 'Developer shows financial stress indicators', example: '{ "developer": "Acme Homes", "stress_score": 78, "indicators": ["price_cuts", "slow_sales"] }' },
  { name: 'anomaly.detected', description: 'Statistical anomaly detected in the market', example: '{ "type": "EXTREME_VALUE", "ref": "ALI-099", "z_score": 3.2, "reason": "Price 3.2 SD below mean" }' },
  { name: 'market.weekly_summary', description: 'Weekly digest of market activity', example: '{ "week": "2025-W20", "new_listings": 47, "price_drops": 12, "avg_score": 58.3 }' },
];

const NODE_EXAMPLE = `const crypto = require('crypto');
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  const event = req.headers['x-avena-event'];
  const signature = req.headers['x-avena-signature'];

  // Verify signature
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expected) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  console.log(\`Received: \${event}\`, req.body.payload);
  res.json({ received: true });
});

app.listen(3000);`;

const PYTHON_EXAMPLE = `import hmac, hashlib, json
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    event = request.headers.get('X-Avena-Event')
    signature = request.headers.get('X-Avena-Signature')

    # Verify signature
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        json.dumps(request.json).encode(),
        hashlib.sha256
    ).hexdigest()

    if signature != expected:
        return jsonify(error='Invalid signature'), 401

    print(f'Received: {event}', request.json['payload'])
    return jsonify(received=True)

app.run(port=3000)`;

export default function WebhooksPage() {
  return (
    <div style={{ background: 'hsl(var(--av-background))', minHeight: '100vh', color: '#e6edf3' }}>
      {/* Header */}
      <header
        style={{ borderBottom: '1px solid hsl(var(--av-border))', padding: '20px 0' }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'serif', fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: 2 }}>
              AVENA
            </span>
            <span style={{ color: '#484f58', fontSize: 20 }}>/</span>
            <span style={{ color: '#8b949e', fontSize: 16 }}>Webhooks</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
        {/* Hero */}
        <h1 style={{ fontSize: 36, fontWeight: 700, fontFamily: 'serif', color: '#e6edf3', margin: 0 }}>
          Avena Webhooks
        </h1>
        <p style={{ fontSize: 18, color: '#8b949e', marginTop: 8, marginBottom: 48, lineHeight: 1.6 }}>
          Real-time Event Delivery. Subscribe to property market events and receive instant HTTP callbacks when prices drop, new listings appear, or market conditions shift.
        </p>

        {/* Available Events */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#e6edf3', marginBottom: 20, fontFamily: 'serif' }}>
            Available Events
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {EVENTS.map((evt) => (
              <div
                key={evt.name}
                style={{
                  background: 'hsl(var(--av-surface))',
                  border: '1px solid hsl(var(--av-border))',
                  borderRadius: 8,
                  padding: '16px 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <code style={{ color: '#c9a84c', fontSize: 14, fontWeight: 600 }}>{evt.name}</code>
                </div>
                <p style={{ color: '#8b949e', fontSize: 14, margin: '0 0 10px' }}>{evt.description}</p>
                <pre
                  style={{
                    background: 'hsl(var(--av-background))',
                    border: '1px solid hsl(var(--av-border))',
                    borderRadius: 6,
                    padding: 12,
                    fontSize: 12,
                    color: '#7ee787',
                    overflow: 'auto',
                    margin: 0,
                  }}
                >
                  {evt.example}
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* Subscribe */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#e6edf3', marginBottom: 20, fontFamily: 'serif' }}>
            Subscribe
          </h2>
          <div style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))', borderRadius: 8, padding: 24 }}>
            <p style={{ color: '#8b949e', fontSize: 14, marginTop: 0, marginBottom: 16 }}>
              Send a POST request to create a webhook subscription. You will receive a secret for signature verification.
            </p>
            <pre
              style={{
                background: 'hsl(var(--av-background))',
                border: '1px solid hsl(var(--av-border))',
                borderRadius: 6,
                padding: 16,
                fontSize: 13,
                color: '#e6edf3',
                overflow: 'auto',
                margin: 0,
              }}
            >
{`curl -X POST https://avena.sh/api/webhooks/subscribe \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["property.price_drop", "property.new_listing"],
    "description": "My price alert webhook"
  }'`}
            </pre>
            <p style={{ color: '#8b949e', fontSize: 13, marginTop: 12, marginBottom: 0 }}>
              Response:
            </p>
            <pre
              style={{
                background: 'hsl(var(--av-background))',
                border: '1px solid hsl(var(--av-border))',
                borderRadius: 6,
                padding: 16,
                fontSize: 13,
                color: '#7ee787',
                overflow: 'auto',
                marginTop: 8,
              }}
            >
{`{
  "id": "sub_abc123",
  "secret": "whsec_...",
  "events": ["property.price_drop", "property.new_listing"],
  "status": "active"
}`}
            </pre>
          </div>
        </section>

        {/* Signature Verification */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#e6edf3', marginBottom: 20, fontFamily: 'serif' }}>
            Signature Verification
          </h2>
          <div style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))', borderRadius: 8, padding: 24 }}>
            <p style={{ color: '#8b949e', fontSize: 14, marginTop: 0, marginBottom: 12 }}>
              Every webhook delivery includes an <code style={{ color: '#c9a84c' }}>X-Avena-Signature</code> header. Verify it using HMAC-SHA256 with your webhook secret to ensure the payload is authentic.
            </p>
            <div style={{ background: 'hsl(var(--av-background))', border: '1px solid hsl(var(--av-border))', borderRadius: 6, padding: 16, fontSize: 13, color: '#e6edf3' }}>
              <p style={{ margin: '0 0 8px', color: '#8b949e' }}>Headers sent with each delivery:</p>
              <code style={{ color: '#7ee787' }}>
                X-Avena-Event: property.price_drop<br />
                X-Avena-Delivery: del_xyz789<br />
                X-Avena-Signature: hmac-sha256=...
              </code>
            </div>
          </div>
        </section>

        {/* Code Examples */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#e6edf3', marginBottom: 20, fontFamily: 'serif' }}>
            Code Examples
          </h2>

          {/* Node.js */}
          <div style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))', borderRadius: 8, padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ color: '#7ee787', fontSize: 14, fontWeight: 600 }}>Node.js</span>
              <span style={{ color: '#484f58', fontSize: 12 }}>Express</span>
            </div>
            <pre
              style={{
                background: 'hsl(var(--av-background))',
                border: '1px solid hsl(var(--av-border))',
                borderRadius: 6,
                padding: 16,
                fontSize: 12,
                color: '#e6edf3',
                overflow: 'auto',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {NODE_EXAMPLE}
            </pre>
          </div>

          {/* Python */}
          <div style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))', borderRadius: 8, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ color: '#3572A5', fontSize: 14, fontWeight: 600 }}>Python</span>
              <span style={{ color: '#484f58', fontSize: 12 }}>Flask</span>
            </div>
            <pre
              style={{
                background: 'hsl(var(--av-background))',
                border: '1px solid hsl(var(--av-border))',
                borderRadius: 6,
                padding: 16,
                fontSize: 12,
                color: '#e6edf3',
                overflow: 'auto',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {PYTHON_EXAMPLE}
            </pre>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid hsl(var(--av-border))', paddingTop: 24, marginTop: 48, textAlign: 'center' }}>
          <p style={{ color: '#484f58', fontSize: 13 }}>
            Avena Terminal — Real-time property intelligence for the Spanish coast
          </p>
        </footer>
      </main>
    </div>
  );
}

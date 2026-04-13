'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DnaHelix from '@/components/DnaHelix';

const TIERS = [
  {
    id: 'free',
    name: 'FREE',
    price: 0,
    period: '',
    requests: '100/day',
    features: ['Knowledge API', 'Market stats', 'Property search (10 results)', 'APCI index'],
    cta: 'Get Free Key',
    highlight: false,
  },
  {
    id: 'starter',
    name: 'STARTER',
    price: 49,
    period: '/mo',
    requests: '1,000/day',
    features: ['Everything in FREE', 'Alpha signals', 'Yield curve data', 'Developer ratings', 'Email support'],
    cta: 'Subscribe',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 149,
    period: '/mo',
    requests: '10,000/day',
    features: ['Everything in STARTER', 'AVM valuations', 'Scenario engine', 'Forecast model', 'Webhook streams', 'Priority support'],
    cta: 'Subscribe',
    highlight: true,
  },
  {
    id: 'institutional',
    name: 'INSTITUTIONAL',
    price: 999,
    period: '/mo',
    requests: 'Unlimited',
    features: ['Everything in PRO', 'Bank AVM assessment', 'Data licensing', 'White-label feeds', 'Custom models', 'SLA guarantee', 'Dedicated account'],
    cta: 'Subscribe',
    highlight: false,
  },
];

export default function ApiAccessPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [freeKey, setFreeKey] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed') === 'true') {
      setSubscribed(true);
      window.history.replaceState({}, '', '/api-access');
    }
  }, []);

  const handleFreeKey = async () => {
    if (!email.includes('@')) return;
    setLoading('free');
    try {
      const res = await fetch('/api/v1/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tier: 'free' }),
      });
      const data = await res.json();
      if (data.key) setFreeKey(data.key);
    } catch { /* */ }
    setLoading(null);
  };

  const handlePaidTier = async (tier: string) => {
    if (!email.includes('@')) return;
    setLoading(tier);
    try {
      const res = await fetch('/api/stripe/api-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tier }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* */ }
    setLoading(null);
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <DnaHelix size={24} />
            <span className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</span>
          </Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#10b981', color: '#0d1117' }}>API ACCESS</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {subscribed && (
          <div className="rounded-lg p-4 mb-8 text-center" style={{ background: '#10b98120', border: '1px solid #10b981' }}>
            <p className="text-emerald-400 font-bold">Subscription active! Your API key has been emailed to you.</p>
          </div>
        )}

        <h1 className="text-3xl font-bold text-white mb-2 text-center">Avena Terminal API</h1>
        <p className="text-gray-400 text-sm mb-8 text-center max-w-xl mx-auto">
          Programmatic access to Europe&apos;s most advanced property intelligence. Scores, yields, valuations, signals, forecasts.
        </p>

        {/* Email input */}
        <div className="max-w-md mx-auto mb-10">
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 placeholder-gray-600 text-center"
          />
        </div>

        {/* Free key result */}
        {freeKey && (
          <div className="max-w-md mx-auto mb-8 rounded-lg p-4 text-center" style={{ background: '#161b22', border: '1px solid #10b981' }}>
            <p className="text-xs text-gray-400 mb-2">Your API key:</p>
            <p className="font-mono text-sm text-emerald-400 break-all select-all">{freeKey}</p>
            <p className="text-[10px] text-gray-600 mt-2">100 requests/day. Include as ?key= parameter or X-API-Key header.</p>
          </div>
        )}

        {/* Pricing tiers */}
        <div className="grid md:grid-cols-4 gap-4 mb-10">
          {TIERS.map(tier => (
            <div key={tier.id} className="rounded-lg p-5 flex flex-col" style={{
              background: '#161b22',
              border: tier.highlight ? '1px solid #10b981' : '1px solid #30363d',
            }}>
              {tier.highlight && <div className="text-[9px] text-center font-bold text-emerald-400 mb-2 uppercase tracking-wider">Most Popular</div>}
              <h3 className="text-white font-bold text-center">{tier.name}</h3>
              <div className="text-center my-3">
                <span className="text-3xl font-bold text-white">{tier.price === 0 ? 'Free' : `\u20AC${tier.price}`}</span>
                {tier.period && <span className="text-sm text-gray-500">{tier.period}</span>}
              </div>
              <p className="text-xs text-emerald-400 text-center mb-4">{tier.requests} requests</p>
              <ul className="text-xs text-gray-400 space-y-1.5 flex-1 mb-4">
                {tier.features.map(f => <li key={f}>&#10003; {f}</li>)}
              </ul>
              <button
                onClick={() => tier.id === 'free' ? handleFreeKey() : handlePaidTier(tier.id)}
                disabled={!email.includes('@') || loading === tier.id}
                className="w-full py-2 rounded-lg text-sm font-bold disabled:opacity-30 transition-all"
                style={{
                  background: tier.highlight ? '#10b981' : tier.id === 'free' ? '#161b22' : 'linear-gradient(135deg, #00b9ff, #9fe870)',
                  color: tier.id === 'free' ? '#10b981' : '#0d1117',
                  border: tier.id === 'free' ? '1px solid #10b981' : 'none',
                }}
              >
                {loading === tier.id ? '...' : tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Quick start */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4 text-center">Quick Start</h2>
          <div className="max-w-2xl mx-auto rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`curl "https://avenaterminal.com/api/v1/properties?region=costa-blanca&minScore=70&key=YOUR_API_KEY"

curl "https://avenaterminal.com/api/v1/apci?key=YOUR_API_KEY"

curl "https://avenaterminal.com/api/knowledge?q=best+yields+spain&key=YOUR_API_KEY"`}</pre>
          </div>
        </section>

        <div className="text-center">
          <Link href="/api/v1/docs" className="text-xs text-emerald-400 hover:underline">Full API Documentation &rarr;</Link>
        </div>

        <footer className="mt-10 text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; Europe&apos;s property intelligence API
        </footer>
      </div>
    </main>
  );
}

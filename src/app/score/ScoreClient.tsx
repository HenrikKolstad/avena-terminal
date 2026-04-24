'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Copy, Check, ArrowRight } from 'lucide-react';

interface ScoreComponent {
  code: string;
  weight: number;
  value: number;
  reasoning: string;
}

interface ScoreResponse {
  score: number;
  components: ScoreComponent[];
  pm2: number | null;
  discount_vs_market_pct: number | null;
  yield_gross_pct: number | null;
  verdict: string;
  warnings: string[];
  input: Record<string, unknown>;
  error?: string;
  hint?: string;
}

export function ScoreClient() {
  return (
    <Suspense fallback={null}>
      <ScoreClientInner />
    </Suspense>
  );
}

function ScoreClientInner() {
  const searchParams = useSearchParams();
  const [url, setUrl] = useState('');
  const autoRan = useRef(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const [mPrice, setMPrice] = useState('');
  const [mBuilt, setMBuilt] = useState('');
  const [mBeds, setMBeds] = useState('');
  const [mType, setMType] = useState('villa');
  const [mRegion, setMRegion] = useState('costa blanca');
  const [mTown, setMTown] = useState('');
  const [mBeach, setMBeach] = useState('');

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch('/api/v1/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await r.json();
      setResult(data);
      if (data.error) setManualOpen(true);
    } catch (err) {
      setResult({ error: String(err) } as ScoreResponse);
      setManualOpen(true);
    }
    setLoading(false);
  };

  const submitManual = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const price_eur = parseInt(mPrice.replace(/[^\d]/g, ''), 10);
    const built_m2 = parseInt(mBuilt.replace(/[^\d]/g, ''), 10);
    if (!price_eur || !built_m2) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch('/api/v1/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_eur,
          built_m2,
          bedrooms: mBeds ? parseInt(mBeds, 10) : undefined,
          property_type: mType,
          region: mRegion,
          town: mTown || undefined,
          beach_km: mBeach ? parseFloat(mBeach) : null,
        }),
      });
      const data = await r.json();
      setResult(data);
    } catch (err) {
      setResult({ error: String(err) } as ScoreResponse);
    }
    setLoading(false);
  };

  const inputCls = 'w-full rounded-sm border px-3 py-2 text-sm bg-transparent text-foreground focus:outline-none focus:border-primary font-mono';
  const inputStyle = { borderColor: 'hsl(var(--av-border) / 0.6)' };

  // Auto-score when URL is passed via ?url= query param
  useEffect(() => {
    if (autoRan.current) return;
    const fromQuery = searchParams.get('url');
    if (fromQuery) {
      autoRan.current = true;
      setUrl(fromQuery);
      // Fire the score request directly (avoids needing a form event)
      (async () => {
        setLoading(true);
        setResult(null);
        try {
          const r = await fetch('/api/v1/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: fromQuery }),
          });
          const data = await r.json();
          setResult(data);
          if (data.error) setManualOpen(true);
        } catch (err) {
          setResult({ error: String(err) } as ScoreResponse);
          setManualOpen(true);
        }
        setLoading(false);
      })();
    }
  }, [searchParams]);

  const copyShareUrl = async () => {
    try {
      const link = `https://avenaterminal.com/score?url=${encodeURIComponent(url)}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const scoreColor = (s: number) => {
    if (s >= 80) return 'hsl(var(--av-primary))';
    if (s >= 65) return 'hsl(var(--av-warning))';
    if (s >= 50) return 'hsl(var(--av-muted-foreground))';
    return 'hsl(var(--av-destructive))';
  };

  return (
    <section>
      <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-12">
        <form onSubmit={submit} className="mb-8">
          <div
            className="rounded-sm border p-5"
            style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-primary) / 0.35)' }}
          >
            <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
              Property URL
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.idealista.com/inmueble/..."
                autoFocus
                className="flex-1 rounded-sm border px-4 py-3 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold disabled:opacity-40"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                {loading ? 'Scoring…' : 'Score it'}
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              Works on idealista · kyero · rightmove · fotocasa · aplaceinthesun · any property listing HTML
            </p>
          </div>
        </form>

        {result && result.error && (
          <div
            className="rounded-sm border p-5 mb-6"
            style={{ background: 'hsl(var(--av-destructive) / 0.08)', borderColor: 'hsl(var(--av-destructive) / 0.4)' }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-destructive mb-2">Could not extract from URL</div>
            <p className="text-sm text-foreground mb-2">{result.error}</p>
            <p className="text-xs text-muted-foreground font-light">
              Some portals (idealista, Zillow) block automated extraction via Cloudflare. Use the manual form below — works on any property.
            </p>
          </div>
        )}

        {/* Manual fallback — always visible toggle, auto-opens on extraction failure */}
        <div
          className="rounded-sm border mb-6"
          style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          <button
            type="button"
            onClick={() => setManualOpen((v) => !v)}
            className="w-full text-left px-5 py-4 flex items-center justify-between"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
              Or score manually · always works
            </span>
            <span className="font-mono text-[10px] text-primary">{manualOpen ? '−' : '+'}</span>
          </button>
          {manualOpen && (
            <form onSubmit={submitManual} className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                <label className="block">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Price (EUR) *</div>
                  <input type="text" inputMode="numeric" required value={mPrice} onChange={(e) => setMPrice(e.target.value)} placeholder="385000" className={inputCls} style={inputStyle} />
                </label>
                <label className="block">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Built m² *</div>
                  <input type="text" inputMode="numeric" required value={mBuilt} onChange={(e) => setMBuilt(e.target.value)} placeholder="176" className={inputCls} style={inputStyle} />
                </label>
                <label className="block">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Bedrooms</div>
                  <input type="text" inputMode="numeric" value={mBeds} onChange={(e) => setMBeds(e.target.value)} placeholder="3" className={inputCls} style={inputStyle} />
                </label>
                <label className="block">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Beach distance (km)</div>
                  <input type="text" inputMode="decimal" value={mBeach} onChange={(e) => setMBeach(e.target.value)} placeholder="0.8" className={inputCls} style={inputStyle} />
                </label>
                <label className="block">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Type</div>
                  <select value={mType} onChange={(e) => setMType(e.target.value)} className={inputCls} style={inputStyle}>
                    {['villa','apartment','penthouse','townhouse','bungalow','studio'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="block">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Region</div>
                  <select value={mRegion} onChange={(e) => setMRegion(e.target.value)} className={inputCls} style={inputStyle}>
                    {['costa blanca','costa del sol','costa calida','costa brava','balearics','canary islands','algarve','lisbon','madrid metro','valencia','paris','côte d\'azur','milan','riviera'].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Town (optional)</div>
                  <input type="text" value={mTown} onChange={(e) => setMTown(e.target.value)} placeholder="Torrevieja" className={inputCls} style={inputStyle} />
                </label>
              </div>
              <button
                type="submit"
                disabled={loading || !mPrice || !mBuilt}
                className="inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold disabled:opacity-40"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                {loading ? 'Scoring…' : 'Score it'}
                <ArrowRight className="h-3 w-3" />
              </button>
            </form>
          )}
        </div>

        {result && !result.error && (
          <div className="space-y-6">
            {/* Score hero */}
            <div
              className="rounded-sm border p-8 flex flex-col sm:flex-row items-start sm:items-center gap-8"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-primary) / 0.35)' }}
            >
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                  Avena Score
                </div>
                <div className="font-serif text-7xl sm:text-8xl font-light tabular leading-none" style={{ color: scoreColor(result.score) }}>
                  {result.score}
                </div>
              </div>
              <div className="flex-1">
                <p className="font-serif text-lg text-foreground leading-relaxed">{result.verdict}</p>
                <div className="mt-4 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-[0.22em]">
                  {result.pm2 != null && <span className="text-muted-foreground">€{result.pm2.toLocaleString()}/m²</span>}
                  {result.discount_vs_market_pct != null && (
                    <span style={{ color: (result.discount_vs_market_pct ?? 0) > 0 ? 'hsl(var(--av-primary))' : 'hsl(var(--av-destructive))' }}>
                      {(result.discount_vs_market_pct ?? 0) > 0 ? '−' : '+'}{Math.abs(result.discount_vs_market_pct)}% vs market
                    </span>
                  )}
                  {result.yield_gross_pct != null && (
                    <span className="text-muted-foreground">{result.yield_gross_pct}% est. gross yield</span>
                  )}
                </div>
              </div>
              <button
                onClick={copyShareUrl}
                className="inline-flex items-center gap-2 rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Share score'}
              </button>
            </div>

            {/* Components */}
            <div
              className="rounded-sm border overflow-hidden"
              style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <div
                className="px-5 py-3 border-b font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.5)' }}
              >
                Component breakdown · auditable
              </div>
              {result.components.map((c) => (
                <div
                  key={c.code}
                  className="px-5 py-4 border-b"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-primary w-6">{c.code}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">weight {(c.weight * 100).toFixed(0)}%</span>
                    </div>
                    <span className="font-mono tabular text-sm text-foreground">{(c.value * 100).toFixed(0)}/100</span>
                  </div>
                  <div className="h-1 w-full rounded-full overflow-hidden mb-2" style={{ background: 'hsl(var(--av-border) / 0.5)' }}>
                    <div style={{ width: `${c.value * 100}%`, height: '100%', background: 'hsl(var(--av-primary))' }} />
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">{c.reasoning}</div>
                </div>
              ))}
            </div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div
                className="rounded-sm border p-4"
                style={{ background: 'hsl(var(--av-warning) / 0.08)', borderColor: 'hsl(var(--av-warning) / 0.4)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] mb-2" style={{ color: 'hsl(var(--av-warning))' }}>
                  Caveats
                </div>
                <ul className="space-y-1">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-muted-foreground font-light">· {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/#deals"
                className="inline-flex items-center rounded-sm px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Browse Avena&apos;s scored deals →
              </Link>
              <Link
                href="/research/avena-score"
                className="inline-flex items-center rounded-sm border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:border-primary"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                Research paper →
              </Link>
              <a
                href="https://github.com/avenaterminal/avena-score"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center rounded-sm border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:border-primary"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                GitHub →
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

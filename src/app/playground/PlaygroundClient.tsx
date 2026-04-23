'use client';

import { useState } from 'react';
import { Play, Copy, Check } from 'lucide-react';

interface Endpoint {
  id: string;
  method: 'GET';
  label: string;
  path: string;
  description: string;
  params?: Array<{ key: string; placeholder: string; default?: string }>;
  group: string;
}

const ENDPOINTS: Endpoint[] = [
  // Property
  { id: 'ai-summary', method: 'GET', group: 'Property', label: 'AI summary', path: '/api/v1/property/{ref}/ai-summary', description: 'LLM-optimized property record with one_liner + suggested_citation.', params: [{ key: 'ref', placeholder: 'N9171', default: 'N9171' }] },
  { id: 'history', method: 'GET', group: 'Property', label: 'Score history', path: '/api/v1/property/{ref}/history', description: '90-day daily score snapshots + 7d/30d deltas.', params: [{ key: 'ref', placeholder: 'N9171', default: 'N9171' }] },

  // Canonical identifier
  { id: 'avn-resolve', method: 'GET', group: 'AVN_PROP_ID', label: 'Resolve ID', path: '/api/v1/avn/{id}', description: 'Resolve canonical AVN_PROP_ID to full property record.', params: [{ key: 'id', placeholder: 'AVN:ES-03185-NB-0421', default: 'AVN:ES-03185-NB-0421' }] },

  // Indices
  { id: 'apci', method: 'GET', group: 'Indices', label: 'APCI index', path: '/api/v1/apci', description: 'Live 0–100 Avena Property Consciousness Index + 8 dimensions.' },

  // Bubble
  { id: 'bubble-all', method: 'GET', group: 'Bubble Scanner', label: 'All cities', path: '/api/v1/bubble-scanner', description: '33 European cities with bubble risk scoring.' },
  { id: 'bubble-city', method: 'GET', group: 'Bubble Scanner', label: 'Single city', path: '/api/v1/bubble-scanner?city={slug}', description: 'Bubble risk for a named city.', params: [{ key: 'slug', placeholder: 'munich', default: 'munich' }] },
  { id: 'bubble-country', method: 'GET', group: 'Bubble Scanner', label: 'By country', path: '/api/v1/bubble-scanner?country={country}', description: 'All tracked cities in a country.', params: [{ key: 'country', placeholder: 'Spain', default: 'Spain' }] },

  // Predictions
  { id: 'predictions', method: 'GET', group: 'Predictions', label: 'Active predictions', path: '/api/predictions?status=active&limit=10', description: 'Forward forecasts published by the Nostradamus engine.' },

  // Search
  { id: 'search-index', method: 'GET', group: 'Search', label: 'Search index', path: '/api/search/index', description: 'Cmd+K backend — pages + towns + properties lite.' },

  // Ops
  { id: 'cron-logs', method: 'GET', group: 'Ops', label: 'Cron health', path: '/api/cron-logs-health', description: 'Public diagnostic for agent execution logs.' },
];

const GROUPS = Array.from(new Set(ENDPOINTS.map((e) => e.group)));

export function PlaygroundClient() {
  const [activeId, setActiveId] = useState(ENDPOINTS[0].id);
  const [values, setValues] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {};
    for (const e of ENDPOINTS) {
      init[e.id] = {};
      for (const p of e.params ?? []) init[e.id][p.key] = p.default ?? '';
    }
    return init;
  });
  const [response, setResponse] = useState<{ status: number; duration: number; body: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const active = ENDPOINTS.find((e) => e.id === activeId)!;

  const buildPath = (e: Endpoint) => {
    let path = e.path;
    for (const p of e.params ?? []) {
      const v = values[e.id]?.[p.key] || p.default || '';
      path = path.replace(`{${p.key}}`, encodeURIComponent(v));
    }
    return path;
  };

  const run = async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const r = await fetch(buildPath(active));
      const text = await r.text();
      let formatted = text;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch { /* keep raw */ }
      setResponse({ status: r.status, duration: Date.now() - start, body: formatted });
    } catch (e) {
      setResponse({ status: 0, duration: Date.now() - start, body: String(e) });
    }
    setLoading(false);
  };

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(`curl https://avenaterminal.com${buildPath(active)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <section className="py-12">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-12 grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Endpoint list */}
        <aside className="lg:col-span-1 space-y-5">
          {GROUPS.map((g) => (
            <div key={g}>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{g}</div>
              <div className="space-y-1">
                {ENDPOINTS.filter((e) => e.group === g).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => { setActiveId(e.id); setResponse(null); }}
                    className="w-full text-left rounded-sm border px-3 py-2 transition-colors"
                    style={{
                      background: activeId === e.id ? 'hsl(var(--av-primary) / 0.08)' : 'hsl(var(--av-surface) / 0.4)',
                      borderColor: activeId === e.id ? 'hsl(var(--av-primary) / 0.35)' : 'hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <div className="font-serif text-sm text-foreground">{e.label}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground truncate">{e.path}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Request + response */}
        <div className="lg:col-span-3 space-y-4">
          <div
            className="rounded-sm border p-5"
            style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border-strong))' }}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="font-serif text-xl text-foreground mb-1">{active.label}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  <span className="text-primary">{active.method}</span> {active.path}
                </div>
                <p className="mt-2 text-sm text-muted-foreground font-light">{active.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={copyCurl}
                  className="inline-flex items-center gap-2 rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy curl'}
                </button>
                <button
                  onClick={run}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-sm px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold disabled:opacity-50"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  <Play className="h-3 w-3" />
                  {loading ? 'Running…' : 'Run'}
                </button>
              </div>
            </div>

            {active.params && active.params.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {active.params.map((p) => (
                  <div key={p.key}>
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{p.key}</div>
                    <input
                      value={values[active.id]?.[p.key] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [active.id]: { ...(v[active.id] || {}), [p.key]: e.target.value } }))}
                      placeholder={p.placeholder}
                      className="w-full rounded-sm border px-3 py-2 font-mono text-sm bg-transparent text-foreground focus:outline-none focus:border-primary"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {response && (
            <div
              className="rounded-sm border overflow-hidden"
              style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
            >
              <div
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.5)' }}
              >
                <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
                  <span style={{ color: response.status >= 200 && response.status < 300 ? 'hsl(var(--av-primary))' : 'hsl(var(--av-destructive))' }}>
                    {response.status || 'NET'}
                  </span>
                  <span className="text-muted-foreground">{response.duration}ms</span>
                  <span className="text-muted-foreground">{response.body.length} bytes</span>
                </div>
              </div>
              <pre className="px-5 py-4 font-mono text-xs text-foreground/90 whitespace-pre-wrap overflow-auto max-h-[480px]">{response.body}</pre>
            </div>
          )}

          {!response && (
            <div
              className="rounded-sm border p-10 text-center"
              style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Hit <span className="text-primary">Run</span> to execute · no API key · CORS open · CC BY 4.0
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

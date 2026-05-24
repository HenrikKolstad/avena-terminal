'use client';

import { useState } from 'react';
import type { FingerprintRow, DailyRootRow } from '@/lib/integrity';

interface VerifyResult {
  sha256_hash: string;
  matched: FingerprintRow | null;
  daily_root: DailyRootRow | null;
}

export function VerifyForm({ initial }: { initial: VerifyResult | null }) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'hash' | 'artefact'>('hash');
  const [result, setResult] = useState<VerifyResult | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const body = mode === 'hash'
        ? { sha256_hash: input.trim().toLowerCase() }
        : { artefact: JSON.parse(input) };
      const res = await fetch('/api/v1/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'verification_failed');
      setResult({ sha256_hash: data.sha256_hash, matched: data.matched, daily_root: data.daily_root });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface) / 0.4)' }}>
      <form onSubmit={submit}>
        <div className="flex gap-3 mb-3 font-mono text-[10px] uppercase tracking-[0.22em]">
          <button type="button" onClick={() => setMode('hash')} className={`px-3 py-1 rounded-sm border ${mode === 'hash' ? 'text-foreground border-primary' : 'text-muted-foreground'}`} style={{ borderColor: mode === 'hash' ? 'hsl(var(--av-primary))' : 'hsl(var(--av-border) / 0.4)' }}>SHA-256 hash</button>
          <button type="button" onClick={() => setMode('artefact')} className={`px-3 py-1 rounded-sm border ${mode === 'artefact' ? 'text-foreground border-primary' : 'text-muted-foreground'}`} style={{ borderColor: mode === 'artefact' ? 'hsl(var(--av-primary))' : 'hsl(var(--av-border) / 0.4)' }}>JSON artefact</button>
        </div>
        <label className="block mb-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground block mb-1">
            {mode === 'hash' ? 'Paste a 64-character hex SHA-256 hash' : 'Paste a JSON artefact (methodology, model output, batch)'}
          </span>
          {mode === 'hash' ? (
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. 8a3f...d92e"
              className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground font-mono outline-none focus:border-primary"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            />
          ) : (
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              rows={6}
              placeholder='{"version":"1.0.0","weights":{...}}'
              className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground font-mono outline-none focus:border-primary resize-y"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            />
          )}
        </label>
        <button type="submit" disabled={loading || !input.trim()} className="inline-flex items-center gap-2 rounded-sm px-6 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground disabled:opacity-50" style={{ background: 'var(--av-gradient-gold)' }}>
          {loading ? 'Verifying…' : 'Verify →'}
        </button>
        {error && <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-destructive">{error}</div>}
      </form>

      {result && (
        <div className="mt-6 pt-6 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-2">
            Hash: <span className="text-foreground">{result.sha256_hash}</span>
          </div>
          {result.matched ? (
            <div className="space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.32em]" style={{ color: 'hsl(var(--av-success))' }}>
                ✓ MATCH — recorded in the integrity log
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                <Row label="Type"     value={result.matched.fingerprint_type} />
                <Row label="Source"   value={`${result.matched.source_table ?? '—'}#${result.matched.source_id ?? '—'}`} />
                <Row label="Committed at" value={result.matched.committed_at} />
                <Row label="Artefact bytes" value={String(result.matched.artefact_bytes ?? '—')} />
              </div>
              {result.matched.artefact_summary && (
                <p className="text-sm text-foreground/85 italic">{result.matched.artefact_summary}</p>
              )}
              {result.daily_root ? (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Daily Merkle anchor</div>
                  <div className="font-mono text-[11px] space-y-1">
                    <div><span className="text-muted-foreground">date:</span> <span className="text-foreground tabular">{result.daily_root.root_date}</span></div>
                    <div><span className="text-muted-foreground">root:</span> <span className="text-foreground break-all">{result.daily_root.merkle_root}</span></div>
                    <div><span className="text-muted-foreground">fingerprints:</span> <span className="text-foreground tabular">{result.daily_root.fingerprint_count}</span></div>
                    {result.daily_root.zenodo_url ? (
                      <div><span className="text-muted-foreground">Zenodo:</span> <a href={result.daily_root.zenodo_url} target="_blank" rel="noopener" className="text-primary hover:underline">{result.daily_root.zenodo_deposit_id}</a></div>
                    ) : (
                      <div className="text-muted-foreground/70">Zenodo deposit pending — root will receive an RFC 3161 timestamp at deposit.</div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground italic">Recorded but not yet rolled into a daily Merkle root. The integrity-roll cron at 03:30 UTC will roll it on its next run.</p>
              )}
            </div>
          ) : (
            <div className="font-mono text-[10px] uppercase tracking-[0.32em]" style={{ color: 'hsl(var(--av-destructive))' }}>
              ✗ NO MATCH — this hash is not in the Avena integrity log
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-[9px] uppercase tracking-[0.32em]">{label}</div>
      <div className="text-foreground break-all">{value}</div>
    </div>
  );
}

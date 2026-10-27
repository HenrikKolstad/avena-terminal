'use client';

/**
 * The box. Paste a link or type a town. If the portal blocks us, we ask for
 * the two or three fields we couldn't read — never a blank error.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Fields = {
  town: string;
  type: string;
  built_m2: string;
  asking_eur: string;
  bedrooms: string;
  pool: string;
  sea_view: boolean;
  golf: boolean;
  condition: 'new' | 'resale';
  source_url?: string;
};

const TYPES = ['Villa', 'Townhouse', 'Bungalow', 'Apartment', 'Penthouse', 'Studio'];
const STEPS = ['Reading the listing', 'Finding comparable properties', 'Checking the price'];

const empty: Fields = { town: '', type: 'Villa', built_m2: '', asking_eur: '', bedrooms: '', pool: '', sea_view: false, golf: false, condition: 'new' };

export function CheckForm({ towns, prefillTown, compact }: { towns: string[]; prefillTown?: string; compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [phase, setPhase] = useState<'idle' | 'loading' | 'manual'>(prefillTown ? 'manual' : 'idle');
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Fields>({ ...empty, town: prefillTown ?? '' });
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const isUrl = (s: string) => /^https?:\/\/\S+/i.test(s.trim());

  async function submitBox(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const s = q.trim();
    if (!s) return;

    if (!isUrl(s)) {
      // A town — open the short form with it filled in.
      setF({ ...empty, town: s });
      setNote(null);
      setPhase('manual');
      return;
    }

    setPhase('loading');
    setStep(0);
    timer.current = setInterval(() => setStep((n) => Math.min(n + 1, STEPS.length - 1)), 1500);
    try {
      const res = await fetch('/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: s }) });
      const j = await res.json();
      if (j.ok && j.id) { router.push(`/r/${j.id}`); return; }
      const p = j.partial ?? {};
      setF({
        ...empty,
        town: p.town ?? '', type: p.type ?? 'Villa',
        built_m2: p.built_m2 ? String(p.built_m2) : '',
        asking_eur: p.asking_eur ? String(p.asking_eur) : '',
        bedrooms: p.bedrooms ? String(p.bedrooms) : '',
        pool: p.pool ?? '', sea_view: !!p.sea_view, golf: !!p.golf,
        source_url: s,
      });
      setNote(j.fetched
        ? `We read most of the ${j.portal ?? 'listing'} page. Fill in what's missing.`
        : `${j.portal ?? 'That site'} won't let us read the page. Fill in the basics and we'll estimate it.`);
      setPhase('manual');
    } catch {
      setNote("Couldn't reach that link. Tell us the town and size and we'll estimate.");
      setF({ ...empty, source_url: s });
      setPhase('manual');
    } finally {
      if (timer.current) { clearInterval(timer.current); timer.current = null; }
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const inputs = {
        town: f.town, type: f.type,
        built_m2: Number(f.built_m2), asking_eur: Number(String(f.asking_eur).replace(/[^\d]/g, '')),
        bedrooms: f.bedrooms ? Number(f.bedrooms) : undefined,
        pool: f.pool || undefined, sea_view: f.sea_view, golf: f.golf, source_url: f.source_url, condition: f.condition,
      };
      const res = await fetch('/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ inputs }) });
      const j = await res.json();
      if (j.ok && j.id) { router.push(`/r/${j.id}`); return; }
      const needs: string[] = j.needs ?? [];
      setErr(needs.includes('town')
        ? `We don't have data for "${f.town}" yet. Try the nearest town we cover.`
        : 'Check the size and price and try again.');
    } catch {
      setErr('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const gold = 'hsl(var(--av-primary) / 0.9)';
  const inputCls = 'w-full rounded-md border bg-transparent px-4 py-3 text-base text-foreground outline-none focus:border-[hsl(var(--av-primary))]';
  const inputStyle = { borderColor: 'hsl(var(--av-border))' };
  const labelCls = 'font-mono text-[10px] uppercase tracking-[0.3em] mb-1.5 block';
  const labelStyle = { color: 'hsl(var(--av-muted-foreground))' };

  if (phase === 'loading') {
    return (
      <div className="mx-auto max-w-[560px] py-6">
        <ul className="space-y-3 font-mono text-[12px] tracking-[0.15em]">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-3 transition-opacity" style={{ opacity: i <= step ? 1 : 0.35, color: i < step ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground))' }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: i <= step ? gold : 'hsl(var(--av-border))' }} />
              {s}{i < step ? ' ✓' : i === step ? '…' : ''}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (phase === 'manual') {
    return (
      <form onSubmit={submitManual} className="mx-auto max-w-[560px] text-left">
        {note && <p className="mb-5 text-sm" style={{ color: 'hsl(var(--av-muted-foreground))' }}>{note}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls} style={labelStyle}>Town</label>
            <input list="avena-towns" className={inputCls} style={inputStyle} value={f.town} onChange={(e) => setF({ ...f, town: e.target.value })} placeholder="Torrevieja" required autoFocus={!prefillTown} />
            <datalist id="avena-towns">{towns.map((t) => <option key={t} value={t} />)}</datalist>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Type</label>
            <select className={inputCls} style={inputStyle} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t} className="bg-[hsl(var(--av-background))]">{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Built m² <span className="opacity-50">as on the listing</span></label>
            <input inputMode="numeric" className={inputCls} style={inputStyle} value={f.built_m2} onChange={(e) => setF({ ...f, built_m2: e.target.value })} placeholder="180" required />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            {(['new', 'resale'] as const).map((c) => (
              <button key={c} type="button" onClick={() => setF({ ...f, condition: c })}
                className="flex-1 rounded-md border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em]"
                style={{ borderColor: f.condition === c ? 'hsl(var(--av-primary))' : 'hsl(var(--av-border))', color: f.condition === c ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))' }}>
                {c === 'new' ? 'New build' : 'Resale'}
              </button>
            ))}
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} style={labelStyle}>Asking price (€)</label>
            <input inputMode="numeric" className={inputCls} style={inputStyle} value={f.asking_eur} onChange={(e) => setF({ ...f, asking_eur: e.target.value })} placeholder="420000" required />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Bedrooms <span className="opacity-50">optional</span></label>
            <input inputMode="numeric" className={inputCls} style={inputStyle} value={f.bedrooms} onChange={(e) => setF({ ...f, bedrooms: e.target.value })} placeholder="3" />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Pool <span className="opacity-50">optional</span></label>
            <select className={inputCls} style={inputStyle} value={f.pool} onChange={(e) => setF({ ...f, pool: e.target.value })}>
              <option value="" className="bg-[hsl(var(--av-background))]">Don't know</option>
              <option value="private" className="bg-[hsl(var(--av-background))]">Private</option>
              <option value="communal" className="bg-[hsl(var(--av-background))]">Communal</option>
              <option value="none" className="bg-[hsl(var(--av-background))]">None</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex gap-6 font-mono text-[11px] uppercase tracking-[0.2em]" style={labelStyle}>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={f.sea_view} onChange={(e) => setF({ ...f, sea_view: e.target.checked })} /> Sea view</label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={f.golf} onChange={(e) => setF({ ...f, golf: e.target.checked })} /> Golf resort</label>
          </div>
        </div>
        {err && <p className="mt-4 text-sm" style={{ color: 'hsl(var(--av-destructive))' }}>{err}</p>}
        <div className="mt-6 flex items-center gap-4">
          <button type="submit" disabled={busy} className="rounded-md px-6 py-3 font-mono text-[12px] uppercase tracking-[0.25em] disabled:opacity-60" style={{ background: gold, color: 'hsl(var(--av-primary-foreground))' }}>
            {busy ? 'Checking…' : 'Check the price'}
          </button>
          {!compact && (
            <button type="button" onClick={() => { setPhase('idle'); setQ(''); }} className="font-mono text-[11px] uppercase tracking-[0.25em]" style={labelStyle}>Back</button>
          )}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitBox} className="mx-auto w-full max-w-[720px]">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          autoFocus
          className={inputCls + ' flex-1 min-w-0 text-[17px] sm:py-3.5'}
          style={inputStyle}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Paste an Idealista or Fotocasa link, or type a town"
          aria-label="Listing link or town"
        />
        <button type="submit" className="rounded-md px-6 py-3 font-mono text-[12px] uppercase tracking-[0.25em]" style={{ background: gold, color: 'hsl(var(--av-primary-foreground))' }}>
          Check
        </button>
      </div>
      <p className="mt-3 font-mono text-[11px] tracking-[0.2em] uppercase" style={labelStyle}>Free. Takes 5 seconds.</p>
      {err && <p className="mt-3 text-sm" style={{ color: 'hsl(var(--av-destructive))' }}>{err}</p>}
    </form>
  );
}

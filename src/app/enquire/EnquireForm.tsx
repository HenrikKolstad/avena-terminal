'use client';

/**
 * EnquireForm — the lead form (2026-07-02).
 * Pre-fills property ref/name from query params when the buyer arrives
 * from a specific deal card. Posts to /api/enquire; states are explicit.
 */

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

const BUDGETS = ['< €200k', '€200–350k', '€350–500k', '€500k–1m', '€1m+'];
const REGIONS = ['Costa Blanca', 'Costa Cálida', 'Costa del Sol', 'Other / not sure'];

const inputCls =
  'w-full rounded-sm border bg-transparent px-3.5 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40';
const inputStyle = { borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface) / 0.35)' };
const labelCls = 'block font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-2';

export function EnquireForm() {
  const params = useSearchParams();
  const propertyRef = params.get('ref') ?? '';
  const propertyName = params.get('name') ?? '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [budget, setBudget] = useState('');
  const [region, setRegion] = useState(propertyRef ? '' : '');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setErrMsg('');
    try {
      const res = await fetch('/api/enquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, phone, budget, region, message,
          property_ref: propertyRef || undefined,
          property_name: propertyName || undefined,
          company: '', // honeypot — humans leave it empty
        }),
      });
      const j = await res.json();
      if (res.ok && j.ok) setState('sent');
      else {
        setState('error');
        setErrMsg(j.error === 'valid_email_required' ? 'Please check your email address.' : 'Something went wrong — please try again or use WhatsApp below.');
      }
    } catch {
      setState('error');
      setErrMsg('Network error — please try again or use WhatsApp below.');
    }
  }

  if (state === 'sent') {
    return (
      <div className="rounded-sm border p-8 text-center" style={{ borderColor: 'hsl(var(--av-primary) / 0.5)', background: 'linear-gradient(135deg, hsl(var(--av-primary) / 0.08) 0%, transparent 60%)' }}>
        <div className="font-serif text-3xl font-light text-foreground mb-3">Enquiry received.</div>
        <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
          It has landed directly with our agent — expect to hear from us <strong className="text-foreground">within the hour</strong>. A confirmation is on its way to your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {propertyRef && (
        <div className="flex items-center gap-3 rounded-sm border px-4 py-3" style={{ borderColor: 'hsl(var(--av-primary) / 0.4)', background: 'hsl(var(--av-primary) / 0.06)' }}>
          <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'hsl(var(--av-primary))' }} />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Enquiring about <span className="text-gold">{propertyName || propertyRef}</span> · {propertyRef}
          </span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="enq-name" className={labelCls}>Name *</label>
          <input id="enq-name" required minLength={2} value={name} onChange={e => setName(e.target.value)} className={inputCls} style={inputStyle} placeholder="Your name" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="enq-email" className={labelCls}>Email *</label>
          <input id="enq-email" required type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} style={inputStyle} placeholder="you@example.com" autoComplete="email" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="enq-phone" className={labelCls}>Phone <span className="opacity-60">(optional)</span></label>
          <input id="enq-phone" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} style={inputStyle} placeholder="+31 …" autoComplete="tel" />
        </div>
        <div>
          <label className={labelCls}>Budget</label>
          <div className="flex flex-wrap gap-1.5">
            {BUDGETS.map(b => (
              <button key={b} type="button" onClick={() => setBudget(budget === b ? '' : b)}
                className="rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                style={{
                  borderColor: budget === b ? 'hsl(var(--av-primary) / 0.6)' : 'hsl(var(--av-border) / 0.6)',
                  background: budget === b ? 'hsl(var(--av-primary) / 0.12)' : 'transparent',
                  color: budget === b ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
                }}>
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!propertyRef && (
        <div>
          <label className={labelCls}>Region of interest</label>
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map(r => (
              <button key={r} type="button" onClick={() => setRegion(region === r ? '' : r)}
                className="rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                style={{
                  borderColor: region === r ? 'hsl(var(--av-primary) / 0.6)' : 'hsl(var(--av-border) / 0.6)',
                  background: region === r ? 'hsl(var(--av-primary) / 0.12)' : 'transparent',
                  color: region === r ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
                }}>
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="enq-msg" className={labelCls}>Anything else? <span className="opacity-60">(optional)</span></label>
        <textarea id="enq-msg" rows={3} value={message} onChange={e => setMessage(e.target.value)} className={inputCls} style={inputStyle} placeholder="Timeline, must-haves, questions…" />
      </div>

      {/* Honeypot — visually hidden, tab-skipped */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" onChange={() => {}} />

      {state === 'error' && (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--av-destructive))' }}>{errMsg}</p>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
        <button type="submit" disabled={state === 'sending'}
          className="inline-flex items-center justify-center gap-2 rounded-sm px-7 py-3.5 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          style={{ background: 'var(--av-gradient-gold)' }}>
          {state === 'sending' ? 'Sending…' : 'Send enquiry →'}
        </button>
        <a href={`https://wa.me/4798071453?text=${encodeURIComponent(propertyRef ? `Hi, I'm interested in ${propertyName || propertyRef} (${propertyRef}) on Avena.` : 'Hi, I found Avena and would like to talk about coastal deals.')}`}
          target="_blank" rel="noopener"
          className="inline-flex items-center justify-center gap-2 rounded-sm border px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:border-primary hover:text-primary transition-colors">
          Or chat on WhatsApp
        </a>
      </div>
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70">
        Answered by a licensed agent · typically within the hour · no spam, ever
      </p>
    </form>
  );
}

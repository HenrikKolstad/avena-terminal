'use client';

import { useState } from 'react';

export function CoFounderForm() {
  const [form, setForm] = useState({
    full_name: '',
    contact_email: '',
    linkedin_url: '',
    current_role: '',
    current_org: '',
    archetype_fit: '',
    bet_thesis: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(k: keyof typeof form, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/v1/co-founder/inquire', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Submission failed');
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-sm border p-6 max-w-3xl" style={{ borderColor: 'hsl(var(--av-success) / 0.4)', background: 'hsl(var(--av-success) / 0.05)' }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-success mb-2">Received</div>
        <h3 className="font-serif text-2xl font-light text-foreground mb-2">Henrik will reply personally within 7 days.</h3>
        <p className="text-sm text-foreground/90 leading-relaxed">
          Replies arrive from <span className="font-mono text-foreground">henrik@xaviaestate.com</span> with a calendar link and a brief read of the application. Conversations are time-bounded at 60 minutes for the first call.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-sm border p-6 max-w-3xl" style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface) / 0.4)' }}>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <Field label="Full name *">
          <input type="text" required value={form.full_name} onChange={e => patch('full_name', e.target.value)} className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
        </Field>
        <Field label="Email *">
          <input type="email" required value={form.contact_email} onChange={e => patch('contact_email', e.target.value)} placeholder="institutional@example.com" className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
        </Field>
        <Field label="LinkedIn URL">
          <input type="url" value={form.linkedin_url} onChange={e => patch('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
        </Field>
        <Field label="Current organisation">
          <input type="text" value={form.current_org} onChange={e => patch('current_org', e.target.value)} placeholder="ECB, BdE, MSCI, Bloomberg, Refinitiv…" className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
        </Field>
        <Field label="Current role" className="sm:col-span-2">
          <input type="text" value={form.current_role} onChange={e => patch('current_role', e.target.value)} placeholder="Title or honest description" className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
        </Field>
      </div>

      <Field label="Which archetype facets fit you">
        <textarea value={form.archetype_fit} onChange={e => patch('archetype_fit', e.target.value)} rows={3} placeholder="The six facets above are illustrative, not exhaustive. Describe yours honestly." className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary resize-y" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
      </Field>

      <Field label="The bet thesis (six sentences)" className="mt-3">
        <textarea required value={form.bet_thesis} onChange={e => patch('bet_thesis', e.target.value)} rows={6} placeholder="Why Avena specifically, why now, and what you specifically bring that changes the trajectory. If the answer is generic, do not submit." className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary resize-y" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
      </Field>

      {error && <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-destructive">{error}</div>}

      <button type="submit" disabled={submitting} className="mt-5 inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50" style={{ background: 'var(--av-gradient-gold)' }}>
        {submitting ? 'Sending…' : 'Submit application →'}
      </button>
    </form>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground block mb-1">{label}</span>
      {children}
    </label>
  );
}

'use client';

import { useState } from 'react';

export function AcademicForm() {
  const [form, setForm] = useState({
    researcher_name: '',
    researcher_email: '',
    institution: '',
    orcid: '',
    research_topic: '',
    expected_publication: '',
    data_scope_requested: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(k: keyof typeof form, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/v1/academic/request', {
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
        <h3 className="font-serif text-2xl font-light text-foreground mb-2">Henrik will reply personally within 5 business days.</h3>
        <p className="text-sm text-foreground/90 leading-relaxed">
          Replies arrive from <span className="font-mono text-foreground">henrik@avenaterminal.com</span> with API credentials, dataset download instructions, and a Zenodo DOI to cite in your paper. The only ask in return: a single citation line in the published work.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-sm border p-6 max-w-3xl" style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface) / 0.4)' }}>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <Field label="Full name *">
          <input type="text" required value={form.researcher_name} onChange={e => patch('researcher_name', e.target.value)} className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
        </Field>
        <Field label="Institutional email *">
          <input type="email" required value={form.researcher_email} onChange={e => patch('researcher_email', e.target.value)} placeholder="lastname@ecb.europa.eu" className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
        </Field>
        <Field label="Institution *">
          <input type="text" required value={form.institution} onChange={e => patch('institution', e.target.value)} placeholder="ECB / Bocconi / LSE / BdE / …" className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
        </Field>
        <Field label="ORCID">
          <input type="text" value={form.orcid} onChange={e => patch('orcid', e.target.value)} placeholder="0000-0000-0000-0000" className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
        </Field>
      </div>

      <Field label="Research topic *">
        <textarea required value={form.research_topic} onChange={e => patch('research_topic', e.target.value)} rows={3} placeholder="One paragraph: research question, methodology, why Avena data is the right fit." className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary resize-y" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
      </Field>

      <Field label="Expected publication venue + timeline" className="mt-3">
        <input type="text" value={form.expected_publication} onChange={e => patch('expected_publication', e.target.value)} placeholder="e.g. ECB Working Paper Q4 2026, SSRN 2026-Q3, Real Estate Economics 2027" className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
      </Field>

      <Field label="Data scope requested" className="mt-3">
        <textarea value={form.data_scope_requested} onChange={e => patch('data_scope_requested', e.target.value)} rows={2} placeholder="Optional: country, time period, property type, specific tables. If unsure, leave blank — we'll suggest a scope." className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary resize-y" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
      </Field>

      {error && <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-destructive">{error}</div>}

      <button type="submit" disabled={submitting} className="mt-5 inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50" style={{ background: 'var(--av-gradient-gold)' }}>
        {submitting ? 'Sending…' : 'Request access →'}
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

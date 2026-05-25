'use client';

import { useState } from 'react';

export function ContributeForm() {
  const [form, setForm] = useState({
    contributor_name: '',
    contributor_email: '',
    organisation: '',
    organisation_type: 'notary',
    country_iso2: '',
    data_type: 'transactions',
    estimated_record_count: '',
    proposed_terms: 'tbd',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(k: keyof typeof form, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/v1/contribute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          estimated_record_count: form.estimated_record_count ? Number(form.estimated_record_count) : undefined,
        }),
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
          Replies arrive from <span className="font-mono text-foreground">henrik@avenaterminal.com</span> with a one-page integration scoping document. Live contributors are listed publicly at <span className="font-mono text-foreground">/data-partners</span> once data is flowing.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-sm border p-6 max-w-3xl" style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface) / 0.4)' }}>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <Field label="Full name *">
          <input type="text" required value={form.contributor_name} onChange={e => patch('contributor_name', e.target.value)} className="inp" />
        </Field>
        <Field label="Email *">
          <input type="email" required value={form.contributor_email} onChange={e => patch('contributor_email', e.target.value)} className="inp" />
        </Field>
        <Field label="Organisation *">
          <input type="text" required value={form.organisation} onChange={e => patch('organisation', e.target.value)} className="inp" />
        </Field>
        <Field label="Organisation type *">
          <select required value={form.organisation_type} onChange={e => patch('organisation_type', e.target.value)} className="inp">
            <option value="notary">Notary / Notarial chamber</option>
            <option value="broker">Broker / Real-estate agency</option>
            <option value="registry">Public registry / Land registry</option>
            <option value="agency">National statistical agency</option>
            <option value="fund">Fund / Asset manager</option>
            <option value="academic">Academic institution</option>
          </select>
        </Field>
        <Field label="Country (ISO-2) *">
          <input type="text" required maxLength={2} value={form.country_iso2} onChange={e => patch('country_iso2', e.target.value.toUpperCase())} placeholder="ES / DE / FR / IT …" className="inp" />
        </Field>
        <Field label="Data type *">
          <select required value={form.data_type} onChange={e => patch('data_type', e.target.value)} className="inp">
            <option value="transactions">Transactions (closed sales)</option>
            <option value="listings">Listings (asking prices)</option>
            <option value="valuations">Valuations / Appraisals</option>
            <option value="rents">Rents / Lease data</option>
            <option value="completions">Completions / Construction</option>
          </select>
        </Field>
        <Field label="Estimated record count">
          <input type="number" value={form.estimated_record_count} onChange={e => patch('estimated_record_count', e.target.value)} placeholder="50000" className="inp" />
        </Field>
        <Field label="Proposed licensing">
          <select value={form.proposed_terms} onChange={e => patch('proposed_terms', e.target.value)} className="inp">
            <option value="tbd">To discuss</option>
            <option value="cc_by_4">CC BY 4.0 (open, attribution)</option>
            <option value="cc_by_nc">CC BY-NC 4.0 (non-commercial)</option>
            <option value="custom">Custom terms</option>
          </select>
        </Field>
      </div>

      <Field label="Description">
        <textarea value={form.description} onChange={e => patch('description', e.target.value)} rows={4} placeholder="What data do you hold? Schema, refresh cadence, anything you would want preserved in the public attribution." className="inp resize-y" />
      </Field>

      {error && <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-destructive">{error}</div>}

      <button type="submit" disabled={submitting} className="mt-5 inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50" style={{ background: 'var(--av-gradient-gold)' }}>
        {submitting ? 'Sending…' : 'Propose contribution →'}
      </button>

      <style jsx>{`
        .inp { width:100%; border-radius:2px; border:1px solid hsl(var(--av-border) / 0.6); background:transparent; padding:0.5rem 0.75rem; font-size:0.875rem; color:hsl(var(--av-foreground)); outline:none; }
        .inp:focus { border-color: hsl(var(--av-primary)); }
        .inp::placeholder { color: hsl(var(--av-muted-foreground) / 0.7); }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground block mb-1">{label}</span>
      {children}
    </label>
  );
}

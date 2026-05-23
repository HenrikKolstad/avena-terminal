'use client';

import { useState } from 'react';

const COUNTRY_OPTIONS = [
  { code: 'ES', name: 'Spain' }, { code: 'PT', name: 'Portugal' }, { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' }, { code: 'NL', name: 'Netherlands' }, { code: 'IT', name: 'Italy' },
  { code: 'GR', name: 'Greece' }, { code: 'CY', name: 'Cyprus' }, { code: 'HR', name: 'Croatia' },
  { code: 'MT', name: 'Malta' }, { code: 'AT', name: 'Austria' }, { code: 'BE', name: 'Belgium' },
  { code: 'SE', name: 'Sweden' }, { code: 'DK', name: 'Denmark' }, { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' }, { code: 'LU', name: 'Luxembourg' }, { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' }, { code: 'SK', name: 'Slovakia' }, { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' }, { code: 'BG', name: 'Bulgaria' }, { code: 'SI', name: 'Slovenia' },
  { code: 'EE', name: 'Estonia' }, { code: 'LV', name: 'Latvia' }, { code: 'LT', name: 'Lithuania' },
];

const DATA_TYPE_OPTIONS = [
  { key: 'property_listings',    label: 'Property listings' },
  { key: 'transaction_records',  label: 'Transaction records' },
  { key: 'rental_yields',        label: 'Rental yields' },
  { key: 'occupancy_rates',      label: 'Occupancy rates' },
  { key: 'construction_permits', label: 'Construction permits' },
  { key: 'price_indices',        label: 'Price indices' },
  { key: 'tourism_statistics',   label: 'Tourism statistics' },
  { key: 'mortgage_approvals',   label: 'Mortgage approvals' },
  { key: 'developer_records',    label: 'Developer records' },
  { key: 'cadastral_data',       label: 'Cadastral data' },
];

export default function PartnerApplicationForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [dataTypes, setDataTypes] = useState<string[]>([]);
  const [volume, setVolume] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; application_id?: string; errors?: string[]; error?: string } | null>(null);

  function toggle(arr: string[], val: string, setter: (a: string[]) => void) {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/v1/partners/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          contact_email: email,
          country_codes: countries,
          data_types: dataTypes,
          estimated_volume: volume ? Number(volume) : undefined,
        }),
      });
      const json = await res.json();
      setResult(json);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'network error' });
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="rounded p-6 border" style={{ borderColor: 'hsl(var(--av-success) / 0.4)', background: 'hsl(var(--av-success) / 0.06)' }}>
        <h3 className="font-serif text-xl mb-2">Application received</h3>
        <p className="text-sm text-muted-foreground mb-1">Application ID: <code className="font-mono text-primary">{result.application_id}</code></p>
        <p className="text-sm">We&apos;ve sent a confirmation to <strong>{email}</strong>. Review SLA is 48 hours — on approval you&apos;ll receive an API key and docs link.</p>
      </div>
    );
  }

  const inputStyle = { background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border))' };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Company / organisation</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" style={inputStyle} />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Contact email</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" style={inputStyle} />
        </label>
      </div>

      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Countries covered</span>
        <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
          {COUNTRY_OPTIONS.map((c) => (
            <label key={c.code} className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={countries.includes(c.code)} onChange={() => toggle(countries, c.code, setCountries)} />
              <span>{c.code} <span className="text-muted-foreground">· {c.name}</span></span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Data types</span>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DATA_TYPE_OPTIONS.map((d) => (
            <label key={d.key} className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={dataTypes.includes(d.key)} onChange={() => toggle(dataTypes, d.key, setDataTypes)} />
              <span>{d.label}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Estimated annual records (optional)</span>
        <input type="number" min={0} value={volume} onChange={(e) => setVolume(e.target.value)} className="mt-1 w-40 rounded border px-3 py-2 text-sm" style={inputStyle} placeholder="e.g. 50000" />
      </label>

      {result && !result.ok && (
        <div className="rounded border p-3 text-xs" style={{ borderColor: 'hsl(var(--av-destructive) / 0.4)', background: 'hsl(var(--av-destructive) / 0.06)', color: 'hsl(var(--av-destructive))' }}>
          {(result.errors ?? [result.error ?? 'submission failed']).map((e) => <div key={e}>· {e}</div>)}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || countries.length === 0 || dataTypes.length === 0}
        className="rounded px-6 py-2 font-mono text-xs uppercase tracking-[0.2em] disabled:opacity-50"
        style={{ background: 'hsl(var(--av-primary))', color: 'hsl(var(--av-primary-foreground))' }}
      >
        {submitting ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  );
}

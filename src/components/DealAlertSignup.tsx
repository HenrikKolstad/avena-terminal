'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';

const REGIONS = [
  { value: '', label: 'All regions' },
  { value: 'costa-del-sol', label: 'Costa del Sol' },
  { value: 'costa-blanca', label: 'Costa Blanca' },
  { value: 'algarve', label: 'Algarve' },
  { value: 'mallorca', label: 'Mallorca' },
  { value: 'tenerife', label: 'Tenerife' },
  { value: 'costa-brava', label: 'Costa Brava' },
  { value: 'ibiza', label: 'Ibiza' },
];

interface FormState {
  email: string;
  region: string;
  minYield: number;
  maxPrice: string;
  frequency: 'instant' | 'daily';
}

export default function DealAlertSignup() {
  const [form, setForm] = useState<FormState>({
    email: '',
    region: '',
    minYield: 0,
    maxPrice: '',
    frequency: 'daily',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const filters: Record<string, unknown> = {};
    if (form.region) filters.region = form.region;
    if (form.minYield > 0) filters.minYield = form.minYield;
    if (form.maxPrice && Number(form.maxPrice) > 0) {
      filters.maxPrice = Number(form.maxPrice);
    }

    try {
      const res = await fetch('/api/deal-alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          filters,
          frequency: form.frequency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please check your connection and try again.');
    }
  };

  if (status === 'success') {
    return (
      <div
        style={{
          background: '#0d0d14',
          border: '1px solid #c9a84c44',
          borderRadius: 10,
          padding: '32px 28px',
          maxWidth: 480,
          fontFamily: "'Courier New', Courier, monospace",
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          {/* Bell icon — confirmed */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c9a84c"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            <circle cx="12" cy="2" r="1" fill="#c9a84c" stroke="none" />
          </svg>
          <span style={{ color: '#c9a84c', fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>
            Alert set
          </span>
        </div>
        <p style={{ color: '#e8e8f0', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
          You&apos;ll hear from us when deals match.
        </p>
        <button
          onClick={() => setStatus('idle')}
          style={{
            background: 'transparent',
            border: '1px solid #333',
            borderRadius: 6,
            color: '#666',
            fontSize: 12,
            padding: '6px 14px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Edit alert
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#0d0d14',
        border: '1px solid #1e1e2e',
        borderRadius: 10,
        padding: '28px 24px',
        maxWidth: 480,
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#c9a84c"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span
          style={{
            color: '#c9a84c',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          Deal Alert
        </span>
      </div>

      <p style={{ color: '#888', fontSize: 12, margin: '0 0 20px', lineHeight: 1.5 }}>
        Get notified when properties matching your criteria appear or drop in price.
      </p>

      {/* Email */}
      <label style={labelStyle}>Email address</label>
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        style={inputStyle}
      />

      {/* Region */}
      <label style={labelStyle}>Region</label>
      <select
        value={form.region}
        onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
        style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
      >
        {REGIONS.map((r) => (
          <option key={r.value} value={r.value} style={{ background: '#13131f' }}>
            {r.label}
          </option>
        ))}
      </select>

      {/* Min yield slider */}
      <label style={labelStyle}>
        Minimum yield
        <span style={{ color: '#c9a84c', marginLeft: 8, fontWeight: 700 }}>
          {form.minYield > 0 ? `${form.minYield}%` : 'Any'}
        </span>
      </label>
      <input
        type="range"
        min={0}
        max={12}
        step={0.5}
        value={form.minYield}
        onChange={(e) => setForm((f) => ({ ...f, minYield: Number(e.target.value) }))}
        style={{
          width: '100%',
          marginBottom: 16,
          accentColor: '#c9a84c',
          background: 'transparent',
          cursor: 'pointer',
        }}
      />

      {/* Max price */}
      <label style={labelStyle}>Max price (€)</label>
      <input
        type="number"
        placeholder="e.g. 500000"
        min={0}
        value={form.maxPrice}
        onChange={(e) => setForm((f) => ({ ...f, maxPrice: e.target.value }))}
        style={inputStyle}
      />

      {/* Frequency toggle */}
      <label style={labelStyle}>Alert frequency</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['instant', 'daily'] as const).map((freq) => (
          <button
            key={freq}
            type="button"
            onClick={() => setForm((f) => ({ ...f, frequency: freq }))}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 6,
              border: `1px solid ${form.frequency === freq ? '#c9a84c' : '#1e1e2e'}`,
              background: form.frequency === freq ? '#c9a84c18' : 'transparent',
              color: form.frequency === freq ? '#c9a84c' : '#666',
              fontSize: 12,
              fontWeight: form.frequency === freq ? 700 : 400,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textTransform: 'capitalize',
              transition: 'all 0.15s',
            }}
          >
            {freq}
          </button>
        ))}
      </div>

      {/* Error */}
      {status === 'error' && (
        <p
          style={{
            color: '#f87171',
            fontSize: 12,
            margin: '0 0 16px',
            padding: '10px 12px',
            background: '#f8717118',
            borderRadius: 6,
            border: '1px solid #f8717133',
          }}
        >
          {errorMsg}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'loading'}
        style={{
          width: '100%',
          background: status === 'loading' ? '#8a7030' : '#c9a84c',
          color: '#0d0d14',
          border: 'none',
          borderRadius: 6,
          padding: '12px 0',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'background 0.15s',
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {status === 'loading' ? 'Setting alert...' : 'Set Alert'}
      </button>
    </form>
  );
}

// Shared styles
const labelStyle: CSSProperties = {
  display: 'block',
  color: '#888',
  fontSize: 11,
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: 6,
};

const inputStyle: CSSProperties = {
  width: '100%',
  background: '#13131f',
  border: '1px solid #1e1e2e',
  borderRadius: 6,
  color: '#e8e8f0',
  fontSize: 13,
  padding: '10px 12px',
  marginBottom: 16,
  fontFamily: "'Courier New', Courier, monospace",
  boxSizing: 'border-box',
  outline: 'none',
};

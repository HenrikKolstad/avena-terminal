'use client';

import { useEffect, useState } from 'react';

interface PartnerRow {
  id: string;
  name: string;
  contact_email: string;
  country_codes: string[] | null;
  data_types: string[] | null;
  estimated_volume: number | null;
  status: string;
  approved_at: string | null;
  created_at: string;
  api_key: string | null;
}

export default function AdminPartnersPage() {
  const [token, setToken] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('avena_admin_token');
    if (t) { setToken(t); setTokenSaved(true); }
  }, []);

  async function loadRows() {
    if (!tokenSaved) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/partners?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) setRows(json.applications);
      else setError(json.error || 'load failed');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'network error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status, tokenSaved]);

  async function act(id: string, kind: 'approve' | 'reject') {
    const res = await fetch(`/api/admin/partners/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    const json = await res.json();
    if (json.ok) { await loadRows(); alert(kind === 'approve' ? `Approved · key ${json.api_key}` : 'Rejected'); }
    else alert(json.error || 'action failed');
  }

  return (
    <div className="avena-v2 min-h-screen p-6" style={{ background: 'hsl(var(--av-background))', color: 'hsl(var(--av-foreground))' }}>
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-3xl mb-2">Admin · Federated Partners</h1>
        <p className="text-sm text-muted-foreground mb-6">Review and approve self-serve partner applications.</p>

        {!tokenSaved && (
          <div className="rounded border p-4 mb-6" style={{ borderColor: 'hsl(var(--av-border))' }}>
            <label className="block text-sm mb-2">Admin token</label>
            <div className="flex gap-2">
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} className="flex-1 rounded border px-3 py-2 text-sm" style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border))' }} placeholder="ADMIN_TOKEN" />
              <button onClick={() => { localStorage.setItem('avena_admin_token', token); setTokenSaved(true); }} className="rounded px-4 py-2 text-sm" style={{ background: 'hsl(var(--av-primary))', color: 'hsl(var(--av-primary-foreground))' }}>Save</button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'rejected'] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`rounded px-3 py-1 text-xs font-mono uppercase tracking-[0.2em] ${status === s ? 'opacity-100' : 'opacity-50'}`} style={{ background: status === s ? 'hsl(var(--av-primary))' : 'hsl(var(--av-surface))', color: status === s ? 'hsl(var(--av-primary-foreground))' : 'hsl(var(--av-foreground))' }}>{s}</button>
          ))}
        </div>

        {loading && <p className="text-sm text-muted-foreground">loading…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded border p-4" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.4)' }}>
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{r.name}</h3>
                  <p className="text-xs text-muted-foreground">{r.contact_email} · {new Date(r.created_at).toLocaleString()}</p>
                  <p className="text-xs mt-2"><span className="text-muted-foreground">Countries:</span> {(r.country_codes ?? []).join(', ')}</p>
                  <p className="text-xs"><span className="text-muted-foreground">Data types:</span> {(r.data_types ?? []).join(', ')}</p>
                  {r.estimated_volume != null && <p className="text-xs"><span className="text-muted-foreground">Volume:</span> ~{r.estimated_volume.toLocaleString()} records/yr</p>}
                  {r.api_key && <p className="text-xs mt-2"><span className="text-muted-foreground">API key:</span> <code className="font-mono text-primary">{r.api_key}</code></p>}
                </div>
                {status === 'pending' && (
                  <div className="flex gap-2 self-start">
                    <button onClick={() => act(r.id, 'approve')} className="rounded px-3 py-1 text-xs font-mono uppercase tracking-[0.2em]" style={{ background: 'hsl(var(--av-success))', color: 'white' }}>Approve</button>
                    <button onClick={() => act(r.id, 'reject')} className="rounded px-3 py-1 text-xs font-mono uppercase tracking-[0.2em] border" style={{ borderColor: 'hsl(var(--av-destructive))', color: 'hsl(var(--av-destructive))' }}>Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">No applications in {status} state.</p>}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Metrics {
  mrr: number | null;
  mrrNote: string | null;
  totalUsers: number | null;
  emailLeads: number | null;
  totalLeads: number | null;
  propertiesLive: number | null;
  soldDetected: number | null;
  lastSync: string | null;
  totalSnapshots: number | null;
  trackedProperties: number | null;
  snapshotsToday: number | null;
  soldThisWeek: number | null;
}

interface EmailLead {
  id?: string;
  email: string;
  source: string | null;
  created_at: string | null;
}

interface Lead {
  id?: string;
  created_at: string | null;
  user_email: string | null;
  property_name: string | null;
  property_ref: string | null;
  action: string | null;
}

function MetricCard({
  label,
  value,
  note,
  gold,
}: {
  label: string;
  value: string | number | null;
  note?: string | null;
  gold?: boolean;
}) {
  return (
    <div className="border border-[#1a1a2e] bg-[#0d0d14] rounded-lg p-4 flex flex-col gap-1 min-w-0">
      <span className="text-[#6b6b8a] text-xs uppercase tracking-widest font-mono">{label}</span>
      <span
        className={`text-2xl font-mono font-bold tracking-tight ${
          gold ? 'text-[#c9a84c]' : 'text-white'
        }`}
      >
        {value === null ? '—' : value}
      </span>
      {note && <span className="text-[#6b6b8a] text-xs font-mono mt-0.5">{note}</span>}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[#c9a84c] font-mono text-xs uppercase tracking-[0.2em] mb-3 mt-6 border-b border-[#1a1a2e] pb-1">
      {children}
    </h2>
  );
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    mrr: null,
    mrrNote: null,
    totalUsers: null,
    emailLeads: null,
    totalLeads: null,
    propertiesLive: null,
    soldDetected: null,
    lastSync: null,
    totalSnapshots: null,
    trackedProperties: null,
    snapshotsToday: null,
    soldThisWeek: null,
  });
  const [emailLeads, setEmailLeads] = useState<EmailLead[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Access is enforced server-side: the middleware admin gate (Basic auth,
  // ADMIN_TOKEN) and /admin/data. The browser never queries Supabase here.
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/admin/data', { cache: 'no-store', credentials: 'same-origin' });
        if (res.status === 401) { if (!cancelled) { setDenied(true); setLoading(false); } return; }
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
        if (cancelled) return;
        setMetrics(body.metrics as Metrics);
        setEmailLeads((body.emailLeads as EmailLead[]) || []);
        setLeads((body.leads as Lead[]) || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load admin data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070709] flex items-center justify-center">
        <span className="text-[#c9a84c] font-mono text-sm tracking-widest animate-pulse">
          LOADING ADMIN DATA...
        </span>
      </div>
    );
  }

  // Server refused (no or wrong admin credentials)
  if (denied) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center gap-4">
        <div className="border border-red-900/40 bg-red-950/20 rounded-lg px-8 py-6 text-center max-w-sm">
          <div className="text-red-400 font-mono text-lg font-bold tracking-widest mb-2">
            ACCESS DENIED
          </div>
          <div className="text-[#6b6b8a] font-mono text-xs">
            Admin credentials are required.
          </div>
        </div>
        <Link
          href="/"
          className="text-[#c9a84c] font-mono text-xs hover:underline tracking-widest"
        >
          ← BACK TO TERMINAL
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070709] text-gray-200 px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-[#1a1a2e] pb-4">
        <div>
          <h1 className="text-[#c9a84c] font-mono text-xl font-bold tracking-[0.15em] uppercase">
            AVENA TERMINAL — Admin
          </h1>
          <p className="text-[#6b6b8a] font-mono text-xs mt-1 tracking-widest">
            Internal metrics dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dev/links"
            className="text-primary font-mono text-xs hover:underline tracking-widest border border-primary/30 px-3 py-1.5 rounded hover:border-primary/60 transition-colors"
          >
            ALL LINKS
          </Link>
          <Link
            href="/"
            className="text-[#c9a84c] font-mono text-xs hover:underline tracking-widest border border-[#c9a84c]/30 px-3 py-1.5 rounded hover:border-[#c9a84c]/60 transition-colors"
          >
            ← BACK TO TERMINAL
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-900/50 rounded px-4 py-2 mb-4 font-mono text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <SectionHeader>Business Metrics</SectionHeader>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="MRR"
          value={metrics.mrr !== null ? `€${metrics.mrr.toLocaleString()}` : null}
          note={metrics.mrrNote}
          gold
        />
        <MetricCard label="Total Users" value={metrics.totalUsers} />
        <MetricCard label="Email Leads" value={metrics.emailLeads} />
        <MetricCard label="Total Leads" value={metrics.totalLeads} />
        <MetricCard label="Properties Live" value={metrics.propertiesLive} />
        <MetricCard label="Sold Detected" value={metrics.soldDetected} />
      </div>

      {/* Feed Health */}
      <SectionHeader>Feed Health</SectionHeader>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Last Sync"
          value={metrics.lastSync ?? '—'}
        />
        <MetricCard
          label="Total Snapshots"
          value={metrics.totalSnapshots}
        />
        <MetricCard
          label="Properties Tracked"
          value={metrics.trackedProperties}
        />
      </div>

      {/* Snapshot summary */}
      <SectionHeader>Price Snapshot Summary</SectionHeader>
      <div className="border border-[#1a1a2e] bg-[#0d0d14] rounded-lg p-4 font-mono text-sm text-[#a0a0c0]">
        <span className="text-[#c9a84c] font-bold">
          {metrics.snapshotsToday ?? '—'}
        </span>{' '}
        new snapshots today &nbsp;·&nbsp;{' '}
        <span className="text-[#c9a84c] font-bold">
          {metrics.trackedProperties ?? '—'}
        </span>{' '}
        properties tracked &nbsp;·&nbsp;{' '}
        <span className="text-[#c9a84c] font-bold">
          {metrics.soldThisWeek ?? '—'}
        </span>{' '}
        sold detected this week
      </div>

      {/* Email Leads Table */}
      <SectionHeader>Recent Email Leads (last 20)</SectionHeader>
      <div className="overflow-x-auto rounded-lg border border-[#1a1a2e]">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-[#0d0d14] text-[#6b6b8a] uppercase tracking-widest">
              <th className="px-3 py-2 text-left font-normal">Email</th>
              <th className="px-3 py-2 text-left font-normal">Source</th>
              <th className="px-3 py-2 text-left font-normal">Date</th>
            </tr>
          </thead>
          <tbody>
            {emailLeads.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-[#6b6b8a]">
                  No email leads yet
                </td>
              </tr>
            ) : (
              emailLeads.map((lead, i) => (
                <tr
                  key={i}
                  className={`border-t border-[#1a1a2e] ${
                    i % 2 === 0 ? 'bg-[#070709]' : 'bg-[#0a0a10]'
                  } hover:bg-[#0f0f1a] transition-colors`}
                >
                  <td className="px-3 py-2 text-gray-300">{lead.email}</td>
                  <td className="px-3 py-2 text-[#6b6b8a]">{lead.source ?? '—'}</td>
                  <td className="px-3 py-2 text-[#6b6b8a]">
                    {lead.created_at
                      ? new Date(lead.created_at).toLocaleDateString('en-GB')
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Leads Table */}
      <SectionHeader>Recent Leads (last 20)</SectionHeader>
      <div className="overflow-x-auto rounded-lg border border-[#1a1a2e]">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-[#0d0d14] text-[#6b6b8a] uppercase tracking-widest">
              <th className="px-3 py-2 text-left font-normal">Date</th>
              <th className="px-3 py-2 text-left font-normal">Email</th>
              <th className="px-3 py-2 text-left font-normal">Property</th>
              <th className="px-3 py-2 text-left font-normal">Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-[#6b6b8a]">
                  No leads yet
                </td>
              </tr>
            ) : (
              leads.map((lead, i) => (
                <tr
                  key={i}
                  className={`border-t border-[#1a1a2e] ${
                    i % 2 === 0 ? 'bg-[#070709]' : 'bg-[#0a0a10]'
                  } hover:bg-[#0f0f1a] transition-colors`}
                >
                  <td className="px-3 py-2 text-[#6b6b8a]">
                    {lead.created_at
                      ? new Date(lead.created_at).toLocaleDateString('en-GB')
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-300">{lead.user_email ?? '—'}</td>
                  <td className="px-3 py-2 text-[#a0a0c0] max-w-[180px] truncate">
                    {lead.property_name ?? lead.property_ref ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[#c9a84c] bg-[#c9a84c]/10 px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
                      {lead.action ?? '—'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-[#1a1a2e] text-[#3a3a5a] font-mono text-xs text-center tracking-widest">
        AVENA TERMINAL · INTERNAL · {new Date().getFullYear()}
      </div>
    </div>
  );
}

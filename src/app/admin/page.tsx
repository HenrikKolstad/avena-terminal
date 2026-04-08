'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

const ADMIN_EMAILS = ['henrik@xaviaestate.com'];

// Service role client for admin reads (env var only available server-side in prod,
// but we fall back to anon key gracefully)
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

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
  const { user, loading: authLoading } = useAuth();
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

  const isAdmin = user?.email
    ? ADMIN_EMAILS.some((e) => e.toLowerCase() === user.email!.toLowerCase())
    : false;

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) { setLoading(false); return; }

    async function fetchAll() {
      setLoading(true);
      setError(null);
      const sb = getAdminClient();
      if (!sb) {
        setError('Supabase not configured');
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Run all queries in parallel, catch each individually
      const [
        subscriptionRes,
        profilesRes,
        emailLeadsCountRes,
        leadsCountRes,
        propertiesRes,
        soldRes,
        lastSyncRes,
        totalSnapshotsRes,
        trackedRes,
        snapshotsTodayRes,
        soldWeekRes,
        emailLeadsRes,
        leadsRes,
      ] = await Promise.allSettled([
        // MRR: active subscriptions
        sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        // Total users: profiles table
        sb.from('profiles').select('*', { count: 'exact', head: true }),
        // Email leads count
        sb.from('email_leads').select('*', { count: 'exact', head: true }),
        // Leads count
        sb.from('leads').select('*', { count: 'exact', head: true }),
        // Properties live: fetch /data.json
        fetch('/data.json').then((r) => r.json()),
        // Sold detected count
        sb.from('sold_properties').select('*', { count: 'exact', head: true }),
        // Last sync
        sb.from('price_snapshots').select('snapshot_date').order('snapshot_date', { ascending: false }).limit(1),
        // Total snapshots
        sb.from('price_snapshots').select('*', { count: 'exact', head: true }),
        // Currently tracked (feed_active_refs)
        sb.from('feed_active_refs').select('*', { count: 'exact', head: true }),
        // Snapshots today
        sb.from('price_snapshots').select('*', { count: 'exact', head: true }).eq('snapshot_date', today),
        // Sold this week
        sb.from('sold_properties').select('*', { count: 'exact', head: true }).gte('last_seen_date', weekAgo),
        // Recent email leads
        sb.from('email_leads').select('email, source, created_at').order('created_at', { ascending: false }).limit(20),
        // Recent leads
        sb.from('leads').select('created_at, user_email, property_name, property_ref, action').order('created_at', { ascending: false }).limit(20),
      ]);

      // Parse MRR
      let mrr: number | null = 0;
      let mrrNote: string | null = null;
      if (subscriptionRes.status === 'fulfilled' && !subscriptionRes.value.error) {
        const count = subscriptionRes.value.count ?? 0;
        mrr = count * 79;
      } else {
        mrrNote = 'connect Stripe webhooks';
      }

      // Total users
      let totalUsers: number | null = null;
      if (profilesRes.status === 'fulfilled' && !profilesRes.value.error) {
        totalUsers = profilesRes.value.count ?? null;
      }

      // Email leads count
      let emailLeadsCount: number | null = null;
      if (emailLeadsCountRes.status === 'fulfilled' && !emailLeadsCountRes.value.error) {
        emailLeadsCount = emailLeadsCountRes.value.count ?? null;
      }

      // Leads count
      let leadsCount: number | null = null;
      if (leadsCountRes.status === 'fulfilled' && !leadsCountRes.value.error) {
        leadsCount = leadsCountRes.value.count ?? null;
      }

      // Properties live
      let propertiesLive: number | null = null;
      if (propertiesRes.status === 'fulfilled') {
        const data = propertiesRes.value;
        if (Array.isArray(data)) propertiesLive = data.length;
        else if (data?.properties && Array.isArray(data.properties)) propertiesLive = data.properties.length;
      }

      // Sold detected
      let soldDetected: number | null = null;
      if (soldRes.status === 'fulfilled' && !soldRes.value.error) {
        soldDetected = soldRes.value.count ?? null;
      }

      // Last sync
      let lastSync: string | null = null;
      if (lastSyncRes.status === 'fulfilled' && !lastSyncRes.value.error && lastSyncRes.value.data?.length) {
        lastSync = lastSyncRes.value.data[0].snapshot_date;
      }

      // Total snapshots
      let totalSnapshots: number | null = null;
      if (totalSnapshotsRes.status === 'fulfilled' && !totalSnapshotsRes.value.error) {
        totalSnapshots = totalSnapshotsRes.value.count ?? null;
      }

      // Tracked properties
      let trackedProperties: number | null = null;
      if (trackedRes.status === 'fulfilled' && !trackedRes.value.error) {
        trackedProperties = trackedRes.value.count ?? null;
      }

      // Snapshots today
      let snapshotsToday: number | null = null;
      if (snapshotsTodayRes.status === 'fulfilled' && !snapshotsTodayRes.value.error) {
        snapshotsToday = snapshotsTodayRes.value.count ?? null;
      }

      // Sold this week
      let soldThisWeek: number | null = null;
      if (soldWeekRes.status === 'fulfilled' && !soldWeekRes.value.error) {
        soldThisWeek = soldWeekRes.value.count ?? null;
      }

      // Email leads table
      if (emailLeadsRes.status === 'fulfilled' && !emailLeadsRes.value.error) {
        setEmailLeads((emailLeadsRes.value.data as EmailLead[]) || []);
      }

      // Leads table
      if (leadsRes.status === 'fulfilled' && !leadsRes.value.error) {
        setLeads((leadsRes.value.data as Lead[]) || []);
      }

      setMetrics({
        mrr,
        mrrNote,
        totalUsers,
        emailLeads: emailLeadsCount,
        totalLeads: leadsCount,
        propertiesLive,
        soldDetected,
        lastSync,
        totalSnapshots,
        trackedProperties,
        snapshotsToday,
        soldThisWeek,
      });
      setLoading(false);
    }

    fetchAll();
  }, [user, isAdmin, authLoading]);

  // Loading state
  if (authLoading || (user && isAdmin && loading)) {
    return (
      <div className="min-h-screen bg-[#070709] flex items-center justify-center">
        <span className="text-[#c9a84c] font-mono text-sm tracking-widest animate-pulse">
          LOADING ADMIN DATA...
        </span>
      </div>
    );
  }

  // Not logged in or not admin
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center gap-4">
        <div className="border border-red-900/40 bg-red-950/20 rounded-lg px-8 py-6 text-center max-w-sm">
          <div className="text-red-400 font-mono text-lg font-bold tracking-widest mb-2">
            ACCESS DENIED
          </div>
          <div className="text-[#6b6b8a] font-mono text-xs">
            {!user ? 'You must be logged in to view this page.' : 'Your account does not have admin access.'}
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
        <Link
          href="/"
          className="text-[#c9a84c] font-mono text-xs hover:underline tracking-widest border border-[#c9a84c]/30 px-3 py-1.5 rounded hover:border-[#c9a84c]/60 transition-colors"
        >
          ← BACK TO TERMINAL
        </Link>
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

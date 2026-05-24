'use client';

import { useState } from 'react';
import { Send, AtSign, Mail, Check, AlertCircle, Loader2, ChevronDown } from 'lucide-react';

interface Target {
  id: string;
  name: string;
  organisation: string;
  role: string;
  channel: 'email' | 'twitter-only';
  twitter: string | null;
  scenarioUrl: string;
  subject: string;
  body: string;
  has_email: boolean;
  email_masked: string | null;
}

interface SendResultRow {
  recipient_id: string;
  recipient_name: string;
  status: 'sent' | 'skipped' | 'error';
  resend_id?: string;
  error?: string;
}

type Status = 'idle' | 'sending' | 'sent' | 'skipped' | 'error';

export function OutreachClient({ initial }: { initial: Target[] }) {
  const [targets, setTargets] = useState<Target[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.filter(t => t.channel === 'email').map(t => t.id)));
  const [staggerMs, setStaggerMs] = useState(25_000);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [batchSending, setBatchSending] = useState(false);

  function patch(id: string, fields: Partial<Target>) {
    setTargets(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t));
  }
  function toggle(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function selectAllEmail() {
    setSelected(new Set(targets.filter(t => t.channel === 'email').map(t => t.id)));
  }
  function selectNone() { setSelected(new Set()); }

  async function sendBatch() {
    const items = targets
      .filter(t => selected.has(t.id) && t.channel === 'email')
      .map(t => ({ recipient_id: t.id, subject: t.subject, body: t.body }));
    if (items.length === 0) return;

    setBatchSending(true);
    // Mark all selected as 'sending'
    const initStatuses: Record<string, Status> = {};
    for (const it of items) initStatuses[it.recipient_id] = 'sending';
    setStatuses(prev => ({ ...prev, ...initStatuses }));

    try {
      const res = await fetch('/api/admin/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // sends the avena_admin cookie set by the gated page
        body: JSON.stringify({ items, stagger_ms: staggerMs }),
      });
      const data: { ok: boolean; results?: SendResultRow[]; error?: string } = await res.json();
      if (!data.ok && !data.results) {
        // Whole batch failed
        const next: Record<string, Status> = {};
        const nextErr: Record<string, string> = {};
        for (const it of items) {
          next[it.recipient_id] = 'error';
          nextErr[it.recipient_id] = data.error || 'send failed';
        }
        setStatuses(prev => ({ ...prev, ...next }));
        setErrors(prev => ({ ...prev, ...nextErr }));
      } else {
        const next: Record<string, Status> = {};
        const nextErr: Record<string, string> = {};
        for (const r of data.results ?? []) {
          next[r.recipient_id] = r.status;
          if (r.error) nextErr[r.recipient_id] = r.error;
        }
        setStatuses(prev => ({ ...prev, ...next }));
        setErrors(prev => ({ ...prev, ...nextErr }));
      }
    } catch (e) {
      const next: Record<string, Status> = {};
      const nextErr: Record<string, string> = {};
      for (const it of items) {
        next[it.recipient_id] = 'error';
        nextErr[it.recipient_id] = (e as Error).message;
      }
      setStatuses(prev => ({ ...prev, ...next }));
      setErrors(prev => ({ ...prev, ...nextErr }));
    } finally {
      setBatchSending(false);
    }
  }

  const emailEligible = targets.filter(t => t.channel === 'email').length;
  const twitterOnly = targets.filter(t => t.channel === 'twitter-only').length;
  const selectedCount = Array.from(selected).filter(id => targets.find(t => t.id === id)?.channel === 'email').length;
  const sentCount = Object.values(statuses).filter(s => s === 'sent').length;

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="rounded-sm border p-4 sm:p-5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.4)' }}>
        <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground mb-1">Stagger between sends (ms)</div>
            <input
              type="number" min={5000} step={5000}
              value={staggerMs} onChange={e => setStaggerMs(Math.max(5000, parseInt(e.target.value, 10) || 25_000))}
              className="w-full sm:w-64 rounded-sm border bg-transparent px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            />
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              8 recipients × {(staggerMs/1000).toFixed(0)}s = ~{Math.ceil(8 * staggerMs / 1000)}s total wall clock
            </div>
          </div>
          <button
            onClick={sendBatch}
            disabled={batchSending || selectedCount === 0}
            className="rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 inline-flex items-center justify-center gap-2"
            style={{ background: 'var(--av-gradient-gold)' }}
          >
            {batchSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {batchSending ? `Sending… (${sentCount}/${selectedCount})` : `Send all (${selectedCount})`}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
          <span><span className="text-foreground tabular">{emailEligible}</span> email · <span className="text-foreground tabular">{twitterOnly}</span> AtSign-only · <span className="text-foreground tabular">{selectedCount}</span> selected</span>
          <button onClick={selectAllEmail} className="text-primary hover:text-foreground transition-colors">select all email</button>
          <button onClick={selectNone} className="text-muted-foreground hover:text-foreground transition-colors">none</button>
          <span className="ml-auto">Reply-to your personal email · sends via Resend · logged to <span className="text-foreground">outreach_emails</span></span>
        </div>
      </div>

      {/* Recipient cards */}
      <div className="grid lg:grid-cols-2 gap-3">
        {targets.map(t => {
          const isExpanded = expandedId === t.id;
          const status = statuses[t.id] ?? 'idle';
          const isSelectable = t.channel === 'email';
          const isSelected = selected.has(t.id);

          const statusBadge =
            status === 'sent' ? { label: 'sent', colour: 'hsl(var(--av-success))', icon: <Check className="h-3 w-3" /> } :
            status === 'sending' ? { label: 'sending…', colour: 'hsl(var(--av-primary))', icon: <Loader2 className="h-3 w-3 animate-spin" /> } :
            status === 'error' ? { label: 'error', colour: 'hsl(var(--av-destructive))', icon: <AlertCircle className="h-3 w-3" /> } :
            status === 'skipped' ? { label: 'skipped', colour: 'hsl(var(--av-muted-foreground))', icon: null } :
            null;

          return (
            <div key={t.id} className="rounded-sm border p-4" style={{
              borderColor: isSelected && isSelectable ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border))',
              background: isSelected && isSelectable ? 'hsl(var(--av-primary) / 0.04)' : 'hsl(var(--av-surface) / 0.3)',
            }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                  {isSelectable ? (
                    <input
                      type="checkbox" checked={isSelected} onChange={() => toggle(t.id)}
                      className="mt-1 accent-primary cursor-pointer shrink-0"
                    />
                  ) : (
                    <span className="mt-1 shrink-0"><AtSign className="h-3.5 w-3.5 text-primary" /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-base text-foreground truncate">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{t.role}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary mt-1 truncate">{t.organisation}</div>
                  </div>
                </label>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge && (
                    <span className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: statusBadge.colour, border: `1px solid ${statusBadge.colour}66` }}>
                      {statusBadge.icon} {statusBadge.label}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono mb-3">
                {t.channel === 'email' ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground"><Mail className="h-2.5 w-2.5" /> {t.email_masked}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground"><AtSign className="h-2.5 w-2.5" /> {t.twitter} (DM only)</span>
                )}
                <span className="text-muted-foreground/50">·</span>
                <a href={t.scenarioUrl} target="_blank" rel="noopener" className="text-primary hover:text-foreground transition-colors truncate">view scenario →</a>
              </div>

              <button
                onClick={() => setExpandedId(isExpanded ? null : t.id)}
                className="w-full inline-flex items-center justify-between rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}
              >
                {isExpanded ? 'Hide draft' : 'Edit draft'} <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="mt-3 space-y-2">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Subject</div>
                    <input
                      type="text" value={t.subject}
                      onChange={e => patch(t.id, { subject: e.target.value })}
                      className="w-full rounded-sm border bg-transparent px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
                    />
                  </div>
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Body</div>
                    <textarea
                      value={t.body} onChange={e => patch(t.id, { body: e.target.value })}
                      rows={Math.min(20, Math.max(8, t.body.split('\n').length))}
                      className="w-full rounded-sm border bg-transparent px-3 py-2 text-[11px] text-foreground/95 font-mono outline-none focus:border-primary leading-relaxed resize-y"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
                    />
                  </div>
                </div>
              )}

              {errors[t.id] && (
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-destructive">{errors[t.id]}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer help */}
      <div className="rounded-sm border p-4 text-xs text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.2)' }}>
        <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-primary block mb-2">Sending discipline</span>
        Resend fires each selected recipient with the configured stagger between sends (default 90 seconds). At 10 recipients × 90s that&apos;s a 15-minute total wall clock. Replies route to your personal Reply-To. AtSign-only recipients are excluded from the batch — open their scenario URL, copy the body, paste into a AtSign DM manually.
      </div>
    </div>
  );
}

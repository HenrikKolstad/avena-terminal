'use client';

import { useState } from 'react';
import { Mail, AtSign, Copy, Check, ChevronDown, ExternalLink } from 'lucide-react';

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
  email: string | null;
  email_masked: string | null;
}

/**
 * Builds a mailto: URL that opens the user's default mail client with the
 * recipient, subject, and body pre-filled. Encoding is RFC 6068:
 *   line breaks → %0A
 *   spaces → %20
 *   special chars → percent-encoded via encodeURIComponent.
 */
function mailtoLink(to: string, subject: string, body: string): string {
  const enc = (s: string) => encodeURIComponent(s).replace(/'/g, '%27');
  return `mailto:${to}?subject=${enc(subject)}&body=${enc(body)}`;
}

export function OutreachClient({ initial }: { initial: Target[] }) {
  const [targets, setTargets] = useState<Target[]>(initial);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());

  function patch(id: string, fields: Partial<Target>) {
    setTargets(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t));
  }

  function copyBody(t: Target) {
    const text = `Subject: ${t.subject}\n\n${t.body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(t.id);
      setTimeout(() => setCopiedId(null), 1800);
    }).catch(() => null);
  }

  function markOpened(id: string) {
    setOpenedIds(prev => new Set(prev).add(id));
  }

  const emailEligible = targets.filter(t => t.channel === 'email').length;
  const twitterOnly = targets.filter(t => t.channel === 'twitter-only').length;
  const openedCount = openedIds.size;

  return (
    <div className="space-y-4">
      {/* Control bar — progress + instructions */}
      <div className="rounded-sm border p-4 sm:p-5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.4)' }}>
        <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-2">How this works</div>
            <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed">
              Each card has an <span className="font-mono text-foreground">Open in mail</span> button. Click it → your default mail client (Gmail / Outlook / Mail.app) opens with the recipient, subject, and body pre-filled. Review, edit if needed, click Send in your mail client. <span className="text-primary">No data leaves Avena.</span>
            </p>
          </div>
          <div className="rounded-sm border px-4 py-3 text-center" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-background) / 0.5)' }}>
            <div className="font-serif text-2xl font-light text-foreground tabular leading-none">{openedCount} / {emailEligible}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">Opened this session</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
          <span><span className="text-foreground tabular">{emailEligible}</span> email · <span className="text-foreground tabular">{twitterOnly}</span> Twitter DM (copy-only)</span>
        </div>
      </div>

      {/* Recipient cards */}
      <div className="grid lg:grid-cols-2 gap-3">
        {targets.map(t => {
          const isExpanded = expandedId === t.id;
          const isOpened = openedIds.has(t.id);
          const isCopied = copiedId === t.id;
          const mailHref = t.channel === 'email' && t.email ? mailtoLink(t.email, t.subject, t.body) : null;

          return (
            <div key={t.id} className="rounded-sm border p-4" style={{
              borderColor: isOpened ? 'hsl(var(--av-success) / 0.5)' : 'hsl(var(--av-border))',
              background: isOpened ? 'hsl(var(--av-success) / 0.05)' : 'hsl(var(--av-surface) / 0.3)',
            }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="mt-1 shrink-0">
                    {t.channel === 'email'
                      ? <Mail className="h-3.5 w-3.5 text-primary" />
                      : <AtSign className="h-3.5 w-3.5 text-primary" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-base text-foreground truncate">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{t.role}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary mt-1 truncate">{t.organisation}</div>
                  </div>
                </div>
                {isOpened && (
                  <span className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--av-success))', border: '1px solid hsl(var(--av-success) / 0.5)' }}>
                    <Check className="h-2.5 w-2.5" /> opened
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono mb-3">
                {t.channel === 'email' ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground"><Mail className="h-2.5 w-2.5" /> {t.email_masked}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground"><AtSign className="h-2.5 w-2.5" /> {t.twitter}</span>
                )}
                <span className="text-muted-foreground/50">·</span>
                <a href={t.scenarioUrl} target="_blank" rel="noopener" className="text-primary hover:text-foreground transition-colors truncate">scenario →</a>
              </div>

              {/* Primary action — open in mail OR copy text for DM */}
              {mailHref ? (
                <a
                  href={mailHref}
                  onClick={() => markOpened(t.id)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  <ExternalLink className="h-3 w-3" /> Open in mail
                </a>
              ) : (
                <button
                  onClick={() => copyBody(t)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  {isCopied ? <><Check className="h-3 w-3" /> Copied — paste into Twitter DM</> : <><Copy className="h-3 w-3" /> Copy DM text</>}
                </button>
              )}

              {/* Secondary actions */}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                  className="inline-flex items-center justify-center gap-1 rounded-sm border px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}
                >
                  {isExpanded ? 'hide' : 'edit'} draft <ChevronDown className={`h-2.5 w-2.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                <button
                  onClick={() => copyBody(t)}
                  className="inline-flex items-center justify-center gap-1 rounded-sm border px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}
                >
                  {isCopied ? <><Check className="h-2.5 w-2.5" /> copied</> : <><Copy className="h-2.5 w-2.5" /> copy</>}
                </button>
              </div>

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
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                    Edits live in this session only — Open in mail uses the edited version.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-sm border p-4 text-xs text-muted-foreground leading-relaxed" style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.2)' }}>
        <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-primary block mb-2">Workflow</span>
        Click <span className="font-mono text-foreground">Open in mail</span> on each card. Your default client (Gmail web, Mail.app, Outlook) launches with everything filled. Review, edit if you spot anything, click Send in your client. Send from <span className="font-mono text-foreground">henrik@xaviaestate.com</span> for warm institutional vibe. The two Twitter-only cards get a Copy button instead — paste into the DM yourself. No emails leave Avena&apos;s servers; everything goes through your own inbox.
      </div>
    </div>
  );
}


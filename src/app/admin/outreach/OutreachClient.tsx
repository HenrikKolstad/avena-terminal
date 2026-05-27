'use client';

import { useMemo, useState } from 'react';
import { Mail, AtSign, Copy, Check, ChevronDown, ExternalLink, Search } from 'lucide-react';

type Category =
  | 'academic'
  | 'multilateral'
  | 'regulator'
  | 'insurer'
  | 'notarial'
  | 'bank'
  | 'sovereign'
  | 'ai_lab'
  | 'journalist';

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
  category: Category | null;
  lookup_query: string | null;
}

const CATEGORY_LABEL: Record<Category, string> = {
  academic:     'Academics',
  multilateral: 'Multilaterals',
  regulator:    'Regulators',
  insurer:      'Insurers',
  notarial:     'Notarial / Registry',
  bank:         'Banks',
  sovereign:    'Sovereign / Pension',
  ai_lab:       'AI Labs',
  journalist:   'Journalists',
};

const CATEGORY_ORDER: Category[] = [
  'academic', 'multilateral', 'regulator', 'insurer',
  'notarial', 'bank', 'sovereign', 'ai_lab', 'journalist',
];

const CATEGORY_RATIONALE: Record<Category, string> = {
  academic:     'Citation → diligence-grade credibility. Easiest reply, biggest signal.',
  multilateral: 'IMF / BIS / OECD researchers. No procurement, fast cite path.',
  regulator:    'Technical staff who consume data + write rules. Designated-authority tier.',
  insurer:      'Underrated, paying customer category. Less competition than banks.',
  notarial:     'Ecosystem partners. Each landed integration is a permanent data moat.',
  bank:         'Hardest to land, biggest revenue. Target risk modelling teams (not C-suite).',
  sovereign:    'NBIM, GIC, APG, ADIA, Alecta — large allocator deployment infrastructure.',
  ai_lab:       'MCP distribution. Citation standard adoption.',
  journalist:   'Amplifier. Parallel track. Warm relationships compound.',
};

/**
 * Builds a mailto: URL that opens the user's default mail client with the
 * recipient, subject, and body pre-filled. Encoding is RFC 6068:
 *   line breaks → %0A · spaces → %20 · special chars → percent-encoded.
 */
function mailtoLink(to: string, subject: string, body: string): string {
  const enc = (s: string) => encodeURIComponent(s).replace(/'/g, '%27');
  return `mailto:${to}?subject=${enc(subject)}&body=${enc(body)}`;
}

function googleSearchLink(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function linkedinSearchLink(query: string): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
}

export function OutreachClient({ initial }: { initial: Target[] }) {
  const [targets, setTargets] = useState<Target[]>(initial);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all' | 'lookup'>('all');

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

  const countsByCategory = useMemo(() => {
    const out: Record<string, number> = { all: targets.length, lookup: 0 };
    for (const t of targets) {
      const k = t.category ?? 'uncategorised';
      out[k] = (out[k] ?? 0) + 1;
      if (t.channel === 'email' && !t.has_email) out.lookup++;
    }
    return out;
  }, [targets]);

  const filteredTargets = useMemo(() => {
    if (selectedCategory === 'all') return targets;
    if (selectedCategory === 'lookup') return targets.filter(t => t.channel === 'email' && !t.has_email);
    return targets.filter(t => t.category === selectedCategory);
  }, [targets, selectedCategory]);

  const emailEligibleVisible = filteredTargets.filter(t => t.channel === 'email' && t.has_email).length;
  const lookupVisible = filteredTargets.filter(t => t.channel === 'email' && !t.has_email).length;
  const twitterVisible = filteredTargets.filter(t => t.channel === 'twitter-only').length;
  const openedCount = openedIds.size;

  return (
    <div className="space-y-4">
      {/* Control bar — progress + instructions */}
      <div className="rounded-sm border p-4 sm:p-5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.4)' }}>
        <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-2">How this works</div>
            <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed">
              Each card has an <span className="font-mono text-foreground">Open in mail</span> button. Click → your default mail client opens with subject + body pre-filled. Edit if needed, click Send. <span className="text-primary">Nothing leaves Avena until you press Send in your own client.</span> For cards without a known email, the <span className="font-mono text-foreground">Look up</span> button opens a pre-built Google / LinkedIn search.
            </p>
          </div>
          <div className="rounded-sm border px-4 py-3 text-center" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-background) / 0.5)' }}>
            <div className="font-serif text-2xl font-light text-foreground tabular leading-none">{openedCount} / {targets.filter(t => t.channel === 'email' && t.has_email).length}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">Opened this session</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
          <span><span className="text-foreground tabular">{targets.length}</span> total · <span className="text-foreground tabular">{targets.filter(t => t.has_email).length}</span> with email · <span className="text-foreground tabular">{countsByCategory.lookup}</span> need lookup</span>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
        <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground mb-3">Filter by category</div>
        <div className="flex flex-wrap gap-2">
          <Pill label={`All · ${countsByCategory.all}`} active={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')} />
          {CATEGORY_ORDER.map(c => {
            const count = countsByCategory[c] ?? 0;
            if (count === 0) return null;
            return (
              <Pill key={c} label={`${CATEGORY_LABEL[c]} · ${count}`} active={selectedCategory === c} onClick={() => setSelectedCategory(c)} />
            );
          })}
          {countsByCategory.lookup > 0 && (
            <Pill label={`Need email lookup · ${countsByCategory.lookup}`} active={selectedCategory === 'lookup'} onClick={() => setSelectedCategory('lookup')} warn />
          )}
        </div>

        {selectedCategory !== 'all' && selectedCategory !== 'lookup' && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
            <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-gold mb-1">Why this category</div>
            <p className="text-xs text-foreground/85 leading-relaxed">{CATEGORY_RATIONALE[selectedCategory]}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
          Showing <span className="text-foreground tabular">{filteredTargets.length}</span> ·
          <span><span className="text-foreground tabular">{emailEligibleVisible}</span> ready-to-send</span> ·
          <span><span className="text-foreground tabular">{lookupVisible}</span> need lookup</span>
          {twitterVisible > 0 && <span>· <span className="text-foreground tabular">{twitterVisible}</span> twitter DM</span>}
        </div>
      </div>

      {/* Recipient cards */}
      <div className="grid lg:grid-cols-2 gap-3">
        {filteredTargets.map(t => {
          const isExpanded = expandedId === t.id;
          const isOpened = openedIds.has(t.id);
          const isCopied = copiedId === t.id;
          const needsLookup = t.channel === 'email' && !t.has_email;
          const mailHref = t.channel === 'email' && t.email ? mailtoLink(t.email, t.subject, t.body) : null;
          const lookupHref = t.lookup_query
            ? (t.lookup_query.toLowerCase().includes('linkedin')
                ? linkedinSearchLink(t.lookup_query.replace(/linkedin:?\s*/i, ''))
                : googleSearchLink(t.lookup_query))
            : googleSearchLink(`${t.name} ${t.organisation} email contact`);

          return (
            <div key={t.id} className="rounded-sm border p-4" style={{
              borderColor: isOpened ? 'hsl(var(--av-success) / 0.5)' : needsLookup ? 'hsl(var(--av-warning) / 0.5)' : 'hsl(var(--av-border))',
              background: isOpened ? 'hsl(var(--av-success) / 0.05)' : needsLookup ? 'hsl(var(--av-warning) / 0.04)' : 'hsl(var(--av-surface) / 0.3)',
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
                <div className="flex flex-col gap-1 items-end shrink-0">
                  {t.category && (
                    <span className="inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.22em] text-muted-foreground border" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
                      {CATEGORY_LABEL[t.category]}
                    </span>
                  )}
                  {isOpened && (
                    <span className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--av-success))', border: '1px solid hsl(var(--av-success) / 0.5)' }}>
                      <Check className="h-2.5 w-2.5" /> opened
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono mb-3">
                {t.channel === 'email' ? (
                  t.email_masked ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><Mail className="h-2.5 w-2.5" /> {t.email_masked}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1" style={{ color: 'hsl(var(--av-warning))' }}><Search className="h-2.5 w-2.5" /> email lookup needed</span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground"><AtSign className="h-2.5 w-2.5" /> {t.twitter}</span>
                )}
                <span className="text-muted-foreground/50">·</span>
                <a href={t.scenarioUrl} target="_blank" rel="noopener" className="text-primary hover:text-foreground transition-colors truncate">scenario →</a>
              </div>

              {/* Primary action */}
              {mailHref ? (
                <a
                  href={mailHref}
                  onClick={() => markOpened(t.id)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  <ExternalLink className="h-3 w-3" /> Open in mail
                </a>
              ) : needsLookup ? (
                <a
                  href={lookupHref}
                  target="_blank"
                  rel="noopener"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-sm border px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] hover:text-foreground transition-colors"
                  style={{ borderColor: 'hsl(var(--av-warning) / 0.5)', color: 'hsl(var(--av-warning))' }}
                >
                  <Search className="h-3 w-3" /> Look up email
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
                  {needsLookup && (
                    <div className="rounded-sm border p-2 text-[11px]" style={{ borderColor: 'hsl(var(--av-warning) / 0.4)', background: 'hsl(var(--av-warning) / 0.06)' }}>
                      <div className="font-mono text-[9px] uppercase tracking-[0.22em] mb-1" style={{ color: 'hsl(var(--av-warning))' }}>Email needed</div>
                      <div className="text-foreground/85 leading-relaxed">Search: <span className="font-mono">{t.lookup_query ?? `${t.name} ${t.organisation} email`}</span></div>
                      <input
                        type="email"
                        placeholder="paste discovered email here"
                        onChange={e => patch(t.id, { email: e.target.value, has_email: !!e.target.value, email_masked: e.target.value ? `${e.target.value.split('@')[0][0]}***@${e.target.value.split('@')[1] ?? ''}` : null })}
                        className="mt-2 w-full rounded-sm border bg-transparent px-2 py-1.5 text-xs text-foreground font-mono outline-none focus:border-primary"
                        style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
                      />
                    </div>
                  )}
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
        <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-primary block mb-2">Workflow at scale</span>
        Filter by category. Start with Academics (lowest friction, highest credibility-per-reply). Move through Multilaterals → Regulators → Insurers → Notarials → Banks → Sovereigns → AI labs → Journalists. For cards marked &quot;Need email lookup&quot;, the Look-up button opens a pre-built Google/LinkedIn search; paste the email into the edit drawer and the mailto link goes live. Send from <span className="font-mono text-foreground">henrik@xaviaestate.com</span>. Nothing leaves Avena&apos;s servers — every send goes through your own inbox.
      </div>
    </div>
  );
}

function Pill({ label, active, onClick, warn = false }: { label: string; active: boolean; onClick: () => void; warn?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] transition-colors"
      style={{
        background: active ? 'var(--av-gradient-gold)' : 'transparent',
        color: active ? 'hsl(var(--av-primary-foreground))' : warn ? 'hsl(var(--av-warning))' : 'hsl(var(--av-muted-foreground))',
        borderColor: active ? 'transparent' : warn ? 'hsl(var(--av-warning) / 0.4)' : 'hsl(var(--av-border) / 0.5)',
      }}
    >
      {label}
    </button>
  );
}

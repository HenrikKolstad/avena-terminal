'use client';

/**
 * Avena Concierge (2026-08-05) — the floating property advisor.
 *
 * Collapsed: an "ASK AVENA" pill + antique-gold monogram button, bottom-right.
 * Expanded: a dark, gold-bordered panel with a server-driven conversation.
 * Every answer round-trips /api/concierge (deterministic extraction + real
 * inventory search) — no property fact is ever generated client-side.
 *
 * Suggested replies render as SUGGESTIONS (gold ghost chips) and only become
 * user messages when clicked — the conversation never pretends the visitor
 * wrote something they didn't.
 *
 * Session persistence: conversation + dismissal in sessionStorage.
 * Leads: POST /api/enquire (the existing store-first money wire).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { track } from '@vercel/analytics';

interface Card {
  propertyId: string; slug: string; name: string; location: string;
  imageUrl: string | null; priceFrom: number; bedrooms: number | null;
  completion: string | null; avenaScore: number | null; matchReasons: string[];
}
type Msg =
  | { role: 'assistant' | 'user'; text: string }
  | { role: 'cards'; cards: Card[]; note?: string };

const SS_KEY = 'av_concierge_v1';
const SS_DISMISS = 'av_concierge_dismissed';
// Set when the visitor explicitly closes the panel — the auto-popup respects
// that for the rest of the session (cleared if they reopen it themselves).
const SS_CLOSED = 'av_concierge_closed';

// ── Showcase mode (per Henrik's homepage mockup, 2026-08-05) ────────────────
// On a fresh desktop visit the panel opens pre-filled with this example
// conversation. The user turns are scripted; the assistant's "found" line and
// the three property cards come from the REAL engine — the same API call a
// visitor's own answers would trigger. Nothing about the properties is staged.
const SHOWCASE_GREETING = 'Welcome. Where in Spain are you looking?';
const SHOWCASE_U1 = 'Costa del Sol, near the sea. Up to €650,000.';
const SHOWCASE_U2 = 'Both — ready within 12 months.';
const GOLD = 'hsl(var(--av-primary))';
const GOLD_SOFT = 'hsl(var(--av-primary) / 0.45)';
const IVORY = 'hsl(var(--av-foreground) / 0.92)';
const MUTED = 'hsl(var(--av-foreground) / 0.55)';
const PANEL_BG = 'hsl(var(--av-background) / 0.96)';
const GREEN = '#5FB87A';

const eur = (n: number) => '€' + n.toLocaleString('en-US').replace(/,/g, ' ');
const t = (event: string, data?: Record<string, string | number>) => { try { track(event, data); } catch { /* analytics must never break the panel */ } };

export function AvenaConcierge() {
  // Rendered through a portal into document.body: the homepage's route
  // transition (template.tsx av-page-enter) applies a transform, which turns
  // any transformed ancestor into the containing block for position:fixed —
  // without the portal the launcher anchors to the page, not the viewport.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  // Server-derived preferences, echoed back each turn so AI-extracted facts
  // ("half a million" → maxPrice) survive turns the regex parser handles.
  const prefsRef = useRef<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [leadMode, setLeadMode] = useState<null | 'call' | 'matches'>(null);
  const [leadSent, setLeadSent] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useRef(false);

  const closePanel = useCallback(() => {
    try { sessionStorage.setItem(SS_CLOSED, '1'); } catch { /* ok */ }
    setOpen(false); t('concierge_closed');
  }, []);

  // ── Restore session state / launch the showcase ──
  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let hasSaved = false;
    try {
      const saved = sessionStorage.getItem(SS_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (Array.isArray(s.messages) && s.messages.length > 0) hasSaved = true;
        if (Array.isArray(s.messages)) setMessages(s.messages);
        if (Array.isArray(s.quickReplies)) setQuickReplies(s.quickReplies);
        if (s.prefs && typeof s.prefs === 'object') prefsRef.current = s.prefs;
      }
    } catch { /* fresh start */ }
    const dismissed = sessionStorage.getItem(SS_DISMISS) === '1';
    const closedByUser = sessionStorage.getItem(SS_CLOSED) === '1';
    const desktop = window.matchMedia('(min-width: 1024px)').matches;

    // Desktop auto-popup on EVERY visit (Henrik's call), unless the visitor
    // explicitly closed it this session: fresh visitors get the showcase,
    // returning visitors get their own conversation reopened.
    if (desktop && !closedByUser) {
      if (hasSaved) setOpen(true);
      else runShowcase();
      return;
    }
    // Collapsed (mobile, or closed-by-user): the restrained invitation,
    // unless dismissed this session.
    if (!dismissed) {
      const timer = setTimeout(() => { setInvite(true); t('concierge_invitation_shown'); }, 6000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist on change ── (the untouched teaching example is NOT saved —
  // only real customer conversations survive minimize/reload)
  useEffect(() => {
    if (showcaseRef.current) return;
    try { sessionStorage.setItem(SS_KEY, JSON.stringify({ messages, quickReplies, prefs: prefsRef.current })); } catch { /* full */ }
  }, [messages, quickReplies]);

  // ── Autoscroll + focus management ──
  useEffect(() => { scrollRef.current?.scrollTo({ top: 99999, behavior: reducedMotion.current ? 'auto' : 'smooth' }); }, [messages, busy, leadMode]);
  useEffect(() => {
    if (open) {
      // Focus only on intentional opens — the auto-opened showcase must not
      // steal keyboard focus from a visitor who just landed on the page.
      if (userOpenedRef.current) panelRef.current?.focus();
      document.body.dataset.avcOpen = '1';
    } else { delete document.body.dataset.avcOpen; }
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) { closePanel(); launcherRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closePanel]);

  const turn = useCallback(async (nextMessages: Msg[], viaChip = false) => {
    setBusy(true); setFailed(false);
    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.filter((m) => m.role !== 'cards'), prefs: prefsRef.current ?? undefined, viaChip }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (data.prefs && typeof data.prefs === 'object') prefsRef.current = data.prefs;
      const additions: Msg[] = [];
      if (data.recommendations?.length) {
        additions.push({ role: 'cards', cards: data.recommendations, note: data.resultNote });
        t('concierge_results_shown', { count: data.recommendations.length, region: data.prefs?.regions?.[0] ?? 'any' });
        setQuickReplies([]);
      } else if (data.ask) {
        additions.push({ role: 'assistant', text: data.ask.question });
        setQuickReplies(data.ask.quickReplies ?? []);
        if (data.recommendations && data.recommendations.length === 0) t('concierge_results_shown', { count: 0 });
      }
      setMessages([...nextMessages, ...additions]);
    } catch {
      setFailed(true); t('concierge_error');
    } finally {
      setBusy(false);
    }
  }, []);

  const userOpenedRef = useRef(false);
  // True while the panel shows the untouched teaching example. The moment the
  // customer sends their own message, their conversation starts FRESH — the
  // example's preferences (Costa del Sol, €650k…) must never leak into a real
  // buyer's search.
  const showcaseRef = useRef(false);

  const openPanel = useCallback(() => {
    userOpenedRef.current = true;
    try { sessionStorage.removeItem(SS_CLOSED); } catch { /* ok */ }
    setOpen(true); setInvite(false); t('concierge_opened');
    if (messages.length === 0) turn([]);
  }, [messages.length, turn]);


  /**
   * The homepage showcase: greeting + example answer appear, the REAL engine
   * runs the search, then the found-line (with the true count), the second
   * example answer, and the three real property cards render — exactly the
   * mockup, populated from live inventory.
   */
  const runShowcase = useCallback(async () => {
    showcaseRef.current = true;
    setOpen(true);
    t('concierge_opened');
    const opening: Msg[] = [
      { role: 'assistant', text: SHOWCASE_GREETING },
      { role: 'user', text: SHOWCASE_U1 },
    ];
    setMessages(opening);
    setBusy(true);
    try {
      const full: Msg[] = [...opening,
        { role: 'assistant', text: '' }, // placeholder — replaced with the real found-line below
        { role: 'user', text: SHOWCASE_U2 },
      ];
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // viaChip: the showcase turns are scripted (chip-equivalent) — the
        // homepage demo must stay instant and cost nothing per pageview.
        body: JSON.stringify({ messages: full.filter((m) => m.role === 'user' || (m.role === 'assistant' && m.text)), viaChip: true }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (data.prefs && typeof data.prefs === 'object') prefsRef.current = data.prefs;

      if (data.recommendations?.length) {
        const n = data.recommendations.length;
        const count = n === 3 ? 'three' : String(n);
        full[2] = { role: 'assistant', text: `I found ${count} strong ${n === 1 ? 'opportunity' : 'opportunities'}. Are you buying for lifestyle, investment, or both?` };
        setMessages([...full, { role: 'cards', cards: data.recommendations }]);
        t('concierge_results_shown', { count: n, region: 'Costa del Sol' });
      } else if (data.ask) {
        // Engine couldn't complete the showcase (e.g. no matches) — fall back
        // to a normal conversation from the first answer.
        setMessages([...opening, { role: 'assistant', text: data.ask.question }]);
        setQuickReplies(data.ask.quickReplies ?? []);
      }
    } catch {
      setFailed(true); t('concierge_error');
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback((text: string, viaChip: boolean) => {
    const clean = text.trim();
    if (!clean || busy) return;
    t(viaChip ? 'concierge_quick_reply_clicked' : 'concierge_message_sent');
    setInput('');
    setQuickReplies([]);
    // First message after the teaching example → their own fresh conversation.
    const base = showcaseRef.current ? [] : messages;
    if (showcaseRef.current) { prefsRef.current = null; showcaseRef.current = false; }
    const next: Msg[] = [...base, { role: 'user', text: clean }];
    setMessages(next);
    turn(next, viaChip);
  }, [messages, busy, turn]);

  const submitLead = useCallback(async (form: { name: string; contact: string; method: string }) => {
    const cards = [...messages].reverse().find((m): m is Extract<Msg, { role: 'cards' }> => m.role === 'cards');
    const refs = cards?.cards.map((c) => c.propertyId).join(', ') ?? '';
    const convo = messages.filter((m) => m.role !== 'cards').map((m) => `${m.role === 'user' ? 'Buyer' : 'Avena'}: ${(m as { text: string }).text}`).join('\n');
    const isEmail = /@/.test(form.contact);
    setBusy(true);
    try {
      const res = await fetch('/api/enquire', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: isEmail ? form.contact : 'no-email@concierge.avenaterminal.com',
          phone: isEmail ? undefined : form.contact,
          message: `[Avena Concierge — ${leadMode === 'call' ? 'private call requested' : 'send matches requested'} · preferred contact: ${form.method}]\nRecommended: ${refs}\n\n${convo}`.slice(0, 1900),
          property_ref: cards?.cards[0]?.propertyId,
          property_name: cards?.cards[0]?.name,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setLeadSent(true); setLeadMode(null);
      t('concierge_lead_captured', { kind: leadMode ?? 'unknown' });
      setMessages((m) => [...m, { role: 'assistant', text: `Thank you, ${form.name.split(' ')[0]}. Our advisor will reach you ${form.method === 'WhatsApp' ? 'on WhatsApp' : 'by email'} shortly — usually within a few hours.` }]);
    } catch {
      setFailed(true); t('concierge_error');
    } finally {
      setBusy(false);
    }
  }, [messages, leadMode]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* ── Collapsed launcher ── */}
      <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 60, display: 'flex', alignItems: 'center', gap: 10 }}>
        {invite && !open && (
          <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, background: PANEL_BG, border: `1px solid ${GOLD_SOFT}`, borderRadius: 3, padding: '10px 14px', backdropFilter: 'blur(8px)', boxShadow: '0 12px 40px -12px rgba(0,0,0,0.5)' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 13.5, color: IVORY }}>Looking for a property in Spain?</span>
            <button aria-label="Dismiss" onClick={() => { setInvite(false); sessionStorage.setItem(SS_DISMISS, '1'); }} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 2 }}>✕</button>
          </div>
        )}
        <button
          ref={launcherRef}
          onClick={() => { if (open) { closePanel(); } else { openPanel(); } }}
          aria-label={open ? 'Close Avena Concierge' : 'Open Avena Concierge'}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <span style={{ background: PANEL_BG, border: `1px solid ${GOLD_SOFT}`, borderRadius: 3, padding: '9px 14px', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: IVORY, backdropFilter: 'blur(8px)' }}>Ask Avena</span>
          <span style={{ width: 46, height: 46, borderRadius: '50%', background: `linear-gradient(140deg, hsl(var(--av-primary) / 0.95), hsl(var(--av-primary) / 0.75))`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px -8px rgba(0,0,0,0.55)', border: '1px solid hsl(var(--av-primary) / 0.6)' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 22, fontWeight: 300, color: 'hsl(var(--av-background))', lineHeight: 1, transform: 'translateY(-1px)' }}>A</span>
          </span>
        </button>
      </div>

      {/* ── Expanded panel ── */}
      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Avena Concierge — property advisor"
          className="avc-panel"
          style={{
            position: 'fixed', zIndex: 70, display: 'flex', flexDirection: 'column',
            background: PANEL_BG, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            border: `1px solid ${GOLD_SOFT}`, borderRadius: 6, color: IVORY,
            boxShadow: '0 32px 80px -20px rgba(0,0,0,0.65)', outline: 'none',
            animation: reducedMotion.current ? undefined : 'avcIn 240ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: `1px solid hsl(var(--av-border) / 0.5)` }}>
            <div>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase', color: IVORY }}>Avena Concierge</div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'ui-monospace, monospace', fontSize: 8.5, letterSpacing: '0.24em', textTransform: 'uppercase', color: GOLD }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN }} /> Property advisor
              </div>
            </div>
            <button aria-label="Minimize concierge" onClick={() => { closePanel(); launcherRef.current?.focus(); }} style={{ background: 'none', border: `1px solid hsl(var(--av-border) / 0.6)`, borderRadius: 3, color: MUTED, cursor: 'pointer', width: 28, height: 28, fontSize: 13, lineHeight: 1 }}>—</button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => {
              if (m.role === 'cards') {
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {m.note && <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 300, lineHeight: 1.55, color: IVORY, maxWidth: '92%' }}>{m.note}</div>}
                    {m.cards.map((c) => (
                      <a key={c.propertyId} href={c.slug} title={c.name} onClick={() => t('concierge_property_clicked', { ref: c.propertyId })} style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 13, alignItems: 'center', textDecoration: 'none', color: IVORY, border: `1px solid hsl(var(--av-border) / 0.6)`, borderRadius: 4, padding: 10, background: 'hsl(var(--av-surface) / 0.5)' }}>
                        <span style={{ width: 96, height: 70, borderRadius: 3, overflow: 'hidden', background: 'hsl(var(--av-surface))', display: 'block' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {c.imageUrl && <img src={c.imageUrl} alt="" loading="lazy" width={96} height={70} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: GOLD }}>{c.location.split(',')[0]}</span>
                          <span style={{ display: 'block', marginTop: 4, fontFamily: 'Georgia, serif', fontSize: 19, fontWeight: 300, letterSpacing: '-0.01em' }}>€{c.priceFrom.toLocaleString('en-US')}</span>
                          <span style={{ display: 'block', marginTop: 4, fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.08em', color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {(c.matchReasons.length ? c.matchReasons : [c.completion, c.avenaScore != null ? `Score ${c.avenaScore}` : null].filter(Boolean) as string[]).slice(0, 2).join(' · ')}
                          </span>
                        </span>
                      </a>
                    ))}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                      <a href="/deals" style={{ ...ctaStyle(true), textDecoration: 'none' }} onClick={() => t('concierge_property_clicked', { ref: 'view_matches' })}>View {m.cards.length} matches</a>
                      {!leadSent && (
                        <button onClick={() => { setLeadMode('call'); t('concierge_call_requested'); }} style={ctaStyle(false)}>Book a private call</button>
                      )}
                    </div>
                  </div>
                );
              }
              const user = m.role === 'user';
              return (
                <div key={i} style={{ alignSelf: user ? 'flex-end' : 'flex-start', maxWidth: '86%', background: user ? 'hsl(var(--av-primary) / 0.14)' : 'transparent', border: user ? `1px solid hsl(var(--av-primary) / 0.3)` : 'none', borderRadius: 4, padding: user ? '8px 12px' : 0 }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 14.5, fontWeight: 300, lineHeight: 1.55, color: IVORY }}>{m.text}</div>
                </div>
              );
            })}

            {busy && <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: MUTED }}>Searching the live inventory…</div>}
            {failed && (
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 13.5, fontStyle: 'italic', color: MUTED, lineHeight: 1.5 }}>
                I&rsquo;m having trouble responding right now. You can still choose an area and budget below, or <a href="/enquire" style={{ color: GOLD }}>enquire directly</a>.
              </div>
            )}

            {/* Lead capture mini-form */}
            {leadMode && !leadSent && (
              <LeadForm mode={leadMode} onCancel={() => setLeadMode(null)} onSubmit={submitLead} />
            )}
          </div>

          {/* Suggested replies — presented as suggestions, never as the visitor's words */}
          {quickReplies.length > 0 && !busy && !leadMode && (
            <div style={{ padding: '4px 18px 10px' }}>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, letterSpacing: '0.24em', textTransform: 'uppercase', color: MUTED, marginBottom: 7 }}>Suggested replies</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {quickReplies.map((q) => (
                  <button key={q} onClick={() => send(q, true)} style={{ background: 'none', border: `1px solid ${GOLD_SOFT}`, borderRadius: 3, padding: '7px 11px', fontFamily: 'ui-monospace, monospace', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'hsl(var(--av-primary) / 0.92)', cursor: 'pointer' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); send(input, false); }} style={{ display: 'flex', gap: 8, padding: '12px 18px 16px', borderTop: `1px solid hsl(var(--av-border) / 0.5)` }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about areas, budgets, or availability…"
              aria-label="Message the concierge"
              style={{ flex: 1, background: 'hsl(var(--av-surface) / 0.6)', border: `1px solid hsl(var(--av-border) / 0.6)`, borderRadius: 3, padding: '10px 12px', fontFamily: 'Georgia, serif', fontSize: 13.5, color: IVORY, outline: 'none' }}
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send" style={{ background: 'hsl(var(--av-primary) / 0.9)', color: 'hsl(var(--av-primary-foreground))', border: 'none', borderRadius: 3, padding: '0 16px', fontFamily: 'ui-monospace, monospace', fontSize: 12, cursor: 'pointer', opacity: busy || !input.trim() ? 0.5 : 1 }}>→</button>
          </form>
        </div>
      )}

      {/* Panel geometry + entrance animation. Mobile: near-full-screen. */}
      <style>{`
        @keyframes avcIn { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: none; } }
        /* Desktop: anchored above the always-visible ASK AVENA control (mockup) */
        .avc-panel { right: 20px; bottom: 84px; width: 460px; max-width: calc(100vw - 40px); height: min(760px, calc(100vh - 168px)); }
        @media (max-width: 640px) {
          .avc-panel { right: 10px; left: 10px; bottom: 10px; width: auto; height: calc(100dvh - 76px); }
          body[data-avc-open] { overflow: hidden; }
        }
        @media (prefers-reduced-motion: reduce) { .avc-panel { animation: none !important; } }
      `}</style>
    </>,
    document.body,
  );
}

function ctaStyle(primary: boolean): React.CSSProperties {
  return primary
    ? { background: 'hsl(var(--av-primary) / 0.9)', color: 'hsl(var(--av-primary-foreground))', border: 'none', borderRadius: 3, padding: '10px 14px', fontFamily: 'ui-monospace, monospace', fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer' }
    : { background: 'none', color: 'hsl(var(--av-primary) / 0.92)', border: `1px solid hsl(var(--av-primary) / 0.45)`, borderRadius: 3, padding: '10px 14px', fontFamily: 'ui-monospace, monospace', fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer' };
}

function LeadForm({ mode, onCancel, onSubmit }: { mode: 'call' | 'matches'; onCancel: () => void; onSubmit: (f: { name: string; contact: string; method: string }) => void }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [method, setMethod] = useState('Email');
  const valid = name.trim().length >= 2 && (method === 'Email' ? /@/.test(contact) : contact.trim().length >= 6);
  const field: React.CSSProperties = { width: '100%', background: 'hsl(var(--av-surface) / 0.6)', border: '1px solid hsl(var(--av-border) / 0.6)', borderRadius: 3, padding: '9px 11px', fontFamily: 'Georgia, serif', fontSize: 13, color: 'hsl(var(--av-foreground) / 0.92)', outline: 'none' };
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit({ name, contact, method }); }} style={{ border: '1px solid hsl(var(--av-primary) / 0.35)', borderRadius: 4, padding: 14, display: 'flex', flexDirection: 'column', gap: 9, background: 'hsl(var(--av-surface) / 0.4)' }}>
      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'hsl(var(--av-primary))' }}>
        {mode === 'call' ? 'Book a private call' : 'Send me these matches'}
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" style={field} />
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Preferred contact method" style={{ ...field, width: 120, flexShrink: 0 }}>
          <option>Email</option>
          <option>WhatsApp</option>
        </select>
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={method === 'Email' ? 'you@email.com' : '+47 …'} aria-label={method === 'Email' ? 'Email address' : 'WhatsApp number'} style={field} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="submit" disabled={!valid} style={{ ...ctaStyle(true), opacity: valid ? 1 : 0.5 }}>Confirm</button>
        <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', color: 'hsl(var(--av-foreground) / 0.55)', fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
      </div>
      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, letterSpacing: '0.1em', color: 'hsl(var(--av-foreground) / 0.45)' }}>
        Used only to contact you about these properties. <a href="/terms" style={{ color: 'hsl(var(--av-primary) / 0.8)' }}>Terms</a>
      </div>
    </form>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Copy, Send, AlertTriangle, Sparkles, RotateCcw, Zap, Shield } from 'lucide-react';

const STORAGE_KEY = 'avena_agent_state_v2';

interface Match {
  ref: string;
  project: string;
  town: string;
  region: string | null;
  price: number;
  pm2: number | null;
  mm2: number | null;
  discount: number;
  score: number;
  yield_gross: number;
  beds: number;
  built: number;
  fit_score: number;
  fit_reasoning: string;
  developer: string | null;
}

interface Outreach {
  ref: string;
  to_role: string;
  to_email: string;
  subject: string;
  body: string;
  draft_notes: string;
}

interface MissionResponse {
  ok?: boolean;
  error?: string;
  mission_id?: number | null;
  session_token?: string;
  summary: string;
  matches: Match[];
  outreach: Outreach[];
  recommendations: string[];
  warnings: string[];
}

interface DispatchResult {
  ref: string;
  ok: boolean;
  error?: string;
  avp_signature?: string;
}

interface DispatchResponse {
  ok: boolean;
  sent: number;
  failed: number;
  results: DispatchResult[];
  error?: string;
}

const REGIONS = [
  'costa blanca', 'costa del sol', 'costa calida', 'costa brava',
  'balearics', 'canary islands', 'algarve', 'lisbon',
  'madrid metro', 'valencia',
];

const TYPES = ['villa', 'apartment', 'penthouse', 'townhouse', 'bungalow'];

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

export function AgentClient() {
  const [budget, setBudget] = useState('400000');
  const [regions, setRegions] = useState<string[]>(['costa blanca']);
  const [types, setTypes] = useState<string[]>(['villa']);
  const [minBeds, setMinBeds] = useState('3');
  const [minYield, setMinYield] = useState('');
  const [minScore, setMinScore] = useState('65');
  const [timeline, setTimeline] = useState('8');
  const [persona, setPersona] = useState('investor');
  const [nationality, setNationality] = useState('Norwegian');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [mission, setMission] = useState<MissionResponse | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Avena Citizen mode — autonomous send via Resend + AVP-signed offers
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [testMode, setTestMode] = useState(true); // default ON for safety
  const [buyerEmail, setBuyerEmail] = useState('');
  const [dispatchingRef, setDispatchingRef] = useState<string | null>(null);
  const [dispatchResults, setDispatchResults] = useState<Record<string, DispatchResult>>({});

  // Restore form + mission from localStorage on mount — so returning from a
  // property page lands you back on the same results you left.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.form) {
          setBudget(parsed.form.budget ?? '400000');
          setRegions(parsed.form.regions ?? ['costa blanca']);
          setTypes(parsed.form.types ?? ['villa']);
          setMinBeds(parsed.form.minBeds ?? '3');
          setMinYield(parsed.form.minYield ?? '');
          setMinScore(parsed.form.minScore ?? '65');
          setTimeline(parsed.form.timeline ?? '8');
          setPersona(parsed.form.persona ?? 'investor');
          setNationality(parsed.form.nationality ?? 'Norwegian');
          setNotes(parsed.form.notes ?? '');
        }
        if (parsed.mission) setMission(parsed.mission);
        if (parsed.autonomousMode != null) setAutonomousMode(!!parsed.autonomousMode);
        if (parsed.testMode != null) setTestMode(!!parsed.testMode);
        if (parsed.buyerEmail) setBuyerEmail(parsed.buyerEmail);
        if (parsed.dispatchResults) setDispatchResults(parsed.dispatchResults);
      }
    } catch { /* silent */ }
    setHydrated(true);
  }, []);

  // Persist whenever anything changes (after hydration) so navigating away
  // and coming back preserves state.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        form: { budget, regions, types, minBeds, minYield, minScore, timeline, persona, nationality, notes },
        mission,
        autonomousMode,
        testMode,
        buyerEmail,
        dispatchResults,
      }));
    } catch { /* silent */ }
  }, [hydrated, budget, regions, types, minBeds, minYield, minScore, timeline, persona, nationality, notes, mission, autonomousMode, testMode, buyerEmail, dispatchResults]);

  const clearMission = () => {
    setMission(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  };

  const toggleRegion = (r: string) =>
    setRegions((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));

  const toggleType = (t: string) =>
    setTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setMission(null);
    try {
      const r = await fetch('/api/agent/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget_max_eur: parseInt(budget.replace(/[^\d]/g, ''), 10) || 500_000,
          regions,
          property_types: types,
          min_beds: minBeds ? parseInt(minBeds, 10) : undefined,
          min_yield_pct: minYield ? parseFloat(minYield) : undefined,
          min_score: minScore ? parseInt(minScore, 10) : undefined,
          timeline_weeks: timeline ? parseInt(timeline, 10) : undefined,
          buyer_persona: persona,
          buyer_nationality: nationality,
          extra_notes: notes,
        }),
      });
      const data: MissionResponse = await r.json();
      setMission(data);
    } catch (err) {
      setMission({
        summary: '',
        matches: [],
        outreach: [],
        recommendations: [],
        warnings: [String(err)],
      });
    }
    setLoading(false);
  };

  const copyEmail = async (o: Outreach) => {
    const text = `To: ${o.to_email}\nSubject: ${o.subject}\n\n${o.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRef(o.ref);
      setTimeout(() => setCopiedRef(null), 1500);
    } catch { /* noop */ }
  };

  const mailto = (o: Outreach) => {
    const url = `mailto:${o.to_email}?subject=${encodeURIComponent(o.subject)}&body=${encodeURIComponent(o.body)}`;
    window.open(url, '_blank');
  };

  const dispatchSend = async (ref: string) => {
    if (!mission?.mission_id) return;
    if (!buyerEmail || !buyerEmail.includes('@')) {
      alert('Add your email above first — replies need to reach you.');
      return;
    }
    setDispatchingRef(ref);
    try {
      const r = await fetch('/api/agent/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission_id: mission.mission_id,
          session_token: mission.session_token,
          property_refs: [ref],
          buyer_email: buyerEmail,
          test_mode: testMode,
        }),
      });
      const data: DispatchResponse = await r.json();
      const result = data.results?.[0];
      if (result) {
        setDispatchResults((prev) => ({ ...prev, [ref]: result }));
      }
    } catch (e) {
      setDispatchResults((prev) => ({
        ...prev,
        [ref]: { ref, ok: false, error: e instanceof Error ? e.message : String(e) },
      }));
    }
    setDispatchingRef(null);
  };

  const inputCls = 'w-full rounded-sm border px-3 py-2 text-sm bg-transparent text-foreground focus:outline-none focus:border-primary font-mono';
  const inputStyle = { borderColor: 'hsl(var(--av-border) / 0.6)' };

  return (
    <section className="py-10">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
        {/* Brief form */}
        <form
          onSubmit={submit}
          className="rounded-sm border p-6 sm:p-8 mb-10"
          style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-primary) / 0.35)' }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-5">Your brief</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="block">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Max budget (EUR) *</div>
              <input type="text" inputMode="numeric" required value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="400000" className={inputCls} style={inputStyle} />
            </label>
            <label className="block">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Min bedrooms</div>
              <input type="text" inputMode="numeric" value={minBeds} onChange={(e) => setMinBeds(e.target.value)} placeholder="3" className={inputCls} style={inputStyle} />
            </label>
            <label className="block">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Target yield (%)</div>
              <input type="text" inputMode="decimal" value={minYield} onChange={(e) => setMinYield(e.target.value)} placeholder="5" className={inputCls} style={inputStyle} />
            </label>
            <label className="block">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Min Avena Score</div>
              <input type="text" inputMode="numeric" value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="65" className={inputCls} style={inputStyle} />
            </label>
            <label className="block">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Timeline (weeks)</div>
              <input type="text" inputMode="numeric" value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="8" className={inputCls} style={inputStyle} />
            </label>
            <label className="block">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Buyer persona</div>
              <select value={persona} onChange={(e) => setPersona(e.target.value)} className={inputCls} style={inputStyle}>
                <option value="investor">Investor (yield focus)</option>
                <option value="primary">Primary home</option>
                <option value="holiday">Holiday / second home</option>
                <option value="family">Family relocation</option>
              </select>
            </label>
            <label className="block">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Your nationality</div>
              <input type="text" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Norwegian" className={inputCls} style={inputStyle} />
            </label>
            <label className="block sm:col-span-2 lg:col-span-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Notes to the Agent (optional)</div>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Prefer near beach, flexible on completion year, will pay cash..." className={inputCls} style={inputStyle} />
            </label>
          </div>

          <div className="mt-6">
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Regions</div>
            <div className="flex flex-wrap gap-1.5">
              {REGIONS.map((r) => {
                const on = regions.includes(r);
                return (
                  <button
                    type="button"
                    key={r}
                    onClick={() => toggleRegion(r)}
                    className="rounded-sm border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors"
                    style={{
                      borderColor: on ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)',
                      background: on ? 'hsl(var(--av-primary) / 0.1)' : 'transparent',
                      color: on ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Property types</div>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => {
                const on = types.includes(t);
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => toggleType(t)}
                    className="rounded-sm border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors"
                    style={{
                      borderColor: on ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)',
                      background: on ? 'hsl(var(--av-primary) / 0.1)' : 'transparent',
                      color: on ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Avena Citizen mode — autonomous send */}
          <div
            className="mt-6 rounded-sm border p-4"
            style={{
              background: autonomousMode ? 'hsl(var(--av-primary) / 0.08)' : 'hsl(var(--av-surface) / 0.3)',
              borderColor: autonomousMode ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)',
            }}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autonomousMode}
                onChange={(e) => setAutonomousMode(e.target.checked)}
                className="mt-1 accent-primary"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                  <Zap className="h-3 w-3" />
                  Avena Citizen mode — autonomous send
                </div>
                <div className="mt-1 text-xs text-foreground/80 font-light leading-relaxed">
                  When enabled, you can dispatch outreach directly via Avena.
                  Each email carries an{' '}
                  <Link href="/standards/avp" className="text-primary hover:text-gold underline" target="_blank">
                    AVP-signed offer document
                  </Link>{' '}
                  for cryptographic provenance. Replies route back to your inbox.
                  This is the first transactional AI agent in European property.
                </div>
              </div>
            </label>
            {autonomousMode && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
                    Your email (replies go here) *
                  </div>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputCls}
                    style={inputStyle}
                  />
                </label>
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground self-end pb-2">
                  <Shield className="h-3 w-3 text-primary" />
                  <span>From: agent@avenaterminal.com · Reply-to: you</span>
                </div>
              </div>
            )}
            {autonomousMode && (
              <label className="mt-3 flex items-start gap-3 cursor-pointer rounded-sm border p-3"
                style={{
                  background: testMode ? 'hsl(var(--av-warning) / 0.08)' : 'hsl(var(--av-background))',
                  borderColor: testMode ? 'hsl(var(--av-warning) / 0.4)' : 'hsl(var(--av-border) / 0.5)',
                }}
              >
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em]"
                    style={{ color: testMode ? 'hsl(var(--av-warning))' : 'hsl(var(--av-muted-foreground))' }}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Test mode {testMode ? '— ON (safe to fire)' : '— OFF (live sends to real developers)'}
                  </div>
                  <div className="mt-1 text-xs text-foreground/80 font-light leading-snug">
                    {testMode
                      ? <>All dispatches loop back to <span className="font-mono text-primary">{buyerEmail || 'your email'}</span>. Real developers receive nothing. Subject is prefixed [TEST →]. Use this to verify the full pipeline (Resend, AVP signing, headers, attachment) before going live.</>
                      : <>⚠ Dispatches go to the real developer email shown on each card. AVP-signed and traceable.</>
                    }
                  </div>
                </div>
              </label>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold disabled:opacity-40"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              {loading ? (
                <><Sparkles className="h-3.5 w-3.5 animate-pulse" /> Agent is working…</>
              ) : mission ? (
                <>Re-run with these settings <ArrowRight className="h-3.5 w-3.5" /></>
              ) : (
                <>Dispatch the Agent <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </button>
            {mission && (
              <button
                type="button"
                onClick={clearMission}
                className="inline-flex items-center gap-2 rounded-sm border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                New brief
              </button>
            )}
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              {mission ? 'Brief + results saved — navigating away and back is safe' : 'The Agent never sends without your approval'}
            </span>
          </div>
        </form>

        {/* Mission output */}
        {mission && mission.summary && (
          <div
            className="rounded-sm border p-6 mb-6"
            style={{ background: 'hsl(var(--av-primary) / 0.06)', borderColor: 'hsl(var(--av-primary) / 0.35)' }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Agent summary</div>
            <p className="font-serif text-lg text-foreground leading-relaxed">{mission.summary}</p>
          </div>
        )}

        {mission && mission.warnings && mission.warnings.length > 0 && (
          <div
            className="rounded-sm border p-5 mb-6"
            style={{ background: 'hsl(var(--av-warning) / 0.08)', borderColor: 'hsl(var(--av-warning) / 0.4)' }}
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] mb-2" style={{ color: 'hsl(var(--av-warning))' }}>
              <AlertTriangle className="h-3.5 w-3.5" /> Caveats
            </div>
            <ul className="space-y-1">
              {mission.warnings.map((w, i) => (
                <li key={i} className="text-sm text-foreground font-light">· {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Matches */}
        {mission && mission.matches.length > 0 && (
          <div className="mb-8">
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-4">
              {mission.matches.length} matches <span className="italic text-gold">ranked by fit</span>.
            </h2>
            <div className="space-y-3">
              {mission.matches.map((m, i) => {
                const hasOutreach = mission.outreach.find((o) => o.ref === m.ref);
                return (
                  <div
                    key={m.ref}
                    className="rounded-sm border p-5"
                    style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="font-mono tabular text-[11px] text-muted-foreground pt-1">{i + 1}</div>
                        <div className="min-w-0">
                          <Link
                            href={`/property/${encodeURIComponent(m.ref)}`}
                            target="_blank"
                            rel="noopener"
                            className="font-serif text-lg text-foreground hover:text-primary transition-colors"
                          >
                            {m.project} ↗
                          </Link>
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1">
                            {m.town}{m.region ? ` · ${m.region}` : ''} · {m.beds}bed · {m.built}m²
                            {m.developer ? ` · ${m.developer}` : ''}
                          </div>
                          <div className="mt-2 font-mono text-[11px] text-foreground/90 leading-relaxed">
                            <span className="text-primary">Fit {m.fit_score}/100 —</span> {m.fit_reasoning}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-serif text-3xl font-light text-gold tabular leading-none">{m.score}</div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">Avena Score</div>
                        <div className="font-mono tabular text-sm text-foreground mt-2">€{fmt(m.price)}</div>
                        {m.discount > 0 && (
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mt-0.5">
                            −{m.discount}% vs market
                          </div>
                        )}
                      </div>
                    </div>

                    {hasOutreach && (
                      <div
                        className="rounded-sm border p-4 mt-3"
                        style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-primary) / 0.25)' }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-primary mb-1">Drafted outreach</div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              To: <span className="text-foreground">{hasOutreach.to_email}</span>
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                              Subject: <span className="text-foreground">{hasOutreach.subject}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                            <button
                              onClick={() => copyEmail(hasOutreach)}
                              className="inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
                            >
                              {copiedRef === hasOutreach.ref ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                              {copiedRef === hasOutreach.ref ? 'Copied' : 'Copy'}
                            </button>
                            {!autonomousMode && (
                              <button
                                onClick={() => mailto(hasOutreach)}
                                className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                                style={{ background: 'var(--av-gradient-gold)' }}
                              >
                                <Send className="h-3 w-3" />
                                Open in mail
                              </button>
                            )}
                            {autonomousMode && (() => {
                              const r = dispatchResults[hasOutreach.ref];
                              const isLoading = dispatchingRef === hasOutreach.ref;
                              if (r?.ok) {
                                return (
                                  <span
                                    className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em]"
                                    style={{ background: 'hsl(var(--av-primary) / 0.15)', color: 'hsl(var(--av-primary))' }}
                                    title={r.avp_signature ? `AVP signature: ${r.avp_signature.slice(0, 16)}…` : 'Sent'}
                                  >
                                    <Shield className="h-3 w-3" />
                                    Sent · AVP signed
                                  </span>
                                );
                              }
                              return (
                                <button
                                  onClick={() => dispatchSend(hasOutreach.ref)}
                                  disabled={isLoading}
                                  className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold disabled:opacity-50"
                                  style={{ background: 'var(--av-gradient-gold)' }}
                                >
                                  {isLoading ? (
                                    <><Sparkles className="h-3 w-3 animate-pulse" /> Dispatching…</>
                                  ) : r?.error ? (
                                    <><AlertTriangle className="h-3 w-3" /> Retry · {r.error.slice(0, 24)}</>
                                  ) : (
                                    <><Zap className="h-3 w-3" /> Dispatch via Avena</>
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                        <pre className="font-mono text-[11px] text-foreground/90 whitespace-pre-wrap leading-relaxed">{hasOutreach.body}</pre>
                        {hasOutreach.draft_notes && (
                          <div className="mt-3 pt-3 border-t font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                            Agent note: <span className="text-foreground normal-case">{hasOutreach.draft_notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {mission && mission.recommendations && mission.recommendations.length > 0 && (
          <div
            className="rounded-sm border p-5"
            style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Agent recommends</div>
            <ul className="space-y-2">
              {mission.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground font-light">
                  <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2 bg-primary" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Copy, Send, AlertTriangle, Sparkles } from 'lucide-react';

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

          <div className="mt-7 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold disabled:opacity-40"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              {loading ? (
                <><Sparkles className="h-3.5 w-3.5 animate-pulse" /> Agent is working…</>
              ) : (
                <>Dispatch the Agent <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </button>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              The Agent never sends without your approval
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
                            className="font-serif text-lg text-foreground hover:text-primary transition-colors"
                          >
                            {m.project}
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
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => copyEmail(hasOutreach)}
                              className="inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
                            >
                              {copiedRef === hasOutreach.ref ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                              {copiedRef === hasOutreach.ref ? 'Copied' : 'Copy'}
                            </button>
                            <button
                              onClick={() => mailto(hasOutreach)}
                              className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                              style={{ background: 'var(--av-gradient-gold)' }}
                            >
                              <Send className="h-3 w-3" />
                              Open in mail
                            </button>
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

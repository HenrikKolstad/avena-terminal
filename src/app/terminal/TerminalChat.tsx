'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Copy, Zap, BookOpen, BarChart3, Hash, AlertCircle, FileText } from 'lucide-react';

interface Message { role: 'user' | 'assistant'; content: string; }

interface Suggestion { icon: React.ReactNode; label: string; prompt: string; group: string; }

const SUGGESTIONS: Suggestion[] = [
  { icon: <Zap className="h-3.5 w-3.5" />,      label: 'PT 18.9% explainer',            prompt: 'What is driving Portuguese residential property at +18.9% YoY in 2025-Q4? Use the briefings and Eurostat data.', group: 'Macro' },
  { icon: <BarChart3 className="h-3.5 w-3.5" />, label: 'Cross-validation ES coastal',   prompt: 'Show me the latest cross-validation snapshot for Spain coastal cohort vs Eurostat national. Cite the methodology brief.', group: 'Macro' },
  { icon: <AlertCircle className="h-3.5 w-3.5" />, label: 'Active anomalies right now',  prompt: 'Which official series currently show ≥2σ anomalies and what direction are they moving?', group: 'Macro' },
  { icon: <BookOpen className="h-3.5 w-3.5" />, label: 'Foreign-buyer findings',        prompt: 'Summarise the foreign-buyer flow findings across the Avena sovereign briefings. Cite the specific volumes.', group: 'Research' },
  { icon: <Hash className="h-3.5 w-3.5" />,     label: 'Lowest mortgage rate in EU',    prompt: 'Which EU country has the lowest cost-of-borrowing for house purchase right now per ECB MIR?', group: 'Macro' },
  { icon: <FileText className="h-3.5 w-3.5" />, label: 'AVM: Marbella 3-bed apartment', prompt: 'AVM valuation for a 3-bed apartment in Marbella, 110m², 0.4km from beach. Show comparables and confidence interval.', group: 'Property' },
];

export function TerminalChat({ contextPreamble }: { contextPreamble: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Loading-state ticker animates through the tool catalogue so the user sees
  // intent even before the Anthropic stream lands.
  useEffect(() => {
    if (!loading) { setActiveTool(null); return; }
    const tools = ['query_official_stats', 'search_briefings', 'query_validation', 'search_properties', 'get_market_data', 'lookup_avn_id'];
    let i = 0;
    setActiveTool(tools[0]);
    const iv = setInterval(() => { i = (i + 1) % tools.length; setActiveTool(tools[i]); }, 700);
    return () => clearInterval(iv);
  }, [loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    setLoading(true);
    const userMsg: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.reply || data.response || data.error || 'No response.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function copyConversation() {
    const text = messages.map(m => `${m.role.toUpperCase()}:\n${m.content}\n`).join('\n---\n\n');
    navigator.clipboard.writeText(text).catch(() => null);
  }

  function reset() {
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  }

  return (
    <div className="relative rounded-sm border flex flex-col min-h-[520px] lg:min-h-[700px] overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.35)' }}>
      {/* Gold accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: 'var(--av-gradient-gold)', opacity: 0.7 }} />

      {/* Header */}
      <div className="flex items-center justify-between border-b pl-3.5 pr-3 py-3" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="flex items-baseline gap-3">
          <Sparkles className="h-3.5 w-3.5 text-primary self-center" />
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">Avena Oracle</span>
          <span className="hidden sm:inline font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Claude Sonnet 4 · 14 tools · cited</span>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <>
              <button onClick={reset} className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors" aria-label="New conversation">
                new
              </button>
              <button onClick={copyConversation} className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors" aria-label="Copy conversation">
                <Copy className="h-2.5 w-2.5" /> copy
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="max-w-3xl">
            {/* Live context */}
            <div className="rounded-sm border p-4 mb-6" style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-background) / 0.5)' }}>
              <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-primary mb-2">Live context</div>
              <p className="text-xs text-foreground/85 leading-relaxed font-mono">{contextPreamble}</p>
            </div>

            {/* Suggestion grid */}
            <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground mb-3">Try a query</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s.prompt)}
                  className="group flex items-start gap-3 rounded-sm border p-3 text-left transition-colors hover:border-primary"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-background) / 0.4)' }}
                >
                  <span className="mt-0.5 shrink-0 text-primary group-hover:text-foreground transition-colors">{s.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-primary/80 group-hover:text-primary mb-1">{s.group}</span>
                    <span className="block text-[11px] text-foreground/90 leading-relaxed">{s.label}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* Capability strip */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {[
                { n: '14', label: 'Tools' },
                { n: '4,145', label: 'Official obs' },
                { n: '1,881', label: 'Properties' },
                { n: '5', label: 'Briefings' },
              ].map(c => (
                <div key={c.label} className="rounded-sm border py-3 px-2" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                  <div className="font-serif text-xl font-light text-foreground tabular">{c.n}</div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.24em] text-muted-foreground mt-1">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl">
            {messages.map((m, i) => (
              <div key={i}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.32em]" style={{ color: m.role === 'user' ? 'hsl(var(--av-muted-foreground))' : 'hsl(var(--av-primary))' }}>
                    {m.role === 'user' ? 'You' : 'Avena Oracle'}
                  </span>
                </div>
                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'text-foreground/85 italic' : 'text-foreground/95'}`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-primary mb-2">Avena Oracle</div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '120ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '240ms' }} />
                  </div>
                  {activeTool && <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">calling <span className="text-primary">{activeTool}</span></span>}
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t pl-3.5 pr-3 py-3 flex items-end gap-2" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask Oracle anything — Eurostat, ECB rates, briefings, properties, cross-validation…"
          rows={2}
          className="flex-1 resize-none bg-transparent border-0 outline-0 font-mono text-xs text-foreground placeholder:text-muted-foreground/70"
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="rounded-sm px-3 py-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
          style={{ background: 'var(--av-gradient-gold)' }}
          aria-label="Send"
        >
          <Send className="h-3 w-3" /> send
        </button>
      </div>
    </div>
  );
}

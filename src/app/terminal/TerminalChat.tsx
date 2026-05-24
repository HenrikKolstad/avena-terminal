'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Copy } from 'lucide-react';

interface Message { role: 'user' | 'assistant'; content: string; }

const SUGGESTIONS = [
  'What\'s driving Portugal at 18.9% YoY?',
  'Cross-validation status for Spain coastal',
  'Cite the latest sovereign briefing on foreign-buyer flows',
  'AVM: 3-bed apartment Marbella 110m² beach 0.4km',
  'Find Algarve frontline villas under €4M',
  'Which EU country has the lowest mortgage rate right now?',
];

export function TerminalChat({ contextPreamble }: { contextPreamble: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { inputRef.current?.focus(); }, []);

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
      const reply = data.response || data.error || 'No response.';
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

  return (
    <div className="rounded-sm border flex flex-col min-h-[600px]" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="flex items-baseline gap-3">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Avena Oracle</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Sonnet 4 · 14 institutional tools · cited</span>
        </div>
        {messages.length > 0 && (
          <button onClick={copyConversation} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground" aria-label="Copy conversation">
            <Copy className="h-3 w-3" /> copy
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Live context</div>
            <p className="text-xs text-foreground/85 leading-relaxed mb-6">{contextPreamble}</p>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Try</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} className="rounded-sm border px-3 py-1.5 font-mono text-[10px] text-foreground/80 hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className="flex flex-col">
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] mb-1.5" style={{ color: m.role === 'user' ? 'hsl(var(--av-muted-foreground))' : 'hsl(var(--av-primary))' }}>
              {m.role === 'user' ? 'You' : 'Oracle'}
            </div>
            <div className="text-sm text-foreground/95 leading-relaxed whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}

        {loading && (
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary mb-1.5">Oracle</div>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '120ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '240ms' }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t px-3 py-3 flex items-end gap-2" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask Oracle anything — Eurostat, ECB rates, briefings, properties, cross-validation… (Enter to send)"
          rows={2}
          className="flex-1 resize-none bg-transparent border-0 outline-0 font-mono text-xs text-foreground placeholder:text-muted-foreground/70"
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="rounded-sm border px-3 py-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: 'hsl(var(--av-border-strong))' }}
          aria-label="Send"
        >
          <Send className="h-3 w-3" /> send
        </button>
      </div>
    </div>
  );
}

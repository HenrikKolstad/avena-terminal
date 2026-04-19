'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Send, Sparkles, Lock, ArrowUpRight } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { useAuth } from '@/context/AuthContext';

const FREE_DAILY_LIMIT = 5;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const { isPaid } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [freeQueriesUsed, setFreeQueriesUsed] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const key = 'avena_free_queries_' + new Date().toISOString().slice(0, 10);
    const count = parseInt(localStorage.getItem(key) || '0', 10);
    setFreeQueriesUsed(count);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    if (!isPaid && freeQueriesUsed >= FREE_DAILY_LIMIT) {
      setMessages(prev => [...prev,
        { role: 'user', content: msg },
        { role: 'assistant', content: "You've reached your 5 free questions for today.\n\nUpgrade to PRO for unlimited access to Europe's most advanced property investment AI — unlimited queries, live market data, yield calculations, alpha signals and deal alerts.\n\nAvena PRO: \u20AC79/month\navenaterminal.com" },
      ]);
      setInput('');
      return;
    }

    const userMsg: Message = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages.slice(-8) }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + (data.error || 'Something went wrong.') }]);
      }

      if (!isPaid) {
        const key = 'avena_free_queries_' + new Date().toISOString().slice(0, 10);
        const newCount = freeQueriesUsed + 1;
        setFreeQueriesUsed(newCount);
        localStorage.setItem(key, String(newCount));
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Try again.' }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const suggestions = [
    'Find me a 3-bed villa under \u20AC350k with sea views',
    "What's the rental yield in Calpe?",
    'Is now a good time to buy in Costa Blanca?',
    'Show me the best value deals this week',
    'Compare Costa Blanca South vs Costa del Sol',
    'What does the ECB cutting cycle mean for buyers?',
    'Any alpha signals in Costa Blanca right now?',
    'What taxes do UK buyers pay in Spain?',
  ];

  const freeRemaining = FREE_DAILY_LIMIT - freeQueriesUsed;
  const freeLimitReached = !isPaid && freeRemaining <= 0;

  return (
    <div className="avena-v2 min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 flex flex-col pt-16">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center px-5 py-16 sm:py-24">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Oracle AI · European Property Intelligence
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
            </span>

            <h1 className="font-serif text-6xl sm:text-7xl font-light leading-[0.95] tracking-tight text-foreground text-center mb-6">
              The <span className="italic text-gold">Oracle</span>.
            </h1>
            <p className="text-muted-foreground text-base max-w-lg text-center mb-2">
              Europe&apos;s most advanced property investment AI.
            </p>
            <p className="text-muted-foreground/70 text-xs max-w-lg text-center mb-10 font-mono uppercase tracking-[0.18em]">
              Live data · 1,881 scored properties · 10 analytical tools
            </p>

            {!isPaid && !freeLimitReached && (
              <div
                className="rounded-sm p-6 mb-8 max-w-md w-full text-center border"
                style={{
                  background: 'hsl(var(--av-surface) / 0.6)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                <Sparkles size={18} className="text-primary mx-auto mb-3" />
                <p className="text-sm text-foreground mb-1 font-serif text-lg">Ask up to 5 free questions today</p>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-[0.18em]">
                  {freeRemaining} remaining &middot; Upgrade for unlimited
                </p>
              </div>
            )}

            {!isPaid && freeLimitReached && (
              <div
                className="rounded-sm p-6 mb-8 max-w-md w-full text-center border"
                style={{
                  background: 'hsl(var(--av-surface) / 0.6)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                <Lock size={18} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-foreground mb-4 font-serif text-lg">Daily limit reached</p>
                <Link
                  href="/pro"
                  className="group inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  Upgrade to PRO — €79/mo
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            )}

            {isPaid && (
              <div
                className="rounded-sm px-5 py-2 mb-8 border inline-flex items-center gap-2"
                style={{
                  background: 'hsl(var(--av-primary) / 0.08)',
                  borderColor: 'hsl(var(--av-primary) / 0.3)',
                }}
              >
                <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">PRO · Unlimited</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-3xl w-full mb-10">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-left px-4 py-3 rounded-sm text-sm text-muted-foreground border transition-all hover:text-foreground group"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <span className="font-serif italic">&ldquo;</span>
                  {s}
                  <span className="font-serif italic">&rdquo;</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
              <span className="flex items-center gap-2">
                <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
                Live data
              </span>
              <span>10 tools</span>
              <span>Property search</span>
              <span>Alpha signals</span>
              <span>Yield modeling</span>
              <span>Tax calc</span>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
            <div className="max-w-4xl mx-auto space-y-5">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-sm px-5 py-4 text-sm leading-relaxed border ${
                      msg.role === 'user' ? 'text-foreground' : 'text-foreground/90'
                    }`}
                    style={
                      msg.role === 'user'
                        ? {
                            background: 'hsl(var(--av-primary) / 0.08)',
                            borderColor: 'hsl(var(--av-primary) / 0.25)',
                          }
                        : {
                            background: 'hsl(var(--av-surface) / 0.5)',
                            borderColor: 'hsl(var(--av-border) / 0.6)',
                          }
                    }
                  >
                    {msg.role === 'assistant' ? (
                      <>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        {!isPaid && (msg.content.includes('free questions for today') || msg.content.includes('Daily limit reached')) && (
                          <Link
                            href="/pro"
                            className="group mt-4 inline-flex items-center gap-2 rounded-sm px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                            style={{ background: 'var(--av-gradient-gold)' }}
                          >
                            Upgrade to PRO — €79/mo
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        )}
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div
                    className="rounded-sm px-5 py-4 border text-sm flex items-center gap-3"
                    style={{
                      background: 'hsl(var(--av-surface) / 0.5)',
                      borderColor: 'hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <Sparkles size={14} className="text-primary animate-pulse" />
                    <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.22em]">
                      Oracle is analyzing...
                    </span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>
        )}

        {/* Input */}
        <div
          className="sticky bottom-0 border-t px-5 py-4 backdrop-blur-xl"
          style={{
            borderColor: 'hsl(var(--av-border) / 0.6)',
            background: 'hsl(var(--av-background) / 0.85)',
          }}
        >
          <div className="max-w-4xl mx-auto flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder={freeLimitReached ? 'Daily limit reached — upgrade for unlimited' : isPaid ? 'Ask the Oracle about European property...' : 'Ask the Oracle...'}
                rows={1}
                className="w-full px-4 py-3 rounded-sm text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors resize-none border"
                style={{
                  background: 'hsl(var(--av-surface) / 0.6)',
                  borderColor: 'hsl(var(--av-border-strong))',
                }}
              />
              {freeLimitReached && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Lock size={14} className="text-muted-foreground" />
                </div>
              )}
            </div>
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="px-5 py-3 rounded-sm transition-all disabled:opacity-30 hover:-translate-y-0.5 self-end shadow-gold text-primary-foreground"
              style={{ background: 'var(--av-gradient-gold)' }}
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="max-w-4xl mx-auto flex items-center justify-between mt-2 px-1">
            <p className="text-[9px] text-muted-foreground/60 font-mono uppercase tracking-[0.18em]">
              Avena Property LLM &middot; Not financial advice
            </p>
            {isPaid ? (
              <p className="text-[9px] text-primary/70 font-mono uppercase tracking-[0.18em]">PRO active</p>
            ) : freeLimitReached ? (
              <Link
                href="/pro"
                className="text-[9px] font-mono uppercase tracking-[0.18em] text-primary hover:text-gold"
              >
                Upgrade to PRO →
              </Link>
            ) : (
              <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-[0.18em]">
                {freeRemaining} free left today
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

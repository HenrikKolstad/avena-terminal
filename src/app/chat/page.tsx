'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Send, Sparkles, Lock } from 'lucide-react';
import DnaHelix from '@/components/DnaHelix';
import { useAuth } from '@/context/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const { user, isPaid, startCheckout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

    // PRO GATE — free users get blocked
    if (!isPaid) {
      setMessages(prev => [...prev,
        { role: 'user', content: msg },
        { role: 'assistant', content: "The Avena Oracle is available to PRO members.\n\nUpgrade to access Europe's most advanced property investment AI — unlimited queries, live market data, yield calculations, alpha signals and deal alerts.\n\nAvena PRO: \u20AC79/month\navenaterminal.com" },
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#090d12' }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(9,13,18,0.9)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <DnaHelix size={24} />
              <span className="text-lg font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</span>
            </Link>
            <div className="h-5 w-px bg-[#1c2333]" />
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-400" />
              <span className="text-sm font-semibold text-white">Oracle AI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isPaid ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: '#10b98120', color: '#10b981' }}>PRO</span>
            ) : (
              <button onClick={() => startCheckout()} className="text-[10px] px-3 py-1 rounded-full font-bold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>Upgrade to PRO</button>
            )}
            <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors">Terminal</Link>
          </div>
        </div>
      </header>

      {/* Empty state */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
          <div className="mb-6">
            <DnaHelix size={48} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">Avena Oracle</h1>
          <p className="text-gray-500 text-sm mb-1 text-center">Europe&apos;s most advanced property investment AI</p>
          <p className="text-gray-600 text-xs mb-8 text-center">Powered by live data from 1,881 scored properties</p>

          {!isPaid && (
            <div className="rounded-xl p-5 mb-6 max-w-md w-full text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <Lock size={20} className="text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-400 mb-3">Oracle AI is a PRO feature</p>
              <button onClick={() => startCheckout()} className="px-6 py-2 rounded-lg text-sm font-bold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                Upgrade to PRO — \u20AC79/mo
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl w-full mb-8">
            {suggestions.map((s) => (
              <button key={s} onClick={() => setInput(s)}
                className="text-left px-3 py-2.5 rounded-lg text-xs text-gray-400 border transition-all hover:border-emerald-500/30 hover:text-white hover:bg-[#ffffff05]"
                style={{ background: '#0d1117', borderColor: '#1c2333' }}>
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-[10px] text-gray-600">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live data</span>
            <span>Tool use enabled</span>
            <span>Property search</span>
            <span>Alpha signals</span>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-white'
                    : 'border text-gray-300'
                }`} style={msg.role === 'assistant' ? { background: '#0f1419', borderColor: '#1c2333' } : {}}>
                  {msg.role === 'assistant' ? (
                    <>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {!isPaid && msg.content.includes('PRO members') && (
                        <button onClick={() => startCheckout()} className="mt-3 px-4 py-2 rounded-lg text-xs font-bold block" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                          Upgrade to PRO — \u20AC79/mo
                        </button>
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
                <div className="rounded-xl px-4 py-3 border text-sm flex items-center gap-2" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
                  <Sparkles size={14} className="text-emerald-400 animate-pulse" />
                  <span className="text-gray-500 text-xs">Oracle is analyzing...</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 border-t px-4 py-3" style={{ borderColor: '#1c2333', background: '#090d12' }}>
        <div className="max-w-4xl mx-auto flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder={isPaid ? 'Ask about Spanish property...' : 'Try asking a question...'}
              rows={1}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-colors resize-none"
              style={{ background: '#0d1117', border: '1px solid #1c2333' }}
              onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = '#10B981'; }}
              onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = '#1c2333'; }}
            />
            {!isPaid && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Lock size={14} className="text-gray-600" />
              </div>
            )}
          </div>
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-3 rounded-xl transition-all disabled:opacity-30 hover:opacity-90 self-end"
            style={{ background: '#10B981', color: '#0d1117' }}
          >
            <Send size={18} />
          </button>
        </div>
        <div className="max-w-4xl mx-auto flex items-center justify-between mt-2">
          <p className="text-[9px] text-gray-700">Powered by Avena Property LLM &middot; Not financial advice</p>
          {!isPaid ? (
            <button onClick={() => startCheckout()} className="text-[9px] font-bold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Upgrade to PRO</button>
          ) : (
            <p className="text-[9px] text-emerald-400/40">PRO active</p>
          )}
        </div>
      </div>
    </div>
  );
}

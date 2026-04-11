'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages.slice(-6) }),
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
    'What is the best yielding town in Costa Blanca?',
    'Show me villas under €300k with 7%+ yield',
    'How do I get a NIE number in Spain?',
    'What taxes do I pay as a non-resident buyer?',
    'Compare Torrevieja vs Orihuela Costa',
    'What are the top 5 deals right now?',
    'How much are community fees for new builds?',
    'Is it a good time to buy in Spain?',
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#090d12' }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(9,13,18,0.9)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors">Back to Terminal</Link>
        </div>
      </header>

      {/* Title */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
          <h1 className="text-3xl md:text-5xl font-extralight tracking-[0.3em] mb-3" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>THE ORACLE</h1>
          <p className="text-gray-500 text-sm mb-8">Ask anything about Spanish property — investments, NIE, taxes, buying process</p>

          {/* Suggestions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl w-full mb-8">
            {suggestions.map((s) => (
              <button key={s} onClick={() => { setInput(s); }}
                className="text-left px-3 py-2.5 rounded-lg text-xs text-gray-400 border transition-all hover:border-emerald-500/30 hover:text-white"
                style={{ background: '#0d1117', borderColor: '#1c2333' }}>
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-gray-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live data from 1,881 scored properties</span>
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
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl px-4 py-3 border text-sm" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
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
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask about Spanish property..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-colors"
            style={{ background: '#0d1117', border: '1px solid #1c2333' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#10B981'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1c2333'; }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-3 rounded-xl transition-all disabled:opacity-30 hover:opacity-90"
            style={{ background: '#10B981', color: '#0d1117' }}
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-center text-[9px] text-gray-700 mt-2">AI responses based on live Avena Terminal data. Not financial advice.</p>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Copy, Check, MessageCircle, Share2 } from 'lucide-react';

interface Props {
  url: string;
  text: string;
}

export function ShareButtons({ url, text }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} — ${url}`)}`;

  const style = {
    borderColor: 'hsl(var(--av-border) / 0.6)',
    background: 'hsl(var(--av-surface) / 0.4)',
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary hover:border-primary transition-colors"
        style={style}
        aria-label="Copy link"
      >
        {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <a href={tweet} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary hover:border-primary transition-colors" style={style}>
        <Share2 className="h-3 w-3" /> X
      </a>
      <a href={linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary hover:border-primary transition-colors" style={style}>
        <Share2 className="h-3 w-3" /> LinkedIn
      </a>
      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary hover:border-primary transition-colors" style={style}>
        <MessageCircle className="h-3 w-3" /> WhatsApp
      </a>
    </div>
  );
}

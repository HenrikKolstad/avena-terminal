'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { isInWatchlist, toggleWatchlist } from '@/lib/watchlist';

interface Props {
  propertyRef: string;
  /** 'icon' = just the star, 'full' = star + label */
  variant?: 'icon' | 'full';
  /** 'sm' | 'md' — controls padding + icon size */
  size?: 'sm' | 'md';
  className?: string;
}

export function WatchlistButton({
  propertyRef,
  variant = 'full',
  size = 'md',
  className = '',
}: Props) {
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSaved(isInWatchlist(propertyRef));
    const onChange = () => setSaved(isInWatchlist(propertyRef));
    window.addEventListener('avena:watchlist', onChange);
    return () => window.removeEventListener('avena:watchlist', onChange);
  }, [propertyRef]);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { added } = toggleWatchlist(propertyRef);
    setSaved(added);
  };

  const starSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const pad = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';

  if (variant === 'icon') {
    return (
      <button
        onClick={onClick}
        aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}
        aria-pressed={saved}
        className={`inline-flex items-center justify-center rounded-sm border transition-all hover:border-primary ${pad} ${className}`}
        style={{
          borderColor: saved ? 'hsl(var(--av-primary) / 0.6)' : 'hsl(var(--av-border) / 0.6)',
          background: saved ? 'hsl(var(--av-primary) / 0.1)' : 'hsl(var(--av-surface) / 0.4)',
          color: saved ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
        }}
      >
        <Star className={starSize} fill={mounted && saved ? 'currentColor' : 'none'} />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={saved}
      className={`inline-flex items-center gap-2 rounded-sm border font-mono text-[10px] uppercase tracking-[0.22em] transition-all hover:border-primary ${pad} ${className}`}
      style={{
        borderColor: saved ? 'hsl(var(--av-primary) / 0.6)' : 'hsl(var(--av-border-strong))',
        background: saved ? 'hsl(var(--av-primary) / 0.1)' : 'hsl(var(--av-surface) / 0.4)',
        color: saved ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground))',
      }}
    >
      <Star className={starSize} fill={mounted && saved ? 'currentColor' : 'none'} />
      {mounted && saved ? 'Watching' : 'Watch'}
    </button>
  );
}

/**
 * Tiny counter badge — renders current watchlist size. Used in Nav.
 */
export function WatchlistBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem('avena_watchlist_v1');
        if (!raw) return setCount(0);
        const arr = JSON.parse(raw);
        setCount(Array.isArray(arr) ? arr.length : 0);
      } catch {
        setCount(0);
      }
    };
    read();
    window.addEventListener('avena:watchlist', read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener('avena:watchlist', read);
      window.removeEventListener('storage', read);
    };
  }, []);

  if (count === 0) return null;
  return (
    <span
      className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold text-primary-foreground"
      style={{ background: 'hsl(var(--av-primary))' }}
    >
      {count}
    </span>
  );
}

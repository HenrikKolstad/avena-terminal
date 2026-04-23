'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Trash2 } from 'lucide-react';
import { getWatchlist, removeFromWatchlist, clearWatchlist } from '@/lib/watchlist';
import type { WatchItem } from './page';

export function WatchlistClient({ properties }: { properties: WatchItem[] }) {
  const [savedRefs, setSavedRefs] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSavedRefs(getWatchlist());
    const onChange = () => setSavedRefs(getWatchlist());
    window.addEventListener('avena:watchlist', onChange);
    return () => window.removeEventListener('avena:watchlist', onChange);
  }, []);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Loading watchlist…
        </div>
      </div>
    );
  }

  const saved = savedRefs
    .map((ref) => properties.find((p) => p.ref === ref))
    .filter((p): p is WatchItem => !!p);

  const missing = savedRefs.length - saved.length;

  if (saved.length === 0) {
    return (
      <div className="mx-auto max-w-[800px] px-5 sm:px-12 py-24">
        <div
          className="rounded-sm border p-12 text-center"
          style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          <Star className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-light text-foreground mb-3">
            Nothing saved yet.
          </h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed mb-8 max-w-md mx-auto">
            Star properties to pin them here. Perfect for comparing 3–5 shortlists
            before you contact — or coming back tomorrow without losing your place.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
            style={{ background: 'var(--av-gradient-gold)' }}
          >
            Browse deals →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {saved.length} saved {saved.length === 1 ? 'deal' : 'deals'}
          {missing > 0 && <span className="text-primary ml-3">· {missing} unavailable</span>}
        </div>
        <button
          onClick={() => { if (confirm('Clear the entire watchlist?')) clearWatchlist(); }}
          className="inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          <Trash2 className="h-3 w-3" />
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {saved.map((p) => {
          const discount = p.pm2 && p.mm2 && p.mm2 > p.pm2 ? Math.round((1 - p.pm2 / p.mm2) * 100) : 0;
          return (
            <div
              key={p.ref}
              className="group rounded-sm border overflow-hidden transition-colors hover:border-primary/50 flex flex-col"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <Link href={`/property/${encodeURIComponent(p.ref)}`} className="block relative aspect-[4/3] overflow-hidden" style={{ background: 'hsl(var(--av-surface))' }}>
                {p.imgs[0] ? (
                  <Image
                    src={p.imgs[0]}
                    alt={p.project}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40">
                    no image
                  </div>
                )}
                <span
                  className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-[9px] uppercase tracking-[0.22em] font-bold"
                  style={{ background: 'hsl(var(--av-background) / 0.85)', color: 'hsl(var(--av-primary))', backdropFilter: 'blur(8px)' }}
                >
                  <span className="font-serif text-sm leading-none">{p.score}</span>
                  /100
                </span>
              </Link>

              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/property/${encodeURIComponent(p.ref)}`} className="font-serif text-base text-foreground leading-tight line-clamp-2 hover:text-primary transition-colors">
                    {p.project}
                  </Link>
                  <button
                    onClick={() => removeFromWatchlist(p.ref)}
                    className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove from watchlist"
                  >
                    <Star className="h-4 w-4" fill="currentColor" style={{ color: 'hsl(var(--av-primary))' }} />
                  </button>
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                  {p.town}{p.costa ? ` · ${p.costa}` : ''} · {p.type} · {p.beds}bed
                </div>
                <div className="flex items-baseline justify-between mt-auto pt-2">
                  <div>
                    <div className="font-serif text-xl font-light text-foreground tabular">
                      €{p.price.toLocaleString()}
                    </div>
                    {discount > 0 && (
                      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
                        −{Math.min(discount, 35)}% vs market{discount > 35 ? '*' : ''}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono tabular text-sm text-foreground">
                      {p.yield_gross ? `${p.yield_gross.toFixed(1)}%` : '—'}
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                      yield
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

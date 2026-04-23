'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, X } from 'lucide-react';
import { getRecentlyViewed, clearRecentlyViewed } from '@/lib/recently-viewed';

interface LiteProp {
  ref: string;
  project: string;
  town: string;
  score: number;
  price: number;
  thumb: string | null;
}

/**
 * Homepage rail — shows up to 8 recently viewed properties, only if any exist.
 * Silent when empty. Client-only, hydrates after mount.
 */
export function RecentlyViewedRail() {
  const [refs, setRefs] = useState<string[]>([]);
  const [props, setProps] = useState<LiteProp[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRefs(getRecentlyViewed());
    const onChange = () => setRefs(getRecentlyViewed());
    window.addEventListener('avena:recently-viewed', onChange);
    return () => window.removeEventListener('avena:recently-viewed', onChange);
  }, []);

  useEffect(() => {
    if (refs.length === 0) { setProps([]); return; }
    fetch('/api/search/index')
      .then((r) => r.json())
      .then((data) => {
        const found = refs
          .map((ref) => {
            const p = (data.properties ?? []).find((x: { url: string; title: string; sub?: string; score?: number }) => x.url.includes(encodeURIComponent(ref)));
            if (!p) return null;
            // Parse sub "{town} · {type} · {beds}bed · €{price}"
            const parts = (p.sub as string).split(' · ');
            const town = parts[0];
            const priceMatch = (p.sub as string).match(/€([\d\s,]+)/);
            const price = priceMatch ? Number(priceMatch[1].replace(/[\s,]/g, '')) : 0;
            return {
              ref,
              project: p.title,
              town,
              score: p.score ?? 0,
              price,
              thumb: null,
            } as LiteProp;
          })
          .filter((p): p is LiteProp => !!p);
        setProps(found);
      })
      .catch(() => setProps([]));
  }, [refs]);

  if (!mounted || refs.length === 0 || props.length === 0) return null;

  return (
    <section
      className="border-y"
      style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.2)' }}
    >
      <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-10">
        <div className="flex items-center justify-between mb-5">
          <div className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
            <Clock className="h-3 w-3" />
            Recently viewed · {props.length}
          </div>
          <button
            onClick={() => clearRecentlyViewed()}
            className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 sm:-mx-12 px-5 sm:px-12">
          {props.slice(0, 10).map((p) => (
            <Link
              key={p.ref}
              href={`/property/${encodeURIComponent(p.ref)}`}
              className="group flex-shrink-0 w-[240px] rounded-sm border p-4 transition-colors hover:border-primary/50"
              style={{ background: 'hsl(var(--av-surface) / 0.5)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <div className="font-serif text-sm text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors mb-2">
                {p.project}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-3 truncate">
                {p.town}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-xl text-gold tabular">{p.score}</span>
                <span className="font-mono text-xs tabular text-foreground">€{p.price.toLocaleString()}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

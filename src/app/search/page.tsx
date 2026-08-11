'use client';

/**
 * Search — restyled into the MARE register 2026-08-11. This page predated the
 * MARE redesign and still wore the green terminal theme; it was also an
 * orphan until the nav linked it today. Functionality unchanged: semantic
 * search via /api/search/semantic, plus direct ref lookup ("SP1518") that
 * routes straight to the property dossier.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

interface SearchResult {
  ref: string;
  project: string;
  developer: string;
  town: string;
  region: string;
  type: string;
  price: number;
  priceM2: number | null;
  built: number;
  beds: number;
  baths: number;
  beachKm: number | null;
  status: string;
  score: number | null;
  relevance: number;
  yield: { gross: number; net: number; annual: number } | null;
  categories: string[];
  views: string[];
  pool: string | null;
  energy: string | null;
  image: string | null;
  discount: number | null;
}

interface SearchResponse {
  query: string;
  interpreted_as: string[];
  count: number;
  results: SearchResult[];
}

const SUGGESTIONS = [
  '3 bed villa near beach under €350k',
  'High yield apartment Costa Blanca',
  'Penthouse with sea views under €500k',
  'Cheap new build near golf course',
  'Investment property with pool and high score',
];

export default function SemanticSearchPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSearch = async () => {
    const q = query.trim();
    if (!q || loading) return;

    // Reference lookup: "SP1518" or "N7745" (any case, optional whitespace)
    // goes straight to the property page instead of burning a semantic-search
    // call on an exact identifier. Unknown refs land on the real 404.
    const ref = q.replace(/\s+/g, '').toUpperCase();
    if (/^(?:SP|N)\d{3,5}$/.test(ref)) {
      router.push(`/property/${ref}`);
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Search failed');
      } else {
        setData(json);
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  const fmt = (n: number) =>
    n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(2)}M` : `€${(n / 1000).toFixed(0)}k`;

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="av-clean pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 pb-12 pt-16 text-center sm:px-8">
            <div className="mb-6 flex items-center justify-center gap-4">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold">
                Search the book · 1,999 scored new-builds
              </span>
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
            </div>
            <h1 className="font-serif text-4xl font-light leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              Describe it, or name it
              <br />
              <em className="italic" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>we&apos;ll find it.</em>
            </h1>
            <p className="mx-auto mt-5 max-w-xl font-serif text-base font-light leading-relaxed text-foreground/80">
              Plain language works. So does a reference — type SP1518 and go straight to the dossier.
            </p>

            {/* Search bar */}
            {/* A real form so Enter and mobile keyboards' "go" submit natively,
                instead of depending on a keydown listener. */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
              className="mx-auto mt-9 flex max-w-2xl items-center gap-3 border px-5 py-4"
              style={{ background: 'hsl(var(--av-surface) / 0.5)', borderColor: 'hsl(var(--av-primary) / 0.35)' }}
            >
              <Search size={16} className="shrink-0" style={{ color: 'hsl(var(--av-primary) / 0.8)' }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ref (SP1518) or e.g. 3-bed villa near beach under €350k"
                className="flex-1 bg-transparent font-serif text-sm font-light text-foreground outline-none placeholder:text-foreground/35 sm:text-base"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="shrink-0 px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.3em] text-primary-foreground transition hover:-translate-y-0.5 disabled:opacity-40"
                style={{ background: 'hsl(var(--av-primary) / 0.9)' }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : 'Search'}
              </button>
            </form>

            {/* Suggestions */}
            {!data && !loading && (
              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="border px-4 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:border-primary hover:text-gold"
                    style={{ borderColor: 'hsl(var(--av-border) / 0.8)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <Loader2 size={28} className="animate-spin" style={{ color: 'hsl(var(--av-primary))' }} />
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Reading your brief
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-auto max-w-2xl px-5 py-10">
            <div
              className="border px-5 py-4 font-mono text-[11px] uppercase tracking-[0.15em]"
              style={{ borderColor: 'hsl(0 45% 40% / 0.5)', color: 'hsl(0 60% 70%)' }}
            >
              {error}
            </div>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <section className="mx-auto max-w-[1300px] px-5 pb-24 pt-10 sm:px-8">
            {data.interpreted_as.length > 0 && (
              <div className="mb-8 flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                  Read as
                </span>
                {data.interpreted_as.map((tag, i) => (
                  <span
                    key={i}
                    className="border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.15em]"
                    style={{ borderColor: 'hsl(var(--av-primary) / 0.4)', color: 'hsl(var(--av-primary) / 0.92)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mb-6 flex items-center gap-4">
              <span className="font-serif text-lg font-light text-foreground">
                {data.count} {data.count === 1 ? 'property' : 'properties'}
              </span>
              <span className="h-px flex-1" style={{ background: 'hsl(var(--av-border) / 0.6)' }} />
            </div>

            {data.count === 0 && (
              <p className="py-14 text-center font-serif text-base font-light text-foreground/60">
                Nothing in the book matches that brief. Try broadening it.
              </p>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {data.results.map((r) => (
                <Link
                  key={r.ref}
                  href={`/property/${r.ref}`}
                  className="group block overflow-hidden border transition-colors hover:border-primary"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.7)' }}
                >
                  <div className="aspect-[16/10] overflow-hidden" style={{ background: 'hsl(var(--av-surface))' }}>
                    {r.image ? (
                      <Image
                        src={r.image}
                        alt={r.project}
                        width={640}
                        height={400}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-[9px] uppercase tracking-[0.3em] text-foreground/30">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="truncate font-serif text-sm font-light text-foreground">{r.project}</h3>
                    <p className="mb-3 mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                      {r.town} · {r.type} · {r.beds} bed
                    </p>

                    <div className="mb-3 flex items-baseline justify-between">
                      <span className="font-serif text-lg font-light text-foreground tabular">{fmt(r.price)}</span>
                      <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em]">
                        {r.discount !== null && r.discount > 0 && (
                          <span style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>−{r.discount}% vs market</span>
                        )}
                        {r.score !== null && (
                          <span
                            className="border px-1.5 py-0.5"
                            style={{ borderColor: 'hsl(var(--av-primary) / 0.4)', color: 'hsl(var(--av-primary) / 0.92)' }}
                          >
                            {r.score}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                      {r.yield && (
                        <span>
                          Yield <span className="text-foreground/80">{r.yield.gross.toFixed(1)}%</span>
                        </span>
                      )}
                      {r.beachKm !== null && (
                        <span>
                          Beach <span className="text-foreground/80">{r.beachKm.toFixed(1)} km</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

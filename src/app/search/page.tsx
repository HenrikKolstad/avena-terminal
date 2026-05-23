'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Loader2, ArrowLeft } from 'lucide-react';
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

export default function SemanticSearchPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q || loading) return;

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
    n >= 1_000_000
      ? `€${(n / 1_000_000).toFixed(2)}M`
      : `€${(n / 1000).toFixed(0)}k`;

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--av-background))' }}>
      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 backdrop-blur-sm"
        style={{ borderColor: 'hsl(var(--av-border))', background: 'rgba(13,17,23,0.92)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-lg font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-primary via-primary to-primary bg-clip-text text-transparent"
            >
              AVENA
            </Link>
            <span className="text-xs text-gray-500 hidden sm:inline">Semantic Search</span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft size={12} />
            Terminal
          </Link>
        </div>
      </header>

      {/* Search Section */}
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-8">
        <h1
          className="text-3xl md:text-4xl font-extralight tracking-[0.2em] text-center mb-2"
          style={{
            background: 'linear-gradient(135deg, #34d399, #10b981, #059669)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          SEMANTIC SEARCH
        </h1>
        <p className="text-center text-gray-500 text-sm mb-8">
          Describe your ideal property in natural language
        </p>

        {/* Search Bar */}
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 border"
          style={{ background: 'hsl(var(--av-surface))', borderColor: 'hsl(var(--av-border))' }}
        >
          <Search size={18} className="text-gray-500 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. 3-bed villa near beach under €350k with sea views"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-600"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: '#238636', color: '#fff' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Quick suggestions */}
        {!data && !loading && (
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {[
              '3 bed villa near beach under €350k',
              'High yield apartment Costa Blanca',
              'Penthouse with sea views under €500k',
              'Cheap new build near golf course',
              'Investment property with pool and high score',
            ].map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); }}
                className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:border-primary hover:text-primary"
                style={{ borderColor: 'hsl(var(--av-border))', color: '#8b949e' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-gray-500 text-sm">Analyzing your query with AI...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-3xl mx-auto px-4">
          <div
            className="rounded-lg px-4 py-3 text-sm border"
            style={{ background: '#1c1117', borderColor: '#5c2d2d', color: '#f87171' }}
          >
            {error}
          </div>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="max-w-6xl mx-auto px-4 pb-16">
          {/* Interpreted Tags */}
          {data.interpreted_as.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-gray-500 mb-2">Interpreted criteria:</p>
              <div className="flex flex-wrap gap-2">
                {data.interpreted_as.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1 rounded-full border"
                    style={{
                      borderColor: '#238636',
                      color: '#3fb950',
                      background: 'rgba(35,134,54,0.1)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm text-gray-400 mb-4">
            {data.count} {data.count === 1 ? 'property' : 'properties'} found
          </p>

          {data.count === 0 && (
            <p className="text-gray-600 text-center py-12">
              No properties matched your criteria. Try broadening your search.
            </p>
          )}

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.results.map((r) => (
              <Link
                key={r.ref}
                href={`/property/${r.ref}`}
                className="block rounded-xl border overflow-hidden transition-all hover:border-primary group"
                style={{ background: 'hsl(var(--av-surface))', borderColor: 'hsl(var(--av-border))' }}
              >
                {/* Image */}
                {r.image ? (
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={r.image}
                      alt={r.project}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div
                    className="aspect-[16/10] flex items-center justify-center"
                    style={{ background: '#21262d' }}
                  >
                    <span className="text-gray-600 text-xs">No image</span>
                  </div>
                )}

                <div className="p-3">
                  {/* Project + Town */}
                  <h3 className="text-sm font-medium text-white truncate">{r.project}</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    {r.town} &middot; {r.type} &middot; {r.beds} bed
                  </p>

                  {/* Price Row */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-primary font-semibold text-sm">{fmt(r.price)}</span>
                    <div className="flex items-center gap-2">
                      {r.discount !== null && r.discount > 0 && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: 'rgba(35,134,54,0.15)', color: '#3fb950' }}
                        >
                          -{r.discount}%
                        </span>
                      )}
                      {r.score !== null && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                          style={{
                            background:
                              r.score >= 75
                                ? 'rgba(35,134,54,0.2)'
                                : r.score >= 50
                                ? 'rgba(187,128,9,0.2)'
                                : 'rgba(110,110,110,0.2)',
                            color:
                              r.score >= 75
                                ? '#3fb950'
                                : r.score >= 50
                                ? '#d29922'
                                : '#8b949e',
                          }}
                        >
                          {r.score}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Yield + Beach */}
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    {r.yield && (
                      <span>
                        Yield{' '}
                        <span className="text-primary font-medium">
                          {r.yield.gross.toFixed(1)}%
                        </span>
                      </span>
                    )}
                    {r.beachKm !== null && (
                      <span>
                        Beach{' '}
                        <span className="text-gray-400">{r.beachKm.toFixed(1)}km</span>
                      </span>
                    )}
                    {r.built > 0 && <span>{r.built}m&sup2;</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Sparkles } from 'lucide-react';

export function MemoForm({ examples }: { examples: string[] }) {
  const router = useRouter();
  const [thesis, setThesis] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (thesis.trim().length < 8) {
      setError('Add a bit more detail — what region, type, price band, horizon?');
      return;
    }
    setError(null);
    setSubmitting(true);
    setProgress('Parsing thesis…');

    // Light client-side fake progress to communicate work happening
    const progressSteps = [
      ['Parsing thesis…',         0],
      ['Selecting universe…',     2000],
      ['Running Counterpart…',    5000],
      ['Generating sections…',    9000],
      ['Stamping citation…',      22000],
    ] as const;
    const timers = progressSteps.map(([msg, delay]) => setTimeout(() => setProgress(msg), delay));

    try {
      const res = await fetch('/api/v1/memo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thesis }),
      });
      const json = await res.json();
      timers.forEach(clearTimeout);

      if (!json.ok || !json.memo?.short_id) {
        setError(json.error || 'Generation failed. Try a different thesis.');
        setSubmitting(false);
        setProgress(null);
        return;
      }
      router.push(`/memo/${json.memo.short_id}`);
    } catch (err) {
      timers.forEach(clearTimeout);
      setError(err instanceof Error ? err.message : 'Network error');
      setSubmitting(false);
      setProgress(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3 block">Your thesis</span>
        <textarea
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          rows={3}
          placeholder="Describe what you're looking for — region, property type, price band, target yield, hold horizon."
          disabled={submitting}
          className="w-full rounded-sm border px-5 py-4 text-base text-foreground font-light placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50"
          style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border-strong))' }}
          maxLength={1000}
        />
        <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <span>{thesis.length} / 1000</span>
          <span>cmd + enter to generate</span>
        </div>
      </label>

      {error && (
        <div className="rounded-sm border p-3 text-sm" style={{ borderColor: 'hsl(var(--av-destructive) / 0.4)', background: 'hsl(var(--av-destructive) / 0.06)', color: 'hsl(var(--av-destructive))' }}>
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting || thesis.trim().length < 8}
          className="inline-flex items-center gap-2 rounded-sm px-7 py-3.5 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          style={{ background: 'var(--av-gradient-gold)' }}
        >
          {submitting ? (
            <>
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              {progress ?? 'Generating…'}
            </>
          ) : (
            <>
              Generate memo
              <ArrowUpRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
        {!submitting && (
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            ~30 seconds · free preview
          </span>
        )}
      </div>

      {/* Example thesis chips */}
      {!submitting && (
        <div className="pt-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Or try one of these</div>
          <div className="flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setThesis(ex)}
                className="rounded-sm border px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-primary transition-colors text-left max-w-full sm:max-w-md flex-1 sm:flex-none basis-full sm:basis-auto"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';

export default function RefreshDebateButton({ market }: { market: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setError(null);
    setRunning(true);
    try {
      const res = await fetch('/api/intelligence/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Debate failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleRun}
        disabled={running}
        className="group inline-flex items-center gap-2 rounded-sm px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
        style={{ background: 'var(--av-gradient-gold)' }}
      >
        {running ? 'Running debate…' : 'Run new debate'}
        {!running && <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
      </button>
      {error && <span className="font-mono text-[10px] text-destructive">{error}</span>}
    </div>
  );
}

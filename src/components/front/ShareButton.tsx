'use client';

import { useState } from 'react';

export function ShareButton({ path }: { path: string }) {
  const [done, setDone] = useState(false);
  async function share() {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) { await navigator.share({ url }); return; }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch { /* user cancelled */ }
  }
  return (
    <button type="button" onClick={share} className="rounded-md border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em]" style={{ borderColor: 'hsl(var(--av-primary) / 0.6)', color: 'hsl(var(--av-primary))' }}>
      {done ? 'Link copied' : 'Share'}
    </button>
  );
}

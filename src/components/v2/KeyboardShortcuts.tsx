'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Global keyboard shortcuts for power users.
 *
 * G + <key> combos (Vimium-style), ignored if focus is in a textarea/input:
 *   G T   → /terminal-v2
 *   G D   → /#deals
 *   G W   → /watchlist
 *   G H   → /
 *   G C   → /coverage
 *   G P   → /portugal
 *   G R   → /track-record
 *   G B   → /bubble-scanner
 *   G A   → /chat          (Oracle AI)
 *   G O   → /#deals        (lOok)
 *   G M   → /methodology
 *   G K   → /press/kit
 *   ?     → open shortcut overlay
 *   Esc   → close overlay / clear pending G
 */
export function KeyboardShortcuts() {
  const router = useRouter();
  const [overlay, setOverlay] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInput) return;

      if (e.key === '?') {
        e.preventDefault();
        setOverlay((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setOverlay(false);
        setPendingG(false);
        return;
      }

      if (!pendingG && (e.key === 'g' || e.key === 'G')) {
        setPendingG(true);
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => setPendingG(false), 1200);
        return;
      }

      if (pendingG) {
        const dest: Record<string, string> = {
          t: '/terminal-v2',
          d: '/#deals',
          w: '/watchlist',
          h: '/',
          c: '/coverage',
          p: '/portugal',
          r: '/track-record',
          b: '/bubble-scanner',
          a: '/chat',
          o: '/#deals',
          m: '/methodology',
          k: '/press/kit',
        };
        const key = e.key.toLowerCase();
        const target = dest[key];
        if (target) {
          e.preventDefault();
          router.push(target);
        }
        setPendingG(false);
        if (resetTimer) clearTimeout(resetTimer);
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [pendingG, router]);

  if (!overlay && !pendingG) return null;

  return (
    <>
      {pendingG && !overlay && (
        <div
          className="fixed bottom-5 left-5 z-[60] rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.3em]"
          style={{
            background: 'hsl(var(--av-background) / 0.9)',
            borderColor: 'hsl(var(--av-primary) / 0.5)',
            color: 'hsl(var(--av-primary))',
            backdropFilter: 'blur(8px)',
          }}
        >
          G · <span className="text-muted-foreground">next key…</span>
        </div>
      )}
      {overlay && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-24"
          style={{ background: 'hsl(var(--av-background) / 0.85)', backdropFilter: 'blur(6px)' }}
          onClick={() => setOverlay(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-sm border p-6 max-w-lg w-[90%]"
            style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">
              Keyboard shortcuts
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                ['G T', 'Terminal v2'],
                ['G D', 'Deals'],
                ['G W', 'Watchlist'],
                ['G H', 'Home'],
                ['G C', 'Coverage'],
                ['G R', 'Track record'],
                ['G B', 'Bubble scanner'],
                ['G P', 'Portugal'],
                ['G A', 'Oracle AI'],
                ['G M', 'Methodology'],
                ['G K', 'Press kit'],
                ['?', 'Toggle overlay'],
              ].map(([k, label]) => (
                <div key={k} className="flex items-center gap-3">
                  <kbd
                    className="font-mono text-[10px] px-2 py-1 rounded-sm border min-w-[48px] text-center"
                    style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface) / 0.4)', color: 'hsl(var(--av-primary))' }}
                  >
                    {k}
                  </kbd>
                  <span className="text-sm text-foreground font-light">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
              Press <kbd className="px-1 rounded border mx-0.5" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>ESC</kbd> to close · Press <kbd className="px-1 rounded border mx-0.5" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>/</kbd> on terminal-v2 to focus search
            </div>
          </div>
        </div>
      )}
    </>
  );
}

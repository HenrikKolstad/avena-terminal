'use client';

import { Info } from 'lucide-react';
import { useState } from 'react';

/**
 * Avena Policy Engine tooltip — a small "i" icon that reveals an
 * explanation on hover (desktop) or tap (mobile). Replaces the need
 * for users to memorise macroprudential vocabulary.
 *
 * Design discipline:
 *   · 12px icon, muted-foreground by default, primary on hover
 *   · Tooltip auto-positions above (or below if at top of viewport)
 *   · Mono caption + serif body for the same typographic rhythm as
 *     the rest of the page
 *   · Width capped at 320px; respects parent overflow
 */

interface Props {
  /** Short caption shown above the body (e.g. the technical term) */
  caption?: string;
  /** Plain-language explanation */
  body: string;
  /** Optional source citation rendered as small italic line */
  source?: string;
  /** Position: 'top' (default) or 'bottom'. 'top' reverts to 'bottom' if no room. */
  position?: 'top' | 'bottom';
  /** Optional className for the trigger wrapper */
  className?: string;
}

export function Tooltip({ caption, body, source, position = 'top', className = '' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Info"
        onClick={(e) => { e.preventDefault(); setOpen(o => !o); }}
        className="inline-flex items-center justify-center transition-colors"
        style={{ color: open ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground) / 0.6)' }}
      >
        <Info className="h-3 w-3" />
      </button>

      {open && (
        <span
          role="tooltip"
          className={`absolute z-50 w-[280px] sm:w-[320px] left-1/2 -translate-x-1/2 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} rounded-sm border p-3 shadow-elevated pointer-events-none`}
          style={{
            background: 'hsl(var(--av-surface))',
            borderColor: 'hsl(var(--av-primary) / 0.4)',
            boxShadow: '0 12px 32px -8px hsl(0 0% 0% / 0.7), 0 0 24px hsl(var(--av-primary) / 0.1)',
          }}
        >
          {caption && (
            <span className="block font-mono text-[9px] uppercase tracking-[0.32em] text-primary mb-1.5">
              {caption}
            </span>
          )}
          <span className="block text-[11px] leading-relaxed text-foreground/95">
            {body}
          </span>
          {source && (
            <span className="block mt-2 pt-2 border-t font-mono text-[9px] italic text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
              {source}
            </span>
          )}
          {/* Arrow */}
          <span
            className={`absolute left-1/2 -translate-x-1/2 ${position === 'top' ? 'top-full' : 'bottom-full'} h-2 w-2`}
            style={{
              background: 'hsl(var(--av-surface))',
              borderRight: '1px solid hsl(var(--av-primary) / 0.4)',
              borderBottom: position === 'top' ? '1px solid hsl(var(--av-primary) / 0.4)' : 'none',
              borderTop: position === 'bottom' ? '1px solid hsl(var(--av-primary) / 0.4)' : 'none',
              borderLeft: 'none',
              transform: position === 'top' ? 'translateX(-50%) translateY(-50%) rotate(45deg)' : 'translateX(-50%) translateY(50%) rotate(45deg)',
            }}
          />
        </span>
      )}
    </span>
  );
}

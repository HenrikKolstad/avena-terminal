'use client';

import { Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Avena Policy Engine tooltip — Portal-positioned popover so it always
 * escapes any parent overflow:hidden / clip / border-radius context. Uses
 * the trigger's getBoundingClientRect to anchor a fixed-positioned tooltip
 * directly under document.body.
 *
 * Behaviour:
 *   · Hover (desktop) or tap (mobile) → open
 *   · Auto-flips top/bottom based on viewport room
 *   · Re-anchors on scroll/resize while open
 *   · Closes on click-outside (mobile)
 *   · 280px wide, capped at 90vw for small screens
 */

interface Props {
  caption?: string;
  body: string;
  source?: string;
  position?: 'top' | 'bottom';
  className?: string;
}

interface Pos { top: number; left: number; flipped: boolean; }

export function Tooltip({ caption, body, source, position = 'top', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  const recompute = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const tooltipW = Math.min(280, window.innerWidth - 24);
    const tooltipH = 180;             // approximate; will auto-fit
    const margin = 8;
    // Centre horizontally on the trigger, clamp to viewport
    let left = r.left + r.width / 2 - tooltipW / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipW - 12));
    // Vertical: prefer requested position, flip if no room
    let flipped = false;
    let top = position === 'top' ? r.top - tooltipH - margin : r.bottom + margin;
    if (position === 'top' && top < 12) {
      top = r.bottom + margin;
      flipped = true;
    } else if (position === 'bottom' && top + tooltipH > window.innerHeight - 12) {
      top = r.top - tooltipH - margin;
      flipped = true;
    }
    setPos({ top, left, flipped });
  };

  useEffect(() => {
    if (!open) return;
    recompute();
    const handler = () => recompute();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on click outside (mobile)
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Info"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`inline-flex items-center justify-center transition-colors align-middle ${className}`}
        style={{ color: open ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground) / 0.6)' }}
      >
        <Info className="h-3 w-3" />
      </button>

      {mounted && open && pos && createPortal(
        <div
          role="tooltip"
          className="rounded-sm border p-3 pointer-events-none"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: Math.min(280, window.innerWidth - 24),
            zIndex: 9999,
            background: 'hsl(var(--av-surface))',
            borderColor: 'hsl(var(--av-primary) / 0.4)',
            boxShadow: '0 12px 32px -8px hsl(0 0% 0% / 0.7), 0 0 24px hsl(var(--av-primary) / 0.1)',
            color: 'hsl(var(--av-foreground))',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {caption && (
            <div className="font-mono text-[9px] uppercase tracking-[0.32em] mb-1.5" style={{ color: 'hsl(var(--av-primary))' }}>
              {caption}
            </div>
          )}
          <div className="text-[11px] leading-relaxed" style={{ color: 'hsl(var(--av-foreground) / 0.95)' }}>
            {body}
          </div>
          {source && (
            <div className="mt-2 pt-2 border-t font-mono text-[9px] italic" style={{ borderColor: 'hsl(var(--av-border) / 0.5)', color: 'hsl(var(--av-muted-foreground))' }}>
              {source}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

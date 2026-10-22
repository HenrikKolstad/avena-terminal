'use client';

export function PrintButton({ href, label }: { href?: string; label?: string }) {
  return (
    <div className="no-print policy-print-hide flex flex-wrap items-center gap-3">
      {href ? (
        <a
          href={href}
          className="inline-flex items-center border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground"
          style={{ borderColor: 'hsl(var(--av-primary) / 0.45)' }}
        >
          {label ?? 'Printable version'}
        </a>
      ) : null}
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em]"
        style={{ background: 'hsl(var(--av-primary) / 0.9)', color: 'hsl(var(--av-primary-foreground))' }}
      >
        Print / Save as PDF
      </button>
    </div>
  );
}

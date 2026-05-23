'use client';

import { Download } from 'lucide-react';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-sm border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors print:hidden"
      style={{ borderColor: 'hsl(var(--av-border-strong))' }}
    >
      <Download className="h-3.5 w-3.5" />
      Download PDF
    </button>
  );
}

/** Design tokens shared by the /engine sections — the same values EngineClient uses. */
export const GOLD = 'hsl(var(--av-primary))';
export const INK = 'hsl(var(--av-foreground))';
export const MUTED = 'hsl(var(--av-foreground) / 0.6)';
export const LINE = 'hsl(var(--av-border) / 0.7)';
export const SURFACE = 'hsl(var(--av-surface))';
export const POS = '#5FB87A';
export const NEG = '#E0785C';
export const MONO = 'ui-monospace, Menlo, monospace';
export const SERIF = 'Georgia, serif';

export const grp = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');
export const eur = (n: number) => '€' + grp(n);
export const fmtDay = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

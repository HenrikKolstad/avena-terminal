'use client';

import { ArrowUpRight } from 'lucide-react';
import { trackEvent } from '@/lib/tracking';

const TT_HANDLE = 'avenaterminal';
const TT_URL = `https://www.tiktok.com/@${TT_HANDLE}`;

/**
 * Inline TikTok icon — matches v2 luxe tone (monotone, fits in lucide sizing).
 */
function TikTokIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1Z" />
    </svg>
  );
}

/**
 * Inline small TikTok follow pill — drop next to Nav links / Footer / Hero.
 */
export function TikTokBadge({
  variant = 'default',
  className = '',
}: {
  variant?: 'default' | 'hero' | 'compact';
  className?: string;
}) {
  const base =
    'group inline-flex items-center font-mono uppercase tracking-[0.22em] transition-colors';

  const styles: Record<string, string> = {
    default:
      'gap-2 rounded-sm border px-3 py-2 text-[10px] text-foreground hover:text-primary hover:border-primary',
    hero:
      'gap-3 rounded-sm border px-5 py-3 text-[11px] text-foreground hover:text-primary hover:border-primary',
    compact:
      'gap-1.5 text-[10px] text-muted-foreground hover:text-primary',
  };

  const label = variant === 'compact' ? `@${TT_HANDLE}` : `Follow @${TT_HANDLE}`;

  return (
    <a
      href={TT_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent('ClickButton', { button: 'tiktok_follow', platform: 'tiktok' })}
      className={`${base} ${styles[variant]} ${className}`}
      style={
        variant === 'compact'
          ? {}
          : { borderColor: 'hsl(var(--av-border-strong))' }
      }
      aria-label={`Follow Avena Terminal on TikTok — @${TT_HANDLE}`}
    >
      <TikTokIcon className={variant === 'hero' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
      {label}
      {variant !== 'compact' && (
        <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      )}
    </a>
  );
}

/**
 * Full-width TikTok strip for the homepage — sits between Hero and Ticker.
 */
export function TikTokStrip() {
  return (
    <section
      className="relative border-y overflow-hidden"
      style={{
        borderColor: 'hsl(var(--av-border) / 0.6)',
        background: 'linear-gradient(90deg, hsl(var(--av-background)) 0%, hsl(var(--av-surface) / 0.6) 50%, hsl(var(--av-background)) 100%)',
      }}
    >
      <div className="mx-auto max-w-[1600px] px-5 sm:px-12 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-sm text-foreground"
            style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border-strong))' }}
            aria-hidden="true"
          >
            <TikTokIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-1">
              Now on TikTok
            </div>
            <div className="font-serif text-lg sm:text-xl text-foreground">
              Daily deals, yield breakdowns, and market reads —{' '}
              <span className="italic text-gold">@avenaterminal</span>
            </div>
          </div>
        </div>
        <TikTokBadge variant="hero" />
      </div>
    </section>
  );
}

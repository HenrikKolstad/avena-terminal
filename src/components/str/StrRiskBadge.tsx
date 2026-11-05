'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { StrRiskLevel } from '@/lib/str-regulation';

const LABEL: Record<StrRiskLevel, string> = {
  low: 'Short-let low',
  elevated: 'Short-let elevated',
  high: 'Short-let high',
  unknown: 'Short-let unknown',
};

const DOT: Record<StrRiskLevel, string> = {
  low: 'hsl(var(--av-success))',
  elevated: 'hsl(var(--av-primary))',
  high: 'hsl(var(--av-destructive))',
  unknown: 'hsl(var(--av-muted-foreground))',
};

/**
 * Small flag next to a short-let yield. The yield number is not an argument
 * of this component and is not rewritten here.
 */
export function StrRiskBadge({
  level,
  reason,
  href = '/spain/short-let-rules',
}: {
  level: StrRiskLevel | null | undefined;
  reason?: string | null;
  href?: string;
}) {
  if (!level) return null;
  return (
    <Link
      href={href}
      title={reason ? `${reason} Not legal advice.` : 'Short-let regulatory risk. Not legal advice.'}
      className="inline-flex items-center gap-1 align-middle font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: DOT[level] }} />
      {LABEL[level]}
    </Link>
  );
}

/** For a client screen that already has a place name. A failed fetch shows nothing. */
export function StrRiskLookup({ town }: { town?: string | null }) {
  const [badge, setBadge] = useState<{ level: StrRiskLevel; reason: string; href: string } | null>(null);
  useEffect(() => {
    const q = town?.trim();
    if (!q) {
      setBadge(null);
      return;
    }
    let cancel = false;
    fetch(`/api/v1/str-regulation?town=${encodeURIComponent(q)}`)
      .then((response) => response.json())
      .then((data: { town?: { risk?: StrRiskLevel; reason?: string; href?: string } | null }) => {
        if (cancel) return;
        const row = data?.town;
        if (!row?.risk || !row.href) {
          setBadge(null);
          return;
        }
        setBadge({ level: row.risk, reason: row.reason ?? '', href: row.href });
      })
      .catch(() => {
        if (!cancel) setBadge(null);
      });
    return () => {
      cancel = true;
    };
  }, [town]);
  if (!badge) return null;
  return <StrRiskBadge level={badge.level} reason={badge.reason} href={badge.href} />;
}

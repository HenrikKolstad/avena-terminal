import Link from 'next/link';
import { Info } from 'lucide-react';

/**
 * Hover/focus tooltip shown next to the "−X% vs market" badge on individual
 * property pages. Explains what the discount actually means so buyers don't
 * confuse it with "vs asking price" or a random seller discount.
 *
 * Pure CSS: group-hover + focus-visible. No client JS needed.
 * NOTE: Only used on /property/[ref] — NOT on deal lists.
 */

interface Props {
  discount: number;                 // displayed % (already capped)
  isCapped: boolean;                // was the raw discount capped at DISPLAY_CAP_PCT
  rawDiscount: number | null;       // the uncapped number (for honest tooltip)
  marketPm2: number | null;         // town median €/m²
  propertyPm2: number | null;       // this property's €/m²
  townName: string;
  completionYear?: number | null;   // for off-plan context
  status?: string | null;           // 'ready' | 'under-construction' | 'off-plan'
}

export function DiscountExplainer({
  discount,
  isCapped,
  rawDiscount,
  marketPm2,
  propertyPm2,
  townName,
  completionYear,
  status,
}: Props) {
  const isOffPlan = status === 'off-plan' || status === 'under-construction';
  const currentYear = new Date().getFullYear();
  const yearsAway = completionYear ? Math.max(0, completionYear - currentYear) : 0;

  return (
    <span className="relative inline-flex items-center gap-1 group">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary cursor-help">
        −{discount}% vs market
      </span>
      <Info
        className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary"
        aria-label="What does this discount mean?"
        tabIndex={0}
      />

      {/* Tooltip panel — pure CSS hover + focus-within for keyboard */}
      <span
        className="pointer-events-none absolute left-0 top-full z-40 mt-2 w-[min(320px,calc(100vw-2.5rem))] max-w-[320px] rounded-sm border p-4 opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"
        style={{
          background: 'hsl(var(--av-background))',
          borderColor: 'hsl(var(--av-border))',
          boxShadow: '0 10px 30px -10px rgba(0,0,0,0.6)',
        }}
        role="tooltip"
      >
        <span className="block font-mono text-[9px] uppercase tracking-[0.3em] text-primary mb-2">
          What this means
        </span>
        <span className="block text-xs text-foreground font-light leading-relaxed mb-3">
          {propertyPm2 && marketPm2 ? (
            <>
              This property prices at{' '}
              <span className="font-mono text-primary">€{propertyPm2.toLocaleString()}/m²</span>{' '}
              versus the {townName} town median of{' '}
              <span className="font-mono text-primary">€{marketPm2.toLocaleString()}/m²</span>.
              The gap is the discount — <span className="italic">vs local market</span>, not vs asking price.
            </>
          ) : (
            <>
              The discount is measured against the town median €/m² (local market),
              not against the seller&apos;s asking price.
            </>
          )}
        </span>

        <span className="block rounded-sm border p-2 mb-3 text-[10px] text-muted-foreground font-light leading-relaxed"
          style={{
            background: 'hsl(var(--av-surface) / 0.5)',
            borderColor: 'hsl(var(--av-border) / 0.6)',
          }}
        >
          <span className="font-mono uppercase tracking-[0.18em] text-[9px] block mb-1 text-primary">
            Why the gap exists
          </span>
          Most Avena deals stack two sources of value:
          <span className="block mt-1">
            <span className="text-foreground">· Developer-direct</span> — sourced from the developer,
            not via retail agencies, so the listed price excludes the 5–10% middleman markup.
          </span>
          <span className="block mt-1">
            <span className="text-foreground">· Below comp</span> — the unit itself
            prices under the town median €/m², either because the developer is moving
            inventory or the comp mix favours larger/older stock.
          </span>
          <span className="block mt-1">
            Stacked, that&apos;s typically 10–25% below what the same square metre
            would cost on idealista or a retail portal.
          </span>
        </span>

        {isCapped && rawDiscount !== null && (
          <span
            className="block rounded-sm border p-2 mb-3 text-[10px] text-muted-foreground font-light leading-relaxed"
            style={{
              background: 'hsl(var(--av-warning) / 0.08)',
              borderColor: 'hsl(var(--av-warning) / 0.3)',
            }}
          >
            <span className="font-mono uppercase tracking-[0.18em] text-[9px] block mb-1" style={{ color: 'hsl(var(--av-warning))' }}>
              Display capped
            </span>
            Raw gap is {rawDiscount}% but we cap the visible discount at 35%
            for credibility. Deeper gaps are real but usually reflect off-plan
            timing or comp scarcity — we&apos;d rather under-promise.
          </span>
        )}

        {isOffPlan && yearsAway > 0 && !isCapped && (
          <span className="block text-[10px] text-muted-foreground font-light leading-relaxed mb-3">
            Note: this is {status === 'off-plan' ? 'off-plan' : 'under construction'},
            completing {completionYear}. Off-plan properties legitimately trade below
            ready-market comps — you&apos;re pricing future delivery, not today&apos;s inventory.
          </span>
        )}

        <span className="block pt-2 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
          <Link
            href="/methodology"
            className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary hover:text-gold"
          >
            Full methodology →
          </Link>
        </span>
      </span>
    </span>
  );
}

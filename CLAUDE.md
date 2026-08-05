# AVENA — avenaterminal.com

Deal-finder for underpriced Spanish coastal new-builds, fronted by the MARE
luxury design, backed by "The Engine" (data infrastructure + AI-citation moat).
Solo founder: Henrik Kolstad (henrik@betongsproyting.no). Norwegian/English mix
in chat is normal; commit messages and code in English.

## Stack
- Next.js App Router, TypeScript strict, Tailwind v4, Vercel (prod = main branch), Supabase (Pro), Resend.
- Live: https://avenaterminal.com — every push to main deploys.

## Hard rules (learned the hard way — do not relitigate)
1. **Never invent copy.** All headline/section text is either from Henrik's
   Lovable reference or explicitly approved by him. Do not "improve" wording.
2. **No WebGL water effects.** Two attempts rejected. The only approved water
   effect is the SVG feTurbulence displacement in `CineHero` (duplicate img,
   masked to the pool area).
3. **Buyer pages (MARE surfaces) get `av-clean`** on `<main>` — kills the
   blueprint grid. Engine pages (/delphi, /benchmark, /engine…) keep the grid.
4. **Flat gold on MARE surfaces**: `hsl(var(--av-primary) / 0.9)` buttons.
   Never `var(--av-gradient-gold)`, never orange gradients, no boxed nav chrome,
   no ticker on buyer pages (ticker lives on /delphi and /benchmark only).
5. **All enquiry/lead email lands at henrik@xaviaestate.com** (Resend domain
   verified). Money wire is store-FIRST: `leads_enquiries` → fallback `leads`
   table → email agent + buyer ack; return 200 if stored even when email fails.
6. Mobile: rankings render as editorial cards (`lg:hidden`), never a 900px table.
7. Broken images: `MareThumb` handles pre-hydration failures via
   `el.complete && el.naturalWidth === 0` check — onError alone is not enough.

## Design register (MARE)
- Cormorant serif headlines with gold-italic `<em>` second lines.
- Mono eyebrows: `text-[10px] uppercase tracking-[0.4em]` + `h-px w-10` gold rule.
- Thin gold-bordered ghost buttons for secondary actions (Enquire in nav).
- Route transitions: `template.tsx` av-page-enter (450ms cubic-bezier(0.16,1,0.3,1)).
- Reference implementation Henrik approved: https://github.com/HenrikKolstad/costa-deals-hub
  (private; Lovable "Costa Deals Hub", TanStack Start) — the visual source of truth.
  Clone it next to this repo. See its DESIGN.md and SPEC.md.

## Data layer
- **`public/data.json`** — 1,881 Spanish new-builds, 100% populated (price,
  market, m², beds, images, developer, costa, town). Score/yield are DERIVED at
  runtime by `initProperty()` — never stored.
- **`src/lib/deals.ts`** — single source for ranked deals + DISPLAY_CAP_PCT=35
  capped savings math. All surfaces must reconcile through it.
- **Supabase** (service key only in Vercel env; `.env.local` has no active keys):
  the defensible part is the observation history. **The ref-keyed transaction
  layer (all fed by the LIVE RedSP feed via getAllProperties, never the frozen
  properties_registry):** `score_history` (daily score+price per ref, scribe @02:00),
  `price_snapshots` (daily enriched price per ref, pricing-history cron @02:20),
  `sold_properties` (delisting/absorption ledger: refs that left the feed w/ last
  price+date). `property_pricing_history` = per-move event log (avn_prop_id=ref
  going forward). **NEVER repoint pricing-history back at properties_registry — it
  froze 2026-05-24; that was the bug that stopped the moat capturing anything new.**
  Delisting/price-move detection is gated to a recent prior snapshot (≤4 days) +
  ≥50% feed overlap, so a broken feed can't mass-flag phantom sales.
  `property_transactions` (~380k) is French DVF open data (cols: price_eur,
  transacted_at, price_per_m2_eur — NOT sold_price); it's the home for external
  CONFIRMED transactions (source-tagged), kept distinct from our derived
  delistings for provenance. ~68 of 139 tables are empty scaffolding. Audit endpoint:
  `/api/admin/db-audit?from=&to=&targeted=1` (cron-auth, batched).

## Build & deploy discipline
- `rm -rf .next` before `next build` if a dev server ran (corrupts .next/dev/types).
- Typecheck-gate pushes: only push when `npx tsc --noEmit` is clean.
- Verify prod with PowerShell `Invoke-WebRequest`/`Invoke-RestMethod` on Windows
  (local curl returns 000). Cron-protected routes accept header `x-vercel-cron: 1`.
- HTTP headers must be pure ASCII (em-dashes throw ERR_INVALID_CHAR → 500).
- PRO gating: `freeVisible` rows clear, rest blurred, unlock CTA €79/mo (ProModal).

## Sibling projects (not in this repo)
- X-bot: NEVER start/stop it — only Henrik does, via his buttons.
- POLYBOT/Polymarket bots run on a Vultr VPS, unrelated to Avena.

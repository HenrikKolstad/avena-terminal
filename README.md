# Avena Terminal

Daily observation of the Spanish coastal new-build market — what was listed,
what moved, and what quietly disappeared.

**Live:** [avenaterminal.com](https://avenaterminal.com) · **Open data:**
[/open-data](https://avenaterminal.com/open-data/dataset.json) ·
[mirror](https://github.com/HenrikKolstad/avena-data) · CC BY 4.0 ·
DOI [10.5281/zenodo.19520064](https://doi.org/10.5281/zenodo.19520064)

---

## What problem this solves

Spanish coastal new-build listing data is **ephemeral**. A unit is listed,
repriced two or three times, and then vanishes from the feed — sold, withdrawn,
or quietly reshuffled by the developer. No public registry records any of that
at listing level. Once a listing changes, its previous state is gone.

The Spanish land registry publishes transactions, but with a long lag, no
listing identity, and no asking price — so it cannot answer the question that
actually matters to a buyer: *was this unit reduced before it sold, and by how
much?*

So this system writes that history down, once a day, and never stops. The value
is not the code — it is the fact that the series exists and cannot be
backfilled. A competitor starting today is 70 days behind permanently, and
money will not close the gap.

## The ledger

Measured 2026-10-13. These are derived live from the database by
`scripts/capability-stats.ts`, which refuses to emit zeros rather than report a
failed read as an empty result.

| | |
|---|---|
| Observation days, unbroken | **70** (2026-08-05 → 2026-10-13) |
| Units observed | 2,287 |
| Price moves recorded | 657 |
| Delistings (absorption) | 276 |
| Relistings | 42 |
| Live book | 2,039 across 69 towns |

**Depth is measured as distinct prices per unit, never as row count.** An
earlier version of this pipeline wrote ~394,000 rows that contained zero price
changes — a capped write loop re-inserting the same frozen snapshot nightly. Row
counts in this domain lie; the genuine series starts the day the pipeline was
repointed at the live feed.

## How the capture works

```
RedSP XML feed (~98 MB)
  └─ parse-feed.js          fingerprints the payload, refuses a short read
      └─ public/data.json   the book, committed nightly
          ├─ pricing-history cron   → price_snapshots   (per ref, per day)
          │                         → sold_properties   (delisting ledger)
          └─ build-open-dataset.ts  → public/open-data/*  → public mirror
```

Two things in that chain are worth more than the rest:

**The diff is gated.** Delisting and price-move detection only runs against a
prior snapshot no older than four days, and only when the two books overlap by
at least 50%. A broken feed therefore cannot mass-flag 2,000 units as sold. The
gate reports `trusted_prior: false` and writes nothing rather than writing
something plausible.

**The scheduler is not trusted.** GitHub's cron landed its 05:10 slot between
06:15 and 06:43 for five consecutive nights, and the upstream feed intermittently
refuses GitHub Actions egress entirely (a fresh runner 43 minutes later gets
straight through). A conditional backstop workflow with 37 tests covers both. It
has since carried the capture through a 21-day unattended stretch and an 8-day
one with zero missed nights.

## The valuation model

`scripts/avm-backtest.ts`, re-measured on every change, committed to
`public/model-stats.json`:

| metric | value |
|---|---|
| Median absolute error | **15.82%** |
| MAPE | 21.81% |
| RMSE | 43.28% |
| Within ±10% | 34.2% |
| Within ±20% | 59.5% |
| n | 2,039 |

**Both caveats are published alongside every figure, because without them the
numbers are not true:**

1. **In-sample.** Town × type medians are drawn from the same book being scored,
   so each listing contributes to its own baseline. Out-of-sample error is
   higher.
2. **The target is asking price, not transaction price.** Spanish coastal
   new-build transaction prices are not publicly available at listing level.

This section exists because the site previously claimed "±3% RMSE on backtest"
with no backtest in existence. Building one produced a worse number and exposed
a real model bug. A defensible 15.82% is worth more than an invented 3%.

## The failure mode this codebase is built against

Every serious outage here has had one shape: **a missing or failed value
silently becoming a zero, so a broken system looks like a working one with
nothing to report.**

Real instances, all fixed:

- `parse-feed` downloaded 0 MB, threw, and exited 0 — a green check on a dead feed.
- A citation API returned 401; the `catch` stored an empty result, overwriting a
  healthy ~33% measured rate with a fabricated 0.00% for six days.
- The pricing cron did `if (!error) count += chunk` and took the prior snapshot
  as the *global* max date, discarding it whenever that max was today — so any
  re-run diffed against nothing and reported `price_moves: 0` while real moves
  went unlogged.
- Four routes called `createClient(process.env.URL!, ...)` at module top level.
  The `!` is a lie when the variable is absent. Production had the vars, so every
  *preview* deployment broke — and the signal that a branch was broken was itself
  broken.
- A cron reported `success` on every run for 57 consecutive days while
  transmitting nothing, because the no-op branch returned a bare 200.

So the house rules are: a failed read returns `null`, never `0`; a published
count is derived, never a literal; an absent credential throws instead of
falling back; and a run that did nothing says `skipped`, not `success`.

Several tests assert the *bug*, not just the fix — `test-hf-push-reporting.ts`
includes the exact pre-fix payload and asserts it still derives to `success`, so
the test demonstrably catches the regression rather than only documenting the
repair.

## Gates

All four must pass before anything reaches `main`:

```bash
npx tsc --noEmit                   # clean
npx tsx scripts/test-concierge.ts  # all pass
npx tsx scripts/avm-backtest.ts    # median error must not regress
npm run build:preview-sim          # full build with every secret UNSET
```

The last one exists because production has environment variables that preview
deployments do not, so a green production build proves nothing about a branch.

## Running it

```bash
npm install
export FEED_URL="<RedSP feed URL>"   # required; no fallback, throws if unset
node parse-feed.js                   # refresh public/data.json
npm run dev
```

`FEED_URL` is a credential — the feed has no other authentication — so it lives
in the environment and never in the source.

## Stack

Next.js (App Router) · TypeScript strict · Tailwind v4 · Vercel · Supabase ·
65 scheduled jobs · GitHub Actions for the capture path.

## Licence

Code: see repository. Data under `public/open-data/`: **CC BY 4.0** — free to
use with attribution to Avena Terminal (avenaterminal.com).

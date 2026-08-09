# ODYSSEY — STATE

Odyssey's memory between runs. It reads this file first and rewrites it last,
every single day.

**Why this exists:** without it, each morning starts blank. A deliberate
deferral ("top of tomorrow's list") becomes indistinguishable from having
forgotten, the same investigation can be run twice without anyone noticing,
and no change ever gets checked on day two. SEO in particular is a
months-long game — an agent that cannot remember what it changed 21 days ago
cannot run an experiment, only a stunt.

**Rules for editing:**
- Rewrite in place; do not append a log. This is state, not a diary. The
  briefs are the diary.
- Never delete an open item to make the file look tidy. Move it to CLOSED
  with a reason, or leave it open.
- Every SEO/growth change gets an EXPERIMENT row with a read-out date. A
  change with no read-out date is a guess, not an experiment.
- If a claim here turns out to be wrong, correct it here the same day.

---

## 1. VERIFY TODAY (yesterday's work — did it hold?)

| shipped | what | how to verify | verified |
|---|---|---|---|
| 2026-08-09 | `52a7217` feed commits before enrichment | a nightly run where an enrichment step fails must still commit the feed | pending — first live test 2026-08-10 01:37 UTC |
| 2026-08-09 | `9171dce` citation rollup returns null on unmeasured days | Sat/Sun must write no row; `/api/v1/citation-score` must keep showing the last measured date | pending — check Sun/Mon |
| 2026-08-09 | corpus artifacts generated + mirrored | `avenaterminal.com/open-data/dataset.json` version must equal today; `avena-data/market/` must match | verified 2026-08-09 (v2026-08-09, 5 days, 53 moves) |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-1 | `if (!error) count += chunk` in 6 places: `scribe/route.ts:48`, `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`, `dvf-ingest` | real instances of the recurring shape | `score_history` healthy (1990 refs, no gaps) so not actively losing rows | high |
| O-2 | `<html lang="en">` on the three `/no` pages while serving Norwegian | verified 2026-08-09 | per-route fix needs route-group root layouts (huge diff) or a dynamic root layout (kills static generation) | low — hreflang, the signal that matters, is already correct |
| O-5 | 186 of 492 indexed pages carry pre-transliteration accent slugs (`marbella-m-laga`, `j-vea-x-bia`); they hold 15 of 21 total clicks | `gsc_pages` 2026-08-07 | 301 shims already redirect old→new; need to confirm Google is consolidating rather than serving both | high |
| O-6 | `/compare` is 293 of 492 indexed pages, 64% of impressions, 20 of 21 clicks | `gsc_pages` 2026-08-07 | not a defect — the highest-leverage surface on the site, and the least examined | high |
| O-4 | Zenodo deposit frozen at 2026-04-11 | `zenodo.org/api/records/19520064` | publication is permanent; deliberately saved for a quarterly citable version | deliberate |

## 3. EXPERIMENTS — changes with a read-out date

Search Console is connected as of 2026-08-09 (`gsc_daily`, `gsc_pages`, 90
days backfilled to 2026-05-10). Experiments are now possible. Rules: one
meaningful change at a time, a read-out DATE fixed in advance, and the result
recorded honestly — "no detectable effect" is a real finding.

Weekly baseline before any experiment: impressions have sat between 430 and
660 per week for three months, clicks between 1 and 10. Flat. Any claimed
effect must clear that noise band to mean anything.

| started | hypothesis | change | metric | read-out | result |
|---|---|---|---|---|---|
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | 2026-09-02 (4 weeks) | pending |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | 15.81% (in-sample) | 2026-08-09 | `public/model-stats.json` |
| Citation rate, organic (qb-v2) | 6.19% (26/420) | 2026-08-07 | `citation_measurements` |
| Citation rate, branded control | 20.00% (3/15) | 2026-08-07 | `citation_measurements` |
| Observation ledger | 5 days, 2,027 units, 53 moves, 21 tombstones | 2026-08-09 | `public/open-data/dataset.json` |
| Live book | 1,996 listings, 97 towns | 2026-08-09 | `public/data.json` |
| Sitemap | 2,640 `<loc>` | 2026-08-09 | `/sitemap.xml` |
| Search impressions, last 28d | 1,906 (prior 28d: 2,087 — flat, -9%) | 2026-08-07 | `gsc_daily` |
| Search clicks, last 28d | 21 (prior 28d: 22) | 2026-08-07 | `gsc_daily` |
| Average position | 13.5 (prior 28d: 12.4) | 2026-08-07 | `gsc_daily` |
| Weekly impressions noise band | 430–660/week for 3 months | 2026-05-10 → 2026-08-07 | `gsc_daily` |
| Indexed pages with impressions | 492, of which 186 carry pre-transliteration accent slugs | 2026-08-07 | `gsc_pages` |
| /compare share | 293 of 492 pages · 64% of impressions · 20 of 21 clicks | 2026-08-07 | `gsc_pages` |
| /no + Norway | 0 impressions (launched 2026-08-06, 3 days into window) | 2026-08-07 | `gsc_daily` |

**Correction, 2026-08-09:** an earlier reading of "traffic has halved
(1,986 vs 4,068)" was wrong. The ad-hoc query moved the start date back 56
days while leaving the end date fixed, comparing a 28-day window against a
56-day one. The real figures are in the rows above: flat. Recorded here
because a wrong baseline would have made every future experiment read as a
recovery.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so the nightly capture works. Vercel does not have it, so no runtime route can read GSC. Only needed if a live surface should show it. | Paste the same service-account JSON into Vercel env vars. Low priority. |
| `actions:write` on the repo token | Odyssey got 403 dispatching a workflow, so it cannot re-run a failed nightly job itself — it can only report and wait a day. | Add the scope to the token it runs with. |
| `HF_TOKEN` in CI | Hugging Face refresh is manual today; it was frozen on April data for four months before 2026-08-09. | Store the token as a repo secret so the nightly job can push it. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-09 | nightly feed refresh red 3 runs | enrichment moved after the feed commit, `52a7217` |
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce`; organic and branded now separate, unmeasured days write nothing |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures are logged and visible |
| 2026-08-08 | `property_pricing_history` never logged a move | prior snapshot taken as global max date; fixed and merged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access — Odyssey was optimising blind | connected; `gsc_daily`/`gsc_pages` backfilled 90 days to 2026-05-10, captured nightly |

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
| O-3 | No Search Console data anywhere in the repo | `grep` for searchconsole/webmasters returns nothing | needs Google API credentials from Henrik | **blocking** — see BLOCKED |
| O-4 | Zenodo deposit frozen at 2026-04-11 | `zenodo.org/api/records/19520064` | publication is permanent; deliberately saved for a quarterly citable version | deliberate |

## 3. EXPERIMENTS — changes with a read-out date

No experiment can be read out yet: there is no Search Console connection, so
no impressions, clicks, positions or index coverage are visible to Odyssey.
This table stays empty and honest until O-3 is unblocked. Do not fill it with
proxies.

| started | hypothesis | change | metric | read-out | result |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | 15.81% (in-sample) | 2026-08-09 | `public/model-stats.json` |
| Citation rate, organic (qb-v2) | 6.19% (26/420) | 2026-08-07 | `citation_measurements` |
| Citation rate, branded control | 20.00% (3/15) | 2026-08-07 | `citation_measurements` |
| Observation ledger | 5 days, 2,027 units, 53 moves, 21 tombstones | 2026-08-09 | `public/open-data/dataset.json` |
| Live book | 1,996 listings, 97 towns | 2026-08-09 | `public/data.json` |
| Sitemap | 2,640 `<loc>` | 2026-08-09 | `/sitemap.xml` |
| GSC baseline to beat | 79 clicks / 9.5k impressions per 3 months | 2026-08-05 | Henrik's screenshot — NOT machine-readable |

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| Search Console API access | Odyssey does SEO blind. It cannot see impressions, clicks, queries, positions or index coverage, so it cannot tell whether any change worked. This is the single largest gap in the whole charter. | A Google Cloud service account with the Search Console API enabled, added as a *full* user on the `avenaterminal.com` domain property, its JSON key in Vercel + GitHub Actions as `GOOGLE_SEARCH_CONSOLE_KEY`. |
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

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
| 2026-08-12 | `78a493b` parse-feed waits up to 120min for the feed instead of 3 tries in 15s | **THE read of the day.** Tomorrow's nightly must go GREEN WITHOUT ME. Either it succeeds on attempt 1, or the log shows `Feed attempt N failed … retrying` followed by `Feed complete on attempt N after waiting Xmin`. That waited-minutes number is the first real measurement of RedSP's regeneration window — record it. If the run still dies at step 1, the budget is too small and the schedule itself must move | pending — first live test 2026-08-13 |
| 2026-08-12 | `24db855` `bank_organic`/`bank_branded` on `citation_measurements` | Friday 2026-08-14 is the next Atlas run. Its row must carry `bank_organic:68, bank_branded:6`. If they land NULL, the rollup is not reaching the new code path | pending — first live test 2026-08-14 |
| 2026-08-12 | `3846509` recovered book (2,004 listings, generated_date 2026-08-12) | already verified: `price_snapshots` holds 2,004 rows / 2,004 distinct refs for 08-12, a single clean write with no union | **VERIFIED same day** |
| 2026-08-12 | additive migration `citation_measurements_bank_coverage` + backfill of post-epoch rows | already verified: 08-10 reads 68/68 + 6/6 → complete; 08-12 reads 42/68 + 3/6 → 61.8% coverage, correctly marked incomplete | **VERIFIED same day** |

**Yesterday's five items, resolved:**
- `7478108` move diff baselined on the prior date — **RE-VERIFIED.** Today's
  capture: `moves_detected:15, moves_baseline_refs:1988, trusted_prior:true,
  prior_date:2026-08-11, prior_age_days:1, overlap:0.994`. The baseline is
  the whole book, not today's own row.
- `59c140d` dedupe read scoped to the refs being deduped — **RE-VERIFIED.**
  `errors:null`; no statement timeout on a 2,004-ref run.
- `779ac67` FK rejection named as `moves_ledger_blocked`, kept out of `errors`
  — **VERIFIED.** Today's run carries the named block AND `errors:null`
  simultaneously, which is exactly the designed classification. The run did
  not go red for a known, accepted constraint.
- `779ac67` workflow asserts `moves_baseline_refs>0` when `trusted_prior` —
  **STILL UNTESTED, carried forward.** Be precise about why: the workflow died
  at step 1 today, so the capture step never executed and the assertion never
  ran. The invariant it guards was satisfied in my manual capture
  (`trusted_prior:true` with `moves_baseline_refs:1988`), but that is the
  condition holding, not the guard firing. First real test is 2026-08-13.
- branch `odyssey/move-ledger-fk` — **still pending Henrik.** Today produced 15
  more move events that `property_pricing_history` refused. See O-19.

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| ~~O-23~~ | **CLOSED 2026-08-12 by Fable, same morning — cause found, fixed, and the day's measurement repaired.** Not the balance ($7.72 in console, auth verified live). Reproduced on demand: five parallel sonar calls → two instant `request_rate_limit_exceeded` (429). The agent's batches of 5 with 250ms gaps tripped the key's request-rate limit ~40% of the time = exactly 29 of 74. Fix `b8376a0`: batches of 2, 1.5s gaps, up to 3 retries on 429 honouring Retry-After; every other failure mode still fails loud. Full re-run: **74/74, 0 failed, organic 3/68 = 4.41%** — identical to the 08-10 baseline. Bonus defect found by the recovery itself and fixed in `8482e6c`: the rollup counted rows, so the partial+full runs double-counted to 110/68; rollup now dedupes per question (latest wins), and 08-12 reads 68/68 complete. **The series now holds two complete runs, both 4.41% organic / 83.3% branded — the stable baseline every experiment wanted.** | live 429 reproduction; `citation_measurements` 08-12 | — | closed |
| O-22 | **Published citation rates still do not filter partial runs.** `24db855` records coverage and ships `isCompleteRun()`, but no read path calls it yet, so 2026-08-12's 4.76% (2/42, 62% coverage) still sits in the series next to the complete 4.41% (3/68) and reads as a rise. | deliberate scope split, stated in the commit body | changing it moves numbers on a live surface (/citation-moat, /benchmark, the v1 APIs) and deserves its own reviewed change rather than riding along with a schema addition. **The data is now recoverable either way, which is why this could wait a day and the schema could not.** | high |
| O-19 | **`property_pricing_history` cannot accept ANY live ref.** `avn_prop_id` has a FK to `properties_registry(avn_prop_id) ON DELETE CASCADE`; that registry froze 2026-05-24 in a different key space — 60,792 rows, and **zero** of the live refs appear in it. The CASCADE is a second hazard: cleaning the dead registry would delete the whole 394k-row pricing history. | today's run rejected 15 more moves on `property_pricing_history_avn_prop_id_fkey`; `price_moves:0` against `moves_detected:15` | migration written and pushed to branch `odyssey/move-ledger-fk`; altering a constraint needs Henrik. **Nothing user-facing is blocked** — `price_snapshots` holds all 15 moves and is what `deltas.ts` reads | high — BLOCKED |
| O-21 | **`sold_properties.last_seen_date` is stamped "today", not the date last actually seen.** Every parse-feed tombstone is a day late. The pricing-history route's own path uses `priorDate` and is correct; the two disagree. | `parse-feed.js` sold-detection block, `last_seen_date: today_sd`, re-read today | one-day provenance error in the absorption ledger — the moat's most defensible artifact. Needs a decision on whether to correct existing tombstones, so it wants its own day | high |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books, not snapshots (08-08 holds 1,996 = 1,981 ∪ 1,990) | proven by diffing the data.json blobs against stored row counts | cause fixed; 08-10, 08-11 and 08-12 are each a single clean write (1,999 / 1,999 / 2,004). The already-polluted historical rows still need careful reconciliation — branch-only, needs its own day | high |
| O-5 | 186 of 492 indexed pages carry pre-transliteration accent slugs (`marbella-m-laga`, `j-vea-x-bia`); they hold 15 of 21 total clicks | `gsc_pages` 2026-08-07 | 301 shims already redirect old→new; need to confirm Google is consolidating rather than serving both | high |
| O-6 | `/compare` is 293 of 492 indexed pages, 64% of impressions, 20 of 21 clicks | `gsc_pages` 2026-08-07 | not a defect — the highest-leverage surface on the site, and still the least examined | high |
| O-13 | **PerplexityBot is barely present.** The crawler the entire citation strategy is aimed at, holding the most generous allow-list in `robots.ts`. | crawler ledger: **4 hits / 4 paths** across 08-11..08-12; was 31 requests in the prior 7 days | cause unknown and must not be guessed at. Not a robots.txt problem — the rules are permissive | high |
| O-15 | **Vercel Analytics figures are mostly machines.** 08-10 showed 295 "visitors", 0 leads. | crawler report 2026-08-10 | the real human number is unknown and no method currently separates them. **Never quote 08-10 as a traffic or ads baseline** | high |
| O-1 | `if (!error) count += chunk` in 5 more places: `scribe/route.ts:48`, `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`, `dvf-ingest` | real instances of the recurring shape | `score_history` healthy so not actively losing rows; the pricing-history instance (the one that mattered) is fixed | high |
| O-16 | **ClaudeBot has not returned.** Absent from the crawler ledger entirely across 08-11..08-12, after 1,901 requests on 08-04 then 2/3/0/0. It was the only crawler to fetch `/sitemap-ai.xml`. | crawler ledger, 0 rows for ClaudeBot | the second week I said I would wait for has now passed and it has NOT come back, so this is a trend, not a cycle. But acting still requires knowing why, and I do not. Not a robots.txt change made blind | medium |
| O-14 | **AwarioBot is the single largest crawler on the site and returns nothing.** 4,985 hits over 2,276 distinct paths in ~1.5 days — roughly 46% of all logged crawler hits, more than Googlebot (1,044) by a factor of five. | crawler ledger 08-11..08-12 | a `Disallow` is the obvious move and now has hard numbers behind it, but robots.txt is a live SEO signal and this costs compute, not correctness. Worth doing deliberately, with a read-out | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`.** `parse-feed.js:1003` banks both from inside the GitHub runner; the Vercel route banks them again minutes later. | `parse-feed.js:962,1003` | today only ONE writer ran (parse-feed had no Supabase key in my environment, so the route was the sole writer) and the result was the cleanest capture yet: 2,004 rows, no union, `overlap:0.994`. That is suggestive, not proof. Wants a comment at both ends at minimum | medium |
| O-11 | corpus mirror lag — **improved, reframed.** Site and `avena-data/market/` now AGREE at v2026-08-11. But both now lag the 08-12 book, because the corpus rebuild step never ran today | checked all surfaces 2026-08-12 | self-healing: tomorrow's nightly rebuilds and re-pushes. The structural fix is still automation, which needs `HF_TOKEN` in CI (see BLOCKED). Hugging Face could not be verified from here — the API returned "Invalid username or password" without a token, so **three-way agreement is unproven, only two-way** | medium |
| O-10 | `citation_measurements` still contains the fabricated-zero rows from the Perplexity 401 incident (08-02..08-06) and two 0-question rows (08-08, 08-09) | table read | cannot distinguish "asked 87, genuinely 0 hits" from "all lookups failed" from this table alone. Never delete data. `24db855` prevents new instances; it does not retro-explain old ones | medium |
| O-2 | `<html lang="en">` on the three `/no` pages while serving Norwegian | verified 2026-08-09 | per-route fix needs route-group root layouts (huge diff) or a dynamic root layout (kills static generation) | low — hreflang, the signal that matters, is already correct |
| O-4 | Zenodo deposit frozen at 2026-04-11 | `zenodo.org/api/records/19520064` | publication is permanent; deliberately saved for a quarterly citable version | deliberate |

## 3. EXPERIMENTS — changes with a read-out date

Search Console connected 2026-08-09 (`gsc_daily`, `gsc_pages`). Rules: one
meaningful change at a time, a read-out DATE fixed in advance, the result
recorded honestly — "no detectable effect" is a real finding.

Weekly baseline: impressions 430–660/week for three months, clicks 1–10.
Flat. Any claimed effect must clear that noise band to mean anything.

| started | hypothesis | change | metric | read-out | result |
|---|---|---|---|---|---|
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | 2026-09-02 (4 weeks) | pending |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers only | distinct properties fetched per crawler per pass | 2026-08-25 (2 weeks) | pending — the crawler ledger (O-18, closed) now makes this readable without a hand export |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) vs the **4.41% (3/68) qb-v2 baseline** | 2026-09-08 (4 weeks) | pending — **read out on COMPLETE runs only.** 2026-08-12 (2/42, 62% coverage) is not a data point; see O-22/O-23 |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | 2026-08-25 (2 weeks) | pending — readable from `crawler_hits` |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME, the way Case-Shiller/Eurostat are | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | Perplexity/ChatGPT responses naming "AVENA Index" for market-level questions, and any external quote of a weekly close | 2026-09-08 (4 weeks) | pending — first certified COMPLETE weekly close publishes itself 2026-08-17 |
| 2026-08-10 | ~~A bulk ingest of the one-pagers raises the organic citation rate~~ | ~~an external agent crawled 310 one-pagers~~ | — | — | **WITHDRAWN same day.** The crawler was AhrefsBot, which feeds an SEO backlink index, not a language model. The premise was wrong, so the experiment could only ever have produced a false negative |

No new experiment today. Today's work was pipeline recovery and measurement
integrity — neither is an SEO change, and recording either as one would be
exactly the manufactured progress this file exists to prevent.

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.89%** (in-sample, n=2004) | 2026-08-12 | `public/model-stats.json` — moved from 15.78% purely because the book grew; same code on the old book reproduces 15.78%/n=1999 exactly. MAPE 21.24→21.26, mean bias improved 3.59→3.12 |
| Live book | **2,004 listings** | 2026-08-12 | `public/data.json` |
| Sitemap | 2,649 `<loc>`, valid XML | 2026-08-12 | `/sitemap.xml` |
| Corpus version | site v2026-08-11 · `avena-data` v2026-08-11 (now agreeing) · HF unverified | 2026-08-12 | all surfaces; both lag today's book because the rebuild step never ran |
| **Real price moves by day** | 27 (08-06), 18 (08-07), 8 (08-08), 0 (08-09), 0 (08-10), 13 (08-11), **15 (08-12)** | 2026-08-12 | `price_snapshots`, diffed |
| Snapshot rows by day | 1,999 (08-10) → 1,999 (08-11) → **2,004 (08-12)**, one clean write per day since 08-10 | 2026-08-12 | `price_snapshots` |
| Delistings | **11 on 08-12** (1 on 08-11) | 2026-08-12 | `sold_properties` |
| Move events ever logged | **0** — structurally impossible, O-19 | 2026-08-12 | `property_pricing_history` |
| **Citation rate, organic (qb-v2) — THE baseline** | **4.41% (3/68), 2026-08-10, the only COMPLETE v2 run so far.** One hit = 1.47pp; do not read anything under ~3pp as signal | 2026-08-10 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | 83.33% (5/6), same complete run | 2026-08-10 | `citation_measurements` |
| Citation run coverage | 08-10: 100% (68/68 + 6/6). **08-12: 61.8% (42/68 + 3/6) — partial, not comparable** | 2026-08-12 | `citation_measurements.bank_organic/bank_branded` |
| Citation rate, qb-v1 (RETIRED RULER — never a baseline) | organic 6.19% (26/420), branded 20.00% (3/15) | 2026-08-07 | excluded from all published series |
| **Crawler ledger, hits over 08-11..08-12** | AwarioBot 4,985 · Googlebot 1,044 · PetalBot 762 · Amazonbot 359 · AhrefsBot 346 · SemrushBot 157 · bingbot 122 · MJ12bot 99 · ChatGPT-User 31 · Bytespider 31 · GPTBot 6 · PerplexityBot 4 · OAI-SearchBot 2 · meta-externalagent 2 · **ClaudeBot 0** | 2026-08-12 | `crawler_hits` |
| Daily impressions, 08-04..08-08 | 57, 55, 44, 61, 71 | 2026-08-11 | `gsc_daily` |
| Search impressions / clicks, last 28d | 1,906 / 21 (prior 28d: 2,087 / 22 — flat) | 2026-08-07 | `gsc_daily` |
| Indexed pages with impressions | 492, of which 186 carry pre-transliteration accent slugs | 2026-08-07 | `gsc_pages` |
| /compare share | 293 of 492 pages · 64% of impressions · 20 of 21 clicks | 2026-08-07 | `gsc_pages` |

**Correction, 2026-08-09 (kept):** an earlier reading of "traffic has halved"
was wrong — the query compared 28 days against 56. Real figures above: flat.
Kept because a wrong baseline would make every future experiment read as a
recovery.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **`actions:write` on the repo token** | **This cost real money today.** The nightly failed at 03:41 on a half-built feed. The feed was healthy by 05:15 and one re-run would have fixed everything, but dispatching it returned `403 Resource not accessible by integration`, so I had to regenerate the book locally, push it, and hand-drive the capture route to save the day. That worked, but it only works on days Odyssey is awake and the manual path is available. Standing blocker, repeated every day it stands. | Add the `actions:write` scope to the token Odyssey runs with, so it can re-run a failed nightly itself. |
| **Branch `odyssey/move-ledger-fk`** | `property_pricing_history` cannot record a single live price move — an FK to a registry that froze in May rejects every live ref (O-19). Today it rejected 15 more. The CASCADE on that FK also means cleaning the dead registry would delete the entire 394k-row history. | Review and merge the branch, then apply the migration. One `ALTER TABLE … DROP CONSTRAINT` plus an index. Nothing user-facing depends on it — `price_snapshots` already holds every move. |
| **Perplexity balance — possible, unconfirmed** | 29 of 74 citation lookups failed today (O-23). If the balance is out, every remaining Atlas run measures a shrinking subset. **I have NOT seen a 401 and am not claiming one** — flagging it as the leading suspect so it can be checked in 30 seconds. | Glance at the Perplexity account balance. If it is fine, say so and I will look elsewhere. |
| `HF_TOKEN` in CI | Corpus mirroring is a manual script. Site and `avena-data` agree today, but only because someone ran it; Hugging Face cannot be verified at all from here. Corpus filters resolve conflicts by cross-source agreement, so unproven agreement weakens the claim. | Store the HF write token as a repo secret so the nightly pushes all three surfaces together. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so nightly capture works. Vercel does not have it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-12 | the nightly gave up on the feed after 3 tries in 15 seconds, losing a whole day to a source that was merely mid-regeneration | `78a493b` — waits up to 120min with a 5-minute poll; 1MB floor and hard throw deliberately unchanged |
| 2026-08-12 | a 62%-coverage citation run published as a comparable data point | `24db855` — `bank_organic`/`bank_branded` record what the bank intended; `isCompleteRun()` lets read paths demand a whole run. NULL is never read as complete |
| 2026-08-12 | 2026-08-12's book and capture, lost by the failed nightly | `3846509` — regenerated, pushed, capture hand-driven: 2,004 snapshots, 15 moves, 11 delistings, `errors:null` |
| 2026-08-11 | move diff compared today's price against itself | `7478108` — re-verified 08-12 |
| 2026-08-11 | dedupe read seq-scanned 394k rows and hit `statement timeout` | `59c140d` — re-verified 08-12 |
| 2026-08-11 | the FK rejection would have turned the nightly red every night | `779ac67` — verified 08-12: named block AND `errors:null` together |
| 2026-08-11 | crawler ledger (O-18) | `a9775c5`..`3ecf70b` — live, and today it answered O-13/O-14/O-16 with real numbers instead of hand exports |
| 2026-08-11 | O-17 provenance proven, ledger extended to 8 April | 688 properties with an observed price change over four months. Gap-spanning changes carry `spanned:true` |
| 2026-08-11 | stale-feed gate untested on the stale path | fired correctly; also fired correctly today, holding the route at 08-11 until the 08-12 book deployed |
| 2026-08-11 | GSC capture lost any day Google published late | `7e19292` verified — picked up 08-08 |
| 2026-08-11 | O-9: the "citation discrepancy" was the benchmark version change itself | real defect found underneath: `loadMeasurements` pooled the final qb-v1 run into every v2 rate. Fixed to strictly-after |
| 2026-08-10 | pricing-history banked yesterday's book as today's snapshot | `1f0a130` |
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |

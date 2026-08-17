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
| 2026-08-17 | `b730a1d` **snapshot-archive archived only the first 1,900 of a 2,017 book** | Query `price_history` per `snapshot_date`: it must hold **one row per live listing**, not 1,900. **VERIFIED live the same day — the 06:00 UTC run wrote 2,017 rows / 2,017 distinct refs for 2026-08-17, the first rows that table has ever held.** `market_snapshots` also gained its first dated row ever (2026-08-17, 2,017 properties, avg_price 704,188, above_70 141, computed_at 06:00:17). Tomorrow, re-check only for regression: the count must track the book | **VERIFIED same day, live in prod** |
| 2026-08-17 | `582de5b` **sync-macro stored the newest Eurostat period LABEL, not the newest observed value** | Query `macro_indicators` after the 06:00 UTC run. **VERIFIED live the same day (fetched_at 06:01:12): `spain_unemployment_rate` = 10.1 @ valid_for_date 2026-06, previous 10.2 — was null @ 2026-07.** `gr_inflation_yoy` correctly stays null (Greece genuinely returns 348 periods and 0 values upstream); `spain_inflation_yoy` 3.0 @ 2025-12. Re-check tomorrow only for regression | **VERIFIED same day, live in prod** |
| 2026-08-16 | `f00086d` **APCI: 5 published defects fixed** | Re-checked live today: `methodology_version` 3, **apci 65, phase GROWTH, measured_weight_pct 95**, `price_momentum.refs_latest` 2017 (paginated read still clearing PostgREST's 1000-row cap), `supply_balance` null, macro naming ECB 2.4 / HICP 2.8 / unemployment 11.2 / GDP | **VERIFIED — held on day two** |
| 2026-08-16 | `f00086d` **digital-twin: hardcoded 74, hardcoded macro, `Math.random` in published projections** | Re-checked live today: `apci` null + `apci_source`, no `twin_sync_status`, macro 15 live keys. Three identical POSTs diffed field-by-field: **the only difference is the `timestamp` field** — every projected number identical | **VERIFIED — held on day two** |
| 2026-08-16 | `6064ca1` **APCI macro inputs publish their age** | Live today: `as_of` 2026-05-23, **`age_days` 86** (was 84 — climbing exactly as expected), `stale` true | **VERIFIED — held, and the counter is doing its job** |
| 2026-08-16 | `f00086d` **snapshot-archive: silent total failure made loud** | Superseded by the `b730a1d` row above — the 08-17 06:00 run is the first that can insert, and it now carries both fixes | folded into `b730a1d` |
| 2026-08-15 | `c86ec47` **gsc_pages page-query pinned to an assumed lag date** | **Still accumulating: 184 distinct pages today, was 151 yesterday and 98 the day before.** Fix confirmed working three days running | **VERIFIED — closed** |
| 2026-08-14 | `e415c6b` **curl fallback when the feed origin serves a bot challenge** | 08-17 nightly was a clean feed step again. That is **four consecutive unchallenged scheduled nights** (08-14/15/16/17). The fallback remains **proven locally, never exercised on a GitHub runner** | still pending — needs a night the challenge actually fires |
| 2026-08-12 | `2416532` **Market Pulse weekly PDF, Mon 05:45 UTC** | **First scheduled fire was today 05:45 UTC and `pulse-weekly.yml` still shows `total_count: 0` — it has never run.** GitHub delays scheduled runs under load, so this is NOT yet a failure. **Verify tomorrow: if the run list is still empty, the Monday schedule never fired and that is a real defect to chase.** `pulse_deliveries` holds exactly 1 row (the 08-12 manual test); a real fire adds `edition_date=2026-08-17` for subscriber 1 | **pending — first fire inconclusive at session end** |

**PRICE_HISTORY note (2026-08-17):** `price_history` held **0 rows for its
entire life** until today. `f00086d` made its writes real; `b730a1d` made them
complete, pushed at 05:44 and deployed with ~15 minutes to spare before the
06:00 cron. **First write: 2,017 rows, complete on day one.** If a future day
shows exactly 1,900, the cap is back.

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-40 | **`causal-update` would stamp 86-day-old values as fresh if it ever ran.** `runCausalUpdate()` in `src/lib/causal-engine.ts:533-545` does **not** refresh any indicator value. It loops every `causal_indicators` row and sets `last_updated = now()`, keeping the stale value — the source comment says so outright: *"Bump last_updated on all indicators (keeping their current values — in production you would refresh from real data sources)"* | `causal_indicators` queried today: 20 rows, **exactly one distinct `last_updated`** (2026-05-23 10:53:08), all 20 carrying values. So the 06:30 UTC cron is not running at all | **DO NOT "FIX" THIS BY REVIVING THE CRON.** The only reason `/api/v1/apci` can honestly publish `age_days: 86, stale: true` today is that this job is dead. Reviving it as written would reset every stamp to now() and turn that honest staleness flag into a false `age_days: 0` on a published index — a fabricated freshness signal on the most AI-targeted endpoint we have. The fix is to make it refresh real values or to delete the bump; either way it is cron write logic that mass-mutates 20 existing rows, so it goes to a branch | **high — and it is a landmine, not just a gap** |
| O-34 | **Two macro tables; the one every read path uses has no live writer.** `causal_indicators` (read by `/api/v1/apci`, `/api/v1/digital-twin`, `/api/intelligence/regime`, `src/lib/data-sources/macro.ts`) froze 2026-05-23. `sync-macro` writes a DIFFERENT table, `macro_indicators`, which nothing reads | both tables queried again today; read paths confirmed by grep | **PREMISE CORRECTED 2026-08-17 — the old entry was wrong.** It claimed `macro_indicators` returns null for `ecb_main_refi_rate`, `euribor_3m` and `euribor_12m`. Queried per key today, **all three are fresh and populated** (2.4 @ 2026-08-15; 2.4253913 and 2.855087 @ 2026-07). The earlier reading picked rows other than the newest per key. Only `spain_unemployment_rate` and `gr_inflation_yoy` were genuinely null, and the unemployment one was **fixed today** (`582de5b`). What remains is purely the reconciliation: `macro_indicators` is fresh and unread, `causal_indicators` is stale and read by everything. Repointing is now much more attractive than it looked yesterday — but do it **after** O-40, because the two interact | **high — top of tomorrow** |
| O-41 | **Two crons have essentially never succeeded, and nothing surfaces it.** `/api/cron/counterpart-discover`: **0 successes in 86 runs.** `/api/cron/eu-stats-ingest`: **1 success in 92 runs.** `/api/cron/mentat`: 57 ok / 62 bad | `cron_logs` grouped by `cron_path`, queried today | Found at the end of today's session. None of the three feeds `price_snapshots`/`sold_properties`, so the moat is unaffected — that is why this is not top priority. But a job that has failed 86 times out of 86 is either broken or should not be scheduled, and right now it is neither fixed nor removed | high |
| O-42 | **`genesis/run` discards its write results and marks the scenario complete regardless.** `await supabase.from('genesis_outputs').insert(outputs);` — return value dropped entirely, then `genesis_scenarios` is updated to `status: 'complete'` unconditionally | read of `src/app/api/v1/genesis/run/route.ts:273-274` today | The recurring shape, in a scenario simulator rather than a published market number — a run can be marked complete with zero stored outputs. Deferred because the capture pipeline and the macro inputs outranked it today. `eu_gdp_growth_pct ?? 2.1` also invents a GDP level, but the response does disclose `engine: 'mock-deterministic'`, so that one is weakly labelled rather than false | medium |
| O-39 | **All 90 legacy `market_snapshots` rows have a NULL `snapshot_date`.** Not "frozen at 2026-05-23" as previously recorded — the date column was never populated at all; 2026-05-23 is the last `computed_at` | queried today: `count(*)=90`, `count(snapshot_date)=0` | Harmless to reads today (they order by `computed_at`), and the unique index on `snapshot_date` treats NULLs as distinct so new writes are unaffected. Worth deciding whether to backfill from `computed_at` or leave the legacy block alone and start clean from 08-17 | medium |
| O-35 | **2026-05-23/24 is a cluster date across several pipelines.** `causal_indicators` 05-23, `market_snapshots` last `computed_at` 05-23, `macro_indicators`' per-country HICP rows 05-23, `properties_registry` 05-24 | all queried 08-16 and 08-17 | **O-40 partially explains it:** whatever stopped `causal-update` running stopped the timestamp bumps dead on 05-23. That does not yet explain `properties_registry` on 05-24. Still worth one focused look at what changed on those dates | medium |
| O-27 | **RedSP's provider serves a bot-protection JS interstitial to some clients/requests, not the feed.** ROOT CAUSE KNOWN. `openresty/1.31.1.1` returns a 12.1KB "One moment, please..." page that reloads via JS after 5s; node's `fetch` cannot execute JS. Measured: curl 6/6 success, node fetch 3/3 challenged. **Intermittent, not sticky** — four clean nights now | run 31774148318 log; controlled client comparison 2026-08-14; clean nights 08-14..08-17 | operational half mitigated by `e415c6b`. The CAUSE is not fixed and cannot be by me: needs RedSP to allow-list, or a stable-IP runner. If curl also starts getting challenged, the fallback dies with it | **CRITICAL — mitigated, cause still open** |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants.** 158 route files. **Seven examined to date, seven defective — still 7 for 7** | `63f405b`, `9c387fd`, `e6bb569`, `a2bf7d2`, `f00086d` (apci + digital-twin), today `genesis/run` (O-42) | **Still unexamined and carrying the same grep signatures: `arbitrage` (`Math.max(6, convergenceMonths)`), `tax` (`?? 5.5` gross yield, line 93), `compliance` (`?? 3200`, `?? 30`), `carbon` (`?? 45`, `?? 80`), `liquidity`/`passport` (`?? 50`).** Work top-down | **high — highest hit rate of anything I have** |
| O-36 | **`snapshot-archive` computes five market-summary figures it cannot store.** `above_80`, `avg_discount`, `new_this_week`, `key_ready_count`, `off_plan_count` have no column on `market_snapshots` | `f00086d`; schema read 08-16 | Deliberate. Adding five columns is additive and allowed, but `new_this_week` and `avg_discount` are genuinely useful daily series and deserve a considered schema rather than a tail-end `alter table`. Decide alongside O-37 | medium |
| O-37 | **Nothing writes `market_snapshots.apci`, so APCI `week_change` can never populate.** The column exists; no writer does | `/api/v1/apci` live; schema read 08-16 | An honest null is strictly better than the 85-day delta it replaced, so this is not urgent. `snapshot-archive` is the natural writer — it already runs daily and already upserts that table. Do it after O-34/O-40 so the stored series is not built on 86-day-old macro | medium |
| O-30 | **Unbacked qualitative claims left in snippet-answers.** "most popular region for foreign buyers", "ECB rate stability supports mortgage affordability", "foreign demand remains strong", "supply is constrained". Also unaudited domain prose: tax rates, NIE timings, golden-visa status, mortgage LTV/rates | read of `snippet-answers/route.ts` 2026-08-15 | Rewriting them would be inventing copy (CLAUDE.md rule 1) — the fence permits correcting a **false** fact, not replacing an unverifiable one with my own wording. Needs Henrik's call or a cited source | medium |
| O-28 | **`avena-data` corpus mirror has NO automation in this repo.** Site **v2026-08-17**, mirror **v2026-08-16** — diverged again, one day behind, exactly as predicted | mirror JSON read live today; every workflow and script checked 08-14 | **New observation today:** the mirror advanced 08-15 → 08-16 overnight, so *something* moves it — either a workflow living in the `avena-data` repo itself that pulls before the site rebuilds, or Henrik by hand. That changes the ask: see BLOCKED | **high** |
| O-21 | **`sold_properties.last_seen_date` is stamped "today", not the date last actually seen.** Every parse-feed tombstone is a day late; the pricing-history route's own path uses `priorDate` and is correct. The two disagree | `parse-feed.js` sold-detection block, `last_seen_date: today_sd` | one-day provenance error in the absorption ledger — the moat's most defensible artifact. Needs a decision on whether to correct existing tombstones | high |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books, not snapshots | proven by diffing data.json blobs against stored row counts | cause fixed; 08-10..08-17 are each a single clean write. Polluted historical rows still need careful reconciliation — branch-only, needs its own day | high |
| O-5 | Pre-transliteration accent slugs are indexed and hold a disproportionate share of clicks. **The specific "186 of 492" figure is unsourced — see O-33** | `gsc_pages` attribution proven wrong 08-15 | 308 shims confirmed working. Still need to confirm Google is **consolidating**, not just redirecting — `gsc_pages` now has real depth (184 distinct pages), so this becomes answerable in ~2 weeks | high |
| O-6 | `/compare` dominates our search surface: **87% of Google AI-feature impressions (198/228)** | `gsc_pages`; `docs/gsc-genai/` (from Henrik's export — solid) | CompareLedgerPulse (verified 08-15) put the moat on it. Read out 2026-09-14 | high |
| O-33 | **The "492 indexed pages / 293 /compare / 186 accent slugs" baseline is NOT reproducible from `gsc_pages`.** | queried 08-16: 151 distinct pages; today 184 | **Do not quote 492/293/186 again until re-derived.** O-5 and O-6 both rest on these figures and are weaker than they read. Re-derive in ~2 weeks | **high** |
| O-13 | **PerplexityBot is barely present.** 44 hits / 29 paths since 08-12 — negligible for the crawler the entire citation strategy targets | crawler ledger today | cause unknown and must not be guessed at. Not a robots.txt problem — the rules are permissive and OAI-SearchBot thrives under the same file | high |
| O-15 | **Vercel Analytics figures are mostly machines.** AwarioBot alone is 23,193 hits since 08-12 | crawler ledger | **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in 4 more places: `scribe/route.ts:48`, `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`, `dvf-ingest` | real instances of the recurring shape | `score_history` healthy so not actively losing rows | high |
| O-16 | **ClaudeBot has barely returned.** 6 hits total since 08-12, last seen 08-15 | crawler ledger | effectively absent. Acting requires knowing why, and I do not | medium |
| O-14 | **AwarioBot is the largest crawler on the site by far and returns nothing.** 23,193 hits over **2,277 paths — the path count has not moved since 08-15 while hits grew 45%** | crawler ledger | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`.** `parse-feed.js:1003` banks from inside the runner; the Vercel route banks again minutes later | `parse-feed.js:962,1003` | 08-12..08-17 all had effectively one writer and produced the cleanest captures on record. Wants a comment at both ends at minimum | medium |
| O-10 | `citation_measurements` still holds the fabricated-zero rows (08-02..08-06) and two 0-question rows (08-08, 08-09) | table read | cannot distinguish "asked 87, genuinely 0" from "all lookups failed". Never delete data. **They are excluded from every published surface** by `loadMeasurements` | medium |
| O-29 | **Lightpanda stopped as abruptly as it started.** Nothing since 08-14 | crawler ledger | a two-day burst, now gone. Keep watching whether it returns | low |
| O-2 | `<html lang="en">` on the three `/no` pages while serving Norwegian | verified 2026-08-09 | per-route fix needs route-group root layouts (huge diff) or a dynamic root layout (kills static generation) | low — hreflang is already correct |
| O-4 | Zenodo deposit frozen at 2026-04-11 | `zenodo.org/api/records/19520064` | deliberately saved for a quarterly citable version | deliberate |

## 3. EXPERIMENTS — changes with a read-out date

Search Console connected 2026-08-09 (`gsc_daily`, `gsc_pages`). Rules: one
meaningful change at a time, a read-out DATE fixed in advance, the result
recorded honestly — "no detectable effect" is a real finding.

Weekly baseline: impressions 430–660/week for three months, clicks 1–10.
Flat. Any claimed effect must clear that noise band to mean anything.

| started | hypothesis | change | metric | read-out | result |
|---|---|---|---|---|---|
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | 2026-09-02 (4 weeks) | pending |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers only | distinct properties fetched per crawler per pass | 2026-08-25 (2 weeks) | pending — **signal is now firmly negative for AwarioBot: distinct paths frozen at exactly 2,277 across six days while hits grew 15,968 → 23,193.** It is re-crawling the same set harder, not broader. Hold to 08-25 for the other 13 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) vs the **4.41% baseline** | 2026-09-08 (4 weeks) | pending — read out on COMPLETE runs only |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | 2026-08-25 (2 weeks) | pending — readable from `crawler_hits` |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (4 weeks) | pending |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` column | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (4 weeks) | pending — needs distribution: not yet listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate vs 4.41%; citations of town pages specifically | 2026-09-09 (4 weeks) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" queries + GSC impressions | 2026-09-23 (6 weeks) | pending |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (4 weeks) | pending — **interim.** OAI-SearchBot cumulative **626 hits / 239 paths** (was 443/195), ChatGPT-User **251/80** (was 136). Floor has held six days at ~20-40x the pre-ping baseline of 2/day. Still confounded by 08-12 being a heavy deploy day. **Hold to 09-09** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | 2026-08-26 (2 weeks) | pending — **still likely unreadable rather than negative: GPTBot 45 hits, ClaudeBot 6, meta-externalagent 3.** These three are barely present at all |
| 2026-08-14 | **CompareLedgerPulse**: /compare pages carry 87% of our Google AI-feature impressions but held no ledger data; adding the dated observation quotable + 2 fan-out Q&A blocks puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 (4 weeks) | pending — **render verified live 2026-08-15** |
| 2026-08-10 | ~~A bulk ingest of the one-pagers raises the organic citation rate~~ | ~~an external agent crawled 310 one-pagers~~ | — | — | **WITHDRAWN same day.** The crawler was AhrefsBot, which feeds a backlink index, not a language model |

**No new experiment today.** Both changes shipped were defect fixes to data
capture (`b730a1d`) and to a macro input (`582de5b`). Neither is an SEO
change and logging either as an experiment would be exactly the manufactured
progress this file exists to prevent.

**Confound to remember:** `f00086d` changed the published APCI from 58 to 65
and altered `/api/v1/apci` and `/api/v1/digital-twin`, both AI-facing. If the
09-08 organic read-out moves, that is a second confound alongside `e6bb569`,
and neither can be attributed to the property-page quotable alone.

## 3b. PLAN B — press detonation calendar (Henrik's "B GO")

The press room is the landing surface; the releases are the detonations. The
genuine daily series started 2026-08-05. Drafts with named data slots live in
`~/Desktop/PLAN-B-RELEASES.md`. Nothing fires without Henrik's explicit go.

| when | what | gate |
|---|---|---|
| 2026-08-13 | Press room truth-repaired (`4e9f96d`) | done |
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | series gap ≤2 days; all numbers day-of from `price_snapshots`/`sold_properties` |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | Henrik's explicit go |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.89%** (in-sample, n=2017) | 2026-08-17 | `public/model-stats.json`. Unchanged across both of today's gate runs |
| Live book | **2,017 listings** (unchanged from 08-16) | 2026-08-17 | `public/data.json` |
| **data.json byte-identical 08-16 → 08-17** | The nightly feed commit `3c2bcc7` touched `feed-meta.json` and `model-stats.json` only — **`data.json` itself did not change**. Consistent with 0 price moves and 0 delistings on a Sunday-night feed; 08-09/08-10 were also a 0-move weekend. **Not by itself proof of a stale feed, but if it repeats on a weekday, chase it** | 2026-08-17 | `git show --stat 3c2bcc7` |
| Sitemap | 2,669 `<loc>`, valid XML | 2026-08-17 | `/sitemap.xml` |
| Corpus version | site **v2026-08-17** · `avena-data` **v2026-08-16 (DIVERGED by one day, O-28)** · HF unverified (401 without a token) | 2026-08-17 | mirror lags every night |
| Ledger (published) | first 2026-08-05, latest 2026-08-17, **13 observation days, 2,084 refs, 106 moves, 57 tombstones** | 2026-08-17 | `/open-data/dataset.json` |
| **Real price moves by day** | 27 (08-06), 18 (08-07), 8 (08-08), 0 (08-09), 0 (08-10), 13 (08-11), 15 (08-12), 5 (08-13), 15 (08-14), 4 (08-15), 1 (08-16), **0 (08-17)** | 2026-08-17 | `price_snapshots`, diffed. 08-17's feed reflects Sunday |
| Snapshot rows by day | 2,000 (08-13), 2,007 (08-14), 2,005 (08-15), 2,017 (08-16), **2,017 (08-17)** — one clean write per day since 08-10 | 2026-08-17 | `price_snapshots`, rows = distinct refs every day |
| Delistings | **0 on 08-17** (0 on 08-16, 0 on 08-15). Cumulative **57**, last tombstone 08-15 | 2026-08-17 | `sold_properties` |
| pricing-history cron | `feed 2017 · snapshotted 2017 · price_moves 0 · delisted 0 · prior_date 2026-08-16 · prior_age_days 1 · trusted_prior true · overlap 1.0 · errors null` | 2026-08-17 | hand-run, idempotent |
| **APCI (published)** | **65, phase GROWTH, 95% of weight measured, 7 of 8 dimensions** | 2026-08-17 | `/api/v1/apci` methodology_version 3 |
| APCI macro input age | **86 days** (`as_of` 2026-05-23, `stale: true`) — climbing daily until O-34/O-40 are resolved | 2026-08-17 | `/api/v1/apci` |
| **Citation rate, organic (qb-v2) — THE baseline** | **5.88% (4/68) on 08-17**; 2.94% (2/68) on 08-14; 4.41% (3/68) on 08-10 and 08-12. **Four complete runs, mean 4.41%.** One hit = 1.47pp, so 08-17 is exactly **one hit above the mean and is NOT an improvement** — do not read anything under ~3pp as signal | 2026-08-17 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6) on 08-17**; 83.33% (5/6) on the three prior runs | 2026-08-17 | `citation_measurements` |
| Citation run coverage | 08-10, 08-12, 08-14, **08-17** all 68/68 + 6/6. No row written on 08-15/08-16 (weekend; schedule is Mon/Wed/Fri) — the `9171dce` fix still working. Next: Wed 08-19 | 2026-08-17 | `vercel.json` crons + table |
| Citation rate, qb-v1 (RETIRED RULER — never a baseline) | organic 6.19% (26/420), branded 20.00% (3/15) | 2026-08-07 | excluded from all published series |
| **Crawler ledger, hits since 08-12** | AwarioBot 23,193 (**2,277 paths, still frozen**) · Googlebot 5,727 (2,814 paths) · PetalBot 3,865 · AhrefsBot 2,507 · Amazonbot 1,761 · Lightpanda 1,677 (stopped 08-14) · bingbot 1,220 · SemrushBot 1,183 · **OAI-SearchBot 626 (239 paths)** · YandexBot 512 · SERanking 473 · **ChatGPT-User 251** · DotBot 215 · MJ12bot 119 · Bytespider 63 · **GPTBot 45** · **PerplexityBot 44** · Applebot 31 · **ClaudeBot 6** · meta-externalagent 3 · Google-Extended 3 | 2026-08-17 | `crawler_hits` |
| **Nightly reliability** | **08-14, 08-15, 08-16 and 08-17 all succeeded** — four clean scheduled nights in a row. Prior: 5 of 7 failed at the feed step | 2026-08-17 | Actions run list; no failed run since 08-13 |
| Build health | All recent runs green on main: nightly feed 08-17 success, IndexNow 08-17 success. **No branches and no open PRs, so no preview builds to check today** | 2026-08-17 | `actions_list` |
| Search impressions / clicks, last 28d | 1,991 / 27 — **inside the noise band, not a result** | GSC current to 2026-08-14 | `gsc_daily` |
| `gsc_pages` depth | **184 distinct pages**, max date 2026-08-14 — up from 151 yesterday and 98 the day before. The `c86ec47` fix is accumulating | 2026-08-17 | `gsc_pages` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 | 2026-08-14 | `docs/gsc-genai/` — Henrik's UI export. Properly sourced |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **7 audited to date, 7 defective** | 2026-08-17 | `find src/app/api/v1 -name route.ts` |
| `price_history` | **0 rows for its entire life** until today. First write 2026-08-17: **2,017 rows, 2,017 distinct refs — the whole book** | 2026-08-17 | queried after the 06:00 run |
| `market_snapshots` | 90 legacy rows with NULL `snapshot_date` (O-39) + **the first dated row ever: 2026-08-17, 2,017 properties, avg_price 704,188, avg_score 50, avg_yield 3.6, above_70 141** | 2026-08-17 | queried after the 06:00 run |
| `macro_indicators` | 16 keys, last fetch **2026-08-17 06:01**. Fresh: ECB refi 2.4, Euribor 3M 2.4253913, Euribor 12M 2.855087, EUR/USD 1.1567, EUR/GBP 0.8545, EA GDP 3,335,689.7, **Spain unemployment 10.1 @ 2026-06 (was null — fixed and verified today)**. Still null: `gr_inflation_yoy` only, and genuinely so — Greece returns 348 periods and 0 values upstream | 2026-08-17 | queried per key |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08.** All 20 carry values. This is what every macro read path actually uses | 2026-08-17 | queried directly |
| Cron success rates (worst) | `counterpart-discover` **0/86** · `eu-stats-ingest` **1/92** · `mentat` 57/119 · `pricing-history` 441/497 (failures are pre-fix history) | 2026-08-17 | `cron_logs` grouped |

**Correction, 2026-08-09 (kept):** an earlier reading of "traffic has halved"
was wrong — the query compared 28 days against 56. Real figures above: flat.
Kept because a wrong baseline would make every future experiment read as a
recovery.

**Correction, 2026-08-15 (kept):** O-26 was recorded as "~20 endpoints". The
real number is **158 route files** — the scope was understated ~8x, which is
why it kept looking like a one-day job. It is a standing work queue.

**Correction, 2026-08-17 (new):** O-34 claimed `macro_indicators` returned
null for the ECB rate and both Euribor series. **That was wrong** — all three
are fresh and populated. The earlier query did not take the newest row per
indicator key. Only two keys were ever null. Kept because acting on the old
version would have meant "fixing" ECB fetches that were never broken.

**Note, 2026-08-16 (kept):** the APCI baseline moved 58 → 65, but that is a
**ruler change, not a market move**. The old 58 was computed with 40% of the
index weight fabricated. Do not plot the two on one series;
`methodology_version` 3 marks the break.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **RedSP is challenging GitHub Actions egress** (O-27) | ROOT CAUSE PROVEN: their provider serves an openresty JS interstitial instead of the feed. It killed 5 of 9 nightlies. The curl fallback gets through, but it rides on a client-fingerprint difference — if their guard starts challenging curl too, every night is lost until someone notices. **Four clean nights (08-14..08-17) mean the fallback has still never been exercised on a runner — do not read the quiet as a fix.** | Either (a) ask RedSP to allow-list GitHub Actions egress for the feed URL — the clean fix, and a reasonable ask since Avena is a paying consumer of that feed; or (b) approve moving the feed step to a runner with a stable IP RedSP can allow-list. |
| **`avena-data` corpus mirror is unautomated and diverged** (O-28) | Site publishes v2026-08-17, the mirror serves v2026-08-16. Corpus filters resolve conflicts by cross-source agreement, so two surfaces disagreeing is worse than one surface alone. | **Refined ask, 2026-08-17:** the mirror DID advance 08-15 → 08-16 overnight, so something updates it — but nothing in *this* repo does. **Two questions: (1) is there a scheduled workflow inside the `avena-data` repo that pulls from avenaterminal.com, and if so what time does it run? (2) if it exists, it is firing before the site's 02:45 rebuild, which would explain the permanent one-day lag exactly.** If that is it, the fix is moving one cron, not minting a token. If it is you doing it by hand, then I still need a cross-repo write credential (deploy key or fine-grained PAT for `HenrikKolstad/avena-data`) as a repo secret. |
| `HF_TOKEN` in CI | Same family. Hugging Face cannot be verified from here at all — the API returns 401 without a token — so three-way agreement remains unproven, and the two-way is currently broken. | Store the HF write token as a repo secret so the nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source: "most popular region for foreign buyers", "ECB rate stability supports mortgage affordability", "supply is constrained", plus tax/NIE/mortgage/golden-visa figures. This surface is built to be quoted verbatim by AI assistants. | Either confirm they are accurate as written, or point me at a source to check them against. |
| Bing Webmaster Tools read | **Henrik claimed avenaterminal.com 2026-08-13.** The indexation-coverage and IndexNow-key views should now be readable — next step is READING them. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the dashboard shows the key rejected, say so loudly. I have no Bing API access, so this stays a manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions over 3 months, 129 distinct URLs, ~10x growth since June. **/compare = 87%.** Still UI-only/no API. | Re-export monthly, next ~2026-09-14, as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so nightly capture works. Vercel does not have it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-17 | **`/api/snapshot-archive` would have archived only the first 1,900 of a 2,017 listing book, every day, and called it complete** | `b730a1d` — `all.slice(0, 1900)` was a stale constant from when the book was ~1,881. `expected` was measured off the TRUNCATED list, so `inserted === expected` held at 1900/1900 and the route reported a complete archive of an incomplete book. Caught in the window between `f00086d` making the write work and the first successful run, so `price_history` is born complete rather than 5.8% short from day one. `expected` is now the book size |
| 2026-08-17 | **`sync-macro` stored a NULL for Spain unemployment every night while the real figure sat one row above it** | `582de5b` — Eurostat publishes the period LABEL before the observation. `une_rt_m` lists 2026-07 with no value; 2026-06 holds 10.1. The parser took `periods[last]` unconditionally, storing null stamped 2026-07 while filling `previous_value` from 2026-06 — a row claiming the current reading was unknown and the prior one was 10.1. Now selects the newest period carrying a finite observation. Also: `fetchWithTimeout` logs the HTTP status instead of collapsing 404, 500 and timeout into one silent null |
| 2026-08-17 | **`gsc_pages` capture confirmed accumulating three days running** | `c86ec47` — 98 → 151 → **184 distinct pages**. Closed |
| 2026-08-16 | **`/api/v1/apci` published a composite index with 40% of its weight fabricated** | `f00086d` — macro_support selected `value` (real column `current_value`) → 400 → silent 50 while 15 live indicators sat unread; price_momentum selected `score`/`computed_at` (real: `avena_score`/`snapshot_date`) and had **never once worked**; supply_balance read the frozen `properties_registry`; foreign_demand regexed nationality keywords against `p.t`, the property TYPE, so 0 of 2,017 could match and a `Math.max(40,…)` floor hid it; week_change published an **85-day delta labelled "week"**. Verified live on day two: 65, GROWTH, 95% measured |
| 2026-08-16 | **`/api/snapshot-archive` ran daily at 06:00 for months into an empty table** | `f00086d` — wrote six nonexistent columns so every upsert 400'd, `if (!error) inserted += chunk.length` hid it, and the route returned `success: true` regardless. The `market_snapshots` upsert had the same disease. Now writes only real columns and checks every write |
| 2026-08-16 | **`/api/v1/digital-twin` published a hardcoded APCI, hardcoded macro stamped "synced", and random numbers** | `f00086d` — `apci: 74` while the canonical endpoint read 58; `Math.random()*4-2` added to every region's published impact. Verified deterministic on day two: three identical POSTs differ only in the `timestamp` field |
| 2026-08-15 | **`/api/v1/snippet-answers` published five false market facts** | `e6bb569` — "Estepona is on the Costa Blanca" (it is Costa del Sol); Costa del Sol's 2% yield attributed to Costa Blanca (real 5.4%); APCI frozen at "74 / GROWTH" with "currently" in 5 places. Root cause: `costas[0]` sorts by COUNT, read as if sorted by yield |
| 2026-08-15 | **market-clock and microstructure derived published verdicts from default constants** | `a2bf7d2` — `COSTA_MOMENTUM[slug] ?? 5.0` put 6 of 10 regions at SLOWDOWN purely via the default, all stamped `data_quality:"LIVE"` |
| 2026-08-15 | the change-answers 1-day window fix, confirmed on an unattended nightly | `9c387fd` |
| 2026-08-15 | CompareLedgerPulse render + province-strip fix | `f2880a4`/`3b1d983` |
| 2026-08-14 | **published change-answers claimed 101 price moves inside a 1-day window** | `9c387fd` — an unpaginated `price_snapshots` select hitting PostgREST's 1000-row cap |
| 2026-08-14 | the feed retry loop spent 120 minutes on a challenge it could never pass | `e415c6b` — HTML interstitials recognised, curl fallback, give-up in ~30s |
| ~~O-25~~ | **CLOSED 2026-08-14.** "The GitHub PAT is not durable, so I cannot self-recover" | MCP GitHub integration has Actions write |
| ~~O-24~~ | **CLOSED 2026-08-14.** "Every enrichment step is downstream of the one step that keeps breaking" | Was a symptom of the feed failure |
| ~~O-11~~ | **SUPERSEDED 2026-08-14 by O-28** | The mirror did not self-heal |
| 2026-08-13 | a short feed body was logged only as a byte count | `714b9ab` — and it is what cracked O-27 the next morning |
| 2026-08-13 | `/api/v1/crawler-report` published `estimated_weeks_to_dominance: 152` from an invented 0.5 floor over a fabricated zero | `63f405b` |
| 2026-08-13 | 2026-08-13's book and capture, lost by the wedged nightly | `355def7` |
| ~~O-23~~ | Perplexity failures were a request-rate limit, not balance | `b8376a0` |
| ~~O-19~~ | one FK rejecting 100% of live refs, carrying a CASCADE that would have deleted 394k rows | dropped |
| 2026-08-12 | a 62%-coverage citation run published as a comparable data point | `24db855` — `bank_organic`/`bank_branded` |
| 2026-08-11 | move diff compared today's price against itself | `7478108` |
| 2026-08-11 | crawler ledger (O-18) | `a9775c5`..`3ecf70b` |
| 2026-08-11 | GSC capture lost any day Google published late | `7e19292` |
| 2026-08-10 | pricing-history banked yesterday's book as today's snapshot | `1f0a130` |
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — confirmed still working 08-17 |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |

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
| 2026-08-31 | `ee49ee7` **four fabrication routes emptied** — `/api/v1/regulatory`, `/regulatory-pulse`, `/news`, `/community-pulse` | **VERIFIED LIVE, on the published payload with `not_published` removed first.** Deploy flipped ~80s after push (the first check ~2 min in still served the old bodies — latency, not failure; recorded so this is not re-panicked over). All four: fabricated tokens (`European Central Bank`, `Rate cut -25bp`, `Boletín Oficial`, `REG-2026-001`, `8.3%`, `13821`, `Idealista Market Report`, `Phase-out announced`, `Agencia Tributaria`) **ABSENT from the published payload**, present only inside the disclosure prose. `regulatory total_active 0` · `news total 0` · `community-pulse sources_count 0` | **VERIFIED → CLOSED** |
| 2026-08-31 | `ee49ee7` **the EPC counting fix inside `/regulatory-pulse`** | **VERIFIED, and it confirms the bug was real and material.** Live: `rated 2028, unrecognised 16` (exactly the 16 known `'X'` placeholders), distribution `A 348 · B 1675 · C 5 · D 0 · E 0 · F 0 · G 0`, and 348+1675+5 = 2028, so the rated subset reconciles. **`low_rated_d_to_g` = 0.** The old route published `affected_properties: 16` as "properties potentially affected by EPBD energy requirements" — that 16 was precisely the set whose certificate Avena does not hold. **A wrong 16 became a correct 0 plus 16 disclosed as unknown** | **VERIFIED → CLOSED** |
| 2026-08-31 | `485fa15` **`deriveCronStatus` now treats `ok:false` as an error unless the run declares a benign resumable state** | **The discriminating check is a NEGATIVE one and it matters more than the positive.** Next Mon/Wed/Fri, atlas must produce `status='error'` on a `measurement_failed` row — but the *resumable* rows must STAY `success`. Query: `select output_summary->>'status', status, count(*) from cron_logs where agent_id='atlas' and started_at >= '2026-08-31' group by 1,2`. Expect `measurement_failed → error` and `incomplete_resumable → success`. **If incomplete_resumable shows up as `error`, I have shipped a false-alarm generator and it must be reverted the same day** — that failure mode is worse than the gap it closed | **PENDING — next atlas run is Wed 09-02** |
| 2026-08-30 | `14eae61` **integrity fingerprinting on the UNATTENDED path** | **VERIFIED, on the exact field I pre-registered.** 08-31 03:30:23, `invoked_by='vercel-cron-ua'` (the real scheduler, not my curl): `status success`, `errors []`, `recorded 3`, `unchanged 6`, `merkle_root 9b2bb79a764f30b3…` (a real root), and **`latest_batch_date: 2026-08-30`, not 08-29** — the roll is attesting the batch it should. `recorded:3` rather than 1 because model-stats.json and dataset.json both changed on 08-30; the six methodologies correctly re-attested as unchanged. `integrity_fingerprints` 10 → **13**, `integrity_daily_roots` 2 → **3** | **VERIFIED → CLOSED** |
| 2026-08-30 | `14eae61` **the empty-root sentinel** | **VERIFIED.** `e3b0c44298fc…b855` appears on exactly one row — my own 08-30 05:50:54 same-day re-run, alongside `unchanged: 9`, which is the permitted case. It is ABSENT from 08-31's first run. **One small flaw found while verifying, filed as O-72: on a same-day re-run the route reports the empty-string digest as `merkle_root` instead of reporting the root that already exists.** Harmless today because `unchanged: N` sits beside it, but it puts this project's tell in a success row for no reason | **VERIFIED → CLOSED, with O-72 filed** |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-73 | **THE BOOK HAS NOT CHANGED IN 24 HOURS AND FOUR SEPARATE DOWNLOADS — watch, do not alarm yet.** `public/data.json` is blob `4a76dbd027ef0f25763ea5cabe7f60fba6e90a43` in runs **37 (08-30 05:37), 38 (08-30 07:17), 39 (08-30 10:27) and 40 (08-31 05:37)** — four independent RedSP fetches over 24h producing a byte-identical 2,044-listing book. Independent SQL confirms it: 08-30 vs 08-31 is 2,044/2,044 refs, overlap 2,044, **0 gone, 0 new, 0 price changes** | git blob hashes across four commits; direct SQL diff 08-31 | **This is the shape `properties_registry` had when it froze 2026-05-24 and nobody noticed for months — so it gets a pre-registered discriminator rather than a shrug.** Against alarm: the book DID change 08-29→08-30 (+2 listings), the feed serves `generated_date: 2026-08-31` (fresh, not a cached re-serve), and 08-30 was a Sunday. **THE DISCRIMINATOR FOR TOMORROW: if 09-01's download is ALSO blob `4a76dbd0…`, that is five fetches across 48h+ spanning a working Monday, and I escalate it as a suspected upstream freeze. If it differs, this was a quiet weekend and the item closes.** Do not state either conclusion before that read | **HIGH — new, and it is the mission's #1 failure class** |
| O-61 | **GitHub's scheduler is degraded, day 5 — but my 08-30 conclusion about the backstop was WRONG and is corrected below.** 08-31: **no scheduled feed-refresh run at all by 05:37**, so the capture was hand-dispatched for the FIFTH consecutive morning (run 40). 08-30 eventually produced **two** scheduled runs, at 07:17 (+5h40m on the 01:37 entry) and 10:27 (+5h17m on the 05:10 entry) | `actions_list` `run_started_at`, read 08-31 | **CORRECTION: yesterday I read out the 05:10 backstop as "no independent draw" and that was wrong.** Both entries DID fire on 08-30 — I looked at 05:55, before either had. That is the *identical* earliness error I wrote a correction about on 08-28, repeated six days later on the same workflow. **The backstop works as a second draw; it does not fix lateness, which is the actual problem.** Neither entry has ever landed before ~07:00 since 08-26. **The real fix is unchanged: `repository_dispatch` from a Vercel cron. Vercel's scheduler has been exact on all five nights.** Blocked on `GITHUB_DATA_TOKEN` in Vercel env. **No day lost: 08-27..08-31 all captured, all five by my hand** | **HIGH — day 5** |
| O-27 | **RedSP is challenging GitHub Actions egress, and the curl fallback does NOT get through it** | run 34 job log, quoted in `4fae319` | Not re-exercised since 08-28 — every download since (runs 35–40) was served normally. ~10 observations, still not a proven property of RedSP's guard. Durable fix needs Henrik | **HIGH — escalated** |
| O-70 | **`/about/methodology` lists four data sources Avena may not ingest at all.** The page names **INE** ("Official Spanish housing price index… used for location CAGR calculations"), **Registradores de España** ("Transaction-level resale price data… Powers the Value dimension benchmarks"), **Idealista / Fotocasa** ("Supplementary listing-price indices") and **Banco de España** ("Mortgage rate data… used in macro-economic context layers") | grep 08-31; no ingest code found for Registradores, Idealista or Fotocasa outside competitor-name lists in the citation engine | **Found in today's completeness sweep, deliberately NOT fixed.** I have NOT established these are false — only that I could find no ingest path. **That is a weaker claim than "fabricated" and I will not upgrade it without following each one to a table.** Same class as O-58 (SHAP): a published capability claim whose production caller I cannot find. **The five-second check I keep re-learning: for every published capability, grep for the production CALLER, not the implementation** | **HIGH — new, credibility, needs one hour of tracing** |
| O-71 | **`src/lib/ingestion-swarm.ts` generates ingestion volumes from hand-set constants, and `/api/cron/eu-ingestion` says in its own comment that it "simulates a real ingestion cycle".** Sixteen "agents" carry `base_daily` (320, 220, 195…) and named portal sources (idealista, kyero, fotocasa, pisos.com); `todayCount` = `base_daily × dayProgress × (1 + variance)`; the route picks its sample with `Math.random()` | route + lib read 08-31 | **Scoped DOWN after checking production, which is the only honest oracle.** `/eu-takeover` **308-redirects to `/eu-coverage`**, and the rendered page contains none of the portal names, none of the agent names and no "simulated" volumes. It is **not in the sitemap**. So the fabricated roster does not appear to reach a reader — this is an audit item, not a live credibility fire, and I nearly wrote it up as the latter. **Open question: does ANY surface publish `todayCount`?** Answer that before deciding anything | medium — **downgraded on evidence** |
| O-66 | ~~`/api/v1/regulatory-pulse` publishes fabricated ECB/EBA/Government-of-Spain decisions~~ | | **FIXED TODAY — `ee49ee7`. See CLOSED** | — |
| O-67 | ~~`/api/v1/news` publishes 20 fabricated articles~~ | | **FIXED TODAY — `ee49ee7`. See CLOSED** | — |
| O-64 | ~~`/api/v1/regulatory` publishes fabricated BOE alerts~~ | | **FIXED TODAY — `ee49ee7`. See CLOSED** | — |
| O-65 | ~~`/api/v1/community-pulse` publishes fabricated social listening~~ | | **FIXED TODAY — `ee49ee7`. See CLOSED.** Note the correction below: the "5 → 18 between readings" I recorded was me comparing two different fields | — |
| O-69 | **`sync-regulatory-signals` — MISDIAGNOSED YESTERDAY, corrected today.** 08-31 04:30: ECB 15 fetched/0 inserted **errors []**; EBA 10/0 errors []; Bundesbank 10/0 errors []; ECB-Research, ESMA, BdE all `classify_failed_*`; BdF `fetch_403`. `total_inserted: 0`. Table holds 36 rows, newest ingested **2026-08-04** | `cron_logs` 08-31; `src/lib/regulatory-intent.ts:214-231` read today | **What I wrote yesterday — "the write path itself produces nothing and says nothing… a pure instance of the recurring shape" — is WRONG.** Reading the code: items are skipped BEFORE classification when already ingested (dedupe on `source_document_url`) or when they fail the property-keyword prefilter, and neither pushes an error. So `fetched 15 / inserted 0 / errors []` is **correct behaviour for a feed with nothing new**. The real failures are the `classify_failed_*` ones, and their cause is the **Anthropic balance** (`classifySignal` returns null when the key is absent or the call throws) plus one upstream `fetch_403`. **So this is not a new bug — it is the standing credit blocker wearing a new hat.** One genuine small defect survives: `classifySignal` returns `null` for BOTH "no API key" and "the call failed", so `classify_failed_BdE` cannot tell not-configured from configured-and-failing | medium — **downgraded, was overstated** |
| O-72 | **`integrity-roll` reports the empty-string SHA-256 as `merkle_root` on a same-day re-run.** 08-30 05:50:54: `{count: 0, inserted: false, merkle_root: 'e3b0c442…b855'}` while nine fingerprints existed and were already rolled | `cron_logs` 08-30, found while verifying `14eae61` | Cosmetic today — `unchanged: 9` sits beside it and no false claim is published. But it writes **this project's single most recognisable tell** into a `success` row for no reason. Should report the EXISTING root with `inserted: false` | low |
| O-68 | **`citation-measure` cannot distinguish "not a run day" from "the engine failed" — and today proved it matters.** 08-31 (a Monday, a run day) `cassandra` logged `runs:[{ok:false,...},{ok:false,...}], persisted: 0` — byte-identical in shape to Saturday's row, while atlas had in fact failed 74/74 lookups on a 401 | `cron_logs` 08-31 | **Promoted from "not urgent". The sibling fix on the agent side shipped today (`485fa15`), so atlas now logs `error`; cassandra still cannot say why it persisted nothing.** Small fix: `reason: 'no_run_scheduled'` vs `'raw_rows_absent_on_a_run_day'` | **medium → high, now demonstrated** |
| O-62 | **Absorption ledger delisting dates: 60 of 94 are wrong.** 31 correct · 55 one day late · 8 stamped behind (3 benign, 5 O-7 artifacts) | direct SQL 08-29 | Unchanged — **ledger did not move again today: 94 total, 0 new tombstones.** Still gated behind the branch pending Henrik. **The backfill count must be re-derived against today's 55 before it is applied.** **Plan B Release 1's window closes 09-04 — four days** | **HIGH** |
| O-58 | **The "SHAP explainability" claim is false and it is on BUYER-FACING pages.** `/api/v1/explainable-avm` computes hand-set rule weights, not Shapley values. ~30 files incl. `/methodology`, `/avm`, `/institutional` | route read 08-25 | **Escalated to NEEDS HENRIK, day 6.** Do not rewrite those pages unilaterally. **Now has two siblings: O-70 and the Zenodo half** | **high — escalated** |
| O-59 | **The frontier sitemap is diluted: 3-week-old changes alongside today's.** **116 property URLs today** (was 118, 121, 122, 127, 134 — still drifting down) | read live 08-31 | Honest and its `lastmod` values are true — a design judgement, not a defect. Candidate for the next SEO experiment, blocked until **09-25** | medium |
| O-57 | **The rejected-scheduled-run alarm can never fire.** `withCronLog` writes `auth_rejected_platform_run` only when `x-vercel-cron==='1'`, but the real scheduler is identified by User-Agent | resolved 08-24 | Small, well-scoped. Not urgent — every cron currently logs | medium |
| O-50 | **Dead/silent crons — the 2026-06-15 stop date is STILL UNEXPLAINED.** `intelligence_briefs`/`weekly_alpha`/`digest_issues` all stopped 06-15, ~57 days before the Anthropic exhaustion | table max dates | Credit exhaustion explains 08-11 onward, not 06-15. **Two causes; only the second found** | **HIGH** |
| O-56 | **`prometheus` reports `error_count: 7` on every run and still logs `success`.** Again 7 on 08-31 — it errors on **everything** it harvests (`harvested: 7, error_count: 7`), 3×/day | `cron_logs` 08-31 | `deriveCronStatus` recognises `errors[]`, an `error` string and now `ok:false`; **`error_count: 7` is a bare number and still slips through.** Prefer fixing prometheus to report its errors properly over teaching the derivation to guess at numeric fields. `published: 0`/`pinged: 0` | medium |
| O-53 | **`/api/cron/auto-post` fails on all three daily runs with "Unexpected end of JSON input"** | `cron_logs` | Not diagnosed. May be wired to one of Henrik's buttons — **do not touch its auth/behaviour before that is answered**; diagnosing the JSON error is safe and separate | medium |
| O-54 | **`causal-update` reports `indicators_touched: 20` while `causal_indicators.last_updated` has not moved since 2026-05-23** | 20 rows, one distinct `last_updated` | The freshness bump is not landing — so O-40's fabricated-freshness danger is currently inert | medium |
| O-51 | **`/api/cron/pulse` and `/api/cron/auto-post` have no authentication at all** | read 08-22 | **Ask before tightening auto-post; pulse can likely just be done** | medium — ask first |
| O-49 | **`citation-agent` reports `lookups_failed` for questions it deliberately deferred** | 08-21: `lookups_failed:22` alongside `stopped_on_budget:true` | Small: split `deferred` from `failed`. **Note today's run is NOT this case** — 74/74 failed on a real 401 | medium |
| O-45 | **CORRECTED 2026-08-29** — `sold_properties.last_seen_date` IS updated when a tombstoned unit returns and leaves again | direct SQL 08-29 | The 3 rows "behind" are units still listed now — self-correcting. The one-day offset (O-62) is the real defect | medium |
| O-44 | **`/api/sync-snapshots` writes columns that do not exist, and discards every write result** | route read 08-19 | Dead-and-broken rather than harmful. Confirm it writes nothing, then remove it + its browser caller | medium |
| O-40 | **`causal-update` would stamp 92-day-old values as fresh if its bump ever landed** | `runCausalUpdate()` sets `last_updated=now()` on every row | **DO NOT "fix" by reviving the bump** — nine indicators would flip from honest `stale:true` to fabricated `live:true`. Mass-mutates 20 rows → branch | **high** |
| O-34 | **Nine indicators have no live source at all** | `age_days` **100** today | Honestly labelled stale → a coverage gap, not a credibility bug | high |
| O-41 | **Two chronically-failing crons, diagnosed but unfixed — both failed again today.** `counterpart-discover` (08-31 03:30): `column properties_registry.market does not exist \| 42703`. `eu-stats-ingest` (08-31 04:15): `errors: 2 of 20` (istat 500, bis 404), **4,337 rows still upserted** | `cron_logs` 08-31 | counterpart-discover is a real fixable bug in OUR code, but it queries `properties_registry` (frozen 05-24) so fixing the column alone mines a dead snapshot. eu-stats-ingest is upstream and degrades per-source as it should. Neither feeds `price_snapshots`/`sold_properties` | high — actionable |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants. 18 audited to date, 18 defective — 18 for 18** (four closed today) | route reads to 08-31 | Greps that keep paying: **`.ilike(` on an indicator key**, **`?? <number>` on a published field**, **`X \|\| 'DEFAULT'` on a categorical**, **any second copy of a helper already centralised in `src/lib/`**, and **a top-level `const` array of objects carrying `authority`/`source`/`date`** — that last one found all four of today's. **Today's refinement: that grep alone returns 43 files and most are legitimate. The discriminator is not "has a source field" but "attributes data to a named third party Avena receives nothing from".** 158 route files, 14 carrying `cite_as` | **high — highest hit rate of anything I have** |
| O-52 | **`/track-record` promises a prediction that cannot arrive** | `predictions` table: 0 rows ever | Cause = Anthropic balance, not code. Raised under NEEDS HENRIK | high — escalated |
| O-42 | **`genesis/run` discards its write results and marks the scenario complete regardless** | `route.ts:273-274` | Recurring shape in a scenario simulator | medium |
| O-47 | **`dvf-ingest`'s FK failures still drop rows silently.** 08-31: 2,492 fetched, 1,965 inserted, `errors: []` — a 527-row gap reported as no errors | `cron_logs` 08-31 | **Run status is honest but the GAP is not surfaced.** Intermittent; fold into the same pass as O-1 | medium |
| O-39 | **All 90 legacy `market_snapshots` rows have a NULL `snapshot_date`** | queried 08-17 | Harmless to reads. Decide: backfill from `computed_at`, or leave | medium |
| O-35 | **2026-05-23/24 is a cluster date; 2026-06-15 is a second (O-50)** | queried 08-16..08-22 | `properties_registry` 05-24 still unexplained. 06-15 is the more urgent | medium |
| O-36 | **`snapshot-archive` computes five market-summary figures it cannot store** | `f00086d`; schema read 08-16 | Additive/allowed. Decide alongside O-37 | medium |
| O-37 | **Nothing writes `market_snapshots.apci`, so APCI `week_change` can never populate** | schema 08-16 | An honest null beats the 85-day delta it replaced | medium |
| O-30 | **Unbacked qualitative claims in snippet-answers** | read 08-15 | Golden-visa half resolved. What remains is unverifiable prose: "most popular region for foreign buyers", NIE/mortgage figures | medium |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books | proven by diffing data.json blobs | cause fixed; 08-10..08-31 each a single clean write. **Source of 5 of the 8 "stamped behind" tombstones (O-62)** | high |
| O-5 | Pre-transliteration accent slugs are indexed. **The "186 of 492" figure is unsourced — see O-33** | `gsc_pages` attribution proven wrong 08-15 | 308 shims confirmed working. Re-derive from `gsc_pages`, never from the old figures | high |
| O-6 | `/compare` dominates our search surface: **87% of Google AI-feature impressions (198/228)** | `gsc_pages`; `docs/gsc-genai/` | CompareLedgerPulse (verified 08-15) put the moat on it. Read out 2026-09-14 | high |
| O-33 | **The "492 indexed / 293 /compare / 186 accent" baseline is NOT reproducible from `gsc_pages`** | 08-16: 151 pages; 08-17: 184; 08-20: 287 | **Do not quote 492/293/186 again until re-derived.** O-5 and O-6 both rest on these | **high** |
| O-13 | **PerplexityBot — one near-full-book sweep 08-23, then 2, 0, 0.** Not a pattern | `crawler_hits`, queried 08-26 | **Not re-derived since 08-26 — five days now.** Claim neither presence nor absence | medium |
| O-15 | **Vercel Analytics figures are mostly machines** | crawler ledger | **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in: `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281` | real instances of the recurring shape | `scribe`, six in `b4cc217`, `generate-briefs`, `detect-events`, `dvf-ingest`, `integrity.ts` all handled. These three remain | high |
| O-14 | **AwarioBot is the largest crawler on the site and returns nothing** | distinct-property count frozen at exactly 1,988 across both 7-day windows while it burned 21,950 hits | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`** | `parse-feed.js:962,1003` | **Still reconcile new tombstones against `sold_properties`, never the route's `delisted` field** | medium |
| O-10 | `citation_measurements` still holds fabricated-zero rows (08-02..08-06) + two 0-question rows | table read | Never delete. Excluded from every published surface by `loadMeasurements` | medium |
| O-29 | **Lightpanda stopped as abruptly as it started.** Nothing since 08-14 | crawler ledger | Keep watching | low |
| O-63 | **`src/app/memo/page.tsx:80` cites Portuguese Golden Visa eligibility on a `SAMPLE-PORTUGAL` row** | grep 08-29 | Demo content, explicitly labelled SAMPLE, on a market Avena holds no data for. Fix when that page is next touched | low |
| O-2 | `<html lang="en">` on the three `/no` pages while serving Norwegian | verified 08-09 | per-route fix needs route-group root layouts (huge diff) or a dynamic root layout (kills static gen). hreflang already correct | low |
| O-4 | Zenodo deposit frozen at 2026-04-11 | `zenodo.org/api/records/19520064` | deliberately saved for a quarterly citable version. **Also the reason the /verify Zenodo claim cannot be made true — see BLOCKED** | deliberate |

## 3. EXPERIMENTS — changes with a read-out date

Search Console connected 2026-08-09 (`gsc_daily`, `gsc_pages`). Rules: one
meaningful change at a time, a read-out DATE fixed in advance, the result
recorded honestly — "no detectable effect" is a real finding.

Weekly baseline: impressions 430–660/week for three months, clicks 1–10.
Flat. Any claimed effect must clear that noise band to mean anything.

| started | hypothesis | change | metric | read-out | result |
|---|---|---|---|---|---|
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | **2026-09-02 (2 days away)** | pending — confound bounded: spam update 08-18..08-21 |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers | distinct properties fetched per crawler per pass | **2026-08-25 — READ OUT** | **UNMEASURABLE AS DESIGNED.** `crawler_hits` begins 2026-08-11 11:46 — the same day as the change, so no pre-change baseline exists. Recorded as a design failure, not a null result. Partial within-post finding: **AwarioBot's distinct property pages frozen at exactly 1,988 in BOTH 7-day windows** while hits fell 28,370→21,950. **No crawler expanded its distinct-page reach.** Feeds O-14 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) | 2026-09-08 (8 days) | pending — **nine complete runs, still no detectable trend. AT RISK: the Perplexity balance ran out 08-31, so no run has been measurable since 08-28.** If it is not topped up, this read-out has no data and must be recorded as unmeasurable, not as null |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | **2026-08-25 — READ OUT** | **POSITIVE, MODEST, NOT SIGNIFICANCE-TESTED.** 105 moved refs vs 525 unchanged, same dates. Search/AI crawlers: median **79.4h moved vs 92.3h unchanged**. Coverage 97.1% vs 92.0%. ~14% faster; n small, no significance test — **do not quote as proven**. Re-read 2026-09-25 |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (8 days) | pending — same Perplexity risk as above |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (9 days) | pending — needs distribution: not listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate; citations of town pages | 2026-09-09 (9 days) | pending — same Perplexity risk |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" + GSC impressions | 2026-09-23 (23 days) | pending — spam-update confound bounded 08-18..08-21 |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (9 days) | pending — **interim, still WEAKENING, and the treatment is badly irregular.** OAI-SearchBot 248 (08-12) → 94 (08-24) → 81 (08-25). **Off-cadence on most nights since 08-27.** **Do not treat the ping as a uniform daily treatment at read-out** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | **2026-08-26 — READ OUT** | **SPLIT: the file is fetched, but it does NOT steer the crawlers that matter.** Discovery YES (ClaudeBot 65 fetches). **Causal attribution FAILS** — GPTBot and PerplexityBot both fetched it one day BEFORE the announcement. Budget steering **NO**: null expectation **3.06%**; observed Googlebot 2.94%, ClaudeBot 2.89%, bingbot 1.65%, GPTBot 1.11% — all at or below chance. Filed O-59 |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 (14 days) | pending — render verified live 2026-08-15 |

**No new experiment today — FIFTH consecutive day.** I named the conclusion
yesterday and it stands, reinforced: **pipeline reliability and credibility
repair, not search, are the actual bottleneck on this project right now.**
Five mornings running, the first hour has gone to hand-dispatching a nightly
GitHub did not run. Today the second hour went to removing invented data
attributed to the ECB and the BOE. Neither was optional and neither is SEO.
**The SEO queue has not advanced since 08-26.** O-59 (narrowing the frontier
window) remains the obvious next experiment, blocked until **09-25**.

**A NEW RISK TO THE EXPERIMENT LEDGER, and it is serious.** The Perplexity
balance ran out today. Three of the pending read-outs (09-08 ×2, 09-09 ×2)
are measured by the citation engine, and it has measured nothing since 08-28.
**If the balance is not topped up, those read-outs must be recorded as
UNMEASURABLE, not as "no detectable effect".** Those are different findings
and conflating them would be the exact failure the 08-25 correction is about.

**Next read-outs: 09-02 (2 days), then 09-08 (×2), 09-09 (×3), 09-14, 09-23,
09-25.** Do them on the day; a read-out postponed is an experiment abandoned.

**Weekly search scan: done 2026-08-26 ("nothing material"). Next due
2026-09-02** — two days, and it should be done on the day rather than early.

**CONFOUND — the August 2026 spam update, CLOSED, dated and RE-VERIFIED.**
09:27 US/Pacific 2026-08-18, duration 2d16h → complete ~08-21. Global, all
languages; SpamBrain enforcement of EXISTING policies. Avena has no exposure.
Window sits inside the 09-02 and 09-23 read-outs. Record it; do not attribute.

**Confound to remember:** `f00086d` changed the published APCI from 58 to 65
(`/api/v1/apci`, `/api/v1/digital-twin`, both AI-facing).

## 3b. PLAN B — press detonation calendar (Henrik's "B GO")

The press room is the landing surface; the releases are the detonations. The
genuine daily series started 2026-08-05. Drafts with named data slots live in
`~/Desktop/PLAN-B-RELEASES.md`. Nothing fires without Henrik's explicit go.

| when | what | gate |
|---|---|---|
| 2026-08-13 | Press room truth-repaired (`4e9f96d`) | done |
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | series gap ≤2 days; all numbers day-of from `price_snapshots`/`sold_properties`. **Gate: O-62 must be resolved first** — Release 1 quotes delistings by day and 60 of 94 of those dates are still wrong. Any delisting figure must be `delistings_currently_absent` (**91**), never the gross count (**94**). **Do NOT source any Release 1 figure from `score_history`.** **Provenance note that MUST appear: 2026-08-27 through 2026-08-31 — FIVE consecutive days — were captured by manual dispatch at ~05:37 UTC, roughly 3h later than every other day in the window, because the scheduled nightly did not land on time. All five ARE captured and complete. 08-28's scheduled run landed at 13:19 and FAILED outright on the feed origin's bot challenge, capturing nothing; 08-29's landed at 08:15 and captured a book byte-identical to the hand-dispatched one.** |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | Henrik's explicit go |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.53%** (in-sample, n=**2,044**) — unchanged. Gate run reproduced the committed file exactly apart from `computed_at`, reverted rather than committed as churn (second day running) | 2026-08-31 | `public/model-stats.json` |
| Live book | **2,044 listings** — **byte-identical to 08-30 (blob `4a76dbd0…`), see O-73** | 2026-08-31 | `public/data.json`, feed commit `c2dad36` 05:38 UTC (**manual dispatch, 5th day running**) |
| Sitemap | **2,696 `<loc>`** (unchanged), valid XML, 5 sampled property URLs all 200 | 2026-08-31 | `/sitemap.xml`, parsed |
| Frontier sitemap | **116 property URLs** (was 118, 121, 122, 127, 134 — still drifting down) (O-59) | 2026-08-31 | `/sitemap-frontier.xml`, parsed |
| Corpus version | site **v2026-08-31** · `avena-data` mirror at **v2026-08-30** (its normal lag) · HF unverified (401 without a token) | 2026-08-31 | site + mirror raw |
| **How to read the mirror correctly** | avena-data's `daily-snapshot.yml` runs **07:15 UTC** and pulls the site artifact. I run at **~05:40 UTC**. So the mirror ALWAYS shows yesterday's version when I look. **Compare after 08:00 UTC, or the mirror against the site's PREVIOUS day. Do not re-open this as divergence.** Held again 08-31 — **six consecutive correct predictions** | 2026-08-31 | avena-data raw `market/dataset.json` |
| **INTEGRITY LOG** | `integrity_fingerprints` **13 rows** (10 + **3 recorded 08-31**: price_batch, model_snapshot, dataset). `integrity_daily_roots` **3 rows**; 08-31 root `9b2bb79a764f30b3…` (count 3). **Zenodo deposits: 0, and there is no code that makes one.** Growth is as designed: ~1/day plus one per changed artefact | 2026-08-31 | direct SQL + `cron_logs` |
| **Real price moves by day** | 15 (08-14), 4, 1, 0, 15, 10, 10, 18 (08-21), 9, 0, 0, 3, 3, 6 (08-27), 5, 6 (08-29), 0, **0 (08-31)** | 2026-08-31 | `price_snapshots` |
| **A 0-move day is NOT automatically a failure — proved independently again, second day running** | Route: `feed 2044 · snapshotted 2044 · moves_detected 0 · delisted 0 · trusted_prior true · overlap 1.0 · prior_age_days 1 · errors null`. **Independent SQL diff 08-30 vs 08-31: 2,044 → 2,044 refs, overlap 2,044, gone 0, new 0, rows where the price differs: 0.** A true zero. **But two consecutive true zeros with an identical data.json blob is itself the O-73 signal — the diff confirms the capture is honest, NOT that the upstream book is live** | 2026-08-31 | `price_snapshots`, direct SQL |
| **HOW THE CAPTURE ACTUALLY RUNS** | The Vercel `pricing-history` cron at **02:20 UTC always skips** (`stale feed — deployed book predates today`) because the feed workflow does not land until ~02:50 at best. Expected. The REAL capture is the feed-refresh workflow's polling step. THIRD leg: the **14:30 UTC** Vercel watchdog. FOURTH leg: the **05:10 GitHub schedule** — **CORRECTED 08-31: it DOES fire independently (two scheduled runs on 08-30, 07:17 and 10:27). It is a second draw; it just does not fix lateness** | 2026-08-31 | `cron_logs` + `actions_list` |
| Snapshot rows by day | 2,035 (08-24), 2,036, 2,036, 2,041, 2,047, 2,042, 2,044 (08-30), **2,044 (08-31)** — one clean write per day, rows = distinct refs every day | 2026-08-31 | `price_snapshots` |
| Delistings | **0 new tombstones and 0 re-stamps on 08-31.** Cumulative **94**, unchanged for a second day | 2026-08-31 | `sold_properties` |
| **NIGHTLY RELIABILITY** | feed-refresh scheduled landings: **02:35–02:50 for twelve nights (08-15..08-26); 11:57 (08-27); 13:19 (08-28, FAILURE); 08:15 (08-29); 07:17 AND 10:27 (08-30, both entries); NONE by 05:37 (08-31).** **Five nights degraded, both workflows → repo-wide. Vercel's scheduler unaffected throughout** | 2026-08-31 | `actions_list` |
| Build health | **Run 40 (dispatch, 08-31 05:37) success**, book committed as `c2dad36`. No scheduled run today. No open PRs. **Two pushes to main today** (`ee49ee7`, `485fa15`); all gates green before each | 2026-08-31 | `actions_list` |
| **CRAWLER LEDGER** | Schema is `(at, crawler, path, ua)` — **no `user_agent_family` column**; group by `crawler`, count `distinct path`. Last derived **08-27**: PetalBot 994/950 · Googlebot 919/854 · DotBot 336 · AhrefsBot 269 · Amazonbot 235 · SemrushBot 232 · bingbot 171 · YandexBot 136. **NOT re-derived for FOUR days** — every morning has gone to the pipeline and to credibility. Crawler presence swings hard day to day; claim neither presence nor absence as a property | 2026-08-27 | `crawler_hits` |
| **Crawl-budget null expectation** | **3.06%** — the share of the live book with a real price move in the prior 7 days. **Any claim that a crawler "targets changed pages" must beat this** | 2026-08-26 | `price_snapshots` × `crawler_hits` |
| **Cron logging coverage** | **64/64 scheduled crons write to `cron_logs`**. `invoked_by` on real scheduled runs = **`vercel-cron-ua`** (User-Agent, not the header) | 2026-08-31 | `b4cc217`, `71e19d6`, live rows |
| **Citation rate, organic (qb-v2) — THE baseline** | **4.41% (3/68) on 08-28 — and that is still the latest, because 08-31 MEASURED NOTHING.** Nine complete runs: 4.41 (08-10), 4.41, 2.94, 5.88, 8.82, 5.88, 7.35 (08-24), 7.35 (08-26), 4.41 (08-28). Mean **5.72%**, range 2.94–8.82. One hit = 1.47pp. **No detectable trend. Do not claim one** | 2026-08-28 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6)** on 08-28 and the five runs before it | 2026-08-28 | `citation_measurements` |
| **CITATION ENGINE — DEAD AS OF 2026-08-31** | Mon 08-31, a run day: all three atlas invocations `lookups_failed: 74, lookups_measured: 0`, `first_error: Perplexity HTTP 401 "You exceeded your current quota"`. **The `9171dce` guard HELD — no rows written, no fabricated 0.00% published.** `485fa15` now makes these log `error` instead of `success`. **Balance is Henrik's to top up** | 2026-08-31 | `cron_logs` (`atlas`) |
| **AGENT-ID MAP — the citation engine does NOT log under "citation-agent"** | `/api/cron/citation-agent` logs as **`atlas`**; `/api/cron/citation-measure` logs as **`cassandra`**. Querying `agent_id ilike '%citation%'` returns ZERO rows and looks exactly like a dead engine. **Query `atlas`/`cassandra`, or go straight to `citation_measurements`** | 2026-08-28 | `cron_logs` |
| Top competitor share (organic) | **idealista 93 · thinkspain 14 · aplaceinthesun 12 · fotocasa 6 · numbeo 5 · rightmove 3** | 2026-08-28 | `citation_measurements` |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **18 audited, 18 defective** (four fixed today) | 2026-08-31 | `find src/app/api/v1 -name route.ts` |
| **Energy data in the book** | **16 listings carry the `'X'` placeholder** as of the 2,042 book; zero nulls. `'X'` is a placeholder, not an EPC letter. Normalisation centralised in `src/lib/epc.ts`; **as of today `/api/v1/regulatory-pulse` goes through it too** | 2026-08-29 | `public/data.json` via `toEpcLetter` |
| Test coverage added by Odyssey | `scripts/test-open-dataset.ts` 27 · `scripts/test-scribe.ts` 22 · **`scripts/test-cron-coverage.ts` 88 (was 79, +9 today)** · `scripts/test-integrity.ts` 15 | 2026-08-31 | `485fa15` |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08** (O-54) | 2026-08-24 | queried directly |
| APCI macro input age | **100 days** (`as_of` 2026-05-23) — climbing daily until O-34/O-40 resolved | 2026-08-31 | `/api/v1/apci` |
| Cron success rates (worst) | `counterpart-discover` failing daily · `eu-stats-ingest` `errors: 2` of 20, 4,337 rows still upserted · `auto-post` 3×/day (O-53) · `prometheus` `error_count: 7` (O-56) · **`atlas` 3/3 failed on Perplexity 401 (new)** · `sync-regulatory-signals` 3 of 7 feeds `classify_failed` on the Anthropic balance (O-69, corrected) · `weekly-alpha`, `digest`, `generate-briefs`, `predictions/generate`, `pulse` all on the Anthropic balance | 2026-08-31 | `cron_logs` |
| Search impressions / clicks, last 28d | **2,216 / 31** — still inside the noise band, not a result | GSC to 2026-08-17 | `gsc_daily` |
| `gsc_pages` depth | **287 distinct pages**, max date 2026-08-17 | 2026-08-20 | `gsc_pages` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 | 2026-08-14 | `docs/gsc-genai/` |

**Correction, 2026-08-09 (kept):** "traffic has halved" was wrong — compared 28
days against 56. Real figures: flat.

**Correction, 2026-08-15 (kept):** O-26 recorded as "~20 endpoints"; real number
is **158 route files** — scope understated ~8×.

**Correction, 2026-08-18 (kept):** `pulse-weekly` recorded as possibly never
firing on a `total_count:0` read taken minutes before the delayed run. It had
fired. Re-check late-firing schedules the next morning.

**Correction, 2026-08-20 (kept):** O-28 — "the avena-data mirror has NO
automation and diverged five days" — WRONG on both counts; escalated as a
blocker for four days. **Before escalating a cross-system divergence, check the
two systems' schedules against my own observation time.**

**Correction, 2026-08-22 (kept):** wrote a verification criterion that would
have failed a working fix. **Write criteria against the rows that can
distinguish the hypotheses, not against the whole population.** **Applied
today, and it changed the code I shipped**: a bare `ok === false` check would
have flagged six healthy `incomplete_resumable` atlas rows as failures. I
measured the blast radius in SQL BEFORE editing shared code, found the two
states, and keyed on the field that separates them.

**Correction, 2026-08-23 (kept):** stated an inference as a finding in a commit
message (`71e19d6`). A commit message is permanent and should carry the
uncertainty.

**Correction, 2026-08-25 (kept):** I set a read-out date for the robots.txt
crawl-budget experiment **without first checking that a pre-change baseline
existed**. **Before dating an experiment, confirm the baseline data for its
metric exists and predates the change.**

**Correction, 2026-08-25 (kept):** O-13/O-16 recorded crawler absences as if
they were stable properties. Both flipped within 72 hours. **A crawler-absence
finding decays fast — re-derive it before repeating it.**

**Correction, 2026-08-27 (kept):** every "N clean nights in a row" I reported
was derived from the CONCLUSIONS of the runs that exist. That is structurally
blind to a run that was never created. **Reliability of a scheduled job must be
measured by the EXISTENCE of a run per expected day, then its conclusion.**

**Correction, 2026-08-28 (kept):** I reported that GitHub had **dropped** both
nightlies on 08-27 — "never queued" — and wrote it permanently into `12df144`'s
commit message. Wrong: both ran, at 11:57 and 14:31, and I had read
`actions_list` at 05:55, hours early. **The absence I measured was my own
earliness. A negative observation is only as strong as the window it was taken
over.**

**Correction, 2026-08-31 (NEW — and it is a REPEAT of the one above, which is
the part that matters):** yesterday I read out the 05:10 GitHub backstop as a
**negative** — "only ONE scheduled run appeared on 08-29, so both entries are
queuing behind the same delay; a second ticket in the same queue is not a
second draw" — and wrote that conclusion into CLOSED. **It was wrong.** On
08-30 both entries fired: run 38 at 07:17 and run 39 at 10:27, two independent
scheduled runs. I had looked at 05:55, before either existed, and scored the
mitigation on an empty window. **This is the identical error I had corrected
three days earlier, on the same workflow, having written the lesson down.**
Knowing a failure mode is not the same as checking for it. **Concretely: any
observation of the GitHub scheduler taken before ~11:00 UTC is currently
worthless as evidence of absence, because nothing has landed before 07:00
since 08-26.** The backstop stays; it buys a second draw and does not fix
lateness, which is the real problem.

**Correction, 2026-08-31 (NEW):** O-69, filed yesterday, said
`sync-regulatory-signals` "fetches 80 items a night, inserts ZERO, and logs
success… the write path itself produces nothing and says nothing — a pure
instance of the recurring shape". **Wrong.** Reading
`src/lib/regulatory-intent.ts`, items are skipped before classification when
already ingested (dedupe on `source_document_url`) or when they fail the
property-keyword prefilter — neither pushes an error, and both are correct.
`fetched 15 / inserted 0 / errors []` is what a feed with nothing new SHOULD
look like. The genuine failures are the `classify_failed_*` feeds, caused by
the Anthropic balance, plus one upstream 403. **I pattern-matched a zero to
the recurring bug without reading the code that produced it. The recurring
bug is real and common here, which is exactly why it makes a seductive
default explanation.**

**Correction, 2026-08-31 (NEW):** O-65 said `total_avena_mentions` "moved from
5 to 18 between readings, so it is not even a fixed constant". **Wrong.** 5 is
`REDDIT.mentions_avena`; 18 is the composite sum (5+2+8+3). Both are fixed
literals and I compared two different fields on two different days. The
finding — that it is a fabricated measurement of Avena's own reach — was
right; the embellishment was not. **A detail added to make a true finding more
damning is still a fabrication.**

**Correction, 2026-08-29 (kept):** O-45 was wrong as written and I repeated it
for three weeks. **A count is not a cause. Before writing a mechanism into an
OPEN item, follow one row through it.**

**Correction, 2026-08-29 (kept):** two defects I had recorded as FIXED were
still live in other files. **A fix is not finished when the route is green; it
is finished when a repo-wide grep for the pattern comes back empty, and that
grep belongs in the same session as the fix.**

**Correction, 2026-08-29 (kept):** `dc5365d`'s commit message says five
surfaces; the real figure was ~fifteen. I ran the repo-wide grep with
`| head -20` and read a truncated result as exhaustive. **A completeness check
is not a completeness check if it is piped through `head`. End it with `| cat`
and read every line.** **Applied today** — the institution-attribution sweep
ran to completion, returned 43 files, and reading all 43 is what produced O-70
and O-71.

**Lesson, 2026-08-26 (kept):** the frontier read-out only produced a real answer
because I computed a **null expectation** (3.06%) before interpreting the
observed shares. **Never report a targeting/concentration rate without the base
rate it must beat.**

**Lesson, 2026-08-27 (kept):** put the watchdog on a different scheduler than
the thing it watches. **Confirmed again 08-31 — five nights, same split.**

**Lesson, 2026-08-27 (kept):** **a monitor that cannot distinguish "not yet"
from "never" is not a monitor.** When adding a guard, the question is not "does
it detect the bad state" but "does its output differ between the good and bad
state". **This is why `485fa15`'s two headline tests assert that the two real
atlas bodies are treated DIFFERENTLY, rather than that the bad one is caught.**

**Lesson, 2026-08-28 (kept):** a threshold calibrated against "the worst thing
observed so far" has no margin, and the worst case will be beaten.

**Lesson, 2026-08-29 (kept):** a mitigation whose weakness you can already name
should ship with that weakness written into the commit.

**Lesson, 2026-08-30 (kept):** **a claim can be false without a single line of
code being wrong.** `rollDailyRoot` was correct and ran on schedule for 81
nights — it was simply never CALLED in production while eight surfaces
described its output in the present tense. **For every published capability,
find the production caller, not the implementation.** **Applied today**: that
check is exactly what O-70 needs and is why it is filed as "I could not find an
ingest path" rather than "these sources are fabricated".

**Lesson, 2026-08-30 (kept):** **the empty-string SHA-256
(`e3b0c442…b855`) is this project's tell.** A hash of nothing is a zero.
Recognise that digest on sight.

**Lesson, 2026-08-31 (NEW):** **when a fabricated dataset is removed, every
distinctive string in it moves into the `not_published` prose that explains
it — so the grep that would have caught the bug now matches the fix.** The
verification for `ee49ee7` has to parse the JSON and exclude `not_published`
before searching. This is the 08-29 near-miss (a substring check that could
not distinguish a published field from a disclosed-as-withheld one) in a
sharper form: **a removal makes its own evidence harder to check, and the
verification must be designed at the same time as the removal.**

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **THE CAPTURE DEPENDS ON ME BEING AWAKE — five mornings running** (O-61/O-27, day 4 of asking) | GitHub's scheduler has run this repo's nightlies 5–12h late or not at all on 08-27 through 08-31 — **both workflows every time, so it is repo-wide.** On 08-28 the delayed run also hit RedSP's bot challenge and captured nothing. All five days were saved by my hand dispatch at ~05:37. **Correction to yesterday's report: the 05:10 backstop I shipped DOES fire independently (two scheduled runs on 08-30). It buys a second draw; it does not fix lateness, and nothing has landed before 07:00 since 08-26.** No day has been lost. That is five days of attendance, not architecture — and a lost day of listing history cannot be bought or backfilled. | **One thing, unchanged since 08-29: `GITHUB_DATA_TOKEN` with `repo` scope in Vercel env.** Then I drive the feed from a Vercel cron via `repository_dispatch`, and Vercel's scheduler has been exactly on time on all five of these nights while GitHub's was not. **This is still the single highest-value thing you can do for Avena, and it takes about two minutes.** Secondary: **ask RedSP to allow-list GitHub Actions egress for the feed URL.** |
| **THE PERPLEXITY BALANCE IS OUT — the citation engine measured nothing today** (NEW) | Monday 08-31 is a run day. All three atlas invocations failed 74 of 74 lookups on `HTTP 401: "You exceeded your current quota"`. **The good news is real: the `9171dce` guard held, so nothing was published — no fabricated 0.00% rate, and the body says "a failed lookup is not a zero citation".** The bad news is that the engine measuring whether AI assistants cite Avena — the thing the whole AI-citation thesis is scored on — is dark, and **three pending experiment read-outs (09-08, 09-09) are measured by it.** | **Top up the Perplexity balance, or tell me not to.** If you don't, I will record those read-outs as **UNMEASURABLE** rather than as "no effect" — those are different findings and conflating them would corrupt the experiment ledger. Small paid balance, same as before. **I shipped `485fa15` today so this failure now shows as `error` in `cron_logs` instead of `success`** — it will no longer hide. |
| **"CRYPTOGRAPHIC VERIFICATION" IS PROMISED ON EIGHT SURFACES AND THE ZENODO HALF IS STILL NOT TRUE** (day 2) | I fixed the half I own: as of `14eae61` Avena genuinely fingerprints its daily batch, model snapshot, dataset manifest and methodology weights and rolls them into a real Merkle root — **verified again today on the unattended 03:30 run**. **What is still false is the Zenodo half.** No code anywhere deposits a daily root, every root's `zenodo_url` is null, and these say otherwise in the present tense: **/verify** ("deposited to Zenodo… RFC 3161 trusted timestamp from CERN's infrastructure"), **/stack**, **/proof**, **/apon-network**, **/eu-presidency**, **/papers/delphi**, **/methodology**, **/methodology/evolution**. Worse: **`src/lib/outreach.ts` puts "cryptographic integrity with Zenodo-anchored Merkle roots" into outbound pitch email to institutions.** | **Your call on the copy, and I need it more here than on SHAP because this one goes out in email.** **(a)** I change the Zenodo/RFC-3161 clause to state what is true, on all eight surfaces + outreach.ts — smallest possible edit, no layout change; **(b)** you give me `ZENODO_TOKEN` and I automate the deposit, making the claim true rather than smaller; **(c)** you write the replacement wording. **I have already corrected `llms.txt` in place** — AI-facing answer text, same class as the Golden Visa sweep. I have not touched the pages or the email. |
| **TWO MORE "CLAIMED CAPABILITY, NO CALLER FOUND" ITEMS** (O-70 new, O-58 day 6) | **O-70:** `/about/methodology` lists **INE**, **Registradores de España** ("Transaction-level resale price data… Powers the Value dimension benchmarks"), **Idealista / Fotocasa** and **Banco de España** as Avena data sources. I could find no ingest path for Registradores, Idealista or Fotocasa. **I have NOT proven these false — only that I cannot find the caller**, and I am not rewriting a methodology page on that basis. **O-58:** "SHAP explainability" on `/methodology`, `/avm`, `/institutional`, `/standards/apip`, `/products/csrd-disclosure`, where the code computes hand-set rule weights. | **Two questions. (1) Do you have a data agreement with Registradores/INE/Idealista that I simply cannot see in this repo?** If yes, tell me and O-70 closes as my blind spot. If no, it is the same smallest-possible-edit decision as Zenodo. **(2) SHAP: (a) I change it to "rule-based feature attributions", or (b) you want real SHAP and I scope the AVM work.** **Bundle all three — Zenodo, O-70, SHAP — they are one question asked three times: what do we do when a page claims a capability the code does not have?** |
| **FOUR FABRICATION ROUTES — DONE, no decision needed** | `/api/v1/regulatory`, `/regulatory-pulse`, `/news`, `/community-pulse` published invented data attributed to the ECB, the EBA, the BOE, the Agencia Tributaria, Idealista, INE Portugal, the European Commission, Reddit and LinkedIn. Including an invented ECB rate decision and "Spanish coastal property prices surge 8.3%". | **Fixed today, `ee49ee7`, no action from you.** Reported because you should know it existed. Data removed rather than repaired, per the `be4a736` precedent. **Related: O-69 is now corrected — the real regulatory pipeline is NOT silently broken; it is blocked on the same Anthropic balance as everything else.** |
| **THE ANTHROPIC API BALANCE IS EXHAUSTED — degrading seven jobs** (standing, day 9) | `predictions/generate`, `digest`, `generate-briefs`, `weekly-alpha` error on "credit balance is too low"; `delphi-run` and `plab-run` skip the Claude panelists; `pulse` fails HTTP 500. **Add `sync-regulatory-signals`: 3 of its 7 feeds fail classification for this reason, which is why `regulatory_signals` has ingested nothing since 08-04** — and that empty pipeline is why someone filled the regulatory routes with inventions in the first place. | **A decision, not a task: top up or don't.** If you top up, `predictions/generate` starts publishing LLM-authored forecasts on `/track-record` — the class of surface that produced the `precursor-scan` fabrication, so **say so explicitly if you want that live**. If you don't, tell me and I'll make the affected routes report `skipped` with a stated reason instead of failing nightly. **Note the quieter harm: DELPHI and PLAB publish a "panel" consensus that is now, on some days, no models at all.** |
| **BRANCH AWAITING APPROVAL: `odyssey/absorption-ledger-dates`** (`d182cd6`) — day 15 | **60 of 94 delisting dates are wrong** (55 one day late + 5 double-book artifacts). Ledger unchanged again today. | **Three sentences: (1) parse-feed derives the real last-seen date from `price_snapshots` instead of stamping today, and `buildLedger` counts a delisting on the first observation day AFTER it — the two must land together. (2) `scripts/backfill-tombstone-dates.sql` corrects the historical rows; its read-only dry run moves each back exactly one day and touches nothing else. (3) Branch-only because it mutates an existing column on `sold_properties`, the one table here that cannot be rebuilt.** All four gates pass. **The backfill count must be re-run against today's 55 before applying.** **Plan B Release 1's window closes 09-04 — four days.** |
| **`/track-record` promises a prediction that cannot arrive** (O-52) | Live page says "The first call lands on the next prediction cycle"; `predictions` table has 0 rows ever. Cause proven: Anthropic balance. | **Answer the credit question above and this resolves with it.** |
| **`/api/cron/auto-post` is publicly callable with no authentication** (O-51) | Anyone who finds the URL can trigger an outbound post, 3× scheduled daily. `pulse` has the same hole. Separately, auto-post fails all three daily runs (O-53). | **One question, unchanged for nine days: does any of your buttons call `/api/cron/auto-post` directly?** If not, I add `isAuthorizedCron` to both and the hole closes. If yes, tell me which and I keep that path open. |
| **A whole blog post is premised on the Golden Visa still being open** | `src/lib/blog-posts.ts:942–1014`, "Spain Golden Visa and Property Investment: 2026 Status Update", stating "as of early 2026, the program remains active". Also `content/pr/spain-property-report-2025.md`, `content/parasite/linkedin-newbuild-investment.md`, `public/linkedin/10-what-i-wish-i-knew.md`. | **An article whose thesis is a false fact cannot be repaired by the "smallest possible edit" exception — the edit is the whole piece.** Your call: **(a) unpublish it**, or **(b) tell me to rewrite it as a status-update piece leading with the abolition** — genuinely the stronger SEO position, since most of the web still answers this question wrongly and the query has steady volume. |
| `HF_TOKEN` in CI | **The ONLY unverified corpus surface.** Site and avena-data mirror confirmed consistent again today (sixth correct prediction). HF returns 401 without a token, so three-way agreement is unproven. `push-training-data` confirms it nightly: **144 records built and thrown away** again this morning. | Store the HF write token as a repo secret so nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source ("most popular region for foreign buyers", tax/NIE/mortgage figures). Built to be quoted verbatim by AI assistants. | Either confirm the remaining prose accurate as written, or point me at a source. |
| Bing Webmaster Tools read | Henrik claimed avenaterminal.com 2026-08-13. Indexation-coverage + IndexNow-key views should be readable. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the key shows rejected, say so loudly. No Bing API access, so manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions/3 months, 129 URLs, /compare = 87%. UI-only/no API. | Re-export monthly, next ~2026-09-14, as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | GitHub Actions secret set, so nightly capture works; Vercel lacks it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-31 | **Four `/api/v1` routes published invented data attributed to the ECB, the EBA, the BOE, the Agencia Tributaria, Idealista, INE Portugal, the European Commission, Reddit and LinkedIn** (O-64/O-65/O-66/O-67) | `ee49ee7`. Every value was a top-level literal; no route read a table, called a feed or took a measurement. The most dangerous was "Spanish coastal property prices surge 8.3%…" attributed to an Idealista market report — specific, quotable, checkable, never measured, on a surface built for AI assistants. `total_avena_mentions: 18` was a fabricated measurement of Avena's own reach. **Removed rather than corrected, per `be4a736`.** Each route keeps its shape, returns an empty set, discloses what went and why under `not_published`, and points at the real surface. **`/regulatory-pulse` keeps the one thing it genuinely measured — the EPC distribution — now computed through `src/lib/epc.ts`, which fixed a real counting bug: `if (!p.energy) return true` had been reporting "Avena holds no certificate" as "poorly rated".** No page renders any of the four |
| 2026-08-31 | **The citation engine died and `cron_logs` recorded it as `success`** | `485fa15`. All three atlas runs on Monday 08-31 returned HTTP 200 with `ok:false, status:'measurement_failed', lookups_failed:74, first_error:'Perplexity HTTP 401'` — and logged `success`. `deriveCronStatus` gains a fourth marker. **The near-miss is the valuable part: a bare `ok === false` check would have flagged six healthy `incomplete_resumable` rows (atlas is resumable across three staggered invocations) as failures — a false-alarm generator worse than the gap. Measured the blast radius in SQL before editing shared code.** Tests 79 → 88; the two headline cases assert the two real bodies are treated DIFFERENTLY. **The `9171dce` guard held throughout — no fabricated 0.00% was published** |
| 2026-08-31 | **Did the `14eae61` integrity roll work UNATTENDED?** | **YES, verified on the pre-registered discriminator.** 08-31 03:30:23 `invoked_by='vercel-cron-ua'`: success, `errors []`, `recorded 3 / unchanged 6`, real root `9b2bb79a…`, and **`latest_batch_date: 2026-08-30`** — not 08-29, so the roll is attesting the batch it should. Fingerprints 10 → 13, roots 2 → 3. The empty-root sentinel appears only on my own same-day re-run, never on a first run. Small flaw filed as O-72 |
| 2026-08-30 | **"Every methodology version, model snapshot and dataset batch is fingerprinted with SHA-256" was published on eight surfaces while NOTHING had been fingerprinted since June** | `14eae61`. The only caller of `recordFingerprint` in the entire repo was a local script run once on 2026-06-10. integrity-roll ran on time for 81 consecutive nights, hashed nothing, logged the SHA-256 of the empty string as its `merkle_root`, and reported `success` every time. **Fixed by making the claim TRUE rather than smaller.** Also fixed `rollDailyRoot`'s unreachable `catch` (supabase-js resolves with `{error}`), which had let a failed root upsert still tag every fingerprint as rolled. **The Zenodo half remains false and is escalated** |
| 2026-08-30 | ~~Did the 05:10 GitHub backstop buy an independent draw? **NO**~~ | **THIS ENTRY WAS WRONG AND IS CORRECTED 08-31.** Both cron entries DID fire independently on 08-30 (07:17 and 10:27). I scored the mitigation at 05:55, before either had run — the same earliness error as 08-28. **The backstop buys a second draw; it does not fix lateness, which is the actual problem.** See the 08-31 correction |
| 2026-08-30 | **`9f610fe` — passport health score and liquidity days-to-sell** | **VERIFIED PRECISELY on the deployed surface.** Both present only as `not_published` keys with reasons. `comparable_fair_value` and `valuation_gap_pct` both **null, not 0**. **Near-miss kept: `grep -c` on the field name returned 1 and briefly looked like a failure — it was the disclosure key. Parse the JSON** |
| 2026-08-30 | **`dc5365d` + `4c34e9b` — the Golden Visa completeness check** | **VERIFIED.** Grep re-run to completion, ~75 hits read line by line. **The sweep's real yield was two NEW fabrication routes (O-66, O-67), both closed today** |
| 2026-08-29 | **`e415c6b`'s curl fallback — did it ever work on a runner?** | **ANSWERED, NEGATIVE.** 08-28 13:19: interstitial at 12,156 bytes, curl refused at 12,176, gave up after 4 attempts in 37s. **Both clients refused → blocked egress, not a TLS fingerprint.** Risk escalates to O-27 |
| 2026-08-29 | **`/api/v1/liquidity` published a days-to-sell estimate for a sale nobody observed, and `/api/v1/passport` a health score ~70% invented constants** | `9f610fe`. Fields REMOVED with `not_published` reasons |
| 2026-08-29 | **~15 surfaces still sold Spain's Golden Visa as a live property route** | `dc5365d` + `4c34e9b`. Abolished 2025-04-03 by Organic Law 1/2025. Corrected in place rather than deleted |
| 2026-08-28 | **Did the 14:30 watchdog schedule fire, and stay quiet on a healthy day?** | **BOTH VERIFIED.** **The alarm's firing path is still unproven live** |
| 2026-08-27 | **A nightly that never ran was indistinguishable from one still in flight** | `12df144`. Watchdog deliberately on Vercel's scheduler, the one that did NOT fail |
| 2026-08-26 | **`/api/v1/carbon` published an invented CO2 table, a four-constant ESG score and a phantom 2027 EU rule** | `b9bf525`. **EPC normalisation extracted to `src/lib/epc.ts`** |
| 2026-08-26 | **Weekly search scan — nothing material** | FAQ rich results deprecated 2026-05-07. **Avena has ZERO exposure** |
| 2026-08-25 | **O-16 — "ClaudeBot has barely returned"** | RESOLVED BY OBSERVATION. 7 hits → 2,098 hits / 1,706 distinct property pages on 08-24 |
| 2026-08-25 | **`/api/v1/compliance` published an abolished visa programme, an invented EU rule and two literal scores** | `03f57ef` |
| 2026-08-24 | **`/api/v1/tax` published a fabricated 7%/yr appreciation forecast and a 5.5% default yield** | `fde7883` |
| 2026-08-24 | **`invoked_by` — which signal identifies a scheduled run?** | `vercel-cron-ua` (User-Agent), NOT the header. Follow-up O-57 |
| 2026-08-24 | **A run could record its own failures and still log `success`** | `71e19d6`. Known gaps O-56 (numeric `error_count`) — and `ok:false`, closed today |
| 2026-08-23 | **`/api/detect-events` — dead since 2026-04-11, a fabrication waiting to happen** | `95b90eb` |
| 2026-08-23 | **`generate-briefs` swallowed every failure into `success:true`** | `71e19d6`. The 06-15 stop date still unexplained — O-50 stays open |
| 2026-08-23 | **`b24cffa` — `/api/market-events` served a 133-day-frozen feed undated** | `stale_days 133` → `stale_days 0` |
| 2026-08-22 | **O-48 — 24 of 64 scheduled crons wrote nothing to `cron_logs`** | `b4cc217` — coverage 64/64, enforced by `scripts/test-cron-coverage.ts` |
| 2026-08-22 | **O-46 — dead cron or blind one?** | Probe returned `skipped: GITHUB_DATA_TOKEN not set`. Runs and deliberately does nothing |
| 2026-08-22 | **`score_history` dated every observation one day late** | `ab1f778`. History not rewritten → one-day seam |
| 2026-08-21 | **`/api/v1/arbitrage` published a confidence score built on `Math.random()`** | `be4a736` — fields removed, not replaced. **The precedent this repo now follows for fabricated fields** |
| 2026-08-21 | **The citation agent's resumability fix passed its real test** | `b090f52` — no hung rows. **And it is why today's `ok:false` fix needed an allow-list** |
| 2026-08-20 | **The published corpus asserted relisted units had been absorbed** | `530c5ed` — discloses `relisted_on` + `still_listed`; `schema_version:2` |
| 2026-08-20 | **O-28 — "the corpus mirror is unautomated and permanently diverged"** | NOT A DEFECT. Measurement artifact + four-day false blocker |
| 2026-08-20 | **`open-dataset-io.fetchAll` would have silently truncated the corpus ~2026-11-11** | `530c5ed` — now throws on `MAX_PAGES` |
| 2026-08-19 | **The citation engine lost a whole measurement day to a timeout** | `b090f52` — resumable, stops at 210s |
| 2026-08-19 | **`counterpart-discover` and `eu-stats-ingest` diagnosed after 86/92 blind failures** | `e890daa`. Tracked under O-41 |
| 2026-08-18 | **`/api/intelligence/regime` published "Spain GDP: 3335689.7 %"** | `061a57c` — `ilike` matched Euro Area GDP in chained millions |
| 2026-08-18 | **The `causal_indicators` fallback had never once worked** | `061a57c` — wrong column names |
| 2026-08-18 | **`live` meant "a query returned a row", not "the source is current"** | `061a57c` — every indicator carries `as_of`/`age_days`/`stale` |
| 2026-08-18 | **`precursor-scan` published LLM-invented market signals** | Cron removed from `vercel.json`. Do not re-enable; do not top up for it |
| 2026-08-17 | **`/api/snapshot-archive` would have archived only the first 1,900 of the book** | `b730a1d` |
| 2026-08-17 | **`sync-macro` stored NULL for Spain unemployment while the real figure sat one row above** | `582de5b` — Eurostat publishes the period LABEL before the observation |
| 2026-08-16 | **`/api/v1/apci` published a composite index with 40% of its weight fabricated** | `f00086d` — verified live: 65, GROWTH, 95% measured |
| 2026-08-16 | **`/api/snapshot-archive` ran daily into an empty table for months** | `f00086d` — six nonexistent columns, every upsert 400, hidden by `if (!error)` |
| 2026-08-16 | **`/api/v1/digital-twin` published a hardcoded APCI and random numbers** | `f00086d` |
| 2026-08-15 | **`/api/v1/snippet-answers` published five false market facts** | `e6bb569` — "Estepona is on the Costa Blanca" |
| 2026-08-15 | **market-clock and microstructure derived published verdicts from default constants** | `a2bf7d2` |
| 2026-08-14 | **published change-answers claimed 101 price moves inside a 1-day window** | `9c387fd` — unpaginated select hitting the 1000-row cap |
| 2026-08-14 | the feed retry loop spent 120 minutes on a challenge it could never pass | `e415c6b` |
| 2026-08-13 | a short feed body was logged only as a byte count | `714b9ab` — cracked O-27 the next morning |
| 2026-08-13 | `/api/v1/crawler-report` published `estimated_weeks_to_dominance: 152` | `63f405b` |
| 2026-08-12 | a 62%-coverage citation run published as a comparable data point | `24db855` |
| 2026-08-11 | move diff compared today's price against itself | `7478108` |
| 2026-08-10 | pricing-history banked yesterday's book as today's snapshot | `1f0a130` |
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — **held again under real fire 08-31** |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |

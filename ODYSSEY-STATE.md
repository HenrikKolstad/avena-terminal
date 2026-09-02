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
| 2026-09-02 | `0392175` **18 crons could not report a failure — the status was a literal.** THE NEGATIVE HALF FIRST | **TOMORROW 09-03, and this is the half that can refute me:** `select agent_id, status, count(*) from cron_logs where started_at >= '2026-09-03' and agent_id in (the 18) group by 1,2`. **Every agent that was healthy yesterday must still log `success`.** The 7-day replay predicted 167 of 175 rows unchanged; if a healthy agent has gone red I have shipped a false-alarm generator and it is reverted the same day. Named risks: `eu-rescore` (6×/day), `eu-ingestion` (4×/day), `prometheus` (3×/day) — highest volume, so a false alarm shows there first | **PENDING — Thu 09-03** |
| 2026-09-02 | `0392175` **the positive half — does atlas finally log `error`?** | **Fri 09-04 is the next atlas run day** (Mon/Wed/Fri). If the Perplexity balance is still out, all three invocations return `ok:false, status:'measurement_failed'` and **all three must log `status='error'`**. `select status, output_summary->>'status' from cron_logs where agent_id='atlas' and started_at >= '2026-09-04'`. **`success` on a `measurement_failed` row means the fix is STILL unreachable and I have now missed it twice.** If the balance is topped up before then, atlas returns `complete`/`already_complete` and this read-out is postponed, not passed | **PENDING — Fri 09-04** |
| 2026-09-02 | `0392175` **the structural guard** | Already verified in both directions BEFORE pushing, which is the only reason it counts: reintroducing `finishCronLog(handle, 'success', {` in `argus` made `test-cron-coverage.ts` fail **and name the file**; restoring it passed. 99 tests, was 88 | **VERIFIED → CLOSED** |
| 2026-09-01 | `908be3a` **cassandra separates "not asked" from "asked and failed"** | **VERIFIED on the pre-registered discriminator, exactly as written.** 09-02 04:15:26: `2026-09-01 → no_run_scheduled` (Tue, not a run day) **stayed OUT of `failures`** — the negative half, and the only observation that could have refuted it; `2026-09-02 → raw_rows_absent_on_a_run_day` (Wed, Atlas ran, 74/74 401) **is in `failures`** and the run logged `error`. Red for the right reason | **VERIFIED → CLOSED** |
| 2026-09-01 | `908be3a` **`snapshot_superseded` on pricing-history** | **Second consecutive correct negative:** `snapshot_superseded: 0, refs: null` on a clean single-book day (09-02, feed 2033/snapshotted 2033, overlap 0.995). Still no natural positive. **Keep reading this field in daily sense 3 — the first non-zero is the real read-out** | **NEGATIVE VERIFIED ×2; positive pending a natural occurrence** |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-62 | **Absorption ledger delisting dates — RE-DERIVED TODAY AND IT GOT WORSE BY 11 IN ONE DAY.** **107 tombstones: 32 correct · 66 one day LATE · 9 stamped behind.** Yesterday it was 55 late; today's 11 departures (N8634, N8743, N9030, N9552, N9652, N9772, N9773, N9895, N9959, SP1467, and relist-then-left N7870) were **every one stamped `last_seen_date` 2026-09-02 when they were last actually in the book on 09-01** | direct SQL 09-02: `max(snapshot_date)` per ref vs `sold_properties.last_seen_date` | **The error rate is now 62% and it grows by roughly the daily delisting count.** Mechanism confirmed again: `parse-feed.js` (the second writer, O-20) stamps the day it NOTICED. **Branch `odyssey/absorption-ledger-dates` has been waiting 17 days. Plan B Release 1's window closes 09-04 — TWO DAYS — and Release 1 quotes delistings by day** | **HIGHEST of the open items** |
| O-74 | **The same-day union repair — reported, not fixed.** `price_snapshots`/`score_history` key on (ref, date) by upsert, so a second capture the same UTC day overwrites prices for refs it sees and leaves the rest behind | git blobs: N8058 699,900 (05:37 book) vs 709,900 (11:32 book) on 08-31 | `908be3a` makes it VISIBLE, not repaired. The repair is a DELETE against the moat's ground truth and needs the `MIN_FEED_OVERLAP` gate → **branch, per the standing rule on cron writes that mass-mutate.** Harm is SMALL: every row is individually defensible. **No new union since; 09-01 and 09-02 were both single-book** | medium |
| O-61 | **GitHub's scheduler is degraded, DAY 7.** Today's capture was hand-dispatched again (run 46, `workflow_dispatch`, 05:37:06, success, 2,033 listings). **09-01 eventually produced TWO scheduled runs (06:43, 09:59) and — new and good — BOTH left `data.json` byte-identical to my 05:37 dispatch**, touching only `feed-meta.json`/`model-stats.json`. So 09-01 was NOT a union day | `actions_list` 05:36 today; `git show --stat f3a4b46 253cd93` | **Per the standing correction I do NOT call today's absence — nothing has landed before 07:00 since 08-26 and any pre-11:00 reading is worthless as evidence of absence.** Fix unchanged: `repository_dispatch` from a Vercel cron; Vercel's scheduler has been exact all seven nights. Blocked on `GITHUB_DATA_TOKEN`. **No day lost: 08-27..09-02, all seven by my hand** | **HIGH — day 7** |
| O-27 | **RedSP is challenging GitHub Actions egress, and the curl fallback does NOT get through it** | run 34 job log, quoted in `4fae319` | Not re-exercised since 08-28 — runs 35–46 all served normally. ~12 observations, still not a proven property of RedSP's guard. Durable fix needs Henrik | **HIGH — escalated** |
| O-70 | **`/about/methodology` lists four data sources Avena may not ingest at all** — **INE**, **Registradores de España**, **Idealista / Fotocasa**, **Banco de España** | grep 08-31; no ingest code found outside competitor-name lists in the citation engine | **I have NOT established these are false — only that I could find no ingest path.** Same class as O-58. **The five-second check I keep re-learning: for every published capability, grep for the production CALLER** | **HIGH — credibility** |
| O-58 | **The "SHAP explainability" claim is false and it is on BUYER-FACING pages.** `/api/v1/explainable-avm` computes hand-set rule weights, not Shapley values. ~30 files | route read 08-25 | **Escalated to NEEDS HENRIK, day 8.** Do not rewrite those pages unilaterally | **high — escalated** |
| O-56 | **`prometheus` reports `error_count: 7` on every run and still logs `success`.** 3×/day, 28 rows in 7 days | `cron_logs` 09-02 | **MY EARLIER DIAGNOSIS WAS WRONG TWICE — corrected today.** I blamed `deriveCronStatus` for not recognising numeric fields. In fact prometheus **never reached `deriveCronStatus` at all** (it hardcoded `'success'`), and even now that `0392175` routes it through the shared derivation, `error_count: 7` is a bare number and **still** not a marker. **Fix prometheus to emit `errors[]`; do NOT teach the derivation to guess at numeric fields** | medium |
| O-75 | **NEW — `/api/v1/parasite/status` turns a failed Supabase read into `posts_this_month: 0` and every platform `status: 'planned'`** | route read 09-02, line 42 `catch { /* empty counts */ }` | **Currently harmless because it happens to be TRUE: `auto_posts` holds 0 rows, ever.** But a broken query is indistinguishable from a dormant system, and this is a published `/api/v1` surface. Textbook recurring shape. Fold into the O-26 sweep | low-medium |
| O-50 | **Dead/silent crons — the 2026-06-15 stop date is STILL UNEXPLAINED.** `intelligence_briefs`/`weekly_alpha`/`digest_issues` all stopped 06-15, ~57 days before the Anthropic exhaustion | table max dates | Credit exhaustion explains 08-11 onward, not 06-15. **Two causes; only the second found** | **HIGH** |
| O-53 | **`/api/cron/auto-post` fails on all three daily runs with "Unexpected end of JSON input"** | `cron_logs`; **`auto_posts` = 0 rows ever, confirmed 09-02** | Not diagnosed. **Now known to have produced literally nothing in the table's whole history.** May be wired to one of Henrik's buttons — **do not touch its auth/behaviour before that is answered**; diagnosing the JSON error is safe and separate | medium |
| O-54 | **`causal-update` reports `indicators_touched: 20` while `causal_indicators.last_updated` has not moved since 2026-05-23** | 20 rows, one distinct `last_updated` | The freshness bump is not landing — so O-40's fabricated-freshness danger is currently inert | medium |
| O-51 | **`/api/cron/pulse` and `/api/cron/auto-post` have no authentication at all** | read 08-22 | **Ask before tightening auto-post; pulse can likely just be done** | medium — ask first |
| O-49 | **`citation-agent` reports `lookups_failed` for questions it deliberately deferred** | 08-21: `lookups_failed:22` alongside `stopped_on_budget:true` | Small: split `deferred` from `failed`. Same family as `0392175`, one level down | medium |
| O-45 | **CORRECTED 2026-08-29** — `sold_properties.last_seen_date` IS updated when a tombstoned unit returns and leaves again | direct SQL; **live instance today: N7870, tombstoned 08-19, relisted, left again, `last_seen_date` moved to 09-02** | Confirms the mechanism. The one-day offset (O-62) is the real defect and it applies to relists too | medium |
| O-44 | **`/api/sync-snapshots` writes columns that do not exist, and discards every write result** | route read 08-19 | Dead-and-broken rather than harmful. Confirm it writes nothing, then remove it + its browser caller | medium |
| O-40 | **`causal-update` would stamp 92-day-old values as fresh if its bump ever landed** | `runCausalUpdate()` sets `last_updated=now()` on every row | **DO NOT "fix" by reviving the bump** — nine indicators would flip from honest `stale:true` to fabricated `live:true`. Mass-mutates 20 rows → branch | **high** |
| O-34 | **Nine indicators have no live source at all** | `age_days` **102** today | Honestly labelled stale → a coverage gap, not a credibility bug | high |
| O-41 | **Two chronically-failing crons, diagnosed but unfixed.** `counterpart-discover` `status error`. `eu-stats-ingest` `errors: 2 of 20`, 4,337 rows still upserted | `cron_logs` 09-02 | counterpart-discover is a real fixable bug in OUR code, but it queries `properties_registry` (frozen 05-24) so fixing the column alone mines a dead snapshot. eu-stats-ingest is upstream and degrades per-source as it should. Neither feeds `price_snapshots`/`sold_properties` | high — actionable |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants. 18 audited to date, 18 defective** | route reads to 08-31; **O-75 found today makes 19 read, 19 defective** | Greps that keep paying: **`.ilike(` on an indicator key**, **`?? <number>` on a published field**, **`X \|\| 'DEFAULT'` on a categorical**, **any second copy of a centralised helper**, **a top-level `const` array carrying `authority`/`source`/`date`**, and now **`catch {}` around the only query that populates a published count**. 158 route files, 14 carrying `cite_as` | **high — highest hit rate of anything I have** |
| O-52 | **`/track-record` promises a prediction that cannot arrive** | `predictions` table: 0 rows ever | Cause = Anthropic balance, not code. Raised under NEEDS HENRIK | high — escalated |
| O-42 | **`genesis/run` discards its write results and marks the scenario complete regardless** | `route.ts:273-274` | Recurring shape in a scenario simulator | medium |
| O-47 | **`dvf-ingest`'s FK failures still drop rows silently** — 502 fetched, 309 inserted, a 193-row gap reported as no errors | `cron_logs` | **Half-improved today: as of `0392175` a non-empty `errors[]` now turns the RUN red** (2 such rows in the last 7 days: 08-27, 08-29). **The GAP itself is still not surfaced when `errors[]` is empty.** Fold into the same pass as O-1 | medium |
| O-39 | **All 90 legacy `market_snapshots` rows have a NULL `snapshot_date`** | queried 08-17 | Harmless to reads. Decide: backfill from `computed_at`, or leave | medium |
| O-35 | **2026-05-23/24 is a cluster date; 2026-06-15 is a second (O-50)** | queried 08-16..08-22 | `properties_registry` 05-24 still unexplained. 06-15 is the more urgent | medium |
| O-36 | **`snapshot-archive` computes five market-summary figures it cannot store** | `f00086d`; schema read 08-16 | Additive/allowed. Decide alongside O-37 | medium |
| O-37 | **Nothing writes `market_snapshots.apci`, so APCI `week_change` can never populate** | schema 08-16 | An honest null beats the 85-day delta it replaced | medium |
| O-30 | **Unbacked qualitative claims in snippet-answers** | read 08-15 | Golden-visa half resolved. What remains is unverifiable prose: "most popular region for foreign buyers", NIE/mortgage figures | medium |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books | proven by diffing data.json blobs | Superseded in its live form by O-74. Source of 5 of the 9 "stamped behind" tombstones (O-62) | high |
| O-6 | `/compare` dominates our search surface | `gsc_pages`; **re-derived 09-02: 295 of 520 distinct pages = 57% of everything with an impression** | CompareLedgerPulse (verified 08-15) put the moat on it. Read out 2026-09-14 | high |
| O-14 | **AwarioBot's distinct property pages frozen at exactly 1,988 for a third 7-day window** while it burned 8,559 hits | `crawler_hits`, re-derived 09-01 | Re-fetching a fixed, stale URL set and discovering nothing. A full `Disallow` is the obvious next move. Costs compute, not correctness | medium |
| O-13 | **PerplexityBot is not in the top 14 crawlers over the last 7 days** | `crawler_hits` 09-01 | An observation over one window, not a property. **A crawler-absence finding decays fast — do not repeat without re-deriving** | medium |
| O-15 | **Vercel Analytics figures are mostly machines** | crawler ledger | **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in: `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281` | real instances of the recurring shape | `scribe`, six in `b4cc217`, `generate-briefs`, `detect-events`, `dvf-ingest`, `integrity.ts` all handled. These three remain | high |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`** | `parse-feed.js:962,1003` | **Confirmed load-bearing again today: parse-feed wrote all 11 of today's tombstones; the route reported `delisted: 0`.** Always reconcile new tombstones against `sold_properties`, NEVER the route's `delisted` field | **high — demonstrated daily** |
| O-10 | `citation_measurements` still holds fabricated-zero rows (08-02..08-06) + two 0-question rows | table read | Never delete. Excluded from every published surface by `loadMeasurements` | medium |
| O-5 | Pre-transliteration accent slugs are indexed. **RE-DERIVED AND LARGELY REFUTED TODAY** | `gsc_pages` 08-07..08-30, case-insensitive on both literal accents and percent-encoding | **The real number is 8 pages, not 186 — off by ~23×.** 0 literal-accent URLs, 8 percent-encoded. 308 shims confirmed working. **Downgraded high → low: this is a marginal issue and I spent weeks treating it as a major one** | **low (was high)** |
| O-59 | **The frontier sitemap is diluted: 3-week-old changes alongside today's. 120 property URLs today** (was 117, 116, 118, 121, 122, 127, 134) | read live 09-02 | Honest and its `lastmod` values are true — a design judgement, not a defect. Next SEO experiment candidate, blocked until **09-25** | medium |
| O-72 | **`integrity-roll` reports the empty-string SHA-256 as `merkle_root` on a same-day re-run** | `cron_logs` 08-30 | Cosmetic — no false claim is published. But it writes **this project's single most recognisable tell** into a `success` row for no reason. Should report the EXISTING root with `inserted: false` | low |
| O-57 | **The rejected-scheduled-run alarm can never fire.** `withCronLog` writes `auth_rejected_platform_run` only when `x-vercel-cron==='1'`, but the real scheduler is identified by User-Agent | resolved 08-24 | Small, well-scoped. Not urgent — every cron currently logs | medium |
| O-2 | `<html lang="en">` on the three `/no` pages while serving Norwegian | verified 08-09 | per-route fix needs route-group root layouts (huge diff) or a dynamic root layout (kills static gen). hreflang already correct | low |
| O-63 | **`src/app/memo/page.tsx:80` cites Portuguese Golden Visa eligibility on a `SAMPLE-PORTUGAL` row** | grep 08-29 | Demo content, explicitly labelled SAMPLE, on a market Avena holds no data for. Fix when that page is next touched | low |
| O-29 | **Lightpanda stopped as abruptly as it started.** Nothing since 08-14 | crawler ledger | Keep watching | low |
| O-4 | Zenodo deposit frozen at 2026-04-11 | `zenodo.org/api/records/19520064` | deliberately saved for a quarterly citable version. **Also why the /verify Zenodo claim cannot be made true — see BLOCKED** | deliberate |

## 3. EXPERIMENTS — changes with a read-out date

Search Console connected 2026-08-09 (`gsc_daily`, `gsc_pages`). Rules: one
meaningful change at a time, a read-out DATE fixed in advance, the result
recorded honestly — "no detectable effect" is a real finding.

**GSC REFRESHED TODAY: `gsc_daily` and `gsc_pages` max date moved 08-17 →
2026-08-30**, and `gsc_pages` went 287 → **520 distinct pages**. Three weeks of
post-change data arrived at once. This is the first read-out with real
after-data in it.

**Weekly baseline, RE-DERIVED today from `gsc_daily` back to May** (the old
"430–660" was close but understated the top): **13 complete pre-change weeks
run 427–758 impressions, mean 552, with one 1,591 outlier the week of 05-11.
Twelve of the thirteen are ≤ 665.** Clicks 1–10, mean ~6.

| started | hypothesis | change | metric | read-out | result |
|---|---|---|---|---|---|
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the pre-change band | **2026-09-02 — READ OUT TODAY** | **POSITIVE ON THE METRIC; ATTRIBUTION FAILS, AND THAT IS MY FAULT.** Post-change weeks: **697 (08-10), 997 (08-17), 884 (08-24)** — all three above 12 of the 13 pre-change weeks, mean **859 vs 552 (+56%)**. The lift is real and outside the noise band. **But I cannot attribute it to the canonical change**, because I shipped ~6 more SEO changes into the same window (statistics hub, TownLedgerPulse, IndexNow, sitemap-frontier 08-11/08-12; CompareLedgerPulse 08-14) before this read-out came due. One change at a time was the rule and I broke it. **Clicks did NOT move: 4, 11, 5 vs a pre-mean of 6.** Spam-update confound 08-18..08-21 sits inside weeks 2 and 3 — but week 1 (08-10, 697) precedes it and is already above band. **Recorded as: the site's impression surface grew materially in August; which change did it is unknown and now unknowable** |
| 2026-08-05 | (sub-hypothesis) the PAGE-LEVEL half — did sub-pages actually re-index? | same | distinct pages with ≥1 impression | **2026-09-02 — READ OUT** | **UNMEASURABLE. NO PRE-CHANGE BASELINE — the identical failure as the 08-25 robots.txt read-out, on a different metric.** `gsc_pages` capture begins **2026-08-07**, two days AFTER the change. Post-change weeks read 241 / 285 / 221 distinct pages, but there is nothing to compare them to. **The 08-25 correction told me to confirm a baseline exists before dating an experiment; I dated this one anyway** |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers | distinct properties fetched per crawler per pass | **2026-08-25 — READ OUT** | **UNMEASURABLE AS DESIGNED.** `crawler_hits` begins 2026-08-11 11:46 — the same day as the change, so no pre-change baseline exists. Recorded as a design failure, not a null result. Partial: **AwarioBot frozen at exactly 1,988 in a third window (09-01). No crawler expanded its distinct-page reach.** Feeds O-14 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) | 2026-09-08 | pending — **nine complete runs, still no detectable trend. AT RISK: no measurable run since 08-28; the engine 401'd again today.** If the balance is not topped up, record as **UNMEASURABLE**, never as null |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | **2026-08-25 — READ OUT** | **POSITIVE, MODEST, NOT SIGNIFICANCE-TESTED.** 105 moved refs vs 525 unchanged. Search/AI crawlers: median **79.4h moved vs 92.3h unchanged**. Coverage 97.1% vs 92.0%. ~14% faster; n small, no significance test — **do not quote as proven**. Re-read 2026-09-25 |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 | pending — same Perplexity risk |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 | pending — needs distribution: not listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate; citations of town pages | 2026-09-09 | pending — same Perplexity risk |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" + GSC impressions | 2026-09-23 | pending — **now confounded with the 08-05 read-out above; it is one of the six changes that muddied it** |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 | pending — **interim: OAI-SearchBot 221 hits / 130 paths over 7 days, ChatGPT-User 242/42. Treatment badly irregular — off-cadence most nights since 08-27. Do not treat it as a uniform daily treatment at read-out** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | **2026-08-26 — READ OUT** | **SPLIT: the file is fetched, but it does NOT steer the crawlers that matter.** Discovery YES (ClaudeBot 65 fetches). **Causal attribution FAILS** — GPTBot and PerplexityBot both fetched it one day BEFORE the announcement. Budget steering **NO**: null expectation **3.06%**; observed Googlebot 2.94%, ClaudeBot 2.89%, bingbot 1.65%, GPTBot 1.11% — all at or below chance. Filed O-59 |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 | pending — render verified live 08-15. **Supporting figure re-derived today: /compare is 295 of 520 distinct pages (57%) in ordinary organic `gsc_pages`** |

**No new experiment today — SEVENTH consecutive day**, and today the reason
finally changed. It is no longer only that pipeline work crowds it out: **the
08-05 read-out showed that my experiment DISCIPLINE, not my experiment supply,
is the binding constraint.** Two read-outs came due today and BOTH failed on
design rather than on data — one had no pre-change baseline, the other had six
co-shipped changes inside its window. **Starting another experiment before
fixing that would produce another unreadable result.** O-59 (narrowing the
frontier window) remains the next candidate and stays blocked until **09-25**,
by which point nothing else may ship into its metric.

**THE RISK TO THE EXPERIMENT LEDGER IS ACUTE, DAY 3.** Perplexity has been out
since 08-31 and 401'd again today on 74 of 74 lookups. **Four pending read-outs
(09-08 ×2, 09-09 ×2) are measured by an engine that has measured nothing since
08-28.** If the balance is not topped up they are recorded **UNMEASURABLE**,
never "no detectable effect". Conflating them would be the exact failure the
08-25 correction is about.

**Next read-outs: 09-08 (×2), 09-09 (×3), 09-14, 09-23, 09-25.** Do them on the
day; a read-out postponed is an experiment abandoned.

**Weekly search scan: done 2026-09-02 — see below. Next due 2026-09-09.**

**CONFOUND — the August 2026 spam update, CLOSED and dated.** 09:27 US/Pacific
2026-08-18, duration 2d16h → complete ~08-21. Global, all languages; SpamBrain
enforcement of EXISTING policies. Avena has no exposure. The window sits inside
the 09-02 and 09-23 read-outs. Record it; do not attribute.

**Confound to remember:** `f00086d` changed the published APCI from 58 to 65
(`/api/v1/apci`, `/api/v1/digital-twin`, both AI-facing).

### Weekly search scan, 2026-09-02

- **Site Reputation Policy update, effective 2026-08-30** (Search Central).
  Manual actions under the site-reputation policy now apply differently inside
  and outside the EEA, after discussion with the European Commission.
  **Checked against Avena and it is NOT material.** The policy targets a HOST
  site letting third parties publish on its domain to borrow its ranking
  signals. Avena hosts no third-party content. `content/parasite/` (5 drafts)
  and `/api/v1/parasite/status` are Avena syndicating its OWN content under its
  OWN handles to Medium/Substack/LinkedIn — ordinary syndication, a different
  thing despite the unfortunate directory name. **`auto_posts` holds 0 rows
  ever, so nothing has been syndicated at all** (see O-53, O-75).
- **2026-09-01: Google added examples on writing better meta descriptions.**
  Guidance, not a policy change. Meta descriptions are mine to edit, but I am
  **not** opening a rewrite pass on a nudge — that is manufacturing work, and
  it would land inside O-59's read-out window.
- FAQ rich results (deprecated 2026-05-07): Avena's zero exposure re-confirmed.
- **Nothing else material.**

## 3b. PLAN B — press detonation calendar (Henrik's "B GO")

The press room is the landing surface; the releases are the detonations. The
genuine daily series started 2026-08-05. Drafts with named data slots live in
`~/Desktop/PLAN-B-RELEASES.md`. Nothing fires without Henrik's explicit go.

| when | what | gate |
|---|---|---|
| 2026-08-13 | Press room truth-repaired (`4e9f96d`) | done |
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | **TWO DAYS.** Gate: **O-62 must be resolved first — 66 of 107 delisting dates are now wrong (62%), up from 55 yesterday.** Any delisting figure must be `delistings_currently_absent`, never the gross count (**107**). **Do NOT source any Release 1 figure from `score_history` or `property_pricing_history`.** **Provenance note that MUST appear: 2026-08-27 through 2026-09-02 — SEVEN consecutive days — were captured by manual dispatch at ~05:37 UTC because the scheduled nightly did not land on time. All seven ARE captured and complete. 08-28's scheduled run landed at 13:19 and FAILED outright on the feed origin's bot challenge, capturing nothing. 2026-08-31 is a UNION DAY (O-74): its stored 2,044 refs mix the 05:37 book's membership with the 11:32 book's prices; the true final book that day was 2,042. Do not quote 08-31's listing count.** |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | Henrik's explicit go |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.51%** (in-sample, n=**2,043**). Gate run reproduced the committed file exactly apart from `computed_at`, reverted as churn (fourth day running) | 2026-09-02 | `public/model-stats.json` |
| Live book | **2,033 listings** (was 2,043), blob `f66653a6` | 2026-09-02 | `public/data.json`, feed commit `8f642dc` 05:37:43 (**manual dispatch, run 46, 7th day running**) |
| Sitemap | **2,695 `<loc>`**, valid XML, 5 sampled property URLs all 200 | 2026-09-02 | `/sitemap.xml`, parsed |
| Frontier sitemap | **120 property URLs** (was 117, 116, 118, 121, 122, 127, 134) (O-59) | 2026-09-02 | `/sitemap-frontier.xml`, parsed |
| Corpus version | site **v2026-09-02** (= today ✓) · `avena-data` mirror at **v2026-09-01** (its normal lag) · HF unverified (401 without a token) | 2026-09-02 | site + mirror raw |
| **How to read the mirror correctly** | avena-data's `daily-snapshot.yml` runs **07:15 UTC**; I run at **~05:40 UTC**. So the mirror ALWAYS shows yesterday's version when I look. **Compare after 08:00 UTC, or the mirror against the site's PREVIOUS day. Do not re-open this as divergence.** **Eight consecutive correct predictions** | 2026-09-02 | avena-data raw `market/dataset.json` |
| **INTEGRITY LOG** | `integrity-roll` unattended 09-01 03:30: `count 3, inserted true, root_date 2026-09-01, merkle_root b05d8da9847527f3…`, `errors []`. Real root, not the empty-string tell. **Zenodo deposits: 0, and there is no code that makes one** | 2026-09-01 | `cron_logs` |
| **Real price moves by day** | 15 (08-14), 4, 1, 0, 15, 10, 10, 18 (08-21), 9, 0, 0, 3, 6, 5, 6 (08-28), 6, 0 (08-30), 1 (08-31), **7 (09-01, CORRECTED from 6)**, **12 (09-02)** | 2026-09-02 | `price_snapshots`, direct SQL diff |
| **CORRECTION to yesterday's baseline** | I recorded **6** moves on 09-01. Re-read today it is **7**. Unlike the 08-31 correction this is NOT a two-book problem — 09-01's book was byte-identical across all three runs. **The likeliest cause is that I measured while the 09-01 snapshot was still being written, and I am stating that as a hypothesis, not a finding.** The standing rule holds either way: **a same-day move count is provisional; re-read the previous day's every morning** | 2026-09-02 | direct SQL |
| Snapshot rows by day | 2,041 (08-27), 2,047, 2,042, 2,044 (08-30), **2,044 (08-31 — UNION, true final book 2,042, O-74)**, 2,043 (09-01), **2,033 (09-02)** | 2026-09-02 | `price_snapshots` |
| Today's capture | feed 2,033 · snapshotted 2,033 · moves_detected 12 · route `delisted: 0` but **11 real tombstones by parse-feed** · **snapshot_superseded 0** · prior 09-01, age 1d, trusted · overlap **0.995** · errors null | 2026-09-02 | `/api/cron/pricing-history` |
| Delistings | **11 new tombstones today, ALL stamped `last_seen_date` 09-02 when last truly seen 09-01 — all 11 wrong.** Cumulative **107: 32 correct · 66 one day late · 9 stamped behind** | 2026-09-02 | `sold_properties`, re-derived |
| **NIGHTLY RELIABILITY** | feed-refresh scheduled landings: **02:35–02:50 for twelve nights (08-15..08-26); 11:57 (08-27); 13:19 (08-28, FAILURE); 08:15 (08-29); 07:17 AND 10:27 (08-30); 07:32 AND 11:32 (08-31); 06:43 AND 09:59 (09-01); NONE by 05:36 (09-02, too early to call).** **Seven mornings degraded. Vercel's scheduler unaffected throughout** | 2026-09-02 | `actions_list` |
| Build health | **Run 46 (dispatch, 09-02 05:37) success**, book committed `8f642dc`. No open PRs. **One push to main today** (`0392175`); all four gates green before it. No red checks on any branch | 2026-09-02 | `actions_list` |
| **SEARCH — GSC refreshed today** | `gsc_daily` and `gsc_pages` max date **2026-08-30** (was 08-17). **520 distinct pages** (was 287) over 08-07..08-30 | 2026-09-02 | `gsc_daily`, `gsc_pages` |
| **Weekly impressions — pre/post the 08-05 change** | pre (13 complete weeks, May–Aug): **427–758, mean 552**, one 1,591 outlier (wk 05-11). post: **697, 997, 884** (wks 08-10/08-17/08-24), mean **859**. Clicks flat: pre mean ~6, post 4/11/5 | 2026-09-02 | `gsc_daily` |
| **O-33 RESOLVED — the disputed baseline, re-derived** | Old unsourced figures were "492 indexed / 293 /compare / 186 accent". Real, over 08-07..08-30: **520 distinct pages · 295 /compare (57%) · 8 accent-or-percent-encoded.** The first two reproduce; **the accent figure was wrong by ~23×** | 2026-09-02 | `gsc_pages`, case-insensitive on both forms |
| **Crawl-budget null expectation** | **3.06%** — the share of the live book with a real price move in the prior 7 days. **Any claim that a crawler "targets changed pages" must beat this** | 2026-08-26 | `price_snapshots` × `crawler_hits` |
| **Cron logging coverage** | **64/64 scheduled crons write to `cron_logs`**. **As of `0392175`, 0 of them hardcode their own status** (was 18 routes / 22 call sites). `invoked_by` on real scheduled runs = **`vercel-cron-ua`** (User-Agent, not the header) | 2026-09-02 | `0392175`, `b4cc217`, live rows |
| **Citation rate, organic (qb-v2) — THE baseline** | **4.41% (3/68) on 08-28 — still the latest.** Nine complete runs: 4.41 (08-10), 4.41, 2.94, 5.88, 8.82, 5.88, 7.35 (08-24), 7.35 (08-26), 4.41 (08-28). Mean **5.72%**, range 2.94–8.82. One hit = 1.47pp. **No detectable trend. Do not claim one** | 2026-08-28 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6)** on 08-28 and the five runs before it | 2026-08-28 | `citation_measurements` |
| **CITATION ENGINE — DARK SINCE 2026-08-31, DAY 3** | Wed 09-02 was a run day: all three atlas invocations `lookups_failed: 74, lookups_measured: 0`, `Perplexity HTTP 401 "You exceeded your current quota"`. **The `9171dce` guard HELD — no rows written, no fabricated 0.00%.** cassandra correctly logged `error` / `raw_rows_absent_on_a_run_day`. **Note `plab-run` reports `keys: {perplexity: true}` — that means the env var is SET, not that it has credit. Do not read it as a recovery** | 2026-09-02 | `cron_logs` |
| **AGENT-ID MAP — the citation engine does NOT log under "citation-agent"** | `/api/cron/citation-agent` logs as **`atlas`**; `/api/cron/citation-measure` logs as **`cassandra`**. Querying `agent_id ilike '%citation%'` returns ZERO rows and looks exactly like a dead engine | 2026-08-28 | `cron_logs` |
| Top competitor share (organic) | **idealista 93 · thinkspain 14 · aplaceinthesun 12 · fotocasa 6 · numbeo 5 · rightmove 3** | 2026-08-28 | `citation_measurements` |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **19 audited, 19 defective** | 2026-09-02 | `find src/app/api/v1 -name route.ts` |
| **Energy data in the book** | **16 listings carry the `'X'` placeholder**; zero nulls. `'X'` is a placeholder, not an EPC letter. Normalisation centralised in `src/lib/epc.ts` | 2026-08-29 | `public/data.json` via `toEpcLetter` |
| Test coverage added by Odyssey | `test-open-dataset` 27 · `test-scribe` 22 · **`test-cron-coverage` 99 (was 88)** · `test-integrity` 15 · `test-capture-integrity` 19 | 2026-09-02 | `0392175` |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08** (O-54) | 2026-08-24 | queried directly |
| APCI macro input age | **102 days** (`as_of` 2026-05-23) — climbing daily until O-34/O-40 resolved | 2026-09-02 | `/api/v1/apci` |
| Cron success rates (worst) | `counterpart-discover` failing daily · `eu-stats-ingest` `errors: 2` of 20, 4,337 rows still upserted · `auto-post` 3×/day (O-53) · `prometheus` `error_count: 7` (O-56) · `atlas` dark on the Perplexity balance · `sync-regulatory-signals`, `weekly-alpha`, `digest`, `generate-briefs`, `predictions/generate`, `pulse` all on the Anthropic balance | 2026-09-02 | `cron_logs` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 (GSC Generative AI export) | 2026-08-14 | `docs/gsc-genai/` |

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
distinguish the hypotheses, not against the whole population.**

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

**Correction, 2026-08-31 (kept — a REPEAT of the one above, which is the part
that matters):** I read out the 05:10 GitHub backstop as a negative and wrote
that into CLOSED. Both entries HAD fired; I looked at 05:55, before either
existed. **This is the identical error I had corrected three days earlier, on
the same workflow, having written the lesson down. Knowing a failure mode is not
the same as checking for it. Any observation of the GitHub scheduler taken
before ~11:00 UTC is currently worthless as evidence of absence.**

**Correction, 2026-08-31 (kept):** O-69 said `sync-regulatory-signals` "produces
nothing and says nothing — a pure instance of the recurring shape". **Wrong.**
Items are skipped before classification by dedupe and a keyword prefilter.
**I pattern-matched a zero to the recurring bug without reading the code that
produced it. The recurring bug is real and common here, which is exactly why it
makes a seductive default explanation.**

**Correction, 2026-08-31 (kept):** O-65 said `total_avena_mentions` "moved from
5 to 18 between readings". Wrong — I compared two different fields. The finding
was right; the embellishment was not. **A detail added to make a true finding
more damning is still a fabrication.**

**Correction, 2026-09-01 (kept):** `908be3a`'s body says N9819 and N9927 "were
tombstoned on 09-01". **The date is wrong** — both were written **2026-08-31 at
11:33:18** by `parse-feed.js`, the second writer (O-20). I checked `created_at`
only after pushing. The conclusion the sentence supports is unaffected. **A
commit message is permanent, so the five-second check belongs BEFORE the push.**

**Correction, 2026-09-01 (kept):** the O-7 line "cause fixed; 08-10..08-31 each
a single clean write" was **FALSE**, and I had been repeating it. **A fix closes
the mechanism it was written for, not the class. Before writing "this cannot
happen any more", name the assumption the fix relies on.**

**Correction, 2026-09-01 (kept):** I wrote in-session that the moat tables would
disagree about 08-31. **They agree — both hold 2,044.** I built a cross-table
inconsistency hypothesis out of one log line; the query took ten seconds and
refuted it.

**Correction, 2026-09-02 (NEW — the big one):** **`485fa15` did not work, and I
called it a fix for two days.** I added marker 4 to `deriveCronStatus` on 08-31
specifically so atlas could not report a Perplexity 401 as a green run. Today,
the pre-registered read-out day, atlas failed identically and logged `success`
again — because `/api/cron/citation-agent` never calls `deriveCronStatus` at
all. It passes the status as a LITERAL. **I fixed the derivation without ever
checking that the route I was fixing it FOR used the derivation.** This is the
08-30 lesson — *find the production CALLER, not the implementation* — which I
applied to other people's code all August and never to my own. Seventeen other
routes were the same. Fixed today in `0392175`. **The pre-registered read-out is
the only reason I know; without it I would have carried "citation failures now
log red" as a settled fact indefinitely.**

**Correction, 2026-09-02 (NEW):** O-56's diagnosis was wrong twice. I wrote that
`prometheus` slips through because `deriveCronStatus` "recognises `errors[]`, an
`error` string and `ok:false`, but `error_count: 7` is a bare number". Prometheus
**never reached `deriveCronStatus`** — it hardcoded `'success'`. The
numeric-field observation happens to remain true after `0392175`, so the item
stands, but the reasoning behind it was invented rather than traced.

**Correction, 2026-09-02 (NEW):** O-5's "186 accent slugs indexed" is
**refuted — the real number is 8**, re-derived from `gsc_pages` over
08-07..08-30 with a case-insensitive test for both literal accents (0) and
percent-encoding (8). I carried 186 as a `high`-priority item for weeks on a
figure O-33 had already flagged as unsourced. **When an item's own evidence line
says "unsourced", that is a reason to stop quoting it, not a footnote.**

**Lesson, 2026-08-26 (kept):** the frontier read-out only produced a real answer
because I computed a **null expectation** (3.06%) before interpreting the
observed shares. **Never report a targeting/concentration rate without the base
rate it must beat.**

**Lesson, 2026-08-27 (kept):** put the watchdog on a different scheduler than
the thing it watches. **Confirmed again 09-02 — seven nights, same split.**

**Lesson, 2026-08-27 (kept):** **a monitor that cannot distinguish "not yet"
from "never" is not a monitor.** When adding a guard, the question is not "does
it detect the bad state" but "does its output DIFFER between the good and bad
state".

**Lesson, 2026-08-28 (kept):** a threshold calibrated against "the worst thing
observed so far" has no margin, and the worst case will be beaten.

**Lesson, 2026-08-29 (kept):** a mitigation whose weakness you can already name
should ship with that weakness written into the commit.

**Lesson, 2026-08-29 (kept):** **a completeness check is not a completeness
check if it is piped through `head`. End it with `| cat` and read every line.**

**Lesson, 2026-08-30 (kept):** **a claim can be false without a single line of
code being wrong.** For every published capability, find the production CALLER,
not the implementation. **Violated by me, on my own code, today — see the 09-02
correction.**

**Lesson, 2026-08-30 (kept):** **the empty-string SHA-256 (`e3b0c442…b855`) is
this project's tell.** A hash of nothing is a zero. Recognise it on sight.

**Lesson, 2026-08-31 (kept):** **when a fabricated dataset is removed, every
distinctive string in it moves into the `not_published` prose that explains it —
so the grep that would have caught the bug now matches the fix.** Design the
verification at the same time as the removal.

**Lesson, 2026-09-01 (kept):** **a byte-identical artifact is not proof the
upstream is frozen, and it is not proof it is healthy either.** **Pre-register
the discriminator when you open the suspicion, not when you resolve it.**

**Lesson, 2026-09-01 (kept):** **operational workarounds have data costs, and
they compound.** The workaround for O-61 created O-74. **When a manual
mitigation runs for more than a few days, look for what it is quietly costing.**

**Lesson, 2026-09-02 (NEW):** **a guard that has only ever been observed passing
is not a guard.** Before shipping `0392175` I reintroduced the bad pattern into
`argus`, confirmed the suite went red AND named the file, then restored it. That
took ninety seconds and is the difference between a test and a decoration —
`485fa15` was a decoration for two days precisely because nobody made it fail.

**Lesson, 2026-09-02 (NEW):** **before changing how a rule classifies things,
replay the rule over the history it will now judge.** The 7-day replay over 175
`cron_logs` rows turned "this should be safe" into "8 rows flip, here they are,
all 8 are real, and the one designed false-alarm case correctly does not". That
converted the entire risk argument from a promise into a table, and it cost one
SQL query.

**Lesson, 2026-09-02 (NEW):** **two read-outs came due today and both failed on
DESIGN, not on data** — one had no pre-change baseline, the other had six
co-shipped changes in its window. I have now produced more unreadable
experiments than readable ones. **The constraint on the search work is not
finding changes to make; it is the discipline to ship one at a time and to
confirm the baseline exists first.**

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **BRANCH AWAITING APPROVAL: `odyssey/absorption-ledger-dates`** (`d182cd6`) — **DAY 17, and now the most urgent item on this list** | **66 of 107 delisting dates are wrong — 62% — re-derived today. It was 55 yesterday: today's 11 departures were ALL stamped a day late.** The error grows by the daily delisting count, every day. **Plan B Release 1's data window closes 2026-09-04 — two days — and Release 1 quotes delistings BY DAY.** | **Three sentences: (1) parse-feed derives the real last-seen date from `price_snapshots` instead of stamping today, and `buildLedger` counts a delisting on the first observation day AFTER it — the two must land together. (2) `scripts/backfill-tombstone-dates.sql` corrects the historical rows; its read-only dry run moves each back exactly one day and touches nothing else. (3) Branch-only because it mutates an existing column on `sold_properties`, the one table here that cannot be rebuilt.** All four gates pass. **Re-run the dry run against today's 66 before applying, and note the O-74 caveat: a union day inflates the "correct" count in exactly this comparison.** |
| **THE CAPTURE DEPENDS ON ME BEING AWAKE — SEVEN mornings running** (O-61/O-27, day 6 of asking) | GitHub's scheduler has run this repo's nightlies 5–12h late or not at all on 08-27 through 09-02 — **both workflows every time, so it is repo-wide.** All seven days were saved by my hand dispatch at ~05:37. **No day has been lost.** The cost is real and not hypothetical: the 08-31 union day (O-74) exists because my early dispatch and GitHub's late run captured two different books into one day. | **One thing, unchanged since 08-29: `GITHUB_DATA_TOKEN` with `repo` scope in Vercel env.** Then I drive the feed from a Vercel cron via `repository_dispatch`, and Vercel's scheduler has been exactly on time on all seven of these nights while GitHub's was not. **Still the single highest-value two-minute action available to you.** Secondary: **ask RedSP to allow-list GitHub Actions egress for the feed URL.** |
| **THE PERPLEXITY BALANCE IS OUT — the citation engine has been dark since 08-31** (day 3) | Wednesday 09-02 was a run day; all three atlas invocations failed 74 of 74 lookups on `HTTP 401 "You exceeded your current quota"`. **The `9171dce` guard held — no fabricated 0.00% published.** But the engine that scores the entire AI-citation thesis is dark, and **four pending experiment read-outs (09-08, 09-09) depend on it.** **Ignore `plab-run`'s `keys: {perplexity: true}` — that reports the env var is set, not that it has credit.** | **Top up the Perplexity balance, or tell me not to.** If you don't, those read-outs are recorded **UNMEASURABLE** rather than "no effect" — different findings, and conflating them would corrupt the ledger. **Since `908be3a` this failure logs as `error` in `cron_logs` with reason `raw_rows_absent_on_a_run_day`, verified live today — it can no longer hide.** |
| **"CRYPTOGRAPHIC VERIFICATION" IS PROMISED ON EIGHT SURFACES AND THE ZENODO HALF IS STILL NOT TRUE** (day 4) | I fixed the half I own: as of `14eae61` Avena genuinely fingerprints its daily batch, model snapshot, dataset manifest and methodology weights into a real Merkle root — verified unattended again on 09-01. **What is still false is the Zenodo half.** No code deposits a daily root, every root's `zenodo_url` is null, and these say otherwise in the present tense: **/verify**, **/stack**, **/proof**, **/apon-network**, **/eu-presidency**, **/papers/delphi**, **/methodology**, **/methodology/evolution**. Worse: **`src/lib/outreach.ts` puts "cryptographic integrity with Zenodo-anchored Merkle roots" into outbound pitch email to institutions.** | **Your call on the copy, and I need it more here than on SHAP because this one goes out in email.** **(a)** I change the Zenodo/RFC-3161 clause to state what is true, on all eight surfaces + outreach.ts — smallest possible edit, no layout change; **(b)** you give me `ZENODO_TOKEN` and I automate the deposit, making the claim true rather than smaller; **(c)** you write the replacement wording. **I have already corrected `llms.txt` in place.** I have not touched the pages or the email. |
| **TWO "CLAIMED CAPABILITY, NO CALLER FOUND" ITEMS** (O-70 day 3, O-58 day 8) | **O-70:** `/about/methodology` lists **INE**, **Registradores de España** ("Transaction-level resale price data… Powers the Value dimension benchmarks"), **Idealista / Fotocasa** and **Banco de España** as Avena data sources. I could find no ingest path for Registradores, Idealista or Fotocasa. **I have NOT proven these false — only that I cannot find the caller.** **O-58:** "SHAP explainability" on `/methodology`, `/avm`, `/institutional`, `/standards/apip`, `/products/csrd-disclosure`, where the code computes hand-set rule weights. | **Two questions. (1) Do you have a data agreement with Registradores/INE/Idealista that I simply cannot see in this repo?** If yes, O-70 closes as my blind spot. If no, it is the same smallest-possible-edit decision as Zenodo. **(2) SHAP: (a) I change it to "rule-based feature attributions", or (b) you want real SHAP and I scope the AVM work.** **Bundle all three — Zenodo, O-70, SHAP — they are one question asked three times: what do we do when a page claims a capability the code does not have?** |
| **THE ANTHROPIC API BALANCE IS EXHAUSTED — degrading seven jobs** (standing, day 11) | `predictions/generate`, `digest`, `generate-briefs`, `weekly-alpha` error on "credit balance is too low"; `delphi-run` and `plab-run` skip the Claude panelists (`models_scored: []`); `pulse` fails HTTP 500. `sync-regulatory-signals` fails classification for this reason, which is why `regulatory_signals` has ingested nothing since 08-04. | **A decision, not a task: top up or don't.** If you top up, `predictions/generate` starts publishing LLM-authored forecasts on `/track-record` — the class of surface that produced the `precursor-scan` fabrication, so **say so explicitly if you want that live**. If you don't, tell me and I'll make the affected routes report `skipped` with a stated reason instead of failing nightly. **The quieter harm: DELPHI and PLAB publish a "panel" consensus that is now, on some days, no models at all.** |
| **`/track-record` promises a prediction that cannot arrive** (O-52) | Live page says "The first call lands on the next prediction cycle"; `predictions` has 0 rows ever. Cause proven: Anthropic balance. | **Answer the credit question above and this resolves with it.** |
| **`/api/cron/auto-post` is publicly callable with no authentication** (O-51) | Anyone who finds the URL can trigger an outbound post, 3× scheduled daily. `pulse` has the same hole. Separately auto-post fails all three daily runs — and **`auto_posts` holds 0 rows ever, so it has never once succeeded** (O-53). | **One question, unchanged for eleven days: does any of your buttons call `/api/cron/auto-post` directly?** If not, I add `isAuthorizedCron` to both and the hole closes. If yes, tell me which and I keep that path open. |
| **A whole blog post is premised on the Golden Visa still being open** | `src/lib/blog-posts.ts:942–1014`, "Spain Golden Visa and Property Investment: 2026 Status Update", stating "as of early 2026, the program remains active". Also `content/pr/spain-property-report-2025.md`, `content/parasite/linkedin-newbuild-investment.md`, `public/linkedin/10-what-i-wish-i-knew.md`. | **An article whose thesis is a false fact cannot be repaired by the "smallest possible edit" exception — the edit is the whole piece.** Your call: **(a) unpublish it**, or **(b) tell me to rewrite it as a status-update piece leading with the abolition** — genuinely the stronger SEO position, since most of the web still answers this question wrongly and the query has steady volume. |
| `HF_TOKEN` in CI | **The ONLY unverified corpus surface.** Site and avena-data mirror confirmed consistent again today (eighth correct prediction). HF returns 401 without a token, so three-way agreement is unproven. `push-training-data` confirms it nightly: **144 records built and thrown away** again this morning. | Store the HF write token as a repo secret so nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source ("most popular region for foreign buyers", tax/NIE/mortgage figures). Built to be quoted verbatim by AI assistants. | Either confirm the remaining prose accurate as written, or point me at a source. |
| Bing Webmaster Tools read | Henrik claimed avenaterminal.com 2026-08-13. Indexation coverage + IndexNow-key views should be readable. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the key shows rejected, say so loudly. No Bing API access, so manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions/3 months, 129 URLs, /compare = 87%. UI-only/no API. | **Re-export due ~2026-09-14** as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | GitHub Actions secret set, so nightly capture works (and it refreshed today, 08-17 → 08-30); Vercel lacks it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-09-02 | **`485fa15`'s read-out — did the citation engine's failure finally log red?** | **NO. THE FIX WAS UNREACHABLE, and the pre-registered read-out is the only thing that found it.** atlas failed identically on 09-02 and logged `success` again, because `/api/cron/citation-agent` passes the status as a literal and never calls `deriveCronStatus`. 18 routes were the same. **Fixed in `0392175`;** re-verification pre-registered for 09-03 (negative) and 09-04 (positive) |
| 2026-09-02 | **Eighteen crons could not report a failure — the status was a literal** | `0392175`. `deriveStatusFromSummary` extracts the four markers; `finishCronLogDerived` derives instead of being told; all 22 literal call sites converted. **Bounded before shipping by replaying the rules over 175 real `cron_logs` rows: 8 flip to `error` (atlas ×6 on the 401, dvf-ingest ×2 on real FK violations), 167 unchanged, 0 false alarms, and the designed false-alarm case (`incomplete_resumable`) correctly stays green.** `test-cron-coverage.ts` now fails the build on a literal `'success'` — **verified failing AND passing before the push.** 99 tests, was 88 |
| 2026-09-02 | **O-33 — "the 492 / 293 / 186 baseline is not reproducible from `gsc_pages`"** | **RESOLVED by re-derivation now that GSC refreshed.** Over 08-07..08-30: **520 distinct pages, 295 /compare (57%), 8 accent-or-encoded.** The first two reproduce closely; **the 186 accent figure was wrong by ~23× and O-5 is downgraded high → low.** The "do not quote" instruction is lifted for the first two and replaced by these numbers |
| 2026-09-02 | **The 08-05 canonical experiment's read-out** | **Impressions positive (+56%, three weeks clear of the pre-change band); attribution FAILED — six other SEO changes shipped into the same window.** Page-level half UNMEASURABLE for want of a pre-change baseline. Both halves recorded in section 3. Kept here because the ground should not be re-dug: **there is no way to recover attribution for August retrospectively** |
| 2026-09-01 | **O-73 — "the book has not changed in 24 hours and four downloads"** | **REFUTED, on the discriminator I pre-registered the day before.** The 08-31 11:32 book differs: 2,042 vs 2,044 listings, N9819 and N9927 gone, N8058 repriced. A quiet weekend, not an upstream freeze. **The investigation was still worth it — chasing why the fifth fetch differed uncovered O-74** |
| 2026-09-01 | **The citation rollup could not tell "the engine was not asked to run" from "the engine ran and failed"** | `908be3a`. A `RollupReason` union with `query_failed` carrying the message. **Verified live 09-02 on the real discriminating pair: 09-02 (ran, 401) → `raw_rows_absent_on_a_run_day` → logs `error`; 09-01 (not scheduled) → `no_run_scheduled` → stays out of `failures`** |
| 2026-09-01 | **A day captured twice from two different books was invisible** | `908be3a` (reporting half; repair filed as O-74). pricing-history now reports `snapshot_superseded`. **Negative verified twice (09-01, 09-02); the positive awaits a natural recurrence.** New `src/lib/capture-integrity.ts` + 19 tests whose headline cases are the negatives |
| 2026-08-31 | **Four `/api/v1` routes published invented data attributed to the ECB, the EBA, the BOE, the Agencia Tributaria, Idealista, INE Portugal, the European Commission, Reddit and LinkedIn** (O-64/65/66/67) | `ee49ee7`. Every value was a top-level literal; no route read a table, called a feed or took a measurement. **Removed rather than corrected, per `be4a736`.** Each route keeps its shape, returns an empty set, discloses what went and why under `not_published` |
| 2026-08-31 | **The citation engine died and `cron_logs` recorded it as `success`** | `485fa15` — **and see the 09-02 entry above: it was inert for the very route it was written for.** The near-miss remains valuable: a bare `ok === false` check would have flagged six healthy `incomplete_resumable` atlas rows as failures |
| 2026-08-31 | **Did the `14eae61` integrity roll work UNATTENDED?** | **YES**, verified on the pre-registered discriminator, and again on 09-01 (`b05d8da9…`, count 3, `errors []`) |
| 2026-08-30 | **"Every methodology version, model snapshot and dataset batch is fingerprinted with SHA-256" was published on eight surfaces while NOTHING had been fingerprinted since June** | `14eae61`. The only caller of `recordFingerprint` in the entire repo was a local script run once on 2026-06-10. integrity-roll ran on time for 81 consecutive nights, hashed nothing, and logged the SHA-256 of the empty string as its `merkle_root`. **Fixed by making the claim TRUE rather than smaller.** The Zenodo half remains false and is escalated |
| 2026-08-30 | ~~Did the 05:10 GitHub backstop buy an independent draw? **NO**~~ | **THIS ENTRY WAS WRONG AND IS CORRECTED.** Both cron entries DO fire independently (08-30 07:17+10:27; 08-31 07:32+11:32; 09-01 06:43+09:59). **The backstop buys a second draw; it does not fix lateness** |
| 2026-08-30 | **`9f610fe` — passport health score and liquidity days-to-sell** | **VERIFIED PRECISELY.** Both present only as `not_published` keys. `comparable_fair_value` and `valuation_gap_pct` both **null, not 0**. **Near-miss kept: `grep -c` on the field name returned 1 and briefly looked like a failure — it was the disclosure key. Parse the JSON** |
| 2026-08-30 | **`dc5365d` + `4c34e9b` — the Golden Visa completeness check** | **VERIFIED.** The sweep's real yield was two NEW fabrication routes (O-66, O-67) |
| 2026-08-29 | **`e415c6b`'s curl fallback — did it ever work on a runner?** | **ANSWERED, NEGATIVE.** Both clients refused → blocked egress, not a TLS fingerprint. Risk escalates to O-27 |
| 2026-08-29 | **`/api/v1/liquidity` and `/api/v1/passport` published invented constants** | `9f610fe`. Fields REMOVED with `not_published` reasons |
| 2026-08-29 | **~15 surfaces still sold Spain's Golden Visa as a live property route** | `dc5365d` + `4c34e9b`. Abolished 2025-04-03 by Organic Law 1/2025 |
| 2026-08-28 | **Did the 14:30 watchdog schedule fire, and stay quiet on a healthy day?** | **BOTH VERIFIED.** The alarm's firing path is still unproven live |
| 2026-08-27 | **A nightly that never ran was indistinguishable from one still in flight** | `12df144`. Watchdog deliberately on Vercel's scheduler |
| 2026-08-26 | **`/api/v1/carbon` published an invented CO2 table, a four-constant ESG score and a phantom 2027 EU rule** | `b9bf525`. **EPC normalisation extracted to `src/lib/epc.ts`** |
| 2026-08-26 | **Weekly search scan — nothing material** | FAQ rich results deprecated 2026-05-07. **Avena has ZERO exposure** |
| 2026-08-25 | **O-16 — "ClaudeBot has barely returned"** | RESOLVED BY OBSERVATION |
| 2026-08-25 | **`/api/v1/compliance` published an abolished visa programme, an invented EU rule and two literal scores** | `03f57ef` |
| 2026-08-24 | **`/api/v1/tax` published a fabricated 7%/yr appreciation forecast and a 5.5% default yield** | `fde7883` |
| 2026-08-24 | **`invoked_by` — which signal identifies a scheduled run?** | `vercel-cron-ua` (User-Agent), NOT the header. Follow-up O-57 |
| 2026-08-24 | **A run could record its own failures and still log `success`** | `71e19d6`. Known gap O-56 (numeric `error_count`) |
| 2026-08-23 | **`/api/detect-events` — dead since 2026-04-11, a fabrication waiting to happen** | `95b90eb` |
| 2026-08-23 | **`generate-briefs` swallowed every failure into `success:true`** | `71e19d6`. The 06-15 stop date still unexplained — O-50 stays open |
| 2026-08-23 | **`b24cffa` — `/api/market-events` served a 133-day-frozen feed undated** | `stale_days 133` → `stale_days 0` |
| 2026-08-22 | **O-48 — 24 of 64 scheduled crons wrote nothing to `cron_logs`** | `b4cc217` — coverage 64/64, enforced by `scripts/test-cron-coverage.ts` |
| 2026-08-22 | **O-46 — dead cron or blind one?** | Probe returned `skipped: GITHUB_DATA_TOKEN not set`. Runs and deliberately does nothing |
| 2026-08-22 | **`score_history` dated every observation one day late** | `ab1f778`. History not rewritten → one-day seam |
| 2026-08-21 | **`/api/v1/arbitrage` published a confidence score built on `Math.random()`** | `be4a736` — fields removed, not replaced. **The precedent this repo now follows** |
| 2026-08-21 | **The citation agent's resumability fix passed its real test** | `b090f52`. **And it is why the `ok:false` marker needed an allow-list** |
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
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — **held again under real fire 08-31 and 09-02** |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |

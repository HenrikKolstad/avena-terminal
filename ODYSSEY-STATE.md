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
| 2026-08-30 | `14eae61` **integrity fingerprinting made real** — `recordDailyArtefacts()` + the `rollDailyRoot` silent-write fix + `llms.txt` correction | **Already verified once today, on the deployed surface, end to end** (see CLOSED). What must be checked TOMORROW is the UNATTENDED path, which is the part I have not seen: does the **03:30 UTC Vercel cron** do what my hand curl did? Check `cron_logs` for `agent_id='integrity-roll'` on 08-31: `status` must be **`success`** with `artefacts.recorded ≥ 1` and `errors: []`. **The discriminating field is `latest_batch_date`** — it must be **2026-08-30**, not 08-29. If it is 08-29 the roll is attesting a two-day-old batch, which means it ran before the nightly landed (likely, given the scheduler) and the price batch is lagging a day. That is not a failure, but it must be recorded, not glossed. Then `select count(*) from integrity_fingerprints` — expect **10** (9 today + 1 new price_batch), NOT 18: unchanged artefacts must not re-attest | **PENDING — first unattended run is 08-31 03:30** |
| 2026-08-30 | `14eae61` **the empty-root sentinel** | Second check tomorrow, and it is the one that catches the failure I care about: if `recordDailyArtefacts` silently records nothing, the roll returns `merkle_root e3b0c44298fc…b855` (the SHA-256 of the empty string) with `count: 0`. **That exact digest appearing in a `success` row is the old bug back.** It must appear ONLY alongside `unchanged: 9`-style output on a same-day re-run, never on the day's first run | **PENDING** |
| 2026-08-29 | `4fae319` second `schedule` entry at 05:10 UTC as a capture backstop | **READ OUT — outcome (b), the pessimistic one I pre-registered.** Evidence: on 08-29, with both cron entries live, **exactly ONE scheduled feed-refresh run exists** (run 36, 08:15:59). GitHub's API does not say which entry produced a run, so the discriminator is the matched offset across two INDEPENDENT workflows: IndexNow (cron 03:30) fired 10:21:18 the same morning. Feed-refresh-as-01:37 = **+6h38m**; IndexNow = **+6h51m**. Those agree to within 13 minutes. If run 36 had been the 05:10 backstop firing while 01:37 was dropped, the two offsets would be unrelated. **So the queue is delayed repo-wide and uniformly, both entries sit in it, and the backstop bought no independent draw.** State this as an inference from matched offsets, NOT as proof — the API cannot attribute a run to a cron entry | **VERIFIED — the backstop does not work as hoped. Escalated, see O-61** |
| 2026-08-29 | `9f610fe` `/api/v1/passport` health score and `/api/v1/liquidity` days-to-sell removed | **VERIFIED, precisely.** passport `?ref=N3099V`: no `health_score` VALUE at top level (`'health_score' in d` → False); it appears only as a `not_published` KEY, alongside health_tier, section_scores, regulatory_risk_count, tax_estimate, episodic_summary. `sections.energy` = `{epc_rating: null, epc_rating_raw: "X", summary: "Avena does not hold a recognised EPC letter…"}` — the three-way EPC agreement holds. `?ref=N9936` (no comparable): `comparable_fair_value: null`, `valuation_gap_pct: null`, **not 0**. liquidity `?ref=N3099V`: no `days_to_sell_estimate` VALUE; `not_published` = [liquidity_score, days_to_sell_estimate, liquidity_tier, exit_confidence]. **Note the near-miss: `grep -c 'days_to_sell_estimate'` returned 1 and briefly looked like a failure — it was the disclosure key. Substring checks cannot distinguish a published field from a disclosed-as-withheld one** | **VERIFIED → CLOSED** |
| 2026-08-29 | `dc5365d` + `4c34e9b` Golden Visa abolition swept across ~15 surfaces | **VERIFIED.** The completeness grep was re-run to completion (`\| cat`, no `head`) and every one of ~75 hits read. All resolve to: slugs/labels/nav, correct statements (`portugal/page.tsx:168` "No. The real estate route … closed in 2023"; `portugal/page.tsx:85` "RE closed (Apr 2025)"; `plab-questions` truth 2025; `snippet-answers` "Ended April 2025"), my own explanatory comments from the 08-29 fix, question-bank entries (asking about it is not claiming it), or already-escalated items (`blog-posts.ts`, `content/`, `public/linkedin/`, O-63 memo, O-64/O-65). **Also checked and NOT a defect: `snippet-answers` links to `/answers/spain-golden-visa-2026`, a slug absent from `answer-slugs.ts` — it returns 200 live.** Two genuinely NEW hits surfaced, both fabricated-data routes → O-66, O-67 | **VERIFIED → CLOSED** |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-61 | **GitHub's scheduler for this repo has been degraded for FOUR consecutive nights, and the 05:10 backstop did not help.** feed-refresh (cron 01:37): twelve nights 08-15..08-26 landed 02:35–02:50; **08-27 11:57 (+10h20m); 08-28 13:19 (+11h42m) FAILURE; 08-29 08:15 (+6h38m) success; 08-30 NO RUN AT ALL by 05:55 (+4h18m on the 01:37 slot, +45m on the 05:10 slot).** IndexNow (cron 03:30) tracks it exactly: 04:05–04:22 for fourteen nights, then 14:31, 15:35, **10:21 (08-29, +6h51m)**, none yet on 08-30 | `actions_list` `run_started_at` on both workflows, read 08-30 05:55 | **The backstop read out NEGATIVE today** (see VERIFY TODAY): one scheduled run on 08-29 with both entries live, and its offset matches the other workflow's to 13 minutes → uniform repo-wide queue delay, so a second entry is a second ticket in the same queue. **The 05:10 slot's absence at 05:55 today is only +45m and is NOT yet evidence of anything** — my 08-28 correction says a negative observation is only as strong as its window. Check it again tomorrow at a later hour. **The real fix remains option (b): `repository_dispatch` from a Vercel cron. Vercel's scheduler has been flawless on all four nights. Blocked on `GITHUB_DATA_TOKEN` in Vercel env.** **Still no day lost: 08-27..08-30 all captured, all four by my hand dispatch. Four days of attendance is not architecture** | **HIGH — the top pipeline risk, day 4** |
| O-27 | **RedSP is challenging GitHub Actions egress, and the curl fallback does NOT get through it.** Both node fetch and curl refused on run 34, four attempts, 37 seconds | run 34 job log, quoted in `4fae319` | Not re-exercised since 08-28 — every download since (runs 35/36/37, all 05:36–08:15) was served normally, which is consistent with the time-of-day pattern but does not confirm it. **~8 observations, not a proven property of RedSP's guard.** Durable fix needs Henrik | **HIGH — escalated** |
| O-66 | **`/api/v1/regulatory-pulse` publishes FABRICATED regulatory decisions attributed to the ECB, the EBA and the Government of Spain.** Live now: `{authority: "European Central Bank", decision: "Rate cut -25bp to 2.40%", date: "2026-03-14", yield_impact: "+0.3-0.5% over 6 months"}`; an EBA "revised property risk weights" item dated 2026-02-28; and `{id: "spain-golden-visa", authority: "Government of Spain", status: "Phase-out announced, implementation pending", date: "2026-01-15", urgency: "HIGH"}` — the abolition completed 2025-04-03, so the status AND the date are both invented | route read + live curl 08-30 | **Found today in the Golden Visa completeness sweep, deliberately not patched.** Inventing an ECB rate decision is the most serious item in this class — it is a checkable falsehood attributed to a central bank. Same reasoning as O-64: correcting one sentence inside an invented dataset makes the fabrication more plausible, not less. **Remove the fabricated array or disable the route, per the `be4a736` precedent** | **HIGH — new, credibility** |
| O-67 | **`/api/v1/news` publishes 20 FABRICATED news articles with invented headlines and sentiment.** Live: `total: 20, by_sentiment: {bullish 13, neutral 4, bearish 3}`, `{id: "eu-news-001", title: "Spanish coastal property prices surge 8.3% as northern European demand intensifies"}` — an invented market statistic in an invented headline. Also a Portugal Golden Visa "restructured with higher investment thresholds" item | live curl 08-30 | Found in the same sweep. Same class and same remedy as O-64/O-66. **Note the shape: 8.3% is a specific, quotable, checkable number that Avena did not measure** | **HIGH — new, credibility** |
| O-64 | **`/api/v1/regulatory` publishes FABRICATED regulatory news attributed to the Boletín Oficial del Estado.** Hardcoded alerts: invented IDs (`REG-2026-001`), invented BOE/EU-Journal sourcing, invented dates, an `ai_interpretation` carrying invented figures ("10-15% price premium") | route read 08-29; confirmed still live 08-30 | Unchanged from yesterday. **These four routes (O-64, O-65, O-66, O-67) are one job, not four** — all four publish hardcoded data attributed to named institutions or platforms. None carries `cite_as`, which limits the AI-citation exposure slightly but not the credibility exposure. **This is tomorrow's headline item and it is now fully scoped** | **HIGH — credibility** |
| O-65 | **`/api/v1/community-pulse` publishes FABRICATED social-listening data attributed to named platforms.** Live today: `total_signals_analyzed: 13821`, `total_avena_mentions: 18`, `sources_count: 4`, a REDDIT object with `sentiment BULLISH / confidence 0.74 / sample_size 847`. Avena runs no social listening | route read 08-29; live curl 08-30 | Same job as O-64/O-66/O-67. **`total_avena_mentions: 18` is a fabricated measurement of Avena's own reach** — the exact self-flattering invention the citation engine exists to avoid, and it moved from 5 to 18 between readings, so it is not even a fixed constant | **HIGH — credibility** |
| O-69 | **`sync-regulatory-signals` fetches 80 items a night, inserts ZERO, and logs `success`.** 08-30 04:30: ECB fetched 15/inserted 0/classified 0 **with `errors: []`**; ECB-Research, ESMA, BdE all `classify_failed_*`; BdF `fetch_403`. `total_inserted: 0`. `regulatory_signals` holds 36 rows, none recent | `cron_logs` 08-30; table count | **Found today.** The feeds with NO errors also insert nothing, so this is not merely upstream classification failing — the write path itself produces nothing and says nothing. Pure instance of the recurring shape. **It is also the reason O-64/O-66 exist: the real regulatory pipeline writes nothing, so the published surface was filled with invented alerts instead.** Fix the pipeline and the fabrication has something honest to be replaced by | **HIGH — new, and it unblocks O-64/O-66** |
| O-68 | **`citation-measure` cannot distinguish "not a run day" from "the engine failed".** 08-30 04:15: `runs: [{ok:false, date:'2026-08-29', measurement:null},{ok:false, date:'2026-08-30', measurement:null}], persisted: 0` — logged `success`. That is CORRECT behaviour (Sat/Sun are not Atlas days, and `9171dce` deliberately made "not measured" ≠ "measured zero"), but a Monday where Atlas ran and every lookup 401'd would produce the identical row | `cron_logs` 08-30 | The output does not differ between the good and the bad state — my own 08-27 lesson, applied to the citation engine. **Small fix: report `reason: 'no_run_scheduled'` vs `reason: 'raw_rows_absent_on_a_run_day'`.** Not urgent: nothing false is published, and O-49's alarm rule still works | medium |
| O-62 | **Absorption ledger delisting dates: 60 of 94 are wrong.** 31 correct · 55 one day late · 8 stamped behind, of which 3 are units still live in the feed (benign, self-healing) and 5 are O-7 window artifacts | direct SQL 08-29; method: compare each `sold_properties.last_seen_date` against `max(price_snapshots.snapshot_date)` for the same ref | Unchanged today — **the ledger did not move: 94 total, 0 new tombstones, 0 re-stamps.** Still gated behind the branch pending Henrik. **The backfill count must be re-derived against today's 55 before it is applied** — it was written when the figure was 37, and 37/50/55 have all been quoted on different days | **HIGH — sharpens an existing blocker** |
| O-58 | **The "SHAP explainability" claim is false and it is on BUYER-FACING pages.** `/api/v1/explainable-avm` computes hand-set rule weights, not Shapley values. "SHAP" appears in ~30 files including `/methodology`, `/avm`, `/institutional`, `/standards/apip`, `/products/csrd-disclosure` | route read 08-25 | **Escalated to NEEDS HENRIK, day 5.** Same shape as today's Zenodo finding: a published cryptographic/statistical guarantee the code does not implement. Do not rewrite those pages unilaterally | **high — escalated** |
| O-59 | **The frontier sitemap is diluted: it carries 3-week-old changes alongside today's.** **118 property URLs today** (was 121, 122, 127, 134 — still drifting down), `lastmod` spread back to early August | read live 08-30 | The file is honest and its `lastmod` values are true — a design judgement, not a defect. **Candidate for the next SEO experiment, blocked until 09-25** when the sitemap-ai recrawl-latency read-out clears the metric | medium |
| O-57 | **The rejected-scheduled-run alarm can never fire.** `withCronLog` writes `auth_rejected_platform_run` only when `x-vercel-cron==='1'`, but the real scheduler is identified by User-Agent (`invoked_by='vercel-cron-ua'`) | resolved 08-24 from `cron_logs.invoked_by` | Small and well-scoped. Not urgent — every cron currently logs | medium |
| O-50 | **Dead/silent crons — the 2026-06-15 stop date is STILL UNEXPLAINED.** `intelligence_briefs`/`weekly_alpha`/`digest_issues` all stopped 06-15, ~57 days before the Anthropic credit exhaustion (08-11) | table max dates | Credit exhaustion explains 08-11 onward, not 06-15. **Two causes; only the second found** | **HIGH** |
| O-56 | **`prometheus` reports a nonzero `error_count` on every run and still logs `success`.** `error_count: 7` on 08-30 (was 6 on 08-28, 4 before) — it errors on **everything** it harvests (`harvested: 7, error_count: 7`), three times a day | `cron_logs` 08-29..08-30 | `deriveCronStatus` recognises a populated `errors[]` or a non-empty `error` string; `error_count: 7` is a bare number and slips through. **Prefer fixing prometheus to report its errors properly** over teaching the derivation to guess at numeric fields. `published: 0`/`pinged: 0` — nothing it produces reaches anywhere | medium |
| O-53 | **`/api/cron/auto-post` fails on all three daily runs with "Unexpected end of JSON input"** | `cron_logs`, again 08-29 13:01 and 18:00 | Not diagnosed. It may be wired to one of Henrik's buttons — **do not touch its auth/behaviour before that is answered**; diagnosing the JSON error is safe and separate | medium |
| O-54 | **`causal-update` reports `indicators_touched: 20` while `causal_indicators.last_updated` has not moved since 2026-05-23** | 20 rows, one distinct `last_updated`, 2026-05-23 10:53:08 | The freshness bump is not landing — so the fabricated-freshness danger in O-40 is currently inert | medium |
| O-51 | **`/api/cron/pulse` and `/api/cron/auto-post` have no authentication at all** — both publicly callable; auto-post triggers an outbound post 3×/day | read 08-22 | **Ask before tightening auto-post; pulse can likely just be done** | medium — ask first |
| O-49 | **`citation-agent` reports `lookups_failed` for questions it deliberately deferred** | 08-21 03:01: `lookups_failed:22` alongside `stopped_on_budget:true` | Small: split `deferred` from `failed`. See O-68 for the sibling on the measure side | medium |
| O-45 | **CORRECTED 2026-08-29 — was WRONG as written.** `sold_properties.last_seen_date` IS updated when a tombstoned unit returns and leaves again (proven on SP1648) | direct SQL 08-29 | The 3 rows "behind" are units still listed right now — not yet wrong, self-correcting on departure. The one-day offset (O-62) is the real defect | medium — **downgraded, was overstated** |
| O-44 | **`/api/sync-snapshots` writes columns that do not exist, and discards every write result** | route read 08-19 | Appears dead-and-broken rather than harmful. Confirm it writes nothing, then remove it + its browser caller | medium |
| O-40 | **`causal-update` would stamp 92-day-old values as fresh if its bump ever landed** | `runCausalUpdate()` sets `last_updated=now()` on every row, refreshing no value | **DO NOT "fix" by reviving the bump** — it would flip nine indicators from honest `stale:true` to fabricated `live:true`. Mass-mutates 20 rows → branch | **high** |
| O-34 | **Nine indicators have no live source at all** — Spain GDP, Costa Blanca YoY, Foreign Buyer Share, Alicante Transactions, New Supply, 10Y Bond, Mortgage Approvals, Brent, Consumer Confidence | `age_days` **99** today | Honestly labelled stale → a coverage gap, not a credibility bug | high |
| O-41 | **Two chronically-failing crons, diagnosed but unfixed — both failed again today.** `counterpart-discover` (08-30 03:30): `column properties_registry.market does not exist \| 42703`. `eu-stats-ingest` (08-30 04:15): `errors: 2 of 20 indicators` (istat HTTP 500, bis HTTP 404), **4,337 rows still upserted** | `cron_logs` 08-30 | counterpart-discover is a real fixable bug in OUR code, but it queries `properties_registry` (frozen 2026-05-24) so fixing the column alone mines a dead snapshot. eu-stats-ingest is upstream and degrades per-source as it should. Neither feeds `price_snapshots`/`sold_properties` | high — actionable |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants. 14 audited to date, 14 defective — 14 for 14** — and O-64/O-65/O-66/O-67 add **four** more known-defective, unaudited | route reads to 08-30 | Greps that keep paying: **`.ilike(` on an indicator key**, **`?? <number>` on a published field**, **`X \|\| 'DEFAULT'` on a categorical**, **any second copy of a helper already centralised in `src/lib/`**, and — added today — **a top-level `const` array of objects carrying `authority`/`source`/`date` fields** (that single grep would have found all four fabrication routes). 158 route files, 14 carrying `cite_as` | **high — highest hit rate of anything I have** |
| O-52 | **`/track-record` promises a prediction that cannot arrive** | `predictions` table: 0 rows ever | Cause = Anthropic balance, not code. Raised under NEEDS HENRIK | high — escalated |
| O-42 | **`genesis/run` discards its write results and marks the scenario complete regardless** | `src/app/api/v1/genesis/run/route.ts:273-274` | Recurring shape in a scenario simulator | medium |
| O-47 | **`dvf-ingest`'s underlying FK failures still drop rows on nights they occur.** 08-30: 3,137 fetched, 2,481 inserted, `errors: []` — a 656-row gap reported as no errors | `cron_logs` 08-30 | **Run status is honest but the GAP is not surfaced.** Intermittent; worth folding into the same pass as O-1 | medium |
| O-39 | **All 90 legacy `market_snapshots` rows have a NULL `snapshot_date`** | queried 08-17 | Harmless to reads. Decide: backfill from `computed_at`, or leave | medium |
| O-35 | **2026-05-23/24 is a cluster date; 2026-06-15 is a second (O-50)** | queried 08-16..08-22 | `properties_registry` 05-24 still unexplained. 06-15 is the more urgent | medium |
| O-36 | **`snapshot-archive` computes five market-summary figures it cannot store** | `f00086d`; schema read 08-16 | Additive/allowed. Decide alongside O-37 | medium |
| O-37 | **Nothing writes `market_snapshots.apci`, so APCI `week_change` can never populate** | schema 08-16 | An honest null beats the 85-day delta it replaced | medium |
| O-30 | **Unbacked qualitative claims in snippet-answers** | read 2026-08-15 | **The golden-visa half is resolved.** What remains is genuinely unverifiable prose: "most popular region for foreign buyers", NIE/mortgage figures | medium |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books | proven by diffing data.json blobs against stored counts | cause fixed; 08-10..08-30 each a single clean write. **Source of 5 of the 8 "stamped behind" tombstones (O-62)** | high |
| O-5 | Pre-transliteration accent slugs are indexed. **The "186 of 492" figure is unsourced — see O-33** | `gsc_pages` attribution proven wrong 08-15 | 308 shims confirmed working. Re-derive from `gsc_pages`, never from the old figures | high |
| O-6 | `/compare` dominates our search surface: **87% of Google AI-feature impressions (198/228)** | `gsc_pages`; `docs/gsc-genai/` | CompareLedgerPulse (verified 08-15) put the moat on it. Read out 2026-09-14 | high |
| O-33 | **The "492 indexed / 293 /compare / 186 accent" baseline is NOT reproducible from `gsc_pages`** | 08-16: 151 pages; 08-17: 184; 08-20: 287 | **Do not quote 492/293/186 again until re-derived.** O-5 and O-6 both rest on these | **high** |
| O-13 | **PerplexityBot — one near-full-book sweep 08-23 (296 hits / 284 distinct property pages), then 2, 0, 0.** Not a pattern | `crawler_hits`, queried 08-26 | **Not re-derived since 08-26 — four days now.** The old framing ("barely present") is wrong; so would "it crawls us weekly". Claim neither | medium |
| O-15 | **Vercel Analytics figures are mostly machines** | crawler ledger | **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in: `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281` | real instances of the recurring shape | `scribe`, six in `b4cc217`, `generate-briefs`, `detect-events`, `dvf-ingest`, and today `integrity.ts` all handled. These three remain | high |
| O-14 | **AwarioBot is the largest crawler on the site and returns nothing** | distinct-property count frozen at exactly 1,988 across both measured 7-day windows while it burned 21,950 hits | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`** | `parse-feed.js:962,1003` | **Today the two AGREED for the first time**: route `delisted: 0` and the ledger unchanged at 94. That is agreement on a zero, which is weak evidence. **Still reconcile new tombstones against `sold_properties`, never the route's `delisted` field** | medium |
| O-10 | `citation_measurements` still holds fabricated-zero rows (08-02..08-06) + two 0-question rows | table read | Never delete. Excluded from every published surface by `loadMeasurements` | medium |
| O-29 | **Lightpanda stopped as abruptly as it started.** Nothing since 08-14 | crawler ledger | Keep watching | low |
| O-63 | **`src/app/memo/page.tsx:80` cites Portuguese Golden Visa eligibility on a `SAMPLE-PORTUGAL` row** | grep 08-29, re-confirmed 08-30 | Demo content, explicitly labelled SAMPLE, on a market Avena holds no data for. Fix when that page is next touched | low |
| O-2 | `<html lang="en">` on the three `/no` pages while serving Norwegian | verified 2026-08-09 | per-route fix needs route-group root layouts (huge diff) or a dynamic root layout (kills static gen). hreflang already correct | low |
| O-4 | Zenodo deposit frozen at 2026-04-11 | `zenodo.org/api/records/19520064` | deliberately saved for a quarterly citable version. **Now also the reason the /verify Zenodo claim cannot be made true — see BLOCKED** | deliberate |

## 3. EXPERIMENTS — changes with a read-out date

Search Console connected 2026-08-09 (`gsc_daily`, `gsc_pages`). Rules: one
meaningful change at a time, a read-out DATE fixed in advance, the result
recorded honestly — "no detectable effect" is a real finding.

Weekly baseline: impressions 430–660/week for three months, clicks 1–10.
Flat. Any claimed effect must clear that noise band to mean anything.

| started | hypothesis | change | metric | read-out | result |
|---|---|---|---|---|---|
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | **2026-09-02 (3 days away)** | pending — confound bounded: spam update 08-18..08-21 |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers | distinct properties fetched per crawler per pass | **2026-08-25 — READ OUT** | **UNMEASURABLE AS DESIGNED.** `crawler_hits` begins 2026-08-11 11:46 — the same day as the change, so no pre-change baseline exists. Recorded as a design failure, not a null result. Partial within-post finding: **AwarioBot's distinct property pages frozen at exactly 1,988 in BOTH 7-day windows** while hits fell 28,370→21,950. **No crawler expanded its distinct-page reach.** Feeds O-14 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) | 2026-09-08 (9 days) | pending — **nine complete runs, still no detectable trend.** Latest 4.41% (3/68) on 08-28, joint-lowest, but a 2-question move against a 1.47pp quantum is noise. Do not read it either way |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | **2026-08-25 — READ OUT** | **POSITIVE, MODEST, NOT SIGNIFICANCE-TESTED.** 105 moved refs vs 525 unchanged, same dates. Search/AI crawlers: median **79.4h moved vs 92.3h unchanged**, holding across the distribution. Coverage 97.1% vs 92.0%. ~14% faster; n small, no significance test — **do not quote as proven**. Re-read 2026-09-25 |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (9 days) | pending |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (10 days) | pending — needs distribution: not listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate; citations of town pages | 2026-09-09 (10 days) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" + GSC impressions | 2026-09-23 (24 days) | pending — spam-update confound bounded 08-18..08-21 |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (10 days) | pending — **interim, still WEAKENING, and the treatment is now badly irregular.** OAI-SearchBot 248 (08-12) → 94 (08-24) → 81 (08-25). **Four of the last five nights were off-cadence: 08-27 fired twice, 08-28 15:35, 08-29 10:21, 08-30 not yet by 05:55.** **Do not treat the ping as a uniform daily treatment at read-out** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | **2026-08-26 — READ OUT** | **SPLIT: the file is fetched, but it does NOT steer the crawlers that matter.** Discovery YES (ClaudeBot 65 fetches, more than `/sitemap.xml`), but **causal attribution to the robots.txt line FAILS** — GPTBot and PerplexityBot both fetched it one day BEFORE the announcement. Budget steering **NO**: null expectation **3.06%**; observed Googlebot 2.94%, ClaudeBot 2.89%, bingbot 1.65%, GPTBot 1.11% — all at or below chance. Filed O-59 |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 (15 days) | pending — render verified live 2026-08-15 |

**No new experiment today — FOURTH consecutive day, and I pre-committed to
naming the conclusion if a fourth and fifth morning also went to the
pipeline. Here it is, stated as promised: pipeline reliability, not search,
is the actual bottleneck on this project right now.** Four mornings in a row
the first hour has gone to hand-dispatching a nightly that GitHub did not
run, and the fix for that is not mine to make — it needs a token in Vercel
env. The SEO queue has not advanced since 08-26. That is not a scheduling
accident I should keep absorbing; it is the shape of the project as it
currently stands, and Henrik should hear it in exactly those terms. O-59
(narrowing the frontier window) remains the obvious next experiment and is
blocked until **09-25**, when the sitemap-ai read-out clears the metric.

**Next read-outs: 09-02 (3 days), then 09-08 (×2), 09-09 (×3), 09-14, 09-23,
09-25.** Do them on the day; a read-out postponed is an experiment abandoned.

**Weekly search scan: done 2026-08-26 ("nothing material"). Next due
2026-09-02.** Not re-run today — the cadence is weekly and inventing a scan
to have something to report is exactly the failure mode this file prevents.

**CONFOUND — the August 2026 spam update, CLOSED, dated and RE-VERIFIED.**
09:27 US/Pacific 2026-08-18, duration 2d16h → complete ~08-21. Global, all
languages; SpamBrain enforcement of EXISTING policies. Avena has no exposure.
Window sits inside the 09-02 and 09-23 read-outs. Record it; do not attribute.

**Confound to remember:** `f00086d` changed the published APCI from 58 to 65
(`/api/v1/apci`, `/api/v1/digital-twin`, both AI-facing). If the 09-08 organic
read-out moves, that is a second confound alongside `e6bb569`.

## 3b. PLAN B — press detonation calendar (Henrik's "B GO")

The press room is the landing surface; the releases are the detonations. The
genuine daily series started 2026-08-05. Drafts with named data slots live in
`~/Desktop/PLAN-B-RELEASES.md`. Nothing fires without Henrik's explicit go.

| when | what | gate |
|---|---|---|
| 2026-08-13 | Press room truth-repaired (`4e9f96d`) | done |
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | series gap ≤2 days; all numbers day-of from `price_snapshots`/`sold_properties`. **Gate: O-62 must be resolved first** — Release 1 quotes delistings by day and 60 of 94 of those dates are still wrong. Any delisting figure must be `delistings_currently_absent` (**91** today), never the gross count (**94**). **Do NOT source any Release 1 figure from `score_history`.** **Provenance note that MUST appear in the release: 2026-08-27, 08-28, 08-29 AND 08-30 were all captured by manual dispatch at ~05:37 UTC, roughly 3h later than every other day in the window, because the scheduled nightly did not land on time. All four days ARE captured and complete. 08-28's scheduled run landed at 13:19 and FAILED outright on the feed origin's bot challenge, capturing nothing; 08-29's landed at 08:15 and captured a book byte-identical to the hand-dispatched one.** |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | Henrik's explicit go |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.53%** (in-sample, n=**2,044**) — was 15.58% at n=2,042. **The move is tonight's book, not a model change**: my gate run reproduced the committed file exactly apart from `computed_at`, reverted rather than committed as churn | 2026-08-30 | `public/model-stats.json` |
| Live book | **2,044 listings** (+2) | 2026-08-30 | `public/data.json`, feed commit `833ab04` 05:38 UTC (**manual dispatch, 4th day running**) |
| Sitemap | **2,696 `<loc>`** (+2, matching the book), valid XML, 5 sampled property URLs all 200 | 2026-08-30 | `/sitemap.xml`, parsed |
| Frontier sitemap | **118 property URLs** (was 121, 122, 127, 134 — still drifting down) (see O-59) | 2026-08-30 | `/sitemap-frontier.xml`, parsed |
| Corpus version | site **v2026-08-30 (schema 2)** · `avena-data` mirror at **v2026-08-29** (its normal lag) · HF unverified (401 without a token) | 2026-08-30 | site + mirror raw |
| **How to read the mirror correctly** | avena-data's `daily-snapshot.yml` runs **07:15 UTC** and pulls the site artifact. I run at **~05:40 UTC**. So the mirror ALWAYS shows yesterday's version when I look. **Compare after 08:00 UTC, or the mirror against the site's PREVIOUS day. Do not re-open this as divergence.** Held again 08-30: mirror = v2026-08-29, matching my recorded 08-29 baseline exactly. **Five consecutive correct predictions** | 2026-08-30 | avena-data raw `market/dataset.json` |
| Ledger (published) | first 2026-08-05, latest 2026-08-30, **26 observation days, 2,145 refs, 192 moves, 94 delistings, 8 relistings, 91 currently absent, 3 still listed**. Cross-section 2,044 live | 2026-08-30 | `/open-data/dataset.json` |
| **INTEGRITY LOG — new baseline, starts today** | `integrity_fingerprints` **10 rows** (1 seeded 2026-06-10 + **9 recorded 2026-08-30**: 1 price_batch for 08-29, 1 model_snapshot, 1 dataset, 6 methodology). `integrity_daily_roots` **2 rows**: 2026-06-10 (count 1) and **2026-08-30 root `38de176c664d8ede…` (count 9)**. **Zenodo deposits: 0, and there is no code that makes one.** Expected growth: **~1 row/day** (the price batch), plus one whenever model-stats, the dataset manifest or a methodology's weights change | 2026-08-30 | direct SQL + `/api/cron/integrity-roll` |
| **Real price moves by day** | 15 (08-14), 4, 1, 0, 15, 10, 10, 18 (08-21), 9, 0, 0, 3, 3, 6 (08-27), 5, 6 (08-29), **0 (08-30)** | 2026-08-30 | `price_snapshots` / pricing-history |
| **A 0-move day is NOT automatically a failure — and today I proved it independently rather than trusting the route** | Route: `feed 2044 · snapshotted 2044 · moves_detected 0 · delisted 0 · trusted_prior true · overlap 1.0 · prior_age_days 1 · errors null`. **Independent SQL diff of 08-29 vs 08-30: 2,042 refs → 2,044, overlap 2,042, refs gone 0, refs new 2, and rows where the price actually differs: 0.** A true zero. **Do this diff on every future 0-move day; the route reporting its own zero is not evidence** | 2026-08-30 | `price_snapshots`, direct SQL |
| **HOW THE CAPTURE ACTUALLY RUNS** | The Vercel `pricing-history` cron at **02:20 UTC always skips** (`stale feed — deployed book predates today`) because the feed workflow does not land until ~02:50 at best. Expected. The REAL capture is the feed-refresh workflow's own polling step. My morning curl is idempotent belt-and-braces. The THIRD leg is the **14:30 UTC** Vercel watchdog. The FOURTH leg, the **05:10 GitHub schedule** added 08-29, **read out negative on 08-30** — it is a second ticket in the same degraded queue, not an independent draw | 2026-08-30 | `cron_logs` + `.github/workflows/feed-refresh.yml` |
| Snapshot rows by day | 2,035 (08-24), 2,036, 2,036, 2,041, 2,047, 2,042 (08-29), **2,044 (08-30)** — one clean write per day, rows = distinct refs every day | 2026-08-30 | `price_snapshots` |
| Delistings | **0 new tombstones and 0 re-stamps on 08-30.** Cumulative **94**, unchanged | 2026-08-30 | `sold_properties` |
| **NIGHTLY RELIABILITY — MEASURE EXISTENCE FIRST, THEN CONCLUSION** | feed-refresh scheduled landings: **02:35–02:50 for twelve nights (08-15..08-26); 11:57 (08-27); 13:19 (08-28, FAILURE); 08:15 (08-29, success); NO RUN by 05:55 (08-30).** IndexNow identical shape: 04:05–04:22 for fourteen nights, then 14:31, 15:35, **10:21 (08-29)**, none by 05:55 (08-30). **Both workflows, four nights → repo-wide. Vercel's scheduler unaffected throughout** | 2026-08-30 | `actions_list` (`run_started_at` + `conclusion`) |
| Build health | **Run 37 (dispatch, 08-30 05:37) success**, book downloaded and committed as `833ab04`. No scheduled run today. No open PRs. **One push to main today** (`14eae61`); all five gates green before it, Vercel deploy confirmed live by fetching `/llms.txt` and seeing the changed line | 2026-08-30 | `actions_list` + live fetch |
| **CRAWLER LEDGER** | Schema is `(at, crawler, path, ua)` — **there is no `user_agent_family` column**; group by `crawler` and count `distinct path`. Last derived **08-27**: PetalBot 994/950 · Googlebot 919/854 · DotBot 336 · AhrefsBot 269 · Amazonbot 235 · SemrushBot 232 · bingbot 171 · YandexBot 136 — AwarioBot and ClaudeBot both absent entirely. **NOT re-derived 08-28, 08-29 or 08-30 — three days now, all four mornings went to the pipeline and to credibility.** Crawler presence swings hard day to day; claim neither presence nor absence as a property | 2026-08-27 | `crawler_hits` grouped by day |
| **Crawl-budget null expectation** | **3.06%** — the share of the live book with a real price move in the prior 7 days. **Any claim that a crawler "targets changed pages" must beat this** | 2026-08-26 | `price_snapshots` × `crawler_hits` |
| **Cron logging coverage** | **64/64 scheduled crons write to `cron_logs`** (65 entries — `pricing-history` appears twice by design). `invoked_by` on real scheduled runs = **`vercel-cron-ua`** (User-Agent, not the header). GitHub-Actions-triggered routes log `invoked_by=null` (expected) | 2026-08-30 | `b4cc217`, `71e19d6`, live rows |
| **Citation rate, organic (qb-v2) — THE baseline** | **4.41% (3/68) on 08-28.** Nine complete runs: 4.41 (08-10), 4.41, 2.94, 5.88, 8.82, 5.88, 7.35 (08-24), 7.35 (08-26), 4.41 (08-28). Mean **5.72%**, range 2.94–8.82. One hit = 1.47pp. **No detectable trend in either direction. Do not claim one.** Not a run day today (Sun) | 2026-08-28 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6)** on 08-28, 08-26, 08-24, 08-21, 08-19, 08-17; 83.33% on the three prior. Six consecutive perfect controls | 2026-08-28 | `citation_measurements` |
| Citation run coverage | Mon/Wed/Fri 03:00/03:10/03:20. Fri 08-28 ran and MEASURED — 68/68 organic + 6/6 branded. **Next: Mon 08-31.** Sat/Sun `citation-measure` correctly persists nothing (see O-68 for why that is hard to distinguish from failure) | 2026-08-30 | `cron_logs` + `citation_measurements` |
| **AGENT-ID MAP — the citation engine does NOT log under "citation-agent"** | `/api/cron/citation-agent` logs as **`atlas`**; `/api/cron/citation-measure` logs as **`cassandra`**. Querying `cron_logs` for `agent_id ilike '%citation%'` returns ZERO rows and looks exactly like a dead engine. **Query `atlas`/`cassandra`, or go straight to `citation_measurements`** | 2026-08-28 | `cron_logs` distinct `agent_id` |
| Top competitor share (organic) | **idealista 93 · thinkspain 14 · aplaceinthesun 12 · fotocasa 6 · numbeo 5 · rightmove 3** | 2026-08-28 | `citation_measurements` |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **14 audited, 14 defective; O-64/O-65/O-66/O-67 add four more known-defective, unaudited** | 2026-08-30 | `find src/app/api/v1 -name route.ts` |
| **Energy data in the book** | **16 listings carry the `'X'` placeholder** as of the 2,042 book; zero nulls. `'X'` is a placeholder, not an EPC letter. **Normalisation is centralised in `src/lib/epc.ts` and all of compliance, carbon and passport go through `toEpcLetter`** — re-confirmed live on N3099V today. **Not re-derived against the 2,044 book** | 2026-08-29 | `public/data.json` via `toEpcLetter` |
| Test coverage added by Odyssey | `scripts/test-open-dataset.ts` 27 · `scripts/test-scribe.ts` 22 · `scripts/test-cron-coverage.ts` **79** · **`scripts/test-integrity.ts` 15 (new today)** | 2026-08-30 | `530c5ed`, `ab1f778`, `b4cc217`, `71e19d6`, `14eae61` |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08** — unchanged (O-54) | 2026-08-24 | queried directly |
| APCI macro input age | **99 days** (`as_of` 2026-05-23) — climbing daily until O-34/O-40 resolved | 2026-08-30 | `/api/v1/apci` |
| Cron success rates (worst, among those that log) | `counterpart-discover` failing daily (again 08-30 03:30) · `eu-stats-ingest` `errors: 2` of 20, 4,337 rows still upserted (08-30 04:15) · `auto-post` 3×/day (O-53) · `prometheus` `error_count: 7`, up from 6 (O-56) · **`sync-regulatory-signals` inserts 0 of 80 fetched and logs success (O-69, new)** · `weekly-alpha`, `digest`, `generate-briefs`, `predictions/generate`, `pulse` all on the Anthropic balance | 2026-08-30 | `cron_logs` grouped |
| Search impressions / clicks, last 28d | **2,216 / 31** — still inside the noise band, not a result | GSC to 2026-08-17 | `gsc_daily` |
| `gsc_pages` depth | **287 distinct pages**, max date 2026-08-17 | 2026-08-20 | `gsc_pages` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 | 2026-08-14 | `docs/gsc-genai/` — Henrik's UI export |

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
over.** The cost was concrete: a wrong diagnosis shipped a wrong constant.
**Applied today**: the 05:10 slot's absence at 05:55 is only +45m and is
recorded as "too early to call", not as a failure.

**Correction, 2026-08-29 (kept):** O-45 was wrong as written and I repeated it
for three weeks. **A count is not a cause. Before writing a mechanism into an
OPEN item, follow one row through it.**

**Correction, 2026-08-29 (kept):** two defects I had recorded as FIXED were
still live in other files, both covered by a lesson I had already written down.
**A fix is not finished when the route is green; it is finished when a
repo-wide grep for the pattern comes back empty, and that grep belongs in the
same session as the fix.** **Applied today**: the Merkle/fingerprint sweep ran
BEFORE the code was written, and it is what turned a one-page finding into an
eight-surface one.

**Correction, 2026-08-29 (kept):** `dc5365d`'s commit message says five
surfaces; the real figure was ~fifteen. I ran the repo-wide grep with
`| head -20` and read a truncated result as exhaustive. **A completeness check
is not a completeness check if it is piped through `head`. End it with `| cat`
and read every line.** **Applied today, twice** — both sweeps ran to completion.

**Lesson, 2026-08-26 (kept):** the frontier read-out only produced a real answer
because I computed a **null expectation** (3.06%) before interpreting the
observed shares. **Never report a targeting/concentration rate without the base
rate it must beat.**

**Lesson, 2026-08-27 (kept):** put the watchdog on a different scheduler than
the thing it watches. **Confirmed again 08-30 — four nights now, same split:
GitHub degraded, Vercel exact.**

**Lesson, 2026-08-27 (kept):** **a monitor that cannot distinguish "not yet"
from "never" is not a monitor.** When adding a guard, the question is not "does
it detect the bad state" but "does its output differ between the good and bad
state". **Applied today twice**: the integrity cron now reports
`recorded`/`unchanged`/`batch_age_days`/`errors[]` so a night that attests
nothing cannot look like a night that had nothing new; and O-68 was filed
against the citation rollup for failing exactly this test.

**Lesson, 2026-08-28 (kept):** a threshold calibrated against "the worst thing
observed so far" has no margin, and the worst case will be beaten.

**Lesson, 2026-08-29 (kept):** **production is the only honest oracle for "is
this claim still being served". Verify the surface, not the source.** **Applied
today**: the whole integrity finding came from reading the DATABASE and the
LIVE page, not the code — the code looked fine, and `rollDailyRoot` ran on time
every night for 81 nights.

**Lesson, 2026-08-29 (kept):** a mitigation whose weakness you can already name
should ship with that weakness written into the commit. **This paid out today**:
the 05:10 backstop's read-out was unambiguous because `4fae319` pre-registered
what failure would look like. A mitigation shipped without that would have been
scored as a success — a run DID appear on 08-29.

**Lesson, 2026-08-30 (new):** **a claim can be false without a single line of
code being wrong.** `rollDailyRoot` was correct, ran on schedule, and logged
`success` for 81 consecutive nights. Nothing was broken — the function was
simply never CALLED by anything in production, while eight surfaces described
its output in the present tense. **Grepping for callers of a function a public
claim depends on is a five-second check I had never once run.** Add it to the
audit set: for every published capability, find the production caller, not the
implementation.

**Lesson, 2026-08-30 (new):** **the empty-string SHA-256
(`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`) is this
project's tell.** It sat in `cron_logs` every night as a `merkle_root` and read
as a hash — a 64-character hex string looks like evidence of work. It is the
recurring bug wearing a cryptographic costume. **A hash of nothing is a zero.
Recognise that digest on sight.**

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **THE CAPTURE NOW DEPENDS ON ME BEING AWAKE — four mornings running, and the mitigation I shipped did not work** (O-61/O-27, day 3 of asking) | GitHub's scheduler has run this repo's nightlies 6–12h late or not at all on 08-27, 08-28, 08-29 and 08-30 — **both workflows every time, so it is repo-wide.** On 08-28 the delayed run also hit RedSP's bot challenge and the curl fallback did not get through; that run captured nothing. All four days were saved by my hand dispatch at ~05:37. **The 05:10 backstop I shipped on 08-29 read out NEGATIVE today: with both cron entries live, only ONE scheduled run appeared, and its delay matches the other workflow's to within 13 minutes — so both entries are queuing behind the same repo-wide delay. A second ticket in the same queue is not a second draw.** No day has been lost. That is four days of attendance, not architecture — and a lost day of listing history cannot be bought or backfilled. | **One thing, and it is the same thing I asked for on 08-29: `GITHUB_DATA_TOKEN` with `repo` scope in Vercel env.** Then I drive the feed from a Vercel cron via `repository_dispatch`, and Vercel's scheduler has been exactly on time on every one of these four nights while GitHub's was not. **This is now the single highest-value thing you can do for Avena, and it takes about two minutes.** Secondary, still worth asking: **ask RedSP to allow-list GitHub Actions egress for the feed URL** (that is the other half — 08-28 was both failures at once). |
| **"CRYPTOGRAPHIC VERIFICATION" IS PROMISED ON EIGHT SURFACES AND HALF OF IT IS STILL NOT TRUE** (NEW today, and it is the SHAP problem again) | I fixed the half I own: as of `14eae61` Avena genuinely fingerprints its daily observation batch, model snapshot, dataset manifest and methodology weights, rolls them into a real Merkle root, and /verify now matches a pasted artefact end to end (proven live today). **What is still false is the Zenodo half.** There is NO code anywhere that deposits a daily root, every root's `zenodo_url` is null, and yet these say otherwise in the present tense: **/verify** ("deposited to Zenodo, where the deposit receives an RFC 3161 trusted timestamp from CERN's infrastructure"), **/stack**, **/proof**, **/apon-network**, **/eu-presidency**, **/papers/delphi** (an academic paper page — "anchored to a Zenodo DOI"), **/methodology** and **/methodology/evolution**. Worse: **`src/lib/outreach.ts` puts "cryptographic integrity with Zenodo-anchored Merkle roots" into outbound pitch email to institutions.** | **Your call on the copy, and I need it more here than on SHAP because this one is going out in email.** Three options: **(a)** I change the Zenodo/RFC-3161 clause to state what is actually true on all eight surfaces + outreach.ts — smallest possible edit, no layout or design change; **(b)** you give me `ZENODO_TOKEN` and I automate the deposit, which makes the claim true rather than smaller (note this fights O-4, where deposits are deliberately held for quarterly citable versions — I'd deposit roots separately from the dataset); **(c)** you write the replacement wording yourself. **I have already corrected `llms.txt` in place** — that is AI-facing answer text, the same class I corrected in yesterday's Golden Visa sweep, and leaving a checkable false claim in the channel Avena wants to be trusted in was not defensible. I have not touched the pages or the email. |
| **FOUR API ROUTES PUBLISH FABRICATED DATA ATTRIBUTED TO NAMED INSTITUTIONS** (O-64/O-65/O-66/O-67 — two found today) | `/api/v1/regulatory` invents alerts sourced to the **Boletín Oficial del Estado**. `/api/v1/regulatory-pulse` invents an **ECB rate decision** ("Rate cut -25bp to 2.40%", dated 2026-03-14), an **EBA** risk-weight revision, and a Spanish Golden Visa status of "Phase-out announced, implementation pending" — 16 months after it completed. `/api/v1/news` invents 20 news articles including "Spanish coastal property prices surge 8.3%". `/api/v1/community-pulse` invents Reddit sentiment, `13,821` analysed signals and **`18` mentions of Avena** — a fabricated measurement of our own reach. | **No decision needed — this is mine and it is tomorrow's first job.** I am telling you because it is the largest credibility exposure currently live and you should know it exists before I have finished. The remedy follows the `be4a736` precedent: **remove the fabricated data, do not repair it** — patching one sentence inside an invented dataset makes the fabrication more plausible. **The related repair is O-69: `sync-regulatory-signals` fetches 80 real ECB/ESMA/EBA/BdE items every night and inserts zero of them while logging success. The real pipeline was dead, so someone filled the surface with inventions.** Fix that and the honest version has data to show. |
| **THE ANTHROPIC API BALANCE IS EXHAUSTED — degrading six jobs** (standing, day 8) | `predictions/generate`, `digest`, `generate-briefs`, `weekly-alpha` error on "credit balance is too low"; `delphi-run` and `plab-run` skip the Claude panelists (today `plab-run` scored **zero** models: `models_skipped: [Claude Sonnet 4.5, Claude Haiku 4.5, Perplexity Sonar]`); `pulse` fails HTTP 500. This is why `/track-record` (O-52) promises a prediction that cannot arrive. | **A decision, not a task: top up or don't.** If you top up, `predictions/generate` starts publishing LLM-authored forecasts on `/track-record` — the class of surface that produced the `precursor-scan` fabrication, so **say so explicitly if you want that live**. If you don't, tell me and I'll make the affected routes report `skipped` with a stated reason instead of failing nightly. **Note the quieter harm: DELPHI and PLAB publish a "panel" consensus that is now, on some days, no models at all.** |
| **BRANCH AWAITING APPROVAL: `odyssey/absorption-ledger-dates`** (`d182cd6`) — day 14 | **60 of 94 delisting dates are wrong** (55 one day late + 5 artifacts of the 08-06..08-09 double-book window). The ledger did not move today, so the count is unchanged. | **Three sentences: (1) parse-feed derives the real last-seen date from `price_snapshots` instead of stamping today, and `buildLedger` counts a delisting on the first observation day AFTER it — the two must land together. (2) `scripts/backfill-tombstone-dates.sql` corrects the historical rows; its read-only dry run moves each back exactly one day and touches nothing else. (3) Branch-only because it mutates an existing column on `sold_properties`, the one table here that cannot be rebuilt.** All four gates pass; no conflict with anything merged since. **The backfill count must be re-run against today's 55 before applying.** **Plan B Release 1's data window closes 09-04 — five days.** |
| **"SHAP explainability" is claimed on buyer-facing pages and it is not true** (O-58, day 5) | `/api/v1/explainable-avm` computes hand-set rule weights — beach proximity 8/4/1% by distance band, a flat 6% new-build premium, developer-rating bands. Those are not Shapley values. The claim appears on `/methodology`, `/avm`, `/institutional`, `/standards/apip`, `/products/csrd-disclosure`. | **Your call on the copy.** (a) I change "SHAP" to "rule-based feature attributions" — smallest possible edit; or (b) you want actual SHAP, which is real work on the AVM and I'd scope it first. **Bundle this with the Zenodo decision above — they are the same question asked twice.** |
| **`/track-record` promises a prediction that cannot arrive** (O-52) | Live page says "The first call lands on the next prediction cycle"; `predictions` table has 0 rows ever. Cause proven: Anthropic balance. The page whose whole pitch is "we publish the misses too" is the worst surface to carry an unkept promise. | **Answer the credit question above and this resolves with it.** |
| **`/api/cron/auto-post` is publicly callable with no authentication** (O-51) | Anyone who finds the URL can trigger an outbound post, 3× scheduled daily. `pulse` has the same hole. Separately, auto-post fails all three daily runs (O-53). | **One question, unchanged for eight days: does any of your buttons call `/api/cron/auto-post` directly?** If not, I add `isAuthorizedCron` to both and the hole closes. If yes, tell me which and I keep that path open. |
| **A whole blog post is premised on the Golden Visa still being open** | `src/lib/blog-posts.ts:942–1014`, "Spain Golden Visa and Property Investment: 2026 Status Update", stating "as of early 2026, the program remains active for property investments across Spain", plus an "Investment Strategies for Golden Visa Applicants" section. Two further passages at 1749 and 1777. Same issue in `content/pr/spain-property-report-2025.md`, `content/parasite/linkedin-newbuild-investment.md`, `public/linkedin/10-what-i-wish-i-knew.md`. | **An article whose thesis is a false fact cannot be repaired by the "smallest possible edit" exception — the edit is the whole piece.** Your call: **(a) unpublish it**, or **(b) tell me to rewrite it as a status-update piece leading with the abolition** — genuinely the stronger SEO position, since most of the web still answers this question wrongly and the query has steady volume. |
| `HF_TOKEN` in CI | **The ONLY unverified corpus surface.** Site and avena-data mirror confirmed consistent again today. HF returns 401 without a token, so three-way agreement is unproven. `push-training-data` confirms it nightly: `"HUGGINGFACE_TOKEN env var not set — payload formatted but not transmitted"`, **144 records built and thrown away** again this morning. | Store the HF write token as a repo secret so nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source ("most popular region for foreign buyers", tax/NIE/mortgage figures). Built to be quoted verbatim by AI assistants. | Either confirm the remaining prose accurate as written, or point me at a source. |
| Bing Webmaster Tools read | Henrik claimed avenaterminal.com 2026-08-13. Indexation-coverage + IndexNow-key views should be readable. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the key shows rejected, say so loudly. No Bing API access, so manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions/3 months, 129 URLs, /compare = 87%. UI-only/no API. | Re-export monthly, next ~2026-09-14, as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | GitHub Actions secret set, so nightly capture works; Vercel lacks it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-30 | **"Every methodology version, model snapshot and dataset batch is fingerprinted with SHA-256" was published on eight surfaces while NOTHING had been fingerprinted since June** | `14eae61`. `integrity_fingerprints` held ONE row, seeded by `scripts/run-pipeline-local.ts` on 2026-06-10 — **the only caller of `recordFingerprint` in the entire repo was that local script.** `integrity_daily_roots` held one row with `zenodo_url` NULL. integrity-roll ran on time for 81 consecutive nights, hashed nothing, logged `merkle_root e3b0c442…b855` (the SHA-256 of the empty string) and reported `success` every time. **Fixed by making the claim TRUE rather than smaller**: `recordDailyArtefacts()` now fingerprints the closed observation batch, `/model-stats.json`, `/open-data/dataset.json` and all six active methodology versions, idempotently by content hash. Also fixed `rollDailyRoot`'s `try { await upsert } catch {}` — supabase-js resolves with `{error}` so the catch was unreachable, and a failed root upsert still tagged every fingerprint as rolled, permanently orphaning them. **Verified live end to end**: 9 artefacts recorded, first real root `38de176c664d8ede…`, second run correctly recorded 0/unchanged 9, and POSTing the published `model-stats.json` to `/api/v1/verify` returns MATCHED with its root. **The Zenodo half remains false and is escalated — see BLOCKED** |
| 2026-08-30 | **Did the 05:10 GitHub backstop (`4fae319`) buy an independent draw?** | **NO — read out negative, the pessimistic outcome I pre-registered.** On 08-29, with both cron entries live, exactly ONE scheduled feed-refresh run existed (08:15:59). The discriminator is the matched offset across two independent workflows: feed-refresh-as-01:37 = +6h38m, IndexNow-at-03:30 = +6h51m — agreeing to 13 minutes. A backstop firing while the primary was dropped would not produce matched offsets. **The queue is delayed repo-wide and uniformly; both entries sit in it.** Stated as an inference from matched offsets, not proof — GitHub's API cannot attribute a run to a cron entry. The entry is harmless and stays; O-61 escalates to the real fix |
| 2026-08-30 | **`9f610fe` — passport health score and liquidity days-to-sell** | **VERIFIED PRECISELY on the deployed surface.** No `health_score`/`days_to_sell_estimate` VALUES; both present only as `not_published` keys with reasons. `energy.epc_rating: null` + `epc_rating_raw: "X"` on N3099V. `comparable_fair_value` and `valuation_gap_pct` both **null, not 0**, on the no-comparable ref N9936. **Near-miss worth keeping: `grep -c` on the field name returned 1 and briefly looked like a failure — it was the disclosure key. A substring check cannot tell a published field from a disclosed-as-withheld one; parse the JSON** |
| 2026-08-30 | **`dc5365d` + `4c34e9b` — the Golden Visa completeness check** | **VERIFIED.** Grep re-run to completion (`\| cat`), ~75 hits read line by line. All resolve to slugs/labels, correct statements, my own fix comments, question-bank entries, or already-escalated items. Also checked and NOT a defect: `/answers/spain-golden-visa-2026` is absent from `answer-slugs.ts` but returns 200 live. **The sweep's real yield was two NEW fabrication routes (O-66, O-67)** |
| 2026-08-29 | **`e415c6b`'s curl fallback — did it ever work on a runner?** | **ANSWERED, NEGATIVE.** First live exercise 08-28 13:19: interstitial at 12,156 bytes, curl retried, refused at 12,176 bytes, gave up after 4 attempts in 37s. **Both clients refused → blocked egress, not a TLS fingerprint.** What worked: the diagnosis was exact and loud, and the 37s give-up beat the old 120-min burn. Risk escalates to O-27 |
| 2026-08-29 | **`/api/v1/liquidity` published a days-to-sell estimate for a sale nobody observed, and `/api/v1/passport` a health score that was ~70% invented constants** | `9f610fe`. Fields REMOVED with `not_published` reasons per the `be4a736`/`03f57ef`/`b9bf525` precedent. **O-26 now 14 for 14** |
| 2026-08-29 | **~15 surfaces still sold Spain's Golden Visa as a live property route** | `dc5365d` + `4c34e9b`. Abolished 2025-04-03 by Organic Law 1/2025. Corrected in place rather than deleted: the question is asked constantly and much of the web still gets it wrong, so being right about it is the thesis applied to a fact |
| 2026-08-28 | **Did the 14:30 watchdog schedule fire, and stay quiet on a healthy day?** | **BOTH VERIFIED.** Exactly one 14:30 row on 08-28, no 12:00 row → Vercel picked up the changed `vercel.json`. Logged `success`, not `error` → no false alarm. **The alarm's firing path is still unproven live** — it has never fired, every time because the book was fresh by sampling time |
| 2026-08-27 | **A nightly that never ran was indistinguishable from one still in flight** | `12df144`. The skip now classifies itself; watchdog deliberately on Vercel's scheduler, the one that did NOT fail |
| 2026-08-26 | **`/api/v1/carbon` published an invented CO2 table, a four-constant ESG score and a phantom 2027 EU rule** | `b9bf525`. **EPC normalisation extracted to `src/lib/epc.ts`** — which `/api/v1/passport` then failed to use until `9f610fe` |
| 2026-08-26 | **Weekly search scan — nothing material** | FAQ rich results deprecated 2026-05-07. **Avena has ZERO exposure:** `gsc-snapshot.ts` and `search-console.ts` query only `date` and `page` |
| 2026-08-25 | **O-16 — "ClaudeBot has barely returned"** | RESOLVED BY OBSERVATION. 7 hits since 08-12 → 2,098 hits / 1,706 distinct property pages on 08-24. Nothing Avena did is provably the cause |
| 2026-08-25 | **`/api/v1/compliance` published an abolished visa programme, an invented EU rule and two literal scores** | `03f57ef`. **Incomplete — see the 08-29 sweep** |
| 2026-08-24 | **`/api/v1/tax` published a fabricated 7%/yr appreciation forecast and a 5.5% default yield** | `fde7883` |
| 2026-08-24 | **`invoked_by` — which signal identifies a scheduled run?** | `vercel-cron-ua` (User-Agent), NOT `vercel-cron-header`. Follow-up O-57 |
| 2026-08-24 | **A run could record its own failures and still log `success`** | `71e19d6`. Known gap O-56 |
| 2026-08-23 | **`/api/detect-events` — dead since 2026-04-11, a fabrication waiting to happen** | `95b90eb`. A 42703 on a nonexistent column was discarded, so an empty baseline made every one of 2,035 units a NEW_LISTING |
| 2026-08-23 | **`generate-briefs` swallowed every failure into `success:true`** | `71e19d6`. The 06-15 stop date still unexplained — O-50 stays open |
| 2026-08-23 | **`b24cffa` — `/api/market-events` served a 133-day-frozen feed undated** | `stale_days 133` → `stale_days 0 / todayCount 3` |
| 2026-08-22 | **O-48 — 24 of 64 scheduled crons wrote nothing to `cron_logs`** | `b4cc217` — coverage 64/64, enforced by `scripts/test-cron-coverage.ts` |
| 2026-08-22 | **O-46 — dead cron or blind one?** | Probe returned `skipped: GITHUB_DATA_TOKEN not set`. Route runs and deliberately does nothing |
| 2026-08-22 | **`score_history` dated every observation one day late** | `ab1f778`. History not rewritten → one-day seam |
| 2026-08-21 | **`/api/v1/arbitrage` published a confidence score built on `Math.random()`** | `be4a736` — fields removed, not replaced. **The precedent this repo now follows for fabricated fields** |
| 2026-08-21 | **The citation agent's resumability fix passed its real test** | `b090f52` — no hung rows |
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
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — still working 08-30 (off-day guard) |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |

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
| 2026-08-28 | `8045239` **the stale-feed alarm was calibrated BELOW an observed-legitimate landing** — `STALE_FEED_ALARM_HOUR_UTC` 11 → 14, watchdog schedule 12:00 → **14:30 UTC** | **Same order as yesterday: prove the quiet path first.** (1) **The new schedule exists at all:** `select to_char(started_at at time zone 'UTC','MM-DD HH24:MI'),status,output_summary->>'overdue' from cron_logs where agent_id='pricing-history' and started_at>='2026-08-28T14:00:00Z' order by started_at` — there must be a **14:30** row and NO 12:00 row. A missing 14:30 row means Vercel did not pick up the changed `vercel.json` and the alarm is dead code again. (2) **No false alarm:** on a healthy day that 14:30 row must read `success` with `snapshotted`≈book and `moves_already_logged`>0 — never `error`. (3) **The alarm path REMAINS UNPROVEN LIVE** — never fired once in two days, both times because the book was fresh by the sampling time. Do not record it as working until a genuinely stale afternoon fires it. **Do not "fix" a quiet alarm by lowering the hour again** — that is exactly the mistake this commit repaired | **PENDING — first 14:30 row is today** |
| 2026-08-28 | **Today's capture, recovered by hand for the second consecutive morning** | Verified end-to-end: dispatch run 33 success (05:37→05:40); feed commit `e832cba` 2,047 listings; route `feed 2047 · snapshotted 2047 · moves_detected 5 · delisted 0 · trusted_prior true · overlap 0.999 · prior_age_days 1 · errors null`; `price_snapshots` 2026-08-28 = **2,047 rows / 2,047 distinct refs** (one clean write); published ledger moves 181 → **186**, exactly the 5 detected | **VERIFIED — the day is captured** |
| 2026-08-28 | **Did the 08-29 nightly fire ON SCHEDULE, and how late?** | This is now a *latency* question, not an existence one (see the O-60 correction). `actions_list` for `feed-refresh.yml`: find the 08-29 `event:"schedule"` run and **record its `run_started_at`**. Landings were 02:35–02:50 for twelve nights, then 11:57 (08-27), then absent at 05:37 on 08-28 when I pre-empted it. **Three consecutive degraded nights = act on O-61, do not just note it again** | **PENDING — tomorrow, before anything else** |
| 2026-08-28 | **Did the avena-data mirror reach v2026-08-28?** | Site published v2026-08-28 (confirmed live today at 05:45). Mirror pulls 07:15 UTC, I check ~05:40, so tomorrow it should read **v2026-08-28**. Today it read v2026-08-27 = the site's previous day = **the normal lag, held again** (third consecutive day the lag rule predicted correctly). Only a mirror still on v2026-08-27 TOMORROW is a genuine stall | **PENDING** |
| 2026-08-14 | `e415c6b` **curl fallback when the feed origin serves a bot challenge** | 08-28's feed pulled clean, but again as a **manual dispatch**. Two of the last three feed pulls were dispatches, so the "consecutive unchallenged scheduled nights" count is now weakly evidenced — the runner-egress path is being exercised less often than the raw day count suggests. Fallback still **proven locally, never exercised on a runner** | still pending — needs a night the challenge actually fires |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-60 | **CORRECTED 2026-08-28 — GitHub did NOT drop the 08-27 workflows. It ran them 10–11 hours late.** Yesterday I recorded both nightlies as "never queued" and wrote that into `12df144`'s commit message. I had read `actions_list` at 05:55, **before the runs existed**. Both were created and both succeeded: `feed-refresh` cron 01:37 → **ran 11:57 UTC (+10h20m)**; `indexnow-nightly` cron 03:30 → **ran 14:31 UTC (+11h01m)**. The failure mode is severe DELAY, not omission | `actions_list` re-read 08-28: feed run 32 `event:"schedule"`, `run_started_at 2026-08-27T11:57:23Z`, conclusion success. IndexNow run 16 `event:"schedule"` 2026-08-27T14:31:07Z, success | **Superseded by O-61.** The correction matters because the alarm threshold was calibrated against "how late can a legitimate night land" — the wrong diagnosis produced the wrong constant, fixed today in `8045239`. Kept here as the record of a wrong call and how it propagated into shipped code | **corrected — see O-61** |
| O-61 | **The GitHub Actions scheduler for this repo degraded sharply on 2026-08-27 and has not recovered.** Twelve nights 08-15..08-26 landed 02:35–02:50 (cron 01:37, ~1h queue). Then 08-27 landed at 11:57 (+10h20m). On 08-28 it had still not fired at 05:37 (+4h) when I dispatched by hand, so its true latency that night is **unknown — I pre-empted the measurement**. IndexNow shows the identical shift (04:05–04:22 for fourteen nights, then 14:31) | `actions_list` both workflows, full run tables read 08-28 | **No day has actually been lost** — 08-27 was captured (late, and by hand) and 08-28 is captured. So this is a reliability risk, not yet a data loss. **Two mitigations, neither taken today.** (a) *Second GitHub `schedule` entry at a different hour* — cheap, no new credential; the workflow is already safe to re-run (`if git diff --staged --quiet` guards both commit steps, `concurrency: feed-refresh` with `cancel-in-progress: false` queues rather than collides). But if the whole repo's schedule queue is degraded, a second entry sits in the same queue. (b) *Drive the feed from a Vercel cron via `repository_dispatch`* — the genuinely reliable fix, since Vercel's scheduler ran a normal 30+ jobs on both degraded nights. **Blocked: needs a GitHub token in Vercel env** (`GITHUB_DATA_TOKEN` is currently unset — see O-46). Raised under NEEDS HENRIK. **Trigger to act without further deliberation: a third consecutive degraded night, or any night where a day is genuinely lost** | **HIGH — the top pipeline risk** |
| O-62 | **The absorption ledger's delisting dates are wrong for 59 of 90 tombstones — and the previously recorded figure (37 of 88) does not reproduce.** Measured today by comparing every `sold_properties.last_seen_date` against `max(price_snapshots.snapshot_date)` for the same ref: **31 correct · 50 one day late · 9 stamped BEHIND the true last sighting** (the relisted units, O-45) · 0 without snapshot coverage · 0 worse than one day | Direct SQL 08-28. Today's two new tombstones prove the mechanism exactly: SP1838 and N9775 both appear in the 08-27 snapshot, are absent from 08-28, and are stamped `last_seen_date = 2026-08-28`. `pricing-history` reported `delisted:0`, so **parse-feed wrote them** — the dual-writer path (O-20) | **This is O-21/O-45, already fixed on branch `odyssey/absorption-ledger-dates` and pending Henrik for 12 days.** New today is the scale: it is a majority of the ledger, not a third of it, and it accrues ~2 rows/day. **Do not re-derive 37/88 — it is superseded.** Directly gates Plan B Release 1 (09-04), which quotes delistings by day | **HIGH — sharpens an existing blocker** |
| O-58 | **The "SHAP explainability" claim is false and it is on BUYER-FACING pages.** `/api/v1/explainable-avm` computes hand-set rule weights (beach 8/4/1 by distance band, `newBuildPct = 6`, developer rating bands) — not Shapley values. "SHAP" appears in ~30 files including `/methodology`, `/avm`, `/institutional`, `/standards/apip`, `/products/csrd-disclosure` | route read 08-25; `src/app/api/v1/explainable-avm/route.ts` lines 25–60 | Removed from `/api/v1/compliance` 08-25 (`03f57ef`) because that surface is mine. The rest is **buyer-facing marketing copy** — fence 2. It is not a fact that *became* false, it was never true, so the "correct a false fact in place" exception is arguable but not clean. **Escalated to NEEDS HENRIK, day 3.** Do not rewrite those pages unilaterally | **high — escalated** |
| O-59 | **The frontier sitemap is diluted: it carries 21-day-old changes alongside today's.** 127 property URLs today (was 134), `lastmod` spread 2026-08-06 → 2026-08-27 (16 entries still dated 08-06, 13 dated 08-07, only 5 dated today) | read live 08-27 | A "frontier" that mixes three-week-old moves with same-day ones is a weaker recrawl signal than one scoped to the last few days. The file is honest and its `lastmod` values are true — this is a design judgement, not a defect. Candidate for the next SEO experiment (narrow the window, read out crawl latency on moved refs), but **do not stack it on the sitemap-ai experiment still reading out 09-25** — same metric, overlapping URLs, running both makes neither readable | medium |
| O-57 | **The rejected-scheduled-run alarm can never fire.** `withCronLog` writes `auth_rejected_platform_run` only when `x-vercel-cron==='1'`, but the real Vercel scheduler is identified by **User-Agent** (`invoked_by='vercel-cron-ua'`), never that header | resolved 08-24 from `cron_logs.invoked_by` | Small and well-scoped: re-key the rejection detection on the UA signal the classifier already recognises. Not urgent — every cron currently logs, so nothing is silently missing; the alarm is a guard for a future auth regression | medium |
| O-50 | **Dead/silent crons — `detect-events` FIXED (`95b90eb`), `generate-briefs` FIXED (`71e19d6`).** STILL UNEXPLAINED: the 2026-06-15 stop date | `intelligence_briefs`/`weekly_alpha`/`digest_issues` all stopped 06-15, ~57 days before the Anthropic credit exhaustion (08-11) | Credit exhaustion explains 08-11 onward, not 06-15. Remaining: `weekly_alpha` (Mon), `digest_issues` (Mon), `regulatory_signals` (08-04), `hf_pushes`. **Two causes; only the second found** | **HIGH** |
| O-56 | **`prometheus` reports a nonzero `error_count` on every run and still logs `success`** — the status derivation does NOT catch it. **Now `error_count:6` (08-28), up from 4** — it errors on everything it harvests (`harvested:6, error_count:6`), so the failure is total, not partial | `cron_logs` 08-23..08-25 `{"harvested":4,…,"error_count":4}`; 08-28 `{"pinged":0,"drafted":0,"harvested":6,"published":0,"error_count":6}` | `deriveCronStatus` recognises a populated `errors[]` or non-empty `error` string; `error_count:6` is a bare number and slips through. **Prefer fixing prometheus to report its errors properly** over teaching the derivation to guess at arbitrary numeric fields. Note `published:0` and `pinged:0` — nothing it produces reaches anywhere, so the blast radius is contained | medium |
| O-53 | **`/api/cron/auto-post` fails on all three daily runs with "Unexpected end of JSON input"** | `cron_logs` 08-24 09:01/13:01/18:03, all `status:'error'`, same message | Not diagnosed. It is the route in O-51 that may be wired to one of Henrik's buttons — **do not touch its auth/behaviour before that is answered**; diagnosing the JSON error is safe and separate | medium |
| O-54 | **`causal-update` reports `indicators_touched:20` while `causal_indicators.last_updated` has not moved since 2026-05-23** | ran 08-24 06:30 (`status error` on `debate_null`, still claims 20 touched); table: 20 rows, one distinct `last_updated`, still 2026-05-23 10:53:08 | The freshness bump is not landing — so the fabricated-freshness danger in O-40 is currently inert. Establish whether the write fails or targets another column | medium |
| O-51 | **`/api/cron/pulse` and `/api/cron/auto-post` have no authentication at all** — both publicly callable; auto-post triggers an outbound post 3×/day | read 08-22; neither contains any auth check | **CLAUDE.md: Henrik starts/stops the X-bot via his own buttons.** If one calls `/api/cron/auto-post`, tightening it breaks his control surface. **Ask before tightening auto-post; pulse can likely just be done** | medium — ask first |
| O-49 | **`citation-agent` reports `lookups_failed` for questions it deliberately deferred** | 08-21 03:01: `lookups_failed:22` alongside `stopped_on_budget:true` | Small: split `deferred` from `failed`. Alarm rule until then: a balance-out 401 shows as `lookups_failed>0` on the FINAL invocation of the day, or `status` never reaching `complete` — never on the first | medium |
| O-45 | **`sold_properties.last_seen_date` never updated when a tombstoned unit returns and leaves again** | **9 rows** now stamped BEHIND their true last sighting (re-measured 08-28, O-62); was five on 08-08 | `530c5ed` makes it visible (publishes `relisted_on`, `still_listed=false`) so the corpus no longer misleads. Correcting the stored date is the O-21 write class → branch `odyssey/absorption-ledger-dates` | medium — disclosed, not hidden |
| O-44 | **`/api/sync-snapshots` writes columns that do not exist, and discards every write result** | route read 08-19; schemas re-confirmed 08-21 | Appears dead-and-broken not harmful. Confirm it writes nothing, then remove it + its browser caller. Client-triggered → NOT covered by the cron coverage test | medium |
| O-40 | **`causal-update` would stamp 92-day-old values as fresh if its bump ever landed** | `runCausalUpdate()` (`src/lib/causal-engine.ts:533-545`) sets `last_updated=now()` on every row, refreshing no value | **DO NOT "fix" by reviving the bump.** Since `061a57c`, `/api/intelligence/regime` derives `age_days`/`stale` from `last_updated`, so a working bump flips nine indicators from honest `stale:true` to fabricated `live:true`. Fix = refresh real values, or delete the bump. Mass-mutates 20 rows → branch. See O-54: the bump is not landing | **high** |
| O-34 | **Nine indicators have no live source at all** — Spain GDP, Costa Blanca YoY, Foreign Buyer Share, Alicante Transactions, New Supply, 10Y Bond, Mortgage Approvals, Brent, Consumer Confidence | `age_days` **96** today | Honestly labelled stale → a coverage gap, not a credibility bug. `/api/v1/apci` reads `causal_indicators` directly | high |
| O-41 | **Two chronically-failing crons, diagnosed but unfixed — both failed again today** | `counterpart-discover` (08-27 03:30): `column properties_registry.market does not exist \| 42703`. `eu-stats-ingest` (08-27 04:15): `istat ... HTTP 500 \| bis: BIS` | counterpart-discover is a real fixable bug in OUR code, but it queries `properties_registry` (frozen 2026-05-24) so fixing the column alone mines a dead snapshot. eu-stats-ingest is upstream — should degrade per-source. Neither feeds `price_snapshots`/`sold_properties` | high — actionable |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants. 12 audited to date, 12 defective — 12 for 12.** | `63f405b`, `9c387fd`, `e6bb569`, `a2bf7d2`, `f00086d`, `genesis/run` (O-42), `061a57c`, `arbitrage` (`be4a736`), `tax` (`fde7883`), `compliance` (`03f57ef`), `carbon` (`b9bf525`) | **Remaining known-defective, unfixed:** `liquidity` + `passport` — `TYPE_FACTORS[...] ?? 50`. **Those two are next**, and they share a fallback so do them together. Fleet-wide greps that keep paying: **`.ilike(` on an indicator key**, **`?? <number>` on a published field**, and **`X \|\| 'DEFAULT'` on a categorical the feed can leave unset** | **high — highest hit rate of anything I have** |
| O-52 | **`/track-record` promises a prediction that cannot arrive** | `predictions` table: 0 rows ever. Generator failed 08-24 07:01 on "credit balance is too low" | Cause = Anthropic balance, not code. Two honest fixes, both Henrik's call. Raised under NEEDS HENRIK | high — escalated |
| O-42 | **`genesis/run` discards its write results and marks the scenario complete regardless** | `src/app/api/v1/genesis/run/route.ts:273-274` | Recurring shape in a scenario simulator | medium |
| O-47 | **`dvf-ingest`'s underlying FK failures still drop rows on nights they occur** | 08-25: 7,168 fetched, 5,384 inserted, `errors:[]` (clean this run). 08-22: two FK-violation chunks | **Run status now honest** (`71e19d6`). The FK failures themselves are untouched. Intermittent — depends on which commune/year batch runs | medium |
| O-39 | **All 90 legacy `market_snapshots` rows have a NULL `snapshot_date`** | queried 08-17 | Harmless to reads (order by `computed_at`). Decide: backfill from `computed_at`, or leave | medium |
| O-35 | **2026-05-23/24 is a cluster date; 2026-06-15 is a second (O-50)** | queried 08-16..08-18; 06-15 found 08-22 | O-40/O-54 explain the `causal_indicators` half. `properties_registry` 05-24 still unexplained. 06-15 is the more urgent | medium |
| O-36 | **`snapshot-archive` computes five market-summary figures it cannot store** | `f00086d`; schema read 08-16 | Additive/allowed; `new_this_week`/`avg_discount` deserve a considered schema. Decide alongside O-37 | medium |
| O-37 | **Nothing writes `market_snapshots.apci`, so APCI `week_change` can never populate** | `/api/v1/apci`; schema 08-16 | An honest null beats the 85-day delta it replaced. Do after O-34/O-40 | medium |
| O-30 | **Unbacked qualitative claims in snippet-answers** | read 2026-08-15 | Rewriting = inventing copy (rule 1); the fence permits correcting a FALSE fact, not replacing an unverifiable one. Needs Henrik or a cited source. **Golden-visa prose is a named suspect since 08-25** | medium |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books | proven by diffing data.json blobs against stored counts | cause fixed; 08-10..08-27 each a single clean write. Six of eight relistings are units tombstoned 08-07 and back 08-08 — almost certainly that artifact | high |
| O-5 | Pre-transliteration accent slugs are indexed. **The "186 of 492" figure is unsourced — see O-33** | `gsc_pages` attribution proven wrong 08-15 | 308 shims confirmed working. Re-derive from `gsc_pages`, never from the old figures | high |
| O-6 | `/compare` dominates our search surface: **87% of Google AI-feature impressions (198/228)** | `gsc_pages`; `docs/gsc-genai/` (Henrik's export) | CompareLedgerPulse (verified 08-15) put the moat on it. Read out 2026-09-14 | high |
| O-33 | **The "492 indexed / 293 /compare / 186 accent" baseline is NOT reproducible from `gsc_pages`** | 08-16: 151 pages; 08-17: 184; 08-20: 287 | **Do not quote 492/293/186 again until re-derived.** O-5 and O-6 both rest on these | **high** |
| O-13 | **PerplexityBot — reframed 08-23, still not a pattern.** One near-full-book sweep 08-23 (296 hits / 284 distinct property pages), having averaged <10/day before; then 2 (08-24), 0 (08-25), 0 (08-26) | `crawler_hits` daily, queried 08-26 | The sweep has not repeated. The old framing ("barely present") remains wrong; so would "it now crawls us weekly". Keep watching, claim neither | medium — reframed |
| O-15 | **Vercel Analytics figures are mostly machines** | crawler ledger | **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in: `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281` | real instances of the recurring shape | `scribe`, six in `b4cc217`, `generate-briefs`, `detect-events`, `dvf-ingest` all handled. These three remain | high |
| O-14 | **AwarioBot is the largest crawler on the site and returns nothing** | crawler ledger; distinct-property count frozen at exactly 1,988 across both measured 7-day windows while it burned 21,950 hits | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`** (three counting the broken O-44) | `parse-feed.js:962,1003` | 08-12..08-27 all effectively one writer. Wants a comment at both ends | medium |
| O-10 | `citation_measurements` still holds fabricated-zero rows (08-02..08-06) + two 0-question rows | table read | cannot distinguish "asked 87, genuinely 0" from "all lookups failed". Never delete. Excluded from every published surface by `loadMeasurements` | medium |
| O-29 | **Lightpanda stopped as abruptly as it started.** Nothing since 08-14 | crawler ledger | a two-day burst, gone. Keep watching | low |
| O-2 | `<html lang="en">` on the three `/no` pages while serving Norwegian | verified 2026-08-09 | per-route fix needs route-group root layouts (huge diff) or a dynamic root layout (kills static gen). hreflang already correct | low |
| O-4 | Zenodo deposit frozen at 2026-04-11 | `zenodo.org/api/records/19520064` | deliberately saved for a quarterly citable version. `schema_version` now 2 → next deposit is a genuine new version | deliberate |

## 3. EXPERIMENTS — changes with a read-out date

Search Console connected 2026-08-09 (`gsc_daily`, `gsc_pages`). Rules: one
meaningful change at a time, a read-out DATE fixed in advance, the result
recorded honestly — "no detectable effect" is a real finding.

Weekly baseline: impressions 430–660/week for three months, clicks 1–10.
Flat. Any claimed effect must clear that noise band to mean anything.

| started | hypothesis | change | metric | read-out | result |
|---|---|---|---|---|---|
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | **2026-09-02 (6 days away)** | pending — confound bounded: spam update 08-18..08-21 |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers | distinct properties fetched per crawler per pass | **2026-08-25 — READ OUT** | **UNMEASURABLE AS DESIGNED.** `crawler_hits` begins 2026-08-11 11:46 — the same day as the change, so no pre-change baseline exists and no causal claim is available. Recorded as a design failure, not a null result. Partial within-post finding (7-day windows 08-11..08-17 vs 08-18..08-24): **AwarioBot's distinct property pages frozen at exactly 1,988 in BOTH windows** while hits fell 28,370→21,950. PetalBot 3,287→1,701; Amazonbot 2,004→1,864; AhrefsBot 2,217→1,174. **No crawler expanded its distinct-page reach.** Feeds O-14 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) | 2026-09-08 (11 days) | pending — **nine complete runs, still no detectable trend.** 08-28 came in at 4.41% (3/68), the joint-lowest of the series, but that is a 2-question move against a 1.47pp quantum — noise, not a decline. Do not read it either way (see baseline) |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | **2026-08-25 — READ OUT** | **POSITIVE, MODEST, NOT SIGNIFICANCE-TESTED.** Matched design: 105 refs with a real price move vs 525 unchanged refs sampled on the SAME dates. Search/AI crawlers only: median time-to-recrawl **79.4h moved vs 92.3h unchanged**, holding across the distribution (p25 33.4 vs 42.9, p75 127.3 vs 143.2). Recrawl coverage 97.1% vs 92.0%. Any-crawler median 20.0h vs 28.2h. ~14% faster; n small, no significance test — **do not quote as a proven effect**. Re-read 2026-09-25 with more moves |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (12 days) | pending |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (13 days) | pending — needs distribution: not listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate; citations of town pages | 2026-09-09 (13 days) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" + GSC impressions | 2026-09-23 (4 weeks) | pending — spam-update confound bounded 08-18..08-21 |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (13 days) | pending — **interim, and still WEAKENING.** OAI-SearchBot 248 hits (08-12) → 94 (08-24) → 81 (08-25). ChatGPT-User steady 34–38/day. The early floor did not hold. **Note an irregularity in the treatment itself: on 08-27 the ping fired TWICE — once at 05:44 from my manual dispatch, then again at 14:31 when the delayed schedule finally landed (O-61; it was not dropped, as I first recorded). On 08-28 it had not fired by 05:37.** So the series carries one doubled day and at least one badly-timed one — do not treat the ping cadence as uniform when reading this out | 
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | **2026-08-26 — READ OUT** | **SPLIT RESULT: the file is fetched, but it does NOT steer the crawlers that matter.** (a) *Discovery* — YES, heavily by ClaudeBot: 65 fetches (08-22..08-26), MORE than `/sitemap.xml` (55). bingbot 27, AhrefsBot 10, PetalBot 4, GPTBot 3, meta-externalagent 1, PerplexityBot 1. **Causal attribution to the robots.txt line FAILS**: GPTBot and PerplexityBot both fetched it on 08-11, one day BEFORE the announcement. (b) *Budget steering* — **NO detectable effect on the major crawlers.** Null expectation from the book: **3.06%** of the live book had a real price move in the prior 7 days. Observed share of property-page hits on recently-moved refs: Googlebot **2.94%** (168/5,724), ClaudeBot **2.89%** (46/1,589), bingbot **1.65%** (25/1,513), GPTBot **1.11%** (1/90) — all AT OR BELOW chance. OAI-SearchBot 3.68% ≈ chance. Two above-chance exceptions, both small-n single-session crawls (hits not independent): meta-externalagent 13.14% (23/175), PerplexityBot 6.30% (16/254). (c) *Sitemap is not at fault* — 127–134 property URLs, all real, `lastmod` true. Filed O-59 on its dilution |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 (18 days) | pending — render verified live 2026-08-15 |

**No new experiment today, deliberately — second day running.** Today's change
(`8045239`) is a pipeline-integrity fix, not an SEO change. O-59 (narrowing the
frontier window) remains the obvious next experiment but must NOT start while
the sitemap-ai recrawl-latency experiment is still reading out on 09-25 — they
touch the same metric on overlapping URL sets, and running both would make
neither readable. **09-25 is the date that unblocks the SEO queue**; if two
consecutive mornings are again spent on the capture pipeline, that is worth
naming in the brief rather than quietly absorbing.

**Next read-outs: 09-02 (5 days), then 09-08 (×2), 09-09 (×3), 09-14, 09-23,
09-25.** Do them on the day; a read-out postponed is an experiment abandoned.

**Weekly search scan: done 2026-08-26 ("nothing material" — FAQ rich-result
deprecation, zero Avena exposure; no confirmed ranking update since the August
spam update). Next due ~2026-09-02.** Not re-run today; the cadence is weekly
and inventing a scan to have something to report is exactly the failure mode.

**CONFOUND — the August 2026 spam update, CLOSED, dated and RE-VERIFIED.**
09:27 US/Pacific 2026-08-18, duration 2d16h → complete ~08-21. Global, all
languages; SpamBrain enforcement of EXISTING policies. Avena has no exposure
(no mass-generated pages, no bought links, no ads). Re-confirmed 2026-08-26
against Google's own status dashboard. Window sits inside the 09-02 and 09-23
read-outs. Record it; do not attribute either way.

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
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | series gap ≤2 days; all numbers day-of from `price_snapshots`/`sold_properties`. **Gate: O-21 must be resolved first** — Release 1 quotes delistings by day and those dates are still known-wrong. Any delisting figure must be `delistings_currently_absent` (**86** today), never the gross count (**90**). O-45 disclosed not fixed — do not quote a tombstone's `last_price` for a relisted unit. **Do NOT source any Release 1 figure from `score_history`** (rows before 2026-08-22 dated a day late). `price_snapshots` is ground truth. **Also note 2026-08-27 AND 2026-08-28 in the provenance: on both days the nightly did not land on time and the capture was recovered by hand at ~05:38 — both days ARE captured and complete, but their capture times are ~3h later than every other day in the window. 08-27's scheduled run also landed independently at 11:57, so that day was observed twice; `price_snapshots` holds one clean write (2,041 rows / 2,041 refs), so the duplication did not reach the data.** **Gate additionally: O-62 — 59 of 90 delisting DATES are wrong, so any by-day delisting figure in Release 1 is currently unquotable, not merely imprecise** |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | Henrik's explicit go |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.58%** (in-sample, n=**2,047**), was 15.60% at n=2,041. **Improved on the nightly book growth, NOT on any change of mine** — my gate run reproduced the workflow's committed file exactly apart from `computed_at`, which I reverted rather than commit as churn | 2026-08-28 | `public/model-stats.json` |
| Live book | **2,047 listings** (+6) | 2026-08-28 | `public/data.json`, feed commit `e832cba` 05:38 UTC (manual recovery, 2nd day running) |
| Sitemap | **2,699 `<loc>`** (+6, matching the book), valid XML, 5 sampled URLs all 200 | 2026-08-28 | `/sitemap.xml`, parsed |
| Frontier sitemap | **122 property URLs** (was 127, was 134 — drifting down) (see O-59) | 2026-08-28 | `/sitemap-frontier.xml`, parsed |
| Corpus version | site **v2026-08-28 (schema 2)**, live and confirmed after deploy · `avena-data` mirror at v2026-08-27 (its normal lag, held a 3rd day) · HF unverified (401 without a token) | 2026-08-28 | site + mirror raw |
| **How to read the mirror correctly** | avena-data's `daily-snapshot.yml` runs **07:15 UTC** and pulls the site artifact. I run at **~05:40 UTC**. So the mirror ALWAYS shows yesterday's version when I look, and today's by ~07:52. **Compare after 08:00 UTC, or the mirror against the site's PREVIOUS day. Do not re-open this as divergence.** Held again 08-27: mirror = v2026-08-26, matching my recorded 08-26 baseline exactly | 2026-08-27 | avena-data raw `market/dataset.json` |
| Ledger (published) | first 2026-08-05, latest 2026-08-28, **24 observation days, 2,143 refs, 186 moves, 90 delistings, 9 relistings, 86 currently absent, 4 still listed**. Cross-section 2,047 live, 67 towns published (k≥5) | 2026-08-28 | `/open-data/dataset.json` |
| **Tombstone integrity — RE-MEASURED, worse than recorded** | Of 90 tombstones: **31 dates correct · 50 one day late · 9 stamped behind the true last sighting** (relisted units). **59 of 90 delisting dates are wrong.** The old "37 of 88" does NOT reproduce — do not quote it (O-62). 4 of 90 are on the market today, so **86 of 90 absent is the figure to quote, never gross 90** | 2026-08-28 | `sold_properties` × `price_snapshots`, direct SQL |
| **Real price moves by day** | 15 (08-14), 4, 1, 0, 15, 10, 10, 18 (08-21), 9, 0, 0, 3, 3, 6 (08-27), **5 (08-28)** | 2026-08-28 | `price_snapshots` / pricing-history |
| **A 0-move day is NOT automatically a failure** | Discriminating fields are `trusted_prior` and `overlap`, never the move count alone. 08-28: `feed 2047 · snapshotted 2047 · moves_detected 5 · delisted 0 · trusted_prior true · overlap 0.999 · prior_age_days 1 · errors null` | 2026-08-28 | pricing-history curl |
| **`delisted:0` from pricing-history does NOT mean no delistings today** | 08-28 the route reported `delisted:0` while the ledger still gained 2 tombstones — **parse-feed wrote them first** (O-20 dual writer), so the route saw them already gone from its own baseline. **Reconcile new tombstones against `sold_properties`, never against the route's `delisted` field alone** | 2026-08-28 | both sources cross-read |
| **HOW THE CAPTURE ACTUALLY RUNS — do not re-open the 02:20 skips as a failure** | The Vercel `pricing-history` cron at **02:20 UTC always skips** (`stale feed — deployed book predates today`) because the feed workflow does not land until ~02:50 at best. That is expected. The REAL capture is the feed-refresh workflow's own step, which **polls `/api/cron/pricing-history` up to 30× at 30s** until the route reports the generation date of the book it just pushed, then asserts `snapshotted>0` and a non-empty diff baseline and **exits 1** otherwise. My morning curl is idempotent belt-and-braces (`moves_already_logged`). The THIRD leg is the watchdog: **as of `8045239` it runs 14:30 UTC** (was 12:00) and turns a still-stale book into a logged `error` + HTTP 500 rather than another quiet `skipped` | 2026-08-28 | `cron_logs` + `.github/workflows/feed-refresh.yml` |
| Snapshot rows by day | 2,035 (08-23), 2,035, 2,036, 2,036, 2,041 (08-27), **2,047 (08-28)** — one clean write per day, rows = distinct refs every day | 2026-08-28 | `price_snapshots` |
| Delistings | **2 new tombstones 08-28** (SP1838, N9775), both written by parse-feed, both dated one day late. Cumulative **90** | 2026-08-28 | `sold_properties` |
| **NIGHTLY RELIABILITY — MEASURE LATENCY, NOT JUST EXISTENCE** | Existence is necessary but insufficient: 08-27's run EXISTED and still nearly cost the day. Record `run_started_at`. feed-refresh scheduled landings: **02:35–02:50 for twelve nights (08-15..08-26), then 11:57 (08-27, +10h20m), then not yet fired at 05:37 on 08-28** when I pre-empted it. IndexNow identical: 04:05–04:22 for fourteen nights, then 14:31 (08-27). Vercel's scheduler unaffected on both nights | 2026-08-28 | `actions_list` (`run_started_at`) |
| Build health | Feed refresh run 33 (dispatch) **success**, all steps, 05:37→05:40. Run 32 (schedule, 08-27 late) success. IndexNow run 16 (schedule, 08-27 late) success. No open PRs. One push to main today (`8045239`); all four gates green locally before push | 2026-08-28 | `actions_list` |
| **CRAWLER LEDGER** | `crawler_hits` **begins 2026-08-11 11:46** (no earlier data — why the robots.txt experiment was unmeasurable). Schema is `(at, crawler, path, ua)` — **there is no `user_agent_family` column**; group by `crawler` and count `distinct path`. Last two full days: **08-26** AwarioBot 5,855 hits/2,276 paths · Googlebot 1,067/940 · meta-externalagent 1,040/**155** · PetalBot 968/923 · ClaudeBot 105/25. **08-27** PetalBot 994/950 · Googlebot 919/854 · DotBot 336 · AhrefsBot 269 · Amazonbot 235 · SemrushBot 232 · bingbot 171 · YandexBot 136 — **AwarioBot and ClaudeBot both absent entirely on 08-27** after AwarioBot's 5,855-hit day. Consistent with the 08-25 lesson: crawler presence swings hard day to day; claim neither presence nor absence as a property | 2026-08-27 | `crawler_hits` grouped by day |
| **Crawl-budget null expectation** | **3.06%** — the share of the live book with a real price move in the prior 7 days. **Any claim that a crawler "targets changed pages" must beat this.** Googlebot/ClaudeBot/bingbot/GPTBot do not | 2026-08-26 | `price_snapshots` × `crawler_hits` |
| **Cron logging coverage** | **64/64 scheduled crons write to `cron_logs`** (65 entries now — `pricing-history` appears twice by design). `invoked_by` on real scheduled runs = **`vercel-cron-ua`** (User-Agent, not the header). GitHub-Actions-triggered routes log `invoked_by=null` (expected) | 2026-08-27 | `b4cc217`, `71e19d6`, live rows |
| **Citation rate, organic (qb-v2) — THE baseline** | **4.41% (3/68) on 08-28.** Nine complete runs: 4.41 (08-10), 4.41, 2.94, 5.88, 8.82, 5.88, 7.35 (08-24), 7.35 (08-26), 4.41 (08-28). Mean **5.72%**, range 2.94–8.82. One hit = 1.47pp, so today's 7.35→4.41 is a **two-question move inside a series that has swung this much repeatedly**. **No detectable trend in either direction. Do not claim one.** | 2026-08-28 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6) on 08-28, 08-26, 08-24, 08-21, 08-19, 08-17**; 83.33% on the three prior. Six consecutive perfect controls — the engine is reaching Perplexity and Avena is retrievable by name | 2026-08-28 | `citation_measurements` |
| Citation run coverage | Mon/Wed/Fri 03:00/03:10/03:20. **Fri 08-28 ran and MEASURED** — 68/68 organic + 6/6 branded, full coverage, so not a balance-out failure. The resumable design worked visibly: 03:00 logged "52/74 measured, 22 left, downstream skipped", 03:20 logged "bank already measured in full". Next: **Mon 08-31** | 2026-08-28 | `cron_logs` + `citation_measurements` |
| **AGENT-ID MAP — the citation engine does NOT log under "citation-agent"** | Cost me a wasted query today. `/api/cron/citation-agent` logs as **`atlas`**; `/api/cron/citation-measure` logs as **`cassandra`**. Querying `cron_logs` for `agent_id ilike '%citation%'` returns ZERO rows and looks exactly like a dead engine. **Query `atlas`/`cassandra`, or go straight to `citation_measurements`** | 2026-08-28 | `cron_logs` distinct `agent_id` |
| Top competitor share (organic) | **idealista 93 · thinkspain 14 · aplaceinthesun 12 · fotocasa 6 · numbeo 5 · rightmove 3.** idealista 85→93 is within its own 83–93 range across the last five runs | 2026-08-28 | `citation_measurements` |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **12 audited, 12 defective** | 2026-08-26 | `find src/app/api/v1 -name route.ts` |
| **Energy data in the book** | **A 347 · B 1,668 · C 5 · 'X' 16** — total 2,036 as measured 08-26 (book has since grown to 2,041; re-derive before quoting). ZERO nulls; `'X'` is a placeholder, not an EPC letter. **Normalisation centralised in `src/lib/epc.ts`; every new surface reading `property.energy` must go through `toEpcLetter`** | 2026-08-26 | `public/data.json`, `/api/v1/carbon` |
| Test coverage added by Odyssey | `scripts/test-open-dataset.ts` 27 · `scripts/test-scribe.ts` 22 · `scripts/test-cron-coverage.ts` **79** | 2026-08-27 | `530c5ed`, `ab1f778`, `b4cc217`, `71e19d6` |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08** — unchanged (O-54) | 2026-08-24 | queried directly |
| APCI macro input age | **97 days** (`as_of` 2026-05-23) — climbing daily until O-34/O-40 resolved | 2026-08-28 | `/api/v1/apci` |
| Cron success rates (worst, among those that log) | `counterpart-discover` failing daily (again 08-28 03:31, empty summary) · `eu-stats-ingest` `status:error`, `errors:2` of 20 indicators but **4,337 rows still upserted** — degrading per-source as it should, the run status is the honest part (again 08-28 04:15) · `auto-post` 3×/day (O-53) · `prometheus` `error_count:6` (O-56) · `weekly-alpha`, `digest`, `generate-briefs`, `predictions/generate`, `pulse` all on the Anthropic balance. **`sync-feeds` also carries a per-source `Feed HTTP 403` on casasapo.pt (PT)** and still logs success — worth a look, but it is not a Spanish source and feeds nothing published | 2026-08-28 | `cron_logs` grouped |
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

**Correction, 2026-08-27 (NEW, and the important one):** every "N clean nights
in a row" I have reported was derived from the CONCLUSIONS of the workflow runs
that exist. That measurement is structurally blind to the failure that actually
happened today: a run that was never created has no conclusion to be green or
red, so it does not appear, and its absence read as silence rather than as a
gap. The "thirteen clean scheduled nights" claim was true but measured the
wrong thing, and the same blindness would have hidden a dropped night on any
earlier date. **Reliability of a scheduled job must be measured by the EXISTENCE
of a run per expected day, then its conclusion — never conclusions alone.**
BASELINES now records existence explicitly.

**Lesson, 2026-08-26 (kept):** the frontier read-out only produced a real answer
because I computed a **null expectation** (3.06%) before interpreting the
observed shares. ClaudeBot at 2.89% "on changed pages" reads as success until
you know chance is 3.06%. **Never report a targeting/concentration rate without
the base rate it must beat.**

**Lesson, 2026-08-26 (kept):** the carbon bug survived the compliance fix purely
because the two routes duplicated the EPC logic instead of sharing it. **When a
defect is in a helper that has been copy-pasted, fixing the instance is half the
job — grep for the pattern and centralise it.**

**Correction, 2026-08-28 (NEW, and the important one):** I reported that GitHub
had **dropped** both nightly workflows on 08-27 — "no workflow run was created,
not a failure, not a delay: never queued" — and I wrote that into O-60, the
brief, and permanently into `12df144`'s commit message. It was wrong. Both runs
existed and both succeeded; I had read `actions_list` at 05:55, hours before
they fired at 11:57 and 14:31. **The absence I measured was my own earliness.**
Yesterday's own correction told me to measure EXISTENCE rather than conclusions
— and I did, then read the existence check too early and treated a
not-yet-created run as a never-created one. **A negative observation is only as
strong as the window it was taken over: before concluding a scheduled thing did
not happen, confirm the window in which it still could.** The concrete cost was
not embarrassment: the alarm threshold I shipped the same day was calibrated
from "the latest a legitimate night has landed", the wrong diagnosis put that
constant at 11:00, and the real answer was 11:57 — so the wrong finding shipped
a wrong constant that would have produced false alarms (fixed today, `8045239`).

**Correction, 2026-08-28 (kept):** the "37 of 88 tombstones dated one day late"
figure does not reproduce. Measured directly against `price_snapshots` today:
**50 of 90 one day late, 9 stamped behind the true last sighting, 31 correct.**
Nearly two thirds of the ledger's delisting dates are wrong, not a third. **Do
not quote 37/88 again** — and note the measurement method (compare each
`sold_properties.last_seen_date` against `max(price_snapshots.snapshot_date)`
for that ref), because the old figure has no recorded method, which is probably
why it drifted.

**Lesson, 2026-08-28 (new):** a threshold calibrated against "the worst thing
observed so far" is a threshold with no margin, and the worst case will be
beaten — mine was beaten the very next night. When a constant encodes an
empirical maximum, either leave real headroom above it or make the code degrade
safely when it is exceeded. Record the observations the constant is calibrated
against, in the code, so the next person can see what would justify moving it.

**Lesson, 2026-08-27 (new):** the detector that could have caught today's
failure already existed and ran on time — `pricing-history` knew the book was
stale at 02:20 and said so. It just said it in the same words it uses on a
perfectly healthy night. **A monitor that cannot distinguish "not yet" from
"never" is not a monitor.** Six `skipped` rows were written this morning
(02:20, 05:36, 05:38×2, 05:39×2) while today's capture had not happened, and
every one of them looked exactly like a normal morning. When adding a guard,
the question is not "does it detect the bad state" but "does its output differ
between the good and bad state".

**Lesson, 2026-08-27 (new):** put the watchdog on a different scheduler than
the thing it watches. Today's evidence made that concrete rather than
theoretical: GitHub's scheduler dropped both nightly workflows while Vercel's
ran a normal 32 jobs. A GitHub-Actions watchdog for a GitHub-Actions cron would
have been dropped in the same sweep.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **THE ANTHROPIC API BALANCE IS EXHAUSTED — degrading six jobs** (standing, day 6) | `predictions/generate`, `digest`, `generate-briefs`, `weekly-alpha` error on "credit balance is too low"; `delphi-run` and `plab-run` skip the two Claude panelists and score only Perplexity Sonar; `pulse` fails HTTP 500. This is why `/track-record` (O-52) promises a prediction that cannot arrive. | **A decision, not a task: top up or don't.** If you top up, `predictions/generate` starts publishing LLM-authored forecasts on `/track-record` — the class of surface that produced the `precursor-scan` fabrication, so **say so explicitly if you want that live**. If you don't, tell me and I'll make the affected routes report `skipped` with a stated reason instead of failing nightly. **Note the quieter harm: DELPHI and PLAB publish a "panel" consensus that is now a single model.** |
| **BRANCH AWAITING APPROVAL: `odyssey/absorption-ledger-dates`** (`d182cd6`) — **the ask is now bigger than when I first made it** | Re-measured today: **59 of 90 tombstone dates are wrong** (50 one day late, 9 stamped behind the true last sighting), not the 37 of 88 I reported. It accrues ~2 rows/day — today's two, SP1838 and N9775, both last appear in the 08-27 snapshot and are both stamped 08-28. Mirrored to avena-data + Hugging Face; Plan B Release 1 (09-04 data close) quotes delistings by day. **Twelfth day pending.** | **Three sentences, unchanged: (1) parse-feed now derives the real last-seen date from `price_snapshots` instead of stamping today, and `buildLedger` counts a delisting on the first observation day AFTER it — the two must land together. (2) `scripts/backfill-tombstone-dates.sql` corrects the historical rows; its read-only dry run moves each back exactly one day and touches nothing else. (3) Branch-only because it mutates an existing column on `sold_properties`, the one table here that cannot be rebuilt.** All four gates pass on the branch. No conflict with anything merged since. **Note the backfill count needs re-running against today's 50 before it is applied — the branch was written when the figure was 37.** |
| **NEW — GitHub's scheduler is running this repo's nightlies 10–11 hours late, and I cannot fix it without a token** (O-61, day 1) | Twelve nights landed 02:35–02:50; 08-27 landed 11:57, 08-28 had not fired at all by 05:37 when I dispatched it by hand. Both mornings the capture was saved manually. **No day has been lost yet** — but the capture is currently depending on me being awake, which is not a system. Vercel's scheduler ran normally on both nights. | **One of two, your call. (a) Cheap, no credential: I add a SECOND GitHub `schedule` entry at a different hour as a backstop — the workflow is already safe to re-run (it commits only if the data changed, and concurrent runs queue rather than collide). Weakness: if the whole repo's schedule queue is degraded, both entries sit in it. (b) The real fix: drive the feed from a Vercel cron via `repository_dispatch`, since Vercel's scheduler has been reliable throughout. That needs a GitHub token with `repo` scope in Vercel env — `GITHUB_DATA_TOKEN` is currently unset.** Say which and I ship it. If I see a third consecutive degraded night I will ship (a) on my own judgement, since it needs nothing from you and no day should hang on my dispatch. |
| **"SHAP explainability" is claimed on buyer-facing pages and it is not true** (O-58, day 3) | `/api/v1/explainable-avm` computes hand-set rule weights — beach proximity 8/4/1% by distance band, a flat 6% new-build premium, developer-rating bands. Those are not Shapley values; SHAP is a specific algorithm we do not run. The claim appears on `/methodology`, `/avm`, `/institutional`, `/standards/apip`, `/products/csrd-disclosure`. | **Your call on the copy.** Two clean options: (a) I change "SHAP" to "rule-based feature attributions" on those pages — smallest possible edit, no layout or design change; or (b) you want actual SHAP, which is real work on the AVM and I'd scope it first. **I am not touching buyer-facing copy without your yes.** |
| **`/track-record` promises a prediction that cannot arrive** (O-52) | Live page says "The first call lands on the next prediction cycle"; `predictions` table has 0 rows ever. Cause proven: Anthropic balance. This is the page whose whole pitch is "we publish the misses too" — the worst surface to carry an unkept promise. | **Answer the credit question above and this resolves with it.** Top up + want forecasts → it fixes itself. If not, I need your say-so to correct the copy. |
| **`/api/cron/auto-post` is publicly callable with no authentication** (O-51) | Anyone who finds the URL can trigger an outbound post, 3× scheduled daily. `pulse` has the same hole. Separately, auto-post fails all three daily runs with "Unexpected end of JSON input" (O-53). | **One question, unchanged: does any of your buttons call `/api/cron/auto-post` directly?** If not, I add `isAuthorizedCron` to both and the hole closes. If yes, tell me which and I keep that path open. |
| **RedSP is challenging GitHub Actions egress** (O-27) | ROOT CAUSE PROVEN: their provider serves an openresty JS interstitial instead of the feed. Killed 5 of 9 nightlies. The curl fallback gets through on a client-fingerprint difference — if their guard starts challenging curl too, every night is lost until someone notices. **Fourteen clean runs (08-14..08-27) mean the fallback has still never been exercised on a runner.** | Either (a) ask RedSP to allow-list GitHub Actions egress for the feed URL (the clean fix; reasonable — Avena is a paying consumer), or (b) approve moving the feed step to a runner with a stable IP RedSP can allow-list. |
| `HF_TOKEN` in CI | **The ONLY unverified corpus surface.** Site and avena-data mirror confirmed consistent again today. HF returns 401 without a token, so three-way agreement is unproven. `push-training-data` confirms it nightly (ran 05:02 today, success): `"HUGGINGFACE_TOKEN env var not set — payload formatted but not transmitted"`, ~144 records built and thrown away every day. | Store the HF write token as a repo secret so nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source ("most popular region for foreign buyers", tax/NIE/mortgage/golden-visa figures). Built to be quoted verbatim by AI assistants. Since the Golden Visa real-estate route was abolished 2025-04-03, any golden-visa prose on those surfaces is a specific suspect. | Either confirm accurate as written, or point me at a source. |
| Bing Webmaster Tools read | Henrik claimed avenaterminal.com 2026-08-13. Indexation-coverage + IndexNow-key views should be readable. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the key shows rejected, say so loudly. No Bing API access, so manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions/3 months, 129 URLs, /compare = 87%. UI-only/no API. | Re-export monthly, next ~2026-09-14, as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | GitHub Actions secret set, so nightly capture works; Vercel lacks it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-28 | **Did yesterday's watchdog schedule fire, and does it stay quiet on a healthy day?** (the two checks that had to pass before the alarm could be trusted) | **BOTH VERIFIED.** The 12:00 UTC schedule fired — two rows on 08-27 — so Vercel picked up the new `vercel.json` entry and the branch was reachable, not dead code. And on a healthy day it logged **`success`** (snapshotted 2041, `moves_already_logged:6`), not `error` — no false alarm. Today's 02:20 row also classified correctly: `skipped`, `overdue:false`, `feed_age_days:1`. **What the verification also exposed:** it stayed quiet by three minutes, because the feed landed 11:57 and the watchdog sampled 12:00 — so the threshold itself was wrong even though its output was right. Recalibrated the same day (`8045239`, 11→14, watchdog 12:00→14:30). The alarm's *firing* path remains unproven live |
| 2026-08-27 | **A nightly that never ran was indistinguishable from one still in flight** | `12df144`. GitHub dropped both nightly workflows; `pricing-history` correctly refused the stale book but reported it with the same `ok:true, skipped:true` it uses on a healthy 02:20 run, so the missed capture was invisible. The refusal is untouched — banking a stale book is the worse failure. The skip now classifies itself: 1 day old before 11:00 UTC stays `skipped` (the nightly legitimately lands 03:29–10:23); 1 day old at/after 11:00, or ≥2 days at any hour, logs `error` with `feed_age_days`/`overdue` and returns 500. A second Vercel cron at 12:00 UTC makes the branch reachable — a dead alarm is worse than none — deliberately on Vercel's scheduler, the one that did NOT fail. Capture itself recovered by hand: 2,041 snapshotted, 6 real moves, ledger 175 → 181. **Alarm path still unproven live (see VERIFY TODAY)** |
| 2026-08-26 | **`/api/v1/carbon` published an invented CO2 table, a four-constant ESG score and a phantom 2027 EU rule** | `b9bf525`. `ENERGY_CO2` mapped EPC letters to literal kgCO2/m²·yr (A=15…G=190) — no such universal mapping exists. `esg_score` summed an invented letter scale + `newBuildBonus=15` + pool penalty + `statusBonus=5`; `new_build_compliant` was literal `true` for all 2,036; `eu_2027_*` tested class C against a rule that does not exist. `ENERGY_SCORE[p.energy \|\| 'D'] \|\| 45` coerced the 16 `'X'` listings to D-grade, so carbon published `9.4 t/yr` for N3099V the same day compliance published `epc_rating:null` for it. Fields REMOVED with `not_published` reasons, not re-guessed. **EPC normalisation extracted to `src/lib/epc.ts`.** Re-verified live 2026-08-27: `epc_rating:null` + `epc_rating_raw:"X"`, all removed fields still absent, aggregate `rated 2020 / unrecognised 16`, dist `A 347 · B 1668 · C 5` |
| 2026-08-26 | **Weekly search scan — nothing material.** | FAQ rich results deprecated 2026-05-07 and Search Console API FAQ data removed August 2026 — a silent-NULL risk for automated dashboards. **Avena has ZERO exposure:** `scripts/gsc-snapshot.ts` and `src/lib/search-console.ts` query only `date` and `page`, never `searchAppearance`. FAQPage JSON-LD (16 files) stays: Google says unused structured data is harmless, and LLM crawlers still parse it. No confirmed Google ranking update since the August 2026 spam update |
| 2026-08-25 | **O-16 — "ClaudeBot has barely returned"** | RESOLVED BY OBSERVATION, not by a fix. ClaudeBot went from 7 hits since 08-12 to 2,098 hits / 1,706 distinct property pages on 08-24 — a full-book crawl. Nothing Avena did is provably the cause |
| 2026-08-25 | **`/api/v1/compliance` published an abolished visa programme, an invented EU rule and two literal scores** | `03f57ef`. Golden Visa `eligible: pf>=500000` (abolished 2025-04-03, Organic Law 1/2025); `eu_2030_compliant` tested a rule the EPBD does not impose; `carbonScore=70`/`aiActScore=90` carried 35% of the score; `energy \|\| 'D'` fabricated ratings for the 16 `'X'` listings. Composite score REMOVED rather than re-guessed |
| 2026-08-24 | **`/api/v1/tax` published a fabricated 7%/yr appreciation forecast and a 5.5% default yield** | `fde7883`. Appreciation is now a caller-supplied scenario or null with a disclosure; yield resolves property-derived → caller-supplied → null with `yield_source` |
| 2026-08-24 | **`invoked_by` — which signal identifies a scheduled run?** | Resolved from live rows: `vercel-cron-ua` (User-Agent), NOT `vercel-cron-header`. Follow-up O-57 |
| 2026-08-24 | **A run could record its own failures and still log `success`** | `71e19d6` verified on the unattended scheduler. Known gap O-56 |
| 2026-08-24 | **detect-events revived (scheduled-run confirmation)** | `95b90eb` — the 08-23 07:31 scheduled run wrote exactly 3 events, plausibility ceiling held |
| 2026-08-23 | **`/api/detect-events` — dead since 2026-04-11, a fabrication waiting to happen** | `95b90eb`. A 42703 on a nonexistent `score` column was discarded, so an empty baseline Map made every one of 2,035 units a NEW_LISTING |
| 2026-08-23 | **`generate-briefs` swallowed every failure into `success:true`** | `71e19d6`. The 06-15 stop date still unexplained — O-50 stays open |
| 2026-08-23 | **`b24cffa` — `/api/market-events` served a 133-day-frozen feed undated** | Verified twice: `stale_days 133` → `stale_days 0 / todayCount 3` |
| 2026-08-22 | **O-48 — 24 of 64 scheduled crons wrote nothing to `cron_logs`** | `b4cc217` — coverage 64/64, enforced by `scripts/test-cron-coverage.ts` |
| 2026-08-22 | **O-46 — dead cron or blind one?** | Probe returned `skipped: GITHUB_DATA_TOKEN not set`. Route runs and deliberately does nothing |
| 2026-08-22 | **`score_history` dated every observation one day late** | `ab1f778` — verified on the 08-22 nightly. History not rewritten → one-day seam |
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
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — still working 08-26 (off-day guard) |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |

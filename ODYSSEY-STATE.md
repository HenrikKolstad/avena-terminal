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
| 2026-08-24 | `fde7883` **/api/v1/tax stopped asserting a 7%/yr forecast and a 5.5% default yield** | Curl the route two ways after deploy. (a) `POST /api/v1/tax {"purchase_price":300000,"buyer_nationality":"GB","intended_use":"rental"}` → `exit_projection.projected_exit_price` must be **null** with the disclosure note, `rental_analysis.estimated_gross_yield` must be **null** (NOT "5.5%"). (b) add `"annual_appreciation_pct":3,"gross_yield_pct":5` → `projected_exit_price` must be **403175** (compound 300000·1.03^10), `appreciation_source:"caller_supplied_scenario"`. If either still shows 7%/5.5% or a non-null exit without an input, the deploy did not take | **pending — read tomorrow** |
| 2026-08-23 | `71e19d6` **`invoked_by`** | **RESOLVED — see correction below. The scheduled runs log `invoked_by='vercel-cron-ua'`, a THIRD value.** Neither of my two predicted outcomes. The Vercel scheduler is identifiable, but by **User-Agent**, not the `x-vercel-cron` header. detect-events logged at 07:31 via `vercel-cron-ua` → the "never invoked / plan cap" theory is dead too | **VERIFIED — moved to CLOSED** |
| 2026-08-23 | `71e19d6` **status honesty: a 2xx with populated `errors[]` is now an error** | **VERIFIED on the unattended scheduler.** `causal-update` (06:31) and `predictions-generate` (07:01) both flipped `success`→`error` on 08-23. `dvf-ingest` (04:30 on 08-24) had `errors:[]` this run and correctly logged `success` — the derivation reaching all three is proven by the two that flipped | **VERIFIED — moved to CLOSED** |
| 2026-08-23 | `95b90eb` **detect-events revived** | **VERIFIED on the unattended scheduler.** 07:31 scheduled run via `vercel-cron-ua`: `events_written 3, new_listings 1, price_moves 0, score_changes 2, trusted_prior true, overlap 1, errors null`. Plausibility ceiling held; new_listings single digit as required | **VERIFIED — moved to CLOSED** |
| 2026-08-14 | `e415c6b` **curl fallback when the feed origin serves a bot challenge** | 08-24 nightly clean — **eleven consecutive unchallenged scheduled nights** (08-14..08-24). Fallback still **proven locally, never exercised on a GitHub runner** | still pending — needs a night the challenge actually fires |

**CORRECTION — the `invoked_by` question is answered, and my 08-23 self-correction
was itself too pessimistic.** On 08-23 I wrote two possible outcomes for the
scheduled runs: (a) `invoked_by='direct'` (scheduler sends no recognised signal)
or (b) `invoked_by='vercel-cron-header'`. The actual value on every real
scheduled run (delphi-run, causal-update, pulse, predictions-generate,
detect-events, generate-briefs, predictions-verify, auto-post,
sync-regulatory-signals, integrity-roll, developer-monitor, snapshot-archive,
social-delphi, github-snapshot) is **`vercel-cron-ua`** — my classifier
recognises the run from the Vercel cron **User-Agent**. So: the scheduler DOES
send a recognisable signal (contra outcome a as I worded it), just not the
`x-vercel-cron` header (consistent with the spirit of my 71e19d6 inference).
And detect-events logging at 07:31 proves it IS invoked on schedule — the
"64-cron plan cap silently dropping it" alternative is **dead**. What remains
(now O-57): the rejected-run alarm still keys on `x-vercel-cron==='1'`, which
the real scheduler never sends, so that alarm cannot fire on a genuine rejected
scheduled run. Now actionable because I know the real signal is the UA.

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-57 | **The rejected-scheduled-run alarm can never fire.** The `withCronLog` wrapper writes `auth_rejected_platform_run` only when `x-vercel-cron==='1'`, but the real Vercel scheduler is identified by **User-Agent** (`invoked_by='vercel-cron-ua'`), never that header | resolved 08-24 from `cron_logs.invoked_by` on the 08-23 scheduled runs | Small and now well-scoped: re-key the rejection detection on the same UA signal the classifier already recognises. Not urgent — every cron currently logs, so nothing is silently missing today; the alarm is a belt-and-braces guard for a future auth regression | medium |
| O-50 | **Dead/silent crons — `detect-events` FIXED (`95b90eb`), `generate-briefs` FIXED (`71e19d6`).** STILL UNEXPLAINED: the 2026-06-15 stop date | 08-22 08:00 generate-briefs logged `success, briefs_generated:0` while failing all three signals; `intelligence_briefs`/`weekly_alpha`/`digest_issues` all stopped 06-15, ~57 days before the Anthropic credit exhaustion (08-11) | Credit exhaustion explains 08-11 onward, not 06-15. Remaining unexplained: `weekly_alpha` (Mon), `digest_issues` (Mon), `regulatory_signals` (08-04), `hf_pushes` (0 rows ever though `push-training-data` logs success — check what "success" means there). **Two causes; only the second found** | **HIGH** |
| O-56 | **`prometheus` reports `error_count:4` on all four daily runs and still logs `success`** — the new status derivation does NOT catch it | `cron_logs` 08-23 02:00/08:00/14:00/20:00 and 08-24 02:00, all `{"harvested":4,...,"error_count":4}` | `deriveCronStatus` recognises a populated `errors[]` or non-empty `error` string; `error_count:4` is a bare number and slips through. **Prefer fixing prometheus to report its errors properly** over teaching the derivation to guess at arbitrary numeric fields | medium |
| O-53 | **`/api/cron/auto-post` fails on all three daily runs with "Unexpected end of JSON input"** | `cron_logs` 08-23 09:01/13:01/18:01, all `status:'error'`, same message | Not diagnosed yet. Note it is the route in O-51 that may be wired to one of Henrik's buttons — **do not touch its auth/behaviour before that question is answered**; diagnosing the JSON error is safe and separate | medium |
| O-54 | **`causal-update` reports `indicators_touched:20` while `causal_indicators.last_updated` has not moved since 2026-05-23** | ran 08-23 06:31 (now correctly `status error` on `debate_null`, but still claims 20 touched in output); table today: 20 rows, one distinct `last_updated`, still 2026-05-23 10:53:08 | The freshness bump is not landing — so the fabricated-freshness danger in O-40 is currently inert. Establish whether the write fails or targets another column | medium |
| O-51 | **`/api/cron/pulse` and `/api/cron/auto-post` have no authentication at all** — both publicly callable; auto-post triggers an outbound post 3×/day | read 08-22; neither contains any auth check | **CLAUDE.md: Henrik starts/stops the X-bot via his own buttons.** If one calls `/api/cron/auto-post`, tightening it breaks his control surface. **Ask before tightening auto-post; pulse can likely just be done** | medium — ask first |
| O-49 | **`citation-agent` reports `lookups_failed` for questions it deliberately deferred** | 08-21 03:01: `lookups_failed:22` alongside `stopped_on_budget:true` | Small: split `deferred` from `failed`. Alarm rule until then: a balance-out 401 shows as `lookups_failed>0` on the FINAL invocation of the day, or `status` never reaching `complete` — never on the first | medium |
| O-45 | **`sold_properties.last_seen_date` never updated when a tombstoned unit returns and leaves again** | five units stamped `last_seen 2026-08-07`, observed live 08-08 | `530c5ed` makes it visible (publishes `relisted_on`, `still_listed=false`) so the corpus no longer misleads. Correcting the stored date is the O-21 write class → branch `odyssey/absorption-ledger-dates` | medium — disclosed, not hidden |
| O-44 | **`/api/sync-snapshots` writes columns that do not exist, and discards every write result** | route read 08-19; schemas re-confirmed 08-21 | Appears dead-and-broken not harmful. Confirm it writes nothing, then remove it + its browser caller. Client-triggered → NOT covered by the cron coverage test | medium |
| O-40 | **`causal-update` would stamp 92-day-old values as fresh if its bump ever landed** | `runCausalUpdate()` (`src/lib/causal-engine.ts:533-545`) sets `last_updated=now()` on every row, refreshing no value | **DO NOT "fix" by reviving the bump.** Since `061a57c`, `/api/intelligence/regime` derives `age_days`/`stale` from `last_updated`, so a working bump flips nine indicators from honest `stale:true` to fabricated `live:true`. Fix = refresh real values, or delete the bump. Mass-mutates 20 rows → branch. See O-54: the bump is not landing | **high** |
| O-34 | **Nine indicators have no live source at all** — Spain GDP, Costa Blanca YoY, Foreign Buyer Share, Alicante Transactions, New Supply, 10Y Bond, Mortgage Approvals, Brent, Consumer Confidence | `age_days` **93** today | Honestly labelled stale → a coverage gap, not a credibility bug. `/api/v1/apci` reads `causal_indicators` directly | high |
| O-41 | **Two chronically-failing crons, diagnosed but unfixed** | `counterpart-discover` (failed 08-24 03:30): `column properties_registry.market does not exist \| 42703`. `eu-stats-ingest` (failed 08-24 04:15): ISTAT HTTP error | counterpart-discover is a real fixable bug in OUR code, but it queries `properties_registry` (frozen 2026-05-24) so fixing the column alone mines a dead snapshot. eu-stats-ingest is upstream (ISTAT/BIS) — should degrade per-source. Neither feeds `price_snapshots`/`sold_properties` | high — actionable |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants. 10 audited to date, 10 defective — 10 for 10.** `tax` FIXED today (`fde7883`) | `63f405b`, `9c387fd`, `e6bb569`, `a2bf7d2`, `f00086d`, `genesis/run` (O-42), `061a57c`, `arbitrage` (`be4a736`), `tax` (`fde7883`) | **Remaining known-defective, unfixed:** `compliance` — `carbonScore=70`, `aiActScore=90` literal published scores, plus `?? 3200`/`?? 30`; `carbon` — `newBuildBonus=15`; `liquidity`+`passport` — `TYPE_FACTORS[...] ?? 50`. **`compliance` is the one to do next** (literal published ESG scores). Fleet-wide: grep for **`.ilike(` on an indicator/series key** | **high — highest hit rate of anything I have** |
| O-52 | **`/track-record` promises a prediction that cannot arrive** | `predictions` table: 0 rows ever. Generator failed 08-23 07:00 with `errors:["claude_parse: 400 … credit balance is too low …"]` | Cause = Anthropic balance, not code. Two honest fixes, both Henrik's call (top up + publish LLM forecasts, or correct the copy). Raised under NEEDS HENRIK | high — escalated |
| O-42 | **`genesis/run` discards its write results and marks the scenario complete regardless** | `src/app/api/v1/genesis/run/route.ts:273-274` | Recurring shape in a scenario simulator | medium |
| O-47 | **`dvf-ingest`'s underlying FK failures still drop rows on nights they occur** | 08-22: 3,504 fetched, 2,569 inserted, two FK-violation chunks. 08-24: 2,750 fetched, 2,169 inserted, `errors:[]` (clean this run) | **Run status now honest** (`71e19d6` — 2xx + populated `errors[]` = error). The FK failures themselves are untouched. Intermittent — depends on which commune/year batch runs | medium |
| O-39 | **All 90 legacy `market_snapshots` rows have a NULL `snapshot_date`** | queried 08-17 | Harmless to reads (order by `computed_at`). Decide: backfill from `computed_at`, or leave | medium |
| O-35 | **2026-05-23/24 is a cluster date; 2026-06-15 is a second (O-50)** | queried 08-16..08-18; 06-15 found 08-22 | O-40/O-54 explain the `causal_indicators` half. `properties_registry` 05-24 still unexplained. 06-15 is the more urgent | medium |
| O-36 | **`snapshot-archive` computes five market-summary figures it cannot store** | `f00086d`; schema read 08-16 | Additive/allowed; `new_this_week`/`avg_discount` deserve a considered schema. Decide alongside O-37 | medium |
| O-37 | **Nothing writes `market_snapshots.apci`, so APCI `week_change` can never populate** | `/api/v1/apci`; schema 08-16 | An honest null beats the 85-day delta it replaced. Do after O-34/O-40 | medium |
| O-30 | **Unbacked qualitative claims in snippet-answers** | read 2026-08-15 | Rewriting = inventing copy (rule 1); the fence permits correcting a FALSE fact, not replacing an unverifiable one. Needs Henrik or a cited source | medium |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books | proven by diffing data.json blobs against stored counts | cause fixed; 08-10..08-24 each a single clean write. Six of eight relistings are units tombstoned 08-07 and back 08-08 — almost certainly that artifact | high |
| O-5 | Pre-transliteration accent slugs are indexed. **The "186 of 492" figure is unsourced — see O-33** | `gsc_pages` attribution proven wrong 08-15 | 308 shims confirmed working. Re-derive from `gsc_pages`, never from the old figures | high |
| O-6 | `/compare` dominates our search surface: **87% of Google AI-feature impressions (198/228)** | `gsc_pages`; `docs/gsc-genai/` (Henrik's export) | CompareLedgerPulse (verified 08-15) put the moat on it. Read out 2026-09-14 | high |
| O-33 | **The "492 indexed / 293 /compare / 186 accent" baseline is NOT reproducible from `gsc_pages`** | 08-16: 151 pages; 08-17: 184; 08-20: 287 | **Do not quote 492/293/186 again until re-derived.** O-5 and O-6 both rest on these | **high** |
| O-13 | **PerplexityBot is barely present** | crawler ledger | cause unknown, must not be guessed. Not a robots.txt problem — OAI-SearchBot thrives under the same file | high |
| O-15 | **Vercel Analytics figures are mostly machines** | crawler ledger | **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in: `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281` | real instances of the recurring shape | `scribe`, six in `b4cc217`, `generate-briefs`, `detect-events`, `dvf-ingest` (via status derivation) all handled. These three remain | high |
| O-16 | **ClaudeBot has barely returned.** 7 hits since 08-12 | crawler ledger | effectively absent. Acting requires knowing why | medium |
| O-14 | **AwarioBot is the largest crawler on the site and returns nothing** | crawler ledger | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`** (three counting the broken O-44) | `parse-feed.js:962,1003` | 08-12..08-24 all effectively one writer. detect-events no longer a fourth. Wants a comment at both ends | medium |
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
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | 2026-09-02 (9 days away) | pending — confound bounded: spam update 08-18..08-21 |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers | distinct properties fetched per crawler per pass | **2026-08-25 (1 day away)** | pending — **signal firmly negative for AwarioBot**: distinct paths frozen 8+ days while hits grew. Read out the other 13 tomorrow |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) | 2026-09-08 (2 weeks) | pending — **seven complete runs, still no detectable trend** (see baseline) |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | **2026-08-25 (1 day away)** | pending — readable from `crawler_hits` |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (2 weeks) | pending |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (2 weeks) | pending — needs distribution: not listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate; citations of town pages | 2026-09-09 (2 weeks) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" + GSC impressions | 2026-09-23 (4 weeks) | pending — spam-update confound bounded 08-18..08-21 |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (2 weeks) | pending — **interim.** Floor held ~13 days at 20–40× the pre-ping baseline of 2/day |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | **2026-08-26 (2 days away)** | pending — **one large single-day signal, not a trend** (GPTBot 08-19 deep crawl 217 hits/211 paths). On 08-26 check: does GPTBot repeat, and do the paths skew to frontier URLs? ClaudeBot 7, meta-externalagent 4 — both still absent |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 (3 weeks) | pending — render verified live 2026-08-15 |

**No new experiment today, deliberately.** Today's only code change (`fde7883`)
was a defect fix — removing a fabricated appreciation forecast and yield default
from a machine surface. It is not an SEO change; logging it as an experiment
would be the manufactured progress this file exists to prevent.

**Three read-outs land in the next two days: 08-25 (two) and 08-26 (one).**
Do them on the day; a read-out postponed is an experiment abandoned.

**CONFOUND — the August 2026 spam update, CLOSED and dated.** 09:27 US/Pacific
2026-08-18 → complete 2026-08-21, runtime 2d16h. Global, all languages;
SpamBrain enforcement of EXISTING policies. Avena has no exposure (no
mass-generated pages, no bought links, no ads). Window sits inside the 09-02 and
09-23 read-outs. Record it; do not attribute either way.

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
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | series gap ≤2 days; all numbers day-of from `price_snapshots`/`sold_properties`. **Gate: O-21 must be resolved first** — Release 1 quotes delistings by day and those dates are still known-wrong. Any delisting figure must be `delistings_currently_absent` (83 today), never the gross count (86). O-45 disclosed not fixed — do not quote a tombstone's `last_price` for a relisted unit. **Do NOT source any Release 1 figure from `score_history`** (rows before 2026-08-22 dated a day late). `price_snapshots` is ground truth |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | Henrik's explicit go |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.68%** (in-sample, n=**2,035**). Gate reproduced the committed file exactly apart from `computed_at` | 2026-08-24 | `public/model-stats.json` |
| Live book | **2,035 listings** (unchanged) | 2026-08-24 | `public/data.json`, feed commit `2fdb4b5` 02:48 UTC |
| Sitemap | **2,687 `<loc>`**, valid XML (unchanged) | 2026-08-24 | `/sitemap.xml`, parsed |
| Corpus version | site **v2026-08-24 (schema 2)** · `avena-data` mirror on its normal lag (runs 07:15 UTC; I check ~05:42) · HF unverified (401 without a token) | 2026-08-24 | **EXPECTED offset — see below** |
| **How to read the mirror correctly** | avena-data's `daily-snapshot.yml` runs **07:15 UTC** and pulls the site artifact. I run at **~05:42 UTC**. So the mirror ALWAYS shows yesterday's version when I look, and today's by ~07:52. **Compare after 08:00 UTC, or the mirror against the site's PREVIOUS day. Do not re-open this as divergence.** | 2026-08-24 | avena-data commit history |
| Ledger (published) | first 2026-08-05, latest 2026-08-24, **20 observation days, 2,128 refs, 169 moves, 86 delistings, 8 relistings, 83 currently absent, 3 still listed** | 2026-08-24 | `/open-data/dataset.json` |
| **Tombstone integrity** | 8 of 86 tombstoned observed listed again; 3 on the market today. **83 of 86 absent today — the figure to quote, never gross 86.** 37 dated one day late (O-21, on branch) | 2026-08-24 | `tombstones.csv` + `price_snapshots` |
| **Real price moves by day** | 15 (08-14), 4, 1, 0, 15, 10, 10, 18 (08-21), 9 (08-22), 0 (08-23), **0 (08-24)** | 2026-08-24 | `price_snapshots` / pricing-history |
| **A 0-move day is NOT automatically a failure** | 08-24: `feed 2035 · snapshotted 2035 · moves_detected 0 · delisted 0 · trusted_prior true · overlap 1.000 · prior_age_days 1 · errors null`. overlap 1.000 = every one of yesterday's 2,035 refs still present → 0 moves is the arithmetic working out. **Discriminating fields are `trusted_prior` and `overlap`, never the move count alone** | 2026-08-24 | pricing-history curl |
| Snapshot rows by day | 2,016 (08-20), 2,020 (08-21), 2,034 (08-22), 2,035 (08-23), **2,035 (08-24)** — one clean write per day, rows = distinct refs | 2026-08-24 | `price_snapshots` |
| Delistings | **0 new tombstones 08-24.** Cumulative **86** | 2026-08-24 | `sold_properties` |
| **Cron logging coverage** | **64/64 scheduled crons write to `cron_logs`.** `invoked_by` on the real scheduled runs = **`vercel-cron-ua`** (scheduler identified by User-Agent, not the `x-vercel-cron` header). GitHub-Actions-triggered routes log `invoked_by=null` (expected) | 2026-08-24 | `b4cc217`, `71e19d6`, live rows |
| **`market_events` is LIVE** | detect-events wrote 3 events on the 08-23 scheduled run; `/api/market-events` reports live | 2026-08-24 | `95b90eb` |
| **Citation rate, organic (qb-v2) — THE baseline** | **7.35% (5/68) on 08-24.** Seven complete runs: 4.41 (08-10), 4.41 (08-12), 2.94 (08-14), 5.88 (08-17), 8.82 (08-19), 5.88 (08-21), **7.35 (08-24)**. Mean **5.67%**. One hit = 1.47pp. **No detectable trend. Do not claim one** | 2026-08-24 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6) on 08-24, 08-21, 08-19, 08-17**; 83.33% on the three prior | 2026-08-24 | `citation_measurements` |
| Citation run coverage | 08-24 (Mon) ran 68/68 + 6/6 complete, MEASURED (Perplexity balance fine, no `lookups_failed`). **Next scheduled: Wed 08-26.** Weekend guard still works (`ok:false` Sat/Sun) | 2026-08-24 | `vercel.json` crons + table |
| Top competitor share (organic) | **idealista 90 · thinkspain 20 · aplaceinthesun 13 · numbeo 5 · fotocasa 5 · rightmove 1** | 2026-08-21 | `citation_measurements` |
| **Nightly reliability** | **08-14..08-24 all succeeded — eleven clean scheduled nights in a row** | 2026-08-24 | Actions run list |
| Build health | Recent workflow runs scanned: **all success**, no non-success. Nightly feed 08-24 02:48 success; IndexNow ping 08-24 04:22 success. No open PRs. One push to main today (`fde7883`); preview equivalent verified locally via `build:preview-sim` exit 0 | 2026-08-24 | `actions_list` |
| Search impressions / clicks, last 28d | **2,216 / 31** — still inside the noise band, not a result | GSC to 2026-08-17 | `gsc_daily` |
| `gsc_pages` depth | **287 distinct pages**, max date 2026-08-17 | 2026-08-20 | `gsc_pages` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 | 2026-08-14 | `docs/gsc-genai/` — Henrik's UI export |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **10 audited, 10 defective** (`tax` fixed 08-24) | 2026-08-24 | `find src/app/api/v1 -name route.ts` |
| Test coverage added by Odyssey | `scripts/test-open-dataset.ts` 27 · `scripts/test-scribe.ts` 22 · `scripts/test-cron-coverage.ts` 79 | 2026-08-24 | `530c5ed`, `ab1f778`, `b4cc217`, `71e19d6` |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08** — unchanged (O-54) | 2026-08-24 | queried directly |
| APCI macro input age | **93 days** (`as_of` 2026-05-23) — climbing daily until O-34/O-40 resolved | 2026-08-24 | `/api/v1/apci` |
| Cron success rates (worst, among those that log) | `counterpart-discover` failing daily · `eu-stats-ingest` failing daily · `auto-post` 3×/day (O-53) · `prometheus` `error_count:4` on all four (O-56) | 2026-08-24 | `cron_logs` grouped |

**Correction, 2026-08-09 (kept):** "traffic has halved" was wrong — compared 28
days against 56. Real figures: flat.

**Correction, 2026-08-15 (kept):** O-26 recorded as "~20 endpoints"; real number
is **158 route files** — scope understated ~8×.

**Correction, 2026-08-18 (kept):** `pulse-weekly` recorded as possibly never
firing on a `total_count:0` read taken minutes before the delayed run. It had
fired. Re-check late-firing schedules the next morning.

**Correction, 2026-08-20 (kept):** O-28 — "the avena-data mirror has NO
automation and diverged five days" — WRONG on both counts; escalated as a
blocker for four days. The mirror is automated (07:15 UTC); I check at ~05:42.
**Before escalating a cross-system divergence, check the two systems' schedules
against my own observation time.**

**Correction, 2026-08-22 (kept):** wrote a verification criterion that would
have failed a working fix ("`match_prev_day` should collapse to near zero").
**Write criteria against the rows that can distinguish the hypotheses, not
against the whole population.**

**Correction, 2026-08-23 (kept):** stated an inference as a finding in a commit
message (`71e19d6`: scheduler "sends no recognised signal"). Resolved 08-24:
the scheduler DOES send a signal (the cron User-Agent), and detect-events WAS
invoked on schedule. Both my alternatives were wrong in detail; a commit message
is permanent and should have carried the uncertainty.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **THE ANTHROPIC API BALANCE IS EXHAUSTED — degrading five jobs** (standing) | Measured 08-22/08-23 in `cron_logs`: `pulse`, `predictions-generate` error on "credit balance is too low"; `delphi-run` skips Claude panelists; `causal-update` `debate_null`; `generate-briefs` failed. This is why `/track-record` (O-52) promises a prediction that cannot arrive. | **A decision, not a task: top up or don't.** If you top up, `predictions/generate` starts publishing LLM-authored forecasts on `/track-record` — the class of surface that produced the `precursor-scan` fabrication, so **say so explicitly if you want that live**. If you don't, tell me and I'll make the affected routes report `skipped` with a stated reason instead of failing nightly. The current state — five jobs failing quietly on a billing condition — is the one that isn't fine. |
| **BRANCH AWAITING APPROVAL: `odyssey/absorption-ledger-dates`** (`d182cd6`) | The published absorption ledger dates every parse-feed-written delisting one day late — 37 of 86 tombstones. Mirrored to avena-data + Hugging Face; Plan B Release 1 quotes delistings by day. **Eighth day pending.** | **Three sentences: (1) parse-feed now derives the real last-seen date from `price_snapshots` instead of stamping today, and `buildLedger` counts a delisting on the first observation day AFTER it — the two must land together. (2) `scripts/backfill-tombstone-dates.sql` corrects the 37 historical rows; its read-only dry run moves each back exactly one day and touches nothing else. (3) Branch-only because it mutates an existing column on `sold_properties`, the one table here that cannot be rebuilt.** All four gates pass on the branch. Will re-verify no conflict with `71e19d6`/`95b90eb`/`fde7883` before merge (none touch buildLedger or parse-feed). |
| **`/track-record` promises a prediction that cannot arrive** (O-52) | Live page says "The first call lands on the next prediction cycle"; `predictions` table has 0 rows ever. Cause proven: Anthropic balance. This is the page whose whole pitch is "we publish the misses too" — the worst surface to carry an unkept promise. | **Answer the credit question above and this resolves with it.** Top up + want forecasts → it fixes itself. If not, I need your say-so to correct the copy (buyer-facing marketing text; fence 2 says it's yours). |
| **`/api/cron/auto-post` is publicly callable with no authentication** (O-51) | Anyone who finds the URL can trigger an outbound post, 3× scheduled daily. `pulse` has the same hole. Separately, auto-post fails all three daily runs with "Unexpected end of JSON input" (O-53). | **One question, unchanged: does any of your buttons call `/api/cron/auto-post` directly?** If not, I add `isAuthorizedCron` to both and the hole closes. If yes, tell me which and I keep that path open. |
| **RedSP is challenging GitHub Actions egress** (O-27) | ROOT CAUSE PROVEN: their provider serves an openresty JS interstitial instead of the feed. Killed 5 of 9 nightlies. The curl fallback gets through on a client-fingerprint difference — if their guard starts challenging curl too, every night is lost until someone notices. **Eleven clean nights (08-14..08-24) mean the fallback has still never been exercised on a runner.** | Either (a) ask RedSP to allow-list GitHub Actions egress for the feed URL (the clean fix; reasonable — Avena is a paying consumer), or (b) approve moving the feed step to a runner with a stable IP RedSP can allow-list. |
| `HF_TOKEN` in CI | **The ONLY unverified corpus surface.** Site and avena-data mirror confirmed consistent; schema 2 rolled through the mirror. HF returns 401 without a token, so three-way agreement is unproven — and if HF is stale it is now stale by a SCHEMA, not just a day. | Store the HF write token as a repo secret so nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source ("most popular region for foreign buyers", "ECB rate stability supports mortgage affordability", tax/NIE/mortgage/golden-visa figures). Built to be quoted verbatim by AI assistants. | Either confirm accurate as written, or point me at a source. |
| Bing Webmaster Tools read | Henrik claimed avenaterminal.com 2026-08-13. Indexation-coverage + IndexNow-key views should be readable — next step is READING them. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the key shows rejected, say so loudly. No Bing API access, so manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions/3 months, 129 URLs, /compare = 87%. UI-only/no API. | Re-export monthly, next ~2026-09-14, as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | GitHub Actions secret set, so nightly capture works; Vercel lacks it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-24 | **`/api/v1/tax` published a fabricated 7%/yr appreciation forecast and a 5.5% default yield** | `fde7883`. `ANNUAL_APPRECIATION=0.07` drove projected_exit_price/capital_gain/CGT/total_return/effective_tax/annualized_return — a multi-year price forecast Avena cannot make (~20 days of history). `estimatedGrossYield ?? 5.5` fabricated a yield with no disclosure. Appreciation is now a caller-supplied scenario (compound, was linear) or the exit fields return null with a disclosure; yield resolves property-derived → caller-supplied → null, with `yield_source`. No buyer-facing page consumes it. Same class as `be4a736`/`f00086d`. Gates all pass; handler exercised on three bodies |
| 2026-08-24 | **`invoked_by` — which signal identifies a scheduled run?** | Resolved from live rows: the real Vercel scheduler is classified `vercel-cron-ua` (User-Agent), NOT `vercel-cron-header`. detect-events logging on the 07:31 scheduled run also killed the "plan cap silently drops it" theory. Follow-up O-57: the rejected-run alarm still keys on the header the scheduler never sends |
| 2026-08-24 | **A run could record its own failures and still log `success`** | `71e19d6` verified on the unattended scheduler: `causal-update` and `predictions-generate` both flipped `success`→`error` on 08-23; `dvf-ingest` correctly stayed `success` on a clean run. Known gap O-56: `error_count:4` (prometheus) is a bare number and still slips through |
| 2026-08-24 | **detect-events revived (scheduled-run confirmation)** | `95b90eb` — the 08-23 07:31 scheduled run wrote exactly 3 events, new_listings 1, plausibility ceiling held. The on-demand verification was 08-23; this confirms the unattended path |
| 2026-08-23 | **`/api/detect-events` — dead since 2026-04-11, a fabrication waiting to happen** | `95b90eb`. Baseline read selected a `score` column that never existed on `price_snapshots` → 42703 → discarded error → empty Map made every one of 2,035 units a NEW_LISTING; score read from the wrong table; `eventsCreated=batch.length` truncated at 50; chunked upsert with wrong key rejected every time. Rebuilt with paginated `.lt(today)` baseline, prices from `price_snapshots` + scores from `score_history`, trusted-prior gate, and a >10%-of-book plausibility ceiling |
| 2026-08-23 | **`generate-briefs` swallowed every failure into `success:true`** | `71e19d6` — loop ended in `catch(err){console.error(err)}`, returned 200 `{success:true, briefs_generated:0}`. Now collects/returns errors, counts only accepted rows, reports `signals_attempted`. The 06-15 stop date still unexplained — O-50 stays open |
| 2026-08-23 | **`b24cffa` — `/api/market-events` served a 133-day-frozen feed undated** | Verified twice: `stale_days 133` before detect-events ran, `stale_days 0 / todayCount 3` after. Derived, not decorative |
| 2026-08-22 | **O-48 — 24 of 64 scheduled crons wrote nothing to `cron_logs`** | `b4cc217` — coverage 64/64, enforced by `scripts/test-cron-coverage.ts`; verified on the unattended scheduler with no NULL `finished_at` |
| 2026-08-22 | **O-46 — dead cron or blind one?** | Probe returned `skipped: GITHUB_DATA_TOKEN not set`. Route runs and deliberately does nothing; avena-data's `daily-snapshot.yml` writes `market/`. No collision |
| 2026-08-22 | **`score_history` dated every observation one day late** | `ab1f778` — verified on the 08-22 nightly: 2,034/2,034 rows match same-day price. History not rewritten → one-day seam; the 08-21 book is absent from `score_history` |
| 2026-08-21 | **`/api/v1/arbitrage` published a confidence score built on `Math.random()`** | `be4a736` — fields removed, not replaced |
| 2026-08-21 | **The citation agent's resumability fix passed its real test** | `b090f52` — no hung rows |
| 2026-08-20 | **The published corpus asserted relisted units had been absorbed** | `530c5ed` — discloses `relisted_on` + `still_listed`; rows never deleted; `schema_version:2` |
| 2026-08-20 | **O-28 — "the corpus mirror is unautomated and permanently diverged"** | NOT A DEFECT. Measurement artifact + four-day false blocker |
| 2026-08-20 | **`open-dataset-io.fetchAll` would have silently truncated the corpus ~2026-11-11** | `530c5ed` — now throws on `MAX_PAGES` |
| 2026-08-19 | **The citation engine lost a whole measurement day to a timeout** | `b090f52` — resumable, stops at 210s |
| 2026-08-19 | **`counterpart-discover` and `eu-stats-ingest` diagnosed after 86/92 blind failures** | `e890daa`. Tracked under O-41 |
| 2026-08-18 | **`/api/intelligence/regime` published "Spain GDP: 3335689.7 %"** | `061a57c` — `ilike` matched Euro Area GDP in chained millions |
| 2026-08-18 | **The `causal_indicators` fallback had never once worked** | `061a57c` — wrong column names |
| 2026-08-18 | **`live` meant "a query returned a row", not "the source is current"** | `061a57c` — every indicator carries `as_of`/`age_days`/`stale` |
| 2026-08-18 | **`precursor-scan` published LLM-invented market signals** | Cron removed from `vercel.json`. Do not re-enable; do not top up for it |
| 2026-08-17 | **`/api/snapshot-archive` would have archived only the first 1,900 of the book** | `b730a1d` — `expected` measured off the truncated list |
| 2026-08-17 | **`sync-macro` stored NULL for Spain unemployment while the real figure sat one row above** | `582de5b` — Eurostat publishes the period LABEL before the observation |
| 2026-08-16 | **`/api/v1/apci` published a composite index with 40% of its weight fabricated** | `f00086d` — verified live: 65, GROWTH, 95% measured |
| 2026-08-16 | **`/api/snapshot-archive` ran daily into an empty table for months** | `f00086d` — six nonexistent columns, every upsert 400, hidden by `if (!error)` |
| 2026-08-16 | **`/api/v1/digital-twin` published a hardcoded APCI and random numbers** | `f00086d` |
| 2026-08-15 | **`/api/v1/snippet-answers` published five false market facts** | `e6bb569` — "Estepona is on the Costa Blanca" |
| 2026-08-15 | **market-clock and microstructure derived published verdicts from default constants** | `a2bf7d2` |
| 2026-08-14 | **published change-answers claimed 101 price moves inside a 1-day window** | `9c387fd` — unpaginated select hitting the 1000-row cap. Same trap detect-events later fell into |
| 2026-08-14 | the feed retry loop spent 120 minutes on a challenge it could never pass | `e415c6b` |
| 2026-08-13 | a short feed body was logged only as a byte count | `714b9ab` — cracked O-27 the next morning |
| 2026-08-13 | `/api/v1/crawler-report` published `estimated_weeks_to_dominance: 152` | `63f405b` |
| 2026-08-12 | a 62%-coverage citation run published as a comparable data point | `24db855` |
| 2026-08-11 | move diff compared today's price against itself | `7478108` |
| 2026-08-10 | pricing-history banked yesterday's book as today's snapshot | `1f0a130` — the precedent both the scribe fix and detect-events followed |
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — still working 08-24 (weekend guard) |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |

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
| 2026-08-21 | `ab1f778` **scribe now dates score_history rows from the book, not the wall clock** | **THE REAL TEST IS TOMORROW'S NIGHTLY.** Run the same cross-check that found the bug: for `snapshot_date = 2026-08-22`, `score_history.price_eur` must equal `price_snapshots.price` for **08-22**, not 08-21. Expect `match_same_day ≈ refs` and `match_prev_day` to COLLAPSE from 100% to near zero. Also `select output_summary from cron_logs where cron_path='/api/cron/scribe' and started_at>='2026-08-22'` → expect `date_source:"feed-meta"`, `book_lag_days:0`, `rows_failed:0`, `rows_pre_existing:0`. **Two ways this can fail and both are mine:** (a) the new workflow step `scores` goes red — it polls for the deployed book and asserts the captured date; (b) the 03:05 Vercel cron fires before the feed lands, in which case `book_lag_days:1` and the 08-22 book is captured a day later, which is *late but no longer wrong* | **pending — tonight's nightly** |
| 2026-08-21 | `ab1f778` **scribe write accounting + auth** | Verify a rejected write can no longer read as green: the summary must carry `rows_sent`/`rows_accepted`/`rows_failed` separately and status must be `error` if any chunk fails. Also confirm the route did not break under auth — a `success` row tomorrow proves the Vercel scheduler's header is accepted | **pending — tonight's nightly** |
| 2026-08-21 | `be4a736` **`/api/v1/arbitrage` no longer publishes Math.random() numbers** | **VERIFIED LIVE TODAY, post-deploy.** Two identical requests returned byte-identical `opportunities` (previously they could not). `estimated_convergence_months`, `confidence` and `window_remaining` are gone. Spain reports `yield_source:"measured"`, 2.8%, basis "median gross yield across 2020 live Avena listings"; the other nine report `static_assumption`; the comparability risk factor fires on every Spanish pair. Nothing further to check | **VERIFIED — moved to CLOSED** |
| 2026-08-20 | `530c5ed` **published corpus called relisted units absorbed** | **VERIFIED TODAY on the unattended nightly.** `/open-data/dataset.json` → `schema_version:2`, `observation_ledger` carries `relistings_recorded:8`, `delistings_still_listed:3`, `delistings_currently_absent:81`, and the split reconciles (84 = 81 + 3). Predicted 77/8/3/74 before shipping; the gross moved to 84 with tonight's 7 new tombstones exactly as predicted, and the three-way split held. `tombstones.csv` header ends `…,last_seen_date,relisted_on,still_listed`; SP1625, SP1648, N9243 all carry `still_listed=true`; 84 rows, 3 true. `movement-ledger.csv` has the `relistings` column | **VERIFIED — moved to CLOSED** |
| 2026-08-20 | `530c5ed` **`fetchAll` silent-truncation fuse** | Cannot be observed until the cap is near (~2026-11-11). What was verifiable today: the nightly corpus step succeeded and the ledger day count went **16 → 17**. Normal path unbroken | **VERIFIED (normal path) — the fuse itself still unobservable by design** |
| 2026-08-19 | `b090f52` **citation agent is resumable, idempotent and time-boxed** | **VERIFIED TODAY — this was the real test (first Friday since shipping), and it passed exactly as predicted.** 03:01:38 → `incomplete_resumable`, `stopped_on_budget:true`, 52/74 measured, 22 remaining, run length 212s (inside the 210s budget + tail). 03:10:40 → `complete`, `recovered_from_earlier_run:52`, `queried_this_run:22`, `remaining:0`. 03:20:40 → `already_complete`, `queried_this_run:0`. **No `started` row with a NULL `finished_at`.** The 210s budget is correctly tuned | **VERIFIED — moved to CLOSED** |
| 2026-08-14 | `e415c6b` **curl fallback when the feed origin serves a bot challenge** | 08-21 nightly clean again — **eight consecutive unchallenged scheduled nights** (08-14..08-21). Fallback still **proven locally, never exercised on a GitHub runner** | still pending — needs a night the challenge actually fires |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-48 | **24 of 64 scheduled crons never write to `cron_logs` at all — my own monitoring instrument is 37.5% blind.** For those routes, "no rows in `cron_logs`" is evidence of nothing | measured today by walking `vercel.json` crons against their route files for `startCronLog`: 40 log, **24 do not**, 0 missing files. Blind: `auto-post` (×3), `causal-update`, `compile-limitations`, `delphi-run`, `developer-monitor`, `github-snapshot`, `integrity-roll`, `plab-run`, `predictions/generate`, `predictions/verify`, `pulse`, `push-training-data`, `regime-check`, `social-delphi`, `sync-regulatory-signals`, `detect-anomalies`, `detect-events`, `digest`, `generate-briefs`, `snapshot-archive`, `weekly-alpha`, `weekly-science` | **This is the highest-value item I have and it is deliberately NOT a same-day fix.** It is 24 route files; doing it hastily at the end of a session is exactly the "20-line change to something you do not understand", ×24. It wants one careful pass: wrap each in `startCronLog`/`finishCronLog`, derive status from real write results, and NOT paper over whatever the wrapping exposes. **Do it first tomorrow.** Note it does not touch the capture pipeline — `scribe`, `pricing-history`, `citation-*`, `moat-archive` all log | **HIGH — top of tomorrow** |
| O-49 | **`citation-agent` reports `lookups_failed` for questions it deliberately deferred, so the one field the charter tells me to alarm on cries wolf on every budget-stopped run** | today's 03:01 run: `lookups_failed:22`, `first_error:"not queried in this invocation"`, alongside `stopped_on_budget:true, remaining:22`. The 03:10 tail reported `lookups_failed:0`. So a healthy resumable run and a Perplexity 401 both produce `lookups_failed>0` on the first invocation | Small and well-scoped: split `deferred` from `failed`. Not shipped today because both slots went to higher-ranked defects and this one degrades a signal rather than corrupting data. **The alarm rule needs restating until then: a balance-out 401 shows as `lookups_failed>0` on the FINAL invocation of the day, or `status` never reaching `complete` — not on the first** | medium |
| O-45 | **`sold_properties.last_seen_date` is never updated when a tombstoned unit returns and leaves again.** Five units (N8205, N9260, N9519, SP1080, SP1644) are stamped `last_seen 2026-08-07` but were observed live again on 08-08 | measured 08-20: `min(snapshot_date) > last_seen_date` per tombstone. All five relisted 08-08, all five absent since | `530c5ed` makes it visible rather than silent (they publish `relisted_on=2026-08-08, still_listed=false`), so the corpus no longer misleads. Correcting the stored date is the same class of write as O-21 and belongs on that branch, not a second one racing it | medium — disclosed, not hidden |
| O-46 | **`/api/cron/github-snapshot` is a BLIND cron, not necessarily a dead one — and the collision question is still open** | **RESOLVED HALF, today, by reading the source instead of waiting:** the route contains **zero calls to `startCronLog`**, so its 0 rows in `cron_logs` prove only that it does not log. Corroborated: in the last 7 days only ONE cron logged anything in the whole 07:00 UTC hour (`weekly-newsletter`), while `pulse` and `predictions/generate` are both scheduled `0 7 * * *` — all three are on the O-48 blind list | **What remains open is the collision**, not the liveness: it writes the open-dataset bundle to `avena-data` `market/` at 07:15, the same path and minute as avena-data's own `daily-snapshot.yml`. Evidence still favours avena-data's workflow being the actual writer (the mirror's files are byte-copies of the site artifact, not regenerated — `generated_at` is the site's). Folded into O-48: once it logs, the question answers itself | medium |
| O-44 | **`/api/sync-snapshots` writes columns that do not exist, and discards every write result.** It inserts `property_ref` into `sold_properties` and `price_snapshots`; both key on `ref`. Every such write must 400. All four write calls drop the return | route read 08-19; schemas re-confirmed today (`sold_properties` keys on `ref`, `price_snapshots` on `ref`) | Appears dead-and-broken rather than harmful: it cannot have written anything, and `parse-feed.js` + pricing-history are the real writers. **Do not delete on assumption** — confirm it writes nothing, then remove it and its browser-side caller rather than leaving a client-triggered writer pointed at the moat | medium |
| O-40 | **`causal-update` would stamp 86-day-old values as fresh if it ever ran.** `runCausalUpdate()` (`src/lib/causal-engine.ts:533-545`) refreshes no value — it loops every `causal_indicators` row and sets `last_updated = now()`, keeping the stale value | `causal_indicators`: 20 rows, **one distinct `last_updated` (2026-05-23 10:53:08)**. **Note the inference is DATA-based, not log-based, so O-48 does not undermine it**: if the cron ran, `last_updated` would have moved. It has not. So the 06:30 cron is genuinely not running, even though it is on the blind list | **DO NOT "FIX" THIS BY REVIVING THE CRON.** Since `061a57c` it is *more* dangerous: `/api/intelligence/regime` derives `age_days`/`stale` from `last_updated`, so reviving the bump would flip nine indicators from an honest `stale:true, age_days:89` to a fabricated `live:true, age_days:0`. Fix = refresh real values, or delete the bump. Either way it mass-mutates 20 rows → branch | **high** |
| O-34 | **Nine indicators have no live source at all** — Spain GDP, Costa Blanca YoY, Foreign Buyer Share, Alicante Transactions, New Supply, 10Y Bond, Mortgage Approvals, Brent, Consumer Confidence | `age_days` 89 today | No longer a credibility bug (honestly labelled stale) — a coverage gap. `/api/v1/apci` still reads `causal_indicators` directly | high |
| O-41 | **Two chronically-failing crons, diagnosed but unfixed** | `counterpart-discover` (failed again 03:30 today, `output_summary: null`): `column properties_registry.market does not exist \| code=42703`. `eu-stats-ingest` (failed again 04:16 today): `errors:2, rows_upserted:4337, indicators_attempted:20` — so 18 of 20 indicators DID land; only the run status is all-or-nothing | **counterpart-discover is a real, fixable bug in OUR code** — but it queries `properties_registry`, frozen 2026-05-24, so fixing the column alone would still mine a dead snapshot. **eu-stats-ingest is upstream** (ISTAT 500, BIS 404) — it should degrade per-source instead of failing the whole run, a small well-scoped change. Neither feeds `price_snapshots`/`sold_properties` | high — actionable |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants. Nine examined to date, nine defective — 9 for 9** | `63f405b`, `9c387fd`, `e6bb569`, `a2bf7d2`, `f00086d` (apci + digital-twin), `genesis/run` (O-42), `061a57c` (regime), **`arbitrage` (`be4a736`, today)** | **Today's grep pass produced concrete evidence on four more, all unfixed:** `tax` — `?? 5.5` default gross yield (line 93) *and* `ANNUAL_APPRECIATION = 0.07`, a hardcoded 7%/yr appreciation assumption inside published ROI math; `compliance` — `carbonScore = 70; // data available = baseline compliant` and `aiActScore = 90`, both literal published scores, plus `?? 3200`/`?? 30` fallbacks; `carbon` — `newBuildBonus = 15` invented constant inside an ESG score; `liquidity` + `passport` — `TYPE_FACTORS[...] ?? 50`. **`tax` is the one to do next**: a 7% appreciation assumption drives capital-gains and ROI figures a buyer might act on. Also still to do fleet-wide: grep for **`.ilike(` on an indicator/series key** (caused both the GDP and Greece defects) | **high — highest hit rate of anything I have** |
| O-42 | **`genesis/run` discards its write results and marks the scenario complete regardless.** `await supabase.from('genesis_outputs').insert(outputs);` — return dropped, then `status:'complete'` set unconditionally | `src/app/api/v1/genesis/run/route.ts:273-274` | The recurring shape in a scenario simulator | medium |
| O-47 | **`dvf-ingest` reports `status:'success'` while carrying insert failures in its own `errors[]` — and the loss is far larger than recorded** | today 04:30: `transactions_fetched: 4956`, `transactions_inserted: 2761`, five FK-violation chunks in `errors[]`, `status: 'success'`. **~2,195 rows (44%) dropped and reported as a clean run** | Same family as the recurring bug, one notch better: the error IS recorded, it just does not affect status. French DVF open data, not the moat, so low blast radius — but **44% loss reported as success** is exactly how a silent freeze starts. Upgraded from "half-failed" on today's numbers | medium |
| O-39 | **All 90 legacy `market_snapshots` rows have a NULL `snapshot_date`** | queried 08-17 | Harmless to reads (they order by `computed_at`). Decide: backfill from `computed_at`, or leave the legacy block | medium |
| O-35 | **2026-05-23/24 is a cluster date across several pipelines** | queried 08-16..08-18 | O-40 explains the `causal_indicators` half. `properties_registry` on 05-24 still unexplained — O-41 gives a second reason to care | medium |
| O-27 | **RedSP's provider serves a bot-protection JS interstitial to some clients.** ROOT CAUSE KNOWN: `openresty/1.31.1.1` returns a 12.1KB "One moment, please..." page that reloads via JS; node's `fetch` cannot execute JS. **Intermittent** — eight clean nights now | run 31774148318; client comparison 08-14; clean nights 08-14..08-21 | operational half mitigated by `e415c6b`. CAUSE cannot be fixed by me: needs RedSP to allow-list, or a stable-IP runner | **CRITICAL — mitigated, cause still open** |
| O-36 | **`snapshot-archive` computes five market-summary figures it cannot store** | `f00086d`; schema read 08-16 | Deliberate. Additive and allowed, but `new_this_week`/`avg_discount` deserve a considered schema. Decide alongside O-37. **Note it is also on the O-48 blind list** | medium |
| O-37 | **Nothing writes `market_snapshots.apci`, so APCI `week_change` can never populate** | `/api/v1/apci`; schema 08-16 | An honest null beats the 85-day delta it replaced. Do after O-34/O-40 | medium |
| O-30 | **Unbacked qualitative claims in snippet-answers** | read 2026-08-15 | Rewriting them would be inventing copy (CLAUDE.md rule 1) — the fence permits correcting a **false** fact, not replacing an unverifiable one with my own wording. Needs Henrik or a cited source | medium |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books | proven by diffing data.json blobs against stored row counts | cause fixed; 08-10..08-21 each a single clean write. Six of the eight relistings are units tombstoned 08-07 and back 08-08 — almost certainly that artifact, not six real market events. The corpus discloses them rather than asserting absorption | high |
| O-5 | Pre-transliteration accent slugs are indexed. **The "186 of 492" figure is unsourced — see O-33** | `gsc_pages` attribution proven wrong 08-15 | 308 shims confirmed working. Re-derive from `gsc_pages`, never from the old figures | high |
| O-6 | `/compare` dominates our search surface: **87% of Google AI-feature impressions (198/228)** | `gsc_pages`; `docs/gsc-genai/` (Henrik's export — solid) | CompareLedgerPulse (verified 08-15) put the moat on it. Read out 2026-09-14 | high |
| O-33 | **The "492 indexed / 293 /compare / 186 accent" baseline is NOT reproducible from `gsc_pages`** | 08-16: 151 pages; 08-17: 184; 08-20: 287 | **Do not quote 492/293/186 again until re-derived.** O-5 and O-6 both rest on these. Re-derive once the count plateaus | **high** |
| O-13 | **PerplexityBot is barely present.** Negligible for the crawler the entire citation strategy targets | crawler ledger | cause unknown and must not be guessed at. Not a robots.txt problem — OAI-SearchBot thrives under the same file | high |
| O-15 | **Vercel Analytics figures are mostly machines.** AwarioBot alone is tens of thousands of hits | crawler ledger | **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in: `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`, `dvf-ingest` | real instances of the recurring shape | **`scribe/route.ts:48` removed from this list today — fixed in `ab1f778`.** The `dvf-ingest` instance has its own row (O-47) | high |
| O-16 | **ClaudeBot has barely returned.** 7 hits total since 08-12 | crawler ledger | effectively absent. Acting requires knowing why, and I do not | medium |
| O-14 | **AwarioBot is the largest crawler on the site and returns nothing** | crawler ledger | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`** (three counting the broken O-44) | `parse-feed.js:962,1003` | 08-12..08-21 all had effectively one writer. Wants a comment at both ends at minimum | medium |
| O-10 | `citation_measurements` still holds the fabricated-zero rows (08-02..08-06) and two 0-question rows | table read | cannot distinguish "asked 87, genuinely 0" from "all lookups failed". Never delete data. **Excluded from every published surface** by `loadMeasurements` | medium |
| O-29 | **Lightpanda stopped as abruptly as it started.** Nothing since 08-14 | crawler ledger | a two-day burst, now gone. Keep watching | low |
| O-2 | `<html lang="en">` on the three `/no` pages while serving Norwegian | verified 2026-08-09 | per-route fix needs route-group root layouts (huge diff) or a dynamic root layout (kills static generation) | low — hreflang is already correct |
| O-4 | Zenodo deposit frozen at 2026-04-11 | `zenodo.org/api/records/19520064` | deliberately saved for a quarterly citable version. **`schema_version` is now 2, so the next deposit is a genuine new version** | deliberate |

## 3. EXPERIMENTS — changes with a read-out date

Search Console connected 2026-08-09 (`gsc_daily`, `gsc_pages`). Rules: one
meaningful change at a time, a read-out DATE fixed in advance, the result
recorded honestly — "no detectable effect" is a real finding.

Weekly baseline: impressions 430–660/week for three months, clicks 1–10.
Flat. Any claimed effect must clear that noise band to mean anything.

| started | hypothesis | change | metric | read-out | result |
|---|---|---|---|---|---|
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | 2026-09-02 (4 weeks) | pending — **confounded by the August 2026 spam update** |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers only | distinct properties fetched per crawler per pass | **2026-08-25 (4 days away)** | pending — **signal firmly negative for AwarioBot**: distinct paths frozen for 8+ days while hits kept growing. It re-crawls the same set harder, not broader. Hold to 08-25 for the other 13 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) | 2026-09-08 (4 weeks) | pending — read out on COMPLETE runs only. **Six complete runs now; see the citation baseline — still no detectable trend** |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | **2026-08-25 (4 days away)** | pending — readable from `crawler_hits` |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (4 weeks) | pending |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` column | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (4 weeks) | pending — needs distribution: not listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate; citations of town pages specifically | 2026-09-09 (4 weeks) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" queries + GSC impressions | 2026-09-23 (6 weeks) | pending — **confounded by the spam update** |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (4 weeks) | pending — **interim.** Floor has held ~10 days at 20–40x the pre-ping baseline of 2/day. Still confounded by 08-12 being a heavy deploy day. **Hold to 09-09** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | **2026-08-26 (5 days away)** | pending — **one large single-day signal, not yet a trend. GPTBot ran a deep crawl on 08-19: 217 hits / 211 distinct paths, against a flat 4/day either side.** Cumulative 60 → 274. **Do not attribute** — it coincides with the spam-update rollout and the IndexNow pings. On 08-26 check: does GPTBot repeat, and do the 211 paths skew to frontier URLs? ClaudeBot 7, meta-externalagent 4 — both still absent |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions but held no ledger data; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 (4 weeks) | pending — **render verified live 2026-08-15** |
| 2026-08-10 | ~~A bulk ingest of the one-pagers raises the organic citation rate~~ | ~~an external agent crawled 310 one-pagers~~ | — | — | **WITHDRAWN same day.** The crawler was AhrefsBot, which feeds a backlink index, not a language model |

**No new experiment today, deliberately.** Both changes were defect fixes — a
moat table misdating every row it holds, and a published API emitting
`Math.random()` as a confidence score. Neither is an SEO change, and logging
either as an experiment would be the manufactured progress this file exists to
prevent.

**CONFOUND, still live — the August 2026 spam update.** Confirmed by Google
2026-08-18 09:27 US/Pacific; global, all languages and regions; third spam
update of 2026; SpamBrain enforcement of EXISTING policies, no new policies.
**Checked the Search Status Dashboard again today (08-21): still not marked
complete — day 4.** March took ~19h, June ~2 days; this one is well past both,
which is itself the only notable thing about it. **Nothing to implement** —
Avena has no exposure to any spam policy (no mass-generated pages, no bought
links, no ads; all forbidden by the charter anyway). **It lands inside the
09-02 and 09-23 read-out windows.** Record as a confound; do not attribute
either way.

**Confound to remember:** `f00086d` changed the published APCI from 58 to 65
and altered `/api/v1/apci` and `/api/v1/digital-twin`, both AI-facing. If the
09-08 organic read-out moves, that is a second confound alongside `e6bb569`.

## 3b. PLAN B — press detonation calendar (Henrik's "B GO")

The press room is the landing surface; the releases are the detonations. The
genuine daily series started 2026-08-05. Drafts with named data slots live in
`~/Desktop/PLAN-B-RELEASES.md`. Nothing fires without Henrik's explicit go.

| when | what | gate |
|---|---|---|
| 2026-08-13 | Press room truth-repaired (`4e9f96d`) | done |
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | series gap ≤2 days; all numbers day-of from `price_snapshots`/`sold_properties`. **Gate: O-21 must be resolved first** — Release 1 quotes delistings by day and those dates are still known-wrong. Any delisting figure quoted must be `delistings_currently_absent` (81 today), never the gross count (84). O-45 is disclosed, not fixed — do not quote a tombstone's `last_price` for a relisted unit. **New gate note: do NOT source any Release 1 figure from `score_history`** — every row before 2026-08-22 is dated a day late (see BASELINES). `price_snapshots` is the ground truth |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | Henrik's explicit go |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.68%** (in-sample, n=2,020). Gate run reproduced the committed file byte-identically. **The 15.66 → 15.68 move since yesterday is the BOOK, not a code change — proven by re-running against the 08-20 `data.json`, which reproduces 15.66 / n=2,016 exactly** | 2026-08-21 | `public/model-stats.json` |
| Live book | **2,020 listings** (was 2,016) | 2026-08-21 | `public/data.json`, feed commit `34deb70` 02:48 UTC |
| Sitemap | **2,672 `<loc>`**, valid XML (was 2,668 — tracks the book) | 2026-08-21 | `/sitemap.xml`, parsed |
| Corpus version | site **v2026-08-21 (schema 2)** · `avena-data` **v2026-08-20 (schema 1)** · HF unverified (401 without a token) | 2026-08-21 | **EXPECTED offset, not divergence — see below** |
| **How to read the mirror correctly** | avena-data's own `daily-snapshot.yml` runs **07:15 UTC** and pulls the site artifact. I run at **~05:45 UTC**. So the mirror ALWAYS shows yesterday's version when I look, and today's by ~07:52. **Compare after 08:00 UTC, or compare the mirror against the site's PREVIOUS day. Do not re-open this as divergence.** The schema 1→2 gap today is the same artifact and should close at 07:15 — **worth one confirming look tomorrow, since `schema_version` has never rolled through the mirror before** | 2026-08-21 | avena-data commit history |
| Ledger (published) | first 2026-08-05, latest 2026-08-21, **17 observation days, 2,111 refs, 160 moves, 84 delistings, 8 relistings** | 2026-08-21 | `/open-data/dataset.json` |
| **Tombstone integrity** | **8 of 84 tombstoned units have been observed listed again. 3 are on the market today** (SP1625, SP1648, N9243); 5 returned 08-08 and left again (O-45). **81 of 84 are absent today — this is the figure to quote, never the gross 84.** Separately, 37 are dated one day late (O-21, on branch) | 2026-08-21 | `tombstones.csv` + `price_snapshots` |
| **`score_history` is misdated before 2026-08-22 — DO NOT USE IT FOR DATED CLAIMS** | **Every row dated D holds the observation from D-1, 100% of rows, every day.** Measured 08-14..08-21: `match_prev_day` = full ref count on all 8 days; on the 73 cases where the price genuinely moved between D-1 and D, the stored value was the D-1 one every time. **Fixed forward by `ab1f778`** (dates now come from `feed-meta.json`). **Historical rows were NOT rewritten**, so the series carries a one-day seam: the **2026-08-21 book is absent from `score_history` entirely**, because the 08-21 date already holds the 08-20 book. `price_snapshots` is unaffected and remains the ground truth for price | 2026-08-21 | cross-check vs `price_snapshots` |
| **Real price moves by day** | 15 (08-14), 4 (08-15), 1 (08-16), 0 (08-17), 15 (08-18), 10 (08-19), 10 (08-20), **18 (08-21)** | 2026-08-21 | `price_snapshots`, diffed |
| Snapshot rows by day | 2,007 (08-14) … 2,011 (08-19), 2,016 (08-20), **2,020 (08-21)** — one clean write per day since 08-10, rows = distinct refs every day | 2026-08-21 | `price_snapshots` |
| Delistings | **7 new tombstones dated 08-21** (2 on 08-20; 17 on 08-19 remains the largest day). Cumulative **84** | 2026-08-21 | `sold_properties` |
| pricing-history cron | nightly 02:49 run: `feed 2020 · snapshotted 2020 · moves_detected 18 · price_moves 18 · trusted_prior true · overlap 0.997 · prior_age_days 1 · errors null`. My 05:37 hand-re-run: identical except `price_moves 0 (already logged)` and `delisted 0 (already banked)` — **idempotency confirmed again** | 2026-08-21 | `cron_logs` + hand-run |
| **The 02:20 skip is CORRECT, not a failure** | pricing-history logged `status:'skipped'` three times (02:20, 02:48, 02:49) with `reason: "stale feed — deployed book predates today"` before succeeding at 02:49:47. That is the `1f0a130` guard refusing to bank yesterday's book as today's snapshot while the nightly deploy propagates. **Do not "fix" this** | 2026-08-21 | `cron_logs` |
| **Cron logging coverage — a limit on MY OWN instrument** | **40 of 64 scheduled crons write to `cron_logs`; 24 do NOT (37.5% blind).** For those 24, absence from `cron_logs` is evidence of nothing. See O-48 for the list. **Every "cron success rate" and "never logged a run" claim in this file is scoped to the 40 that log** | 2026-08-21 | `vercel.json` × route sources |
| **Citation rate, organic (qb-v2) — THE baseline** | **5.88% (4/68) on 08-21.** Full series of six complete runs: 4.41 (08-10), 4.41 (08-12), 2.94 (08-14), 5.88 (08-17), 8.82 (08-19), **5.88 (08-21)**. Mean **5.39%**. **The 08-19 8.82% did NOT hold — it was noise, not a step change, and today settles that.** One hit = 1.47pp, so the whole spread is ±4 hits. **No detectable trend. Do not claim one** | 2026-08-21 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6) on 08-21, 08-19 and 08-17**; 83.33% (5/6) on the three prior runs | 2026-08-21 | `citation_measurements` |
| Citation run coverage | 08-10, 08-12, 08-14, 08-17, 08-19, **08-21** all 68/68 + 6/6 complete. Next scheduled: **Mon 08-24** | 2026-08-21 | `vercel.json` crons + table |
| Top competitor share (organic) | **idealista 90 · thinkspain 20 · aplaceinthesun 13 · numbeo 5 · fotocasa 5 · rightmove 1.** Top gap question unchanged: "what can I buy in Spain for 200000 euros" | 2026-08-21 | `citation_measurements` |
| Citation rate, qb-v1 (RETIRED RULER — never a baseline) | organic 6.19% (26/420), branded 20.00% (3/15) | 2026-08-07 | excluded from all published series |
| **Nightly reliability** | **08-14..08-21 all succeeded — eight clean scheduled nights in a row.** Prior: 5 of 9 failed at the feed step | 2026-08-21 | Actions run list |
| Build health | Last 12 workflow runs scanned: **all success**, no non-success at all. Nightly feed 08-21 02:47 success; IndexNow ping 08-21 04:10 success. Two pushes to main today (`ab1f778`, `be4a736`); no PRs, so no check-runs — **preview equivalent verified locally via `build:preview-sim` on both, exit 0** | 2026-08-21 | `actions_list` |
| Search impressions / clicks, last 28d | **2,216 / 31** — **still inside the noise band, not a result** | GSC current to 2026-08-17 | `gsc_daily` |
| `gsc_pages` depth | **287 distinct pages**, max date 2026-08-17 | 2026-08-20 | `gsc_pages` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 | 2026-08-14 | `docs/gsc-genai/` — Henrik's UI export. Properly sourced |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **9 audited to date, 9 defective** | 2026-08-21 | `find src/app/api/v1 -name route.ts` |
| Test coverage added by Odyssey | `scripts/test-open-dataset.ts` 27 assertions (corpus) · **`scripts/test-scribe.ts` 22 assertions (capture dating + write accounting, new today)** | 2026-08-21 | `530c5ed`, `ab1f778` |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08** | 2026-08-21 | queried directly |
| APCI macro input age | **89 days** (`as_of` 2026-05-23) — climbing daily until O-34/O-40 are resolved | 2026-08-21 | `/api/v1/apci` |
| Cron success rates (worst, **among the 40 that log**) | `counterpart-discover` **0/90** · `eu-stats-ingest` **1/96** (but 4,337 rows still upserted today) · `mentat` 57/119 · `precursor-scan` removed | 2026-08-21 | `cron_logs` grouped |

**Correction, 2026-08-09 (kept):** an earlier reading of "traffic has halved"
was wrong — the query compared 28 days against 56. Real figures above: flat.

**Correction, 2026-08-15 (kept):** O-26 was recorded as "~20 endpoints". The
real number is **158 route files** — the scope was understated ~8x.

**Correction, 2026-08-18 (kept):** `pulse-weekly` was recorded as possibly
never having fired, on a `total_count: 0` read taken minutes before the delayed
run existed. It had fired. Re-check late-firing schedules the next morning.

**Correction, 2026-08-20 (kept):** **O-28 — "the `avena-data` mirror has NO
automation and has diverged for five days" — was WRONG on both counts, and I
escalated it to Henrik as a blocker for four days.** The mirror is automated
(`daily-snapshot.yml`, 07:15 UTC) and captured the same-day version on 9 of 10
days; I check at ~05:45, before it runs. A constant one-day offset is what a
fixed observation time earlier than a fixed update time produces.
**Lesson: before escalating a cross-system divergence, check the two systems'
schedules against my own observation time.**

**Correction, 2026-08-21 (NEW):** **O-46 was recorded as "two possibilities and
I have not separated them: a dead cron or a blind cron" — and it stayed that
way for a day because I told myself to "check `cron_logs` again just after
07:15 tomorrow", when I have never once been awake at 07:15.** Reading the
route file answered it in seconds: `github-snapshot` contains no
`startCronLog` call, so it is a blind cron and its zero rows were never
evidence of anything. **This is the O-28 lesson in a second costume: I planned
an observation my own schedule makes impossible, instead of reading the source
that was in front of me.** Pulling that thread produced O-48 — 24 of 64 crons
are blind, which is a real limit on every cron claim I have made.

**Correction, 2026-08-21 (NEW):** in this morning's brief I first read the AVM
gate as "15.68% vs committed 15.66%, marginally worse". Wrong: the committed
`model-stats.json` already said **15.68** (regenerated by the 02:48 nightly).
I had compared against yesterday's number in this file rather than the
committed file the gate actually names. No regression existed.

**My own mistakes today (kept, so they are not repeated):**
1. The O-46 error above — a deferral justified by an observation I could never
   make, when the answer was readable from source on day one.
2. The AVM baseline misread above — compared against memory, not the artifact
   the gate specifies.
3. On `/api/v1/arbitrage` I nearly swapped the invented Spanish yield (5.2%)
   for the measured one (2.80%) and banked it as an improvement. Avena's book
   is coastal new-build — a premium segment — so publishing 2.80% as "Spain"
   would have been a fresh false claim in place of the old one. Caught it only
   because I printed the measured value and it was implausibly far from the
   constant. **When a measured number replaces an invented one, check that it
   measures the same thing the label claims.**

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **BRANCH AWAITING APPROVAL: `odyssey/absorption-ledger-dates`** (`d182cd6`, rebased onto 08-20 main) | The published absorption ledger dates every parse-feed-written delisting one day late — 37 of 84 tombstones. It is mirrored to avena-data and Hugging Face, and Plan B Release 1 quotes delistings by day. **Fifth day pending.** | **Three sentences: (1) parse-feed now derives the real last-seen date from `price_snapshots` instead of stamping today, and `buildLedger` counts a delisting on the first observation day AFTER it — the two must land together or the count moves onto a day the unit was still listed. (2) `scripts/backfill-tombstone-dates.sql` corrects the 37 historical rows; its dry run, executed read-only against production, moves every one of them back by exactly one day and touches nothing else. (3) It goes to a branch only because it mutates an existing column on `sold_properties`, the one table here that cannot be rebuilt.** All four gates pass on the rebased branch. **Note it has not been rebased onto today's two commits — neither touches `buildLedger` or parse-feed, so no conflict is expected, but I will re-verify before it merges.** |
| **RedSP is challenging GitHub Actions egress** (O-27) | ROOT CAUSE PROVEN: their provider serves an openresty JS interstitial instead of the feed. It killed 5 of 9 nightlies. The curl fallback gets through, but it rides on a client-fingerprint difference — if their guard starts challenging curl too, every night is lost until someone notices. **Eight clean nights (08-14..08-21) mean the fallback has still never been exercised on a runner — do not read the quiet as a fix.** | Either (a) ask RedSP to allow-list GitHub Actions egress for the feed URL — the clean fix, and a reasonable ask since Avena is a paying consumer of that feed; or (b) approve moving the feed step to a runner with a stable IP RedSP can allow-list. |
| `HF_TOKEN` in CI | **This is now the ONLY unverified corpus surface.** The site and the avena-data mirror are confirmed consistent; Hugging Face returns 401 without a token, so three-way agreement is still unproven. Corpus filters resolve conflicts by cross-source agreement, so an unverifiable third surface is the remaining weak link. **More urgent this week: `schema_version` went 1 → 2 on 08-20, so if HF is stale it is now stale by a SCHEMA, not just a day.** | Store the HF write token as a repo secret so the nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source: "most popular region for foreign buyers", "ECB rate stability supports mortgage affordability", "supply is constrained", plus tax/NIE/mortgage/golden-visa figures. This surface is built to be quoted verbatim by AI assistants. | Either confirm they are accurate as written, or point me at a source to check them against. |
| Bing Webmaster Tools read | **Henrik claimed avenaterminal.com 2026-08-13.** The indexation-coverage and IndexNow-key views should now be readable — next step is READING them. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the dashboard shows the key rejected, say so loudly. No Bing API access, so this stays a manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions over 3 months, 129 distinct URLs. **/compare = 87%.** Still UI-only/no API. | Re-export monthly, next ~2026-09-14, as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so nightly capture works. Vercel does not have it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-21 | **`score_history` dated every observation one day late, on every row** | `ab1f778` — scribe read the deployed `data.json` and stamped rows with `new Date()`. Correct when the feed landed 01:37 and scribe ran 02:00; the feed moved to 02:47 and scribe never followed. Measured: 100% of rows dated D held the D-1 price, on all 8 days checked, confirmed on the 73 cases where the price actually moved. Published via `/api/v1/property/[ref]/history`. Now dates from `feed-meta.json`; write accounting is honest; an empty book is an error; cron auth added; schedule 02:00 → 03:05; the feed workflow triggers and asserts it. **History deliberately not rewritten — see the seam in BASELINES** |
| 2026-08-21 | **`/api/v1/arbitrage` published a confidence score built on `Math.random()`** | `be4a736` — `estimated_convergence_months` and `confidence` were formulas over a random term, so identical requests returned different answers; `window_remaining` was a threshold dressed as a forecast. No convergence model exists. All three removed, not replaced. Market rows now carry `yield_source`; Spain is measured from the live book and named "Spain (coastal new-build)" with an explicit comparability warning. Verified deterministic live |
| 2026-08-21 | **The citation agent's resumability fix passed its real test** | `b090f52` — first Friday since shipping: 03:01 `incomplete_resumable` + `stopped_on_budget` (52/74), 03:10 `complete` (recovered 52, queried 22), 03:20 `already_complete`. No hung rows. Budget correctly tuned |
| 2026-08-21 | **The corpus relisting disclosure held on an unattended nightly** | `530c5ed` — `schema_version:2` live, `relistings_recorded:8 / still_listed:3 / currently_absent:81`, split reconciles against 84 gross. Predicted values confirmed. Ledger day count 16 → 17 |
| 2026-08-20 | **O-28 — "the corpus mirror is unautomated and permanently diverged"** | **NOT A DEFECT. My measurement artifact, and a four-day false blocker.** Full correction in BASELINES |
| 2026-08-20 | **The published corpus asserted that relisted units had been absorbed** | `530c5ed` — now discloses `relisted_on` + `still_listed` per row and three separate manifest figures. Rows are never deleted |
| 2026-08-20 | **`open-dataset-io.fetchAll` would have silently truncated the corpus around 2026-11-11** | `530c5ed` — on hitting `MAX_PAGES=200` it fell out of the loop and returned short, dropping the NEWEST days. Now throws |
| 2026-08-20 | **The corpus generator had no test coverage at all** | `530c5ed` — `scripts/test-open-dataset.ts`, 27 assertions |
| 2026-08-19 | **The citation engine lost a whole measurement day to a timeout it was already grazing** | `b090f52` — `queryMonitor` is resumable, persists per batch, stops at 210s. Schedule `0,10,20 3 * * 1,3,5` |
| 2026-08-19 | **`citation_monitoring` insert return dropped on the floor** | `b090f52` — only rows the database accepted are counted; rejects surface as `persist_failures` |
| 2026-08-19 | **`counterpart-discover` and `eu-stats-ingest` diagnosed after 86 and 92 blind failures** | `e890daa`. Both now tracked with real causes under O-41 |
| 2026-08-18 | **`/api/intelligence/regime` published "Spain GDP: 3335689.7 %" as a live reading** | `061a57c` — `ilike` matched Euro Area GDP in chained millions. Exact key map gated on country AND unit |
| 2026-08-18 | **The `causal_indicators` fallback had never once worked** | `061a57c` — selected `value, direction`; the real columns are `current_value, signal` |
| 2026-08-18 | **Three bullish predicates were wrong** | `061a57c` — EUR/NOK and EUR/SEK were `() => true`. Published confidence 78 → 60 |
| 2026-08-18 | **`live` meant "a query returned a row", not "the source is current"** | `061a57c` — every indicator carries `as_of`, `age_days`, `stale`, STALE_AFTER_DAYS=45 |
| 2026-08-18 | **A value's `source` named the wrong table** | `e7afe39` — `SourcedValue.origin` |
| 2026-08-18 | **`precursor-scan` published LLM-invented market signals** | Cron removed from `vercel.json`. Do not re-enable; do not top up for it |
| 2026-08-18 | **Market Pulse weekly delivery confirmed firing on schedule** | `2416532` — fired 08-17 06:05 UTC with a real Resend id |
| 2026-08-17 | **`/api/snapshot-archive` would have archived only the first 1,900 of the book every day and called it complete** | `b730a1d` — `expected` measured off the TRUNCATED list |
| 2026-08-17 | **`sync-macro` stored a NULL for Spain unemployment while the real figure sat one row above** | `582de5b` — Eurostat publishes the period LABEL before the observation |
| 2026-08-17 | **`gsc_pages` capture confirmed accumulating** | `c86ec47` — 98 → 151 → 184 → 287 distinct pages |
| 2026-08-16 | **`/api/v1/apci` published a composite index with 40% of its weight fabricated** | `f00086d` — verified live: 65, GROWTH, 95% measured |
| 2026-08-16 | **`/api/snapshot-archive` ran daily at 06:00 for months into an empty table** | `f00086d` — six nonexistent columns, every upsert 400, hidden by `if (!error) inserted += chunk.length` |
| 2026-08-16 | **`/api/v1/digital-twin` published a hardcoded APCI and random numbers** | `f00086d` — `Math.random()*4-2` on every published regional impact. **Precedent for today's `arbitrage` fix** |
| 2026-08-15 | **`/api/v1/snippet-answers` published five false market facts** | `e6bb569` — "Estepona is on the Costa Blanca" |
| 2026-08-15 | **market-clock and microstructure derived published verdicts from default constants** | `a2bf7d2` — 6 of 10 regions at SLOWDOWN purely via a default, all stamped `data_quality:"LIVE"` |
| 2026-08-15 | the change-answers 1-day window fix, confirmed on an unattended nightly | `9c387fd` |
| 2026-08-15 | CompareLedgerPulse render + province-strip fix | `f2880a4`/`3b1d983` |
| 2026-08-14 | **published change-answers claimed 101 price moves inside a 1-day window** | `9c387fd` — an unpaginated select hitting PostgREST's 1000-row cap |
| 2026-08-14 | the feed retry loop spent 120 minutes on a challenge it could never pass | `e415c6b` |
| ~~O-25~~ | **CLOSED 2026-08-14.** "The GitHub PAT is not durable" | MCP GitHub integration has Actions write |
| ~~O-24~~ | **CLOSED 2026-08-14.** "Every enrichment step is downstream of the one step that keeps breaking" | Was a symptom of the feed failure |
| ~~O-11~~ | **SUPERSEDED 2026-08-14 by O-28** | …and O-28 itself is closed as a non-defect |
| 2026-08-13 | a short feed body was logged only as a byte count | `714b9ab` — and it is what cracked O-27 the next morning |
| 2026-08-13 | `/api/v1/crawler-report` published `estimated_weeks_to_dominance: 152` from an invented 0.5 floor over a fabricated zero | `63f405b` |
| 2026-08-13 | 2026-08-13's book and capture, lost by the wedged nightly | `355def7` |
| ~~O-23~~ | Perplexity failures were a request-rate limit, not balance | `b8376a0` |
| ~~O-19~~ | one FK rejecting 100% of live refs, carrying a CASCADE that would have deleted 394k rows | dropped |
| 2026-08-12 | a 62%-coverage citation run published as a comparable data point | `24db855` — `bank_organic`/`bank_branded` |
| 2026-08-11 | move diff compared today's price against itself | `7478108` |
| 2026-08-11 | crawler ledger (O-18) | `a9775c5`..`3ecf70b` |
| 2026-08-11 | GSC capture lost any day Google published late | `7e19292` |
| 2026-08-10 | pricing-history banked yesterday's book as today's snapshot | `1f0a130` — **the precedent today's scribe fix follows** |
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — confirmed still working today: `citation-measure` returned `ok:false, measurement:null` for 08-20 (a non-citation day) and persisted only 08-21, rather than publishing a 0.00% |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |

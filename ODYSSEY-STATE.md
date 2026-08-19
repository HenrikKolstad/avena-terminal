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
| 2026-08-19 | `b090f52` **citation agent is now resumable, idempotent and time-boxed** | **PARTLY VERIFIED LIVE TODAY, by accident and then on purpose.** Two invocations on the new code returned `status:'incomplete_resumable'`, `stopped_on_budget:true`, `persisted_this_run` 56 and 58, `persist_failures:0`, `recovered_from_earlier_run` 8 — they stopped THEMSELVES and wrote a terminal cron_logs status. A third invocation returned `already_complete`, 74/74, `queried_this_run:0`. **The real test is Fri 08-21 unattended.** Check: `select status, output_summary from cron_logs where cron_path='/api/cron/citation-agent' and started_at>='2026-08-21'` — expect the 03:00 fire to be `incomplete_resumable` with `stopped_on_budget:true`, the 03:10 fire to complete the tail and run downstream, the 03:20 fire to be `already_complete`. **Any `started` row with `finished_at` NULL means the budget is still too high and must come down from 210s** | **partly — full test Fri 08-21** |
| 2026-08-19 | `b090f52` **the 2026-08-19 citation day, recovered rather than lost** | `citation_measurements` for 08-19: 68 asked, 6 hits, **8.82% organic**, branded 6/6, `bank_organic` 68 / `bank_branded` 6 → a COMPLETE run by `isCompleteRun`. Nothing to re-verify; recorded in BASELINES with its confounds | **VERIFIED — day filled** |
| 2026-08-18 | `e890daa` **cron error text destroyed on every failure** | **VERIFIED — and it paid off within hours.** `counterpart-discover` now logs `message=column properties_registry.market does not exist \| code=42703`; `eu-stats-ingest` logs `istat: … HTTP 500 \| bis: BIS HTTP 404`. Two crons that had failed 86 and 92 times undiagnosably are now diagnosed. No "[object Object]", no NULL. See O-41 | **VERIFIED — moved to CLOSED** |
| 2026-08-18 | `061a57c` **regime engine published Euro Area GDP as "Spain GDP: 3335689.7 %"** | **HELD ON DAY TWO. `age_days` climbed 86 → 87**, which proves it is computed from `last_updated` and not stamped at write time — the exact thing I set out to confirm. Spain GDP still 2.9 / `live:false` / `stale:true`, no return to a 7-digit value. Spain Inflation 3.0 from `spain_inflation_yoy`. `scoring_freshness` 9 fired / 4 live / 5 stale | **VERIFIED — held on day two** |
| 2026-08-18 | `e7afe39` **a value's `source` named the wrong table** | **HELD.** Spain Inflation/Unemployment read `macro_indicators: <key>`; the nine legacy values read `causal_indicators (legacy) (stale: 87d old)` | **VERIFIED — held on day two** |
| 2026-08-14 | `e415c6b` **curl fallback when the feed origin serves a bot challenge** | 08-19 nightly clean again — **six consecutive unchallenged scheduled nights** (08-14..08-19). Fallback still **proven locally, never exercised on a GitHub runner** | still pending — needs a night the challenge actually fires |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-43 | **3 of 75 tombstones are units that are LIVE in today's feed.** Delisted, then relisted, and the tombstone was never retracted. `dataset.json` describes tombstones.csv as "Units that left the market" and a delisting as "strong evidence of absorption" — so the published corpus makes a false claim about three specific units | measured today: `select count(*) from sold_properties s join (refs in price_snapshots on 2026-08-19) l on l.ref=s.ref` → **3**. Both writers upsert `onConflict:'ref'` with no resurrection path | Needs an additive `relisted_on date` column AND a decision about the published corpus schema (a new column in tombstones.csv, and whether `delistings_recorded` should net them out). Rushing that into today's ledger branch would have mixed a data-model change into a date fix. **The honest design is to disclose, not hide: keep the row, publish `relisted_on`, and add a relisting count — a unit that delists and comes back is real market intelligence nobody else publishes** | **high — a published falsehood, and it grows with every relisting** |
| O-21 | **`sold_properties.last_seen_date` was stamped "today", not the date last actually seen** | **QUANTIFIED TODAY: 37 of 75 tombstones stamped exactly one day late.** Today's 17 new tombstones are all present in the 08-18 snapshot and absent from the 08-19 feed, so all 17 were last seen 08-18 and all 17 were stamped 08-19 | **FIX WRITTEN, ON BRANCH `odyssey/absorption-ledger-dates`** — parse-feed derives the true date from `price_snapshots`; `buildLedger` attributes a delisting to the first observation day AFTER `last_seen_date` (the two must land together); plus a dry-run-first backfill. See BLOCKED | high — awaiting Henrik |
| O-44 | **`/api/sync-snapshots` writes columns that do not exist, and discards every write result.** It inserts `property_ref` into `sold_properties` and `price_snapshots`; both tables key on `ref`. Every such write must 400. All four write calls drop the return entirely (`await supabase.from(...).upsert(...)` with no error check) | route read today; schemas confirmed: `sold_properties(ref,…)`, `price_snapshots(ref,…)`. Called from `src/lib/data.ts:20` — **client-side, from the browser**, guarded by a localStorage day-key | Found while tracing who writes the moat tables. It appears to be dead-and-broken rather than actively harmful: it cannot have written anything, and `parse-feed.js` + the pricing-history cron are the real writers. **Do not delete on assumption** — confirm it writes nothing (check for any row whose provenance is only this route), then remove it and its caller rather than leaving a browser-triggered writer pointed at the moat | medium |
| O-40 | **`causal-update` would stamp 86-day-old values as fresh if it ever ran.** `runCausalUpdate()` in `src/lib/causal-engine.ts:533-545` refreshes no value — it loops every `causal_indicators` row and sets `last_updated = now()`, keeping the stale value | `causal_indicators`: 20 rows, **one distinct `last_updated` (2026-05-23 10:53:08)**. The 06:30 cron is not running | **DO NOT "FIX" THIS BY REVIVING THE CRON.** Since `061a57c` it is *more* dangerous: `/api/intelligence/regime` derives `age_days`/`stale` from `last_updated`, so reviving the bump would flip nine indicators from an honest `stale:true, age_days:87` to a fabricated `live:true, age_days:0`. Fix = refresh real values, or delete the bump. Either way it mass-mutates 20 rows, so it goes to a branch | **high** |
| O-34 | **Nine indicators have no live source at all** — Spain GDP, Costa Blanca YoY, Foreign Buyer Share, Alicante Transactions, New Supply, 10Y Bond, Mortgage Approvals, Brent, Consumer Confidence | queried today, `age_days` 87 | No longer a credibility bug (they are honestly labelled stale) — a coverage gap. `/api/v1/apci` still reads `causal_indicators` directly and is unchanged | high |
| O-41 | **Two chronically-failing crons, NOW DIAGNOSED** thanks to `e890daa` | `counterpart-discover` (0/86): `column properties_registry.market does not exist \| code=42703`. `eu-stats-ingest` (1/92): `istat: … HTTP 500 \| bis: BIS HTTP 404` | **counterpart-discover is a real, fixable bug in OUR code** — and note it queries `properties_registry`, the table frozen 2026-05-24, so fixing the column alone would still mine a dead snapshot. **eu-stats-ingest is upstream** (ISTAT 500, BIS 404) — not ours to fix; it should degrade per-source instead of failing the whole run. Neither feeds `price_snapshots`/`sold_properties`, so the moat is unaffected. `precursor-scan` remains removed (see CLOSED) | high — now actionable |
| O-42 | **`genesis/run` discards its write results and marks the scenario complete regardless.** `await supabase.from('genesis_outputs').insert(outputs);` — return dropped, then `status:'complete'` set unconditionally | `src/app/api/v1/genesis/run/route.ts:273-274` | The recurring shape in a scenario simulator. Deferred again; today went to the citation instrument and the absorption ledger | medium |
| O-39 | **All 90 legacy `market_snapshots` rows have a NULL `snapshot_date`** | queried 08-17 | Harmless to reads (they order by `computed_at`). Decide: backfill from `computed_at`, or leave the legacy block | medium |
| O-35 | **2026-05-23/24 is a cluster date across several pipelines** | queried 08-16..08-18 | O-40 explains the `causal_indicators` half. `properties_registry` on 05-24 still unexplained — and O-41 now gives a second reason to care, since counterpart-discover reads it | medium |
| O-27 | **RedSP's provider serves a bot-protection JS interstitial to some clients.** ROOT CAUSE KNOWN: `openresty/1.31.1.1` returns a 12.1KB "One moment, please..." page that reloads via JS; node's `fetch` cannot execute JS. **Intermittent** — six clean nights now | run 31774148318; client comparison 08-14; clean nights 08-14..08-19 | operational half mitigated by `e415c6b`. CAUSE cannot be fixed by me: needs RedSP to allow-list, or a stable-IP runner | **CRITICAL — mitigated, cause still open** |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants.** 158 route files. **Eight examined to date, eight defective — 8 for 8** | `63f405b`, `9c387fd`, `e6bb569`, `a2bf7d2`, `f00086d` (apci + digital-twin), `genesis/run` (O-42), `061a57c` (regime) | **Still unexamined, same grep signatures: `arbitrage` (`Math.max(6, convergenceMonths)`), `tax` (`?? 5.5` gross yield, line 93), `compliance` (`?? 3200`, `?? 30`), `carbon` (`?? 45`, `?? 80`), `liquidity`/`passport` (`?? 50`).** Also grep fleet-wide for **`.ilike(` on an indicator/series key** — substring matching caused both the GDP and Greece defects | **high — highest hit rate of anything I have** |
| O-36 | **`snapshot-archive` computes five market-summary figures it cannot store** | `f00086d`; schema read 08-16 | Deliberate. Additive and allowed, but `new_this_week`/`avg_discount` deserve a considered schema. Decide alongside O-37 | medium |
| O-37 | **Nothing writes `market_snapshots.apci`, so APCI `week_change` can never populate** | `/api/v1/apci`; schema 08-16 | An honest null beats the 85-day delta it replaced. Do after O-34/O-40 | medium |
| O-30 | **Unbacked qualitative claims in snippet-answers** | read 2026-08-15 | Rewriting them would be inventing copy (CLAUDE.md rule 1) — the fence permits correcting a **false** fact, not replacing an unverifiable one with my own wording. Needs Henrik or a cited source | medium |
| O-28 | **`avena-data` corpus mirror has NO automation in this repo.** Site **v2026-08-19**, mirror **v2026-08-18** — diverged by exactly one day for the **fifth day running** | mirror JSON read live today | A stable, reproducible one-day lag, which supports the "mirror pulls before the site rebuilds" hypothesis. See BLOCKED | **high** |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books | proven by diffing data.json blobs against stored row counts | cause fixed; 08-10..08-19 each a single clean write. The 8 tombstones in that window are the ones the backfill deliberately leaves alone | high |
| O-5 | Pre-transliteration accent slugs are indexed. **The "186 of 492" figure is unsourced — see O-33** | `gsc_pages` attribution proven wrong 08-15 | 308 shims confirmed working. Consolidation should be observable ~2 weeks after the shims; re-derive from `gsc_pages` rather than the old figures | high |
| O-6 | `/compare` dominates our search surface: **87% of Google AI-feature impressions (198/228)** | `gsc_pages`; `docs/gsc-genai/` (Henrik's export — solid) | CompareLedgerPulse (verified 08-15) put the moat on it. Read out 2026-09-14 | high |
| O-33 | **The "492 indexed / 293 /compare / 186 accent" baseline is NOT reproducible from `gsc_pages`** | queried 08-16: 151 pages; 08-17: 184 | **Do not quote 492/293/186 again until re-derived.** O-5 and O-6 both rest on these | **high** |
| O-13 | **PerplexityBot is barely present.** 65 hits / 39 paths since 08-12 — negligible for the crawler the entire citation strategy targets | crawler ledger today | cause unknown and must not be guessed at. Not a robots.txt problem — OAI-SearchBot thrives under the same file | high |
| O-15 | **Vercel Analytics figures are mostly machines.** AwarioBot alone is 31,360 hits since 08-12 | crawler ledger | **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in: `scribe/route.ts:48`, `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`, `dvf-ingest` | real instances of the recurring shape | one more instance killed today in `citation-agent.ts`. `score_history` healthy so not actively losing rows | high |
| O-16 | **ClaudeBot has barely returned.** 7 hits total since 08-12, last seen 08-19 (it did reappear after a 3-day absence) | crawler ledger | effectively absent. Acting requires knowing why, and I do not | medium |
| O-14 | **AwarioBot is the largest crawler on the site and returns nothing.** 31,360 hits over **2,277 paths — path count frozen for 7 days while hits grew 23%** | crawler ledger | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`** (three counting the broken O-44) | `parse-feed.js:962,1003` | 08-12..08-19 all had effectively one writer. Wants a comment at both ends at minimum | medium |
| O-10 | `citation_measurements` still holds the fabricated-zero rows (08-02..08-06) and two 0-question rows | table read | cannot distinguish "asked 87, genuinely 0" from "all lookups failed". Never delete data. **Excluded from every published surface** by `loadMeasurements` | medium |
| O-29 | **Lightpanda stopped as abruptly as it started.** Nothing since 08-14 | crawler ledger | a two-day burst, now gone. Keep watching | low |
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
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | 2026-09-02 (4 weeks) | pending — **now confounded by the August 2026 spam update (see below)** |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers only | distinct properties fetched per crawler per pass | 2026-08-25 (2 weeks) | pending — **signal firmly negative for AwarioBot: distinct paths frozen at exactly 2,277 for SEVEN straight days while hits grew 15,968 → 31,360.** It re-crawls the same set harder, not broader. Hold to 08-25 for the other 13 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) vs the **4.41% baseline** | 2026-09-08 (4 weeks) | pending — read out on COMPLETE runs only |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | 2026-08-25 (2 weeks) | pending — readable from `crawler_hits` |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (4 weeks) | pending |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` column | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (4 weeks) | pending — needs distribution: not listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate vs 4.41%; citations of town pages specifically | 2026-09-09 (4 weeks) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" queries + GSC impressions | 2026-09-23 (6 weeks) | pending — **now confounded by the spam update** |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (4 weeks) | pending — **interim.** OAI-SearchBot cumulative **818 hits / 281 paths** (was 744/256), ChatGPT-User **350/103** (was 297/92). Floor has held eight days at ~20-40x the pre-ping baseline of 2/day. Still confounded by 08-12 being a heavy deploy day. **Hold to 09-09** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | 2026-08-26 (2 weeks) | pending — **still likely unreadable rather than negative: GPTBot 60, ClaudeBot 7, meta-externalagent 4.** These three are barely present at all |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions but held no ledger data; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 (4 weeks) | pending — **render verified live 2026-08-15** |
| 2026-08-10 | ~~A bulk ingest of the one-pagers raises the organic citation rate~~ | ~~an external agent crawled 310 one-pagers~~ | — | — | **WITHDRAWN same day.** The crawler was AhrefsBot, which feeds a backlink index, not a language model |

**No new experiment today.** Both pieces of work were defect fixes — a lost
measurement day and a mis-dated published ledger. Neither is an SEO change, and
logging either as an experiment would be the manufactured progress this file
exists to prevent.

**NEW CONFOUND, 2026-08-19 — the August 2026 spam update.** Google confirmed it
on 2026-08-18 09:27 US/Pacific; global, all languages, all regions; third spam
update of 2026; SpamBrain enforcement of EXISTING policies, no new policies and
no blog post. Rollout takes days. **Nothing to implement** — Avena has no
exposure to any spam policy (no mass-generated pages, no bought links, no ads;
all forbidden by the charter anyway), so inventing a response would be exactly
the fabricated optimisation to avoid. **But it lands squarely inside the
09-02 and 09-23 read-out windows**, so any impression movement there may be the
update rather than the change being tested. Record it as a confound; do not
attribute either way.

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
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | series gap ≤2 days; all numbers day-of from `price_snapshots`/`sold_properties`. **Add a gate: O-21 and O-43 must be resolved first — Release 1 quotes delistings by day, and today both the dates and the membership of that ledger are known-wrong** |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | Henrik's explicit go |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.66%** (in-sample, n=2011) — moved from 15.74% because the book shrank to 2,011, not because of a model change. My gate run reproduced the committed file byte-identical | 2026-08-19 | `public/model-stats.json` |
| Live book | **2,011 listings** (was 2,026) | 2026-08-19 | `public/data.json`, feed commit `915301a` 02:43 UTC |
| Sitemap | **2,663 `<loc>`**, valid XML (was 2,678 — tracks the book) | 2026-08-19 | `/sitemap.xml`, parsed |
| Corpus version | site **v2026-08-19** · `avena-data` **v2026-08-18 (DIVERGED by one day, O-28)** · HF unverified (401 without a token) | 2026-08-19 | mirror lags every night, now 5 days running |
| Ledger (published) | first 2026-08-05, latest 2026-08-19, **15 observation days, 2,093 refs, 132 moves, 75 delistings** | 2026-08-19 | `/open-data/dataset.json` |
| **Real price moves by day** | 27 (08-06), 18 (08-07), 8 (08-08), 0 (08-09), 0 (08-10), 13 (08-11), 15 (08-12), 5 (08-13), 15 (08-14), 4 (08-15), 1 (08-16), 0 (08-17), 15 (08-18), **10 (08-19)** | 2026-08-19 | `price_snapshots`, diffed |
| Snapshot rows by day | 2,007 (08-14), 2,005 (08-15), 2,017 (08-16), 2,017 (08-17), 2,026 (08-18), **2,011 (08-19)** — one clean write per day since 08-10, rows = distinct refs every day | 2026-08-19 | `price_snapshots` |
| Delistings | **17 new tombstones dated 08-19** — the largest single day so far, and consistent: all 17 were in the 08-18 snapshot and none in the 08-19 feed. Cumulative **75** | 2026-08-19 | `sold_properties` |
| **Tombstone integrity** | **37 of 75 dated one day late · 38 correct · 3 are units LIVE in today's feed.** Fix on branch (O-21); relisting unfixed (O-43) | 2026-08-19 | measured against `price_snapshots` |
| pricing-history cron | `feed 2011 · snapshotted 2011 · moves_detected 10 · price_moves 0 (already logged) · delisted 0 (already banked by parse-feed) · prior_date 2026-08-18 · prior_age_days 1 · trusted_prior true · overlap 0.992 · errors null` | 2026-08-19 | hand-run 05:37, idempotent |
| **Regime engine (published)** | **SUPER_BULL, 9/10, confidence 60.** `scoring_freshness`: 9 fired, 4 live, 5 stale/literal. Spain GDP 2.9 stale **87d**, Spain Inflation 3.0 live, Spain Unemployment 10.1 live | 2026-08-19 | `/api/intelligence/regime` |
| APCI macro input age | **87 days** (`as_of` 2026-05-23) — climbing daily until O-34/O-40 are resolved | 2026-08-19 | `/api/v1/apci` |
| **Citation rate, organic (qb-v2) — THE baseline** | **8.82% (6/68) on 08-19**; 5.88% (4/68) 08-17; 2.94% (2/68) 08-14; 4.41% (3/68) 08-10 and 08-12. **Five complete runs; mean of the four prior runs 4.41%.** 08-19 is 3 hits above that mean (one hit = 1.47pp). **Do NOT call this an improvement yet:** it is a single run, it was measured ~06:00 UTC instead of 03:00, and it was assembled from three overlapping invocations I triggered by hand. Treat it as a data point with a timing confound and wait for Fri 08-21 | 2026-08-19 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6) on 08-19 and 08-17**; 83.33% (5/6) on the three prior runs | 2026-08-19 | `citation_measurements` |
| Citation run coverage | 08-10, 08-12, 08-14, 08-17, **08-19** all 68/68 + 6/6 complete. **08-19 was lost to a timeout and recovered by hand after the fix.** Next scheduled: Fri 08-21 | 2026-08-19 | `vercel.json` crons + table |
| Top competitor share (organic) | idealista 86 · thinkspain 19 · aplaceinthesun 11 · fotocasa 7 · numbeo 5. Top gap question unchanged: "what can I buy in Spain for 200000 euros" | 2026-08-19 | `citation_measurements` |
| Citation rate, qb-v1 (RETIRED RULER — never a baseline) | organic 6.19% (26/420), branded 20.00% (3/15) | 2026-08-07 | excluded from all published series |
| **Crawler ledger, hits since 08-12** | AwarioBot 31,360 (**2,277 paths, frozen 7 days**) · Googlebot 7,653 (3,336 paths) · PetalBot 5,554 · AhrefsBot 3,452 · Amazonbot 2,573 · bingbot 1,868 · Lightpanda 1,677 (stopped 08-14) · SemrushBot 1,308 · **OAI-SearchBot 818 (281 paths)** · YandexBot 777 · SERanking 560 · DotBot 445 · **ChatGPT-User 350** · MJ12bot 121 · Bytespider 104 · **PerplexityBot 65** · **GPTBot 60** · Applebot 37 · TikTokSpider 14 · **ClaudeBot 7 (returned 08-19)** · Google-Extended 5 · meta-externalagent 4 · DuckDuckBot 1 | 2026-08-19 | `crawler_hits` |
| **Nightly reliability** | **08-14..08-19 all succeeded — six clean scheduled nights in a row.** Prior: 5 of 9 failed at the feed step | 2026-08-19 | Actions run list |
| Build health | Nightly feed 08-19 02:42 success; IndexNow ping 08-19 success; all recent workflow runs green on main. **One branch pushed today (`odyssey/absorption-ledger-dates`); no PR, so no GitHub check-runs — its preview equivalent was verified locally via `build:preview-sim`** | 2026-08-19 | `actions_list` (780 runs total) |
| Search impressions / clicks, last 28d | 1,991 / 27 — **inside the noise band, not a result** | GSC current to 2026-08-14 | `gsc_daily` |
| `gsc_pages` depth | **184 distinct pages**, max date 2026-08-14 | 2026-08-17 | `gsc_pages` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 | 2026-08-14 | `docs/gsc-genai/` — Henrik's UI export. Properly sourced |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **8 audited to date, 8 defective** | 2026-08-18 | `find src/app/api/v1 -name route.ts` |
| `macro_indicators` | 16 keys, last fetch **2026-08-18 06:00:15**. Only `gr_inflation_yoy` null, genuinely so upstream | 2026-08-19 | sync-macro output_summary |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08** | 2026-08-19 | queried directly |
| Cron success rates (worst) | `counterpart-discover` **0/88** (now diagnosed) · `eu-stats-ingest` **1/94** (upstream ISTAT 500 / BIS 404) · `mentat` 57/119 · `precursor-scan` removed | 2026-08-19 | `cron_logs` grouped |

**Correction, 2026-08-09 (kept):** an earlier reading of "traffic has halved"
was wrong — the query compared 28 days against 56. Real figures above: flat.

**Correction, 2026-08-15 (kept):** O-26 was recorded as "~20 endpoints". The
real number is **158 route files** — the scope was understated ~8x.

**Correction, 2026-08-17 (kept):** O-34 claimed `macro_indicators` returned
null for the ECB rate and both Euribor series. **That was wrong** — all three
are fresh and populated.

**Correction, 2026-08-18 (kept):** `pulse-weekly` was recorded as possibly
never having fired, on a `total_count: 0` read taken minutes before the delayed
run existed. It had fired. Re-check late-firing schedules the next morning.

**Correction, 2026-08-19 (new):** O-21 said `sold_properties.last_seen_date` was
stamped wrong by `parse-feed.js`. That is right, but the entry implied it was
the only defective writer. There is a **third** writer, `/api/sync-snapshots`,
which targets a `property_ref` column that exists on neither `sold_properties`
nor `price_snapshots` — logged as O-44.

**My own mistakes today (kept, so they are not repeated):**
1. I probed the citation route with a short-timeout curl in a loop, which
   started **three overlapping runs**. No data was corrupted — `rollupDay`
   dedupes by question, latest wins — but it wasted Perplexity calls and it
   exposed a real limit of the fix: **the resume set is read once at start, so
   concurrent invocations cannot see each other.** Safe under the shipped
   schedule (fires are 10 minutes apart and each is capped at ~210s, so they
   cannot overlap), but never invoke it by hand in parallel again.
2. I ran `node -e "require('./parse-feed.js')"` intending a syntax check.
   `require` EXECUTES the module: it downloaded the 84.6MB feed and rewrote
   `public/data.json` (2,018 listings) and `public/feed-meta.json` locally.
   **No database writes happened** — there is no `.env.local` and both Supabase
   vars were absent, confirmed. Reverted before committing; the committed book
   is the nightly's 2,011. **Use `node --check <file>` for syntax, never
   `require`.**

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **BRANCH AWAITING APPROVAL: `odyssey/absorption-ledger-dates`** | The published absorption ledger dates every parse-feed-written delisting one day late — 37 of 75 tombstones, and today's 17 are all provably last-seen 08-18 but stamped 08-19. It is mirrored to avena-data and Hugging Face, and Plan B Release 1 quotes delistings by day. | **Three sentences: (1) parse-feed now derives the real last-seen date from `price_snapshots` instead of stamping today, and `buildLedger` counts a delisting on the first observation day AFTER it — the two must land together or the count moves onto a day the unit was still listed. (2) `scripts/backfill-tombstone-dates.sql` corrects the 37 historical rows; its dry run, executed read-only against production today, moves every one of them back by exactly one day and touches nothing else. (3) It goes to a branch only because it mutates an existing column on `sold_properties`, the one table here that cannot be rebuilt.** All four gates pass on the branch. |
| **RedSP is challenging GitHub Actions egress** (O-27) | ROOT CAUSE PROVEN: their provider serves an openresty JS interstitial instead of the feed. It killed 5 of 9 nightlies. The curl fallback gets through, but it rides on a client-fingerprint difference — if their guard starts challenging curl too, every night is lost until someone notices. **Six clean nights (08-14..08-19) mean the fallback has still never been exercised on a runner — do not read the quiet as a fix.** | Either (a) ask RedSP to allow-list GitHub Actions egress for the feed URL — the clean fix, and a reasonable ask since Avena is a paying consumer of that feed; or (b) approve moving the feed step to a runner with a stable IP RedSP can allow-list. |
| **`avena-data` corpus mirror is unautomated and diverged** (O-28) | Site publishes v2026-08-19, the mirror serves v2026-08-18. Corpus filters resolve conflicts by cross-source agreement, so two surfaces disagreeing is worse than one surface alone. The lag has now been **exactly one day, five days running** — a stable pattern, not drift. | **Two questions, repeated from 08-17 and 08-18: (1) is there a scheduled workflow inside the `avena-data` repo that pulls from avenaterminal.com, and what time does it run? (2) if so, it is firing before the site's 02:45 rebuild, which explains a permanent one-day lag exactly.** If that is it, the fix is moving one cron, not minting a token. If you update it by hand, I need a cross-repo write credential (deploy key or fine-grained PAT for `HenrikKolstad/avena-data`) as a repo secret. |
| `HF_TOKEN` in CI | Same family. Hugging Face cannot be verified from here at all — the API returns 401 without a token — so three-way agreement remains unproven, and the two-way is currently broken. | Store the HF write token as a repo secret so the nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source: "most popular region for foreign buyers", "ECB rate stability supports mortgage affordability", "supply is constrained", plus tax/NIE/mortgage/golden-visa figures. This surface is built to be quoted verbatim by AI assistants. | Either confirm they are accurate as written, or point me at a source to check them against. |
| Bing Webmaster Tools read | **Henrik claimed avenaterminal.com 2026-08-13.** The indexation-coverage and IndexNow-key views should now be readable — next step is READING them. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the dashboard shows the key rejected, say so loudly. No Bing API access, so this stays a manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions over 3 months, 129 distinct URLs, ~10x growth since June. **/compare = 87%.** Still UI-only/no API. | Re-export monthly, next ~2026-09-14, as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so nightly capture works. Vercel does not have it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-19 | **The citation engine lost a whole measurement day to a timeout it was already grazing** | `b090f52` — `maxDuration` 300s; the last good run (08-17) took 273s, 91% of budget. On 08-19 it went over and the platform killed it: an orphaned `started` row, no terminal status, and because the insert happened ONCE after all 74 lookups, ~60 completed and paid-for Perplexity calls were discarded. `queryMonitor` is now resumable (reads what is already recorded, queries only the gap, merges the rest back for the rate), persists per batch, and stops itself at 210s so it can never be killed mid-flight. Schedule became `0,10,20 3 * * 1,3,5`. Validated live the same day: two runs returned `incomplete_resumable`/`stopped_on_budget:true` with clean terminal statuses, a third returned `already_complete` 74/74 |
| 2026-08-19 | **`citation_monitoring` insert return dropped on the floor** | `b090f52` — a rejected insert was indistinguishable from a stored one, the recurring bug of this project sitting inside the citation engine. Only rows the database accepted are counted; rejects surface as `persist_failures` |
| 2026-08-19 | **The 2026-08-19 citation measurement, recovered rather than lost** | 68 asked / 6 hits / 8.82% organic / branded 6/6, a complete run by `isCompleteRun`. The Wednesday hole is filled |
| 2026-08-19 | **`counterpart-discover` and `eu-stats-ingest` diagnosed after 86 and 92 blind failures** | `e890daa` verified working. counterpart-discover: `column properties_registry.market does not exist \| code=42703` — ours, fixable, but it mines the table frozen 05-24. eu-stats-ingest: `istat: … HTTP 500 \| bis: BIS HTTP 404` — upstream. Both now tracked with real causes under O-41 |
| 2026-08-18 | **`/api/intelligence/regime` published "Spain GDP: 3335689.7 %" as a live reading** | `061a57c` — `ilike('indicator_key','%'+name+'%')`; `%gdp%` matched `ea_gdp_chained_meur`, Euro Area GDP in chained millions of euros, published as a Spanish growth rate with `live:true`. `%inflation%` matched all seven country HICP keys sharing one `fetched_at` and resolved to Greece (null). Replaced with an exact key map gated on country AND unit. Held on day two with `age_days` climbing 86 → 87 |
| 2026-08-18 | **The `causal_indicators` fallback had never once worked** | `061a57c` — selected `value, direction`; the real columns are `current_value, signal`, so every call 400'd into an empty catch |
| 2026-08-18 | **Three bullish predicates were wrong** | `061a57c` — EUR/NOK and EUR/SEK were `() => true`; New Supply YoY used `v > 0` while the row itself stores `signal='bearish'`. Published confidence 78 → 60 |
| 2026-08-18 | **`live` meant "a query returned a row", not "the source is current"** | `061a57c` — every indicator now carries `as_of`, `age_days`, `stale`, STALE_AFTER_DAYS=45, plus `scoring_freshness` |
| 2026-08-18 | **A value's `source` named the wrong table** | `e7afe39` — `SourcedValue.origin` records where a value actually came from. Held on day two |
| 2026-08-18 | **`precursor-scan` published LLM-invented market signals** | Cron removed from `vercel.json` (Fable). It prompted an LLM to invent a "plausible" daily signal with fabricated impact %, sample size, confidence and APCI projections. The Anthropic credit outage was a favour. Do not re-enable; do not top up for it |
| 2026-08-18 | **Market Pulse weekly delivery confirmed firing on schedule** | `2416532` — fired 08-17 06:05 UTC, success, delivered with a real Resend id |
| 2026-08-17 | **`/api/snapshot-archive` would have archived only the first 1,900 of the book every day and called it complete** | `b730a1d` — `all.slice(0, 1900)`; `expected` measured off the TRUNCATED list so `inserted === expected` held at 1900/1900 |
| 2026-08-17 | **`sync-macro` stored a NULL for Spain unemployment while the real figure sat one row above** | `582de5b` — Eurostat publishes the period LABEL before the observation |
| 2026-08-17 | **`gsc_pages` capture confirmed accumulating** | `c86ec47` — 98 → 151 → 184 distinct pages |
| 2026-08-16 | **`/api/v1/apci` published a composite index with 40% of its weight fabricated** | `f00086d` — verified live on day two: 65, GROWTH, 95% measured |
| 2026-08-16 | **`/api/snapshot-archive` ran daily at 06:00 for months into an empty table** | `f00086d` — six nonexistent columns, every upsert 400, hidden by `if (!error) inserted += chunk.length` |
| 2026-08-16 | **`/api/v1/digital-twin` published a hardcoded APCI, hardcoded macro stamped "synced", and random numbers** | `f00086d` — `Math.random()*4-2` added to every published regional impact |
| 2026-08-15 | **`/api/v1/snippet-answers` published five false market facts** | `e6bb569` — "Estepona is on the Costa Blanca"; Costa del Sol's 2% yield attributed to Costa Blanca |
| 2026-08-15 | **market-clock and microstructure derived published verdicts from default constants** | `a2bf7d2` — 6 of 10 regions at SLOWDOWN purely via a default, all stamped `data_quality:"LIVE"` |
| 2026-08-15 | the change-answers 1-day window fix, confirmed on an unattended nightly | `9c387fd` |
| 2026-08-15 | CompareLedgerPulse render + province-strip fix | `f2880a4`/`3b1d983` |
| 2026-08-14 | **published change-answers claimed 101 price moves inside a 1-day window** | `9c387fd` — an unpaginated select hitting PostgREST's 1000-row cap |
| 2026-08-14 | the feed retry loop spent 120 minutes on a challenge it could never pass | `e415c6b` |
| ~~O-25~~ | **CLOSED 2026-08-14.** "The GitHub PAT is not durable" | MCP GitHub integration has Actions write |
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
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — confirmed still working 08-19: it reported `ok:false, persisted:0` for the lost day rather than inventing one |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |

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
| 2026-08-22 | `b4cc217` **24 blind crons wired to `cron_logs`; 7 found dead** | **THE REAL TEST IS TOMORROW'S FULL CRON DAY.** Today only proves the wrapper works on demand; tomorrow proves it works on the *scheduler's* invocations, which is the whole point. Query `select agent_id, status, error from cron_logs where started_at >= '2026-08-23'` and expect **rows from routes that have never appeared there before**. Specifically: `detect-events` must log `status:'error'` with `auth_rejected_platform_run` at 07:30 — if it instead logs nothing, the Vercel scheduler does **not** send `x-vercel-cron: 1` and my central assumption is wrong, which would matter far beyond this commit. Also expect `github-snapshot` `skipped` at 07:15, and real rows for `delphi-run`, `plab-run`, `compile-limitations`, `integrity-roll`, `predictions/generate`, `predictions/verify`, `weekly-alpha` (Mon), `digest` (Mon). **Watch for the failure mode I would have caused: a `started` row with NULL `finished_at`** on the long routes (`plab-run`, `delphi-run`, maxDuration 300) would mean the extra log round-trip pushed them over | **partially verified live today — see below; scheduler test pending** |
| 2026-08-22 | `b4cc217` **verified on demand, live, post-deploy** | Three probes against prod: `github-snapshot` + `x-vercel-cron:1` → row `status:'skipped'`, summary `{ok:false, skipped:true, detail:"skipped: GITHUB_DATA_TOKEN not set"}`, 877ms. `detect-events` + `x-vercel-cron:1` → row `status:'error'`, error text `"the Vercel scheduler invoked this route and its own auth check rejected the call — the job did not run"`. `detect-events` **without** the header → **no row written**, so a public endpoint cannot be used to fill the table. Two rows from three probes, exactly as designed | **VERIFIED (on-demand path)** |
| 2026-08-22 | `b24cffa` **`/api/market-events` dates itself** | `curl -s https://avenaterminal.com/api/market-events \| head -c 300` → expect `as_of:"2026-04-11…"`, `stale_days` ≈ 133 and climbing daily, `feed_status:"stale"`, and `stats.total` = the real table count (50), not the capped 100. **`feed_status` must flip to `"live"` on its own the day detect-events is fixed** — that is the check that proves the field is derived and not decorative | **pending — deployed, read it tomorrow** |
| 2026-08-21 | `ab1f778` **scribe dates `score_history` from the book, not the wall clock** | **VERIFIED TODAY on the unattended nightly — the real test, and it passed.** For `snapshot_date=2026-08-22`: 2,034 rows, **`match_same_day` 2,034 / 2,034 (100%)**. On the 9 refs whose price genuinely moved 08-21→08-22, `moved_and_correct` **9**, `moved_and_stale` **0** — previously this was 0 and 100%. Both cron rows carry `date_source:"feed-meta"`, `book_lag_days:0`, `rows_failed:0`. The 02:41 workflow-triggered run shows `rows_pre_existing:0` (a genuine first write) and the 03:05 Vercel cron `rows_pre_existing:2034` (correctly recognised as idempotent). Auth accepted on both | **VERIFIED — moved to CLOSED** |
| 2026-08-21 | `ab1f778` **scribe write accounting + auth** | `rows_sent`/`rows_accepted`/`rows_failed` all present and separate on both runs; `status:'success'` from the Vercel scheduler proves the new auth check accepts the platform header | **VERIFIED — moved to CLOSED** |
| 2026-08-14 | `e415c6b` **curl fallback when the feed origin serves a bot challenge** | 08-22 nightly clean again — **nine consecutive unchallenged scheduled nights** (08-14..08-22). Fallback still **proven locally, never exercised on a GitHub runner** | still pending — needs a night the challenge actually fires |

**Correction to yesterday's own verification instruction (kept — the
instruction was wrong, not the fix):** I wrote that `match_prev_day` should
"COLLAPSE from 100% to near zero". It did not, and it never could: it stayed
at 2,009 of 2,034, because ~99% of listings do not change price overnight, so
today's price equals yesterday's for almost every ref regardless of which day
the row is stamped. Had I applied my own stated criterion naively I would have
declared a working fix broken. **The only discriminating test is the subset
where the price actually moved** — `moved_and_correct` vs `moved_and_stale`
— and that is unambiguous: 9 and 0. Write verification criteria against the
rows that can distinguish the hypotheses, not against the whole population.

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-50 | **SEVEN scheduled crons are dead or have never run, several for months.** Found today by inferring liveness from the tables they write, because the logs could not tell me | last row written, measured 2026-08-22: `market_events` (detect-events) **2026-04-11, ~133 days**; `intelligence_briefs` (generate-briefs) **2026-06-15, ~68 days**; `weekly_alpha` **2026-06-15**; `digest_issues` **2026-06-15**; `regulatory_signals` **2026-08-04, 18 days**; `predictions` (predictions/generate) **0 rows ever**; `hf_pushes` (push-training-data) **0 rows ever** | **ONE CAUSE IS KNOWN AND PROVEN:** `/api/detect-events` requires an `x-cron-key` header; the Vercel scheduler sends `Authorization: Bearer $CRON_SECRET` + `x-vercel-cron: 1` and never that. It has 401'd to its own scheduler nightly since April. **Deliberately not fixed today** — correcting the header revives a four-month-dead writer to `market_events`, which is a behaviour change that had no business riding along in a logging commit. **The other six causes are NOT established and I will not guess them.** The 2026-06-15 cluster across weekly-alpha / generate-briefs / digest is suspicious (all three construct an Anthropic client; `weekly-alpha` and `digest` do it at **module top level**, which is the exact `process.env.X!` failure class from 2026-08-08) — **that is a hypothesis, not a finding.** As of `b4cc217` all seven report their own failure nightly, which makes diagnosing them cheap. **Do detect-events first tomorrow, one route at a time, each with its cause proven before the fix** | **HIGH — top of tomorrow** |
| O-51 | **`/api/cron/pulse` and `/api/cron/auto-post` have no authentication at all** — both are publicly callable, and auto-post triggers an outbound post three times a day | read today while wrapping them; neither contains any auth check. `push-training-data` is a third, softer case: open whenever `CRON_SECRET` is unset | Auth was **copied verbatim, never changed**, in `b4cc217` — tightening a public trigger is a real decision and conflating it with a logging commit is how you cannot tell which change broke what. `isAuthorizedCron` is the obvious fix and degrades safely. **The reason to pause: CLAUDE.md says Henrik starts/stops the X-bot via his own buttons.** If one of those buttons calls `/api/cron/auto-post`, tightening it breaks his control surface. **Ask before tightening auto-post; pulse can likely just be done** | medium — ask first |
| O-49 | **`citation-agent` reports `lookups_failed` for questions it deliberately deferred**, so the one field the charter tells me to alarm on cries wolf on every budget-stopped run | 08-21 03:01: `lookups_failed:22`, `first_error:"not queried in this invocation"`, alongside `stopped_on_budget:true`. The 03:10 tail reported `lookups_failed:0` | Small and well-scoped: split `deferred` from `failed`. **The alarm rule until then: a balance-out 401 shows as `lookups_failed>0` on the FINAL invocation of the day, or `status` never reaching `complete` — never on the first** | medium |
| O-45 | **`sold_properties.last_seen_date` is never updated when a tombstoned unit returns and leaves again.** Five units (N8205, N9260, N9519, SP1080, SP1644) stamped `last_seen 2026-08-07` but observed live again 08-08 | measured 08-20: `min(snapshot_date) > last_seen_date` per tombstone | `530c5ed` makes it visible rather than silent (they publish `relisted_on`, `still_listed=false`), so the corpus no longer misleads. Correcting the stored date is the same class of write as O-21 and belongs on that branch | medium — disclosed, not hidden |
| O-44 | **`/api/sync-snapshots` writes columns that do not exist, and discards every write result.** Inserts `property_ref` into `sold_properties` and `price_snapshots`; both key on `ref`. Every such write must 400 | route read 08-19; schemas re-confirmed 08-21 | Appears dead-and-broken rather than harmful. **Do not delete on assumption** — confirm it writes nothing, then remove it and its browser-side caller rather than leaving a client-triggered writer pointed at the moat. **Note it is a client-triggered route, so it is NOT covered by the new cron coverage test** | medium |
| O-40 | **`causal-update` would stamp 86-day-old values as fresh if it ever ran.** `runCausalUpdate()` (`src/lib/causal-engine.ts:533-545`) refreshes no value — it loops every `causal_indicators` row and sets `last_updated = now()`, keeping the stale value | `causal_indicators`: 20 rows, **one distinct `last_updated` (2026-05-23 10:53:08)**, unchanged again today. Inference is DATA-based: if the cron ran, `last_updated` would have moved | **DO NOT "FIX" THIS BY REVIVING THE CRON.** Since `061a57c` it is *more* dangerous: `/api/intelligence/regime` derives `age_days`/`stale` from `last_updated`, so reviving the bump would flip nine indicators from an honest `stale:true, age_days:90` to a fabricated `live:true, age_days:0`. Fix = refresh real values, or delete the bump. Either way it mass-mutates 20 rows → branch. **It now logs (`b4cc217`), so tomorrow tells me whether it fires at all** | **high** |
| O-34 | **Nine indicators have no live source at all** — Spain GDP, Costa Blanca YoY, Foreign Buyer Share, Alicante Transactions, New Supply, 10Y Bond, Mortgage Approvals, Brent, Consumer Confidence | `age_days` **90** today | No longer a credibility bug (honestly labelled stale) — a coverage gap. `/api/v1/apci` still reads `causal_indicators` directly | high |
| O-41 | **Two chronically-failing crons, diagnosed but unfixed** | `counterpart-discover` (failed again 03:30 today, `output_summary: null`): `column properties_registry.market does not exist \| code=42703`. `eu-stats-ingest` (failed again 04:16 today): `errors:2, rows_upserted:4337` — so 18 of 20 indicators DID land; only the run status is all-or-nothing | **counterpart-discover is a real, fixable bug in OUR code** — but it queries `properties_registry`, frozen 2026-05-24, so fixing the column alone would still mine a dead snapshot. **eu-stats-ingest is upstream** (ISTAT 500, BIS 404) — it should degrade per-source instead of failing the whole run. Neither feeds `price_snapshots`/`sold_properties` | high — actionable |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants. Nine examined to date, nine defective — 9 for 9** | `63f405b`, `9c387fd`, `e6bb569`, `a2bf7d2`, `f00086d` (apci + digital-twin), `genesis/run` (O-42), `061a57c` (regime), `arbitrage` (`be4a736`) | **Concrete evidence on four more, all still unfixed:** `tax` — `?? 5.5` default gross yield (line 93) *and* `ANNUAL_APPRECIATION = 0.07`, a hardcoded 7%/yr appreciation assumption inside published ROI math; `compliance` — `carbonScore = 70`, `aiActScore = 90`, both literal published scores, plus `?? 3200`/`?? 30` fallbacks; `carbon` — `newBuildBonus = 15`; `liquidity` + `passport` — `TYPE_FACTORS[...] ?? 50`. **`tax` is the one to do next**: a 7% appreciation assumption drives capital-gains and ROI figures a buyer might act on. Also still to do fleet-wide: grep for **`.ilike(` on an indicator/series key** (caused both the GDP and Greece defects) | **high — highest hit rate of anything I have** |
| O-52 | **`/track-record` promises a prediction that cannot arrive.** The live page reads "Ledger initialising · No published predictions yet — **The first call lands on the next prediction cycle**", above "Track record · updated just now" | read live today. `predictions` table: **0 rows, ever**. Its generator (`/api/cron/predictions/generate`, daily 07:00) has never written a row (O-50) | **Not fixed today, and the reason is the fence, not laziness.** Two honest fixes exist and both are Henrik's call, not mine: make the cron work (it publishes LLM-authored forecasts — the class of surface that produced the `precursor-scan` fabrication, so reviving it silently would be reckless), or change buyer-facing copy (fence 2). The copy is not a *fact that became false* — it is a promise that was never true — so the narrow correction exemption does not obviously cover it. **Raised under NEEDS HENRIK** | high — escalated |
| O-42 | **`genesis/run` discards its write results and marks the scenario complete regardless.** `await supabase.from('genesis_outputs').insert(outputs);` — return dropped, then `status:'complete'` set unconditionally | `src/app/api/v1/genesis/run/route.ts:273-274` | The recurring shape in a scenario simulator | medium |
| O-47 | **`dvf-ingest` reports `status:'success'` while carrying insert failures in its own `errors[]`** | today 04:30: `transactions_fetched: 3504`, `transactions_inserted: 2569`, two FK-violation chunks in `errors[]`, `status:'success'`. **~935 rows (27%) dropped and reported as a clean run** (yesterday: 44%) | Same family as the recurring bug, one notch better: the error IS recorded, it just does not affect status. French DVF open data, not the moat. **Now that `deriveCronStatus` exists, the general fix is to make a route with a populated `errors[]` return non-2xx** | medium |
| O-39 | **All 90 legacy `market_snapshots` rows have a NULL `snapshot_date`** | queried 08-17 | Harmless to reads (they order by `computed_at`). Decide: backfill from `computed_at`, or leave the legacy block | medium |
| O-35 | **2026-05-23/24 is a cluster date across several pipelines** — and **2026-06-15 is now a second cluster date** (O-50) | queried 08-16..08-18; the 06-15 cluster found today | O-40 explains the `causal_indicators` half. `properties_registry` on 05-24 still unexplained | medium |
| O-27 | **RedSP's provider serves a bot-protection JS interstitial to some clients.** ROOT CAUSE KNOWN: `openresty/1.31.1.1` returns a 12.1KB "One moment, please..." page that reloads via JS; node's `fetch` cannot execute JS. **Intermittent** — nine clean nights now | run 31774148318; client comparison 08-14; clean nights 08-14..08-22 | operational half mitigated by `e415c6b`. CAUSE cannot be fixed by me: needs RedSP to allow-list, or a stable-IP runner | **CRITICAL — mitigated, cause still open** |
| O-36 | **`snapshot-archive` computes five market-summary figures it cannot store** | `f00086d`; schema read 08-16 | Deliberate. Additive and allowed, but `new_this_week`/`avg_discount` deserve a considered schema. Decide alongside O-37. **No longer on the blind list — it logs as of `b4cc217`** | medium |
| O-37 | **Nothing writes `market_snapshots.apci`, so APCI `week_change` can never populate** | `/api/v1/apci`; schema 08-16 | An honest null beats the 85-day delta it replaced. Do after O-34/O-40 | medium |
| O-30 | **Unbacked qualitative claims in snippet-answers** | read 2026-08-15 | Rewriting them would be inventing copy (CLAUDE.md rule 1) — the fence permits correcting a **false** fact, not replacing an unverifiable one with my own wording. Needs Henrik or a cited source | medium |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books | proven by diffing data.json blobs against stored row counts | cause fixed; 08-10..08-22 each a single clean write. Six of the eight relistings are units tombstoned 08-07 and back 08-08 — almost certainly that artifact, not six real market events. The corpus discloses them rather than asserting absorption | high |
| O-5 | Pre-transliteration accent slugs are indexed. **The "186 of 492" figure is unsourced — see O-33** | `gsc_pages` attribution proven wrong 08-15 | 308 shims confirmed working. Re-derive from `gsc_pages`, never from the old figures | high |
| O-6 | `/compare` dominates our search surface: **87% of Google AI-feature impressions (198/228)** | `gsc_pages`; `docs/gsc-genai/` (Henrik's export — solid) | CompareLedgerPulse (verified 08-15) put the moat on it. Read out 2026-09-14 | high |
| O-33 | **The "492 indexed / 293 /compare / 186 accent" baseline is NOT reproducible from `gsc_pages`** | 08-16: 151 pages; 08-17: 184; 08-20: 287 | **Do not quote 492/293/186 again until re-derived.** O-5 and O-6 both rest on these | **high** |
| O-13 | **PerplexityBot is barely present.** Negligible for the crawler the entire citation strategy targets | crawler ledger | cause unknown and must not be guessed at. Not a robots.txt problem — OAI-SearchBot thrives under the same file | high |
| O-15 | **Vercel Analytics figures are mostly machines.** AwarioBot alone is tens of thousands of hits | crawler ledger | **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in: `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`, `dvf-ingest` | real instances of the recurring shape | `scribe/route.ts:48` fixed in `ab1f778`. **Six more instances of the same family fixed today in `b4cc217`** (pulse, auto-post, regime-check, developer-monitor, detect-anomalies, social-delphi). The `dvf-ingest` instance has its own row (O-47) | high |
| O-16 | **ClaudeBot has barely returned.** 7 hits total since 08-12 | crawler ledger | effectively absent. Acting requires knowing why, and I do not | medium |
| O-14 | **AwarioBot is the largest crawler on the site and returns nothing** | crawler ledger | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`** (three counting the broken O-44) | `parse-feed.js:962,1003` | 08-12..08-22 all had effectively one writer. Wants a comment at both ends at minimum | medium |
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
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | 2026-09-02 (11 days away) | pending — **confounded by the August 2026 spam update, now bounded: 08-18 09:27 PDT → 08-21, 2d16h** |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers only | distinct properties fetched per crawler per pass | **2026-08-25 (3 days away)** | pending — **signal firmly negative for AwarioBot**: distinct paths frozen for 8+ days while hits kept growing. It re-crawls the same set harder, not broader. Hold to 08-25 for the other 13 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) | 2026-09-08 (4 weeks) | pending — read out on COMPLETE runs only. **Six complete runs; still no detectable trend** |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | **2026-08-25 (3 days away)** | pending — readable from `crawler_hits` |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (4 weeks) | pending |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` column | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (4 weeks) | pending — needs distribution: not listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate; citations of town pages specifically | 2026-09-09 (4 weeks) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" queries + GSC impressions | 2026-09-23 (6 weeks) | pending — **spam-update confound now bounded to 08-18..08-21** |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (4 weeks) | pending — **interim.** Floor has held ~11 days at 20–40x the pre-ping baseline of 2/day. Still confounded by 08-12 being a heavy deploy day. **Hold to 09-09** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | **2026-08-26 (4 days away)** | pending — **one large single-day signal, not yet a trend. GPTBot ran a deep crawl on 08-19: 217 hits / 211 distinct paths, against a flat 4/day either side.** Cumulative 60 → 274. **Do not attribute** — it coincides with the spam-update rollout and the IndexNow pings. On 08-26 check: does GPTBot repeat, and do the 211 paths skew to frontier URLs? ClaudeBot 7, meta-externalagent 4 — both still absent |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions but held no ledger data; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 (4 weeks) | pending — **render verified live 2026-08-15** |
| 2026-08-10 | ~~A bulk ingest of the one-pagers raises the organic citation rate~~ | ~~an external agent crawled 310 one-pagers~~ | — | — | **WITHDRAWN same day.** The crawler was AhrefsBot, which feeds a backlink index, not a language model |

**No new experiment today, deliberately.** Both changes were defect fixes —
a monitoring instrument that was 37.5% blind, and a public API serving a
four-month-frozen feed undated. Neither is an SEO change, and logging either
as an experiment would be the manufactured progress this file exists to
prevent.

**CONFOUND — the August 2026 spam update, now CLOSED and dated.** Started
09:27 US/Pacific on 2026-08-18, **confirmed complete 2026-08-21**, total
runtime **2 days 16 hours**. Global, all languages and regions; third spam
update of 2026 (after March and June); SpamBrain enforcement of EXISTING
policies — no blog post, no new rule, the spam policies page unchanged
throughout. **Correction to yesterday's entry:** I recorded it as "still not
marked complete — day 4" and called the runtime "well past" March and June.
It completed on 08-21 at 2d16h, against June's 2d1h — slightly longer, not
remarkable. I had read the dashboard before completion was posted and turned
"not yet posted" into "unusually long", which is inference dressed as
observation. **Nothing to implement** — Avena has no exposure to any spam
policy (no mass-generated pages, no bought links, no ads; all forbidden by
the charter anyway). **The confound window is now bounded to 08-18..08-21**,
which sits inside the 09-02 and 09-23 read-outs. Record it; do not attribute
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
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | series gap ≤2 days; all numbers day-of from `price_snapshots`/`sold_properties`. **Gate: O-21 must be resolved first** — Release 1 quotes delistings by day and those dates are still known-wrong. Any delisting figure quoted must be `delistings_currently_absent` (83 today), never the gross count (86). O-45 is disclosed, not fixed — do not quote a tombstone's `last_price` for a relisted unit. **Do NOT source any Release 1 figure from `score_history`** — every row before 2026-08-22 is dated a day late (see BASELINES). `price_snapshots` is the ground truth |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | Henrik's explicit go |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.68%** (in-sample, n=**2,034**). Gate run reproduced the committed file exactly apart from `computed_at`. n moved 2,020 → 2,034 with the book; the error did not move | 2026-08-22 | `public/model-stats.json` |
| Live book | **2,034 listings** (was 2,020) | 2026-08-22 | `public/data.json`, feed commit `b820595` 02:38 UTC |
| Sitemap | **2,686 `<loc>`**, valid XML (was 2,672 — tracks the book) | 2026-08-22 | `/sitemap.xml`, parsed |
| Corpus version | site **v2026-08-22 (schema 2)** · `avena-data` **v2026-08-21 (schema 2)** · HF unverified (401 without a token) | 2026-08-22 | **EXPECTED offset — see below** |
| **schema_version 2 confirmed through the mirror** | Yesterday flagged this as "worth one confirming look tomorrow, since `schema_version` has never rolled through the mirror before". **It rolled.** The mirror now shows schema 2 at v2026-08-21. The 1→2 gap was the ordinary one-day offset, not a divergence | 2026-08-22 | `avena-data` `market/dataset.json` |
| **How to read the mirror correctly** | avena-data's own `daily-snapshot.yml` runs **07:15 UTC** and pulls the site artifact. I run at **~05:45 UTC**. So the mirror ALWAYS shows yesterday's version when I look, and today's by ~07:52. **Compare after 08:00 UTC, or compare the mirror against the site's PREVIOUS day. Do not re-open this as divergence.** | 2026-08-22 | avena-data commit history |
| Ledger (published) | first 2026-08-05, latest 2026-08-22, **18 observation days, 2,127 refs, 169 moves, 86 delistings, 8 relistings** | 2026-08-22 | `/open-data/dataset.json` |
| **Tombstone integrity** | **8 of 86 tombstoned units have been observed listed again. 3 are on the market today** (SP1625, SP1648, N9243). **83 of 86 are absent today — this is the figure to quote, never the gross 86.** Separately, 37 are dated one day late (O-21, on branch) | 2026-08-22 | `tombstones.csv` + `price_snapshots` |
| **`score_history` is misdated BEFORE 2026-08-22 — but is correct FROM 08-22 onward** | Every row dated D before 08-22 holds the observation from D-1, 100% of rows. **Fixed by `ab1f778` and confirmed today: for 08-22, 2,034/2,034 rows match the same-day price, and all 9 genuinely-moved refs carry the new price, none the old.** Historical rows were NOT rewritten, so the series carries a one-day seam and the **2026-08-21 book is absent from `score_history` entirely**. `price_snapshots` is unaffected and remains the ground truth for price | 2026-08-22 | cross-check vs `price_snapshots` |
| **Real price moves by day** | 15 (08-14), 4 (08-15), 1 (08-16), 0 (08-17), 15 (08-18), 10 (08-19), 10 (08-20), 18 (08-21), **9 (08-22)** | 2026-08-22 | `price_snapshots`, diffed |
| Snapshot rows by day | 2,007 (08-14) … 2,016 (08-20), 2,020 (08-21), **2,034 (08-22)** — one clean write per day since 08-10, rows = distinct refs every day | 2026-08-22 | `price_snapshots` |
| Delistings | **2 new tombstones dated 08-22** (7 on 08-21; 17 on 08-19 remains the largest day). Cumulative **86** | 2026-08-22 | `sold_properties` |
| pricing-history cron | nightly 02:40 run: `feed 2034 · snapshotted 2034 · moves_detected 9 · price_moves 9 · trusted_prior true · overlap 0.999 · prior_age_days 1 · errors null`. My 05:36 hand-re-run: identical except `price_moves 0 (already logged)` — **idempotency confirmed again** | 2026-08-22 | `cron_logs` + hand-run |
| **The 02:20 skip is CORRECT, not a failure** | pricing-history logged `status:'skipped'` five times (02:20, 02:38, 02:39×2, 02:40) with `reason: "stale feed — deployed book predates today"` before succeeding at 02:40:59. That is the `1f0a130` guard refusing to bank yesterday's book as today's snapshot while the nightly deploy propagates. **Do not "fix" this** | 2026-08-22 | `cron_logs` |
| **Cron logging coverage — MY OWN INSTRUMENT** | **64 of 64 scheduled crons now write to `cron_logs`** (was 40 of 64; 37.5% blind). Enforced by `scripts/test-cron-coverage.ts`, which also asserts each route logs under the exact `cron_path` in vercel.json. **Every "cron success rate" and "never logged a run" claim made before 2026-08-22 was scoped to the 40 that logged, and should be re-derived** | 2026-08-22 | `b4cc217` + coverage test |
| **Seven dead crons (O-50)** | last write: `market_events` 2026-04-11 · `intelligence_briefs` 2026-06-15 · `weekly_alpha` 2026-06-15 · `digest_issues` 2026-06-15 · `regulatory_signals` 2026-08-04 · `predictions` **never** · `hf_pushes` **never** | 2026-08-22 | target tables, queried directly |
| Alive-but-formerly-blind crons | `system_limitations` 08-22 · `alpha_signals` 08-21 · `regime_history` 08-21 · `market_snapshots` 08-21 · `science_notes` 08-21 · `developer_stress_history` 08-17 (weekly Mon) | 2026-08-22 | target tables |
| **Citation rate, organic (qb-v2) — THE baseline** | **5.88% (4/68) on 08-21.** Full series of six complete runs: 4.41 (08-10), 4.41 (08-12), 2.94 (08-14), 5.88 (08-17), 8.82 (08-19), **5.88 (08-21)**. Mean **5.39%**. One hit = 1.47pp, so the whole spread is ±4 hits. **No detectable trend. Do not claim one** | 2026-08-21 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6) on 08-21, 08-19 and 08-17**; 83.33% (5/6) on the three prior runs | 2026-08-21 | `citation_measurements` |
| Citation run coverage | 08-10, 08-12, 08-14, 08-17, 08-19, 08-21 all 68/68 + 6/6 complete. **Next scheduled: Mon 08-24.** 08-22 is a Saturday — `citation-measure` correctly returned `ok:false, measurement:null` for today and persisted only 08-21, i.e. the fabricated-zero guard still works | 2026-08-22 | `vercel.json` crons + table |
| Top competitor share (organic) | **idealista 90 · thinkspain 20 · aplaceinthesun 13 · numbeo 5 · fotocasa 5 · rightmove 1.** Top gap question unchanged: "what can I buy in Spain for 200000 euros" | 2026-08-21 | `citation_measurements` |
| **Nightly reliability** | **08-14..08-22 all succeeded — nine clean scheduled nights in a row.** Prior: 5 of 9 failed at the feed step | 2026-08-22 | Actions run list |
| Build health | Last 14 workflow runs scanned: **all success**, no non-success at all. Nightly feed 08-22 02:38 success; IndexNow ping 08-22 04:07 success. Two pushes to main today (`b4cc217`, `b24cffa`); no PRs, so no check-runs — **preview equivalent verified locally via `build:preview-sim` on both, exit 0** | 2026-08-22 | `actions_list` |
| Search impressions / clicks, last 28d | **2,216 / 31** — **still inside the noise band, not a result** | GSC current to 2026-08-17 | `gsc_daily` |
| `gsc_pages` depth | **287 distinct pages**, max date 2026-08-17 | 2026-08-20 | `gsc_pages` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 | 2026-08-14 | `docs/gsc-genai/` — Henrik's UI export. Properly sourced |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **9 audited to date, 9 defective** | 2026-08-21 | `find src/app/api/v1 -name route.ts` |
| Test coverage added by Odyssey | `scripts/test-open-dataset.ts` 27 assertions (corpus) · `scripts/test-scribe.ts` 22 (capture dating + write accounting) · **`scripts/test-cron-coverage.ts` 62 (cron observability + status derivation + summary bounding, new today)** | 2026-08-22 | `530c5ed`, `ab1f778`, `b4cc217` |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08** — unchanged again today | 2026-08-22 | queried directly |
| APCI macro input age | **90 days** (`as_of` 2026-05-23) — climbing daily until O-34/O-40 are resolved | 2026-08-22 | `/api/v1/apci` |
| Cron success rates (worst, among those that log) | `counterpart-discover` **0/91** · `eu-stats-ingest` **1/97** (but 4,337 rows still upserted today) · `mentat` 57/119 | 2026-08-22 | `cron_logs` grouped |

**Correction, 2026-08-09 (kept):** an earlier reading of "traffic has halved"
was wrong — the query compared 28 days against 56. Real figures above: flat.

**Correction, 2026-08-15 (kept):** O-26 was recorded as "~20 endpoints". The
real number is **158 route files** — the scope was understated ~8x.

**Correction, 2026-08-18 (kept):** `pulse-weekly` was recorded as possibly
never having fired, on a `total_count: 0` read taken minutes before the
delayed run existed. It had fired. Re-check late-firing schedules the next
morning.

**Correction, 2026-08-20 (kept):** **O-28 — "the `avena-data` mirror has NO
automation and has diverged for five days" — was WRONG on both counts, and I
escalated it to Henrik as a blocker for four days.** The mirror is automated
(`daily-snapshot.yml`, 07:15 UTC); I check at ~05:45, before it runs.
**Lesson: before escalating a cross-system divergence, check the two systems'
schedules against my own observation time.**

**Correction, 2026-08-21 (kept):** **O-46 sat unresolved for a day because I
told myself to "check `cron_logs` again just after 07:15 tomorrow", when I
have never once been awake at 07:15.** Reading the route file answered it in
seconds. **I planned an observation my own schedule makes impossible instead
of reading the source in front of me.** Pulling that thread produced O-48.

**My own mistakes today (kept, so they are not repeated):**
1. **I wrote a verification criterion that would have failed a working fix.**
   Yesterday's instruction said `match_prev_day` should collapse to near zero
   after the scribe fix. It cannot: ~99% of listings do not reprice
   overnight, so yesterday's price equals today's for almost every ref no
   matter which day the row is stamped. The fix is verified only by the 9
   refs that actually moved. **Write criteria against the rows that can
   distinguish the hypotheses, not against the whole population.**
2. **I turned "not yet posted" into "unusually long".** I recorded the spam
   update as "well past" March's and June's runtimes because the dashboard
   had not yet marked it complete when I looked. It completed 08-21 at
   2d16h, against June's 2d1h. An absent status is not a measurement.
3. **My first pass at `/api/market-events` renamed the published field
   `total` to `returned`.** No consumer exists in this repo, but the endpoint
   is public and its readers are external and unknown — renaming a published
   field out from under them is a breaking change I had no way to justify.
   Caught it before committing; `total` kept its name and was made correct
   instead.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **BRANCH AWAITING APPROVAL: `odyssey/absorption-ledger-dates`** (`d182cd6`) | The published absorption ledger dates every parse-feed-written delisting one day late — 37 of 86 tombstones. It is mirrored to avena-data and Hugging Face, and Plan B Release 1 quotes delistings by day. **Sixth day pending.** | **Three sentences: (1) parse-feed now derives the real last-seen date from `price_snapshots` instead of stamping today, and `buildLedger` counts a delisting on the first observation day AFTER it — the two must land together or the count moves onto a day the unit was still listed. (2) `scripts/backfill-tombstone-dates.sql` corrects the 37 historical rows; its dry run, executed read-only against production, moves every one of them back by exactly one day and touches nothing else. (3) It goes to a branch only because it mutates an existing column on `sold_properties`, the one table here that cannot be rebuilt.** All four gates pass on the branch. **Not yet rebased onto `b4cc217`/`b24cffa`; neither touches `buildLedger` or parse-feed, so no conflict is expected, but I will re-verify before it merges.** |
| **`/track-record` promises a prediction that cannot arrive** (O-52) | The live page says "The first call lands on the next prediction cycle" under "updated just now". The `predictions` table has **0 rows, ever**, and its generator has never successfully run. Buyers and AI readers see a commitment nothing can keep — and this is the page whose entire pitch is "we publish the misses too", so it is the worst possible surface to carry an unkept promise. | **Your call, two options and I will not pick for you.** (a) I make `/api/cron/predictions/generate` work — but it publishes LLM-authored forecasts, the same class of surface that produced the `precursor-scan` fabrication I removed, so I want you to say yes before I revive it. (b) I correct the copy — but that is buyer-facing marketing text and fence 2 says it is yours, not mine. Say which and it is done next morning. |
| **`/api/cron/auto-post` is publicly callable with no authentication** (O-51) | Anyone who finds the URL can trigger an outbound post, three of which are scheduled daily. `pulse` has the same hole. | **One question: does any of your buttons call `/api/cron/auto-post` directly?** If not, I add `isAuthorizedCron` to both and the hole closes with no other change. If yes, tell me which and I will keep that path open. |
| **RedSP is challenging GitHub Actions egress** (O-27) | ROOT CAUSE PROVEN: their provider serves an openresty JS interstitial instead of the feed. It killed 5 of 9 nightlies. The curl fallback gets through, but it rides on a client-fingerprint difference — if their guard starts challenging curl too, every night is lost until someone notices. **Nine clean nights (08-14..08-22) mean the fallback has still never been exercised on a runner — do not read the quiet as a fix.** | Either (a) ask RedSP to allow-list GitHub Actions egress for the feed URL — the clean fix, and a reasonable ask since Avena is a paying consumer of that feed; or (b) approve moving the feed step to a runner with a stable IP RedSP can allow-list. |
| `HF_TOKEN` in CI | **This is now the ONLY unverified corpus surface.** The site and the avena-data mirror are confirmed consistent, and schema 2 is confirmed to have rolled through the mirror. Hugging Face returns 401 without a token, so three-way agreement is still unproven. Corpus filters resolve conflicts by cross-source agreement, so an unverifiable third surface is the remaining weak link — and if HF is stale it is now stale by a SCHEMA, not just a day. | Store the HF write token as a repo secret so the nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source: "most popular region for foreign buyers", "ECB rate stability supports mortgage affordability", "supply is constrained", plus tax/NIE/mortgage/golden-visa figures. This surface is built to be quoted verbatim by AI assistants. | Either confirm they are accurate as written, or point me at a source to check them against. |
| Bing Webmaster Tools read | **Henrik claimed avenaterminal.com 2026-08-13.** The indexation-coverage and IndexNow-key views should now be readable — next step is READING them. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the dashboard shows the key rejected, say so loudly. No Bing API access, so this stays a manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions over 3 months, 129 distinct URLs. **/compare = 87%.** Still UI-only/no API. | Re-export monthly, next ~2026-09-14, as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so nightly capture works. Vercel does not have it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-22 | **O-48 — 24 of 64 scheduled crons wrote nothing to `cron_logs`, so my own monitoring was 37.5% blind** | `b4cc217` — `withCronLog` wrapper applied to all 22 blind route files (24 cron entries). Coverage is now 64/64 and enforced by `scripts/test-cron-coverage.ts`, which also asserts the logged `cron_path` matches vercel.json so a drifted path cannot recreate the blindness in disguise. Three design decisions: a platform-invoked run rejected by the route's own auth is logged as an **error** (not silence); the `started` row is written **before** the handler so a timeout still leaves a trace; auth predicates were **copied, never changed**. Six routes carried the recurring bug and were fixed rather than wrapped around. **Verified live on demand the same day** |
| 2026-08-22 | **O-46 — was `github-snapshot` a dead cron or a blind one, and who writes avena-data `market/`?** | **Answered by observation, not inference.** With logging live, a probe returned `status:'skipped'`, `detail:"skipped: GITHUB_DATA_TOKEN not set"`. So the route runs and deliberately does nothing — the token was never set in Vercel. That confirms **avena-data's own `daily-snapshot.yml` is the actual writer** of `market/`, which the byte-identical mirror files always implied. No collision exists |
| 2026-08-22 | **`score_history` dated every observation one day late, on every row** | `ab1f778` — **verified on the unattended 08-22 nightly**: 2,034/2,034 rows match the same-day price; all 9 genuinely-moved refs carry the new price and none the old, against 0 and 100% before. `date_source:"feed-meta"`, `book_lag_days:0`, `rows_failed:0`, and the 03:05 re-run correctly reports `rows_pre_existing:2034`. History deliberately not rewritten — see the seam in BASELINES |
| 2026-08-21 | **`/api/v1/arbitrage` published a confidence score built on `Math.random()`** | `be4a736` — identical requests returned different answers. `estimated_convergence_months`, `confidence` and `window_remaining` removed, not replaced. Market rows carry `yield_source`; Spain is measured and named "Spain (coastal new-build)" with an explicit comparability warning. Verified deterministic live |
| 2026-08-21 | **The citation agent's resumability fix passed its real test** | `b090f52` — first Friday since shipping: 03:01 `incomplete_resumable` + `stopped_on_budget` (52/74), 03:10 `complete`, 03:20 `already_complete`. No hung rows |
| 2026-08-20 | **The published corpus asserted that relisted units had been absorbed** | `530c5ed` — now discloses `relisted_on` + `still_listed` per row and three separate manifest figures. Rows are never deleted. Verified on an unattended nightly; `schema_version:2` |
| 2026-08-20 | **O-28 — "the corpus mirror is unautomated and permanently diverged"** | **NOT A DEFECT. My measurement artifact, and a four-day false blocker.** Full correction in BASELINES |
| 2026-08-20 | **`open-dataset-io.fetchAll` would have silently truncated the corpus around 2026-11-11** | `530c5ed` — on hitting `MAX_PAGES=200` it fell out of the loop and returned short, dropping the NEWEST days. Now throws |
| 2026-08-20 | **The corpus generator had no test coverage at all** | `530c5ed` — `scripts/test-open-dataset.ts`, 27 assertions |
| 2026-08-19 | **The citation engine lost a whole measurement day to a timeout it was already grazing** | `b090f52` — `queryMonitor` is resumable, persists per batch, stops at 210s |
| 2026-08-19 | **`citation_monitoring` insert return dropped on the floor** | `b090f52` — only rows the database accepted are counted |
| 2026-08-19 | **`counterpart-discover` and `eu-stats-ingest` diagnosed after 86 and 92 blind failures** | `e890daa`. Both now tracked with real causes under O-41 |
| 2026-08-18 | **`/api/intelligence/regime` published "Spain GDP: 3335689.7 %" as a live reading** | `061a57c` — `ilike` matched Euro Area GDP in chained millions |
| 2026-08-18 | **The `causal_indicators` fallback had never once worked** | `061a57c` — selected `value, direction`; the real columns are `current_value, signal` |
| 2026-08-18 | **Three bullish predicates were wrong** | `061a57c` — EUR/NOK and EUR/SEK were `() => true`. Published confidence 78 → 60 |
| 2026-08-18 | **`live` meant "a query returned a row", not "the source is current"** | `061a57c` — every indicator carries `as_of`, `age_days`, `stale` |
| 2026-08-18 | **A value's `source` named the wrong table** | `e7afe39` — `SourcedValue.origin` |
| 2026-08-18 | **`precursor-scan` published LLM-invented market signals** | Cron removed from `vercel.json`. Do not re-enable; do not top up for it |
| 2026-08-18 | **Market Pulse weekly delivery confirmed firing on schedule** | `2416532` — fired 08-17 06:05 UTC with a real Resend id |
| 2026-08-17 | **`/api/snapshot-archive` would have archived only the first 1,900 of the book every day and called it complete** | `b730a1d` — `expected` measured off the TRUNCATED list |
| 2026-08-17 | **`sync-macro` stored a NULL for Spain unemployment while the real figure sat one row above** | `582de5b` — Eurostat publishes the period LABEL before the observation |
| 2026-08-17 | **`gsc_pages` capture confirmed accumulating** | `c86ec47` — 98 → 151 → 184 → 287 distinct pages |
| 2026-08-16 | **`/api/v1/apci` published a composite index with 40% of its weight fabricated** | `f00086d` — verified live: 65, GROWTH, 95% measured |
| 2026-08-16 | **`/api/snapshot-archive` ran daily at 06:00 for months into an empty table** | `f00086d` — six nonexistent columns, every upsert 400, hidden by `if (!error) inserted += chunk.length` |
| 2026-08-16 | **`/api/v1/digital-twin` published a hardcoded APCI and random numbers** | `f00086d` — `Math.random()*4-2` on every published regional impact |
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
| 2026-08-10 | pricing-history banked yesterday's book as today's snapshot | `1f0a130` — **the precedent the scribe fix followed** |
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — confirmed still working 08-22: returned `ok:false, measurement:null` for a non-citation Saturday rather than publishing a 0.00% |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |

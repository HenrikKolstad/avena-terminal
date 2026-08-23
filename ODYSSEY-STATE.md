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
| 2026-08-23 | `71e19d6` **`invoked_by` — THE ONE THAT MATTERS TOMORROW** | **This is the discriminating test and it needs the 06:00–08:00 UTC scheduled runs, which fire AFTER I wake (~05:45). Do not try to read it at 05:45 — read yesterday's late hours.** Query: `select agent_id, invoked_by, status, started_at from cron_logs where started_at >= '2026-08-23T06:00:00Z' order by started_at`. **Two outcomes, both decisive: (a) `invoked_by = 'direct'` on the real 07:00/07:30/08:00 runs → the Vercel scheduler sends NO recognised signal, my inference today was right, and the widened test is STILL not enough — the rejected-run alarm cannot work and needs a different mechanism. (b) `invoked_by = 'vercel-cron-header'` → the header IS sent, my inference was WRONG, and detect-events was simply never invoked on 08-22 at all, which is a bigger and different problem (64 cron entries against a possible plan cap).** Correct this file whichever way it lands | **pending — needs tomorrow's scheduled runs** |
| 2026-08-23 | `71e19d6` **status honesty: a 2xx with a populated `errors[]` is now an error** | Expect crons that logged `success` yesterday to log `error` tonight — `dvf-ingest`, `causal-update`, `predictions-generate`. That is the fix working, not a regression. Query `select agent_id, status from cron_logs where started_at >= '2026-08-23T06:00:00Z' and status='error'`. **If NONE of those three flip, the derivation is not reaching them** — check whether their bodies really carry `errors[]` at runtime | pending — read tomorrow |
| 2026-08-23 | `95b90eb` **detect-events revived** | **Hand-verified live today, and the numbers were predicted by SQL BEFORE the code ran** (1 new listing / 0 price moves / 2 score changes): the run returned exactly `events_detected 3, events_written 3, new_listings 1, price_moves 0, score_changes 2, prior_refs 2034, prior_scores 2034, overlap 1, trusted_prior true, errors null`. Broken version would have emitted 2,035. **Tomorrow: confirm the 07:30 SCHEDULED run also succeeds** (not just my hand-run) and that `new_listings` stays in single digits | **VERIFIED (on-demand); scheduled run pending** |
| 2026-08-22 | `b24cffa` **`/api/market-events` dates itself** | **VERIFIED TWICE OVER.** At 05:45 it read `as_of 2026-04-11, stale_days 133, feed_status "stale", total 50`. After detect-events wrote, it read **`as_of 2026-08-23T05:54, stale_days 0, feed_status "live", todayCount 3, total 53`** — the field flipped on its own, which is exactly the check the commit was built to make possible. It is derived, not decorative | **VERIFIED — moved to CLOSED** |
| 2026-08-22 | `b4cc217` **24 blind crons wired to `cron_logs`** | **VERIFIED on the unattended scheduler — the real test — with one falsification.** Routes that had never logged now log from Vercel's own scheduler: `github-snapshot` 07:15 skipped, `predictions-generate` 07:00, `generate-briefs` 08:00, `predictions-verify` 08:03, `causal-update` 06:30, `social-delphi`, `pulse`, `detect-anomalies`, `courier`, `mentat`, `curator`, `snapshot-archive`, `argus`, `delphi-run`. **`finished_at` NULL on none of them** — the feared extra round-trip did not push `plab-run`/`delphi-run` over maxDuration. **THE FALSIFICATION: `detect-events` logged NOTHING at 07:30**, where I predicted an `auth_rejected_platform_run` error. See the correction below | **VERIFIED except the rejected-run branch — see correction** |
| 2026-08-14 | `e415c6b` **curl fallback when the feed origin serves a bot challenge** | 08-23 nightly clean — **ten consecutive unchallenged scheduled nights** (08-14..08-23). Fallback still **proven locally, never exercised on a GitHub runner** | still pending — needs a night the challenge actually fires |

**CORRECTION TO MY OWN INSTRUMENT — the rejected-run alarm did not fire, and
I must not overstate why.** I predicted `detect-events` would log
`auth_rejected_platform_run` at 07:30 on 08-22. It logged nothing at all.
What is **observed**: the wrapper writes that row only when
`x-vercel-cron === '1'`; four bearer-auth routes logged successes between
06:00 and 08:03, so the scheduler fires and authenticates with
`Authorization: Bearer $CRON_SECRET`; and the only
`auth_rejected_platform_run` row in the table's entire history is a hand
probe I sent myself at 05:52 with that header set manually.
What is **inferred, not proven**: that the scheduler sends no
`x-vercel-cron` header. The live alternative is that `/api/detect-events`
was never invoked at 07:30 at all — vercel.json carries **64 cron entries**,
and a platform cap silently dropping some would look identical from here.
**I wrote the first as the conclusion in `71e19d6`'s commit message; the
observations there are accurate but that sentence is firmer than the
evidence.** `invoked_by` was added precisely so tomorrow answers it from
rows I did not write. Do not repeat the claim until it does.

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-50 | **Dead/silent crons — SUBSTANTIALLY RE-DIAGNOSED today, two of seven resolved.** `detect-events` **FIXED** (`95b90eb`). `generate-briefs` is **NOT dead**: it runs nightly and swallows every failure | 08-22 08:00 it logged `success, briefs_generated: 0` while its loop had **three high-severity signals and failed on all three**, because the loop ended in `catch (err) { console.error(err) }`. Fixed today in `71e19d6` | **STILL UNEXPLAINED: the 2026-06-15 date itself.** The Anthropic credit exhaustion explains 08-11 onward (see BLOCKED), but `intelligence_briefs`, `weekly_alpha` and `digest_issues` all stopped on **06-15**, ~57 days before that. **Two causes, not one, and I have only found the second.** Do not close O-50 on the credit finding. Remaining unexplained: `weekly_alpha` (Mon only), `digest_issues` (Mon only), `regulatory_signals` (08-04), `hf_pushes` (0 rows ever, though `push-training-data` logged `success` at 05:01 today — check what "success" means there) | **HIGH** |
| O-56 | **`prometheus` reports `error_count: 4` on every one of its four daily runs and still logs `success`** — my new status derivation does NOT catch it | `cron_logs` 08-22 02:00/08:00/14:00/20:00, all `{"pinged":0,"drafted":0,"harvested":4,"published":0,"error_count":4}` | **An honest limitation of today's fix, stated rather than glossed:** `deriveCronStatus` recognises a populated `errors[]` array or a non-empty `error` string. `error_count: 4` is a bare number and slips through. Either prometheus reports its errors properly, or the derivation learns this shape — **prefer the former**, because inferring failure from arbitrary numeric field names is how a status derivation starts guessing | medium |
| O-53 | **`/api/cron/auto-post` fails on every one of its three daily runs with "Unexpected end of JSON input"** | `cron_logs` 08-22 09:00, 13:00, 18:00 — all `status:'error'`, same message. Newly visible; it was one of the 24 blind crons until `b4cc217` | Not diagnosed yet. Note this is the route in O-51 that may be wired to one of Henrik's buttons, so **do not touch its auth or behaviour before that question is answered**. Diagnosing the JSON error is safe and separate | medium |
| O-54 | **`causal-update` reports `indicators_touched: 20` while `causal_indicators.last_updated` has not moved since 2026-05-23** | ran 08-22 06:30, `status success`, `indicators_touched: 20`. Table today: 20 rows, **one distinct `last_updated`, still 2026-05-23 10:53:08** | Reported work that did not happen — a third instance of today's theme. **Silver lining for O-40: the freshness bump is apparently not landing, so the fabricated-freshness danger there is currently inert.** Do not rely on that; establish whether the write fails or targets another column | medium |
| O-51 | **`/api/cron/pulse` and `/api/cron/auto-post` have no authentication at all** — both publicly callable; auto-post triggers an outbound post three times a day | read 08-22 while wrapping them; neither contains any auth check | **CLAUDE.md says Henrik starts/stops the X-bot via his own buttons.** If one calls `/api/cron/auto-post`, tightening it breaks his control surface. **Ask before tightening auto-post; pulse can likely just be done** | medium — ask first |
| O-49 | **`citation-agent` reports `lookups_failed` for questions it deliberately deferred**, so the field the charter says to alarm on cries wolf on every budget-stopped run | 08-21 03:01: `lookups_failed:22`, `first_error:"not queried in this invocation"`, alongside `stopped_on_budget:true` | Small and well-scoped: split `deferred` from `failed`. **The alarm rule until then: a balance-out 401 shows as `lookups_failed>0` on the FINAL invocation of the day, or `status` never reaching `complete` — never on the first** | medium |
| O-45 | **`sold_properties.last_seen_date` is never updated when a tombstoned unit returns and leaves again.** Five units (N8205, N9260, N9519, SP1080, SP1644) stamped `last_seen 2026-08-07` but observed live again 08-08 | measured 08-20: `min(snapshot_date) > last_seen_date` per tombstone | `530c5ed` makes it visible rather than silent (they publish `relisted_on`, `still_listed=false`), so the corpus no longer misleads. Correcting the stored date is the same class of write as O-21 and belongs on that branch | medium — disclosed, not hidden |
| O-44 | **`/api/sync-snapshots` writes columns that do not exist, and discards every write result.** Inserts `property_ref` into `sold_properties` and `price_snapshots`; both key on `ref` | route read 08-19; schemas re-confirmed 08-21 and again today | Appears dead-and-broken rather than harmful. **Do not delete on assumption** — confirm it writes nothing, then remove it and its browser-side caller. **It is client-triggered, so it is NOT covered by the cron coverage test** | medium |
| O-40 | **`causal-update` would stamp 92-day-old values as fresh if its bump ever landed.** `runCausalUpdate()` (`src/lib/causal-engine.ts:533-545`) refreshes no value — it loops every `causal_indicators` row and sets `last_updated = now()`, keeping the stale value | `causal_indicators`: 20 rows, **one distinct `last_updated` (2026-05-23 10:53:08)**, unchanged again today | **DO NOT "FIX" THIS BY REVIVING THE BUMP.** Since `061a57c`, `/api/intelligence/regime` derives `age_days`/`stale` from `last_updated`, so a working bump would flip nine indicators from an honest `stale:true, age_days:92` to a fabricated `live:true, age_days:0`. Fix = refresh real values, or delete the bump. Either way it mass-mutates 20 rows → branch. **See O-54: the bump appears not to be landing at all** | **high** |
| O-34 | **Nine indicators have no live source at all** — Spain GDP, Costa Blanca YoY, Foreign Buyer Share, Alicante Transactions, New Supply, 10Y Bond, Mortgage Approvals, Brent, Consumer Confidence | `age_days` **92** today | No longer a credibility bug (honestly labelled stale) — a coverage gap. `/api/v1/apci` still reads `causal_indicators` directly | high |
| O-41 | **Two chronically-failing crons, diagnosed but unfixed** | `counterpart-discover` (failed again 03:31 today): `column properties_registry.market does not exist \| code=42703`. `eu-stats-ingest` (failed again 04:15 today): ISTAT HTTP error | **counterpart-discover is a real, fixable bug in OUR code** — but it queries `properties_registry`, frozen 2026-05-24, so fixing the column alone would still mine a dead snapshot. **eu-stats-ingest is upstream** (ISTAT/BIS) — it should degrade per-source instead of failing the whole run. Neither feeds `price_snapshots`/`sold_properties` | high — actionable |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants. Nine examined to date, nine defective — 9 for 9** | `63f405b`, `9c387fd`, `e6bb569`, `a2bf7d2`, `f00086d`, `genesis/run` (O-42), `061a57c`, `arbitrage` (`be4a736`) | **Concrete evidence on four more, all still unfixed:** `tax` — `?? 5.5` default gross yield (line 93) *and* `ANNUAL_APPRECIATION = 0.07`, a hardcoded 7%/yr appreciation inside published ROI math; `compliance` — `carbonScore = 70`, `aiActScore = 90` literal published scores, plus `?? 3200`/`?? 30`; `carbon` — `newBuildBonus = 15`; `liquidity` + `passport` — `TYPE_FACTORS[...] ?? 50`. **`tax` is the one to do next**: a 7% appreciation assumption drives capital-gains and ROI figures a buyer might act on. Also fleet-wide: grep for **`.ilike(` on an indicator/series key** | **high — highest hit rate of anything I have** |
| O-52 | **`/track-record` promises a prediction that cannot arrive.** Live page reads "No published predictions yet — **The first call lands on the next prediction cycle**" | `predictions` table: **0 rows, ever**. Its generator ran 08-22 07:00 and returned `errors:["claude_parse: 400 … credit balance is too low …"]` — **so the cause is now known and it is the Anthropic balance, not a code fault** | **Not fixed, and the reason is the fence.** Two honest fixes, both Henrik's call: top up the balance and let it publish LLM-authored forecasts (the class of surface that produced the `precursor-scan` fabrication), or change buyer-facing copy (fence 2). The copy is not a *fact that became false* — it is a promise that was never true — so the narrow correction exemption does not clearly cover it. **Raised under NEEDS HENRIK** | high — escalated |
| O-42 | **`genesis/run` discards its write results and marks the scenario complete regardless** | `src/app/api/v1/genesis/run/route.ts:273-274` | The recurring shape in a scenario simulator | medium |
| O-47 | **`dvf-ingest` reports `status:'success'` while carrying insert failures in its own `errors[]`** | 08-22 04:30: 3,504 fetched, 2,569 inserted, two FK-violation chunks, `status:'success'` | **PARTLY FIXED TODAY by `71e19d6`** — `deriveCronStatus` now marks a 2xx with a populated `errors[]` as an error, so the RUN STATUS stops lying. The underlying FK failures are untouched and still drop ~27% of rows. **Verify tomorrow that dvf-ingest logs `error`** | medium |
| O-39 | **All 90 legacy `market_snapshots` rows have a NULL `snapshot_date`** | queried 08-17 | Harmless to reads (they order by `computed_at`). Decide: backfill from `computed_at`, or leave | medium |
| O-35 | **2026-05-23/24 is a cluster date across several pipelines** — and **2026-06-15 is a second cluster date** (O-50) | queried 08-16..08-18; 06-15 cluster found 08-22 | O-40/O-54 explain the `causal_indicators` half. `properties_registry` on 05-24 still unexplained. **06-15 is now the more urgent of the two** | medium |
| O-27 | **RedSP's provider serves a bot-protection JS interstitial to some clients.** ROOT CAUSE KNOWN: `openresty/1.31.1.1` returns a 12.1KB challenge page; node's `fetch` cannot execute JS. **Intermittent** — ten clean nights | run 31774148318; client comparison 08-14; clean nights 08-14..08-23 | operational half mitigated by `e415c6b`. CAUSE cannot be fixed by me: needs RedSP to allow-list, or a stable-IP runner | **CRITICAL — mitigated, cause still open** |
| O-36 | **`snapshot-archive` computes five market-summary figures it cannot store** | `f00086d`; schema read 08-16 | Deliberate. Additive and allowed, but `new_this_week`/`avg_discount` deserve a considered schema. Decide alongside O-37 | medium |
| O-37 | **Nothing writes `market_snapshots.apci`, so APCI `week_change` can never populate** | `/api/v1/apci`; schema 08-16 | An honest null beats the 85-day delta it replaced. Do after O-34/O-40 | medium |
| O-30 | **Unbacked qualitative claims in snippet-answers** | read 2026-08-15 | Rewriting them would be inventing copy (CLAUDE.md rule 1) — the fence permits correcting a **false** fact, not replacing an unverifiable one with my own wording. Needs Henrik or a cited source | medium |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books | proven by diffing data.json blobs against stored row counts | cause fixed; 08-10..08-23 each a single clean write. Six of the eight relistings are units tombstoned 08-07 and back 08-08 — almost certainly that artifact, not six real market events | high |
| O-5 | Pre-transliteration accent slugs are indexed. **The "186 of 492" figure is unsourced — see O-33** | `gsc_pages` attribution proven wrong 08-15 | 308 shims confirmed working. Re-derive from `gsc_pages`, never from the old figures | high |
| O-6 | `/compare` dominates our search surface: **87% of Google AI-feature impressions (198/228)** | `gsc_pages`; `docs/gsc-genai/` (Henrik's export — solid) | CompareLedgerPulse (verified 08-15) put the moat on it. Read out 2026-09-14 | high |
| O-33 | **The "492 indexed / 293 /compare / 186 accent" baseline is NOT reproducible from `gsc_pages`** | 08-16: 151 pages; 08-17: 184; 08-20: 287 | **Do not quote 492/293/186 again until re-derived.** O-5 and O-6 both rest on these | **high** |
| O-13 | **PerplexityBot is barely present.** Negligible for the crawler the entire citation strategy targets | crawler ledger | cause unknown and must not be guessed at. Not a robots.txt problem — OAI-SearchBot thrives under the same file | high |
| O-15 | **Vercel Analytics figures are mostly machines.** AwarioBot alone is tens of thousands of hits | crawler ledger | **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in: `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281` | real instances of the recurring shape | `scribe/route.ts:48` fixed in `ab1f778`; six more in `b4cc217`; `generate-briefs` and `detect-events` fixed today. `dvf-ingest` has its own row (O-47) | high |
| O-16 | **ClaudeBot has barely returned.** 7 hits total since 08-12 | crawler ledger | effectively absent. Acting requires knowing why, and I do not | medium |
| O-14 | **AwarioBot is the largest crawler on the site and returns nothing** | crawler ledger | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`** (three counting the broken O-44) | `parse-feed.js:962,1003` | 08-12..08-23 all had effectively one writer. **detect-events is no longer a fourth — its rejected upsert block was deleted today.** Wants a comment at both ends at minimum | medium |
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
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | 2026-09-02 (10 days away) | pending — confound bounded: spam update 08-18 09:27 PDT → 08-21, 2d16h |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers only | distinct properties fetched per crawler per pass | **2026-08-25 (2 days away)** | pending — **signal firmly negative for AwarioBot**: distinct paths frozen for 8+ days while hits kept growing. It re-crawls the same set harder, not broader. Hold to 08-25 for the other 13 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) | 2026-09-08 (4 weeks) | pending — read out on COMPLETE runs only. **Six complete runs; still no detectable trend** |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | **2026-08-25 (2 days away)** | pending — readable from `crawler_hits` |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (4 weeks) | pending |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` column | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (4 weeks) | pending — needs distribution: not listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate; citations of town pages specifically | 2026-09-09 (4 weeks) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" queries + GSC impressions | 2026-09-23 (6 weeks) | pending — spam-update confound bounded to 08-18..08-21 |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (4 weeks) | pending — **interim.** Floor has held ~12 days at 20–40x the pre-ping baseline of 2/day. Still confounded by 08-12 being a heavy deploy day. **Hold to 09-09** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | **2026-08-26 (3 days away)** | pending — **one large single-day signal, not a trend. GPTBot ran a deep crawl 08-19: 217 hits / 211 distinct paths, against a flat 4/day either side.** Cumulative 60 → 274. **Do not attribute** — it coincides with the spam-update rollout and the IndexNow pings. On 08-26 check: does GPTBot repeat, and do the 211 paths skew to frontier URLs? ClaudeBot 7, meta-externalagent 4 — both still absent |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions but held no ledger data; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 (3 weeks) | pending — **render verified live 2026-08-15** |

**No new experiment today, deliberately.** Both commits were defect fixes —
a monitoring instrument whose alarm never fired, and a cron that would have
published a whole book of phantom listings. Neither is an SEO change, and
logging either as an experiment would be the manufactured progress this file
exists to prevent.

**Three read-outs land in the next three days: 08-25 (two) and 08-26 (one).**
Do them on the day; a read-out postponed is an experiment abandoned.

**CONFOUND — the August 2026 spam update, CLOSED and dated.** 09:27
US/Pacific 2026-08-18 → complete 2026-08-21, runtime 2 days 16 hours.
Global, all languages; SpamBrain enforcement of EXISTING policies — no new
rule, the spam policies page unchanged throughout. **Nothing to implement:**
Avena has no exposure to any spam policy (no mass-generated pages, no bought
links, no ads; all forbidden by the charter anyway). Window bounded to
08-18..08-21, which sits inside the 09-02 and 09-23 read-outs. Record it; do
not attribute either way.

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
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | series gap ≤2 days; all numbers day-of from `price_snapshots`/`sold_properties`. **Gate: O-21 must be resolved first** — Release 1 quotes delistings by day and those dates are still known-wrong. Any delisting figure quoted must be `delistings_currently_absent` (83 today), never the gross count (86). O-45 is disclosed, not fixed — do not quote a tombstone's `last_price` for a relisted unit. **Do NOT source any Release 1 figure from `score_history`** — every row before 2026-08-22 is dated a day late. `price_snapshots` is the ground truth |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | Henrik's explicit go |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.68%** (in-sample, n=**2,035**). Gate run reproduced the committed file exactly apart from `computed_at`. n moved 2,034 → 2,035 with the book; the error did not move | 2026-08-23 | `public/model-stats.json` |
| Live book | **2,035 listings** (was 2,034) | 2026-08-23 | `public/data.json`, feed commit `e612f68` 02:48 UTC |
| Sitemap | **2,687 `<loc>`**, valid XML (was 2,686 — tracks the book) | 2026-08-23 | `/sitemap.xml`, parsed |
| Corpus version | site **v2026-08-23 (schema 2)** · `avena-data` **v2026-08-22 (schema 2)** · HF unverified (401 without a token) | 2026-08-23 | **EXPECTED offset — see below** |
| **How to read the mirror correctly** | avena-data's own `daily-snapshot.yml` runs **07:15 UTC** and pulls the site artifact. I run at **~05:45 UTC**. So the mirror ALWAYS shows yesterday's version when I look, and today's by ~07:52. **Compare after 08:00 UTC, or compare the mirror against the site's PREVIOUS day. Do not re-open this as divergence.** | 2026-08-23 | avena-data commit history |
| Ledger (published) | first 2026-08-05, latest 2026-08-23, **19 observation days, 2,128 refs, 169 moves, 86 delistings, 8 relistings** | 2026-08-23 | `/open-data/dataset.json` |
| **Tombstone integrity** | **8 of 86 tombstoned units have been observed listed again. 3 are on the market today.** **83 of 86 are absent today — this is the figure to quote, never the gross 86.** Separately, 37 are dated one day late (O-21, on branch) | 2026-08-23 | `tombstones.csv` + `price_snapshots` |
| **Real price moves by day** | 15 (08-14), 4 (08-15), 1 (08-16), 0 (08-17), 15 (08-18), 10 (08-19), 10 (08-20), 18 (08-21), 9 (08-22), **0 (08-23)** | 2026-08-23 | `price_snapshots`, diffed |
| **A 0-move day is NOT automatically a failure** | Today: `feed 2035 · snapshotted 2035 · moves_detected 0 · delisted 0 · trusted_prior true · overlap 1.000 · prior_age_days 1 · errors null`. **overlap 1.000 means every one of yesterday's 2,034 refs is still present and 1 was added** — so 0 moves and 0 delistings is the arithmetic working out, not a diff that failed. 08-17 (also a Sunday) was likewise 0. **The discriminating fields are `trusted_prior` and `overlap`, never the move count alone** | 2026-08-23 | pricing-history + SQL |
| Snapshot rows by day | 2,007 (08-14) … 2,020 (08-21), 2,034 (08-22), **2,035 (08-23)** — one clean write per day since 08-10, rows = distinct refs every day | 2026-08-23 | `price_snapshots` |
| Delistings | **0 new tombstones dated 08-23.** Cumulative **86** | 2026-08-23 | `sold_properties` |
| `price_snapshots` size | **40,038 rows, 2,482 distinct refs, 2026-04-08 → 2026-08-23.** Relevant because an unpaginated read returns 1,000 of them — 2.5% | 2026-08-23 | queried directly |
| **`price_snapshots` has NO `score` column** | Columns: id, ref, snapshot_date, price, pm2, mm2, region, type, town, created_at, country. **Score lives in `score_history` as (property_ref, avena_score).** This mismatch is what silently emptied detect-events' baseline for four months | 2026-08-23 | information_schema |
| **Cron logging coverage** | **64 of 64 scheduled crons write to `cron_logs`**, enforced by `scripts/test-cron-coverage.ts`. **Verified on the unattended scheduler today.** New `invoked_by` column records which signal identified each run | 2026-08-23 | `b4cc217` + `71e19d6` |
| **`market_events` is LIVE again** | 53 rows (was 50, frozen at 2026-04-11 for 133 days). `/api/market-events` reports `feed_status:"live"`, `stale_days:0`, `todayCount:3` | 2026-08-23 | `95b90eb`, verified live |
| **Citation rate, organic (qb-v2) — THE baseline** | **5.88% (4/68) on 08-21.** Six complete runs: 4.41 (08-10), 4.41 (08-12), 2.94 (08-14), 5.88 (08-17), 8.82 (08-19), **5.88 (08-21)**. Mean **5.39%**. One hit = 1.47pp, so the whole spread is ±4 hits. **No detectable trend. Do not claim one** | 2026-08-21 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6) on 08-21, 08-19 and 08-17**; 83.33% (5/6) on the three prior runs | 2026-08-21 | `citation_measurements` |
| Citation run coverage | 08-10, 08-12, 08-14, 08-17, 08-19, 08-21 all 68/68 + 6/6 complete. **Next scheduled: Mon 08-24.** 08-22 and 08-23 are Sat/Sun — `citation-measure` correctly returned `ok:false, measurement:null` for both, i.e. the fabricated-zero guard still works | 2026-08-23 | `vercel.json` crons + table |
| Top competitor share (organic) | **idealista 90 · thinkspain 20 · aplaceinthesun 13 · numbeo 5 · fotocasa 5 · rightmove 1.** Top gap question unchanged: "what can I buy in Spain for 200000 euros" | 2026-08-21 | `citation_measurements` |
| **Nightly reliability** | **08-14..08-23 all succeeded — ten clean scheduled nights in a row.** Prior: 5 of 9 failed at the feed step | 2026-08-23 | Actions run list |
| Build health | Last 12 workflow runs scanned: **all success**, no non-success at all. Nightly feed 08-23 02:48 success; IndexNow ping 08-23 04:10 success. Two pushes to main today (`71e19d6`, `95b90eb`); no PRs, so no check-runs — **preview equivalent verified locally via `build:preview-sim` on both, exit 0** | 2026-08-23 | `actions_list` |
| Search impressions / clicks, last 28d | **2,216 / 31** — **still inside the noise band, not a result** | GSC current to 2026-08-17 | `gsc_daily` |
| `gsc_pages` depth | **287 distinct pages**, max date 2026-08-17 | 2026-08-20 | `gsc_pages` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 | 2026-08-14 | `docs/gsc-genai/` — Henrik's UI export. Properly sourced |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **9 audited to date, 9 defective** | 2026-08-21 | `find src/app/api/v1 -name route.ts` |
| Test coverage added by Odyssey | `scripts/test-open-dataset.ts` 27 assertions · `scripts/test-scribe.ts` 22 · **`scripts/test-cron-coverage.ts` 79 (was 62; +17 today on status derivation and invocation classification)** | 2026-08-23 | `530c5ed`, `ab1f778`, `b4cc217`, `71e19d6` |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08** — unchanged again today, despite `causal-update` reporting `indicators_touched: 20` on 08-22 (O-54) | 2026-08-23 | queried directly |
| APCI macro input age | **92 days** (`as_of` 2026-05-23) — climbing daily until O-34/O-40 are resolved | 2026-08-23 | `/api/v1/apci` |
| Cron success rates (worst, among those that log) | `counterpart-discover` **0/92** · `eu-stats-ingest` **1/98** · `auto-post` failing 3×/day (O-53) · `prometheus` `error_count:4` on all four daily runs (O-56) | 2026-08-23 | `cron_logs` grouped |

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
of reading the source in front of me.**

**Correction, 2026-08-22 (kept):** I wrote a verification criterion that
would have failed a working fix — "`match_prev_day` should collapse to near
zero" after the scribe fix. It cannot: ~99% of listings do not reprice
overnight. **Write criteria against the rows that can distinguish the
hypotheses, not against the whole population.**

**My own mistakes today (kept, so they are not repeated):**
1. **I stated an inference as a finding in a commit message.** `71e19d6`
   says the scheduler's rejected-run branch "never triggered" and calls the
   alarm "decorative under the real scheduler". The observations behind that
   are accurate, but the conclusion — that Vercel sends no `x-vercel-cron`
   header — is one of two live explanations; the other is that
   `/api/detect-events` was never invoked at 07:30 at all. A commit message
   is a permanent record and should have carried the alternative. The full
   correction is in VERIFY TODAY.
2. **My first cron_logs verification query today filtered
   `started_at >= 06:00` for a run that happened at 05:54, and returned
   empty.** For a few seconds an empty result looked like "the logging did
   not work" — the exact "absence is evidence" trap this whole week has been
   about, this time aimed at myself. Check the window against the event's
   real timestamp before reading anything into a zero.
3. **I nearly fixed detect-events' auth yesterday as a one-line change.** It
   would have published a NEW_LISTING for all 2,035 units in the book to an
   AI-facing endpoint. The only thing that prevented it was the rule to
   prove the cause before the fix. **That rule earned its keep today.**

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **THE ANTHROPIC API BALANCE IS EXHAUSTED — and it is taking down more than one job** (NEW today) | Measured in `cron_logs` on 08-22, all in one night: `pulse` 07:00 **error** `"Your credit balance is too low to access the Anthropic API"`; `predictions-generate` 07:00 same error inside `errors[]`; `delphi-run` 06:00 ran with `panelists_skipped: ["Claude Sonnet 4.5","Claude Haiku 4.5"]`; `causal-update` `debate_null` on both regions; `generate-briefs` failed all three signals. **This is why `/track-record` (O-52) promises a prediction that cannot arrive.** A prior commit (08-19) noted precursor-scan failing on credit since 08-11 and deliberately did not top up — that decision was about ONE fabricating route; the balance is now silently degrading five. | **A decision, not a task, and it is genuinely yours: top up or don't.** If you top up, `predictions/generate` starts publishing LLM-authored forecasts on `/track-record` — the same class of surface that produced the `precursor-scan` fabrication I removed, so **say so explicitly if you want that one live**. If you don't top up, tell me and I will make the affected routes report `skipped` with a stated reason instead of failing nightly, so the noise stops without hiding anything. Either answer is fine; the current state — five jobs failing quietly on a billing condition — is the one that isn't. |
| **BRANCH AWAITING APPROVAL: `odyssey/absorption-ledger-dates`** (`d182cd6`) | The published absorption ledger dates every parse-feed-written delisting one day late — 37 of 86 tombstones. It is mirrored to avena-data and Hugging Face, and Plan B Release 1 quotes delistings by day. **Seventh day pending.** | **Three sentences: (1) parse-feed now derives the real last-seen date from `price_snapshots` instead of stamping today, and `buildLedger` counts a delisting on the first observation day AFTER it — the two must land together or the count moves onto a day the unit was still listed. (2) `scripts/backfill-tombstone-dates.sql` corrects the 37 historical rows; its dry run, executed read-only against production, moves every one of them back by exactly one day and touches nothing else. (3) It goes to a branch only because it mutates an existing column on `sold_properties`, the one table here that cannot be rebuilt.** All four gates pass on the branch. **Not yet rebased onto today's `71e19d6`/`95b90eb`; neither touches `buildLedger` or parse-feed, so no conflict is expected, but I will re-verify before it merges.** |
| **`/track-record` promises a prediction that cannot arrive** (O-52) | The live page says "The first call lands on the next prediction cycle" under "updated just now". The `predictions` table has **0 rows, ever**. **Cause now proven: the Anthropic balance, not a code fault.** This is the page whose entire pitch is "we publish the misses too", so it is the worst possible surface to carry an unkept promise. | **Answer the credit question above and this resolves with it.** If you top up and want forecasts published, it fixes itself. If not, I need your say-so to correct the copy — that is buyer-facing marketing text and fence 2 says it is yours. |
| **`/api/cron/auto-post` is publicly callable with no authentication** (O-51) | Anyone who finds the URL can trigger an outbound post, three of which are scheduled daily. `pulse` has the same hole. **Separately, auto-post has now failed on all three daily runs with "Unexpected end of JSON input" (O-53)** — newly visible since it started logging. | **One question, unchanged from yesterday: does any of your buttons call `/api/cron/auto-post` directly?** If not, I add `isAuthorizedCron` to both and the hole closes with no other change. If yes, tell me which and I will keep that path open. |
| **RedSP is challenging GitHub Actions egress** (O-27) | ROOT CAUSE PROVEN: their provider serves an openresty JS interstitial instead of the feed. It killed 5 of 9 nightlies. The curl fallback gets through, but it rides on a client-fingerprint difference — if their guard starts challenging curl too, every night is lost until someone notices. **Ten clean nights (08-14..08-23) mean the fallback has still never been exercised on a runner — do not read the quiet as a fix.** | Either (a) ask RedSP to allow-list GitHub Actions egress for the feed URL — the clean fix, and a reasonable ask since Avena is a paying consumer of that feed; or (b) approve moving the feed step to a runner with a stable IP RedSP can allow-list. |
| `HF_TOKEN` in CI | **The ONLY unverified corpus surface.** Site and avena-data mirror are confirmed consistent and schema 2 has rolled through the mirror. Hugging Face returns 401 without a token, so three-way agreement is still unproven. Corpus filters resolve conflicts by cross-source agreement, so an unverifiable third surface is the remaining weak link — and if HF is stale it is now stale by a SCHEMA, not just a day. | Store the HF write token as a repo secret so the nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source: "most popular region for foreign buyers", "ECB rate stability supports mortgage affordability", "supply is constrained", plus tax/NIE/mortgage/golden-visa figures. This surface is built to be quoted verbatim by AI assistants. | Either confirm they are accurate as written, or point me at a source to check them against. |
| Bing Webmaster Tools read | **Henrik claimed avenaterminal.com 2026-08-13.** The indexation-coverage and IndexNow-key views should now be readable — next step is READING them. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the dashboard shows the key rejected, say so loudly. No Bing API access, so this stays a manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions over 3 months, 129 distinct URLs. **/compare = 87%.** Still UI-only/no API. | Re-export monthly, next ~2026-09-14, as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so nightly capture works. Vercel does not have it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-23 | **`/api/detect-events` — dead since 2026-04-11, and a fabrication waiting to happen** | `95b90eb`. Four defects, each hiding the next: its baseline read selected a `score` column that has never existed on `price_snapshots`, PostgREST rejected the whole select with 42703, the `error` half was discarded, and the empty Map made **every one of the 2,035 live units a NEW_LISTING**; score was read from the wrong table entirely; `eventsCreated = batch.length` counted events whether or not the insert succeeded, truncating silently at 50; and a chunked upsert into `price_snapshots` with `onConflict:'ref'` (wrong key, wrong owner) was rejected every time. Rebuilt with a paginated `.lt(today)` baseline, prices from `price_snapshots` and scores from `score_history`, the pricing-history trusted-prior gate, and a plausibility ceiling that refuses to write if >10% of the book looks newly listed. **Verified live: 3 events written, exactly the number SQL predicted before the code ran.** `market_events` is live again after 133 days |
| 2026-08-23 | **A run could record its own failures and still log `success`** | `71e19d6` — `deriveCronStatus` now treats a 2xx carrying a populated `errors[]` or a non-empty `error` string as an error. Measured instances all logged `success` the night before: `predictions-generate` (credit balance), `causal-update` (`debate_null`), `dvf-ingest` (~935 of 3,504 rows dropped). Empty/null `errors[]` stays a success and `skipped` still wins. Deliberately no fourth `partial` status — `/swarm` counts `status='success'` and an unknown value would drop out of every existing reader. **Known gap recorded as O-56:** `error_count: 4` (prometheus) is a bare number and still slips through |
| 2026-08-23 | **`generate-briefs` swallowed every failure into `success: true`** | `71e19d6` — the loop ended in `catch (err) { console.error(err) }` and the route returned HTTP 200 `{success:true, briefs_generated:0}`. On 08-22 it had three high-severity signals, failed on all three, and reported success; `intelligence_briefs` has held no row since 2026-06-15 and nothing said why. Now collects and returns its errors, counts only rows the database accepted, and reports `signals_attempted` so "0 briefs" can be told apart from "no signals today". **The 06-15 date itself is still unexplained — O-50 stays open** |
| 2026-08-23 | **`b24cffa` — `/api/market-events` served a 133-day-frozen feed undated** | Verified twice in one morning: `stale_days 133 / feed_status "stale"` before detect-events ran, `stale_days 0 / feed_status "live" / todayCount 3` after. The field is derived, not decorative — which was the whole design |
| 2026-08-22 | **O-48 — 24 of 64 scheduled crons wrote nothing to `cron_logs`** | `b4cc217` — `withCronLog` applied to all 22 blind route files. Coverage 64/64, enforced by `scripts/test-cron-coverage.ts`, which also asserts the logged `cron_path` matches vercel.json. **Verified on the unattended scheduler 2026-08-23**, with no NULL `finished_at` anywhere. The rejected-platform-run branch was the one part that did not hold — fixed in `71e19d6` |
| 2026-08-22 | **O-46 — was `github-snapshot` a dead cron or a blind one?** | **Answered by observation, not inference.** A probe returned `status:'skipped'`, `detail:"skipped: GITHUB_DATA_TOKEN not set"`. The route runs and deliberately does nothing; avena-data's own `daily-snapshot.yml` is the actual writer of `market/`. No collision exists |
| 2026-08-22 | **`score_history` dated every observation one day late, on every row** | `ab1f778` — verified on the unattended 08-22 nightly: 2,034/2,034 rows match the same-day price; all 9 genuinely-moved refs carry the new price and none the old, against 0 and 100% before. History deliberately not rewritten, so the series carries a one-day seam and **the 2026-08-21 book is absent from `score_history` entirely** |
| 2026-08-21 | **`/api/v1/arbitrage` published a confidence score built on `Math.random()`** | `be4a736` — identical requests returned different answers. `estimated_convergence_months`, `confidence` and `window_remaining` removed, not replaced |
| 2026-08-21 | **The citation agent's resumability fix passed its real test** | `b090f52` — 03:01 `incomplete_resumable` + `stopped_on_budget` (52/74), 03:10 `complete`, 03:20 `already_complete`. No hung rows |
| 2026-08-20 | **The published corpus asserted that relisted units had been absorbed** | `530c5ed` — now discloses `relisted_on` + `still_listed` per row and three separate manifest figures. Rows are never deleted. `schema_version:2` |
| 2026-08-20 | **O-28 — "the corpus mirror is unautomated and permanently diverged"** | **NOT A DEFECT. My measurement artifact, and a four-day false blocker.** Full correction in BASELINES |
| 2026-08-20 | **`open-dataset-io.fetchAll` would have silently truncated the corpus around 2026-11-11** | `530c5ed` — on hitting `MAX_PAGES=200` it fell out of the loop and returned short, dropping the NEWEST days. Now throws |
| 2026-08-19 | **The citation engine lost a whole measurement day to a timeout it was already grazing** | `b090f52` — `queryMonitor` is resumable, persists per batch, stops at 210s |
| 2026-08-19 | **`counterpart-discover` and `eu-stats-ingest` diagnosed after 86 and 92 blind failures** | `e890daa`. Both now tracked with real causes under O-41 |
| 2026-08-18 | **`/api/intelligence/regime` published "Spain GDP: 3335689.7 %" as a live reading** | `061a57c` — `ilike` matched Euro Area GDP in chained millions |
| 2026-08-18 | **The `causal_indicators` fallback had never once worked** | `061a57c` — selected `value, direction`; the real columns are `current_value, signal` |
| 2026-08-18 | **`live` meant "a query returned a row", not "the source is current"** | `061a57c` — every indicator carries `as_of`, `age_days`, `stale` |
| 2026-08-18 | **`precursor-scan` published LLM-invented market signals** | Cron removed from `vercel.json`. Do not re-enable; do not top up for it |
| 2026-08-17 | **`/api/snapshot-archive` would have archived only the first 1,900 of the book every day and called it complete** | `b730a1d` — `expected` measured off the TRUNCATED list |
| 2026-08-17 | **`sync-macro` stored a NULL for Spain unemployment while the real figure sat one row above** | `582de5b` — Eurostat publishes the period LABEL before the observation |
| 2026-08-16 | **`/api/v1/apci` published a composite index with 40% of its weight fabricated** | `f00086d` — verified live: 65, GROWTH, 95% measured |
| 2026-08-16 | **`/api/snapshot-archive` ran daily at 06:00 for months into an empty table** | `f00086d` — six nonexistent columns, every upsert 400, hidden by `if (!error) inserted += chunk.length` |
| 2026-08-16 | **`/api/v1/digital-twin` published a hardcoded APCI and random numbers** | `f00086d` |
| 2026-08-15 | **`/api/v1/snippet-answers` published five false market facts** | `e6bb569` — "Estepona is on the Costa Blanca" |
| 2026-08-15 | **market-clock and microstructure derived published verdicts from default constants** | `a2bf7d2` — 6 of 10 regions at SLOWDOWN purely via a default, all stamped `data_quality:"LIVE"` |
| 2026-08-14 | **published change-answers claimed 101 price moves inside a 1-day window** | `9c387fd` — an unpaginated select hitting PostgREST's 1000-row cap. **The same trap detect-events fell into; see 08-23** |
| 2026-08-14 | the feed retry loop spent 120 minutes on a challenge it could never pass | `e415c6b` |
| 2026-08-13 | a short feed body was logged only as a byte count | `714b9ab` — and it is what cracked O-27 the next morning |
| 2026-08-13 | `/api/v1/crawler-report` published `estimated_weeks_to_dominance: 152` from an invented 0.5 floor over a fabricated zero | `63f405b` |
| 2026-08-12 | a 62%-coverage citation run published as a comparable data point | `24db855` — `bank_organic`/`bank_branded` |
| 2026-08-11 | move diff compared today's price against itself | `7478108` |
| 2026-08-10 | pricing-history banked yesterday's book as today's snapshot | `1f0a130` — **the precedent both the scribe fix and detect-events followed** |
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — confirmed still working 08-23: returned `ok:false, measurement:null` for both weekend days rather than publishing a 0.00% |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |

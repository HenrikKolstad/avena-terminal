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
| 2026-08-20 | `530c5ed` **published corpus called relisted units absorbed** | **NOT YET VERIFIABLE — the artifacts regenerate in tonight's 02:41 nightly.** Tomorrow, fetch `/open-data/dataset.json` and expect `schema_version: 2` and `observation_ledger` carrying `relistings_recorded`, `delistings_still_listed`, `delistings_currently_absent`. **Predicted values, computed in SQL before shipping: delistings_recorded 77, relistings_recorded 8, still_listed 3, currently_absent 74** (the gross figure moves with tonight's new tombstones; the three-way split must still reconcile). Then `curl /open-data/tombstones.csv` and confirm the header ends `…,last_seen_date,relisted_on,still_listed` and that SP1625, SP1648 and N9243 carry `still_listed=true`. Also confirm `movement-ledger.csv` has a `relistings` column. **If the nightly instead FAILS at the corpus step, that is my regression and it is the top item.** | **pending — tonight's nightly** |
| 2026-08-20 | `530c5ed` **`fetchAll` would have silently truncated the corpus around 2026-11-11** | Cannot be observed until the cap is near. What is verifiable tomorrow is that it did not break the normal path: the nightly corpus step succeeded and the ledger day count went 16 → 17 | **pending — tonight's nightly** |
| 2026-08-20 | `d182cd6` **branch `odyssey/absorption-ledger-dates` rebased onto main** | It conflicted with `530c5ed` in the same region of `buildLedger`. Rebased, the merged function hand-read (both edits survive, independent), all four gates re-run green on the branch. Verify by confirming the branch still merges cleanly if main moves again | **verified today — gates green on the rebased branch** |
| 2026-08-19 | `b090f52` **citation agent is now resumable, idempotent and time-boxed** | **STILL THE REAL TEST: tomorrow, Fri 08-21.** No citation run fires on a Thursday, so today added nothing. `select status, output_summary from cron_logs where cron_path='/api/cron/citation-agent' and started_at>='2026-08-21'` — expect 03:00 `incomplete_resumable` + `stopped_on_budget:true`, 03:10 completing the tail, 03:20 `already_complete`. **Any `started` row with `finished_at` NULL means the 210s budget is still too high** | **partly — full test Fri 08-21** |
| 2026-08-19 | `b090f52` **the 2026-08-19 citation day, recovered rather than lost** | **VERIFIED AGAIN TODAY, unattended.** `citation-measure` fired 04:15 on schedule and rolled the day up by itself: 68 asked, 6 hits, **8.82% organic**, branded 6/6. Nothing further to check | **VERIFIED — moved to CLOSED** |
| 2026-08-14 | `e415c6b` **curl fallback when the feed origin serves a bot challenge** | 08-20 nightly clean again — **seven consecutive unchallenged scheduled nights** (08-14..08-20). Fallback still **proven locally, never exercised on a GitHub runner** | still pending — needs a night the challenge actually fires |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-45 | **`sold_properties.last_seen_date` is never updated when a tombstoned unit returns and leaves again.** Five units (N8205, N9260, N9519, SP1080, SP1644) are stamped `last_seen 2026-08-07` but were observed live again on 08-08. Their delisting is genuine — they are absent today — but the published "last observed price and date" is a day early, and the last *price* may be from the wrong observation | measured today: `min(snapshot_date) > last_seen_date` per tombstone. All five relisted 08-08, all five absent since | Found while fixing O-43. `530c5ed` makes it visible rather than silent (they now publish `relisted_on=2026-08-08, still_listed=false`), so the corpus no longer misleads. Correcting the stored date is the same class of write as O-21 and belongs on that branch, not on a second one racing it | medium — disclosed, not hidden |
| O-46 | **`/api/cron/github-snapshot` is scheduled 07:15 UTC and has NEVER logged a run** — zero rows in `cron_logs` for that path, ever. It writes the full open-dataset bundle to `avena-data` `market/`, the **same path, at the same minute**, as avena-data's own `daily-snapshot.yml` | `vercel.json` → `{"path":"/api/cron/github-snapshot","schedule":"15 7 * * *"}`; `select … from cron_logs where cron_path like '%github-snapshot%'` → 0 rows; `avena-data/.github/workflows/daily-snapshot.yml` → `cron: "15 7 * * *"` | Two possibilities and I have not separated them: it never runs (a dead cron), or it runs and does not log (a blind cron). Either is worth knowing, and if it DOES run, two writers hitting `market/` in the same minute is a real collision. The mirror's content proves avena-data's own workflow is the one actually winning (its files are byte-copies of the site artifact, not regenerated — the `generated_at` is the site's, not a fresh one). **Check `cron_logs` again just after 07:15 tomorrow before concluding it is dead** | medium |
| O-44 | **`/api/sync-snapshots` writes columns that do not exist, and discards every write result.** It inserts `property_ref` into `sold_properties` and `price_snapshots`; both tables key on `ref`. Every such write must 400. All four write calls drop the return entirely | route read 08-19; schemas confirmed. Called from `src/lib/data.ts:20` — **client-side, from the browser**, guarded by a localStorage day-key | Appears dead-and-broken rather than harmful: it cannot have written anything, and `parse-feed.js` + the pricing-history cron are the real writers. **Do not delete on assumption** — confirm it writes nothing, then remove it and its caller rather than leaving a browser-triggered writer pointed at the moat | medium |
| O-40 | **`causal-update` would stamp 86-day-old values as fresh if it ever ran.** `runCausalUpdate()` in `src/lib/causal-engine.ts:533-545` refreshes no value — it loops every `causal_indicators` row and sets `last_updated = now()`, keeping the stale value | `causal_indicators`: 20 rows, **one distinct `last_updated` (2026-05-23 10:53:08)**. The 06:30 cron is not running | **DO NOT "FIX" THIS BY REVIVING THE CRON.** Since `061a57c` it is *more* dangerous: `/api/intelligence/regime` derives `age_days`/`stale` from `last_updated`, so reviving the bump would flip nine indicators from an honest `stale:true, age_days:88` to a fabricated `live:true, age_days:0`. Fix = refresh real values, or delete the bump. Either way it mass-mutates 20 rows, so it goes to a branch | **high** |
| O-34 | **Nine indicators have no live source at all** — Spain GDP, Costa Blanca YoY, Foreign Buyer Share, Alicante Transactions, New Supply, 10Y Bond, Mortgage Approvals, Brent, Consumer Confidence | `age_days` 88 today | No longer a credibility bug (honestly labelled stale) — a coverage gap. `/api/v1/apci` still reads `causal_indicators` directly and is unchanged | high |
| O-41 | **Two chronically-failing crons, diagnosed but unfixed** | `counterpart-discover` (0/89, failed again 03:31 today): `column properties_registry.market does not exist \| code=42703`. `eu-stats-ingest` (1/95, failed again 04:15 today): `istat: … HTTP 500 \| bis: BIS HTTP 404` — and note its `output_summary` says `rows_upserted: 4337`, so 18 of 20 indicators DID land; only the run status is all-or-nothing | **counterpart-discover is a real, fixable bug in OUR code** — but it queries `properties_registry`, frozen 2026-05-24, so fixing the column alone would still mine a dead snapshot. **eu-stats-ingest is upstream** (ISTAT 500, BIS 404) — not ours to fix; it should degrade per-source instead of failing the whole run, which is a small, safe, well-scoped change. Neither feeds `price_snapshots`/`sold_properties` | high — now actionable |
| O-42 | **`genesis/run` discards its write results and marks the scenario complete regardless.** `await supabase.from('genesis_outputs').insert(outputs);` — return dropped, then `status:'complete'` set unconditionally | `src/app/api/v1/genesis/run/route.ts:273-274` | The recurring shape in a scenario simulator. Deferred again; today went to the corpus | medium |
| O-47 | **`dvf-ingest` reports `status:'success'` while carrying insert failures in its own `errors[]`** | today 04:30: `{"year":2023,"insee":"83137","errors":["tx chunk 2100: … violates foreign key constraint property_transactions_avn_prop_id_fkey"], …}` | Same family as the recurring bug, one notch better: the error IS recorded, it just does not affect the status. French DVF open data, not the moat, so low blast radius — but a run that half-failed reporting success is how a silent freeze starts | medium |
| O-39 | **All 90 legacy `market_snapshots` rows have a NULL `snapshot_date`** | queried 08-17 | Harmless to reads (they order by `computed_at`). Decide: backfill from `computed_at`, or leave the legacy block | medium |
| O-35 | **2026-05-23/24 is a cluster date across several pipelines** | queried 08-16..08-18 | O-40 explains the `causal_indicators` half. `properties_registry` on 05-24 still unexplained — and O-41 gives a second reason to care | medium |
| O-27 | **RedSP's provider serves a bot-protection JS interstitial to some clients.** ROOT CAUSE KNOWN: `openresty/1.31.1.1` returns a 12.1KB "One moment, please..." page that reloads via JS; node's `fetch` cannot execute JS. **Intermittent** — seven clean nights now | run 31774148318; client comparison 08-14; clean nights 08-14..08-20 | operational half mitigated by `e415c6b`. CAUSE cannot be fixed by me: needs RedSP to allow-list, or a stable-IP runner | **CRITICAL — mitigated, cause still open** |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants.** 158 route files. **Eight examined to date, eight defective — 8 for 8** | `63f405b`, `9c387fd`, `e6bb569`, `a2bf7d2`, `f00086d` (apci + digital-twin), `genesis/run` (O-42), `061a57c` (regime) | **Still unexamined, same grep signatures: `arbitrage` (`Math.max(6, convergenceMonths)`), `tax` (`?? 5.5` gross yield, line 93), `compliance` (`?? 3200`, `?? 30`), `carbon` (`?? 45`, `?? 80`), `liquidity`/`passport` (`?? 50`).** Also grep fleet-wide for **`.ilike(` on an indicator/series key** — substring matching caused both the GDP and Greece defects | **high — highest hit rate of anything I have** |
| O-36 | **`snapshot-archive` computes five market-summary figures it cannot store** | `f00086d`; schema read 08-16 | Deliberate. Additive and allowed, but `new_this_week`/`avg_discount` deserve a considered schema. Decide alongside O-37 | medium |
| O-37 | **Nothing writes `market_snapshots.apci`, so APCI `week_change` can never populate** | `/api/v1/apci`; schema 08-16 | An honest null beats the 85-day delta it replaced. Do after O-34/O-40 | medium |
| O-30 | **Unbacked qualitative claims in snippet-answers** | read 2026-08-15 | Rewriting them would be inventing copy (CLAUDE.md rule 1) — the fence permits correcting a **false** fact, not replacing an unverifiable one with my own wording. Needs Henrik or a cited source | medium |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books | proven by diffing data.json blobs against stored row counts | cause fixed; 08-10..08-20 each a single clean write. **Today's O-43 work gave this a second signature:** six of the eight relistings are units tombstoned 08-07 and back 08-08 — almost certainly that artifact, not six real market events. The corpus now discloses them rather than asserting absorption | high |
| O-5 | Pre-transliteration accent slugs are indexed. **The "186 of 492" figure is unsourced — see O-33** | `gsc_pages` attribution proven wrong 08-15 | 308 shims confirmed working. **`gsc_pages` depth is now 287 distinct pages (was 184 on 08-17)** — consolidation should become measurable; re-derive from `gsc_pages`, never from the old figures | high |
| O-6 | `/compare` dominates our search surface: **87% of Google AI-feature impressions (198/228)** | `gsc_pages`; `docs/gsc-genai/` (Henrik's export — solid) | CompareLedgerPulse (verified 08-15) put the moat on it. Read out 2026-09-14 | high |
| O-33 | **The "492 indexed / 293 /compare / 186 accent" baseline is NOT reproducible from `gsc_pages`** | 08-16: 151 pages; 08-17: 184; **08-20: 287** | **Do not quote 492/293/186 again until re-derived.** O-5 and O-6 both rest on these. The number is climbing fast enough that a re-derivation is worth doing once it plateaus | **high** |
| O-13 | **PerplexityBot is barely present.** 68 hits / 42 paths since 08-12 — negligible for the crawler the entire citation strategy targets | crawler ledger today | cause unknown and must not be guessed at. Not a robots.txt problem — OAI-SearchBot thrives under the same file | high |
| O-15 | **Vercel Analytics figures are mostly machines.** AwarioBot alone is 36,236 hits since 08-12 | crawler ledger | **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in: `scribe/route.ts:48`, `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`, `dvf-ingest` | real instances of the recurring shape | `score_history` healthy so not actively losing rows. The `dvf-ingest` instance now has its own row (O-47) | high |
| O-16 | **ClaudeBot has barely returned.** 7 hits total since 08-12, still 7 today, last seen 08-19 | crawler ledger | effectively absent. Acting requires knowing why, and I do not | medium |
| O-14 | **AwarioBot is the largest crawler on the site and returns nothing.** 36,236 hits over **2,277 paths — path count frozen for EIGHT days while hits grew 131%** | crawler ledger | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`** (three counting the broken O-44) | `parse-feed.js:962,1003` | 08-12..08-20 all had effectively one writer. Wants a comment at both ends at minimum | medium |
| O-10 | `citation_measurements` still holds the fabricated-zero rows (08-02..08-06) and two 0-question rows | table read | cannot distinguish "asked 87, genuinely 0" from "all lookups failed". Never delete data. **Excluded from every published surface** by `loadMeasurements` | medium |
| O-29 | **Lightpanda stopped as abruptly as it started.** Nothing since 08-14 | crawler ledger | a two-day burst, now gone. Keep watching | low |
| O-2 | `<html lang="en">` on the three `/no` pages while serving Norwegian | verified 2026-08-09 | per-route fix needs route-group root layouts (huge diff) or a dynamic root layout (kills static generation) | low — hreflang is already correct |
| O-4 | Zenodo deposit frozen at 2026-04-11 | `zenodo.org/api/records/19520064` | deliberately saved for a quarterly citable version. **Note: `schema_version` is now 2, so the next deposit is a genuine new version, not a re-cut** | deliberate |

## 3. EXPERIMENTS — changes with a read-out date

Search Console connected 2026-08-09 (`gsc_daily`, `gsc_pages`). Rules: one
meaningful change at a time, a read-out DATE fixed in advance, the result
recorded honestly — "no detectable effect" is a real finding.

Weekly baseline: impressions 430–660/week for three months, clicks 1–10.
Flat. Any claimed effect must clear that noise band to mean anything.

| started | hypothesis | change | metric | read-out | result |
|---|---|---|---|---|---|
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | 2026-09-02 (4 weeks) | pending — **confounded by the August 2026 spam update** |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers only | distinct properties fetched per crawler per pass | 2026-08-25 (2 weeks) | pending — **signal firmly negative for AwarioBot: distinct paths frozen at exactly 2,277 for EIGHT straight days while hits grew 15,968 → 36,236.** It re-crawls the same set harder, not broader. Hold to 08-25 for the other 13 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) vs the **4.41% baseline** | 2026-09-08 (4 weeks) | pending — read out on COMPLETE runs only |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | 2026-08-25 (2 weeks) | pending — readable from `crawler_hits` |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (4 weeks) | pending |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` column | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (4 weeks) | pending — needs distribution: not listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate vs 4.41%; citations of town pages specifically | 2026-09-09 (4 weeks) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" queries + GSC impressions | 2026-09-23 (6 weeks) | pending — **confounded by the spam update** |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (4 weeks) | pending — **interim.** OAI-SearchBot cumulative **882 hits / 295 paths** (was 818/281), ChatGPT-User **409/117** (was 350/103). Floor has held nine days at ~20-40x the pre-ping baseline of 2/day. Still confounded by 08-12 being a heavy deploy day. **Hold to 09-09** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | 2026-08-26 (2 weeks) | pending — **first real signal, and it is large. GPTBot ran a single-day deep crawl on 08-19: 217 hits over 211 distinct paths, against a flat 4 hits/4 paths on 08-16, 08-17, 08-18 and again on 08-20.** Cumulative 60 → 274. **Do not attribute this yet** — it coincides with the spam-update rollout and with nine days of IndexNow pings, and one day is not a trend. What to check on 08-26: whether GPTBot repeats, and whether the 211 paths skew to frontier URLs. ClaudeBot 7, meta-externalagent 4 — both still absent |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions but held no ledger data; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 (4 weeks) | pending — **render verified live 2026-08-15** |
| 2026-08-10 | ~~A bulk ingest of the one-pagers raises the organic citation rate~~ | ~~an external agent crawled 310 one-pagers~~ | — | — | **WITHDRAWN same day.** The crawler was AhrefsBot, which feeds a backlink index, not a language model |

**No new experiment today.** Both changes were defect fixes to the corpus
generator — a published falsehood and a dated silent-truncation fuse. Neither
is an SEO change, and logging either as an experiment would be the manufactured
progress this file exists to prevent. The `schema_version` 1 → 2 bump is worth
watching as an unplanned natural experiment (does a corpus consumer notice?),
but I have no instrument that could read that, so it gets no row.

**CONFOUND, 2026-08-18 — the August 2026 spam update.** Confirmed by Google
2026-08-18 09:27 US/Pacific; global, all languages and regions; third spam
update of 2026; SpamBrain enforcement of EXISTING policies, no new policies.
**Checked again today 08-20: the Search Status Dashboard has still not marked
the rollout complete** (the March update took ~19h, June ~2 days; this one is
past both). **Nothing to implement** — Avena has no exposure to any spam policy
(no mass-generated pages, no bought links, no ads; all forbidden by the charter
anyway). **It lands inside the 09-02 and 09-23 read-out windows**, so any
impression movement there may be the update rather than the change tested.
Record as a confound; do not attribute either way.

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
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | series gap ≤2 days; all numbers day-of from `price_snapshots`/`sold_properties`. **Gate: O-21 must be resolved first** — Release 1 quotes delistings by day and those dates are still known-wrong. **O-43 is no longer a gate: as of `530c5ed` the relistings are disclosed, so any delisting figure quoted must be `delistings_currently_absent`, never the gross count.** O-45 is disclosed, not fixed — do not quote a tombstone's `last_price` for a relisted unit |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | Henrik's explicit go |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.66%** (in-sample, n=2,016). Gate run today reproduced every committed figure byte-identically — only `computed_at` differed. n moved 2,011 → 2,016 with the feed, not with any model change | 2026-08-20 | `public/model-stats.json` |
| Live book | **2,016 listings** (was 2,011) | 2026-08-20 | `public/data.json`, feed commit `5a1ced0` 02:41 UTC |
| Sitemap | **2,668 `<loc>`**, valid XML (was 2,663 — tracks the book) | 2026-08-20 | `/sitemap.xml`, parsed |
| Corpus version | site **v2026-08-20** · `avena-data` **v2026-08-19** · HF unverified (401 without a token) | 2026-08-20 | see the note below — the mirror is NOT lagging |
| **How to read the mirror correctly** | avena-data's own `daily-snapshot.yml` runs **07:15 UTC** and pulls the site artifact. I run at **~05:45 UTC**. So the mirror ALWAYS shows yesterday's version when I look, and always shows today's by ~07:52. **Same-day capture on 9 of the last 10 days**; the one miss (08-13 → v2026-08-12) is the wedged nightly, already closed. **Compare after 08:00 UTC, or compare the mirror against the site's PREVIOUS day.** Do not re-open this as divergence | 2026-08-20 | avena-data commit history, version-per-commit |
| Ledger (published) | first 2026-08-05, latest 2026-08-20, **16 observation days, 2,100 refs, 142 moves, 77 delistings** | 2026-08-20 | `/open-data/dataset.json` |
| **Tombstone integrity** | **8 of 77 tombstoned units have been observed listed again. 3 are on the market today** (SP1625 08-07→live, SP1648 08-14→live, N9243 08-12→live); **5 returned 08-08 and left again** (O-45). **Correction: yesterday this was recorded as 3 — that measured only "live in today's feed", not "ever relisted". The true figure is 8.** Separately, 37 of 77 are dated one day late (O-21, on branch) | 2026-08-20 | measured against `price_snapshots` |
| **Real price moves by day** | 15 (08-14), 4 (08-15), 1 (08-16), 0 (08-17), 15 (08-18), 10 (08-19), **10 (08-20)** | 2026-08-20 | `price_snapshots`, diffed |
| Snapshot rows by day | 2,007 (08-14), 2,005 (08-15), 2,017 (08-16), 2,017 (08-17), 2,026 (08-18), 2,011 (08-19), **2,016 (08-20)** — one clean write per day since 08-10, rows = distinct refs every day | 2026-08-20 | `price_snapshots` |
| Delistings | **2 new tombstones dated 08-20** (was 17 on 08-19, the largest day so far). Cumulative **77** | 2026-08-20 | `sold_properties` |
| pricing-history cron | nightly 02:42 run: `feed 2016 · snapshotted 2016 · moves_detected 10 · price_moves 10 · trusted_prior true`. My 05:36 hand-re-run: identical except `price_moves 0 (already logged)` and `delisted 0 (already banked)` — **idempotency confirmed again**. `prior_date 2026-08-19 · prior_age_days 1 · overlap 0.999 · errors null` | 2026-08-20 | `cron_logs` + hand-run |
| **The 02:20 skip is CORRECT, not a failure** | pricing-history logged `status:'skipped'` three times (02:20, 02:41, 02:42) with `reason: "stale feed — deployed book predates today"` before succeeding at 02:42:57. That is the guard refusing to bank yesterday's book as today's snapshot while the nightly deploy propagates. **Do not "fix" this** — it is the `1f0a130` guard working | 2026-08-20 | `cron_logs` |
| **Regime engine (published)** | **SUPER_BULL, 9/10, confidence 60.** Spain GDP 2.9 stale **88d**, Spain Inflation 3.0 live, Spain Unemployment 10.1 live | 2026-08-19 | `/api/intelligence/regime` |
| APCI macro input age | **88 days** (`as_of` 2026-05-23) — climbing daily until O-34/O-40 are resolved | 2026-08-20 | `/api/v1/apci` |
| **Citation rate, organic (qb-v2) — THE baseline** | **8.82% (6/68) on 08-19**; 5.88% (4/68) 08-17; 2.94% (2/68) 08-14; 4.41% (3/68) 08-10 and 08-12. **Five complete runs; mean of the four prior runs 4.41%.** 08-19 is 3 hits above that mean (one hit = 1.47pp). **Still a single data point with a timing confound** (measured ~06:00 UTC, assembled from three hand-triggered invocations). **Wait for Fri 08-21 before calling it anything.** No run today — Thursday is not a citation day | 2026-08-20 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6) on 08-19 and 08-17**; 83.33% (5/6) on the three prior runs | 2026-08-19 | `citation_measurements` |
| Citation run coverage | 08-10, 08-12, 08-14, 08-17, 08-19 all 68/68 + 6/6 complete. Next scheduled: **Fri 08-21** | 2026-08-20 | `vercel.json` crons + table |
| Top competitor share (organic) | idealista 86 · thinkspain 19 · aplaceinthesun 11 · fotocasa 7 · numbeo 5. Top gap question unchanged: "what can I buy in Spain for 200000 euros" | 2026-08-19 | `citation_measurements` |
| Citation rate, qb-v1 (RETIRED RULER — never a baseline) | organic 6.19% (26/420), branded 20.00% (3/15) | 2026-08-07 | excluded from all published series |
| **Crawler ledger, hits since 08-12** | AwarioBot 36,236 (**2,277 paths, frozen 8 days**) · Googlebot 8,440 (3,514 paths) · PetalBot 6,440 · AhrefsBot 3,687 · Amazonbot 3,004 · bingbot 2,127 · Lightpanda 1,677 (stopped 08-14) · SemrushBot 1,493 · **OAI-SearchBot 882 (295 paths)** · YandexBot 797 · DotBot 587 · SERanking 561 · **ChatGPT-User 409 (117)** · **GPTBot 274 (235) — up from 60, see below** · Bytespider 140 · MJ12bot 123 · **PerplexityBot 68 (42)** · Applebot 48 · TikTokSpider 14 · **ClaudeBot 7** · Google-Extended 5 · **xAI-Grok 5 (new to the ledger)** · meta-externalagent 4 · **CCBot 2 (new to the ledger)** · DuckDuckBot 1 | 2026-08-20 | `crawler_hits` |
| **GPTBot did one deep pass** | 4 hits/day on 08-16, 08-17, 08-18 → **217 hits over 211 distinct paths on 08-19** → back to 4 on 08-20. A single-day event, not a new floor. Tracked under the 08-26 frontier-sitemap read-out; **not attributed to anything yet** | 2026-08-20 | `crawler_hits` by day |
| **Nightly reliability** | **08-14..08-20 all succeeded — seven clean scheduled nights in a row.** Prior: 5 of 9 failed at the feed step | 2026-08-20 | Actions run list |
| Build health | Last 30 workflow runs scanned: **3 non-success, all known and closed** (08-12 and 08-13 nightly failures = the wedged feed; 08-14 cancelled). Nightly feed 08-20 02:40 success; IndexNow ping 08-20 04:09 success. Two branches pushed today (`main` `530c5ed`, `odyssey/absorption-ledger-dates` `d182cd6`); no PRs, so no check-runs — **preview equivalent verified locally via `build:preview-sim` on both** | 2026-08-20 | `actions_list` |
| Search impressions / clicks, last 28d | **2,216 / 31** (was 1,991 / 27) — **still inside the noise band, not a result** | GSC current to 2026-08-17 | `gsc_daily` |
| `gsc_pages` depth | **287 distinct pages** (was 184 on 08-17), max date 2026-08-17 | 2026-08-20 | `gsc_pages` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 | 2026-08-14 | `docs/gsc-genai/` — Henrik's UI export. Properly sourced |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **8 audited to date, 8 defective** | 2026-08-18 | `find src/app/api/v1 -name route.ts` |
| Corpus generator test coverage | **27 assertions** in `scripts/test-open-dataset.ts` — first coverage this code has ever had. Add to it whenever a corpus defect is found | 2026-08-20 | `530c5ed` |
| `macro_indicators` | 16 keys, last fetch 2026-08-18 06:00:15. Only `gr_inflation_yoy` null, genuinely so upstream | 2026-08-19 | sync-macro output_summary |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08** | 2026-08-20 | queried directly |
| Cron success rates (worst) | `counterpart-discover` **0/89** · `eu-stats-ingest` **1/95** (but 4,337 rows still upserted today) · `github-snapshot` **0 runs ever logged** (O-46) · `mentat` 57/119 · `precursor-scan` removed | 2026-08-20 | `cron_logs` grouped |

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

**Correction, 2026-08-19 (kept):** O-21 implied `parse-feed.js` was the only
defective tombstone writer. There is a third, `/api/sync-snapshots` (O-44).

**Correction, 2026-08-20 (NEW, and the most important one here):** **O-28 —
"the `avena-data` corpus mirror has NO automation in this repo" and "the mirror
has diverged by exactly one day for five days running" — was WRONG on both
counts, and I escalated it to Henrik as a blocker for four days.**
1. The mirror IS automated: `avena-data/.github/workflows/daily-snapshot.yml`,
   public and readable, runs **07:15 UTC** and pulls the site artifacts.
2. It is not lagging. It captured the **same-day** version on 9 of the last 10
   days. **I check at ~05:45 UTC, before it has run.** A constant one-day offset
   is exactly what a fixed observation time earlier than a fixed update time
   produces — I read that constancy as evidence of a real bug when it was
   evidence of my own measurement window.
3. My recorded hypothesis, "the mirror pulls before the site rebuilds", had the
   order backwards: 07:15 is *after* the 02:41 rebuild, not before.
**Lesson to carry: before escalating a cross-system divergence, check the two
systems' schedules against my own observation time.** A public repo's workflow
file was readable the whole time and would have answered this on day one.

**Correction, 2026-08-20 (new):** O-43 was recorded as "3 of 75 tombstones are
units that are LIVE in today's feed". The count of *ever-relisted* tombstones is
**8 of 77**; 3 is only the subset still listed today. The fix shipped
(`530c5ed`) publishes both figures separately, because an earlier draft of it
netted all 8 out of the absorption count — which would have been wrong in the
opposite direction, since 5 of the 8 returned and then genuinely left again.

**My own mistakes today (kept, so they are not repeated):**
1. The O-28 error above. Four days of a manufactured blocker put to a solo
   founder who had better things to read.
2. My first design for the O-43 fix conflated "ever relisted" with "not
   absorbed". Caught it only because I queried the per-unit detail before
   writing the manifest field rather than after. **Query the detail rows, not
   just the count, before naming a published field.**
3. I shipped `530c5ed` to main without checking that it collided with my own
   branch `odyssey/absorption-ledger-dates`, which edits the same function.
   Caught and rebased within the hour, but the right order was to check first.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **BRANCH AWAITING APPROVAL: `odyssey/absorption-ledger-dates`** (now `d182cd6`, rebased onto today's main) | The published absorption ledger dates every parse-feed-written delisting one day late — 37 of 77 tombstones. It is mirrored to avena-data and Hugging Face, and Plan B Release 1 quotes delistings by day. **Fourth day pending.** | **Three sentences: (1) parse-feed now derives the real last-seen date from `price_snapshots` instead of stamping today, and `buildLedger` counts a delisting on the first observation day AFTER it — the two must land together or the count moves onto a day the unit was still listed. (2) `scripts/backfill-tombstone-dates.sql` corrects the 37 historical rows; its dry run, executed read-only against production, moves every one of them back by exactly one day and touches nothing else. (3) It goes to a branch only because it mutates an existing column on `sold_properties`, the one table here that cannot be rebuilt.** All four gates pass on the rebased branch. |
| **RedSP is challenging GitHub Actions egress** (O-27) | ROOT CAUSE PROVEN: their provider serves an openresty JS interstitial instead of the feed. It killed 5 of 9 nightlies. The curl fallback gets through, but it rides on a client-fingerprint difference — if their guard starts challenging curl too, every night is lost until someone notices. **Seven clean nights (08-14..08-20) mean the fallback has still never been exercised on a runner — do not read the quiet as a fix.** | Either (a) ask RedSP to allow-list GitHub Actions egress for the feed URL — the clean fix, and a reasonable ask since Avena is a paying consumer of that feed; or (b) approve moving the feed step to a runner with a stable IP RedSP can allow-list. |
| `HF_TOKEN` in CI | **This is now the ONLY unverified corpus surface.** The site and the avena-data mirror are confirmed consistent (see BASELINES); Hugging Face returns 401 without a token, so three-way agreement is still unproven. Corpus filters resolve conflicts by cross-source agreement, so an unverifiable third surface is the remaining weak link. | Store the HF write token as a repo secret so the nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source: "most popular region for foreign buyers", "ECB rate stability supports mortgage affordability", "supply is constrained", plus tax/NIE/mortgage/golden-visa figures. This surface is built to be quoted verbatim by AI assistants. | Either confirm they are accurate as written, or point me at a source to check them against. |
| Bing Webmaster Tools read | **Henrik claimed avenaterminal.com 2026-08-13.** The indexation-coverage and IndexNow-key views should now be readable — next step is READING them. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the dashboard shows the key rejected, say so loudly. No Bing API access, so this stays a manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions over 3 months, 129 distinct URLs. **/compare = 87%.** Still UI-only/no API. | Re-export monthly, next ~2026-09-14, as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so nightly capture works. Vercel does not have it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

**REMOVED from BLOCKED today:** the `avena-data` mirror questions ("is there a
scheduled workflow in that repo, and what time does it run?"). Both answered by
reading the public repo myself. See the 08-20 correction. It should never have
been Henrik's to answer.

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-20 | **O-28 — "the corpus mirror is unautomated and permanently diverged"** | **NOT A DEFECT. My measurement artifact, and a four-day false blocker.** `avena-data/.github/workflows/daily-snapshot.yml` runs 07:15 UTC and pulls the site artifacts; I check at ~05:45. Same-day capture on 9 of the last 10 days; the one miss is the already-closed wedged nightly. The site and the mirror are consistent. Full correction in BASELINES |
| 2026-08-20 | **The published corpus asserted that relisted units had been absorbed** | `530c5ed` — 8 of 77 tombstoned units had been observed listed again and 3 are on the market today, while `tombstones.csv` described them all as "units that left the market" and the honesty block called a delisting "strong evidence of absorption". Now discloses `relisted_on` + `still_listed` per row, a per-day `relistings` count, and three separate manifest figures. Rows are never deleted. `schema_version` 1 → 2 |
| 2026-08-20 | **`open-dataset-io.fetchAll` would have silently truncated the corpus around 2026-11-11** | `530c5ed` — on hitting `MAX_PAGES=200` it fell out of the loop and returned short. `price_snapshots` holds 33,949 rows and grows ~2,016/day; reads are ordered ascending, so the truncation would have dropped the NEWEST days and the published ledger would have quietly stopped growing. Now throws |
| 2026-08-20 | **The corpus generator had no test coverage at all** | `530c5ed` — `scripts/test-open-dataset.ts`, 27 assertions. It earned its keep the same day: rebasing the pending branch onto it produced a clean textual merge whose behaviour the harness immediately flagged as changed |
| 2026-08-20 | **The 2026-08-19 citation day rolled up unattended** | `citation-measure` fired 04:15 on schedule and published 68 asked / 6 hits / 8.82% organic / branded 6/6 without help. The `b090f52` recovery held |
| 2026-08-19 | **The citation engine lost a whole measurement day to a timeout it was already grazing** | `b090f52` — `maxDuration` 300s; the last good run (08-17) took 273s, 91% of budget. `queryMonitor` is now resumable, persists per batch, and stops itself at 210s. Schedule became `0,10,20 3 * * 1,3,5` |
| 2026-08-19 | **`citation_monitoring` insert return dropped on the floor** | `b090f52` — only rows the database accepted are counted; rejects surface as `persist_failures` |
| 2026-08-19 | **`counterpart-discover` and `eu-stats-ingest` diagnosed after 86 and 92 blind failures** | `e890daa` verified working. Both now tracked with real causes under O-41 |
| 2026-08-18 | **`/api/intelligence/regime` published "Spain GDP: 3335689.7 %" as a live reading** | `061a57c` — `ilike('indicator_key','%'+name+'%')` matched Euro Area GDP in chained millions. Replaced with an exact key map gated on country AND unit. Held on day two |
| 2026-08-18 | **The `causal_indicators` fallback had never once worked** | `061a57c` — selected `value, direction`; the real columns are `current_value, signal`, so every call 400'd into an empty catch |
| 2026-08-18 | **Three bullish predicates were wrong** | `061a57c` — EUR/NOK and EUR/SEK were `() => true`. Published confidence 78 → 60 |
| 2026-08-18 | **`live` meant "a query returned a row", not "the source is current"** | `061a57c` — every indicator now carries `as_of`, `age_days`, `stale`, STALE_AFTER_DAYS=45 |
| 2026-08-18 | **A value's `source` named the wrong table** | `e7afe39` — `SourcedValue.origin`. Held on day two |
| 2026-08-18 | **`precursor-scan` published LLM-invented market signals** | Cron removed from `vercel.json`. Do not re-enable; do not top up for it |
| 2026-08-18 | **Market Pulse weekly delivery confirmed firing on schedule** | `2416532` — fired 08-17 06:05 UTC with a real Resend id |
| 2026-08-17 | **`/api/snapshot-archive` would have archived only the first 1,900 of the book every day and called it complete** | `b730a1d` — `expected` measured off the TRUNCATED list so `inserted === expected` held at 1900/1900 |
| 2026-08-17 | **`sync-macro` stored a NULL for Spain unemployment while the real figure sat one row above** | `582de5b` — Eurostat publishes the period LABEL before the observation |
| 2026-08-17 | **`gsc_pages` capture confirmed accumulating** | `c86ec47` — 98 → 151 → 184 → **287** distinct pages |
| 2026-08-16 | **`/api/v1/apci` published a composite index with 40% of its weight fabricated** | `f00086d` — verified live on day two: 65, GROWTH, 95% measured |
| 2026-08-16 | **`/api/snapshot-archive` ran daily at 06:00 for months into an empty table** | `f00086d` — six nonexistent columns, every upsert 400, hidden by `if (!error) inserted += chunk.length` |
| 2026-08-16 | **`/api/v1/digital-twin` published a hardcoded APCI and random numbers** | `f00086d` — `Math.random()*4-2` added to every published regional impact |
| 2026-08-15 | **`/api/v1/snippet-answers` published five false market facts** | `e6bb569` — "Estepona is on the Costa Blanca" |
| 2026-08-15 | **market-clock and microstructure derived published verdicts from default constants** | `a2bf7d2` — 6 of 10 regions at SLOWDOWN purely via a default, all stamped `data_quality:"LIVE"` |
| 2026-08-15 | the change-answers 1-day window fix, confirmed on an unattended nightly | `9c387fd` |
| 2026-08-15 | CompareLedgerPulse render + province-strip fix | `f2880a4`/`3b1d983` |
| 2026-08-14 | **published change-answers claimed 101 price moves inside a 1-day window** | `9c387fd` — an unpaginated select hitting PostgREST's 1000-row cap |
| 2026-08-14 | the feed retry loop spent 120 minutes on a challenge it could never pass | `e415c6b` |
| ~~O-25~~ | **CLOSED 2026-08-14.** "The GitHub PAT is not durable" | MCP GitHub integration has Actions write |
| ~~O-24~~ | **CLOSED 2026-08-14.** "Every enrichment step is downstream of the one step that keeps breaking" | Was a symptom of the feed failure |
| ~~O-11~~ | **SUPERSEDED 2026-08-14 by O-28** | …and O-28 itself is now closed as a non-defect. This whole line of enquiry was chasing a schedule offset |
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
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — confirmed still working 08-19 |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |

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
| 2026-08-18 | `061a57c` **regime engine published Euro Area GDP as "Spain GDP: 3335689.7 %"** | `curl /api/intelligence/regime`. **VERIFIED live same day:** Spain GDP now **2.9, live:false, stale:true, age_days:86**; Spain Inflation now **3.0 from `spain_inflation_yoy`** (was 2.8 via a Greece-keyed match); New Supply YoY bullish **true→false**; `scoring_freshness` reports **fired 9, from live 4, from stale/literal 5**. Tomorrow: confirm `age_days` has climbed to 87 (proves it is computed, not stamped) and Spain GDP has NOT returned to a 7-digit value | **VERIFIED same day, live in prod** |
| 2026-08-18 | `e7afe39` **provenance: a value's `source` named the wrong table** | Same endpoint. **VERIFIED live same day:** Spain Inflation reads `macro_indicators: spain_inflation_yoy`, Spain GDP reads `causal_indicators (legacy) (stale: 86d old)`. Tomorrow: re-check only for regression | **VERIFIED same day, live in prod** |
| 2026-08-18 | `e890daa` **`counterpart-discover` logged "[object Object]" on all 86 failures; `eu-stats-ingest` logged NULL on 91 of 92** | **NOT YET VERIFIED — deployed after today's runs.** Tomorrow, after the 03:30 and 04:15 UTC fires: `select cron_path, left(error,160) from cron_logs where status='error' and started_at>=<tomorrow>`. counterpart-discover must show `message=… \| code=…`; eu-stats-ingest must show per-source text. **If either is still "[object Object]" or NULL, the fix did not take and that is tomorrow's first item.** The point of the fix is that tomorrow O-41 finally becomes diagnosable | **PENDING — first real test is tomorrow's fires** |
| 2026-08-17 | `b730a1d` **snapshot-archive archived only the first 1,900 of the book** | **HELD ON DAY TWO: `price_history` wrote 2,026 rows / 2,026 distinct refs for 2026-08-18**, exactly tracking a 2,026-listing feed. Not 1,900. Two clean days (2,017 then 2,026) | **VERIFIED — held on day two** |
| 2026-08-17 | `582de5b` **sync-macro stored the newest Eurostat period LABEL, not the newest observed value** | **HELD: today's 06:00:15 run reported `live 15, fetched 16, missing 1`; `spain_unemployment_rate` = 10.1 @ 2026-06.** Only `gr_inflation_yoy` null, genuinely so upstream | **VERIFIED — held on day two** |
| 2026-08-12 | `2416532` **Market Pulse weekly PDF, Mon 05:45 UTC** | **RESOLVED — it did fire.** Yesterday's "total_count: 0" was read before the run existed: GitHub started it **08-17 06:05 UTC** (20 min late under load), conclusion **success**. `pulse_deliveries` now holds `edition_date=2026-08-17`, subscriber 1, resend_id `f3c89bb9…`, sent 06:05:12. Next fire Mon 08-24 | **VERIFIED — closed** |
| 2026-08-14 | `e415c6b` **curl fallback when the feed origin serves a bot challenge** | 08-18 nightly clean again — **five consecutive unchallenged scheduled nights** (08-14..08-18). Fallback still **proven locally, never exercised on a GitHub runner** | still pending — needs a night the challenge actually fires |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-40 | **`causal-update` would stamp 86-day-old values as fresh if it ever ran.** `runCausalUpdate()` in `src/lib/causal-engine.ts:533-545` refreshes no value — it loops every `causal_indicators` row and sets `last_updated = now()`, keeping the stale value. The source comment says so outright | re-read today, unchanged. `causal_indicators`: 20 rows, **one distinct `last_updated` (2026-05-23 10:53:08)**, all carrying values. The 06:30 cron is not running | **DO NOT "FIX" THIS BY REVIVING THE CRON.** As of `061a57c` this is *more* dangerous, not less: `/api/intelligence/regime` now derives `age_days`/`stale` from `last_updated`, so reviving the bump would flip nine indicators from an honest `stale:true, age_days:86` to a fabricated `live:true, age_days:0` — on top of the APCI staleness flag it already falsifies. Fix = refresh real values, or delete the bump. Either way it mass-mutates 20 rows, so it goes to a branch | **high — and a bigger landmine after today** |
| O-34 | **Two macro tables; the read paths are now split rather than reconciled.** `macro_indicators` (fresh, nightly) vs `causal_indicators` (frozen 2026-05-23) | both queried today | **PARTIALLY ADDRESSED by `061a57c`/`e7afe39`.** The regime engine now prefers `macro_indicators` for the two keys that genuinely exist there (Spain inflation, unemployment) and correctly ages everything else. What remains: **nine indicators still have no live source at all** — Spain GDP, Costa Blanca YoY, Foreign Buyer Share, Alicante Transactions, New Supply, 10Y Bond, Mortgage Approvals, Brent, Consumer Confidence. They are now honestly labelled stale rather than wrongly labelled live, so this is no longer a credibility bug — it is a coverage gap. `/api/v1/apci` still reads `causal_indicators` directly and is unchanged | **high** |
| O-41 | **Three crons have essentially never succeeded.** `counterpart-discover` **0/86**; `eu-stats-ingest` **1/92**; `precursor-scan` fails daily | `cron_logs` grouped, re-queried today | **`precursor-scan` RESOLVED BY REMOVAL (Fable, 2026-08-18):** it failed daily since ≥08-11 on Anthropic credit — but read what it does when it works: it prompts an LLM to INVENT a "plausible" market signal daily with fabricated `historical_price_impact_pct`/`sample_size`/`confidence_score`/APCI projections and publishes it on `/precursor` as an Avena signal. Same fabrication class as the benchmark MACRO/PREDICTION banks Henrik had cut 08-13. The credit outage was a favour. Cron removed from `vercel.json`; route file left in place (inert without a schedule); no credit top-up. `/precursor` now shows only its pre-existing seed rows — treat those as O-26 audit candidates. The other two were undiagnosable because they destroyed their own error text; `e890daa` fixes that today, so **tomorrow's log lines are the actual investigation**. None of the three feeds `price_snapshots`/`sold_properties`, so the moat is unaffected | high |
| O-42 | **`genesis/run` discards its write results and marks the scenario complete regardless.** `await supabase.from('genesis_outputs').insert(outputs);` — return dropped, then `status:'complete'` set unconditionally | `src/app/api/v1/genesis/run/route.ts:273-274` | The recurring shape in a scenario simulator. Deferred again: today went to the regime engine, which was publishing a live falsehood rather than an unchecked write. `eu_gdp_growth_pct ?? 2.1` also invents a GDP level, but the response discloses `engine:'mock-deterministic'` | medium |
| O-39 | **All 90 legacy `market_snapshots` rows have a NULL `snapshot_date`.** 2026-05-23 is the last `computed_at`, not a date column value | queried 08-17 | Harmless to reads (they order by `computed_at`) and new dated writes are unaffected. Decide: backfill from `computed_at`, or leave the legacy block and start clean from 08-17 | medium |
| O-35 | **2026-05-23/24 is a cluster date across several pipelines.** `causal_indicators` 05-23, `market_snapshots` last `computed_at` 05-23, per-country HICP rows 05-23, `properties_registry` 05-24 | queried 08-16..08-18 | O-40 explains the `causal_indicators` half. `properties_registry` on 05-24 still unexplained. One focused look | medium |
| O-27 | **RedSP's provider serves a bot-protection JS interstitial to some clients/requests.** ROOT CAUSE KNOWN: `openresty/1.31.1.1` returns a 12.1KB "One moment, please..." page that reloads via JS; node's `fetch` cannot execute JS. curl 6/6 success, node fetch 3/3 challenged. **Intermittent** — five clean nights now | run 31774148318; client comparison 08-14; clean nights 08-14..08-18 | operational half mitigated by `e415c6b`. CAUSE cannot be fixed by me: needs RedSP to allow-list, or a stable-IP runner. If curl starts getting challenged, the fallback dies with it | **CRITICAL — mitigated, cause still open** |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants.** 158 route files. **Eight examined to date, eight defective — 8 for 8** | `63f405b`, `9c387fd`, `e6bb569`, `a2bf7d2`, `f00086d` (apci + digital-twin), `genesis/run` (O-42), today `061a57c` (regime) | **Still unexamined, same grep signatures: `arbitrage` (`Math.max(6, convergenceMonths)`), `tax` (`?? 5.5` gross yield, line 93), `compliance` (`?? 3200`, `?? 30`), `carbon` (`?? 45`, `?? 80`), `liquidity`/`passport` (`?? 50`).** Today added a new signature worth grepping fleet-wide: **`.ilike(` on an indicator/series key** — substring matching is how the GDP and Greece defects both happened | **high — highest hit rate of anything I have** |
| O-36 | **`snapshot-archive` computes five market-summary figures it cannot store.** `above_80`, `avg_discount`, `new_this_week`, `key_ready_count`, `off_plan_count` have no column | `f00086d`; schema read 08-16 | Deliberate. Additive and allowed, but `new_this_week`/`avg_discount` deserve a considered schema. Decide alongside O-37 | medium |
| O-37 | **Nothing writes `market_snapshots.apci`, so APCI `week_change` can never populate.** | `/api/v1/apci`; schema 08-16 | An honest null beats the 85-day delta it replaced. `snapshot-archive` is the natural writer. Do after O-34/O-40 so the series is not built on 86-day-old macro | medium |
| O-30 | **Unbacked qualitative claims in snippet-answers.** "most popular region for foreign buyers", "ECB rate stability supports mortgage affordability", "foreign demand remains strong", "supply is constrained"; plus unaudited tax/NIE/golden-visa/LTV prose | read 2026-08-15 | Rewriting them would be inventing copy (CLAUDE.md rule 1) — the fence permits correcting a **false** fact, not replacing an unverifiable one with my own wording. Needs Henrik or a cited source | medium |
| O-28 | **`avena-data` corpus mirror has NO automation in this repo.** Site **v2026-08-18**, mirror **v2026-08-17** — diverged by exactly one day again, for the fourth day running | mirror JSON read live today | The one-day lag is now a stable, reproducible pattern, which supports the "mirror pulls before the site rebuilds" hypothesis. See BLOCKED | **high** |
| O-21 | **`sold_properties.last_seen_date` is stamped "today", not the date last actually seen.** The pricing-history route uses `priorDate` and is correct; `parse-feed.js` is not. The two disagree | `parse-feed.js` sold-detection block | one-day provenance error in the absorption ledger — the moat's most defensible artifact. Needs a decision on existing tombstones | high |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books | proven by diffing data.json blobs against stored row counts | cause fixed; 08-10..08-18 each a single clean write. Polluted historical rows still need careful reconciliation — branch-only, own day | high |
| O-5 | Pre-transliteration accent slugs are indexed and hold a disproportionate share of clicks. **The "186 of 492" figure is unsourced — see O-33** | `gsc_pages` attribution proven wrong 08-15 | 308 shims confirmed working. **New basis for a read-out date:** Google's canonicalization-troubleshooting doc (clarified 2026-07-10) states pages may be held in a duplicate cluster **up to two weeks** after a fix. So consolidation should be observable by ~2 weeks after the shims; re-derive from `gsc_pages` (now 184+ distinct pages) rather than from the old figures | high |
| O-6 | `/compare` dominates our search surface: **87% of Google AI-feature impressions (198/228)** | `gsc_pages`; `docs/gsc-genai/` (Henrik's export — solid) | CompareLedgerPulse (verified 08-15) put the moat on it. Read out 2026-09-14 | high |
| O-33 | **The "492 indexed / 293 /compare / 186 accent" baseline is NOT reproducible from `gsc_pages`.** | queried 08-16: 151 pages; 08-17: 184 | **Do not quote 492/293/186 again until re-derived.** O-5 and O-6 both rest on these and are weaker than they read | **high** |
| O-13 | **PerplexityBot is barely present.** 51 hits / 32 paths since 08-12 — negligible for the crawler the entire citation strategy targets | crawler ledger today | cause unknown and must not be guessed at. Not a robots.txt problem — rules are permissive and OAI-SearchBot thrives under the same file | high |
| O-15 | **Vercel Analytics figures are mostly machines.** AwarioBot alone is 25,493 hits since 08-12 | crawler ledger | **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in 4 more places: `scribe/route.ts:48`, `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`, `dvf-ingest` | real instances of the recurring shape | `score_history` healthy so not actively losing rows | high |
| O-16 | **ClaudeBot has barely returned.** 6 hits total since 08-12, **last seen 08-15** — three days absent | crawler ledger | effectively absent. Acting requires knowing why, and I do not | medium |
| O-14 | **AwarioBot is the largest crawler on the site and returns nothing.** 25,493 hits over **2,277 paths — path count frozen for 6 days while hits grew 45%** | crawler ledger | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`.** `parse-feed.js:1003` banks inside the runner; the Vercel route banks again minutes later | `parse-feed.js:962,1003` | 08-12..08-18 all had effectively one writer and the cleanest captures on record. Wants a comment at both ends at minimum | medium |
| O-10 | `citation_measurements` still holds the fabricated-zero rows (08-02..08-06) and two 0-question rows (08-08, 08-09) | table read | cannot distinguish "asked 87, genuinely 0" from "all lookups failed". Never delete data. **Excluded from every published surface** by `loadMeasurements` | medium |
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
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | 2026-09-02 (4 weeks) | pending |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers only | distinct properties fetched per crawler per pass | 2026-08-25 (2 weeks) | pending — **signal firmly negative for AwarioBot: distinct paths frozen at exactly 2,277 for six straight days while hits grew 15,968 → 25,493.** It re-crawls the same set harder, not broader. Hold to 08-25 for the other 13 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) vs the **4.41% baseline** | 2026-09-08 (4 weeks) | pending — read out on COMPLETE runs only |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | 2026-08-25 (2 weeks) | pending — readable from `crawler_hits` |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (4 weeks) | pending |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` column | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (4 weeks) | pending — needs distribution: not listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate vs 4.41%; citations of town pages specifically | 2026-09-09 (4 weeks) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" queries + GSC impressions | 2026-09-23 (6 weeks) | pending |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (4 weeks) | pending — **interim.** OAI-SearchBot cumulative **744 hits / 256 paths** (was 626/239), ChatGPT-User **297/92** (was 251/80). Floor has held seven days at ~20-40x the pre-ping baseline of 2/day. Still confounded by 08-12 being a heavy deploy day. **Hold to 09-09** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | 2026-08-26 (2 weeks) | pending — **still likely unreadable rather than negative: GPTBot 49, ClaudeBot 6 (last seen 08-15), meta-externalagent 3 (last seen 08-13).** These three are barely present at all |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions but held no ledger data; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 (4 weeks) | pending — **render verified live 2026-08-15** |
| 2026-08-10 | ~~A bulk ingest of the one-pagers raises the organic citation rate~~ | ~~an external agent crawled 310 one-pagers~~ | — | — | **WITHDRAWN same day.** The crawler was AhrefsBot, which feeds a backlink index, not a language model |

**No new experiment today.** All three commits were defect fixes — a published
falsehood on the regime engine, its own follow-up provenance bug, and cron
error diagnostics. None is an SEO change, and logging any of them as an
experiment would be exactly the manufactured progress this file prevents.

**Confound to remember:** `f00086d` changed the published APCI from 58 to 65
and altered `/api/v1/apci` and `/api/v1/digital-twin`, both AI-facing. If the
09-08 organic read-out moves, that is a second confound alongside `e6bb569`,
and neither can be attributed to the property-page quotable alone.

## 3b. PLAN B — press detonation calendar (Henrik's "B GO")

The press room is the landing surface; the releases are the detonations. The
genuine daily series started 2026-08-05. Drafts with named data slots live in
`~/Desktop/PLAN-B-RELEASES.md`. Nothing fires without Henrik's explicit go.

| when | what | gate |
|---|---|---|
| 2026-08-13 | Press room truth-repaired (`4e9f96d`) | done |
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | series gap ≤2 days; all numbers day-of from `price_snapshots`/`sold_properties` |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | Henrik's explicit go |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.74%** (in-sample, n=2026) — moved from 15.89% because the book grew to 2,026, not because of a model change. The nightly had already written this value; my gate run reproduced it byte-identical | 2026-08-18 | `public/model-stats.json` |
| Live book | **2,026 listings** (was 2,017) | 2026-08-18 | `public/data.json`, feed commit `271cda4` 02:40 UTC |
| Sitemap | **2,678 `<loc>`**, valid XML (was 2,669 — tracks the book) | 2026-08-18 | `/sitemap.xml` |
| Corpus version | site **v2026-08-18** · `avena-data` **v2026-08-17 (DIVERGED by one day, O-28)** · HF unverified (401 without a token) | 2026-08-18 | mirror lags every night, now 4 days running |
| Ledger (published) | first 2026-08-05, latest 2026-08-18, **14 observation days, 2,092 refs, 122 moves, 58 tombstones** | 2026-08-18 | `/open-data/dataset.json` |
| **Real price moves by day** | 27 (08-06), 18 (08-07), 8 (08-08), 0 (08-09), 0 (08-10), 13 (08-11), 15 (08-12), 5 (08-13), 15 (08-14), 4 (08-15), 1 (08-16), 0 (08-17), **15 (08-18)** | 2026-08-18 | `price_snapshots`, diffed |
| Snapshot rows by day | 2,007 (08-14), 2,005 (08-15), 2,017 (08-16), 2,017 (08-17), **2,026 (08-18)** — one clean write per day since 08-10, rows = distinct refs every day | 2026-08-18 | `price_snapshots` |
| `price_history` (archive) | 2,017 (08-17), **2,026 (08-18)** — tracks the book exactly; `b730a1d` held on day two. **If a day ever shows exactly 1,900, the cap is back** | 2026-08-18 | queried after the 06:00 run |
| Delistings | **1 new tombstone dated 08-18.** Cumulative **58** | 2026-08-18 | `sold_properties` |
| pricing-history cron | `feed 2026 · snapshotted 2026 · moves_detected 15 · price_moves 0 (already logged) · delisted 0 · prior_date 2026-08-17 · prior_age_days 1 · trusted_prior true · overlap 1.0 · errors null` | 2026-08-18 | hand-run 05:37, idempotent |
| **Regime engine (published)** | **SUPER_BULL, 9/10, confidence 60** (was 78 before the predicate fixes). **`scoring_freshness`: 9 fired, 4 from live sources, 5 from stale/literal.** Spain GDP 2.9 stale 86d, Spain Inflation 3.0 live, Spain Unemployment 10.1 live | 2026-08-18 | `/api/intelligence/regime` |
| APCI macro input age | **87 days** expected today (`as_of` 2026-05-23) — climbing daily until O-34/O-40 are resolved | 2026-08-18 | `/api/v1/apci` |
| **Citation rate, organic (qb-v2) — THE baseline** | **5.88% (4/68) on 08-17**; 2.94% (2/68) 08-14; 4.41% (3/68) 08-10 and 08-12. **Four complete runs, mean 4.41%.** One hit = 1.47pp, so 08-17 is exactly **one hit above the mean and is NOT an improvement** — read nothing under ~3pp as signal | 2026-08-17 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6) on 08-17**; 83.33% (5/6) on the three prior runs | 2026-08-17 | `citation_measurements` |
| Citation run coverage | 08-10, 08-12, 08-14, 08-17 all 68/68 + 6/6. **No run today — schedule is Mon/Wed/Fri and today is Tuesday. Next: Wed 08-19** | 2026-08-18 | `vercel.json` crons + table |
| Citation rate, qb-v1 (RETIRED RULER — never a baseline) | organic 6.19% (26/420), branded 20.00% (3/15) | 2026-08-07 | excluded from all published series |
| **Crawler ledger, hits since 08-12** | AwarioBot 25,493 (**2,277 paths, frozen 6 days**) · Googlebot 6,799 (3,159 paths) · PetalBot 4,870 · AhrefsBot 3,097 · Amazonbot 2,097 · Lightpanda 1,677 (stopped 08-14) · bingbot 1,549 · SemrushBot 1,236 · **OAI-SearchBot 744 (256 paths)** · YandexBot 633 · SERanking 502 · DotBot 313 · **ChatGPT-User 297** · MJ12bot 121 · Bytespider 103 · **PerplexityBot 51** · **GPTBot 49** · Applebot 34 · TikTokSpider 14 · **ClaudeBot 6 (last 08-15)** · meta-externalagent 3 · Google-Extended 3 | 2026-08-18 | `crawler_hits` |
| **Nightly reliability** | **08-14..08-18 all succeeded — five clean scheduled nights in a row.** Prior: 5 of 9 failed at the feed step | 2026-08-18 | Actions run list |
| Build health | Nightly feed 08-18 success. `pulse-weekly` first scheduled fire 08-17 06:05 **success**. **No branches and no open PRs, so no preview builds to check** | 2026-08-18 | `actions_list` |
| Search impressions / clicks, last 28d | 1,991 / 27 — **inside the noise band, not a result** | GSC current to 2026-08-14 | `gsc_daily` |
| `gsc_pages` depth | **184 distinct pages**, max date 2026-08-14 (unchanged today — GSC has not published a newer day) | 2026-08-17 | `gsc_pages` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 | 2026-08-14 | `docs/gsc-genai/` — Henrik's UI export. Properly sourced |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **8 audited to date, 8 defective** | 2026-08-18 | `find src/app/api/v1 -name route.ts` |
| `macro_indicators` | 16 keys, last fetch **2026-08-18 06:00:15** (`live 15, fetched 16, missing 1`). Only `gr_inflation_yoy` null, genuinely so — Greece returns 348 periods and 0 values upstream | 2026-08-18 | sync-macro output_summary |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08.** All 20 carry values. Now read with correct column names (`current_value`/`signal`) for the first time | 2026-08-18 | queried directly |
| Cron success rates (worst) | `counterpart-discover` **0/86+** · `eu-stats-ingest` **1/92+** · `precursor-scan` failing daily on Anthropic credit · `mentat` 57/119 | 2026-08-18 | `cron_logs` grouped |

**Correction, 2026-08-09 (kept):** an earlier reading of "traffic has halved"
was wrong — the query compared 28 days against 56. Real figures above: flat.
Kept because a wrong baseline would make every future experiment read as a
recovery.

**Correction, 2026-08-15 (kept):** O-26 was recorded as "~20 endpoints". The
real number is **158 route files** — the scope was understated ~8x.

**Correction, 2026-08-17 (kept):** O-34 claimed `macro_indicators` returned
null for the ECB rate and both Euribor series. **That was wrong** — all three
are fresh and populated. The earlier query did not take the newest row per
indicator key.

**Correction, 2026-08-18 (new):** yesterday I recorded `pulse-weekly` as
possibly never having fired, on a `total_count: 0` read. **It had fired** — I
simply queried before GitHub started the delayed run at 06:05. A "never ran"
verdict taken from a run list read minutes before the run exists is not
evidence. Re-check late-firing schedules the next morning, not the same hour.

**Note, 2026-08-16 (kept):** the APCI baseline moved 58 → 65, but that is a
**ruler change, not a market move**. Do not plot the two on one series;
`methodology_version` 3 marks the break. **The same now applies to the regime
engine's `confidence`: 78 → 60 today is a predicate correction, not a
sentiment shift.** `regime_score` itself is unchanged at 9.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| ~~Anthropic API credit~~ | **CLOSED 2026-08-18 by Fable — cron disabled, not funded.** `precursor-scan` generated invented signals (fabricated impact %, sample sizes, confidence, APCI projections) and published them on `/precursor`. Removed from `vercel.json`. Do not re-enable; do not top up for this. If any OTHER Anthropic-backed job needs credit, raise it separately with what that job publishes. | nothing — decided |
| **RedSP is challenging GitHub Actions egress** (O-27) | ROOT CAUSE PROVEN: their provider serves an openresty JS interstitial instead of the feed. It killed 5 of 9 nightlies. The curl fallback gets through, but it rides on a client-fingerprint difference — if their guard starts challenging curl too, every night is lost until someone notices. **Five clean nights (08-14..08-18) mean the fallback has still never been exercised on a runner — do not read the quiet as a fix.** | Either (a) ask RedSP to allow-list GitHub Actions egress for the feed URL — the clean fix, and a reasonable ask since Avena is a paying consumer of that feed; or (b) approve moving the feed step to a runner with a stable IP RedSP can allow-list. |
| **`avena-data` corpus mirror is unautomated and diverged** (O-28) | Site publishes v2026-08-18, the mirror serves v2026-08-17. Corpus filters resolve conflicts by cross-source agreement, so two surfaces disagreeing is worse than one surface alone. The lag has now been **exactly one day, four days running** — a stable pattern, not drift. | **Two questions, repeated from 08-17: (1) is there a scheduled workflow inside the `avena-data` repo that pulls from avenaterminal.com, and what time does it run? (2) if so, it is firing before the site's 02:45 rebuild, which explains a permanent one-day lag exactly.** If that is it, the fix is moving one cron, not minting a token. If you update it by hand, I need a cross-repo write credential (deploy key or fine-grained PAT for `HenrikKolstad/avena-data`) as a repo secret. |
| `HF_TOKEN` in CI | Same family. Hugging Face cannot be verified from here at all — the API returns 401 without a token — so three-way agreement remains unproven, and the two-way is currently broken. | Store the HF write token as a repo secret so the nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source: "most popular region for foreign buyers", "ECB rate stability supports mortgage affordability", "supply is constrained", plus tax/NIE/mortgage/golden-visa figures. This surface is built to be quoted verbatim by AI assistants. | Either confirm they are accurate as written, or point me at a source to check them against. |
| Bing Webmaster Tools read | **Henrik claimed avenaterminal.com 2026-08-13.** The indexation-coverage and IndexNow-key views should now be readable — next step is READING them. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the dashboard shows the key rejected, say so loudly. No Bing API access, so this stays a manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions over 3 months, 129 distinct URLs, ~10x growth since June. **/compare = 87%.** Still UI-only/no API. | Re-export monthly, next ~2026-09-14, as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so nightly capture works. Vercel does not have it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-18 | **`/api/intelligence/regime` published "Spain GDP: 3335689.7 %" as a live reading** | `061a57c` — indicator lookup was `ilike('indicator_key','%'+name+'%')`. `%gdp%` matched `ea_gdp_chained_meur`, Euro Area GDP in chained millions of euros, published as a Spanish percentage growth rate with `live:true` and counted as a bull vote. `%inflation%` matched all seven country HICP keys, which share one `fetched_at`, so the winner was arbitrary — it resolved to Greece (null), fell through, and served a literal 2.8 while Spain's real HICP was 3.0. Replaced with an exact key map gated on country AND unit; Spain GDP deliberately has no mapping because no correct key exists |
| 2026-08-18 | **The `causal_indicators` fallback had never once worked** | `061a57c` — it selected `value, direction`; the real columns are `current_value, signal`, so every call 400'd into an empty catch. Eight indicators labelled "causal_indicators (fallback)" were in fact hardcoded literals naming a table that was never successfully read. Columns fixed; values now flow and are aged, not passed off as current |
| 2026-08-18 | **Three bullish predicates were wrong** | `061a57c` — EUR/NOK and EUR/SEK were `() => true`, bullish at every possible exchange rate; they now use the same falling-is-bullish rule as EUR/GBP. New Supply YoY used `v > 0`, publishing rising supply as bullish while `causal_indicators` stores `signal='bearish'` for that same row. Published `confidence` 78 → 60 as a result |
| 2026-08-18 | **`live` meant "a query returned a row", not "the source is current"** | `061a57c` — every indicator now carries `as_of`, `age_days`, `stale`, with STALE_AFTER_DAYS=45, and `scoring_freshness` reports how many of the firing signals came from a live source (today: 4 of 9). The narrative appends the stale count so the caveat travels with the "N/10 bull signals" claim |
| 2026-08-18 | **A value's `source` named the wrong table** | `e7afe39` — my own regression from `061a57c`: Spain Inflation/Unemployment resolved via `macro_indicators` but were still labelled `causal_indicators`, and the fallback path could mislabel in the other direction. `SourcedValue.origin` now records where a value actually came from and overrides the expected-source label |
| 2026-08-18 | **`counterpart-discover` logged "[object Object]" on all 86 failures; `eu-stats-ingest` logged NULL on 91 of 92** | `e890daa` — `cron-log.ts` did `String(error)`, and Supabase's PostgrestError is a plain object, not an Error. New `describeError()` prefers message/code/details/hint, then JSON, then String, and can never emit "[object Object]"; tested against 8 shapes including circular. `eu-stats-ingest` now passes the per-source error strings it had already collected. **Verification is tomorrow's first item** |
| 2026-08-18 | **Market Pulse weekly delivery confirmed firing on schedule** | `2416532` — yesterday's "never ran" reading was premature. Fired 08-17 06:05 UTC (delayed 20 min by GitHub), success, `edition_date=2026-08-17` delivered to subscriber 1 with a real Resend id |
| 2026-08-17 | **`/api/snapshot-archive` would have archived only the first 1,900 of a 2,017 listing book, every day, and called it complete** | `b730a1d` — `all.slice(0, 1900)` was a stale constant; `expected` was measured off the TRUNCATED list, so `inserted === expected` held at 1900/1900. Confirmed held on day two: 2,026 rows for a 2,026 book |
| 2026-08-17 | **`sync-macro` stored a NULL for Spain unemployment every night while the real figure sat one row above it** | `582de5b` — Eurostat publishes the period LABEL before the observation. Now selects the newest period carrying a finite observation. Confirmed held on day two |
| 2026-08-17 | **`gsc_pages` capture confirmed accumulating three days running** | `c86ec47` — 98 → 151 → 184 distinct pages |
| 2026-08-16 | **`/api/v1/apci` published a composite index with 40% of its weight fabricated** | `f00086d` — macro_support selected a nonexistent column → 400 → silent 50; price_momentum had never once worked; foreign_demand regexed nationality against the property TYPE so 0 of 2,017 could match, hidden by a `Math.max(40,…)` floor; week_change published an 85-day delta labelled "week". Verified live on day two: 65, GROWTH, 95% measured |
| 2026-08-16 | **`/api/snapshot-archive` ran daily at 06:00 for months into an empty table** | `f00086d` — six nonexistent columns made every upsert 400, `if (!error) inserted += chunk.length` hid it, route returned `success: true` regardless |
| 2026-08-16 | **`/api/v1/digital-twin` published a hardcoded APCI, hardcoded macro stamped "synced", and random numbers** | `f00086d` — `apci: 74` while the canonical endpoint read 58; `Math.random()*4-2` added to every published regional impact. Verified deterministic on day two |
| 2026-08-15 | **`/api/v1/snippet-answers` published five false market facts** | `e6bb569` — "Estepona is on the Costa Blanca" (it is Costa del Sol); Costa del Sol's 2% yield attributed to Costa Blanca (real 5.4%); APCI frozen at "74 / GROWTH" with "currently" in 5 places. Root cause: `costas[0]` sorts by COUNT, read as if sorted by yield |
| 2026-08-15 | **market-clock and microstructure derived published verdicts from default constants** | `a2bf7d2` — `COSTA_MOMENTUM[slug] ?? 5.0` put 6 of 10 regions at SLOWDOWN purely via the default, all stamped `data_quality:"LIVE"` |
| 2026-08-15 | the change-answers 1-day window fix, confirmed on an unattended nightly | `9c387fd` |
| 2026-08-15 | CompareLedgerPulse render + province-strip fix | `f2880a4`/`3b1d983` |
| 2026-08-14 | **published change-answers claimed 101 price moves inside a 1-day window** | `9c387fd` — an unpaginated `price_snapshots` select hitting PostgREST's 1000-row cap |
| 2026-08-14 | the feed retry loop spent 120 minutes on a challenge it could never pass | `e415c6b` — HTML interstitials recognised, curl fallback, give-up in ~30s |
| ~~O-25~~ | **CLOSED 2026-08-14.** "The GitHub PAT is not durable, so I cannot self-recover" | MCP GitHub integration has Actions write |
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
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — confirmed still working 08-17 |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |

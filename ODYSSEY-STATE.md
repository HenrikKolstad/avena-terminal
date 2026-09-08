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
| 2026-09-08 | `08272fc` **O-83 — the book's size was a literal on ~40 surfaces.** `getCorpusSize()`/`getCorpusSizeLabel()` derive it from `public/data.json`; ~40 server surfaces converted; `scripts/test-corpus-count.ts` (14 tests) fails the build on any un-declared literal | **VERIFIED IN PRODUCTION THE SAME DAY, on the payload that matters and by parsing rather than eyeballing** (yesterday's failure was that I eyeballed one half). Homepage serves **`1,881` ZERO times, `2,034` five times**; both JSON-LD blocks parsed: `WebSite` → "Depth: **2,034** scored Spanish new-builds", `Dataset` → "Scored dataset of **2,034** new-build properties". `/api/mcp-tools` 2,034 ×2 · `/llms-full.txt` 2,034 ×3 and no 2,200 · `/api/v1/api-profile` 2034. **TOMORROW: confirm the count TRACKS the book — after tonight's feed the served figure must equal the new `data.json` length, not stay at 2,034. That is the discriminating check: a frozen 2,034 would mean I replaced one literal with another.** Also confirm `/deals`, `/no`, `/property/{ref}` still 200 (the layout metadata became `generateMetadata`) | **VERIFIED same-day on the AI payload; the TRACKING half reads out 09-09** |
| 2026-09-08 | `1745d91` **`shareBudget` — two hung ECB indicators starved a healthy third.** Remaining source budget is now divided across untried indicators; applied to all five adapter loops | **NOT YET VERIFIED IN PRODUCTION — the next scheduled `eu-stats-ingest` is 09-09 04:15.** Criteria, each able to fail independently: **(a)** `rows_upserted` back to ≥ 8,825 with no hand re-run (today it was 8,623); **(b)** if ECB hangs again, NO indicator reports `budget exhausted before attempt 1/3` — a starved indicator is the exact thing this fixes; **(c)** eurostat still exactly 3,808 and ine_es 4,480, i.e. the slices do NOT starve the healthy sources (that is this change's own amplification risk, and it is the half that could refute me); **(d)** run duration stays well inside the 265s global budget. **If ECB is healthy tomorrow, (b) is UNEXERCISED and must be recorded as such, not rounded up** | **pending — read out 2026-09-09** |
| 2026-09-07 | `5e70b6d` **`resilient-fetch` — the NETWORK-RETRY half that had never executed** | **VERIFIED, BY A NATURAL FAILURE, AND IT FOUND A BUG IN MY OWN CHANGE.** ECB hung at 04:15 today and the retry path ran in anger: `all 3 attempts failed in 48005ms — attempt 1: timed out after 15000ms; attempt 2: …; attempt 3: …`. **Cause, attempt count and elapsed time all NAMED — never a bare "fetch failed", which was the whole point of the change.** `describeFetchError`'s unwrap met a real production error for the first time and produced a usable message. **But the same run exposed the amplification: two hung series ate ECB's 70s budget and a third, healthy one got `budget exhausted before attempt 1/3 (0ms elapsed)` — zero attempts, 202 rows unrefreshed. Fixed today in `1745d91`** | **VERIFIED on reporting; REFUTED on blast radius — which became today's second commit** |
| 2026-09-07 | `b21de95` **`/defensibility`'s country count after my truncated-read bug** | **VERIFIED LIVE: the page reads "(8,825 observations, 28 countries)" — 28, not the 7 I shipped yesterday. And it did NOT regress to dropping the parenthetical, so the completeness check is not too strict and still fires.** Both halves of the pre-registered criterion met | **VERIFIED → CLOSED** |
| 2026-09-04 | `141bf2e` **`fetchCommuneYear` throwing on a dead upstream** | **Negative still bounded** (28/28 commune-years return 200, so it cannot false-alarm); **the positive still awaits a natural upstream outage.** Tell: `dvf-ingest` logging `error` with `DVF fetch failed: HTTP …` instead of `fetched: 0` + `success` | **NEGATIVE BOUNDED; positive awaits a natural outage (day 4)** |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-85 | **NEW — six CLIENT components still publish a stale book size, and they are the last of O-83.** `search/page.tsx` reads **1,999**, `calculator` **1,800+**, and `TikTokLanding` / `chat/page` / `checkout/success` / `TerminalChat` read **1,881** | `scripts/test-corpus-count.ts` allow-list, each entry naming its file and the wrong number it carries | **Deferred for a stated reason, not overlooked: these are `'use client'` modules and `getAllProperties()` is an `fs` read, so the count has to arrive as a prop from a server parent. That is a component-signature change on buyer-visible surfaces, which is a different risk class from a string edit, and I had already shipped two changes today. The test now FAILS if any of these six is edited to drop its literal without removing the exemption, so they cannot be quietly forgotten** | medium |
| O-86 | **NEW — `eu_official_stats.fetched_at` means "first inserted", not "last fetched", and its name says the opposite** | `eurostat` holds 3,808 rows whose newest `fetched_at` is **2026-07-03**, while the cron upserts all 3,808 of them every night. `ecb_sdw` shows 8 distinct fetch days across 537 rows | **Caught myself building a story out of this today: all eight ECB indicators showed `fetched_at` frozen at 09-02/09-03 and my first reading was "ECB has silently stopped writing" — the exact shape of the recurring bug. One query over the other sources refuted it in ten seconds (eurostat's is two months old and it is demonstrably healthy). NOT a freeze. But it IS a naming trap: any freshness claim built on this column would be wrong, and the column is one join away from `/eu-official` and `/defensibility`. Check for a read path before quoting it; consider adding a real `last_seen_at` set on conflict** | medium |
| O-62 | **Absorption ledger delisting dates — 130 tombstones: 31 correct · 89 one day LATE · 10 stamped behind = 99 wrong (76.2%).** Unchanged since yesterday ONLY because today's feed had not yet run when I measured — it grows by the daily delisting count and 13 arrived yesterday alone | direct SQL 09-06, re-derived: `max(snapshot_date)` per ref vs `sold_properties.last_seen_date` | **76.2%, up from 73.5% / 73% / 62% / 51%. Mechanism confirmed for the fifth day: `parse-feed.js` (the second writer, O-20) stamps the day it NOTICED, not the last day the unit was in the book. Branch `odyssey/absorption-ledger-dates` has now waited TWENTY days, and Plan B Release 1's data window closed 09-04 with the ledger three-quarters wrong. I will not compute a Release 1 delisting-by-day slot from this table** | **HIGHEST of the open items — and now overdue by 2 days** |
| O-74 | **The same-day union repair — reported, not fixed.** `price_snapshots`/`score_history` key on (ref, date) by upsert, so a second capture the same UTC day overwrites prices for refs it sees and leaves the rest behind | git blobs: N8058 699,900 (05:37 book) vs 709,900 (11:32 book) on 08-31 | `908be3a` makes it VISIBLE, not repaired. The repair is a DELETE against the moat's ground truth and needs the `MIN_FEED_OVERLAP` gate → **branch, per the standing rule on cron writes that mass-mutate.** Harm is SMALL: every row is individually defensible. **NEW INSTANCE 2026-09-04, and it is BENIGN — measured, not assumed:** two writes (05:38:02 → 2,033 rows; 06:29:55 → 4 rows), and the book diff shows a strict superset with **0 dropped and 0 price differences**, so the stored 2,037 equals the day's true final book exactly. **09-04 needs no repair and must NOT be counted as a corrupted day.** The union that still needs repairing is **08-31** alone | medium |
| O-61 | **The scheduler has landed the 05:10 slot at 06:15-06:43 for five nights running (09-01 06:43, 09-02 06:21, 09-03 06:24, 09-04 06:29, 09-05 06:15) — a consistent 65-93 min queue lag, not improving and not worsening.** Keep O-61 and O-27 apart: the scheduler firing late and the feed refusing the runner are different failures with different fixes | `actions_list`, five nights | **THE WORKAROUND IS NO LONGER ME. `47fc0b4` ships the conditional backstop as a workflow with 37 tests; its schedule (07:00 + 09:00 UTC) is set from the measured lag so the checks land ~08:00 and ~10:00.** `GITHUB_DATA_TOKEN` remains the real fix — driving the feed from Vercel's scheduler, which has been perfect throughout — but the capture no longer depends on my being awake. **No day lost: 08-27..09-05, all twelve captured** | **MEDIUM (was HIGH) — mitigated in code as of today** |
| O-27 | **RedSP is challenging GitHub Actions egress. THIRD CONFIRMED INSTANCE TODAY — and the first that would have COST A DAY on its own** | run 34 (08-28 13:19); run 48 (09-02 09:31); **NEW: run 55, 09-05 06:15:40 — identical `openresty/1.31.1.1` HTML interstitial, ~12.2KB, BOTH node fetch and curl refused across 4 attempts, dead in 34s** | **THE IMPORTANT NEW FACT, and it changes the mitigation: a FRESH RUN 43 MINUTES LATER GOT STRAIGHT THROUGH.** Run 56 (06:58:02) fetched the feed in 8 seconds. **So the block is INTERMITTENT — not time-of-day (06:15 failed, 06:58 succeeded), not GitHub-Actions-wide, and not a client fingerprint (curl is refused too).** **This does NOT contradict the log's "0 successes in 56 attempts over two 120min budgets": that was in-run retrying on one runner. A separate run on a new runner is a different draw and it cleared.** **The actionable consequence: the fix is a delayed RE-RUN, not a longer in-run retry budget.** **That is now built and live: `47fc0b4`, the capture-backstop workflow. O-27 itself is UNFIXED — RedSP still refuses us and only they can stop that — but a refusal should no longer cost a day.** | **HIGH as a cause, MITIGATED as a risk — 3 instances** |
| O-81 | **CLOSED 2026-09-07 by `5e70b6d`** — both surfaces corrected. `/defensibility` now derives the count live (null, never 0, on a failed read); `/api/openapi.json` names only the three sources that hold rows and states plainly that ISTAT/CBS/BIS are wired but dormant | — | **Kept as a pointer: the lesson is that a hardcoded count on a nightly-growing table is a false claim BY CONSTRUCTION, not by accident. See O-83, which is the same defect at 20× the scale** | closed |
| O-82 | **Three of six EU stats adapters produce nothing — and as of today INE is no longer one of them.** `istat` fails upstream (`HTTP 500`), `bis` fails upstream (`HTTP 404` — endpoint moved), and **`cbs` fetches cleanly, returns 0 rows and reports NO error at all** | `cron_logs` 09-07 05:40 (post-fix re-run): `ine_es` 4,480 ✓, `istat` 0 + HTTP 500, `bis` 0 + HTTP 404, `cbs` 0 + **empty `errors[]`** | **`cbs` is the one that is OUR shape: a silent zero, indistinguishable from a dead adapter. BIS's 404 is probably a one-line URL fix and is the best value of the three.** **Not chased today: `5e70b6d` already changes how every one of these six adapters fetches, and stacking an adapter rewrite on top of that would make tomorrow's read-out unattributable — exactly the mistake the 08-05 canonical experiment taught. Do BIS first, alone, once 5e70b6d has had a clean night** | medium-high |
| O-83 | **CLOSED 2026-09-08 by `08272fc`** — the hardcoded book size is derived everywhere it is published, and `scripts/test-corpus-count.ts` fails the build on a new literal | **Verified in production: homepage `1,881` ×0, `2,034` ×5, both JSON-LD descriptions correct** | **Kept as a pointer, because the SWEEP found more than the item did. Writing the test surfaced FIVE more stale counts across four different wrong values that a grep for "1,881" could never reach: `blog/page` 1,867 · `blog/[slug]` 1,800+ · `vs/[competitor]` 1,800+ · `search/page` 1,999 · `calculator` 1,800+ · and `llms-full.txt` at 2,200, which OVERSTATES the book on the file written for model ingest. The lesson: an item scoped by the literal you happened to notice understates its own class** | closed |
| O-84 | **The bare-`fetch` shape: 83 `await fetch(` call sites with no `signal`/timeout, ~30 server-side and cron-reachable** | swept 09-07. Highest value: **`src/lib/data-sources/{osm,eurostat,dvf,catastro}`** and **`api/cron/sync-feeds`** — ingest paths where a hang costs a day of a source, exactly as INE did | **Deferred a second day, and today gave the reason a sharper edge rather than a weaker one: `1745d91` proves that adding retry+budget to a multi-indicator loop has a starvation failure mode I did not anticipate the first time. `fetchWithRetry` + `shareBudget` are now BOTH available and the pattern is proven under real fire, so the sweep is safer than it was yesterday — but it should follow one clean night of the fair-share change, not ride on top of an unverified one** | medium |
| O-70 | **`/about/methodology` lists four data sources Avena may not ingest at all** — **INE**, **Registradores de España**, **Idealista / Fotocasa**, **Banco de España** | grep 08-31; no ingest code found outside competitor-name lists in the citation engine | **I have NOT established these are false — only that I could find no ingest path.** Same class as O-58. **The five-second check I keep re-learning: for every published capability, grep for the production CALLER** | **HIGH — credibility** |
| O-58 | **The "SHAP explainability" claim is false and it is on BUYER-FACING pages.** `/api/v1/explainable-avm` computes hand-set rule weights, not Shapley values. ~30 files | route read 08-25 | **Escalated to NEEDS HENRIK, day 8.** Do not rewrite those pages unilaterally | **high — escalated** |
| O-56 | **CLOSED 2026-09-05 by `56193e6`** — see CLOSED. The third diagnosis was the right one and the prescription written here ("emit `errors[]`; do NOT teach the derivation to guess at numeric fields") is exactly what shipped | — | **Do not re-open on the presence of `error_count`: it is still published, deliberately, as the UNCAPPED total beside a 10-item `errors[]` sample** | closed |
| O-78 | **NEW — `harvestQuestions`' dedupe read is behind `catch { /* silent */ }` (`src/lib/prometheus.ts:152`).** It reads `generated_answers.slug` to filter out questions already answered; on a failed read `existing` stays empty and **every question looks unanswered** | route read 09-05, the one silent catch left in the file after `56193e6` | **Latent, and the consequence is publication rather than a zero: prometheus would re-draft and re-publish answers that already exist.** Masked today because drafting fails at the next step anyway — **which is exactly why it must be fixed before the Anthropic balance is restored, not after.** Same family as the `citation_gaps` gate I closed today | **medium — but do it BEFORE any Anthropic top-up** |
| O-79 | **NEW — `citation_gaps` holds 0 rows, ever.** It is the input to prometheus's "gap measured → gap closed → new gap surfaces" loop, and the code comment calls that loop "what turns the citation moat into a compounding system" | direct SQL 09-05: `group by resolved` returns `[]` | **So the compounding loop has never had an input, and the claim in that comment describes an aspiration, not a running system.** Not published on any buyer-facing surface, so it is a capability gap rather than a credibility bug — **but check before quoting the loop anywhere.** Whatever should write this table (cassandra/shadow) is not writing it; not yet traced | medium |
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
| O-41 | **ONE chronic red left: `counterpart-discover`, and it is FULLY DIAGNOSED — `column properties_registry.market does not exist | code=42703`, identical on 09-04, 09-05 and 09-06** | `cron_logs.error` 09-06 | **CORRECTION, same day: I wrote in this row earlier today that it fails "with nothing recorded about why". WRONG — the reason is in the `error` column; only `output_summary` is null, because the route bails before it builds one. I read one field and concluded about the row.** The real reason not to fix it in one line: it queries `properties_registry`, **frozen 2026-05-24**, so correcting the column name only makes it successfully mine a dead snapshot. **The honest fix repoints it at the live feed (`getAllProperties`), which is a real piece of work, not a rename.** **CORRECTION, 2026-09-06: this item also recorded `eu-stats-ingest` as "upstream and degrades per-source as it should". That was WRONG and I carried it for weeks — half its loss was OUR bug, fixed today in `3a55753`; the upstream remainder is O-82.** dvf-ingest was root-caused 09-04 | high — actionable, but not a one-liner |
| O-77 | **NEW, AND THE MOST SERIOUS THING I FOUND TODAY — `/engine` overstates the transaction record by ~9x, live right now.** `property_transactions` holds **503,434 rows for 55,888 real transactions — 88.9% duplicates**, and `getEngineTruth()` publishes the RAW ROW COUNT as `transactions` | direct SQL **re-derived 09-08: 515,743 raw vs 55,986 distinct**. In four days the table grew **12,309 rows while real transactions grew 98** — the case for the branch strengthens daily; `pg_indexes` shows **no unique constraint**; `src/lib/deltas.ts:260` `countOf('property_transactions')`; rendered at `EngineClient.tsx:196/209/262` as **"Verified transactions"** and **"real closed transactions from the French land registry (DVF)"**; the page's meta description says **"396,000+ registered transactions"** against a true ~55,900 | **Cause: dvf-ingest writes with a plain `.insert()` and the 13-commune rotation re-appends the same commune-year every ~2 weeks.** **Branch `odyssey/transactions-dedupe` (`2fb0c3d`) pushed today with the migration + the insert->upsert, gates green.** **Branch-only because it deletes 447,546 rows from a table rebuildable only by re-crawling, and changes cron write logic that touches historical rows.** **Safety measured, not assumed: 0 duplicate groups disagree on `price_eur`/`price_per_m2_eur`, 0 null keys — the collapse discards nothing.** **A live distinct-count is NOT the interim fix: measured at 2.0s against the anon role's 3s timeout, and growing nightly.** **CLAUDE.md's "~380k" figure for this table is itself duplicate-inflated and should be corrected when this lands** | **HIGH — a published number, live, wrong by 9x** **NEW TODAY, and it is a surface I had not catalogued: `/engine`'s META DESCRIPTION says "394,000+ price records, 396,000+ registered transactions" — the second is wrong by ~9x and the first counts a table (`property_pricing_history`) that has never held a move event. Not corrected unilaterally today because the honest replacement number is exactly what the branch decides; it is one edit away once `odyssey/transactions-dedupe` lands.** |
| O-76 | **NEW — `dvf-ingest` de-duplicates by two keys that mint different identities, and this class is not unique to DVF.** `mintAvnIdForDvf` puts `code_postal` in the id prefix; `mintSourceListingIdForDvf` omits it entirely | measured 09-04 against the live feed; 12/12/21 orphans on Hyeres 2024 / Nice 2024 / Nice 2023, 0 on Cannes/Vence/Paris 8e | **The SYMPTOM is fixed (`141bf2e` excludes and counts orphans). The CAUSE — two seeds for one entity — is not, and `parse-feed-eu.js` and the EU ingest paths mint ids the same way.** Deliberately not chased today: **re-keying identity mass-mutates historical rows and is branch-only.** The grep that pays: **any two `mint*Id*` helpers whose seeds differ in even one field** | medium |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants. 18 audited to date, 18 defective** | route reads to 08-31; **O-75 found today makes 19 read, 19 defective** | Greps that keep paying: **`.ilike(` on an indicator key**, **`?? <number>` on a published field**, **`X \|\| 'DEFAULT'` on a categorical**, **any second copy of a centralised helper**, **a top-level `const` array carrying `authority`/`source`/`date`**, and now **`catch {}` around the only query that populates a published count**. 158 route files, 14 carrying `cite_as` | **high — highest hit rate of anything I have** |
| O-52 | **`/track-record` promises a prediction that cannot arrive** | `predictions` table: 0 rows ever | Cause = Anthropic balance, not code. Raised under NEEDS HENRIK | high — escalated |
| O-42 | **`genesis/run` discards its write results and marks the scenario complete regardless** | `route.ts:273-274` | Recurring shape in a scenario simulator | medium |
| O-47 | **CLOSED-AND-CORRECTED 2026-09-03 — see CLOSED. The premise was wrong.** The "193-row gap reported as no errors" on Vence was **de-duplication, not loss**: on all nine zero-error runs `registry_upserted == transactions_inserted` exactly while `transactions_fetched` was far higher | 14 runs of `cron_logs`, 09-03 | Kept here only as a pointer. **The real defect (a capped, shared error sample hiding ~588 lost rows on 08-27 Nice) was different from the one I filed, and is fixed in `07fbf93`** | closed |
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
| O-1 | **CLOSED 2026-09-03 by `07fbf93`** — the last three sites (`eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`) plus both dvf-ingest loops now go through `src/lib/chunked-write.ts` | — | **Do not re-open on a grep alone: the pattern `if (!error)` still appears in read paths, where it is correct.** The thing to grep for now is a chunked WRITE loop that returns a bare `number` | closed |
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
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) | **2026-09-08 — READ OUT TODAY** | **UNMEASURABLE. NOT "no effect" — there is no after-data at all.** The engine's last real measurement is **08-28, eleven days ago**; the Perplexity balance has been out since 08-31 (day 9). The pre-registered run day before this read-out (Mon 09-07) failed all three attempts on `HTTP 401 "You exceeded your current quota"`, `lookups_measured: 0`. **The before-data stands and is unchanged: nine runs, 2.94–8.82%, mean 5.72%, no detectable trend. Recording this as a null result would be a fabrication — an untested hypothesis is not a refuted one.** Re-registers for the first run day after the balance is restored |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | **2026-08-25 — READ OUT** | **POSITIVE, MODEST, NOT SIGNIFICANCE-TESTED.** 105 moved refs vs 525 unchanged. Search/AI crawlers: median **79.4h moved vs 92.3h unchanged**. Coverage 97.1% vs 92.0%. ~14% faster; n small, no significance test — **do not quote as proven**. Re-read 2026-09-25 |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse | responses naming "AVENA Index"; any external quote of a weekly close | **2026-09-08 — READ OUT TODAY** | **UNMEASURABLE, same cause, and recorded separately rather than merged into the row above — they are two hypotheses and collapsing them would hide that BOTH are unresolved.** No measured run since 08-28. **The risk this ledger now carries: five read-outs (09-08 ×2, 09-09 ×3) all land in a dark window, so a fifth of the experiment ledger resolves to "we do not know" for want of a paid balance, not for want of a result** |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 | pending — needs distribution: not listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate; citations of town pages | 2026-09-09 | pending — same Perplexity risk |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" + GSC impressions | 2026-09-23 | pending — **now confounded with the 08-05 read-out above; it is one of the six changes that muddied it** |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 | pending — **interim: OAI-SearchBot 221 hits / 130 paths over 7 days, ChatGPT-User 242/42. Treatment badly irregular — off-cadence most nights since 08-27. Do not treat it as a uniform daily treatment at read-out** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | **2026-08-26 — READ OUT** | **SPLIT: the file is fetched, but it does NOT steer the crawlers that matter.** Discovery YES (ClaudeBot 65 fetches). **Causal attribution FAILS** — GPTBot and PerplexityBot both fetched it one day BEFORE the announcement. Budget steering **NO**: null expectation **3.06%**; observed Googlebot 2.94%, ClaudeBot 2.89%, bingbot 1.65%, GPTBot 1.11% — all at or below chance. Filed O-59 |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 | pending — render verified live 08-15. **Supporting figure re-derived today: /compare is 295 of 520 distinct pages (57%) in ordinary organic `gsc_pages`** |

**No new experiment today — THIRTEENTH consecutive day, and today the reason
sharpened.** Both changes I shipped are backend: a derived corpus count and an
ingest budget. **The corpus-count change DOES touch indexable surface — it
rewrites the site `<title>`, the site-wide meta description and both JSON-LD
descriptions — so I must state plainly that it is a confound for anything
measured on impressions from today onward, and NOT treat it as invisible.** It
is a truth correction rather than an optimisation, so I would have shipped it
regardless; but the honest record is that it lands inside O-59's future window
and inside any GSC read taken after 2026-09-08. **It is not an experiment and
gets no row: I have no hypothesis that a correct number outranks a wrong one,
and inventing one after the fact is the retrofitting this ledger exists to
prevent.**

**The binding constraint is unchanged and is now compounded by a second one.**
(1) My experiment DISCIPLINE, not my supply — two read-outs failed on design in
September and I have produced more unreadable experiments than readable ones.
(2) **The measurement instrument is dark.** Five read-outs (09-08 ×2, 09-09 ×3)
resolve to UNMEASURABLE for want of a paid Perplexity balance. Starting a sixth
experiment measured by the same dark instrument would be theatre. **O-59
(narrowing the frontier window) remains the next candidate and stays blocked
until 09-25.**

**Next read-outs: 09-09 (×3, all citation-measured and all likely UNMEASURABLE),
09-09 (`1745d91` fair-share, which IS measurable), 09-14, 09-23, 09-25.**

**Weekly search scan: done 2026-09-02, next due 2026-09-09 — NOT run today.**
Running it a day early to have something to put in the brief is exactly the
manufactured work the brief forbids.

**CONFOUND — the August 2026 spam update, CLOSED and dated.** 09:27 US/Pacific
2026-08-18, duration 2d16h → complete ~08-21. Global, all languages; SpamBrain
enforcement of EXISTING policies. Avena has no exposure. Record it; do not
attribute.

**Confound to remember:** `f00086d` changed the published APCI from 58 to 65
(`/api/v1/apci`, `/api/v1/digital-twin`, both AI-facing).

**Confound, NEW 2026-09-08:** `08272fc` changed the site title, meta
description and JSON-LD corpus figure from 1,881 to a derived value on ~40
surfaces.

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
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | **THE WINDOW CLOSED ON 09-04 AND THE GATE HAS NOT CLEARED. 99 of 130 delisting dates are wrong (76.2%), re-derived 09-06 — worse than when the window closed.** `odyssey/absorption-ledger-dates` is unapproved on day 20. **I have NOT computed the Release 1 slots and will not until O-62 lands — a press release quoting a delisting-by-day series that is three-quarters wrong is precisely the one fabricated number that costs more than a year of correct ones.** The price-move half of Release 1 is unaffected and sound (`price_snapshots` is ground truth). Any delisting figure must be `delistings_currently_absent`, never the gross count. **Do NOT source any Release 1 figure from `score_history` or `property_pricing_history`.** **Provenance note that MUST appear: 2026-08-27 through 2026-09-03 were captured by manual dispatch at ~05:37 UTC because the scheduled nightly did not land on time. All are captured and complete. Scheduled runs failed outright on the feed origin's bot challenge on 08-28, 09-02 and 09-05, capturing nothing; none cost a day. 2026-08-31 is a UNION DAY (O-74): its stored 2,044 refs mix two books; the true final book was 2,042. Do not quote 08-31's listing count.** |
| **2026-09-07** | **Release 1 proposed fire — THE DATE HAS NOW PASSED WITHOUT FIRING** | **It did not fire, and that was the right outcome. The gate is STILL unmet on day 22: re-derived again this morning — 130 tombstones, 31 correct, 89 one day late, 10 stamped behind = 99 wrong, 76.2%, IDENTICAL for the third consecutive day. Flat only because there have been no departures since 09-05; it resumes growing on the next departure day.** `odyssey/absorption-ledger-dates` is unapproved on **day 22**. **My recommendation is unchanged and I will keep repeating it until it is answered: (a) slip the release until the branch is approved and the backfill has run — my recommendation; or (b) fire the PRICE-MOVE half alone, which is fully sound because `price_snapshots` is ground truth. What must not happen is firing the delisting-by-day series as drafted.** |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.76%** (in-sample, n=**2,034**), MAPE 21.87%, RMSE 43.17%. **My 05:47 gate run reproduced the committed file EXACTLY — 15.76% / n=2,034 — because the 09-08 feed had not yet run when I measured, so both are the 09-07 book.** No AVM code touched; today's two commits are metadata and ingest budget | 2026-09-08 (pre-run; = the 09-07 book) | `public/model-stats.json` |
| **RECURRENCE, not a new mistake — read this before recording the AVM figure again** | The nightly regenerates `model-stats.json` and I measure at ~05:45, BEFORE the day's feed has run, so the number in this table is always the PREVIOUS book's. Stated once rather than re-discovered every morning. **The movement 15.89 → 15.76 → 15.71 → 15.76 is entirely the BOOK; no AVM code has been touched since 08-07.** **Operational note added 09-08: running `avm-backtest` as a gate REWRITES `public/model-stats.json` with a fresh `computed_at`. If the figures are unchanged, `git checkout` that file — otherwise the gate leaves a spurious diff that collides with the nightly regeneration.** | 2026-09-08 | `git log public/model-stats.json` |
| Live book | **2,034 listings**, unchanged for a third consecutive day (09-06, 09-07, 09-08-pre-run). **Today's feed had NOT yet landed when measured at 05:58** — see the capture row | 2026-09-08 (pre-run) | `public/data.json` |
| Sitemap | **2,686 `<loc>`, 0 duplicates**, valid XML. Composition: **2,034 /property (exactly the book), 436 /compare, 99 /towns, 35 /answers, 11 /costas, 3 /no** + 68 singletons. 5 sampled property URLs all 200 (N9656, SP1335, SP1526, SP1231, N5894) | 2026-09-08 | `/sitemap.xml`, parsed |
| Corpus version | **THREE-WAY AGREEMENT, and cleanly so: site `v2026-09-07` = repo `v2026-09-07` = mirror `v2026-09-07`.** Measured at 05:57, BEFORE today's rebuild — which is why all three read the same artifact for once, with no deploy-lag or mirror-schedule caveat to apply. **HF remains 401 (no token) and is still the ONLY unverified surface** | 2026-09-08 | site + repo + mirror raw |
| **How to read the mirror correctly** | avena-data's `daily-snapshot.yml` runs **07:15 UTC**; I run at **~05:40 UTC**. So the mirror shows the site's PREVIOUS artifact when I look. **Compare after 08:00 UTC, or the mirror against the site's previous day. Do not re-open this as divergence.** | 2026-09-04 | avena-data raw `market/dataset.json` |
| **`eu_official_stats`** | **8,825 rows, 28 countries, three sources: `eurostat` 3,808 · `ecb_sdw` 537 · `ine_es` 4,480.** `istat`, `cbs`, `bis` still hold ZERO (O-82). **The table is UNCHANGED at 8,825 despite today's short write, because the 202 refused rows were idempotent re-upserts of unchanged monthly values — no observation was lost. On a month-publication night the same failure WOULD have lost data** | 2026-09-08 | direct SQL |
| **Ingest write funnel — eu-stats-ingest** | **09-08 04:15 SCHEDULED (no hand re-run): `rows_upserted` 8,623 · `rows_lost` 0 · `write_chunks_failed` 0 · `rows_duplicate_excluded` 0 · `rows_undecodable` 0 · errors 5 · duration 99.2s.** The 202-row shortfall vs 8,825 reconciles EXACTLY to three refused ECB series (68+67+67): two hung (48.0s and 16.6s across 3 and 2 attempts) and the third got `budget exhausted before attempt 1/3 (0ms elapsed)`. **`1745d91` is the fix; 09-09 is its read-out.** Pre-`3a55753` this ran at `upserted 4,345 / lost 4,480` every night for months | 2026-09-08 | `cron_logs` |
| **INTEGRITY LOG** | `integrity-roll` unattended 09-01 03:30: `count 3, inserted true, root_date 2026-09-01, merkle_root b05d8da9847527f3…`, `errors []`. Real root, not the empty-string tell. **Zenodo deposits: 0, and there is no code that makes one** | 2026-09-01 | `cron_logs` |
| **Real price moves by day** | 15 (08-14), 4, 1, 0, 15, 10, 10, 18 (08-21), 9, 0, 0, 3, 6, 5, 6 (08-28), 6, 0 (08-30), 1 (08-31), 6 (09-01), 12, 16, 19, 19 (09-05), 1 (09-06), 0 (09-07), **09-08 pending — the feed had not landed at 05:58**. **Definition: a move counts only when the previous snapshot is ≤2 days earlier** | 2026-09-08 | `price_snapshots`, direct SQL diff |
| Snapshot rows by day | 2,043 (09-01), 2,033, 2,034, **2,037 (09-04 — TWO writes, clean superset)**, 2,026 (09-05), 2,034 (09-06), 2,034 (09-07). **Re-derived 09-08: every day 09-01..09-07 has `distinct created_at` = 1 except 09-04, so no new union days.** 09-08 pending | 2026-09-08 | `price_snapshots` |
| **Union-day audit, 09-01..09-07** | **Re-derived by direct SQL today rather than carried forward: rows = refs on every day (no duplicate refs within a day), and `distinct created_at` = 1 on all seven days except 09-04, which had 2 and was measured benign (strict superset, 0 dropped, 0 price differences).** The only union day still needing repair remains **08-31** (O-74) | 2026-09-08 | `price_snapshots` |
| **TODAY'S CAPTURE (09-08) — NOT YET LANDED AT 05:58, AND THAT IS NOT A FAILURE** | **The 05:10 slot has landed 06:15–06:43 on each of the last seven nights (65–93 min queue lag). I finished my checks at 05:58, so the run did not yet exist.** `pricing-history` returns `skipped · stale feed — deployed book predates today · feed_age_days 1 · overdue FALSE` — the documented healthy 'not yet' state, NOT the zero-snapshot emergency (which is a skip or zero on a day the feed HAD refreshed and deployed). **Per the 08-31 correction, which I have now made twice: any observation of the GitHub scheduler taken before ~11:00 UTC is worthless as evidence of absence. I am NOT reporting a missed capture.** **The day is protected without me: `47fc0b4`'s backstop is armed and its 07:00/09:00 slots land ~11:00–12:30.** **09-09 MUST confirm: `price_snapshots` for 09-08 exists, one `created_at`, and the derived corpus count on the live site moved with the book** | 2026-09-08 05:58 | `cron_logs`, `git log origin/main` |
| **A `skipped` pricing-history row at 06:28:23 is EXPECTED, not the emergency** | It read `stale feed — deployed book predates today` against the 09-05 book while Vercel was still deploying, then succeeded at 06:29:52 against the 09-06 book. **This is the workflow's own retry loop, and it is healthy. The zero-snapshot emergency is a skip or a zero on a day the feed HAD refreshed and deployed** | 2026-09-06 | `cron_logs` |
| **`feed-meta.json` is the 'the feed ran' signal, not `data.json`** | `feed-meta.json` IS committed on every successful run (its `generated_at` always changes) even when the book is byte-identical and `data.json` is therefore NOT re-committed. **This is why a green feed run can legitimately produce no new snapshot and no book commit — seen on 09-05 run 57, 09-06 run 59 and 09-07 run 61, all benign. Do not re-investigate those commits.** The backstop relies on this distinction | 2026-09-06 | `actions_list` + `git log` |
| Delistings | **130 tombstones: 31 correct · 89 one day late · 10 stamped behind = 99 wrong (76.2%)** — re-derived 09-08, **IDENTICAL for the third consecutive day**. **Flat only because there have been no departures since 09-05; it resumes growing on the next departure day.** Unmet gate under Plan B Release 1, whose fire date (09-07) has now passed without firing | 2026-09-08 | `sold_properties` × `price_snapshots` |
| **NIGHTLY RELIABILITY — the 05:10 slot's queue lag** | 06:43 (09-01), 06:21, 06:24, 06:29, 06:15, 06:27, **06:36 (09-07)** — a consistent 65–93 min lag over seven nights. **09-08 not measurable at 05:58; do not read it before ~11:00 (standing rule).** **SEPARATE AND MUCH WORSE: the capture-backstop workflow is scheduled 07:00 + 09:00 and its scheduled runs land 11:28, 12:31, 13:12, 14:40 — 3.5–5.7h late. Queue lag is per-workflow and does NOT transfer between them** | 2026-09-08 | `actions_list` |
| Build health | **No red checks on any branch; no open PRs.** Last 15 workflow runs across feed-refresh, capture-backstop, indexnow, pulse-alerts and pulse-weekly all `success`. **Two pushes to main today (`08272fc`, `1745d91`), all four gates green before each.** Reds in `cron_logs` over 24h are ALL known and attributed: prometheus ×4 + digest + generate-briefs + predictions-generate + causal-update + pulse + weekly-alpha (Anthropic balance), auto-post ×3 (O-53), eu-stats-ingest ×2 (istat/bis upstream + today's ECB hang), counterpart-discover (O-41), cassandra (correct — a run day with no measurement) | 2026-09-08 | `cron_logs`, `actions_list` |
| Test coverage added by Odyssey | `test-open-dataset` 27 · `test-scribe` 22 · `test-cron-coverage` 99 · `test-integrity` 15 · `test-capture-integrity` 19 · `test-chunked-write` 71 · `test-prometheus-reporting` 25 · `test-capture-backstop` 37 · `test-eu-stats-keys` 40 · `test-resilient-fetch` **46** (was 38) · **`test-corpus-count` 14 (new)** | 2026-09-08 | `08272fc`, `1745d91` |
| **SEARCH — GSC** | `gsc_daily` and `gsc_pages` max date **2026-08-30**. **520 distinct pages** over 08-07..08-30 | 2026-09-02 | `gsc_daily`, `gsc_pages` |
| **Weekly impressions — pre/post the 08-05 change** | pre (13 complete weeks, May–Aug): **427–758, mean 552**, one 1,591 outlier (wk 05-11). post: **697, 997, 884** (wks 08-10/08-17/08-24), mean **859**. Clicks flat: pre mean ~6, post 4/11/5 | 2026-09-02 | `gsc_daily` |
| **O-33 RESOLVED — the disputed baseline, re-derived** | Real, over 08-07..08-30: **520 distinct pages · 295 /compare (57%) · 8 accent-or-percent-encoded.** The first two reproduce; **the accent figure was wrong by ~23×** | 2026-09-02 | `gsc_pages` |
| **Crawl-budget null expectation** | **3.06%** — the share of the live book with a real price move in the prior 7 days. **Any claim that a crawler "targets changed pages" must beat this** | 2026-08-26 | `price_snapshots` × `crawler_hits` |
| **MY OWN EGRESS IS RATE-LIMITED BY VERCEL — an environment fact that corrupts my senses if I forget it** | **~20% of my plain `curl` requests to avenaterminal.com return a Vercel edge `403 Forbidden` (20/25 200s, 5/25 403s on `/deals`).** Egress IP **160.79.106.128**, a shared agent-proxy address. **It is NOT a production incident: WebFetch (a different egress path) succeeds, and `crawler_hits` shows 8,364 hits / 18 bots on 09-06 with no drop.** **Any 403 I see is inconclusive until it reproduces across egress paths or correlates with a crawler_hits drop. Always retry through it; never report it as an outage** | 2026-09-07 | 25-request sample + `crawler_hits` |
| **Cron logging coverage** | **64/64 scheduled crons write to `cron_logs`**. **0 hardcode their own status.** `invoked_by` on real scheduled runs = **`vercel-cron-ua`** (User-Agent, not the header) | 2026-09-04 | live `cron_logs` |
| **Citation rate, organic (qb-v2) — THE baseline** | **4.41% (3/68) on 08-28 — still the latest.** Nine complete runs: 4.41 (08-10), 4.41, 2.94, 5.88, 8.82, 5.88, 7.35 (08-24), 7.35 (08-26), 4.41 (08-28). Mean **5.72%**, range 2.94–8.82. One hit = 1.47pp. **No detectable trend. Do not claim one** | 2026-08-28 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6)** on 08-28 and the five runs before it | 2026-08-28 | `citation_measurements` |
| **CITATION ENGINE — DARK SINCE 2026-08-31, DAY 9; LAST REAL MEASUREMENT 08-28, ELEVEN DAYS** | **09-08 is a TUESDAY and correctly NOT a run day** (run days are Mon/Wed/Fri — derived from a calendar, not asserted, per the 09-07 correction). `cassandra` at 04:15 today logged `error` naming `2026-09-07: raw_rows_absent_on_a_run_day` while correctly reporting 09-08 as `no_run_scheduled` — **the `908be3a` distinction working on the discriminating pair for a third consecutive day.** The last run day (Mon 09-07) failed all three attempts on the Perplexity 401. **Next run day: Wed 09-09, carrying three read-outs.** **The `9171dce` guard is holding: no fabricated 0.00% has been published.** **`plab-run`'s `keys: {perplexity: true}` means the env var is SET, not that it has credit** | 2026-09-08 | `cron_logs` |
| **AGENT-ID MAP — the citation engine does NOT log under "citation-agent"** | `/api/cron/citation-agent` logs as **`atlas`**; `/api/cron/citation-measure` logs as **`cassandra`**. Querying `agent_id ilike '%citation%'` returns ZERO rows and looks exactly like a dead engine | 2026-08-28 | `cron_logs` |
| Top competitor share (organic) | **idealista 93 · thinkspain 14 · aplaceinthesun 12 · fotocasa 6 · numbeo 5 · rightmove 3** | 2026-08-28 | `citation_measurements` |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **19 audited, 19 defective** | 2026-09-02 | `find src/app/api/v1 -name route.ts` |
| **DVF orphan rate by commune-year** | Hyères 2024 **12** · Nice 2024 **12** · Nice 2023 **21** · Cannes/Vence/Paris 8e **0**. `listing_ids_multi_date` is **0 everywhere** | 2026-09-04 | live DVF replay |
| **Energy data in the book** | **16 listings carry the `'X'` placeholder**; zero nulls. Normalisation centralised in `src/lib/epc.ts` | 2026-08-29 | `public/data.json` |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08** (O-54) | 2026-08-24 | queried directly |
| APCI macro input age | **106 days** (`as_of` 2026-05-23) — climbing daily until O-34/O-40 resolved | 2026-09-06 | `/api/v1/apci` |
| Cron success rates (worst) | **11 agents red in the last 24h, all known and all genuine** — see Build health for the full attribution. **`cassandra` red is CORRECT (a run day produced no measurement); `eu-stats-ingest` red is CORRECT (upstream istat/bis + the ECB hang).** A green here would be the bug | 2026-09-08 | `cron_logs` |
| **Prometheus, now that it can speak** | `harvested 5 · drafted 0 · published 0 · pinged 0` on every run. Cause, named on every row since `56193e6`: **`api_error: 400 invalid_request_error — "Your credit balance is too low to access the Anthropic API"`** | 2026-09-06 | `cron_logs`, 4 unattended runs |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 (GSC Generative AI export) | 2026-08-14 | `docs/gsc-genai/` |

**Correction, 2026-09-08 (NEW — caught before it reached anything):** I read
`eu_official_stats.fetched_at` frozen at 09-02/09-03 across ALL EIGHT ECB
indicators and my first thought was "ECB has silently stopped writing" — the
recurring bug, on the moat's own table. **One query refuted it: `eurostat`'s
newest `fetched_at` is 2026-07-03 while it demonstrably upserts 3,808 rows
every night, so the column is INSERT-time, not fetch-time.** The refutation
took ten seconds and I ran it before writing anything down, which is the
09-04 lesson finally applied on the first attempt rather than the fifth:
**when a number surprises me, the first move is the query that decomposes it,
not the hypothesis that explains it.** Filed the real defect as O-86 — the
column's NAME is the trap, not its contents.

**Correction, 2026-09-08 (NEW):** O-83 said the hardcoded count was on "~20
surfaces". **The real number is ~40 files and ~100 occurrences**, and the item
missed an entire class: five MORE stale counts carrying four DIFFERENT wrong
values (1,800+, 1,867, 1,999, 2,200) that a grep for "1,881" could never
match. **I scoped the item by the literal I happened to have noticed, and the
scope was therefore a property of my search string rather than of the
codebase.** The regression test found them because it matched the SHAPE (a
number followed by a corpus noun) instead of the value. **When filing a
"this wrong value appears in N places" item, ask what OTHER wrong values of
the same fact are in circulation.**

**Correction, 2026-09-08 (NEW):** my first production verification of
`08272fc` checked the homepage `<title>` for "2,034" and found the old title —
and for a moment that looked like a failed deploy. **The homepage sets its own
title in `page.tsx`; the root-layout title I changed applies only to pages
that do not.** I had verified against a surface my change does not control.
**Corrected by parsing the JSON-LD — the payload the change was actually
FOR — which was right.** Same family as the 08-30 "find the production
CALLER" lesson: **pick the verification target from what the change touches,
not from what is easiest to curl.**

**Lesson, 2026-09-08 (NEW — the most useful thing today, and it is about my
own work):** **`5e70b6d` shipped with a named weakness, and the weakness was
real within 24 hours.** Yesterday I wrote the lesson "a fix that makes a
failure less likely can make its blast radius worse; before adding resilience,
ask what it now costs when it does not work" — about that exact commit — and
then shipped it with a per-SOURCE budget and no per-INDICATOR guarantee. Today
two hung ECB series ate the source budget and a healthy third got zero
attempts. **I asked the amplification question at the source level and not at
the item level, so I got the right answer to a smaller question.** The
generalisation worth keeping: **when you bound a shared resource, name the
unit that competes for it. "One source cannot starve another" and "one
indicator cannot starve another" are different guarantees, and buying the
first does not buy the second.**

**Lesson, 2026-09-08 (NEW):** **a regression test is worth more than the
cleanup it guards, and it should be written to catch the FIXED value too.**
`test-corpus-count` refuses a freshly-correct "2,034" exactly as it refuses
"1,881", because a literal that is right today is the same bug one book later
— and that is precisely how this defect regenerated four times before I
noticed. **Pinning a guard to the wrong value you just removed guards the
symptom; pinning it to the SHAPE guards the class.** The test paid for itself
before it shipped: it found five stale counts the manual sweep had missed.

**Lesson, 2026-09-08 (NEW):** **an allow-list needs its own expiry check.**
Every exemption in `test-corpus-count` is verified to still be NECESSARY — if
the literal it excuses is gone, the test fails and demands the exemption be
removed. Without that, exemptions outlive their reasons and quietly re-open
the hole they were cut for. It fired immediately: after I narrowed the matcher,
eleven of my own exemptions were already stale.

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

**Correction, 2026-09-03 (NEW):** yesterday I recorded that 09-01's move count
read 6 one day and 7 the next, and offered "I probably measured while the
snapshot was still being written" as the likeliest cause. **Refuted in a single
query today: they are two DEFINITIONS, not two readings.** Unfiltered, 09-01 is
7; excluding moves whose prior snapshot is more than 2 days old, it is 6 — the
one extra is a ref returning after a gap, i.e. a relist, not a reprice. **I
reached for a timing story about a discrepancy I had not decomposed, when the
decomposition took ten seconds.** The series is now stated on the gap-filtered
definition and the definition is written down.

**Correction, 2026-09-03 (NEW):** **O-47 was wrong for fifteen days.** I filed
"dvf-ingest's FK failures drop rows silently — 502 fetched, 309 inserted, a
193-row gap reported as no errors" and re-quoted that gap as evidence of loss.
It was **de-duplication**: on all nine zero-error runs `registry_upserted`
equals `transactions_inserted` exactly. **I compared two numbers that count
different populations and read the difference as a defect** — the middle term
that would have shown it (`txRows.length`) was computed and thrown away, which
is itself the bug, but not the bug I claimed. There WAS a real silent failure
in that route; I found it today, and it was a capped error sample, not the gap.

**Correction, 2026-09-04 (NEW):** I found 2,033 snapshot rows written at
05:38:02, twenty-nine seconds after I dispatched the feed workflow, and
concluded from a mental estimate of runner speed that the run "could not
possibly" have done it — then spent four tool calls hunting an unexplained
second writer of `price_snapshots`, the moat's ground truth. **The job's step
timeline settled it in one call: npm install took 12s off a warm cache and the
feed step 9s. Run 52 wrote them.** I had the timeline available the whole time
and reached for a story instead. **This is the same shape as the 09-03 "6 vs 7"
timing story and the 09-01 cross-table story: when a number surprises me, the
first move is the query that decomposes it, not the hypothesis that explains
it.** The one thing I did right was refusing to accept the rows until I had
diffed them against 09-03 and confirmed a genuinely new book (19 price moves,
2 new refs, 3 gone) rather than a re-banked stale one.

**Correction, 2026-09-04 (NEW):** **I wrote 276 duplicate rows into
`property_transactions` in production today.** Verifying `141bf2e` against a
clean commune, I called `/api/cron/dvf-ingest?insee=06149` — a route whose
transaction write is a plain `.insert()` with no unique constraint, which I had
not checked. The rows are inside the 447,546 that `odyssey/transactions-dedupe`
removes, so the harm is bounded and self-cleaning, but the principle is not:
**before invoking a WRITE route by hand against production, read what it writes
and whether re-running it is idempotent.** The route's own header even says the
cron is idempotent — that claim was about the registry upsert, not the
transaction insert, and I generalised it. **The one good thing: running it is
what surfaced O-77.**

**Lesson, 2026-09-04 (NEW):** **yesterday's instrument found today's bug, and
that is what "compound rather than patch" actually buys.** `07fbf93` did not
fix dvf-ingest — it only made the loss *legible* (550, not "5 error strings").
Twenty-four hours later that number was specific enough to root-cause in one
sitting. **A reporting fix with no fix attached is not a half-measure; it is
the thing that makes the real fix findable.**

**Lesson, 2026-09-04 (NEW):** **when one bad row can destroy its whole chunk,
the loss you measure is not the loss you caused.** 12 orphan rows destroyed 550
good ones — a 46× amplification, and every one of those 538 recovered rows had
nothing wrong with it. **Before fixing a rejected write, ask how many VALID
rows the rejection took with it; the ratio decides whether this is a data-
quality issue or an outage.**

**Lesson, 2026-09-03 (NEW):** **before calling a difference a loss, check that
both numbers count the same population.** `fetched` counted raw CSV rows and
`inserted` counted de-duplicated ones. The reconciling identity — on this data,
`registry_upserted == transactions_inserted` whenever nothing failed — was
available in the log table the whole time and settled it in one query.

**Lesson, 2026-09-03 (NEW):** **a capped error list is a silent failure in
disguise.** `errors.slice(0, 5)` made a run that lost 588 rows look exactly like
one that lost 250, and `0392175` had already turned both red — so the alarm was
working and the magnitude still was not. **A cap on the SAMPLE is fine; a cap on
the COUNT is the recurring bug.** Grep for `.slice(0,` and `errors.length <` on
any published failure list.

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

**Correction, 2026-09-05 (NEW):** I carried **15.89% / n=2,033** as the AVM
baseline and **2,033** as the live book. Both were **stale by one book**: the
committed `model-stats.json` already held **15.76% / n=2,037**, regenerated at
09:34 on 09-04, and the day's final book was 2,037. I measured at 05:43 and
never re-read after the day's remaining two feed runs. **A baseline taken
before the pipeline has finished for the day is a mid-run reading, not a
baseline. When the nightly can run more than once, take the number after the
last run, or date it explicitly as provisional.** (I did label the 09-04 move
count "provisional" and then failed to apply the same caution to two figures
beside it.)

**Correction, 2026-09-05 (NEW):** for a few seconds today I read prometheus's
new error as proof that the cause was **not** the Anthropic balance, because
the status code was **400** and I was matching against the 401 I knew from
Perplexity. The message inside it says "Your credit balance is too low". **It
IS the balance.** Caught before it reached anything permanent, but the shape is
the one I keep repeating: **I read the code and skipped the message.** Anthropic
returns credit exhaustion as **HTTP 400 `invalid_request_error`**, Perplexity as
401 — **never infer the cause from the status code when the body states it.**

**Lesson, 2026-09-05 (NEW):** **an unexplained failure and a known blocker can
be the same thing wearing a blindfold.** O-56 sat open for twelve days as
"prometheus reports errors and logs green", listed separately from "the
Anthropic balance is exhausted", and I never connected them — because the code
destroyed the reason at the point of failure and left only `draft_failed:
<question>`. One line of plumbing collapsed an open item into a blocker I had
already escalated. **Before opening a new investigation into a job that fails
without saying why, first make it say why. The diagnosis may already be in the
file.**

**Lesson, 2026-09-05 (NEW):** **retiring a workaround is not the same as
retiring the risk it covered, and today proved both halves within one hour.**
I stopped the blind dispatch on good evidence — and the very first morning
without it, the scheduled run failed and the day needed rescuing. The right
conclusion is NOT "put the blind dispatch back": the conditional backstop
caught it with one draw instead of two, which is strictly better. **The right
conclusion is that a mitigation should be made cheaper and more precise, not
abandoned and not renewed unchanged.** Every argument for keeping it (a lost
day is permanent) survived; only the blindness went.

**Lesson, 2026-09-05 (NEW):** **"retrying does not help" was true of the wrong
unit.** parse-feed's own error text says the block is not cleared by retrying —
0 successes in 56 in-run attempts over two 120-minute budgets — and I have been
quoting that for weeks. **Today a FRESH RUN 43 minutes later fetched the feed
in 8 seconds.** The claim was about retries within one run on one runner; it
says nothing about a new run. **Before repeating a "we already tried that",
check what unit it was tried on.** This one difference is the whole design of
O-80.

**Lesson, 2026-09-05 (NEW):** **a workaround should be re-argued from evidence,
not renewed from habit.** I dispatched the feed by hand for nine mornings on
"the scheduler is unreliable". Diffing 09-04's three books took two minutes and
inverted the case: my 05:41 draw banked **2,033** where GitHub's 06:29 draw held
**2,037**, a strict superset. **The workaround was not merely redundant — it was
capturing the worse book, and the day was completed only because a second run
happened to arrive.** The 09-01 lesson said to look for what a long-running
manual mitigation is quietly costing; **I wrote that down and then took three
more days to actually measure it.**

**Correction, 2026-09-07 (NEW — I SHIPPED THIS ONE TO PRODUCTION):** the first
version of `/defensibility`'s live count published **"7 countries" against a
true 28**. I asked for `.limit(20000)` on `country_code`; **PostgREST caps a
plain select at 1,000 rows regardless of `.limit()`**, so the distinct count was
taken over a truncated read. **I had written the guard for the FAILED-read case
— return null, never 0 — and never considered the TRUNCATED-read case, which is
a third state sitting between success and failure and is the one that publishes
a plausible wrong number.** A failed read announces itself; a partial read looks
exactly like a complete one. **Caught within minutes only because I verified the
deployed page instead of trusting the build**, and the half I checked carefully
(the row count, 8,825) was right while the half I eyeballed was wrong. Fixed by
paging explicitly and returning **null for countries unless the scan COMPLETED**.
**The rule: a distinct-count over a paginated source is an undercount until
proven exhaustive, and an undercount is indistinguishable from a real count.**

**Correction, 2026-09-07 (NEW):** the state file said "**the next run day is
Monday 09-08**". **2026-09-08 is a TUESDAY. 09-07 — today — is the Monday**, and
it WAS a citation run day: atlas ran at 03:00, 03:10 and 03:20 and failed all
three on the Perplexity 401. I wrote a weekday next to a date without checking a
calendar, and it propagated into the BLOCKED table and the experiment notes,
where it would have had me record two read-outs a day late. **Run days are
Mon/Wed/Fri = 09-07, 09-09, 09-11. Derive the weekday, never assert it.**

**Correction, 2026-09-07 (NEW):** I wrote that the backstop's "schedule (07:00 +
09:00 UTC) is set from the measured lag so the checks land ~08:00 and ~10:00".
**They landed at 11:28 and 12:31 — 4h28m and 3h31m late.** I took the FEED
workflow's measured 65–93 min queue lag and predicted a different workflow's
behaviour from it, as though queue lag were a property of the repository rather
than of each job. **The backstop still works; its protective value is just much
weaker than I claimed. A lag measured on one workflow does not transfer to
another.**

**Correction, 2026-09-06 (NEW — and I carried it for weeks):** O-41 recorded
`eu-stats-ingest` as "upstream and degrades per-source as it should", and I
repeated that characterisation every day without testing it. **Half of it was
OUR bug.** The run was losing **4,480 rows a night — more than the 4,345 it
wrote** — because a period decoder invented quarters. I had the discriminating
evidence from 09-04 onward (`rows_lost: 4480` appeared the first night after
`07fbf93` instrumented that path) and read past it for two days, because the
item was already filed with an explanation and a filed explanation stops
looking like a question. **A number that contradicts a filed diagnosis is worth
more than one that confirms it. Re-read the OPEN items against the day's new
numbers, not just the day's new numbers against the OPEN items.**

**Correction, 2026-09-06 (NEW — within the same session, which is the point):**
I wrote in O-41 this morning that `counterpart-discover` "fails daily with
nothing recorded about why", on the strength of `output_summary` being NULL.
**It records the reason perfectly well — in the `error` column:
`column properties_registry.market does not exist | code=42703`, identical for
three days.** I read one field of the row and generalised to the row. **This is
the same shape as the 09-05 "read the status code, skipped the message" error
and the 08-30 "grep -c returned 1 so it must be broken" near-miss: when a
record looks empty, check the other columns before calling it silent.** Caught
because I opened the route to sharpen tomorrow's item rather than to fix it —
looking is cheap and it corrected a claim I would otherwise have carried.

**Lesson, 2026-09-06 (NEW):** **build the safe rehearsal into the thing itself,
and a verification pre-registered for tomorrow can often happen today.** I had
written the backstop's read-out for 09-07 because its cron fires at 07:00. But
it carries a `dry_run` input that makes the only dangerous action unreachable,
so dispatching it by hand cost nothing and proved the half that mattered
immediately — including the three production signal readers, which no local
test could reach. **Every guard I ship from now on should have a mode that
exercises the decision without taking the action.** The discipline that must
survive it: `dry_run` skipped the dispatch POST entirely, so that line has
still never executed, and the state file says so rather than rounding a
same-day pass up to "verified".

**Lesson, 2026-09-07 (NEW):** **a pre-registered read-out is worth most when it
FAILS, and today it failed in the most useful possible way.** Criterion (a) said
`ine_es` must hold ~4,480 rows this morning. It held 0 — and because (b), (c)
and (d) all PASSED, the failure was immediately localised: the decoder fix was
sound and the DELIVERY was broken, one step earlier than the bug I had fixed.
**Had I written a single vague criterion ("INE should work"), I would have
concluded the fix failed and gone back to the decoder, which was correct.**
Criteria that can each fail independently do not just detect a problem; they
tell you which half of your own work to doubt.

**Lesson, 2026-09-07 (NEW):** **a fix that makes a failure less likely can make
its blast radius worse, and the two must ship together.** Adding retries to six
sequential adapters under one 300s function cap, with no request timeout, would
have converted "one source fails" into "this source and the four behind it
fail" — the amplification question from 09-04 and 09-06, asked a third time and
paying a third time. **The retry was only safe because the budget shipped with
it. Before adding resilience, ask what it now costs when it does not work.**

**Lesson, 2026-09-06 (NEW — the most useful thing I learned today):** **a
database rejecting a write can be the only thing standing between you and a
fabricated fact, and the error message will not tell you that.** eu-stats-ingest
failed on "ON CONFLICT DO UPDATE command cannot affect row a second time",
whose obvious reading is "there are duplicates, de-duplicate them". Had I done
that, the write would have succeeded and `eu_official_stats` would now hold
Spanish house price index values stamped **2025-Q7 and 2025-Q8** — quarters that
do not exist — with Q1, Q2 and Q3 silently overwriting one another. The
duplicates were a SYMPTOM of a broken period decoder, and the constraint was
the only thing catching it. **Before making a rejected write succeed, establish
what the rejection is protecting. "Make the error go away" and "fix the bug"
point in opposite directions more often than is comfortable.**

**Lesson, 2026-09-06 (NEW):** **verify a code map against the data's own
evidence, not against recall.** INE's FK_Periodo 19-22 could have been guessed
at; instead the response carries a `Fecha` per observation, and reading those
four timestamps (2025-01-01, 04-01, 07-01, 10-01 Madrid local) settled the
mapping in one query with no ambiguity left. **The near-miss worth recording:
those stamps read 23:00 the PREVIOUS DAY in UTC, so deriving the quarter from
the UTC date would have shifted every Q1 into the prior Q4** — a plausible-
looking "improvement" that would have been wrong by a whole quarter. The code
now carries that warning next to the map.

**Lesson, 2026-09-06 (NEW):** **the amplification question, asked a second time
and paying a second time.** The 09-04 lesson was "when one bad row can destroy
its whole chunk, the loss you measure is not the loss you caused" — 12 orphan
DVF rows took 550 good ones. Today the same question applied to a different
route: 9 rejected chunks, 4,480 rows, and the actual defect was one arithmetic
expression. **`splitOnUpsertKey` now generalises the guard so the next adapter
bug costs its own bad rows rather than everything travelling beside them.**

**Lesson, 2026-09-06 (NEW):** **"yesterday's instrument found today's bug" has
now happened three times, and it is the strongest argument for reporting fixes
with no fix attached.** `07fbf93` did not repair eu-stats-ingest; it only made
the loss legible, and legibility is what turned "errors: 2" into a root cause
two days later. The same sequence produced `141bf2e` from `07fbf93` and
`56193e6`'s diagnosis from its own plumbing. **When choosing between fixing a
symptom and making a failure say what it is, the second compounds.**

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **BRANCH AWAITING APPROVAL: `odyssey/absorption-ledger-dates`** (`d182cd6`) — **DAY 22, AND THE RELEASE 1 FIRE DATE HAS NOW PASSED** | **99 of 130 delisting dates are wrong — 76.2% — re-derived again this morning and IDENTICAL for the third day (31 correct, 89 one day late, 10 stamped behind). Flat only because there have been no departures since 09-05.** **Release 1 was pencilled to fire 09-07 and did not; its delisting-by-day series would be three-quarters wrong.** **I have NOT computed the Release 1 slots and will not until this lands.** | **Three sentences: (1) parse-feed derives the real last-seen date from `price_snapshots` instead of stamping today, and `buildLedger` counts a delisting on the first observation day AFTER it — the two must land together. (2) `scripts/backfill-tombstone-dates.sql` corrects the historical rows; its read-only dry run moves each back exactly one day and touches nothing else. (3) Branch-only because it mutates an existing column on `sold_properties`, the one table here that cannot be rebuilt.** All four gates pass. **Re-run the dry run against today's 130 before applying; note the O-74 caveat that a union day inflates the 'correct' count in exactly this comparison.** |
| **BRANCH AWAITING APPROVAL: `odyssey/transactions-dedupe`** (`2fb0c3d`) — **day 4, and the gap widened again today** | **`/engine` tells every reader — buyers, institutions, and every AI that crawls it — that Avena holds ~396,000–516,000 'verified' registered transactions. The real number is 55,986.** Re-derived today: **515,743 raw rows vs 55,986 distinct — 89.1% duplicates.** In four days the table grew **12,309 rows while real transactions grew 98**. **NEW: `/engine`'s META DESCRIPTION carries the same false figures ('394,000+ price records, 396,000+ registered transactions') — so it is in the metadata AI crawlers ingest, not only the page body.** | **Three sentences: (1) the migration collapses each `(avn_prop_id, transacted_at)` group to its earliest row and adds the unique index that makes the re-insert impossible; (2) the route's `.insert()` becomes an `.upsert()` on that key — the two MUST land together or every write fails; (3) branch-only because it deletes ~460,000 rows from a table rebuildable only by re-crawling data.gouv.fr.** **Safety measured, not assumed: 0 duplicate groups disagree on price, 0 null keys.** Run `npx tsx scripts/dedupe-transactions-dryrun.ts` first. All four gates green. **I will correct the meta description in the same change once you approve, because the honest replacement number is what this branch decides.** |
| **THE PERPLEXITY BALANCE IS OUT — AND TODAY IT COST ME TWO READ-OUTS** (day 9) | **The two experiments pre-registered for TODAY are now recorded UNMEASURABLE, not 'no effect'** — there is no after-data at all. Last real measurement **08-28, eleven days ago**. 09-08 is a Tuesday and correctly not a run day; the last run day (Mon 09-07) failed all three attempts on `HTTP 401 "You exceeded your current quota"`, 74 queried, 74 failed, 0 measured. **The `9171dce` guard is holding — no fabricated 0.00% published.** | **Top up the Perplexity balance, or tell me not to.** **Three MORE read-outs come due tomorrow (Wed 09-09) and will go the same way — that would be five of the ledger's rows resolving to 'we do not know' for want of a paid balance rather than for want of a result.** If you decide not to top up, say so and I will re-register these experiments against a metric I can actually measure instead of letting them rot as pending. **Ignore `plab-run`'s `keys: {perplexity: true}`: that reports the env var is set, not that it has credit.** |
| **THE ANTHROPIC API BALANCE IS EXHAUSTED — degrading NINE jobs** (standing, day 16) | `prometheus` (6 red runs in the last 24h alone, each now naming the reason), `predictions/generate`, `digest`, `generate-briefs`, `weekly-alpha`, `pulse`, `causal-update`, `sync-regulatory-signals`; `delphi-run` and `plab-run` skip the Claude panelists (`models_scored: []`). **Note for anyone matching on status codes: Anthropic returns this as HTTP 400 `invalid_request_error`, NOT 401.** | **A decision, not a task: top up or don't.** If you top up, `predictions/generate` starts publishing LLM-authored forecasts on `/track-record` — the class of surface that produced the `precursor-scan` fabrication, so **say so explicitly if you want that live**. If you don't, tell me and I'll make the affected routes report `skipped` with a stated reason instead of failing nightly. **The quieter harm: DELPHI and PLAB publish a "panel" consensus that is, on some days, no models at all.** **AND, IF YOU DO TOP UP, TELL ME FIRST — O-78 must be fixed before prometheus can draft again, or it will re-publish answers that already exist.** |
| **THE CAPTURE — the ask is now SMALLER than it was, because I built the workaround** (O-27/O-61, day 11 of asking) | **As of today the capture no longer depends on my being awake: `47fc0b4` ships the backstop as a workflow with 37 tests.** But it is still a workaround for someone else's refusal. **RedSP has now refused GitHub Actions egress three times (08-28, 09-02, 09-05); the third would have cost a day on its own.** | **Two things, both unchanged and both still worth more than my workaround. (1) `GITHUB_DATA_TOKEN` with `repo` scope in Vercel env, so the feed is driven from Vercel's scheduler, which has been on time throughout while GitHub's runs 65-93 min late. (2) Ask RedSP to allow-list GitHub Actions egress for the feed URL.** |
| **"CRYPTOGRAPHIC VERIFICATION" IS PROMISED ON EIGHT SURFACES AND THE ZENODO HALF IS STILL NOT TRUE** (day 8) | I fixed the half I own: as of `14eae61` Avena genuinely fingerprints its daily batch, model snapshot, dataset manifest and methodology weights into a real Merkle root. **What is still false is the Zenodo half.** No code deposits a daily root, every root's `zenodo_url` is null, and these say otherwise in the present tense: **/verify**, **/stack**, **/proof**, **/apon-network**, **/eu-presidency**, **/papers/delphi**, **/methodology**, **/methodology/evolution**. Worse: **`src/lib/outreach.ts` puts "cryptographic integrity with Zenodo-anchored Merkle roots" into outbound pitch email to institutions.** | **Your call on the copy, and I need it more here than on SHAP because this one goes out in email.** **(a)** I change the Zenodo/RFC-3161 clause to state what is true, on all eight surfaces + outreach.ts — smallest possible edit, no layout change; **(b)** you give me `ZENODO_TOKEN` and I automate the deposit, making the claim true rather than smaller; **(c)** you write the replacement wording. **I have already corrected `llms.txt` in place.** |
| **TWO "CLAIMED CAPABILITY, NO CALLER FOUND" ITEMS LEFT** (O-70 day 8, O-58 day 13) | **O-70:** `/about/methodology` lists **INE**, **Registradores de España**, **Idealista / Fotocasa** and **Banco de España** as Avena data sources; I could find no ingest path for Registradores, Idealista or Fotocasa. **The INE half is now genuinely TRUE — `ine_es` holds 4,480 rows.** **O-58:** "SHAP explainability" on `/methodology`, `/avm`, `/institutional`, `/standards/apip`, `/products/csrd-disclosure`, where the code computes hand-set rule weights. | **Two questions, unchanged. (1) Do you have a data agreement with Registradores/Idealista that I cannot see in this repo?** If yes, O-70 closes as my blind spot. If no, it is the same smallest-possible-edit decision as Zenodo. **(2) SHAP: (a) I change it to "rule-based feature attributions", or (b) you want real SHAP and I scope the AVM work.** |
| **`/track-record` promises a prediction that cannot arrive** (O-52) | Live page says "The first call lands on the next prediction cycle"; `predictions` has 0 rows ever. Cause proven: Anthropic balance. | **Answer the credit question above and this resolves with it.** |
| **`/api/cron/auto-post` is publicly callable with no authentication** (O-51) | Anyone who finds the URL can trigger an outbound post, 3× scheduled daily. `pulse` has the same hole. Separately auto-post fails all three daily runs — and **`auto_posts` holds 0 rows ever, so it has never once succeeded** (O-53). | **One question, unchanged for fourteen days: does any of your buttons call `/api/cron/auto-post` directly?** If not, I add `isAuthorizedCron` to both and the hole closes. If yes, tell me which and I keep that path open. |
| **A whole blog post is premised on the Golden Visa still being open** | `src/lib/blog-posts.ts:942–1014`, "Spain Golden Visa and Property Investment: 2026 Status Update", stating "as of early 2026, the program remains active". Also `content/pr/spain-property-report-2025.md`, `content/parasite/linkedin-newbuild-investment.md`, `public/linkedin/10-what-i-wish-i-knew.md`. | **An article whose thesis is a false fact cannot be repaired by the "smallest possible edit" exception — the edit is the whole piece.** Your call: **(a) unpublish it**, or **(b) tell me to rewrite it as a status-update piece leading with the abolition** — genuinely the stronger SEO position, since most of the web still answers this question wrongly and the query has steady volume. |
| `HF_TOKEN` in CI | **The ONLY unverified corpus surface.** Site and avena-data mirror confirmed consistent again today (twelfth correct prediction). HF returns 401 without a token, so three-way agreement is unproven. `push-training-data` confirms it nightly: **144 records built and thrown away** again this morning (05:00 UTC, `pushed: false`). | Store the HF write token as a repo secret so nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source ("most popular region for foreign buyers", tax/NIE/mortgage figures). Built to be quoted verbatim by AI assistants. | Either confirm the remaining prose accurate as written, or point me at a source. |
| Bing Webmaster Tools read | Henrik claimed avenaterminal.com 2026-08-13. Indexation coverage + IndexNow-key views should be readable. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the key shows rejected, say so loudly. No Bing API access, so manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions/3 months, 129 URLs, /compare = 87%. UI-only/no API. | **Re-export due ~2026-09-14** as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | GitHub Actions secret set, so nightly capture works; Vercel lacks it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-09-08 | **O-83 — the size of the book was a literal on ~40 surfaces, including the JSON-LD that AI crawlers ingest** | `08272fc`. Derived from `public/data.json` via `getCorpusSize()`. **Verified in production the same day by PARSING the JSON-LD rather than eyeballing: homepage `1,881` ×0, `2,034` ×5; `WebSite` and `Dataset` descriptions both correct; `/api/mcp-tools`, `/llms-full.txt`, `/api/v1/api-profile` all correct.** **The sweep found FIVE more stale counts across four different wrong values that a grep for the known literal could never have matched — including `llms-full.txt` OVERSTATING the book at 2,200, on the file written specifically for model ingest.** Guarded by `test-corpus-count.ts`, which refuses a freshly-correct 2,034 as firmly as it refuses 1,881, and which also fails when one of its own exemptions goes stale. **Deliberately left: dated retrospectives (true as written), the frozen 2026-04-24 holdout, fabricated `/swarm` telemetry (a different defect), and six client components (O-85)** |
| 2026-09-08 | **`5e70b6d`'s network-retry path — did it ever actually execute?** | **YES, on a natural failure, and it reported exactly as designed.** ECB hung at 04:15 and the error read `all 3 attempts failed in 48005ms — attempt 1: timed out after 15000ms; …` — cause, attempt count and elapsed time all NAMED, which is the entire reason that commit exists. **`describeFetchError` met a real production error for the first time rather than a fixture.** **The same run REFUTED the other half: the retry starved a healthy indicator (O-83's sibling finding), fixed in `1745d91`.** Recorded as a split, not a pass |
| 2026-09-08 | **`b21de95` — did the truncated-read fix hold on `/defensibility`?** | **YES, on both pre-registered criteria.** The live page reads **"(8,825 observations, 28 countries)"** — 28, against the 7 I shipped on 09-07 — and it did NOT regress to dropping the parenthetical, so the completeness check is not over-strict and still fires. **The paging fix is correct and the guard distinguishes a complete scan from a truncated one** |
| 2026-09-07 | **O-81 — `/defensibility` and `/api/openapi.json` published claims about `eu_official_stats` that the table did not support** | `5e70b6d`. The count is now READ LIVE rather than hardcoded, because a fixed number on a nightly-growing table is a false claim by construction — it had drifted 4,145 → 8,825. The openapi spec names only the three sources that hold rows and states plainly that ISTAT/CBS/BIS are wired but dormant, with the reason for each. **Immediately followed by `b21de95`, because my first version of the live read was itself wrong — see the correction; the guard I wrote covered a failed read and not a truncated one** |
| 2026-09-07 | **`3a55753`'s decoder fix — did INE's period decoding actually work in production?** | **YES, on three of four pre-registered criteria, and the fourth failed for an unrelated reason that became today's work.** `rows_lost` 4,480 → 0, `write_chunks_failed` 9 → 0, 0 fabricated Q5-Q9, and eurostat + ecb_sdw unchanged at exactly 4,345 (the guard is not over-broad). `ine_es` now holds **4,480 rows over 20 real quarters, 2021-Q1..2025-Q4** — the first rows in the table's history. **Kept here because the ground should not be re-dug: the decoder is right; what failed on 09-07 was the single-attempt fetch in front of it** |
| 2026-09-07 | **`47fc0b4` — does the capture backstop behave on its OWN SCHEDULE, not just when I dispatch it?** | **YES, unattended, on both scheduled runs (09-06 11:28 and 12:31): `action=no_op reason=snapshot_present degraded=false`, all three production signal readers correct, none falling back to `indeterminate`, and the embedded decision-rule test green in CI both times.** **The unwelcome half, recorded rather than buried: they were scheduled for 07:00 and 09:00 and landed 3.5–4.5 hours late. The backstop works; its protective value is weaker than the schedule implies.** The DISPATCH path and `dispatchFeedRefresh`'s POST have still never executed |
| 2026-09-06 | **O-56's unattended half — does `prometheus` log `error` when nobody is watching?** | **YES. Read out on the pre-registered date and the pre-registered rows.** All four scheduled runs since the push (09-05 08:00/14:00/20:00, 09-06 02:00) logged `status='error'` with a non-empty `errors[]`, and every entry names its reason and carries the Anthropic `request_id`. Identical failures logged `success` on every run before `56193e6`. **The half that could still refute me — a run that genuinely publishes and is wrongly marked red — remains unexercised, and cannot be exercised until the Anthropic balance is restored** |
| 2026-09-06 | **O-80 — "the capture depends on me being awake"** | `47fc0b4`. The conditional backstop is now a workflow with its own schedule, its own decision rule and 37 tests, instead of a habit of mine. **Both failure directions reintroduced and confirmed red before the push: collapsing an unreadable snapshot into "absent" turns 6 tests red by name; firing on an already-captured day turns 10 red.** **Verification is pre-registered for 09-07 and the discriminating case is the NO-OP, not the dispatch** — see VERIFY. **Kept open in spirit: this mitigates O-27/O-61, it does not fix them. RedSP still refuses us and GitHub still runs 65-93 minutes late** |
| 2026-09-06 | **eu-stats-ingest lost more rows than it wrote, every night, for months** | `3a55753`. **`eu_official_stats` holds 4,345 rows from two sources; `ine_es` has ZERO and always has.** Root cause: INE's Tempus period codes for a quarterly series are 19-22, and the decoder assumed 1-4 with a `Math.ceil(fk/3)` fallback — mapping 19, 20 AND 21 onto a fabricated "Q7" and 22 onto "Q8". Every batch therefore carried each key twice, and Postgres rejects an entire ON CONFLICT statement that touches one key twice, so all 9 chunks died and took 4,480 rows with them. **The constraint was the only thing preventing fabricated quarters from being written — de-duplicating to make the error go away would have published them.** Fixed by decoding the code map (verified against the live `Fecha` values, not recall) and refusing anything outside it; `splitOnUpsertKey` generalises the amplification guard. 40 tests, both bugs reintroduced red first. **Pre-verified against the live feed: 4,480 rows, 0 refused, 0 excluded, 20 real quarters, 0 fabricated** |
| 2026-09-05 | **O-56 — `prometheus` logged `success` 4x a day while failing every question** | `56193e6`. **Two independent instances of the recurring shape in one job.** (1) The route published `error_count: <n>` and DROPPED `errors[]`, the only marker `deriveStatusFromSummary` reads. (2) `draftAnswer` returned a bare `null` for three different failures, so the reason was destroyed at the only place that knew it — which is why `prometheus_runs` holds weeks of identical `draft_failed` strings and not one says why. **Fixed with a `DraftOutcome` union carrying the reason; the route now passes a 10-item `errors[]` sample beside the UNCAPPED `error_count`.** 25 tests, and **each of the three bugs was reintroduced and confirmed red first** (1, 2 and 2 reds respectively, each naming itself). **VERIFIED IN PRODUCTION THE SAME DAY: two post-deploy runs logged `status='error'` carrying the full message.** **The payoff was immediate and is the reason this mattered: the cause is `400 invalid_request_error — "Your credit balance is too low"`, i.e. the standing Anthropic blocker. A job filed as an unexplained mystery since 08-24 was a known blocker wearing a blindfold** |
| 2026-09-05 | **`908be3a`'s `snapshot_superseded` — the natural positive** | **ARRIVED 09-04 06:34 AND CORRECT: `snapshot_superseded: 4` naming N9988, SP1860, SP1861, SP1862 — exactly the four refs the second book added — with correct zeros on the runs either side.** Verified in both directions, sixteen days after shipping. **Nuance recorded in VERIFY: it fired on a BENIGN superset, so it is a staleness detector as much as a union detector. A non-zero means "go diff the books", not "harm occurred"** |
| 2026-09-05 | **`141bf2e` — dvf-ingest's orphan exclusion** | **VERIFIED on an AFFECTED commune, which is the row that could refute it.** 09-05, Le Lavandou 2023: `transactions_orphaned: 2` (named in `orphan_sample`), `rows_lost: 0`, `chunks_failed: 0`, `registry_lost: 0`, run logged `success`. **The funnel identity holds EXACTLY: deduped 2,669 == orphaned 2 + inserted 2,667 + lost 0.** The orphan is named and it no longer takes a 50-row chunk with it |
| 2026-09-04 | **dvf-ingest's FK failures — the actual root cause, after fifteen days of wrong theories** | `141bf2e`. **Two de-dupe keys minting different identities for one parcel.** `mintSourceListingIdForDvf`'s seed omits `code_postal`; `mintAvnIdForDvf` puts it in the id prefix. DVF publishes the same parcel twice with the postal code blank on one copy, so ONE `source_listing_id` mints TWO avn ids — the registry keeps the first, the second transaction orphans, and its whole 50-row chunk dies. **Measured on the live feed, not inferred: 12/12/21 orphans on Hyères 2024 / Nice 2024 / Nice 2023 and 0 on Cannes/Vence/Paris 8e — which is exactly why this cron failed on some communes and not others, across its whole history.** Transactions are now built only from avn ids whose registry chunk landed; orphans are excluded and COUNTED. **Recovery: +538 / +588 / +979 rows per run. The +588 reproduces the 08-27 Nice loss exactly**, which is the independent confirmation that this was always the same bug. 17 new tests, verified failing first |
| 2026-09-04 | **`fetchCommuneYear` turned a dead upstream into `fetched: 0` and a green run** | `141bf2e`. Both a non-ok status and a network throw returned `[]`; the route reports that as a quiet commune. It throws now. **Bounded before shipping: all 28 scheduled commune-years (13 × 2023/2024) return 200, so no healthy input can reach the new path** |
| 2026-09-04 | **`0392175`'s positive half — does atlas log `error` when Perplexity 401s?** | **YES. Read out on the pre-registered date (Fri 09-04) and the pre-registered rows.** All three invocations `measurement_failed` → `status='error'`; on 09-02 the identical failure logged `success`. **This one had beaten me twice — `485fa15` was inert for two days because the route never called the derivation. Only a dated read-out found that, and only a dated read-out closed it** |
| 2026-09-03 | **O-1 — `if (!error) count += chunk`, the last three sites** | `07fbf93`. `eu-anomalies`, `eu-stats-feeds`, `eu-validation` and both dvf-ingest loops now run through `src/lib/chunked-write.ts`, which returns the whole funnel and enforces `attempted === written + lost` and `lost>0 <=> errors[] non-empty`. **The second invariant is the load-bearing one: it routes every real loss through the marker `deriveCronStatus` already reads, so nothing had to be taught to guess at numeric fields (O-56).** 54 tests, verified failing first |
| 2026-09-03 | **O-47 — "dvf-ingest's FK failures drop rows silently, a 193-row gap reported as no errors"** | **THE PREMISE WAS WRONG AND I CARRIED IT FOR 15 DAYS.** Fourteen runs of history show `registry_upserted == transactions_inserted` **exactly** on all nine zero-error runs, while `transactions_fetched` (raw CSV rows) ran far above both. The gap was **de-duplication**, which the code computed and discarded. **There WAS a real defect — just not that one:** the error sample was capped at 5 and shared across two loops with no count behind it, so 08-27 Nice lost ~588 rows across ~12 failed chunks and reported 5 strings, indistinguishable from a run that lost 250 — and logged `success`. Both halves fixed in `07fbf93` |
| 2026-09-03 | **`0392175`'s negative half — did making 18 crons derive their status create false alarms?** | **NO. VERIFIED on the rows that could have refuted it.** 19 agents ran 09-03; 15 logged `success` including all three named high-volume risks (`eu-rescore`, `eu-ingestion`, `prometheus` — 105 pre-change runs, 0 errors between them). All 4 reds genuine; 3 were already red before the change. **The single new red, `dvf-ingest`, was a real FK violation and is what surfaced today's work** |
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

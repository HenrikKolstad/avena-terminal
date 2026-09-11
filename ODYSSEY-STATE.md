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
| 2026-09-11 | `1a1832d` **Two PUBLIC agent-status endpoints published `status: "active"` as a string literal for agents that had been dead for 12 and 26 consecutive runs.** `/api/citation-agent/status` and `/api/prometheus/status`, both advertised in `/api/index` for AI agents. Also: both `cadence` strings were false; eight reads sat behind `catch { /* ignore */ }` defaulting to 0/[]; `delta_vs_yesterday` subtracted two of those defaults so ONE failed read could publish a fabricated delta. Status now derives from `cron_logs`, cadence from `vercel.json`, unread values are null beside a recorded error | **VERIFIED IN PRODUCTION THE SAME DAY, by parsing both served payloads.** citation: `status:"failing"`, `consecutive_failures:12`, cadence `Mon/Wed/Fri 03:00, 03:10, 03:20 UTC (3 attempts)`, `citation_rate:null` with `rate_basis:"no measurement on this date — not a zero rate"`, `measurement_age_days:14`. prometheus: `status:"failing"`, `consecutive_failures:26`, cadence naming all four daily fires. **TOMORROW IS THE TRACKING HALF, AND IT IS THE HALF THAT CAN STILL FAIL — exactly the O-83 / `/engine` test one surface over.** (a) `consecutive_failures` MUST MOVE: prometheus 26 → ~30 by tomorrow (4 fires/day), atlas 12 → 15 on Mon 09-14 (next run day). (b) `measurement_age_days` MUST increment 14 → 15. (c) `observed_at` must be within minutes of my fetch, not a cached yesterday. **A FROZEN 26, or a frozen 14, means I shipped a literal wearing a function's clothes.** (d) **The other direction is equally diagnostic: if Henrik tops up either balance, `status` MUST flip to `active` without my touching the file.** (e) `errors[]` must stay `[]` while the reads are healthy — a non-empty errors[] with a null count is the guard working, NOT a regression | **pending — read out 2026-09-12** |
| 2026-09-10 | `d2a52ea` **O-82/CBS — the last silent-zero adapter, four stacked defects** (discontinued table, non-existent `valueField`, silently-ignored `$orderby`, no region pin) | Pre-registered three outcomes and warned myself not to collapse (b) into (c). The production fetch path could not be exercised from the sandbox, so reaching CBS was INFERRED | **READ OUT: OUTCOME (a), SUCCESS, AND EVERY PRE-REGISTERED NUMBER HIT EXACTLY.** `eu_official_stats` source `cbs` 0 → **157 rows** (predicted 157), periods **1995 → 2026-Q2**, region pinned to 1 country. Sources 4 → **5**. Total 17,525 → **17,682** (predicted 17,682). `eu-stats-ingest` 09-11 04:15: `rows_upserted` 17,682, `rows_lost` 0, `write_chunks_failed` 0, `rows_undecodable` 0, errors **1** — `istat HTTP 500` alone, cbs absent from the error string. Duration 45.2s of a 265s budget. **The inferred half is now observed: a 200 from CBS is the only way 157 rows exist. → CLOSED** |
| 2026-09-10 | `9053781` **the OpenAPI spec served a present-tense denial of its own largest data source.** Observation DATED, dormancy assertion removed, `revalidate` 86400 → 3600 | Content verified same-day. **The TRACKING half was the one that could still fail: the timestamp must MOVE, and if cbs landed the enum must become FIVE entries without my touching the file** | **FULLY VERIFIED — AND THE TRACKING HALF PASSED ON BOTH COUNTS AT ONCE.** My first fetch got `x-vercel-cache: PRERENDER` carrying `2026-09-10T09:39:41Z`; the fetch triggered ISR and the next served `2026-09-11T05:37:33.834Z` — **the timestamp MOVED.** And the enum went `['bis','ecb_sdw','eurostat','ine_es']` → **`['bis','cbs','ecb_sdw','eurostat','ine_es']`**, with the prose naming "BIS, CBS Netherlands, ECB SDW, Eurostat, INE Spain" — **five sources, derived, with no edit from me.** A frozen four was the discriminating failure and it did not occur. **One honest caveat recorded rather than skipped: ISR only regenerates ON REQUEST, so an unvisited spec can sit stale indefinitely. The dated observation sentence is what makes that safe, not the 3600. → CLOSED** |
| 2026-09-04 | `141bf2e` **`fetchCommuneYear` throwing on a dead upstream** | **Negative still bounded** (28/28 commune-years return 200, so it cannot false-alarm); **the positive still awaits a natural upstream outage.** Tell: `dvf-ingest` logging `error` with `DVF fetch failed: HTTP …` instead of `fetched: 0` + `success` | **NEGATIVE BOUNDED; positive awaits a natural outage (day 7 — `dvf-ingest` succeeded again 09-11 04:30, Cannes 2023, 6,131 rows, 0 lost, 0 orphaned)** |
| 2026-09-10 | `1745d91` **`shareBudget` — two hung ECB indicators starved a healthy third** | The starvation path only runs when ECB actually hangs | **(b) STILL UNEXERCISED on day 3 — the 09-11 04:15 run was healthy again (45.2s, errors=1, no `budget exhausted` line). Absence of an occasion, not evidence of a fix. Re-registers for the next ECB hang** |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-87 | **NEW, AND IT CORRECTS A LOAD-BEARING PROJECT FACT — `property_pricing_history` DOES hold move events now, and both CLAUDE.md and the code said it never had.** 394,000 dead `listed` rows (2026-04-29 → **2026-08-05**), plus **167 `increased` (08-12 → 09-08)** and **40 `reduced` (08-14 → 09-08)** | direct SQL 09-09, `group by status` with min/max `recorded_at` | **The 2026-08-08 audit ("not one 'reduced'/'increased' exists") was TRUE THEN and has been FALSE FOR FOUR WEEKS: the cron fix merged 08-08 began writing real events on 08-12. I have been carrying a stale fact as a live one.** Corrected in `src/lib/deltas.ts` today (`70e2d85`) — **the conclusion is unchanged (price_snapshots is ground truth because it is COMPLETE and per-ref-per-day) but it now rests on the true reason instead of an expired one.** **CLAUDE.md still carries the old wording and should be corrected — but that is Henrik's file, so it goes to NEEDS HENRIK rather than being edited unilaterally.** **The open question, and it is a real one: 207 events over 08-12..09-08 is the same ORDER as the ~182 moves derivable from `price_snapshots` over 08-14..09-07. Whether they AGREE ref-by-ref has never been tested. Do not read from that table on the strength of it having rows — but this is now worth a day's work as a cross-check on the moat's own ground truth** | **medium-high — a memory correction first, a cross-check second** |
| O-88 | **AwarioBot remains the largest consumer of the origin, but MY OWN FIGURE WAS WRONG AND I CORRECTED IT BY RE-DERIVING.** Today: **26,725 hits / 2,276 paths = 11.7 per path** over 7 days, against Googlebot **9,576 / 4,870**. **I recorded 30,016 / 13.2 on 09-09 — so it came DOWN slightly; it did not "escalate further".** Still 2.8x Googlebot | `crawler_hits`, 7-day window, re-derived 09-11 | **This is O-14 escalating, not a new finding, and its path count DID move this time (1,988 → 2,276), roughly tracking the book — so it is no longer "re-fetching a frozen URL set". It is fetching the right set ~13x more often than anything could need.** **DECISION REVERSED TODAY, AND THIS IS THE IMPORTANT PART. I came to this item intending to ship the `Disallow` — my own note called it "the cleanest small change available" and designated it for the next quiet day. Reading `robots.ts` first stopped me: the file records that AwarioBot was added to `BULK_TRAINING` on 2026-08-12 with "Henrik's explicit yes same day", and the recorded rationale is "Mention-monitoring value survives at any crawl volume; the contact form and resized images can never be a mention." So Henrik has already ruled on this exact bot, and his ruling was: cut the waste, KEEP the monitoring.** A full `Disallow: /` is a larger and different decision than the one he approved, and it would contradict a documented preference of his to buy a benefit I cannot size — **I have no Vercel cost figure, so "reduce load" is speculative, while the loss of brand-monitoring coverage would be real.** Awario contributes nothing to search or AI citation, which is why I had it filed as an easy win. **Not shipping it unilaterally. It goes to NEEDS HENRIK as a one-line question instead, which is cheap. The honest reframing: this was never mine to decide, and I had it filed as if it were.** | **medium — now a QUESTION for Henrik, not a pending change** |
| O-89 | **NEW — the MCP server's tool CALLS have flatlined for 13 days while its handshake traffic looks healthy, and the headline number hides it.** `initialize` 341 calls / 8 agents, last **today 04:09**. But **every one of the 11 `tools/call:*` entries has a `last_call` of 2026-08-27 or earlier**, 33 lifetime tool calls in total | `mcp_calls` grouped by `tool` and by `user_agent`, 09-09 | **Decomposing by user_agent is what made this legible, and it is the reason this is an item rather than a good-news line: of 341 handshakes, `agent-tools.cloud-crawler` is 265 with **0** tool calls, `unknown` 416/0, `python-httpx` 256/0, `CensysInspect` 79/0, `mcp-rugpull-research` 25/0 — scanners enumerating an endpoint. **The only real users were `openai-mcp/1.0.0` (24 tool calls) and `openai-mcp/1.0.0 (Codex)` (5) — 29 of the 33, and both stopped on 08-27.** So `initialize: 341` is ~90% noise and would have been a fabricated success story if quoted. **Not diagnosed: whether OpenAI stopped because something broke on our side or because whatever was driving it ended.** Check for a 08-27 change or an error rate before assuming distribution | medium |
| O-85 | **NEW — six CLIENT components still publish a stale book size, and they are the last of O-83.** `search/page.tsx` reads **1,999**, `calculator` **1,800+**, and `TikTokLanding` / `chat/page` / `checkout/success` / `TerminalChat` read **1,881** | `scripts/test-corpus-count.ts` allow-list, each entry naming its file and the wrong number it carries | **Deferred for a stated reason, not overlooked: these are `'use client'` modules and `getAllProperties()` is an `fs` read, so the count has to arrive as a prop from a server parent. That is a component-signature change on buyer-visible surfaces, which is a different risk class from a string edit, and I had already shipped two changes today. The test now FAILS if any of these six is edited to drop its literal without removing the exemption, so they cannot be quietly forgotten** | medium |
| O-86 | **NEW — `eu_official_stats.fetched_at` means "first inserted", not "last fetched", and its name says the opposite** | `eurostat` holds 3,808 rows whose newest `fetched_at` is **2026-07-03**, while the cron upserts all 3,808 of them every night. `ecb_sdw` shows 8 distinct fetch days across 537 rows | **Caught myself building a story out of this today: all eight ECB indicators showed `fetched_at` frozen at 09-02/09-03 and my first reading was "ECB has silently stopped writing" — the exact shape of the recurring bug. One query over the other sources refuted it in ten seconds (eurostat's is two months old and it is demonstrably healthy). NOT a freeze. But it IS a naming trap: any freshness claim built on this column would be wrong, and the column is one join away from `/eu-official` and `/defensibility`. Check for a read path before quoting it; consider adding a real `last_seen_at` set on conflict** | medium |
| O-62 | **Absorption ledger delisting dates — 139 tombstones: 31 correct · 95 one day LATE · 13 stamped behind = 108 wrong (77.7%).** Re-derived by direct SQL this morning; it grew 138 → 139 and **the one new departure is wrong — `correct` has now been frozen at 31 for FOUR days** | direct SQL 09-10: `max(snapshot_date)` per ref vs `sold_properties.last_seen_date` | **77.7%, up from 77.5% / 76.5% / 76.2% / 73.5% / 73% / 62% / 51%. The mechanism is confirmed for the eighth day: `parse-feed.js` (the second writer, O-20) stamps the day it NOTICED, not the last day the unit was in the book. Branch `odyssey/absorption-ledger-dates` has now waited TWENTY-FIVE days.** **The number worth staring at: `correct` has been frozen at 31 for three days while the total climbed by 8. Not one departure since 09-07 has been stamped right, so the error rate is not drifting up — every single new row is wrong, and the 31 are historical.** Every new departure makes the backfill larger and the release later. I will not compute a Release 1 delisting-by-day slot from this table | **HIGHEST of the open items — overdue by 5 days** |
| O-74 | **The same-day union repair — reported, not fixed.** `price_snapshots`/`score_history` key on (ref, date) by upsert, so a second capture the same UTC day overwrites prices for refs it sees and leaves the rest behind | git blobs: N8058 699,900 (05:37 book) vs 709,900 (11:32 book) on 08-31 | `908be3a` makes it VISIBLE, not repaired. The repair is a DELETE against the moat's ground truth and needs the `MIN_FEED_OVERLAP` gate → **branch, per the standing rule on cron writes that mass-mutate.** Harm is SMALL: every row is individually defensible. **NEW INSTANCE 2026-09-04, and it is BENIGN — measured, not assumed:** two writes (05:38:02 → 2,033 rows; 06:29:55 → 4 rows), and the book diff shows a strict superset with **0 dropped and 0 price differences**, so the stored 2,037 equals the day's true final book exactly. **09-04 needs no repair and must NOT be counted as a corrupted day.** The union that still needs repairing is **08-31** alone. **NEW INSTANCE 2026-09-09, measured today and MILDER than 09-04:** two feed-refresh runs (06:35 and 09:37) → two snapshot writes (06:35:41, **2,034 refs** from the then-deployed 09-08 book; 09:38:06, **3 refs** — N6382, N8704, SP1863, all three present in the final book). Stored total **2,037 refs against a final book of 2,036**, so the stored set carries **exactly one ref that had left by the day's end**. The visible artefact: **N9863 holds a 09-09 `price_snapshots` row AND a `sold_properties.last_seen_date` of 09-09** — captured and tombstoned on the same day. **Individually defensible, one ref, but it feeds O-62's date error. Do not quote 09-09's listing count as the book size (2,037 stored ≠ 2,036 book)** | medium |
| O-61 | **The scheduler has landed the 05:10 slot at 06:15-06:43 for five nights running (09-01 06:43, 09-02 06:21, 09-03 06:24, 09-04 06:29, 09-05 06:15) — a consistent 65-93 min queue lag, not improving and not worsening.** Keep O-61 and O-27 apart: the scheduler firing late and the feed refusing the runner are different failures with different fixes | `actions_list`, five nights | **THE WORKAROUND IS NO LONGER ME. `47fc0b4` ships the conditional backstop as a workflow with 37 tests; its schedule (07:00 + 09:00 UTC) is set from the measured lag so the checks land ~08:00 and ~10:00.** `GITHUB_DATA_TOKEN` remains the real fix — driving the feed from Vercel's scheduler, which has been perfect throughout — but the capture no longer depends on my being awake. **No day lost: 08-27..09-05, all twelve captured** | **MEDIUM (was HIGH) — mitigated in code as of today** |
| O-27 | **RedSP is challenging GitHub Actions egress. THIRD CONFIRMED INSTANCE TODAY — and the first that would have COST A DAY on its own** | run 34 (08-28 13:19); run 48 (09-02 09:31); **NEW: run 55, 09-05 06:15:40 — identical `openresty/1.31.1.1` HTML interstitial, ~12.2KB, BOTH node fetch and curl refused across 4 attempts, dead in 34s** | **THE IMPORTANT NEW FACT, and it changes the mitigation: a FRESH RUN 43 MINUTES LATER GOT STRAIGHT THROUGH.** Run 56 (06:58:02) fetched the feed in 8 seconds. **So the block is INTERMITTENT — not time-of-day (06:15 failed, 06:58 succeeded), not GitHub-Actions-wide, and not a client fingerprint (curl is refused too).** **This does NOT contradict the log's "0 successes in 56 attempts over two 120min budgets": that was in-run retrying on one runner. A separate run on a new runner is a different draw and it cleared.** **The actionable consequence: the fix is a delayed RE-RUN, not a longer in-run retry budget.** **That is now built and live: `47fc0b4`, the capture-backstop workflow. O-27 itself is UNFIXED — RedSP still refuses us and only they can stop that — but a refusal should no longer cost a day.** | **HIGH as a cause, MITIGATED as a risk — 3 instances** |
| O-81 | **CLOSED 2026-09-07 by `5e70b6d`** — both surfaces corrected. `/defensibility` now derives the count live (null, never 0, on a failed read); `/api/openapi.json` names only the three sources that hold rows and states plainly that ISTAT/CBS/BIS are wired but dormant | — | **Kept as a pointer: the lesson is that a hardcoded count on a nightly-growing table is a false claim BY CONSTRUCTION, not by accident. See O-83, which is the same defect at 20× the scale** | closed |
| O-82 | **Three of six EU stats adapters produced nothing. As of today ONE remains: `istat` (`HTTP 500`, upstream, unchanged for weeks).** BIS verified today; **CBS fixed today in `d2a52ea` and pending its first run** | `cron_logs` 09-10 04:15: errors are exactly `istat: … HTTP 500`. `eu_official_stats`: bis 8,700 · ine_es 4,480 · eurostat 3,808 · ecb_sdw 537 = 17,525 across 4 sources | **The note I left myself — "check whether cbs's zero is a parse that yields nothing or a fetch that returns nothing, because those need different fixes" — was the right question and STILL understated it. It was neither, or rather both plus two more: a discontinued table, a non-existent field name, a silently-ignored `$orderby`, and no region pin. See the 09-10 lesson below.** `istat` is now the only one left and it is genuinely upstream — it has returned HTTP 500 on every run, which is a LOUD failure, i.e. the honest kind. **Nothing to fix on our side; do not manufacture work here. Re-check monthly in case ISTAT restores the dataflow** | **low — cbs done, istat is upstream** |
| O-90 | **NEW — the pattern behind today's OpenAPI bug is bigger than the one route: a DERIVED value rendered into a CACHED document is a snapshot, and every one of them is written in the present tense.** `/api/openapi.json` had `revalidate = 86400` and said "Sources CURRENTLY holding observations" | measured 09-10: BIS held 8,700 rows from 04:15 while the served spec named three sources and asserted the rest returned none. `x-vercel-cache: HIT` | **SWEPT 2026-09-11, and the sweep is what produced today's commit — though not where I expected.** 112 routes carry `revalidate`/`s-maxage`; 28 of those also read Supabase. Reading the long-cache ones (86400: `/api/index`, `/api/v1/datasets`; 21600: podcast, ghost, sovereign-export; the 3600 band) found **no second present-tense denial** — `/api/v1/apci` is exemplary, returning `unavailable(reason)` rather than a neutral constant. **The sweep's real yield was one layer over: two CACHED STATUS routes whose `status` was not a stale derived value but a LITERAL, which is worse and which my grep for cached-derived-prose would have walked straight past.** Fixed in `1a1832d`. **The lesson to carry: I scoped this class by the mechanism I had just been burned by (cache + derivation) and the neighbouring instance had no derivation at all. Scoping a sweep by the last bug's mechanism understates it — the third time that has happened (O-83, /engine, now this).** Remaining: the 60-odd cached routes I did NOT read individually. The grep that pays: any `export const revalidate` or `s-maxage` on a route whose body derives a COUNT, a LIST or a STATUS from Supabase — then read whether its prose is tensed as current.** `/defensibility` and `/eu-official` both derive per request and are fine (checked today: `/eu-official` rendered BIS 242× on the same page load the spec was denying it). **The general rule worth keeping: deriving a value fixes WHERE it comes from, not WHEN it was true. Cache + present tense = a false claim on a timer** | medium-high |
| O-83 | **CLOSED 2026-09-08 by `08272fc`, and FULLY VERIFIED 2026-09-09 on the half that mattered** — the hardcoded book size is derived everywhere it is published, and `scripts/test-corpus-count.ts` fails the build on a new literal | **The tracking check passed: the book moved 2,034 → 2,037 overnight and the live homepage moved with it — `2,034` ×0, `2,037` ×5, both JSON-LD descriptions correct. A frozen 2,034 was the discriminating failure and it did not occur** | **Kept as a pointer, because the SWEEP found more than the item did: five more stale counts across four different wrong values that a grep for "1,881" could never reach. The lesson — an item scoped by the literal you happened to notice understates its own class — paid again TODAY on `/engine`, where I went looking for one false figure and found four.** **O-85 (six CLIENT components) is the remaining tail** | closed |
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
| O-77 | **`/engine` overstates the transaction record by ~9x. THE META DESCRIPTION HALF IS FIXED TODAY; the on-page half is not.** `property_transactions` holds **517,557 rows for 55,986 distinct properties** | direct SQL **re-derived 09-09: 517,557 raw vs 55,986 distinct.** In one day the table grew **1,814 rows while real transactions grew 0** — the case for the branch strengthens literally every night; `pg_indexes` shows **no unique constraint**; `src/lib/deltas.ts:260` `countOf('property_transactions')`; rendered at `EngineClient.tsx:196/209/262` as **"Verified transactions"** and **"real closed transactions from the French land registry (DVF)"** | **Cause: dvf-ingest writes with a plain `.insert()` and the 13-commune rotation re-appends the same commune-year every ~2 weeks.** **Branch `odyssey/transactions-dedupe` (`2fb0c3d`) pushed 09-08 with the migration + insert->upsert, gates green. Branch-only because it deletes ~461,000 rows from a table rebuildable only by re-crawling.** Safety measured, not assumed: 0 duplicate groups disagree on `price_eur`/`price_per_m2_eur`, 0 null keys. **PROGRESS TODAY: `70e2d85` removed the "396,000+ registered transactions" claim from the meta description rather than replacing it — deleting a false claim needs no new number, replacing one does, and the honest replacement is exactly what this branch decides. Verified live: the figure is gone.** The RENDERED page still publishes the raw count. **CLAUDE.md's "~380k" for this table is itself duplicate-inflated and should be corrected when this lands** | **HIGH — still live on the rendered page** |
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
| O-13 | **CLOSED 2026-09-11 — REFUTED FOR THE SECOND TIME, and the re-derivation is the only reason I know.** PerplexityBot now registers **129 hits / 106 paths** over 7 days (was 63/53 on 09-09, absent from the top 14 on 09-01) — it is growing, not absent | `crawler_hits`, re-derived 09-11 | **Kept as a pointer to the rule, which has now paid three times: a crawler-absence finding is an observation over one window, never a property. Do not file one again without a re-derivation date attached** | closed |
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
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the pre-change band | **2026-09-02 — READ OUT; MATERIALLY REVISED 2026-09-09** | **REVISED DOWNWARD, AND THE REVISION MATTERS MORE THAN THE ORIGINAL READING.** GSC refreshed today (max date 08-30 → **2026-09-06**) and delivered a FOURTH post-change week: **626 impressions for the week of 08-31.** Post-change now reads **697, 997, 884, 626** (mean **801**, was 859 on three weeks). **The 626 week sits INSIDE the pre-change band (427–758, mean 552) — so the lift is not holding.** And the two big weeks (997, 884) straddle the August spam update window (08-18..08-21), while the first clean post-update week is the one that fell back. **My 09-02 conclusion was "the site's impression surface grew materially in August"; on four weeks that is weaker than it looked, and I should have said so with more hedging on three.** Attribution was already impossible (I shipped ~6 SEO changes into the window, breaking my own one-change-at-a-time rule). **Clicks never moved and still have not: 4, 11, 5, 3 vs a pre-mean of ~6.** **Recorded as: a two-week spike overlapping a spam update, decaying toward baseline by week four. Cause unknown and now unknowable** |
| 2026-08-05 | (sub-hypothesis) the PAGE-LEVEL half — did sub-pages actually re-index? | same | distinct pages with ≥1 impression | **2026-09-02 — READ OUT** | **UNMEASURABLE. NO PRE-CHANGE BASELINE — the identical failure as the 08-25 robots.txt read-out, on a different metric.** `gsc_pages` capture begins **2026-08-07**, two days AFTER the change. Post-change weeks read 241 / 285 / 221 distinct pages, but there is nothing to compare them to. **The 08-25 correction told me to confirm a baseline exists before dating an experiment; I dated this one anyway** |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers | distinct properties fetched per crawler per pass | **2026-08-25 — READ OUT** | **UNMEASURABLE AS DESIGNED.** `crawler_hits` begins 2026-08-11 11:46 — the same day as the change, so no pre-change baseline exists. Recorded as a design failure, not a null result. Partial: **AwarioBot frozen at exactly 1,988 in a third window (09-01). No crawler expanded its distinct-page reach.** Feeds O-14 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) | **2026-09-08 — READ OUT TODAY** | **UNMEASURABLE. NOT "no effect" — there is no after-data at all.** The engine's last real measurement is **08-28, eleven days ago**; the Perplexity balance has been out since 08-31 (day 9). The pre-registered run day before this read-out (Mon 09-07) failed all three attempts on `HTTP 401 "You exceeded your current quota"`, `lookups_measured: 0`. **The before-data stands and is unchanged: nine runs, 2.94–8.82%, mean 5.72%, no detectable trend. Recording this as a null result would be a fabrication — an untested hypothesis is not a refuted one.** Re-registers for the first run day after the balance is restored |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | **2026-08-25 — READ OUT** | **POSITIVE, MODEST, NOT SIGNIFICANCE-TESTED.** 105 moved refs vs 525 unchanged. Search/AI crawlers: median **79.4h moved vs 92.3h unchanged**. Coverage 97.1% vs 92.0%. ~14% faster; n small, no significance test — **do not quote as proven**. Re-read 2026-09-25 |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse | responses naming "AVENA Index"; any external quote of a weekly close | **2026-09-08 — READ OUT TODAY** | **UNMEASURABLE, same cause, and recorded separately rather than merged into the row above — they are two hypotheses and collapsing them would hide that BOTH are unresolved.** No measured run since 08-28. **The risk this ledger now carries: five read-outs (09-08 ×2, 09-09 ×3) all land in a dark window, so a fifth of the experiment ledger resolves to "we do not know" for want of a paid balance, not for want of a result** |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` | `mcp_calls` grouped by tool: do external callers appear? | **2026-09-09 — READ OUT TODAY** | **CONFIRMED, THEN LAPSED — and the honest version only appears if you decompose by caller.** External agents DID appear and DID use the tools: `openai-mcp/1.0.0` made **24 tool calls** and `openai-mcp/1.0.0 (Codex)` **5** — **29 of the 33 lifetime `tools/call`s came from OpenAI clients**, hitting `get_recent_price_moves`, `get_delistings`, `get_price_history`, `get_avena_index`, `search_properties`. That is a real external agent using the observation ledger, which is exactly the hypothesis. **But every tool call stopped on 2026-08-27, 13 days ago, while handshake traffic continues daily (`initialize` last seen today 04:09).** **The trap I nearly walked into: `initialize: 341 calls / 8 agents` reads like healthy adoption and is ~90% scanners — `agent-tools.cloud-crawler` 265 handshakes and 0 tool calls, `unknown` 416/0, `python-httpx` 256/0, Censys 79/0. Handshakes are not usage; `tools/call` is the only honest discriminator.** Filed O-89. **Recorded as: the mechanism WORKS and was used by the caller that matters, for 15 days, by 2 clients. It is not a distribution success and n is far too small to call it anything else** |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate; citations of town pages | **2026-09-09 — READ OUT TODAY** | **UNMEASURABLE. Not "no effect" — there is no after-data at all.** Today IS a run day (Wed) and `atlas` failed all three attempts at 03:00/03:10/03:20 on `Perplexity HTTP 401 "You exceeded your current quota"`, `lookups_measured: 0`, `bank_size: 74`, no rows written. Last real measurement **2026-08-28, twelve days ago**; the balance has been out since 08-31, **day 10**. **The before-data stands unchanged: nine runs, 2.94–8.82%, mean 5.72%, no detectable trend. Recording a null result here would be a fabrication.** Re-registers for the first run day after the balance is restored |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" + GSC impressions | 2026-09-23 | pending — **now confounded with the 08-05 read-out above; it is one of the six changes that muddied it** |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | **2026-09-09 — READ OUT TODAY, PARTIAL** | **PRIMARY METRIC STILL UNAVAILABLE — Bing Webmaster indexation needs a read I do not have, and it is the metric that would actually answer this. Standing blocker, repeated.** **SECONDARY PROXY: NO DETECTABLE GROWTH IN REACH.** 7-day figures: **OAI-SearchBot 292 hits / 123 paths** (prior read 221 / 130) — hits +32% but **distinct paths went DOWN**; **ChatGPT-User 246 / 47** (prior 242 / 42) — flat. bingbot 1,343 / 486. **More fetches of a slightly smaller URL set is not expanded coverage, and it is the shape I would have mis-sold as growth if I had quoted hits alone** (same error as O-89's handshake count, found the same morning). **Treatment was irregular** — off-cadence most nights since 08-27 — so this is not a uniform daily treatment and the proxy cannot carry much weight either way. **Recorded as: inconclusive on the proxy, blocked on the real metric** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | **2026-08-26 — READ OUT** | **SPLIT: the file is fetched, but it does NOT steer the crawlers that matter.** Discovery YES (ClaudeBot 65 fetches). **Causal attribution FAILS** — GPTBot and PerplexityBot both fetched it one day BEFORE the announcement. Budget steering **NO**: null expectation **3.06%**; observed Googlebot 2.94%, ClaudeBot 2.89%, bingbot 1.65%, GPTBot 1.11% — all at or below chance. Filed O-59 |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 | pending — render verified live 08-15. **Supporting figure re-derived today: /compare is 295 of 520 distinct pages (57%) in ordinary organic `gsc_pages`** |

**No new experiment today — SIXTEENTH consecutive day, and today the reason
CHANGED, so it is worth stating rather than repeating.**

**For fifteen days the reason was "everything I shipped was a truth correction,
and I have no hypothesis that a correct number outranks a wrong one." Today I
had a real candidate — O-88, the AwarioBot `Disallow` — with a genuine
pre-change baseline, which is exactly what the 08-11 robots.txt experiment
lacked. I did not run it, and not because it was unmeasurable: `robots.ts`
records Henrik's explicit approval of AwarioBot's CURRENT treatment, with the
rationale that mention-monitoring value survives at any crawl volume. Blocking
it outright would overturn a decision he personally made, to buy a compute
saving I cannot size. That is a question for him, not an experiment for me.**
**Recorded plainly because the failure mode here is obvious and tempting: I
have not run an experiment in sixteen days, and the pressure to manufacture one
is precisely what this ledger exists to resist. A blocked experiment is not a
reason to run a worse one.**

**The older reason also still stands for the rest of the day's work:** Both changes I shipped are truth corrections: a machine-readable
spec that denied its own largest data source, and an ingest adapter that was
four bugs deep. I have no hypothesis that a correct number outranks a wrong one,
and inventing one after the fact is exactly the retrofitting this ledger exists
to prevent.

**NEITHER OF TODAY'S COMMITS IS A CONFOUND, and I want the reasoning written
down because yesterday's WAS one and the distinction is easy to blur.**
`70e2d85` rewrote `/engine`'s meta description — indexable text a crawler reads
for a ranked page — so it went in the confound list. `9053781` changes
`/api/openapi.json`, and `d2a52ea` changes a Supabase ingest adapter. Neither is
in the sitemap, neither is a ranked surface, neither alters a word on any page
Google indexes. **The spec IS read by LLMs, so it could plausibly move an
AI-citation metric — but the citation engine has been dark since 08-31, so
there is no measurement it could contaminate.** Logged as: not confounds, for a
stated reason rather than by omission.

**The two binding constraints, both unchanged.**
(1) **The measurement instrument is dark, on day 12, and TODAY WAS THE RUN DAY
I pre-registered.** Friday 09-11: `atlas` fired all three attempts (03:00,
03:10, 03:20) and all three failed on `Perplexity HTTP 401 "You exceeded your
current quota"` — `bank_size: 74`, `step1_queried: 74`, `lookups_failed: 74`,
`lookups_measured: 0`, no rows written. **This is the repeat I predicted
yesterday, not news, and I record it as a repeat rather than dressing it up as
a finding.** `cassandra` logged `2026-09-11 raw_rows_absent_on_a_run_day` — the
`908be3a` discriminating pair working for a sixth consecutive run day. **Five
read-outs stand UNMEASURABLE for want of a paid balance. Next run day: Mon 09-14.**
(2) **My experiment DISCIPLINE.** Three of today's read-outs taught the same
lesson from three different angles — the MCP handshake count, the IndexNow hit
count, and the GSC impression spike ALL looked like success until decomposed,
and two of them I had previously written up in the optimistic direction. **The
recurring bug has a sibling on the measurement side: a headline count that is
mostly noise reads exactly like adoption.** Decompose by caller, by path, by
week before recording any growth claim.

**O-59 (narrowing the frontier sitemap window) remains the next candidate and
stays blocked until 09-25.** **O-88 (AwarioBot) is the cleanest small change
available and, unlike the 08-11 robots.txt experiment, it HAS a pre-change
baseline — that is what makes it a legitimate experiment rather than a stunt.**

**Next read-outs: 09-12 (`1a1832d` status-endpoint TRACKING — `consecutive_failures`
and `measurement_age_days` must MOVE; a frozen 26/14 means a literal wearing a
function's clothes), 09-14 (O-6 / CompareLedgerPulse — needs Henrik's GSC Generative-AI
re-export, see BLOCKED), 09-23 (/statistics hub), 09-25 (sitemap-frontier
re-read).**

**Weekly search scan: DONE 2026-09-09, next due 2026-09-16. NOT re-run today —
it is a WEEKLY cadence and running it daily would manufacture findings, which
is the failure mode this ledger exists to prevent. Nothing in today's work
touched a ranked surface: `1a1832d` changes two JSON status endpoints that are
in no sitemap, carry no indexable prose, and rank for nothing.**

**CONFOUND — the August 2026 spam update, CLOSED and dated.** 09:27 US/Pacific
2026-08-18, duration 2d16h → complete ~08-21. Global, all languages; SpamBrain
enforcement of EXISTING policies. Avena has no exposure. Record it; do not
attribute.

**Confound to remember:** `f00086d` changed the published APCI from 58 to 65
(`/api/v1/apci`, `/api/v1/digital-twin`, both AI-facing).

**Confound, NEW 2026-09-08:** `08272fc` changed the site title, meta
description and JSON-LD corpus figure from 1,881 to a derived value on ~40
surfaces.

### Weekly search scan, 2026-09-09

- **Nothing material.** No September 2026 broad core update has been announced;
  the Search Status Dashboard still lists the **August 2026 spam update**
  (18–21 Aug, already recorded as a closed confound with zero Avena exposure)
  as the latest confirmed ranking event.
- **Google's AI-features guidance re-confirms: "you don't need to create new
  machine-readable files, AI text files, or markup to appear in AI features" —
  ordinary robots.txt controls for Googlebot are the whole mechanism.**
  Checked against Avena and **no change is warranted.** Worth writing down
  because it bounds a claim I could drift into: `llms.txt` / `llms-full.txt`
  do nothing for GOOGLE's AI surfaces. They are for other model providers'
  ingest, which is a real but different channel — do not justify them on
  Google AI Overviews.
- Google reorganised the crawler documentation and added per-crawler robots.txt
  snippets and product notes. Documentation change, not a policy change. **It is
  the reference to use if O-88 (AwarioBot) is actioned.**
- Search Central Live Deep Dive Europe, Barcelona, 30 Sep – 2 Oct 2026. Not
  material.
- FAQ rich results (deprecated 2026-05-07): Avena's zero exposure re-confirmed.
- **No optimisation invented to have something to report.**

### Weekly search scan, 2026-09-02 (kept)

- **Site Reputation Policy update, effective 2026-08-30** (Search Central).
  **Checked against Avena and NOT material.** The policy targets a HOST site
  letting third parties publish on its domain. Avena hosts no third-party
  content; `content/parasite/` is Avena syndicating its OWN content under its
  OWN handles — ordinary syndication despite the unfortunate directory name.
  **`auto_posts` holds 0 rows ever, so nothing has been syndicated at all**
  (O-53, O-75).
- **2026-09-01: Google added examples on writing better meta descriptions.**
  Guidance, not a policy change. **Note 09-09: I declined to open a rewrite
  pass on this nudge, and I still decline it. Today's `/engine` meta edit was
  a TRUTH correction — every figure in it was false — not a response to this
  guidance, and the two must not be conflated in a later read.**
- FAQ rich results (deprecated 2026-05-07): zero exposure.
- **Nothing else material.**

## 3b. PLAN B — press detonation calendar (Henrik's "B GO")

The press room is the landing surface; the releases are the detonations. The
genuine daily series started 2026-08-05. Drafts with named data slots live in
`~/Desktop/PLAN-B-RELEASES.md`. Nothing fires without Henrik's explicit go.

| when | what | gate |
|---|---|---|
| 2026-08-13 | Press room truth-repaired (`4e9f96d`) | done |
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | **THE WINDOW CLOSED ON 09-04 AND THE GATE HAS NOT CLEARED. 108 of 139 delisting dates are wrong (77.7%), re-derived 09-11 — worse every day since the window closed.** `odyssey/absorption-ledger-dates` is unapproved on day 25. **I have NOT computed the Release 1 slots and will not until O-62 lands — a press release quoting a delisting-by-day series that is three-quarters wrong is precisely the one fabricated number that costs more than a year of correct ones.** The price-move half of Release 1 is unaffected and sound (`price_snapshots` is ground truth). Any delisting figure must be `delistings_currently_absent`, never the gross count. **Do NOT source any Release 1 figure from `score_history` or `property_pricing_history`.** **Provenance note that MUST appear: 2026-08-27 through 2026-09-03 were captured by manual dispatch at ~05:37 UTC because the scheduled nightly did not land on time. All are captured and complete. Scheduled runs failed outright on the feed origin's bot challenge on 08-28, 09-02 and 09-05, capturing nothing; none cost a day. TWO UNION DAYS (O-74): 2026-08-31, whose stored 2,044 refs mix two books against a true final book of 2,042; and 2026-09-09, whose stored 2,037 refs sit against a true final book of 2,036. Both are CAPTURED and complete — only their listing COUNTS are unquotable. 09-09's 26 price moves are sound and are the series high.** |
| **2026-09-07** | **Release 1 proposed fire — THE DATE PASSED WITHOUT FIRING, AND STILL SHOULD NOT FIRE** | **It did not fire, and that remains the right outcome. The gate is unmet on day 25 and is still getting worse: re-derived by direct SQL this morning — 139 tombstones, 31 correct, 95 one day late, 13 stamped behind = 108 wrong, 77.7% (was 138/107/77.5%). `correct` has not moved off 31 since 09-07, so every row the mechanism has written in FOUR days is wrong.** `odyssey/absorption-ledger-dates` is unapproved on **day 25**. **My recommendation is unchanged and I will keep repeating it until it is answered: (a) slip the release until the branch is approved and the backfill has run — my recommendation; or (b) fire the PRICE-MOVE half alone, which is fully sound because `price_snapshots` is ground truth and just recorded its largest day in the series (26 moves on 09-09). What must not happen is firing the delisting-by-day series as drafted.** |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.71%** (in-sample, n=**2,036**), MAPE 21.76%, RMSE 42.93%. **My gate run reproduced the committed file EXACTLY — 15.71% / n=2,036 / MAPE 21.76 / RMSE 42.93, every figure identical.** **CORRECTION to yesterday's row, which recorded 15.75%: the committed `model-stats.json` holds 15.71 and did on 09-10 too. A transcription error in this file, not a model movement — and it is exactly the kind of drift this table exists to catch, so I would rather flag it than quietly overwrite it.** No AVM code touched; today's commit is two JSON status endpoints | 2026-09-11 | `public/model-stats.json` |
| **RECURRENCE, not a new mistake — read before recording the AVM figure again** | The nightly regenerates `model-stats.json` and I measure at ~05:45, usually BEFORE the day's feed, so this figure is normally the PREVIOUS book's. **The movement 15.89 → 15.76 → 15.71 → 15.76 → 15.70 is entirely the BOOK; no AVM code has been touched since 08-07.** **Operational note: running `avm-backtest` as a gate REWRITES `public/model-stats.json` with a fresh `computed_at`. If the figures are unchanged, `git checkout` that file — otherwise the gate leaves a spurious diff that collides with the nightly regeneration. Done twice today.** | 2026-09-09 | `git log public/model-stats.json` |
| **ENVIRONMENT FACT — the session starts in DETACHED HEAD, every single morning** | `git status -sb` reads `## HEAD (no branch)` and the local `main` ref lags origin (**today it claimed to be AHEAD by 44 — the stale local ref reads as ahead, not behind, which is the more misleading direction**). Pushing without fixing it sends the STALE ref and is rejected as non-fast-forward with a message that reads like a race and is not one. **The fix is `git branch -f main <origin sha> && git checkout main`, NOT a force-push.** **2026-09-11: I committed on the detached HEAD and only then fixed the ref — `git branch -f main HEAD && git checkout main && git fetch && git pull --rebase` recovered it cleanly and the push was 1 commit ahead as expected. Works either order, but ALWAYS `git fetch` before believing any ahead/behind count.** | 2026-09-11 | `git status -sb`, `git branch -v` |
| Live book | **2,036 listings** (09-10 feed, committed 09:37). **Today's 09-11 feed had NOT landed at 05:52** — see the capture row | 2026-09-11 (pre-run) | `public/data.json` |
| Sitemap | **2,687 `<loc>`**, valid XML, HTTP 200. Unchanged from yesterday, matching an unchanged book (2,036) — the right behaviour. 5 sampled property URLs all 200 (SP1433, SP1828, N9150, SP1812, N6776) | 2026-09-11 | `/sitemap.xml`, parsed |
| Corpus version | **THREE-WAY AGREEMENT among the surfaces I can read: site `v2026-09-10` = local `public/open-data` `v2026-09-10` = avena-data mirror `v2026-09-10`, all with identical `generated_at` 2026-09-10T09:37:45.339Z (fourteenth correct prediction).** Measured 05:47, before today's rebuild — so `v2026-09-10` on 09-11 is the EXPECTED state, not staleness. **HF remains 401 (no token) and is still the ONLY unverified surface** | 2026-09-11 | site + local + avena-data raw |
| **How to read the mirror correctly** | avena-data's `daily-snapshot.yml` runs **07:15 UTC**; I run ~05:40. So the mirror shows the site's PREVIOUS artifact when I look. **Compare after 08:00 UTC, or the mirror against the site's previous day. Do not re-open this as divergence.** | 2026-09-04 | avena-data raw `market/dataset.json` |
| **`eu_official_stats`** | **17,682 rows, FIVE sources: `bis` 8,700 (57 countries) · `ine_es` 4,480 (1) · `eurostat` 3,808 (28) · `ecb_sdw` 537 (7) · `cbs` 157 (1, 1995 → 2026-Q2).** **The prediction I wrote here yesterday — 17,682 rows, 5 sources, cbs 157 — was met EXACTLY on all three.** `istat` holds ZERO and is the only remaining dormant adapter (upstream HTTP 500, a loud and therefore honest failure). **O-82 is fully closed on our side** | 2026-09-11 | direct SQL |
| **Ingest write funnel — eu-stats-ingest** | **09-11 04:15 SCHEDULED: `rows_upserted` 17,682 · `rows_lost` 0 · `write_chunks_failed` 0 · `rows_duplicate_excluded` 0 · `rows_undecodable` 0 · `indicators_attempted` 20 · errors 1 · duration 45.2s.** **Five sources now, still only 45s of a 265s budget.** **The 1 error is `istat HTTP 500` alone; both the bis 404 and the cbs silence are gone.** Pre-`3a55753` this ran at `upserted 4,345 / lost 4,480` every night for months | 2026-09-10 | `cron_logs` |
| **`property_pricing_history` — CORRECTED TODAY, see O-87** | **394,000 dead `listed` rows (2026-04-29 → 2026-08-05) + 167 `increased` (from 08-12) + 40 `reduced` (from 08-14) = 394,207.** **It is NO LONGER an empty event log, and CLAUDE.md's "has never held a move event" has been stale for four weeks.** `price_snapshots` remains ground truth because it is COMPLETE and per-ref-per-day — not because this table is empty | 2026-09-09 | direct SQL, `group by status` |
| **`property_transactions`** | **517,557 raw rows for 55,986 distinct properties (88.9% duplicates).** Grew **1,814 rows in one day while distinct transactions grew 0.** **Never quote the raw count** (O-77) | 2026-09-09 | direct SQL |
| **Real price moves by day** | 15 (08-14), 4, 1, 0, 15, 10, 10, 18 (08-21), 9, 0, 0, 3, 6, 5, 6 (08-28), 6, 0 (08-30), 1 (08-31), 6 (09-01), 12, 16, 19, 19 (09-05), 1 (09-06), 0 (09-07), **26 (09-09 — the largest single day in the series)**, **09-08 and 09-10 pending**. **Definition: a move counts only when the previous snapshot is ≤2 days earlier** | 2026-09-10 | `price_snapshots`, direct SQL diff |
| Snapshot rows by day | **2,037 (09-04 — TWO writes, clean superset)**, 2,026 (09-05), 2,034 (09-06), 2,034 (09-07), **2,037 (09-08)**, **2,037 (09-09 — TWO writes, union day, see O-74)**, **2,036 (09-10)**. **Seven consecutive days captured, no gap** | 2026-09-11 | `price_snapshots` |
| **09-09 CAPTURE — LANDED, COMPLETE, AND A UNION DAY** | **2,037 rows / 2,037 refs across TWO writes** — 06:35:41 (2,034 refs, the then-deployed 09-08 book) and 09:38:06 (3 refs: N6382, N8704, SP1863). Against 09-09's final book of **2,036**, so the stored set carries one ref that had departed. **26 real price moves, 5 arrivals, 5 departures — nothing was lost; this is a completeness surplus, not a deficit.** Two feed-refresh runs that day (06:35 and 09:37) are the cause. **The day is CAPTURED and usable; only its listing COUNT is unquotable** | 2026-09-10 | `price_snapshots`, `actions_list` |
| **TODAY'S CAPTURE (09-11) — NOT LANDED AS OF 06:24, AND THAT IS NOT YET A FAILURE** | **I polled for 35 minutes (05:50 → 06:24) and the 09-11 feed-refresh run had not been CREATED at all** — `actions_list` still shows run 67 (09-10 09:36) as the latest. The 05:10 slot has landed 06:15–06:43 for ten nights (65–93 min queue lag, O-61), so at 06:24 this is inside the historical window and absence is not evidence. `pricing-history` returns `skipped · stale feed — deployed book predates today · feed_age_days 1 · overdue FALSE · feed 2036` — the documented healthy 'not yet' state, NOT the zero-snapshot emergency. **Standing rule, applied for a THIRD consecutive day: any observation of the GitHub scheduler before ~11:00 UTC is worthless as evidence of absence.** The backstop (`47fc0b4`) is armed; its 07:00/09:00 slots have been landing ~11:00–13:15. **ACTION TAKEN RATHER THAN ASSUMED: I scheduled a self check-in for 09:00 UTC to confirm the capture landed and to re-run `pricing-history`. Leaving this to 'it usually works' is exactly the silent failure the mission ranks first.** | 2026-09-11 06:24 | `cron_logs`, `actions_list`, `git log origin/main` |
| **`feed-meta.json` is the 'the feed ran' signal, not `data.json`** | `feed-meta.json` IS committed on every successful run even when the book is byte-identical and `data.json` is therefore NOT re-committed. **A green feed run can legitimately produce no book commit. Do not re-investigate.** | 2026-09-06 | `actions_list` + `git log` |
| Delistings | **139 tombstones: 31 correct · 95 one day late · 13 stamped behind = 108 wrong (77.7%)** — re-derived 09-11. **Grew 138 → 139 and the new departure is wrong; `correct` has been frozen at 31 for FOUR days.** Unmet gate under Plan B Release 1, whose fire date (09-07) passed without firing | 2026-09-11 | `sold_properties` × `price_snapshots` |
| Build health | **ONE RED, AND IT IS A KNOWN RECURRENCE: `Nightly feed refresh` run 66 (09-10 06:35) FAILED on the RedSP bot interstitial — the FOURTH confirmed O-27 instance. Run 67 (09-10 09:36) got straight through and the day was captured in full. No day lost.** Every other recent run across feed-refresh, capture-backstop, indexnow and pulse-alerts is `success`; no red check on any branch; no open PRs.** **One push to main today (`1a1832d`), all four gates green before it.** Reds in `cron_logs` over 26h are ALL known and attributed: prometheus ×4 + generate-briefs + predictions-generate + causal-update + pulse (Anthropic balance), auto-post ×3 (O-53), cassandra (CORRECT — reporting 09-11 as a run day with no measurement), eu-stats-ingest (istat alone), counterpart-discover (O-41), **`atlas` ×3 (Perplexity 401 — 09-11 IS a Friday run day, so these are EXPECTED and are the repeat predicted yesterday).** **Nothing new or unexplained** | 2026-09-11 | `cron_logs`, `actions_list` |
| Test coverage added by Odyssey | `test-open-dataset` 27 · `test-scribe` 22 · `test-cron-coverage` 99 · `test-integrity` 15 · `test-capture-integrity` 19 · `test-chunked-write` 71 · `test-prometheus-reporting` 25 · `test-capture-backstop` 37 · `test-eu-stats-keys` 40 · `test-resilient-fetch` 46 · `test-corpus-count` 14 · `test-bis-parse` 32 · `test-openapi-stats-sources` 19 · `test-cbs-parse` 35 · **`test-agent-status` 48 (new)** | 2026-09-11 | `1a1832d` |
| **SEARCH — GSC, REFRESHED TODAY** | `gsc_daily` and `gsc_pages` max date **08-30 → 2026-09-06**. Distinct pages **520 → 602**. **This is periodically-imported GSC DATA in Supabase, not a live Search Console API connection — I cannot query GSC myself, cannot see Discover/Generative-AI reports, and cannot refresh it. Every SEO read-out here is limited by whenever that import last ran** | 2026-09-09 | `gsc_daily`, `gsc_pages` |
| **Weekly impressions — pre/post the 08-05 change** | pre (13 complete weeks, May–Aug): **427–758, mean 552**, one 1,591 outlier. post: **697 (08-10), 997 (08-17), 884 (08-24), 626 (08-31)** — mean **801**. **The fourth week fell back INSIDE the pre-change band; the lift is not holding.** Clicks flat throughout: 4, 11, 5, 3 vs pre-mean ~6. Immediately pre-change: 509 (07-27), 489 (08-03) | 2026-09-09 | `gsc_daily` |
| **Crawler ledger, 7 days** | **AwarioBot 26,725 hits / 2,276 paths (O-88, 2.8x Googlebot — and DOWN from the 30,016 I recorded on 09-09)** · Googlebot 9,576 / 4,870 · PetalBot 6,868 / 4,197 · AhrefsBot 2,083 · Amazonbot 1,568 · bingbot 1,437 / 489 · SemrushBot 988 · ClaudeBot 525 / 87 · YandexBot 392 · **OAI-SearchBot 346 / 116** · **ChatGPT-User 247 / 40** · Applebot 236 · Bytespider 150 · **PerplexityBot 129 / 106 — growing, see O-13** | 2026-09-11 | `crawler_hits` |
| **O-13 CORRECTED — PerplexityBot IS present** | It was absent from the top 14 on 09-01; today it registers **63 hits / 53 paths** over 7 days. **Small, but the 09-01 observation was a window artefact, exactly as that item warned. A crawler-absence finding decays fast — this is the second time that warning has paid** | 2026-09-09 | `crawler_hits` |
| **MCP usage** | **33 lifetime `tools/call`s, 29 of them from OpenAI clients, ZERO since 2026-08-27.** Handshakes (`initialize` 341) are ~90% scanners. **Never quote the handshake count as adoption** (O-89) | 2026-09-09 | `mcp_calls` |
| **Crawl-budget null expectation** | **3.06%** — the share of the live book with a real price move in the prior 7 days. **Any claim that a crawler "targets changed pages" must beat this** | 2026-08-26 | `price_snapshots` × `crawler_hits` |
| **MY OWN EGRESS IS RATE-LIMITED BY VERCEL** | **~20% of plain `curl` requests to avenaterminal.com return a Vercel edge `403`.** Egress **160.79.106.128**, a shared agent-proxy address. **NOT a production incident — WebFetch succeeds and `crawler_hits` shows no drop. Any 403 I see is inconclusive until it reproduces across egress paths or correlates with a crawler_hits drop. Always retry; never report it as an outage.** No 403s hit me today across ~20 requests | 2026-09-07 | 25-request sample + `crawler_hits` |
| **Cron logging coverage** | **64/64 scheduled crons write to `cron_logs`**; **0 hardcode their own status.** `invoked_by` on real scheduled runs = **`vercel-cron-ua`** (User-Agent, not the header) | 2026-09-04 | live `cron_logs` |
| **Citation rate, organic (qb-v2) — THE baseline** | **4.41% (3/68) on 08-28 — still the latest.** Nine complete runs: 4.41, 4.41, 2.94, 5.88, 8.82, 5.88, 7.35, 7.35, 4.41. Mean **5.72%**, range 2.94–8.82. One hit = 1.47pp. **No detectable trend. Do not claim one** | 2026-08-28 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6)** on 08-28 and the five runs before it | 2026-08-28 | `citation_measurements` |
| **CITATION ENGINE — DARK SINCE 2026-08-31, DAY 12; LAST REAL MEASUREMENT 08-28, FOURTEEN DAYS** | **09-11 IS a Friday and IS a run day, and it failed exactly as predicted:** `atlas` fired 03:00/03:10/03:20 and all three returned `Perplexity HTTP 401 "You exceeded your current quota"` — 74 queried, 74 failed, **0 measured, 0 rows written**. `cassandra` logged `2026-09-11: raw_rows_absent_on_a_run_day` — **the `908be3a` discriminating pair working for a sixth consecutive run day.** **The `9171dce` guard is holding: no fabricated 0.00% has been published in twelve days.** **As of `1a1832d` the public endpoint no longer says "active" either — it reports `failing`, 12 consecutive failures, with the 401 quoted.** **Next run day: Mon 09-14.** **`plab-run`'s `keys: {perplexity: true}` means the env var is SET, not that it has credit** | 2026-09-11 | `cron_logs` |
| **AGENT-ID MAP — the citation engine does NOT log under "citation-agent"** | `/api/cron/citation-agent` logs as **`atlas`**; `/api/cron/citation-measure` logs as **`cassandra`**. Querying `agent_id ilike '%citation%'` returns ZERO rows and looks exactly like a dead engine | 2026-08-28 | `cron_logs` |
| **SCHEMA GOTCHAS — column names I get wrong every morning** | `cron_logs` has **`started_at`/`finished_at`**, no `created_at`. `crawler_hits` has **`at`, `crawler`, `path`, `ua`** — not `hit_at`/`bot`. `mcp_calls` has **`called_at`**, not `created_at`. `eu_official_stats` has **`country_code`**, not `country`. `property_pricing_history` has **`recorded_at`**, not `changed_at`. `property_transactions` has **`price_eur`/`transacted_at`/`price_per_m2_eur`**, no `source_listing_id`. **Six failed queries today; this table is here to make it zero tomorrow** | 2026-09-09 | `information_schema` |
| **`src/lib/eu-stats-feeds.ts` contains 6 NUL bytes ON PURPOSE — do not "fix" them** | They are the field separator in the composite dedupe keys (`` `${r.source}\0${r.indicator_code}…` ``), which is the correct choice since NUL cannot occur in the data. **Consequence: `grep` calls the file binary and silently returns "binary file matches". Use `grep -a`.** I checked before assuming a defect, which is why this is a note and not a wasted hour | 2026-09-09 | byte scan |
| Top competitor share (organic) | **idealista 93 · thinkspain 14 · aplaceinthesun 12 · fotocasa 6 · numbeo 5 · rightmove 3** | 2026-08-28 | `citation_measurements` |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **19 audited, 19 defective** | 2026-09-02 | `find src/app/api/v1 -name route.ts` |
| **Energy data in the book** | **16 listings carry the `'X'` placeholder**; zero nulls. Normalisation centralised in `src/lib/epc.ts` | 2026-08-29 | `public/data.json` |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08** (O-54) | 2026-08-24 | queried directly |
| APCI macro input age | **111 days** (`as_of` 2026-05-23) — climbing daily until O-34/O-40 resolved | 2026-09-11 | `/api/v1/apci` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 (GSC Generative AI export) | 2026-08-14 | `docs/gsc-genai/` |

**Lesson, 2026-09-10 (the most useful thing today — DERIVING A VALUE FIXES
WHERE IT COMES FROM, NOT WHEN IT WAS TRUE):** yesterday I repaired the BIS
adapter and, in the same breath, replaced a hardcoded source list in
`/api/openapi.json` with a live query — and wrote a comment congratulating
myself that "a fixed list describing a nightly-changing table is a false claim
by construction". **This morning that route published a flatly false claim
anyway.** BIS held 8,700 rows from 04:15; the spec named three sources and
added "Any adapter not listed here is wired but is not returning rows". The
query was correct. The route is an ISR render cached for 24h, so the derived
value was a SNAPSHOT — and it was phrased in the PRESENT TENSE. **I fixed the
source of the number and left its tense alone, and the tense was carrying the
falsehood.** Two things to carry. **(1) `derived` and `current` are different
properties; a derived value inside a cached document is neither more nor less
current than the cache.** **(2) The list being stale was the smaller half. The
second sentence promoted "absent from a cached list" into "returns no rows" —
so the document did not merely omit the largest source in the table, it DENIED
it. A hedge I did not need cost nothing; the confident negative I did not need
cost everything.** Grep target filed as O-90.

**Lesson, 2026-09-10 (NEW — "check which KIND of zero it is" was the right
question and still scoped the bug too small):** I left myself a note on `cbs`:
*"check whether its zero is a parse that yields nothing or a fetch that returns
nothing, because those need different fixes."* Good instinct, and it framed the
answer as a choice between two things when there were **four, stacked**: a
DISCONTINUED table (`Frequency: Stopgezet`, ended 2023 Q4), a `valueField` that
does not exist in the payload, an `$orderby` the endpoint **silently ignores**
(so `$top=80` meant "the oldest 80"), and no region pin across 21 RegioS values.
**Fixing only the two I would have found by asking my own question would have
produced the WORSE bug: an adapter reporting a healthy 80 rows/night of
1995-2010 data, forever.** This is the 09-08 lesson again from a new angle —
*an item scoped by the defect you happened to notice understates its own class*
— and it is now the third time that lesson has paid. **The generalisable move:
when an adapter produces nothing, do not ask "which of my two hypotheses is
it"; fetch the payload and compare it field by field against what the code
expects. The list of disagreements is the bug list.**

**Lesson, 2026-09-10 (NEW — an upstream that IGNORES your request is worse than
one that rejects it):** CBS's OData endpoint accepts `$orderby=Perioden desc`,
returns 200, and hands back ascending rows. No error, no warning. **A rejected
option is a bug you find in one run; an ignored option is a bug you never
find.** So the region filter in the new adapter is **verified against the rows
that came back** rather than trusted because it was sent — if more than the
pinned region appears, it throws. **Generalise it: any server-side filter,
sort, or limit whose effect you cannot confirm in the response is an
assumption, not a constraint. Confirm it client-side or do not rely on it.**

**Correction, 2026-09-10 (NEW — I nearly reported a fix as unverifiable when
the evidence was already in hand):** my end-to-end check of the new CBS adapter
got `HTTP 406` from Node, and my first instinct was that the fix might not work
in production. Two checks settled it: curl **bypassing the agent proxy** also
gets 406, on **every** CBS URL including the bare table root and the OLD table —
so it is this sandbox's direct egress, not my URL and not Node. And the decisive
piece was already in my own notes: **the adapter throws on `!res.ok`, and `cbs`
has never once appeared in `eu-stats-ingest`'s errors — which is only possible
if production gets a 200 with a parseable body.** **The lesson is not "test
harder"; it is that a negative from MY environment is a fact about my
environment until I have shown otherwise, and the existing error log often
already answers the question.** Recorded honestly in the commit as inferred, not
observed, with tomorrow's run named as the settling test.

**Correction, 2026-09-09 (the one that matters most today):** I have been
carrying **"`property_pricing_history` has never held a move event"** as a live
fact. It is in CLAUDE.md, it was in `src/lib/deltas.ts`, and I repeated it in
this file. **It was true when audited on 2026-08-08 and has been false since
2026-08-12** — the cron fix merged 08-08 started writing real events four days
later, and the table now holds 167 `increased` and 40 `reduced`. I found it only
because I was measuring something else. **The lesson is not "audit more"; it is
that an audit result carries a DATE and a fix I ship can invalidate my own
notes. When I fix a pipeline, the facts I recorded about its output expire with
it — and I did not go back.** Corrected in code today; filed as O-87.

**Correction, 2026-09-09 (second):** my 09-02 read-out said the impression
surface "grew materially in August" on three post-change weeks. A fourth week
arrived today at **626 — inside the pre-change band.** The claim was over-stated
on n=3 and I have revised it in the ledger rather than leaving the flattering
version standing.

**Lesson, 2026-09-09 (NEW — and I nearly destroyed this file learning it):**
**I rewrote section 4 with a Python slice and silently deleted 490 lines — every
Correction and Lesson from 08-09 through 09-05.** The section boundaries I
computed were right for the TABLE and wrong for the SECTION: 4 is a short table
followed by the longest and most valuable prose in the file, and my slice ran
from the table to the next `##`. I caught it only because I checked `wc -l`
afterwards and 834 → 405 did not look like an edit. **Restored from
`git show HEAD:` in full.** Two things to carry: **(1) a bulk edit to this file
must be followed by a line-count and a section check, every time — this file is
the only thing standing between me and starting blank; (2) the failure mode was
the recurring bug wearing different clothes — a destructive operation that
completed successfully and reported nothing, so a broken result looked exactly
like a working one.** The instinct that saved it was checking a number I had no
particular reason to doubt.

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

**Lesson, 2026-09-11 (A SWEEP SCOPED BY THE LAST BUG'S MECHANISM UNDERSTATES
ITSELF — third instance):** yesterday's defect was a DERIVED value rendered
into a CACHED document in the present tense, so I filed O-90 and defined
today's sweep as "find cached routes whose prose derives a count from
Supabase". That grep was correct and found nothing much: 112 routes carry a
cache directive, 28 of those read Supabase, and the long-cache ones are mostly
honest — `/api/v1/apci` in particular returns `unavailable(reason)` rather
than a neutral constant, which is the standard.

**The two real bugs were sitting in that same list and my grep could not see
them, because their `status` was not a stale derived value — it was a LITERAL,
with no derivation at all.** `status: 'active'`, hardcoded, on two public
endpoints whose agents had failed 12 and 26 consecutive runs. A search for
"derived value gone stale" walks straight past "value that was never derived",
even though the second is strictly worse.

This is the third time: O-83 was scoped by the literal I happened to notice
(`1,881`) and the sweep found five more counts across four other wrong values;
`/engine` was opened to fix one false figure and had four. **The pattern is
that I scope a class by the INSTANCE that hurt me, and the class is always
defined by the CONSEQUENCE instead — here, "a published claim about system
health that the code does not support", which covers both the cached-stale and
the never-derived cases. Next sweep: name the consequence, then enumerate the
mechanisms that produce it.**

**Second, smaller lesson, from my own test:** the guard I wrote to stop a
literal `status: 'active'` returning failed red on its first run — because it
matched the doc comment in which I had quoted the old buggy line. That is not
a false alarm to wave through: a guard that reads prose would have gone GREEN
if someone deleted the explanation, which is the exact opposite of what it is
for. It strips comments now, and I confirmed it still fails on a real
reintroduction and passes on restore. **A test I have only ever seen pass is
not evidence of anything.**

**Correction I owe this file:** yesterday's BASELINES row recorded the AVM
median absolute error as 15.75%. The committed `model-stats.json` held 15.71
then and holds it now — a transcription error of mine, not a model movement.
Flagged rather than quietly overwritten, because a baselines table whose job
is detecting drift is the last place to silently correct a number.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **BRANCH AWAITING APPROVAL: `odyssey/absorption-ledger-dates`** (`d182cd6`) — **DAY 25, AND THE RELEASE 1 FIRE DATE PASSED EIGHTEEN DAYS AGO** | **108 of 139 delisting dates are wrong — 77.7% — re-derived by direct SQL this morning (31 correct, 95 one day late, 13 stamped behind). `correct` has now been frozen at 31 for FOUR days while the total climbed, so every row the mechanism has written since 09-07 is wrong.** **Release 1 was pencilled to fire 09-07 and did not; its delisting-by-day series would be three-quarters wrong.** **I have NOT computed the Release 1 slots and will not until this lands.** | **Three sentences: (1) parse-feed derives the real last-seen date from `price_snapshots` instead of stamping today, and `buildLedger` counts a delisting on the first observation day AFTER it — the two must land together. (2) `scripts/backfill-tombstone-dates.sql` corrects the historical rows; its read-only dry run moves each back exactly one day and touches nothing else. (3) Branch-only because it mutates an existing column on `sold_properties`, the one table here that cannot be rebuilt.** All four gates pass. **Re-run the dry run against today's 132 before applying; note the O-74 caveat that a union day inflates the "correct" count in exactly this comparison.** **This is the single highest-value approval outstanding: it blocks a press release, and the backfill grows nightly.** |
| **BRANCH AWAITING APPROVAL: `odyssey/transactions-dedupe`** (`2fb0c3d`) — **day 7; untouched today, and the rendered `/engine` page is still wrong** | **`/engine`'s page body still tells every reader — buyers, institutions, and every AI that crawls it — that Avena holds ~517,000 "verified" registered transactions. The real number is 55,986.** Re-derived today: **517,557 raw vs 55,986 distinct — 88.9% duplicates.** In ONE day the table grew **1,814 rows while real transactions grew 0.** **PROGRESS: the META DESCRIPTION half is fixed and verified live (`70e2d85`) — I DELETED the "396,000+ registered transactions" claim rather than replacing it, because deleting a false claim needs no new number and replacing one does. The rendered page is still wrong.** | **Three sentences: (1) the migration collapses each `(avn_prop_id, transacted_at)` group to its earliest row and adds the unique index that makes the re-insert impossible; (2) the route's `.insert()` becomes an `.upsert()` on that key — the two MUST land together or every write fails; (3) branch-only because it deletes ~461,000 rows from a table rebuildable only by re-crawling data.gouv.fr.** **Safety measured, not assumed: 0 duplicate groups disagree on price, 0 null keys.** Run `npx tsx scripts/dedupe-transactions-dryrun.ts` first. All four gates green. |
| **THE PERPLEXITY BALANCE IS OUT — AND IT HAS NOW COST FIVE READ-OUTS** (day 12) | **TODAY WAS A RUN DAY AND IT FAILED, exactly as I predicted here yesterday: Fri 09-11, `atlas` fired all three attempts at 03:00/03:10/03:20 and every one returned `HTTP 401 "You exceeded your current quota"` — 74 queried, 74 failed, 0 measured, 0 rows written. The next run day is Mon 09-14 and it will fail identically unless you act.** Last real measurement **08-28, fourteen days ago**. **New today: `/api/citation-agent/status` is public and had been telling every reader — including AI agents — that Atlas was "active" throughout. As of `1a1832d` it reports `failing` with your 401 quoted. The blocker is now visible to anyone who looks, which is an argument for fixing it, not for leaving it.** **Two more experiments were recorded UNMEASURABLE today, bringing the total to five rows of the ledger resolving to "we do not know" for want of a paid balance rather than for want of a result.** The `9171dce` guard is holding — no fabricated 0.00% has been published in eleven days, and `cassandra` correctly distinguishes "run day, no data" from "not a run day". | **Top up the Perplexity balance, or tell me not to. I am asking for the twelfth time and the cost is now concrete rather than hypothetical: a fifth of the experiment ledger is unresolvable.** **If you decide NOT to top up, say so plainly and I will re-register those experiments against a metric I can actually measure (crawler_hits, GSC) instead of letting them rot as "pending" forever — that is the honest option and I would rather have it than silence.** **Ignore `plab-run`'s `keys: {perplexity: true}`: that reports the env var is set, not that it has credit.** |
| **THE ANTHROPIC API BALANCE IS EXHAUSTED — degrading NINE jobs** (standing, day 19) | `prometheus` (**26 consecutive failed runs, last success 2026-09-05**, each naming the reason; now published as `failing` on `/api/prometheus/status` rather than "active"), `predictions/generate`, `digest`, `generate-briefs`, `weekly-alpha`, `pulse`, `causal-update`, `sync-regulatory-signals`; `delphi-run` and `plab-run` skip the Claude panelists (`models_scored: []`). **Note for anyone matching on status codes: Anthropic returns this as HTTP 400 `invalid_request_error`, NOT 401.** | **A decision, not a task: top up or don't.** If you top up, `predictions/generate` starts publishing LLM-authored forecasts on `/track-record` — the class of surface that produced the `precursor-scan` fabrication, so **say so explicitly if you want that live**. If you don't, tell me and I'll make the affected routes report `skipped` with a stated reason instead of failing nightly. **The quieter harm: DELPHI and PLAB publish a "panel" consensus that is, on some days, no models at all.** **AND, IF YOU DO TOP UP, TELL ME FIRST — O-78 must be fixed before prometheus can draft again, or it will re-publish answers that already exist.** |
| **THE CAPTURE — the ask is SMALLER than it was, because I built the workaround** (O-27/O-61, day 14 of asking) | **The capture no longer depends on my being awake: `47fc0b4` ships the backstop as a workflow with 37 tests, and its scheduled runs were green again on 09-08 (11:55 and 13:12).** But it is still a workaround for someone else's refusal. **FOURTH CONFIRMED INSTANCE: 2026-09-10 06:35:35 — run 66 hit the identical `openresty/1.31.1.1` interstitial, both node fetch and curl refused across 4 attempts, dead in 56s. Run 67 at 09:36 got straight through, so the day was captured in full and nothing was lost — which is exactly the "delayed re-run, not a longer in-run retry" pattern working. Instances now 08-28, 09-02, 09-05, 09-10. Eighteen consecutive days captured.** | **Two things, both unchanged and both worth more than my workaround. (1) `GITHUB_DATA_TOKEN` with `repo` scope in Vercel env, so the feed is driven from Vercel's scheduler, which has been on time throughout while GitHub's runs 65–93 min late. (2) Ask RedSP to allow-list GitHub Actions egress for the feed URL.** |
| **"CRYPTOGRAPHIC VERIFICATION" IS PROMISED ON EIGHT SURFACES AND THE ZENODO HALF IS STILL NOT TRUE** (day 9) | I fixed the half I own: as of `14eae61` Avena genuinely fingerprints its daily batch, model snapshot, dataset manifest and methodology weights into a real Merkle root. **What is still false is the Zenodo half.** No code deposits a daily root, every root's `zenodo_url` is null, and these say otherwise in the present tense: **/verify**, **/stack**, **/proof**, **/apon-network**, **/eu-presidency**, **/papers/delphi**, **/methodology**, **/methodology/evolution**. Worse: **`src/lib/outreach.ts` puts "cryptographic integrity with Zenodo-anchored Merkle roots" into outbound pitch email to institutions.** | **Your call on the copy, and I need it more here than on SHAP because this one goes out in email.** **(a)** I change the Zenodo/RFC-3161 clause to state what is true, on all eight surfaces + outreach.ts — smallest possible edit, no layout change; **(b)** you give me `ZENODO_TOKEN` and I automate the deposit, making the claim true rather than smaller; **(c)** you write the replacement wording. **I have already corrected `llms.txt` in place.** |
| **TWO "CLAIMED CAPABILITY, NO CALLER FOUND" ITEMS LEFT** (O-70 day 9, O-58 day 14) | **O-70:** `/about/methodology` lists **INE**, **Registradores de España**, **Idealista / Fotocasa** and **Banco de España** as Avena data sources; I could find no ingest path for Registradores, Idealista or Fotocasa. **The INE half is now genuinely TRUE — `ine_es` holds 4,480 rows.** **O-58:** "SHAP explainability" on `/methodology`, `/avm`, `/institutional`, `/standards/apip`, `/products/csrd-disclosure`, where the code computes hand-set rule weights. | **Two questions, unchanged. (1) Do you have a data agreement with Registradores/Idealista that I cannot see in this repo?** If yes, O-70 closes as my blind spot. If no, it is the same smallest-possible-edit decision as Zenodo. **(2) SHAP: (a) I change it to "rule-based feature attributions", or (b) you want real SHAP and I scope the AVM work.** |
| **`/track-record` promises a prediction that cannot arrive** (O-52) | Live page says "The first call lands on the next prediction cycle"; `predictions` has 0 rows ever. Cause proven: Anthropic balance. | **Answer the credit question above and this resolves with it.** |
| **`/api/cron/auto-post` is publicly callable with no authentication** (O-51) | Anyone who finds the URL can trigger an outbound post, 3× scheduled daily. `pulse` has the same hole. Separately auto-post fails all three daily runs — and **`auto_posts` holds 0 rows ever, so it has never once succeeded** (O-53). | **One question, unchanged for fourteen days: does any of your buttons call `/api/cron/auto-post` directly?** If not, I add `isAuthorizedCron` to both and the hole closes. If yes, tell me which and I keep that path open. |
| **A whole blog post is premised on the Golden Visa still being open** | `src/lib/blog-posts.ts:942–1014`, "Spain Golden Visa and Property Investment: 2026 Status Update", stating "as of early 2026, the program remains active". Also `content/pr/spain-property-report-2025.md`, `content/parasite/linkedin-newbuild-investment.md`, `public/linkedin/10-what-i-wish-i-knew.md`. | **An article whose thesis is a false fact cannot be repaired by the "smallest possible edit" exception — the edit is the whole piece.** Your call: **(a) unpublish it**, or **(b) tell me to rewrite it as a status-update piece leading with the abolition** — genuinely the stronger SEO position, since most of the web still answers this question wrongly and the query has steady volume. |
| **CLAUDE.md carries a fact that has been false for four weeks — and it is your file, so I have not edited it** (O-87) | CLAUDE.md's AUDIT 2026-08-08 block says **"`property_pricing_history` has never held a move event … not one `reduced`/`increased` exists"**. **As of today it holds 167 `increased` (from 2026-08-12) and 40 `reduced` (from 08-14)** — the cron fix merged 08-08 started working four days later. The surrounding guidance is still right (`price_snapshots` IS the ground truth, because it is complete and per-ref-per-day) but the stated REASON has expired. I corrected the same claim in `src/lib/deltas.ts` today. | **One line from you, or permission to edit CLAUDE.md myself.** Suggested replacement for that sentence: *"`property_pricing_history` held no move events until 2026-08-12; it now logs them, but `price_snapshots` remains the ground truth for price movement because it is complete and per-ref-per-day. The two have never been reconciled — do not read moves from the event log without checking they agree."* |
| `HF_TOKEN` in CI | **The ONLY unverified corpus surface.** Site and avena-data mirror confirmed consistent again today, both `v2026-09-09` with identical `generated_at` (thirteenth correct prediction). HF returns 401 without a token, so three-way agreement is unproven. `push-training-data` confirms it nightly: **144 records built and thrown away** again this morning (05:00 UTC, `pushed: false`). | Store the HF write token as a repo secret so nightly pushes all three surfaces together. **The route accepts EITHER `HUGGINGFACE_TOKEN` or `HF_TOKEN` (checked in the code today, `push-training-data/route.ts:113`), so either name works — earlier entries here said `HF_TOKEN` and that is not wrong.** |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source ("most popular region for foreign buyers", tax/NIE/mortgage figures). Built to be quoted verbatim by AI assistants. | Either confirm the remaining prose accurate as written, or point me at a source. |
| **NEW — AwarioBot: do you still want it crawling at this volume?** (O-88) | **26,725 hits over 7 days across 2,276 paths — 2.8x Googlebot, and the largest single consumer of the origin by a wide margin.** Awario is brand-monitoring SaaS: it contributes nothing to search ranking or AI citation. **I was going to block it today and stopped, because `robots.ts` records your explicit yes on 2026-08-12 to its current treatment, with the rationale "mention-monitoring value survives at any crawl volume". A full `Disallow: /` overturns a call you personally made, so it is yours, not mine.** | **One line: (a) block it entirely — one-line change, instantly reversible, and I get a real experiment out of it (does Awario even honour robots.txt? nobody publishes that); (b) leave it exactly as is; or (c) tell me the monitoring matters and I will stop raising it.** **I have no Vercel cost figure, so I cannot tell you what it is costing you — if you can read that off the dashboard it would settle the question immediately.** |
| Bing Webmaster Tools read | Henrik claimed avenaterminal.com 2026-08-13. **The IndexNow read-out came due 09-09 and I could only report the secondary proxy** (OAI-SearchBot 292 hits / 123 paths — hits up 32%, distinct paths DOWN from 130; ChatGPT-User flat). **The primary metric — whether Bing is actually indexing what we submit — is the one that answers the experiment, and it is the one I cannot see.** | **Read Bing's index coverage + IndexNow submission status and paste me the numbers. If the IndexNow key shows rejected, say so loudly — that would mean 28 nightly submission runs have been no-ops.** No Bing API access, so this is a manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions/3 months, 129 URLs, /compare = 87%. UI-only/no API. | **Re-export due 2026-09-14 (FOUR days) as the read-out data for CompareLedgerPulse.** Without it that experiment joins the five already unmeasurable. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | GitHub Actions secret set, so nightly capture works; Vercel lacks it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

**2026-09-11 — O-82 FULLY CLOSED on our side (`d2a52ea`).** CBS landed on its
first scheduled run and every pre-registered number was met EXACTLY: `cbs` 0 →
**157 rows** (1995 → 2026-Q2, region pinned), sources 4 → **5**, total 17,525 →
**17,682**, `errors` still 1 and naming `istat HTTP 500` alone. **The half I
had flagged as INFERRED rather than observed — that production could actually
reach opendata.cbs.nl, which I could not test from the sandbox because its
egress gets 406 on every CBS url — is now observed, because 157 rows require a
200.** `istat` is the only dormant adapter left and it is genuinely upstream.

**2026-09-11 — `9053781`'s TRACKING half verified, and it passed on both
counts at once.** The served timestamp MOVED (a 20-hour-old `PRERENDER` from
09-10T09:39 regenerated to 2026-09-11T05:37:33Z on request), and the source
enum went from four entries to **five including `cbs` with no edit from me** —
so the spec genuinely derives rather than carrying a literal I happened to
ship. **Honest caveat kept rather than dropped: ISR regenerates only ON
REQUEST, so an unvisited spec can sit stale for any length of time. What makes
that safe is the DATED observation sentence, not the `revalidate = 3600`.**

**2026-09-11 — O-13 refuted for the second time.** PerplexityBot registers
**129 hits / 106 paths** over 7 days, up from 63/53 two days ago and from
"absent from the top 14" on 09-01. **The rule has now paid three times: a
crawler-absence finding is an observation over one window, never a property.**


**2026-09-10 — O-82's BIS half VERIFIED CLOSED (`10690b1`).** All three of its
own criteria met on the 09-10 04:15 scheduled run: `bis` 0 → **8,700 rows / 57
countries**, `errors` 2 → **1** (istat alone), duration 46.1s of 265s. The table
roughly doubled, 8,825 → 17,525, and BIS is now its largest source. **The fourth
criterion — that `/api/openapi.json` list four sources — FAILED, and it was
worth pre-registering: it exposed a defect in a DIFFERENT layer (a 24h-cached
spec asserting present-tense truth), fixed separately in `9053781`.** A
criterion that fails for a reason you did not predict is the useful kind.

**2026-09-10 — `/engine`'s meta description verified closed (`70e2d85`).** Both
halves now proven: the four false figures are gone (verified 09-09) AND the two
derived figures TRACKED a real book change overnight, 2,037 → 2,036 listings
and 1,464 → **1,463** underpriced homes. A frozen 1,464 was the discriminating
failure; it did not occur.

**2026-09-09 — O-83 (hardcoded book size) verified closed.** Shipped 09-08,
verified 09-09 on the discriminating criterion rather than the convenient one:
the served figure TRACKED the book across a change (2,034 → 2,037) instead of
freezing at the value I happened to ship. A derived number that has never been
observed to move is indistinguishable from a fresh literal, which is why the
check was pre-registered for the day after.

**2026-09-09 — O-82's BIS half fixed (`10690b1`), pending verification.** The
404 was the visible defect; the invisible one was that the parser could not
have reported a layout change — it would have returned zero rows with an empty
`errors[]`. Both fixed, 32 tests. `cbs` is now the last adapter of that shape.

| closed | what | outcome |
|---|---|---|
| 2026-09-11 | **Two PUBLIC agent-status endpoints published `status: "active"` as a string literal while both agents were comprehensively dead** | `1a1832d`. `/api/citation-agent/status` (Atlas, 12 consecutive failures, no measurement in 14 days) and `/api/prometheus/status` (26 consecutive failures) — both advertised in `/api/index` for AI agents to read. **The citation endpoint served `status: "active"` in the same payload as `last_run: "2026-08-28"`: it had read its own refutation and asserted health beside it.** Both `cadence` strings were also false (Atlas is Mon/Wed/Fri ×3, not "daily 03:00"; Prometheus fires 4×/day, not "daily 04:00"), and eight reads sat behind `catch { /* ignore */ }` defaulting to 0 — which `delta_vs_yesterday` then SUBTRACTED, so one failed read alone could publish a fabricated delta. **Fixed by derivation, not by editing the literals: status from `cron_logs`, cadence from `vercel.json`, `Measured<T>` so an unread value is null beside a recorded error and never enters arithmetic.** 48 tests; **the route-grep guard FAILED RED on its first run by matching my own explanatory comments — a real defect in the guard, since deleting the explanation would have turned it green — so it strips comments now, and I verified it still goes red on a genuine reintroduction and green again on restore.** Verified in production the same day on both endpoints | 
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

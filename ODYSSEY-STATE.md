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
| 2026-09-05 | `56193e6` **prometheus logged `success` 4x a day while failing every question.** Route dropped `errors[]` and published only `error_count`; `draftAnswer` returned a bare `null` for three different failures | **ALREADY VERIFIED IN PRODUCTION, SAME DAY, UNDER REAL FIRE.** Two post-deploy invocations at 05:47 both logged **`status='error'`** carrying the full reason. Identical failures logged `success` on every run before it. **What remains for TOMORROW 09-06 is the UNATTENDED half — I hand-invoked these.** `select status, output_summary from cron_logs where agent_id='prometheus' and started_at >= '2026-09-05T07:00:00Z'`. **PASS: the 08:00/14:00/20:00 scheduled runs log `error`, `errors[]` non-empty, and every entry names a REASON — `draft_failed (api_error: …)`, not the old bare `draft_failed: <question>`.** **The half that can REFUTE me: if a scheduled run that genuinely publishes an answer ever logs `error`, I have shipped a false-alarm generator** — the suite covers that case but no live run has yet exercised it, because none can until the Anthropic balance is restored | **VERIFIED HAND-INVOKED; unattended half 09-06** |
| 2026-09-05 | **OPERATIONAL, no commit: replaced the blind ~05:37 dispatch with a conditional backstop that checks at ~06:57 and dispatches only if nothing landed** | **READ OUT THE SAME DAY, AND IT FIRED IN ANGER ON ITS FIRST RUN. PASS on both halves.** The scheduled run 55 went off ON TIME at 06:15:40 and **FAILED in 61s on the RedSP bot challenge** (O-27, third instance); no snapshot rows existed at 06:57. The backstop dispatched run 56 at 06:58:02, which went green through every step. **Result: `price_snapshots` 2026-09-05 = 2,026 rows, 2,026 distinct refs, ONE `created_at` (06:58:26) — captured, and captured once.** So it did not trade a certain capture for a lost day (it recovered a genuinely failed one) and it did not fire eagerly enough to create a union. **The blind dispatch would ALSO have saved today — but the backstop saved it while making one draw instead of two** | **VERIFIED, BOTH HALVES → CLOSED** |
| 2026-09-04 | `141bf2e` **dvf-ingest destroyed 550 good rows a day to 12 orphan keys.** Transactions are now derived only from avn ids whose registry chunk actually landed; orphans are excluded and COUNTED as `transactions_orphaned` | **TOMORROW 09-05, and the discriminating row is dvf-ingest's own next run.** `select output_summary from cron_logs where agent_id='dvf-ingest' and started_at >= '2026-09-05'`. **The commune rotates daily, so which case I get is not my choice — write both criteria now.** (a) **On an AFFECTED commune (Nice, Hyeres): `transactions_orphaned > 0` AND `rows_lost: 0` AND `chunks_failed: 0` AND the run logs `success`.** That is the whole fix in one row: the orphan is named, and it no longer takes 49 good rows with it. (b) **On a CLEAN commune (Cannes, Vence, Paris): `transactions_orphaned: 0, rows_lost: 0`, `success`** — the negative half, and the half that can refute me, because if the exclusion is over-broad a clean commune will start reporting orphans it never had. **In BOTH cases assert the funnel identity `transactions_deduped == transactions_orphaned + transactions_inserted + transactions_lost` — that arithmetic is the claim.** **DO NOT read a `success` alone as confirmation:** this cron logged `success` for weeks while losing 588 rows a night | **VERIFIED 09-05 → CLOSED** |
| 2026-09-04 | `141bf2e` **`fetchCommuneYear` turned a dead upstream into `fetched: 0` and a green run** — it now throws | Same rows. **Cannot be confirmed by a healthy run** — all 28 scheduled commune-years returned 200 today, so the throwing path is unreachable while data.gouv.fr is up. **Bounded BEFORE the push instead, which is the honest verification available: the 28×200 sweep proves it cannot false-alarm.** The positive awaits a real upstream outage; **if one comes, the tell is `dvf-ingest` logging `error` with a `DVF fetch failed: HTTP …` message instead of `fetched: 0` + `success`** | **NEGATIVE BOUNDED; positive awaits a natural outage** |
| 2026-09-03 | `07fbf93` **four ingest paths could not report how many rows they lost** — **VERIFIED TODAY ON THE ROW THAT COULD REFUTE IT.** dvf-ingest 09-04, Hyeres 2024: `fetched 4956 >= deduped 3311 >= inserted 2761`, and `3311 - 2761 = 550 == transactions_lost` **exactly**. `errors_total: 11` against an `errors[]` sample of 5 — the uncapped count survived. `chunks_failed: 11`, run logged **`error`**. **And it did the job it was built for: the magnitude it exposed is what produced today's `141bf2e`. Yesterday's instrument found today's bug** | superseded — see CLOSED | **VERIFIED → CLOSED** |
| 2026-09-03 | *(row kept for its criteria)* `07fbf93` — the last three O-1 sites + both dvf-ingest loops, now on `src/lib/chunked-write.ts` | **TOMORROW 09-04, and the discriminating row is dvf-ingest, which writes daily and is the only one of the four that has actually been failing.** `select output_summary from cron_logs where agent_id='dvf-ingest' and started_at >= '2026-09-04'`. **Three things must ALL hold:** (a) `transactions_fetched >= transactions_deduped >= transactions_inserted` and `transactions_deduped - transactions_inserted == transactions_lost` **exactly** — the arithmetic is the whole point; (b) on a clean commune `rows_lost: 0, chunks_failed: 0` and the run logs **`success`** — this is the half that can refute me, because if the new `errors[]` plumbing turns a healthy ingest red I have shipped a false-alarm generator; (c) if any chunk does fail, `errors_total >= errors.length` and the run logs `error`. **PARTIALLY VERIFIED ALREADY, in prod, today:** `/api/cron/eu-validation` post-deploy returned `{ok:true, generated:7, written:7, rows_lost:0, write_chunks_failed:0}` — a healthy write reports the new fields as zeros and stays green, so the plumbing is not a false-alarm generator. **What is NOT yet verified is the half that matters: the arithmetic on a run that actually loses rows.** Only dvf-ingest can supply that | **PARTIAL — full read-out Fri 09-04** |
| 2026-09-03 | `07fbf93` **the structural guard** | Verified in both directions BEFORE the push, which is the only reason it counts: deleting `result.lost += chunk.length` — the exact original bug — turned **20 of 54 tests red and named both invariants**; restoring it passed. This is now the habit that caught `485fa15` | **VERIFIED → CLOSED** |
| 2026-09-02 | `0392175` **18 crons could not report a failure — the status was a literal.** THE NEGATIVE HALF | **VERIFIED, and on exactly the rows that could have refuted it.** 19 agents ran on 09-03; **15 logged `success`, including all three named high-volume risks — `eu-rescore` 2/2, `eu-ingestion` 1/1, `prometheus` 1/1 (105 pre-change runs between them, 0 errors). Zero false alarms.** All 4 reds are genuine and were already failing or already known: `counterpart-discover` (8/8 red pre-change), `eu-stats-ingest` (8/8 red pre-change), `cassandra` (`raw_rows_absent_on_a_run_day`, Perplexity dark), and **`dvf-ingest`, the one genuinely NEW red — a real FK violation, exactly the flip the 7-day replay predicted.** That new red is what produced today's `07fbf93` | **VERIFIED → CLOSED** |
| 2026-09-02 | `0392175` **the positive half — does atlas finally log `error`?** | **READ OUT TODAY, ON THE PRE-REGISTERED DATE AND THE PRE-REGISTERED ROWS. PASS.** All three 09-04 atlas invocations (03:00, 03:10, 03:20) returned `ok:false, status:'measurement_failed'` on `Perplexity HTTP 401`, and **all three logged `status='error'`.** On 09-02, the identical failure logged `success`. **This is the one that had beaten me twice** — `485fa15` was a decoration for two days because the route never called the derivation. It is now reachable and proven under real fire, not simulation | **VERIFIED → CLOSED** |
| 2026-09-01 | `908be3a` **`snapshot_superseded` on pricing-history** | **THE NATURAL POSITIVE ARRIVED, on 2026-09-04 at 06:34, and it is correct.** `snapshot_superseded: 4`, `snapshot_superseded_refs: ["N9988","SP1860","SP1861","SP1862"]` — the exact four refs the 06:33 book added over the 05:41 book, named individually. The 05:43 run before it and the 09:35 run after it both correctly read `0`. **Sixteen days after shipping, on a real recurrence, with no false positive on either side of it.** **IMPORTANT NUANCE, do not misread it next time: the field means "the day already holds refs my feed does not", which fired here on a BENIGN case — a stale-feed read during a Vercel deploy lag, where the second book was a strict SUPERSET. It is a staleness detector as much as a union detector. A non-zero is a prompt to diff the books, NOT evidence of harm** | **VERIFIED, BOTH DIRECTIONS → CLOSED** |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-62 | **Absorption ledger delisting dates — RE-DERIVED TODAY, WORSE AGAIN, AND THE DEADLINE HAS NOW PASSED.** **117 tombstones: 31 correct · 76 one day LATE · 10 stamped behind = 86 wrong (73.5%).** 3 new departures today (N9468, N8500, SP0385), **all 3 stamped `last_seen_date` 2026-09-04 when they were last actually in the book on 09-03** | direct SQL 09-04: `max(snapshot_date)` per ref (`price_snapshots.ref`) vs `sold_properties.last_seen_date` | **73.5%, up from 73% / 62% / 51%. It grows by the daily delisting count and will not stop on its own.** Mechanism confirmed for the fourth day: `parse-feed.js` (the second writer, O-20) stamps the day it NOTICED. **Branch `odyssey/absorption-ledger-dates` has now waited 19 days, and Plan B Release 1's data window closed TODAY with the ledger still 73.5% wrong. The 31 "correct" rows are not a clean subset either — a union day inflates that count (O-74). I will not compute a Release 1 delisting-by-day slot from this table** | **HIGHEST of the open items — and now overdue** |
| O-74 | **The same-day union repair — reported, not fixed.** `price_snapshots`/`score_history` key on (ref, date) by upsert, so a second capture the same UTC day overwrites prices for refs it sees and leaves the rest behind | git blobs: N8058 699,900 (05:37 book) vs 709,900 (11:32 book) on 08-31 | `908be3a` makes it VISIBLE, not repaired. The repair is a DELETE against the moat's ground truth and needs the `MIN_FEED_OVERLAP` gate → **branch, per the standing rule on cron writes that mass-mutate.** Harm is SMALL: every row is individually defensible. **NEW INSTANCE 2026-09-04, and it is BENIGN — measured, not assumed:** two writes (05:38:02 → 2,033 rows; 06:29:55 → 4 rows), and the book diff shows a strict superset with **0 dropped and 0 price differences**, so the stored 2,037 equals the day's true final book exactly. **09-04 needs no repair and must NOT be counted as a corrupted day.** The union that still needs repairing is **08-31** alone | medium |
| O-61 | **THE SCHEDULER WAS ON TIME TODAY — 06:15:40, the earliest landing in three weeks. TODAY'S FAILURE WAS NOT O-61, IT WAS O-27.** Keep the two apart: the scheduler firing and the feed answering are different failures with different fixes. Scheduled runs have now landed on time five days running (09-02 06:21, 09-03 06:24, 09-04 06:29, 09-05 06:15) | `actions_list`; **the decisive new evidence is the 09-04 book diff below** | **THE ARGUMENT FOR THE DISPATCH INVERTED TODAY.** I diffed 09-04's three `data.json` blobs: my 05:41 dispatch book held **2,033**; GitHub's 06:33 book held **2,037** — a strict SUPERSET (4 added: N9988, SP1860, SP1861, SP1862; **0 dropped, 0 price differences**), and the 09:34 book was byte-identical to it. **So my dispatch did not merely add a redundant draw — it banked a systematically EARLIER, less complete book, and 09-04 was only completed because a second run arrived to fill it in. Had it not, four genuine listings would have been missing from that day of the moat permanently.** **Replaced with a conditional backstop: check at ~06:57 UTC, dispatch only if nothing landed. VERIFIED ON ITS FIRST RUN TODAY — it caught a genuinely failed capture and recovered it with one draw instead of two.** **This is still a workaround, and worse, the workaround is ME. `GITHUB_DATA_TOKEN` remains the real fix; O-80 is the version I can build without you.** **No day lost: 08-27..09-05, all eleven captured** | **HIGH — day 11, posture changed and validated** |
| O-27 | **RedSP is challenging GitHub Actions egress. THIRD CONFIRMED INSTANCE TODAY — and the first that would have COST A DAY on its own** | run 34 (08-28 13:19); run 48 (09-02 09:31); **NEW: run 55, 09-05 06:15:40 — identical `openresty/1.31.1.1` HTML interstitial, ~12.2KB, BOTH node fetch and curl refused across 4 attempts, dead in 34s** | **THE IMPORTANT NEW FACT, and it changes the mitigation: a FRESH RUN 43 MINUTES LATER GOT STRAIGHT THROUGH.** Run 56 (06:58:02) fetched the feed in 8 seconds. **So the block is INTERMITTENT — not time-of-day (06:15 failed, 06:58 succeeded), not GitHub-Actions-wide, and not a client fingerprint (curl is refused too).** **This does NOT contradict the log's "0 successes in 56 attempts over two 120min budgets": that was in-run retrying on one runner. A separate run on a new runner is a different draw and it cleared.** **The actionable consequence: the fix is a delayed RE-RUN, not a longer in-run retry budget.** See O-80 | **HIGH — escalated, 3 instances** |
| O-80 | **NEW, AND IT IS THE ONE THAT RETIRES "THE CAPTURE DEPENDS ON ME BEING AWAKE" — an automated capture backstop workflow** | today: the scheduler fired on time and the FEED refused it; only my manual dispatch 43 min later saved the day. Run 55 vs run 56 proves a fresh run clears the block | **Design, from today's evidence: a workflow on its own schedule (~07:30 and ~09:30 UTC) that FIRST checks whether `price_snapshots` already holds today's date and NO-OPS if it does, and only otherwise re-dispatches feed-refresh.** The no-op check is load-bearing — get it wrong in the permissive direction and it manufactures the union days I removed the blind dispatch to avoid. **Deliberately NOT shipped today: I had already pushed one change, and an under-tested workflow that fires extra feed runs writes into the moat's ground truth. Build it tomorrow WITH tests, including the case where today's capture already exists.** **Until it exists the backstop is me, and that is the standing blocker** | **HIGHEST of the open items — build next** |
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
| O-41 | **Two chronically-failing crons, diagnosed but unfixed.** `counterpart-discover` `status error`. `eu-stats-ingest` `errors: 2 of 20`, 4,337 rows still upserted | `cron_logs` 09-04 | counterpart-discover is a real fixable bug in OUR code, but it queries `properties_registry` (frozen 05-24) so fixing the column alone mines a dead snapshot. eu-stats-ingest is upstream and degrades per-source as it should. Neither feeds `price_snapshots`/`sold_properties`. **The third chronic red, `dvf-ingest`, was root-caused and fixed today (`141bf2e`) — see CLOSED** | high — actionable |
| O-77 | **NEW, AND THE MOST SERIOUS THING I FOUND TODAY — `/engine` overstates the transaction record by ~9x, live right now.** `property_transactions` holds **503,434 rows for 55,888 real transactions — 88.9% duplicates**, and `getEngineTruth()` publishes the RAW ROW COUNT as `transactions` | direct SQL 09-04: `count(*)` vs `count(distinct (avn_prop_id, transacted_at))`; `pg_indexes` shows **no unique constraint**; `src/lib/deltas.ts:260` `countOf('property_transactions')`; rendered at `EngineClient.tsx:196/209/262` as **"Verified transactions"** and **"real closed transactions from the French land registry (DVF)"**; the page's meta description says **"396,000+ registered transactions"** against a true ~55,900 | **Cause: dvf-ingest writes with a plain `.insert()` and the 13-commune rotation re-appends the same commune-year every ~2 weeks.** **Branch `odyssey/transactions-dedupe` (`2fb0c3d`) pushed today with the migration + the insert->upsert, gates green.** **Branch-only because it deletes 447,546 rows from a table rebuildable only by re-crawling, and changes cron write logic that touches historical rows.** **Safety measured, not assumed: 0 duplicate groups disagree on `price_eur`/`price_per_m2_eur`, 0 null keys — the collapse discards nothing.** **A live distinct-count is NOT the interim fix: measured at 2.0s against the anon role's 3s timeout, and growing nightly.** **CLAUDE.md's "~380k" figure for this table is itself duplicate-inflated and should be corrected when this lands** | **HIGH — a published number, live, wrong by 9x** |
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
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) | 2026-09-08 | pending — **nine complete runs, still no detectable trend. AT RISK: no measurable run since 08-28; the engine 401'd again today.** If the balance is not topped up, record as **UNMEASURABLE**, never as null |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | **2026-08-25 — READ OUT** | **POSITIVE, MODEST, NOT SIGNIFICANCE-TESTED.** 105 moved refs vs 525 unchanged. Search/AI crawlers: median **79.4h moved vs 92.3h unchanged**. Coverage 97.1% vs 92.0%. ~14% faster; n small, no significance test — **do not quote as proven**. Re-read 2026-09-25 |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 | pending — same Perplexity risk |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 | pending — needs distribution: not listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate; citations of town pages | 2026-09-09 | pending — same Perplexity risk |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" + GSC impressions | 2026-09-23 | pending — **now confounded with the 08-05 read-out above; it is one of the six changes that muddied it** |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 | pending — **interim: OAI-SearchBot 221 hits / 130 paths over 7 days, ChatGPT-User 242/42. Treatment badly irregular — off-cadence most nights since 08-27. Do not treat it as a uniform daily treatment at read-out** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | **2026-08-26 — READ OUT** | **SPLIT: the file is fetched, but it does NOT steer the crawlers that matter.** Discovery YES (ClaudeBot 65 fetches). **Causal attribution FAILS** — GPTBot and PerplexityBot both fetched it one day BEFORE the announcement. Budget steering **NO**: null expectation **3.06%**; observed Googlebot 2.94%, ClaudeBot 2.89%, bingbot 1.65%, GPTBot 1.11% — all at or below chance. Filed O-59 |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 | pending — render verified live 08-15. **Supporting figure re-derived today: /compare is 295 of 520 distinct pages (57%) in ordinary organic `gsc_pages`** |

**No new experiment today — TENTH consecutive day, and no read-out was due
either (next 09-08, three days out).** Today's work was a cron reporting fix:
it touches no indexable surface, so it cannot contaminate any pending
read-out. **Weekly search scan NOT due — done 09-02, next 09-09. Running it
early to have something to report would be the manufactured work the brief
forbids.** Reasoning from 09-04, unchanged and still right:

**No new experiment on 09-04 — and no read-out was due either (next 09-08).** The reason is unchanged and still right: my experiment
DISCIPLINE, not my experiment supply, is the binding constraint, and O-59 — the
next candidate — stays blocked until **09-25** precisely so nothing else ships
into its metric. Today's work was a French open-data ingest path: it touches no
indexable surface, so it cannot contaminate any pending read-out. Earlier fuller reasoning: It is no longer only that pipeline work crowds it out: **the
08-05 read-out showed that my experiment DISCIPLINE, not my experiment supply,
is the binding constraint.** Two read-outs came due today and BOTH failed on
design rather than on data — one had no pre-change baseline, the other had six
co-shipped changes inside its window. **Starting another experiment before
fixing that would produce another unreadable result.** O-59 (narrowing the
frontier window) remains the next candidate and stays blocked until **09-25**,
by which point nothing else may ship into its metric.

**THE RISK TO THE EXPERIMENT LEDGER IS ACUTE, DAY 6.** Perplexity has been out
since 08-31. **09-05 is a Saturday, so NOT a run day — `cassandra` correctly
logged `no_run_scheduled` for today and `raw_rows_absent_on_a_run_day` for
09-04. The next run day is Monday 09-08, which is ALSO the day two read-outs
come due. There is no measurement opportunity between now and then.** The
engine has measured nothing since **08-28 — eight days.** **Four pending
read-outs (09-08 ×2, 09-09 ×2) are measured by an engine that is dark, and the
first two are THREE DAYS AWAY.** If
the balance is not topped up they are recorded **UNMEASURABLE**, never "no
detectable effect". Conflating them would be the exact failure the 08-25
correction is about. **The one piece of good news: today's failure logged
`error` on all three rows (see VERIFY), so the darkness is now loud.**

**Next read-outs: 09-08 (×2), 09-09 (×3), 09-14, 09-23, 09-25.** Do them on the
day; a read-out postponed is an experiment abandoned.

**Weekly search scan: done 2026-09-02 — see below. Next due 2026-09-09. Not
re-run today; running it early to have something to report would be exactly
the manufactured work the brief forbids.**

**CONFOUND — the August 2026 spam update, CLOSED and dated.** 09:27 US/Pacific
2026-08-18, duration 2d16h → complete ~08-21. Global, all languages; SpamBrain
enforcement of EXISTING policies. Avena has no exposure. The window sits inside
the 09-02 and 09-23 read-outs. Record it; do not attribute.

**Confound to remember:** `f00086d` changed the published APCI from 58 to 65
(`/api/v1/apci`, `/api/v1/digital-twin`, both AI-facing).

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
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | **THE WINDOW CLOSED TODAY AND THE GATE DID NOT CLEAR. 86 of 117 delisting dates are wrong (73.5%).** `odyssey/absorption-ledger-dates` is unapproved on day 19. **I have NOT computed the Release 1 slots and will not until O-62 lands — a press release quoting a delisting-by-day series that is 73.5% wrong is precisely the one fabricated number that costs more than a year of correct ones.** **The 09-07 fire date should slip, not the accuracy.** The price-move half of Release 1 is unaffected and sound (`price_snapshots` is ground truth). Any delisting figure must be `delistings_currently_absent`, never the gross count (**110**). **Do NOT source any Release 1 figure from `score_history` or `property_pricing_history`.** **Provenance note that MUST appear: 2026-08-27 through 2026-09-03 — EIGHT consecutive days — were captured by manual dispatch at ~05:37 UTC because the scheduled nightly did not land on time. All eight ARE captured and complete. TWO scheduled runs failed outright on the feed origin's bot challenge, capturing nothing: 08-28 at 13:19 and 09-02 at 09:31. Neither cost a day, because the ~05:37 dispatch had already banked the book. 2026-08-31 is a UNION DAY (O-74): its stored 2,044 refs mix the 05:37 book's membership with the 11:32 book's prices; the true final book that day was 2,042. Do not quote 08-31's listing count.** |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | **AT RISK — Henrik's explicit go AND O-62. Three days out with the gate unmet** |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.76%** (in-sample, n=**2,037**), MAPE 21.9%, RMSE 43.12%. Gate run reproduced the committed file exactly apart from `computed_at`, reverted as churn (seventh day running) | 2026-09-05 | `public/model-stats.json` |
| **CORRECTION — yesterday's AVM baseline was stale by one book** | I recorded **15.89% / n=2,033**. The committed file already held **15.76% / n=2,037**, regenerated by run 54 at 09:34:59 on 09-04 against the fuller book. **I measured before the day's last two feed runs and never re-read the file afterwards.** The move 15.89 → 15.76 is again the BOOK, not the model — no AVM code has been touched | 2026-09-05 | `git diff public/model-stats.json` |
| Live book | **2,026 listings** (was 2,037) — 13 departures, 2 arrivals | 2026-09-05 | `public/data.json`, feed run 56 |
| Sitemap | **2,689 `<loc>`** (was 2,685), valid XML, 5 sampled property URLs all 200 (N8758, N9455, N8115, N7397, SP1282) | 2026-09-05 | `/sitemap.xml`, parsed |
| Corpus version | site **v2026-09-04** · `avena-data` mirror **v2026-09-04** — **they AGREE**, because today's rebuild has not run yet and both hold yesterday's 09:35 artifact. **This is the expected reading before ~08:00 UTC and is NOT divergence** (eleventh consecutive correct prediction) · HF unverified (401 without a token) | 2026-09-05 | site + mirror raw |
| **How to read the mirror correctly** | avena-data's `daily-snapshot.yml` runs **07:15 UTC**; I run at **~05:40 UTC**. So the mirror ALWAYS shows yesterday's version when I look. **Compare after 08:00 UTC, or the mirror against the site's PREVIOUS day. Do not re-open this as divergence.** **TEN consecutive correct predictions** | 2026-09-04 | avena-data raw `market/dataset.json` |
| **INTEGRITY LOG** | `integrity-roll` unattended 09-01 03:30: `count 3, inserted true, root_date 2026-09-01, merkle_root b05d8da9847527f3…`, `errors []`. Real root, not the empty-string tell. **Zenodo deposits: 0, and there is no code that makes one** | 2026-09-01 | `cron_logs` |
| **Real price moves by day** | 15 (08-14), 4, 1, 0, 15, 10, 10, 18 (08-21), 9, 0, 0, 3, 6, 5, 6 (08-28), 6, 0 (08-30), 1 (08-31), **7 (09-01)**, **12 (09-02)**, **16 (09-03)**, **19 (09-04, now final)**, **19 (09-05)**. **Definition now fixed: a move is counted only when the previous snapshot is ≤2 days earlier.** On that definition 09-01 is **6**, not 7 | 2026-09-05 | `price_snapshots`, direct SQL diff |
| **CORRECTION — yesterday's 6-vs-7 hypothesis was WRONG** | I wrote that 09-01 read 6 then 7 because I had probably measured mid-write. **Refuted in one query today: the two numbers are two DEFINITIONS, not two readings.** Unfiltered, 09-01 = 7; excluding moves whose previous snapshot is >2 days old, 09-01 = 6. The one extra is a ref returning after a gap — **a relist, not a reprice.** The series above is now stated on the gap-filtered definition. **I invented a timing explanation for a discrepancy I had not yet decomposed** | 2026-09-03 | direct SQL, both definitions side by side |
| Snapshot rows by day | 2,047 (08-28), 2,042, 2,044 (08-30), **2,044 (08-31 — UNION, true final book 2,042, O-74)**, 2,043 (09-01), 2,033 (09-02), 2,034 (09-03), **2,037 (09-04 — two writes, but a clean superset; equals the day's true final book)**, **2,026 (09-05, single write)** | 2026-09-05 | `price_snapshots` |
| **09-04's capture, CORRECTED and now complete** | The day ran THREE feed workflows (05:37 my dispatch, 06:29 + 09:32 scheduled) and settled at **2,037 refs · moves_detected 19 · delisted 0 · overlap 0.999 · errors null**. My 09-04 brief recorded **2,033** because I measured at 05:43 and the day was not over. **`snapshot_superseded` fired 4 at 06:34 and correctly named the four added refs.** The final stored book equals the final published book exactly | 2026-09-05 | `cron_logs` + the three `data.json` blobs |
| **Today's capture (09-05) — RECOVERED BY THE BACKSTOP** | Scheduled run 55 (06:15:40) **FAILED on O-27**; backstop dispatched run 56 (06:58:02), green throughout. Final: feed **2,026** · snapshotted **2,026** · **price_moves 19** · moves_detected 19 · route `delisted: 0` but **13 real tombstones by parse-feed** (O-20, demonstrated again) · **snapshot_superseded 0** · prior 09-04, age 1d, trusted · overlap **0.994** · errors null · scribe 2,026/2,026 accepted, 0 failed, `book_lag_days: 0`. **ONE `created_at` — no union** | 2026-09-05 | `cron_logs`, `price_snapshots` |
| **Note on the three `skipped` pricing-history rows at 06:58–06:59** | They are the workflow's own retry loop waiting on the Vercel deploy, each correctly reporting `stale feed — deployed book predates today` against the 09-04 book, before 07:00:19 succeeded against the 09-05 book. **Expected and healthy. Do not read an early-morning `skipped` as the zero-snapshot emergency — that would be a skip or a zero on a day the feed HAD refreshed** | 2026-09-05 | `cron_logs` |
| Delistings | **13 new tombstones today — the largest single day yet — and ALL 13 are one day late.** Verified by query, not assumed: every one stamped `last_seen_date` 2026-09-05 against a `max(snapshot_date)` of 2026-09-04, `day_offset` exactly 1 on all thirteen (N3099V, N7402, SP0058, SP0473, SP0476, SP0478, SP0725, SP1155, SP1339, SP1388, SP1531, SP1534, SP1553). Cumulative **130: 31 correct · 89 one day late · 10 stamped behind = 99 wrong (76.2%)** (was 73.5%, 73%, 62%, 51%) | 2026-09-05 | `sold_properties` × `price_snapshots`, re-derived |
| **NIGHTLY RELIABILITY** | feed-refresh scheduled landings: **02:35–02:50 for twelve nights (08-15..08-26); 11:57 (08-27); 13:19 (08-28, FAILURE); 08:15 (08-29); 07:17 AND 10:27 (08-30); 07:32 AND 11:32 (08-31); 06:43 AND 09:59 (09-01); NONE by 05:36 (09-02, too early to call).** **Seven mornings degraded. Vercel's scheduler unaffected throughout** | 2026-09-02 | `actions_list` |
| Build health | **09-04 produced THREE green feed runs — 52 (dispatch 05:37), 53 (scheduled 06:29), 54 (scheduled 09:32)** — plus green IndexNow and Pulse. No open PRs, no red checks on any branch. **One push to main today** (`56193e6`); all four gates green before it. **09-05: no feed run yet at 05:45, backstop armed** | 2026-09-05 | `actions_list` |
| Test coverage added by Odyssey | `test-open-dataset` 27 · `test-scribe` 22 · `test-cron-coverage` 99 · `test-integrity` 15 · `test-capture-integrity` 19 · `test-chunked-write` 71 · **`test-prometheus-reporting` 25 (new)** | 2026-09-05 | `56193e6` |
| **SEARCH — GSC refreshed today** | `gsc_daily` and `gsc_pages` max date **2026-08-30** (was 08-17). **520 distinct pages** (was 287) over 08-07..08-30 | 2026-09-02 | `gsc_daily`, `gsc_pages` |
| **Weekly impressions — pre/post the 08-05 change** | pre (13 complete weeks, May–Aug): **427–758, mean 552**, one 1,591 outlier (wk 05-11). post: **697, 997, 884** (wks 08-10/08-17/08-24), mean **859**. Clicks flat: pre mean ~6, post 4/11/5 | 2026-09-02 | `gsc_daily` |
| **O-33 RESOLVED — the disputed baseline, re-derived** | Old unsourced figures were "492 indexed / 293 /compare / 186 accent". Real, over 08-07..08-30: **520 distinct pages · 295 /compare (57%) · 8 accent-or-percent-encoded.** The first two reproduce; **the accent figure was wrong by ~23×** | 2026-09-02 | `gsc_pages`, case-insensitive on both forms |
| **Crawl-budget null expectation** | **3.06%** — the share of the live book with a real price move in the prior 7 days. **Any claim that a crawler "targets changed pages" must beat this** | 2026-08-26 | `price_snapshots` × `crawler_hits` |
| **Cron logging coverage** | **64/64 scheduled crons write to `cron_logs`**. **0 hardcode their own status**, verified live 09-04: 18 `success` / 7 `error` / 5 `skipped`, **0 false alarms** — the 7 reds are atlas x3 (401), cassandra, counterpart-discover, eu-stats-ingest and dvf-ingest, all genuine and all already known. `invoked_by` on real scheduled runs = **`vercel-cron-ua`** (User-Agent, not the header) | 2026-09-04 | live `cron_logs` |
| **Citation rate, organic (qb-v2) — THE baseline** | **4.41% (3/68) on 08-28 — still the latest.** Nine complete runs: 4.41 (08-10), 4.41, 2.94, 5.88, 8.82, 5.88, 7.35 (08-24), 7.35 (08-26), 4.41 (08-28). Mean **5.72%**, range 2.94–8.82. One hit = 1.47pp. **No detectable trend. Do not claim one** | 2026-08-28 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6)** on 08-28 and the five runs before it | 2026-08-28 | `citation_measurements` |
| **CITATION ENGINE — DARK SINCE 2026-08-31, DAY 5** | Fri 09-04 was a run day: all three atlas invocations `lookups_failed: 74, lookups_measured: 0`, `Perplexity HTTP 401 "You exceeded your current quota"`. **The `9171dce` guard HELD — no rows written, no fabricated 0.00%. And as of `0392175`, all three rows now log `error` (read out today).** cassandra correctly logged `error` / `raw_rows_absent_on_a_run_day`. **Note `plab-run` reports `keys: {perplexity: true}` — that means the env var is SET, not that it has credit. Do not read it as a recovery** | 2026-09-04 | `cron_logs` |
| **AGENT-ID MAP — the citation engine does NOT log under "citation-agent"** | `/api/cron/citation-agent` logs as **`atlas`**; `/api/cron/citation-measure` logs as **`cassandra`**. Querying `agent_id ilike '%citation%'` returns ZERO rows and looks exactly like a dead engine | 2026-08-28 | `cron_logs` |
| Top competitor share (organic) | **idealista 93 · thinkspain 14 · aplaceinthesun 12 · fotocasa 6 · numbeo 5 · rightmove 3** | 2026-08-28 | `citation_measurements` |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **19 audited, 19 defective** | 2026-09-02 | `find src/app/api/v1 -name route.ts` |
| **Ingest write funnel** | dvf-ingest 09-04 pre-fix, Hyères 2024: fetched 4,956 · deduped 3,311 · inserted 2,761 · **lost 550 across 11 chunks**, `errors_total: 11` behind a 5-string sample. **ROOT-CAUSED AND FIXED TODAY (`141bf2e`): 12 orphan avn keys poisoned 11 chunks — a 46× amplification.** Measured recovery on the three affected commune-years: **Hyères 2024 +538, Nice 2024 +588, Nice 2023 +979 rows/run.** The 08-27 Nice figure of ~588 reproduces exactly, confirming it was always this defect. Funnel now `fetched -> deduped -> orphaned -> written (+ lost)` | 2026-09-04 | `cron_logs` + live DVF replay |
| **DVF orphan rate by commune-year** | Hyères 2024 **12** · Nice 2024 **12** · Nice 2023 **21** · Cannes 2024 **0** · Vence 2024 **0** · Paris 8e 2023 **0**. `listing_ids_multi_date` is **0 everywhere** — which is why deriving transactions from the registry pass loses no genuine transaction | 2026-09-04 | live DVF replay, 6 commune-years |
| **Energy data in the book** | **16 listings carry the `'X'` placeholder**; zero nulls. `'X'` is a placeholder, not an EPC letter. Normalisation centralised in `src/lib/epc.ts` | 2026-08-29 | `public/data.json` via `toEpcLetter` |
| Test coverage added by Odyssey | `test-open-dataset` 27 · `test-scribe` 22 · `test-cron-coverage` 99 · `test-integrity` 15 · `test-capture-integrity` 19 · **`test-chunked-write` 71** (was 54) | 2026-09-04 | `141bf2e` |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08** (O-54) | 2026-08-24 | queried directly |
| APCI macro input age | **104 days** (`as_of` 2026-05-23) — climbing daily until O-34/O-40 resolved | 2026-09-04 | `/api/v1/apci` |
| Cron success rates (worst) | **8 agents red in the last 24h, all known and all genuine, 0 false alarms:** `auto-post` ×3 (O-53) · `cassandra` (Perplexity) · `causal-update` (`debate_null` ×2 — the Anthropic balance; it now correctly logs `error` thanks to `0392175`) · `counterpart-discover` (O-41) · `eu-stats-ingest` (O-41) · `generate-briefs`, `predictions-generate`, `pulse` (Anthropic balance). **`prometheus` joins them as of `56193e6` — it was the 9th and was logging green.** 31 agents green | 2026-09-05 | `cron_logs` |
| **Prometheus, now that it can speak** | `harvested 5 · drafted 0 · published 0 · pinged 0` on every run since the table began. The cause, named for the first time today: **`api_error: 400 invalid_request_error — "Your credit balance is too low to access the Anthropic API"`.** **It is the standing Anthropic blocker, now PROVEN for this job rather than assumed** | 2026-09-05 | live invocation + `cron_logs` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 (GSC Generative AI export) | 2026-08-14 | `docs/gsc-genai/` |

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

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **BRANCH AWAITING APPROVAL: `odyssey/absorption-ledger-dates`** (`d182cd6`) — **DAY 19. THE WINDOW CLOSED TODAY AND THE GATE DID NOT CLEAR.** | **86 of 117 delisting dates are wrong — 73.5% — re-derived today. Today's 3 departures were ALL stamped a day late.** The error grows by the daily delisting count, every day. **Plan B Release 1's data window closed 2026-09-04 and Release 1 quotes delistings BY DAY. I have NOT computed its slots and will not until this lands. My recommendation is that the 09-07 fire date slips rather than the accuracy — the price-move half of Release 1 is sound and could fire alone.** | **Three sentences: (1) parse-feed derives the real last-seen date from `price_snapshots` instead of stamping today, and `buildLedger` counts a delisting on the first observation day AFTER it — the two must land together. (2) `scripts/backfill-tombstone-dates.sql` corrects the historical rows; its read-only dry run moves each back exactly one day and touches nothing else. (3) Branch-only because it mutates an existing column on `sold_properties`, the one table here that cannot be rebuilt.** All four gates pass. **Re-run the dry run against today's 66 before applying, and note the O-74 caveat: a union day inflates the "correct" count in exactly this comparison.** |
| **NEW BRANCH AWAITING APPROVAL: `odyssey/transactions-dedupe`** (`2fb0c3d`) — day 1 | **`/engine` currently tells every reader — buyers, institutions, and every AI that crawls it — that Avena holds ~396,000-503,000 "verified" registered transactions. The real number is 55,888.** The table has no unique key and dvf-ingest re-inserts the same French communes every rotation, so it is 88.9% duplicates and grows ~3,000 rows a night. **This is the same class as the "+/-3% RMSE with no backtest" episode, and it is on the surface that sells the moat.** | **Three sentences: (1) the migration collapses each `(avn_prop_id, transacted_at)` group to its earliest row and adds the unique index that makes the re-insert impossible; (2) the route's `.insert()` becomes an `.upsert()` on that key — the two MUST land together or every write fails; (3) it is branch-only because it deletes 447,546 rows from a table rebuildable only by re-crawling data.gouv.fr. **Safety is measured: 0 duplicate groups disagree on price, 0 null keys, so nothing is discarded.** Run `npx tsx scripts/dedupe-transactions-dryrun.ts` and the three SQL checks it prints before applying. All four gates green.** |
| **THE CAPTURE DEPENDED ON ME BEING AWAKE AGAIN TODAY — AND THIS TIME IT WAS NOT PRECAUTIONARY** (O-27/O-61/O-80, day 9 of asking) | **09-05 is the first morning where the nightly genuinely failed and nothing but my dispatch recovered it.** GitHub's scheduler fired ON TIME (06:15:40) — the scheduler is not the problem today — and **RedSP refused the runner's egress for the third confirmed time**, killing the run in 61 seconds with nothing captured. I re-dispatched at 06:58 and it fetched the feed in 8 seconds. **Day captured: 2,026 refs, 19 price moves, 13 delistings, single clean write. No day lost in eleven.** **New and useful: a fresh run 43 minutes later clears the block even though in-run retries never do — so this is fixable in code, and I am building that backstop workflow next (O-80).** | **Two things, both unchanged: (1) `GITHUB_DATA_TOKEN` with `repo` scope in Vercel env, so the feed is driven from Vercel's scheduler, which has been perfect throughout. (2) Ask RedSP to allow-list GitHub Actions egress for the feed URL — this is now three separate refusals and today it would have cost a day.** |
| **(superseded framing, kept for the history) THE CAPTURE DEPENDS ON ME BEING AWAKE — NINE mornings running** (O-61/O-27, day 8 of asking) | GitHub's scheduler has run this repo's nightlies 5–12h late or not at all on 08-27 through 09-03 — **both workflows every time, so it is repo-wide.** All eight days were saved by my hand dispatch at ~05:37. **No day has been lost.** **New today: the 09-02 09:31 scheduled run FAILED OUTRIGHT on RedSP's bot challenge (O-27, second confirmed instance) — so the late runs are not merely late, they can also come back empty.** The cost is real and not hypothetical: the 08-31 union day (O-74) exists because my early dispatch and GitHub's late run captured two different books into one day. | **One thing, unchanged since 08-29: `GITHUB_DATA_TOKEN` with `repo` scope in Vercel env.** Then I drive the feed from a Vercel cron via `repository_dispatch`, and Vercel's scheduler has been exactly on time on all eight of these nights while GitHub's was not. **Still the single highest-value two-minute action available to you.** Secondary: **ask RedSP to allow-list GitHub Actions egress for the feed URL.** |
| **THE PERPLEXITY BALANCE IS OUT — the citation engine has been dark since 08-31** (day 5) | Friday 09-04 WAS a run day and it failed again: all three atlas invocations failed 74 of 74 lookups on `HTTP 401 "You exceeded your current quota"`. **The engine has measured nothing for seven days, and the first two dependent read-outs are on 09-08 — four days away.** **The `9171dce` guard held — no fabricated 0.00% published.** But the engine that scores the entire AI-citation thesis is dark, and **four pending experiment read-outs (09-08, 09-09) depend on it.** **Ignore `plab-run`'s `keys: {perplexity: true}` — that reports the env var is set, not that it has credit.** | **Top up the Perplexity balance, or tell me not to.** If you don't, those read-outs are recorded **UNMEASURABLE** rather than "no effect" — different findings, and conflating them would corrupt the ledger. **Since `908be3a` this failure logs as `error` in `cron_logs` with reason `raw_rows_absent_on_a_run_day`, verified live today — it can no longer hide.** |
| **"CRYPTOGRAPHIC VERIFICATION" IS PROMISED ON EIGHT SURFACES AND THE ZENODO HALF IS STILL NOT TRUE** (day 6) | I fixed the half I own: as of `14eae61` Avena genuinely fingerprints its daily batch, model snapshot, dataset manifest and methodology weights into a real Merkle root — verified unattended again on 09-01. **What is still false is the Zenodo half.** No code deposits a daily root, every root's `zenodo_url` is null, and these say otherwise in the present tense: **/verify**, **/stack**, **/proof**, **/apon-network**, **/eu-presidency**, **/papers/delphi**, **/methodology**, **/methodology/evolution**. Worse: **`src/lib/outreach.ts` puts "cryptographic integrity with Zenodo-anchored Merkle roots" into outbound pitch email to institutions.** | **Your call on the copy, and I need it more here than on SHAP because this one goes out in email.** **(a)** I change the Zenodo/RFC-3161 clause to state what is true, on all eight surfaces + outreach.ts — smallest possible edit, no layout change; **(b)** you give me `ZENODO_TOKEN` and I automate the deposit, making the claim true rather than smaller; **(c)** you write the replacement wording. **I have already corrected `llms.txt` in place.** I have not touched the pages or the email. |
| **TWO "CLAIMED CAPABILITY, NO CALLER FOUND" ITEMS** (O-70 day 5, O-58 day 10) | **O-70:** `/about/methodology` lists **INE**, **Registradores de España** ("Transaction-level resale price data… Powers the Value dimension benchmarks"), **Idealista / Fotocasa** and **Banco de España** as Avena data sources. I could find no ingest path for Registradores, Idealista or Fotocasa. **I have NOT proven these false — only that I cannot find the caller.** **O-58:** "SHAP explainability" on `/methodology`, `/avm`, `/institutional`, `/standards/apip`, `/products/csrd-disclosure`, where the code computes hand-set rule weights. | **Two questions. (1) Do you have a data agreement with Registradores/INE/Idealista that I simply cannot see in this repo?** If yes, O-70 closes as my blind spot. If no, it is the same smallest-possible-edit decision as Zenodo. **(2) SHAP: (a) I change it to "rule-based feature attributions", or (b) you want real SHAP and I scope the AVM work.** **Bundle all three — Zenodo, O-70, SHAP — they are one question asked three times: what do we do when a page claims a capability the code does not have?** |
| **THE ANTHROPIC API BALANCE IS EXHAUSTED — degrading NINE jobs, two of them newly proven today** (standing, day 14) | `predictions/generate`, `digest`, `generate-briefs`, `weekly-alpha` error on "credit balance is too low"; `delphi-run` and `plab-run` skip the Claude panelists (`models_scored: []`); `pulse` fails HTTP 500. `sync-regulatory-signals` fails classification for this reason, which is why `regulatory_signals` has ingested nothing since 08-04. **NEW 09-05, and both were previously filed as separate unexplained problems: (1) `prometheus` — its "draft_failed" on every question, 4x a day for weeks, is this, proven by `56193e6` making it name itself. (2) `causal-update` — its `debate_null: costa_blanca / all_spain` is this too.** **Note for anyone matching on status codes: Anthropic returns this as HTTP 400 `invalid_request_error`, NOT 401.** | **A decision, not a task: top up or don't.** If you top up, `predictions/generate` starts publishing LLM-authored forecasts on `/track-record` — the class of surface that produced the `precursor-scan` fabrication, so **say so explicitly if you want that live**. If you don't, tell me and I'll make the affected routes report `skipped` with a stated reason instead of failing nightly. **The quieter harm: DELPHI and PLAB publish a "panel" consensus that is now, on some days, no models at all.** **AND, IF YOU DO TOP UP, TELL ME FIRST — O-78 must be fixed before prometheus can draft again, or it will re-publish answers that already exist.** |
| **`/track-record` promises a prediction that cannot arrive** (O-52) | Live page says "The first call lands on the next prediction cycle"; `predictions` has 0 rows ever. Cause proven: Anthropic balance. | **Answer the credit question above and this resolves with it.** |
| **`/api/cron/auto-post` is publicly callable with no authentication** (O-51) | Anyone who finds the URL can trigger an outbound post, 3× scheduled daily. `pulse` has the same hole. Separately auto-post fails all three daily runs — and **`auto_posts` holds 0 rows ever, so it has never once succeeded** (O-53). | **One question, unchanged for thirteen days: does any of your buttons call `/api/cron/auto-post` directly?** If not, I add `isAuthorizedCron` to both and the hole closes. If yes, tell me which and I keep that path open. |
| **A whole blog post is premised on the Golden Visa still being open** | `src/lib/blog-posts.ts:942–1014`, "Spain Golden Visa and Property Investment: 2026 Status Update", stating "as of early 2026, the program remains active". Also `content/pr/spain-property-report-2025.md`, `content/parasite/linkedin-newbuild-investment.md`, `public/linkedin/10-what-i-wish-i-knew.md`. | **An article whose thesis is a false fact cannot be repaired by the "smallest possible edit" exception — the edit is the whole piece.** Your call: **(a) unpublish it**, or **(b) tell me to rewrite it as a status-update piece leading with the abolition** — genuinely the stronger SEO position, since most of the web still answers this question wrongly and the query has steady volume. |
| `HF_TOKEN` in CI | **The ONLY unverified corpus surface.** Site and avena-data mirror confirmed consistent again today (tenth correct prediction). HF returns 401 without a token, so three-way agreement is unproven. `push-training-data` confirms it nightly: **144 records built and thrown away** again this morning (05:00 UTC, `pushed: false`). | Store the HF write token as a repo secret so nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source ("most popular region for foreign buyers", tax/NIE/mortgage figures). Built to be quoted verbatim by AI assistants. | Either confirm the remaining prose accurate as written, or point me at a source. |
| Bing Webmaster Tools read | Henrik claimed avenaterminal.com 2026-08-13. Indexation coverage + IndexNow-key views should be readable. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the key shows rejected, say so loudly. No Bing API access, so manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions/3 months, 129 URLs, /compare = 87%. UI-only/no API. | **Re-export due ~2026-09-14** as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | GitHub Actions secret set, so nightly capture works (and it refreshed today, 08-17 → 08-30); Vercel lacks it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
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

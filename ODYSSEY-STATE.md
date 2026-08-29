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
| 2026-08-29 | `4fae319` **second `schedule` entry at 05:10 UTC as a capture backstop** (O-61 mitigation (a), shipped on the pre-committed trigger of a third degraded night) | **The only check that matters: does a run with `event:"schedule"` and `run_started_at` near 05:10 UTC exist tomorrow?** `actions_list` on `feed-refresh.yml`. Three outcomes and they mean different things: (a) a 05:10-ish scheduled run exists → the backstop is real and the hour is being honoured; (b) it exists but landed hours late → GitHub's degradation is repo-wide as feared, the backstop is a weaker draw than hoped, and option (b) `repository_dispatch` becomes the only real fix — escalate hard; (c) no run at all → the changed `on.schedule` block was not picked up, treat as dead code. **Do NOT judge it by whether the book is fresh** — I may have dispatched by hand again, which is exactly the confound that has masked this for three days. Judge it by the RUN, then the book | **PENDING — first 05:10 window is tomorrow** |
| 2026-08-29 | `9f610fe` **`/api/v1/passport` health score and `/api/v1/liquidity` days-to-sell removed** | `curl 'https://avenaterminal.com/api/v1/passport?ref=N3099V'` → must have `not_published` with five keys, NO `health_score`/`health_tier`, and `energy.epc_rating:null` + `epc_rating_raw:"X"`. **N3099V is the deliberate probe**: it is the same ref carbon and compliance disagreed about, so all three routes answering `null` is the three-way agreement test. Then a no-comparable ref — **N9936** (Guardamar del Segura, Townhouse, the only one of its town+type) → `comparable_fair_value:null` and `valuation_gap_pct:null`, NOT `0`. `curl .../api/v1/liquidity?ref=N3099V` → no `days_to_sell_estimate` | **PENDING — deploy in flight at hand-off** |
| 2026-08-29 | `dc5365d` + `4c34e9b` **Golden Visa abolition corrected across ~15 surfaces (two commits — the first was incomplete, see the correction below)** | **`dc5365d` verified live**: `/api/aeo/questions` and `/answers` both now state the abolition; `/api/perplexity/pages` shows "Properties at €500,000 or above". **`4c34e9b` is PENDING deploy at hand-off** — verify: `curl -s https://avenaterminal.com/api/aeo/questions \| grep -c 'Golden Visa, climate'` must be **0**; `curl -s https://avenaterminal.com/api/perplexity/pages \| grep -c 'programme is available for purchases'` must be **0**; `/api/training/facts` and `/api/training/conversations` must state the abolition, not "has undergone changes"; a guide page's FAQ ("Can X citizens get a Spanish Golden Visa?") must answer **No** for a non-EEA nationality. **Then re-run the untruncated grep** (below) and confirm the only remaining hits are the ones deliberately left | **PARTIAL — `dc5365d` verified, `4c34e9b` pending** |
| 2026-08-29 | **THE COMPLETENESS CHECK, to be re-run tomorrow** | `grep -rni 'golden visa\|golden-visa\|goldenvisa' --include=*.ts --include=*.tsx --include=*.js --include=*.mjs --include=*.md --include=*.json src/ content/ public/ scripts/ mcp/ sdk/ \| grep -v 'abolish\|Organic Law\|former Golden Visa\|no longer\|SUSPENDED\|Closed 20\|closed to real estate\|suspension\|end of the residential' \| cat` — **note the `\| cat` and the absence of `head`; that is the entire point.** Every remaining hit must be one of: a slug/label/nav string, a correct statement, `blog-posts.ts` (escalated), `content/`+`public/linkedin/` (escalated), `/api/v1/regulatory` or `/api/v1/community-pulse` (O-64/O-65, deliberately untouched), or `memo/page.tsx` SAMPLE-PORTUGAL (O-63). **Anything else is a miss** | **PENDING** |
| 2026-08-28 | `8045239` stale-feed alarm hour 11 → 14, watchdog 12:00 → **14:30 UTC** | **VERIFIED on both quiet-path criteria.** `cron_logs` for `pricing-history` since 08-28T14:00Z: exactly one **14:30** row on 08-28, **no 12:00 row** → Vercel picked up the changed `vercel.json`, the branch is reachable, not dead code. That row logged **`success`**, not `error` → no false alarm on a healthy day. Today's 02:20 and 05:36 rows both classified correctly (`skipped`, `overdue:false`, `feed_age_days:1`). **The alarm's FIRING path remains unproven live** — three days, never fired, every time because the book was fresh by sampling time. Do not record it as working, and do not "fix" a quiet alarm by lowering the hour | **VERIFIED (quiet path). Firing path still unproven** |
| 2026-08-14 | `e415c6b` curl fallback when the feed origin serves a bot challenge | **RESOLVED — and the answer is NEGATIVE. Exercised on a runner for the first time on 2026-08-28 and it did NOT recover the feed.** Run 34 (schedule, 13:19 UTC): `Feed attempt 1 hit a bot-protection interstitial: 12156 bytes [text/html \| openresty/1.31.1.1]` → `Retrying the download with curl` → `curl fallback did not recover it: curl returned 12176 bytes, under the 1000000 floor` → gave up after 4 attempts in 37s with the correct diagnosis: **BOTH node fetch and curl refused = the egress itself is blocked, not a client fingerprint.** The fallback's claim in `e415c6b` ("can only convert failures into successes") is still true and it converted nothing. What DID work is the loud, accurate failure and the 37s give-up instead of a 120-min burn. **Moved to CLOSED as a completed negative read-out; the underlying risk escalates to O-27** | **VERIFIED — fallback insufficient, see O-27** |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-61 | **GitHub's scheduler for this repo has been degraded for three consecutive nights, and on one of them the delayed run also died on the RedSP challenge.** feed-refresh (cron 01:37): twelve nights 08-15..08-26 landed 02:35–02:50; **08-27 ran 11:57 (+10h20m) success; 08-28 ran 13:19 (+11h42m) FAILURE; 08-29 had not fired at all by 05:36 (+4h).** IndexNow (cron 03:30) shows the identical shift: 04:05–04:22 for fourteen nights, then **08-27 14:31, 08-28 15:35, 08-29 absent by 05:50**. Both workflows, both nights → **the degradation is repo-wide, not slot-specific** | `actions_list` `run_started_at` on both workflows, read 08-29 | **PARTIALLY MITIGATED TODAY — `4fae319` adds a second schedule entry at 05:10 UTC.** Hour chosen from evidence: every download attempted 05:30–06:00 UTC has been served normally by RedSP (runs 31/33/35), while both refusal storms were midday. **Its known weakness, stated plainly: if the whole repo's queue is degraded rather than one slot, both entries sit in it — and the IndexNow evidence says repo-wide is the more likely reading.** So this buys a second draw, not a guarantee. **The real fix is option (b), `repository_dispatch` from a Vercel cron — Vercel's scheduler has been flawless throughout — and it is blocked on `GITHUB_DATA_TOKEN` in Vercel env.** Escalated. **No day has been lost yet: 08-27, 08-28 and 08-29 were all captured, all three by my hand dispatch.** That is attendance, not architecture | **HIGH — the top pipeline risk** |
| O-27 | **RedSP is challenging GitHub Actions egress, and the curl fallback does NOT get through it.** Root cause was already proven (openresty JS interstitial in front of the feed). What is new on 08-28 is that the mitigation failed live: both node fetch and curl were refused on the same run, four attempts, 37 seconds | run 34 job log, quoted in `4fae319` | **This is the case Henrik was warned about when `e415c6b` shipped:** "if their guard starts challenging curl too, every night is lost until someone notices". It has now happened once. The challenge is intermittent and appears time-of-day dependent (all observed refusals midday; all 05:30–06:00 attempts served), which is the entire basis for the 05:10 backstop hour — **but that is an inference from ~6 observations, not a proven schedule. Do not state it as a property of RedSP's guard.** Durable fix needs Henrik | **HIGH — escalated** |
| O-62 | **Absorption ledger delisting dates: 60 of 94 are wrong, and the "9 relisted units stamped behind" framing was itself wrong.** Re-measured today against `price_snapshots`: **31 correct · 55 one day late · 8 stamped behind the true last sighting**. The 8 split into TWO different things that yesterday's note conflated: **3 are units live in today's feed** (N7870, N9243, SP1625) whose stored date is behind because they have not actually left yet — benign, already disclosed via `relisted_on`/`still_listed`, and **self-healing**; **5 are stamped 08-07 with a true last sighting of 08-08** (N8205, N9260, N9519, SP1080, SP1644), all inside the O-7 double-book window — an artifact of that corruption, not of relisting | direct SQL 08-29, method: compare each `sold_properties.last_seen_date` against `max(price_snapshots.snapshot_date)` for the same ref | **So the genuinely wrong completed-delisting dates are 55 one-day-late + 5 O-7 artifacts = 60 of 94.** The 3 live relistings are a different category and should not be counted as bad dates. Still gated behind the branch pending Henrik. **The backfill count on that branch must be re-derived against today's 55 before it is applied — it was written when the figure was 37, and 37, 50 and 55 have all been quoted on different days.** Accrues ~2 rows/day | **HIGH — sharpens an existing blocker** |
| O-64 | **`/api/v1/regulatory` publishes FABRICATED regulatory news attributed to the Boletín Oficial del Estado.** `getAlerts()` returns a hardcoded array: invented alert IDs (`REG-2026-001`), invented BOE/EU-Journal sourcing, invented dates (2026-03-15, 2026-02-28), and an `ai_interpretation` field carrying specific invented figures ("Properties with existing VT licenses may command 10-15% price premium") | route read 08-29 during the Golden Visa sweep | **Found today, deliberately not patched.** It also contains stale Golden Visa language, but correcting one sentence inside an invented dataset makes the fabrication more plausible rather than less — strictly worse than leaving it visible. Belongs in the `precursor-scan` / `arbitrage` class: **remove the fabricated alerts or disable the route, do not repair them.** Needs a proper session, not a tail-end patch | **HIGH — new, credibility** |
| O-65 | **`/api/v1/community-pulse` publishes FABRICATED social-listening data attributed to named platforms.** A hardcoded `REDDIT` object: `sentiment: 'BULLISH'`, `confidence: 0.74`, `sample_size: 847`, `mentions_avena: 5`, plus invented `trending_topics` and `key_narratives`. Avena runs no social listening | route read 08-29 | Same reasoning as O-64 — found in the same sweep, left untouched for the same reason. **`mentions_avena: 5` is the field to note: it is a fabricated measurement of Avena's own reach**, which is the exact class of self-flattering invention the citation engine exists to avoid | **HIGH — new, credibility** |
| O-63 | **`src/app/memo/page.tsx:80` cites Portuguese Golden Visa eligibility on a `SAMPLE-PORTUGAL` row** ("€600k–€1.5M with Golden Visa eligibility, 60-month hold"). Portugal closed its own residential golden-visa route in 2023, so this is stale in the same way the Spanish claims were | grep 08-29 during the `dc5365d` sweep | Left alone deliberately: it is demo content, explicitly labelled SAMPLE, on a market Avena holds no data for — so it is not a claim about Avena's own data, and editing it is closer to rewriting sample copy than to correcting a load-bearing fact. Worth fixing when that page is next touched for another reason | low |
| O-58 | **The "SHAP explainability" claim is false and it is on BUYER-FACING pages.** `/api/v1/explainable-avm` computes hand-set rule weights (beach 8/4/1 by distance band, `newBuildPct = 6`, developer rating bands) — not Shapley values. "SHAP" appears in ~30 files including `/methodology`, `/avm`, `/institutional`, `/standards/apip`, `/products/csrd-disclosure` | route read 08-25; `src/app/api/v1/explainable-avm/route.ts` lines 25–60 | Removed from `/api/v1/compliance` 08-25 (`03f57ef`) because that surface is mine. The rest is **buyer-facing marketing copy** — fence 2. It was never true rather than having become false, so the "correct a false fact in place" exception is arguable but not clean. **Escalated to NEEDS HENRIK, day 4.** Do not rewrite those pages unilaterally | **high — escalated** |
| O-59 | **The frontier sitemap is diluted: it carries 3-week-old changes alongside today's.** 121 property URLs today (was 122, 127, 134 — drifting down), `lastmod` spread back to 2026-08-06 | read live 08-29 | A "frontier" mixing three-week-old moves with same-day ones is a weaker recrawl signal than one scoped to the last few days. The file is honest and its `lastmod` values are true — a design judgement, not a defect. **Candidate for the next SEO experiment, but must NOT start while the sitemap-ai recrawl-latency experiment reads out 09-25** — same metric, overlapping URLs, running both makes neither readable | medium |
| O-57 | **The rejected-scheduled-run alarm can never fire.** `withCronLog` writes `auth_rejected_platform_run` only when `x-vercel-cron==='1'`, but the real Vercel scheduler is identified by **User-Agent** (`invoked_by='vercel-cron-ua'`), never that header | resolved 08-24 from `cron_logs.invoked_by` | Small and well-scoped: re-key the rejection detection on the UA signal the classifier already recognises. Not urgent — every cron currently logs, so nothing is silently missing; the alarm guards a future auth regression | medium |
| O-50 | **Dead/silent crons — `detect-events` FIXED (`95b90eb`), `generate-briefs` FIXED (`71e19d6`).** STILL UNEXPLAINED: the 2026-06-15 stop date | `intelligence_briefs`/`weekly_alpha`/`digest_issues` all stopped 06-15, ~57 days before the Anthropic credit exhaustion (08-11) | Credit exhaustion explains 08-11 onward, not 06-15. Remaining: `weekly_alpha` (Mon), `digest_issues` (Mon), `regulatory_signals` (08-04), `hf_pushes`. **Two causes; only the second found** | **HIGH** |
| O-56 | **`prometheus` reports a nonzero `error_count` on every run and still logs `success`.** `error_count:6` on 08-28, up from 4 — it errors on everything it harvests (`harvested:6, error_count:6`), so the failure is total | `cron_logs` 08-23..08-28 | `deriveCronStatus` recognises a populated `errors[]` or non-empty `error` string; `error_count:6` is a bare number and slips through. **Prefer fixing prometheus to report its errors properly** over teaching the derivation to guess at arbitrary numeric fields. `published:0`/`pinged:0` — nothing it produces reaches anywhere, so blast radius is contained | medium |
| O-53 | **`/api/cron/auto-post` fails on all three daily runs with "Unexpected end of JSON input"** | `cron_logs` 08-24 09:01/13:01/18:03, all `status:'error'` | Not diagnosed. It is the route in O-51 that may be wired to one of Henrik's buttons — **do not touch its auth/behaviour before that is answered**; diagnosing the JSON error is safe and separate | medium |
| O-54 | **`causal-update` reports `indicators_touched:20` while `causal_indicators.last_updated` has not moved since 2026-05-23** | ran 08-24 06:30; table: 20 rows, one distinct `last_updated`, 2026-05-23 10:53:08 | The freshness bump is not landing — so the fabricated-freshness danger in O-40 is currently inert. Establish whether the write fails or targets another column | medium |
| O-51 | **`/api/cron/pulse` and `/api/cron/auto-post` have no authentication at all** — both publicly callable; auto-post triggers an outbound post 3×/day | read 08-22 | **CLAUDE.md: Henrik starts/stops the X-bot via his own buttons.** If one calls `/api/cron/auto-post`, tightening it breaks his control surface. **Ask before tightening auto-post; pulse can likely just be done** | medium — ask first |
| O-49 | **`citation-agent` reports `lookups_failed` for questions it deliberately deferred** | 08-21 03:01: `lookups_failed:22` alongside `stopped_on_budget:true` | Small: split `deferred` from `failed`. Alarm rule until then: a balance-out 401 shows as `lookups_failed>0` on the FINAL invocation of the day, or `status` never reaching `complete` — never on the first | medium |
| O-45 | **CORRECTED 2026-08-29 — this item was WRONG as written.** It claimed `sold_properties.last_seen_date` is "never updated when a tombstoned unit returns and leaves again". It IS updated. **SP1648 proves it**: tombstoned 08-14, present in the feed 08-18..08-28, absent 08-29, and today its existing row (created 08-14) was re-stamped to 2026-08-29 rather than a second row being inserted — which is why the ledger went 90 → 94 on 5 rows dated today | direct SQL 08-29; SP1648 snapshot history 08-05..08-13, 08-18..08-28 | **What is actually true:** a re-departure re-stamps the row correctly (subject to the same systematic one-day-late offset as every other tombstone, O-21). The 3 rows currently "behind" are units that are **still listed right now**, so their date is not yet wrong — it is merely not yet final, and it self-corrects on departure. **This makes the pending branch's ask smaller than I have been telling Henrik**: the relisting class largely resolves itself; the one-day offset is the real defect | medium — **downgraded, was overstated** |
| O-44 | **`/api/sync-snapshots` writes columns that do not exist, and discards every write result** | route read 08-19; schemas re-confirmed 08-21 | Appears dead-and-broken rather than harmful. Confirm it writes nothing, then remove it + its browser caller. Client-triggered → NOT covered by the cron coverage test | medium |
| O-40 | **`causal-update` would stamp 92-day-old values as fresh if its bump ever landed** | `runCausalUpdate()` (`src/lib/causal-engine.ts:533-545`) sets `last_updated=now()` on every row, refreshing no value | **DO NOT "fix" by reviving the bump.** Since `061a57c`, `/api/intelligence/regime` derives `age_days`/`stale` from `last_updated`, so a working bump flips nine indicators from honest `stale:true` to fabricated `live:true`. Fix = refresh real values, or delete the bump. Mass-mutates 20 rows → branch. See O-54 | **high** |
| O-34 | **Nine indicators have no live source at all** — Spain GDP, Costa Blanca YoY, Foreign Buyer Share, Alicante Transactions, New Supply, 10Y Bond, Mortgage Approvals, Brent, Consumer Confidence | `age_days` **98** today | Honestly labelled stale → a coverage gap, not a credibility bug. `/api/v1/apci` reads `causal_indicators` directly | high |
| O-41 | **Two chronically-failing crons, diagnosed but unfixed — both failed again today.** `counterpart-discover` (08-29 03:30): `column properties_registry.market does not exist \| 42703`. `eu-stats-ingest` (08-29 04:15): `errors:2 of 20 indicators, 4,337 rows still upserted` | `cron_logs` 08-29 | counterpart-discover is a real fixable bug in OUR code, but it queries `properties_registry` (frozen 2026-05-24) so fixing the column alone mines a dead snapshot. eu-stats-ingest is upstream and degrades per-source as it should — the run status is the honest part. Neither feeds `price_snapshots`/`sold_properties` | high — actionable |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants. 14 audited to date, 14 defective — 14 for 14.** | `63f405b`, `9c387fd`, `e6bb569`, `a2bf7d2`, `f00086d`, `genesis/run` (O-42), `061a57c`, `arbitrage` (`be4a736`), `tax` (`fde7883`), `compliance` (`03f57ef`), `carbon` (`b9bf525`), **`liquidity` + `passport` (`9f610fe`, today)** | **The two known-defective routes are now done, so the next pass has no named target and must be a fresh sweep.** Greps that keep paying: **`.ilike(` on an indicator key**, **`?? <number>` on a published field**, **`X \|\| 'DEFAULT'` on a categorical the feed can leave unset**, and — added today — **any second copy of a helper already centralised in `src/lib/`** (that is how the EPC bug reached a third route). 158 route files, 14 carrying `cite_as` | **high — highest hit rate of anything I have** |
| O-52 | **`/track-record` promises a prediction that cannot arrive** | `predictions` table: 0 rows ever. Generator failed 08-24 07:01 on "credit balance is too low" | Cause = Anthropic balance, not code. Two honest fixes, both Henrik's call. Raised under NEEDS HENRIK | high — escalated |
| O-42 | **`genesis/run` discards its write results and marks the scenario complete regardless** | `src/app/api/v1/genesis/run/route.ts:273-274` | Recurring shape in a scenario simulator | medium |
| O-47 | **`dvf-ingest`'s underlying FK failures still drop rows on nights they occur** | 08-25: 7,168 fetched, 5,384 inserted, `errors:[]`. 08-22: two FK-violation chunks | **Run status now honest** (`71e19d6`). The FK failures themselves are untouched. Intermittent | medium |
| O-39 | **All 90 legacy `market_snapshots` rows have a NULL `snapshot_date`** | queried 08-17 | Harmless to reads (order by `computed_at`). Decide: backfill from `computed_at`, or leave | medium |
| O-35 | **2026-05-23/24 is a cluster date; 2026-06-15 is a second (O-50)** | queried 08-16..08-18; 06-15 found 08-22 | O-40/O-54 explain the `causal_indicators` half. `properties_registry` 05-24 still unexplained. 06-15 is the more urgent | medium |
| O-36 | **`snapshot-archive` computes five market-summary figures it cannot store** | `f00086d`; schema read 08-16 | Additive/allowed; `new_this_week`/`avg_discount` deserve a considered schema. Decide alongside O-37 | medium |
| O-37 | **Nothing writes `market_snapshots.apci`, so APCI `week_change` can never populate** | `/api/v1/apci`; schema 08-16 | An honest null beats the 85-day delta it replaced. Do after O-34/O-40 | medium |
| O-30 | **Unbacked qualitative claims in snippet-answers** | read 2026-08-15 | Rewriting = inventing copy (rule 1); the fence permits correcting a FALSE fact, not replacing an unverifiable one. **The golden-visa half of this is now resolved** — `dc5365d` swept every present-tense Golden Visa claim in `src/` (see CLOSED). What remains is the genuinely unverifiable prose: "most popular region for foreign buyers", NIE/mortgage figures | medium |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books | proven by diffing data.json blobs against stored counts | cause fixed; 08-10..08-29 each a single clean write. **Now known to be the source of 5 of the 8 "stamped behind" tombstones (O-62)** — those 5 are all 08-07/08-08 | high |
| O-5 | Pre-transliteration accent slugs are indexed. **The "186 of 492" figure is unsourced — see O-33** | `gsc_pages` attribution proven wrong 08-15 | 308 shims confirmed working. Re-derive from `gsc_pages`, never from the old figures | high |
| O-6 | `/compare` dominates our search surface: **87% of Google AI-feature impressions (198/228)** | `gsc_pages`; `docs/gsc-genai/` (Henrik's export) | CompareLedgerPulse (verified 08-15) put the moat on it. Read out 2026-09-14 | high |
| O-33 | **The "492 indexed / 293 /compare / 186 accent" baseline is NOT reproducible from `gsc_pages`** | 08-16: 151 pages; 08-17: 184; 08-20: 287 | **Do not quote 492/293/186 again until re-derived.** O-5 and O-6 both rest on these | **high** |
| O-13 | **PerplexityBot — reframed 08-23, still not a pattern.** One near-full-book sweep 08-23 (296 hits / 284 distinct property pages), having averaged <10/day before; then 2, 0, 0 | `crawler_hits` daily, queried 08-26 | The sweep has not repeated. The old framing ("barely present") is wrong; so would "it now crawls us weekly". Keep watching, claim neither | medium — reframed |
| O-15 | **Vercel Analytics figures are mostly machines** | crawler ledger | **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in: `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281` | real instances of the recurring shape | `scribe`, six in `b4cc217`, `generate-briefs`, `detect-events`, `dvf-ingest` all handled. These three remain | high |
| O-14 | **AwarioBot is the largest crawler on the site and returns nothing** | crawler ledger; distinct-property count frozen at exactly 1,988 across both measured 7-day windows while it burned 21,950 hits | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`** (three counting the broken O-44) | `parse-feed.js:962,1003` | Confirmed live again today: `pricing-history` reported `delisted:0` while the ledger gained 4 tombstones + 1 re-stamp, because parse-feed had already written them. **Reconcile new tombstones against `sold_properties`, never the route's `delisted` field.** Wants a comment at both ends | medium |
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
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | **2026-09-02 (4 days away)** | pending — confound bounded: spam update 08-18..08-21 |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers | distinct properties fetched per crawler per pass | **2026-08-25 — READ OUT** | **UNMEASURABLE AS DESIGNED.** `crawler_hits` begins 2026-08-11 11:46 — the same day as the change, so no pre-change baseline exists and no causal claim is available. Recorded as a design failure, not a null result. Partial within-post finding (7-day windows 08-11..08-17 vs 08-18..08-24): **AwarioBot's distinct property pages frozen at exactly 1,988 in BOTH windows** while hits fell 28,370→21,950. PetalBot 3,287→1,701; Amazonbot 2,004→1,864; AhrefsBot 2,217→1,174. **No crawler expanded its distinct-page reach.** Feeds O-14 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) | 2026-09-08 (10 days) | pending — **nine complete runs, still no detectable trend.** 08-28 came in at 4.41% (3/68), joint-lowest of the series, but that is a 2-question move against a 1.47pp quantum — noise, not a decline. Do not read it either way |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | **2026-08-25 — READ OUT** | **POSITIVE, MODEST, NOT SIGNIFICANCE-TESTED.** Matched design: 105 refs with a real price move vs 525 unchanged refs sampled on the SAME dates. Search/AI crawlers only: median time-to-recrawl **79.4h moved vs 92.3h unchanged**, holding across the distribution (p25 33.4 vs 42.9, p75 127.3 vs 143.2). Recrawl coverage 97.1% vs 92.0%. Any-crawler median 20.0h vs 28.2h. ~14% faster; n small, no significance test — **do not quote as a proven effect**. Re-read 2026-09-25 with more moves |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (10 days) | pending |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (11 days) | pending — needs distribution: not listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate; citations of town pages | 2026-09-09 (11 days) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" + GSC impressions | 2026-09-23 (25 days) | pending — spam-update confound bounded 08-18..08-21 |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (11 days) | pending — **interim, and still WEAKENING.** OAI-SearchBot 248 hits (08-12) → 94 (08-24) → 81 (08-25). ChatGPT-User steady 34–38/day. **The treatment itself is now badly irregular and this must be stated at read-out: 08-27 fired TWICE (05:44 manual + 14:31 delayed schedule), 08-28 fired at 15:35 (+12h), 08-29 had not fired by 05:50.** Three of the last four nights were off-cadence. **Do not treat the ping as a uniform daily treatment when reading this out** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | **2026-08-26 — READ OUT** | **SPLIT RESULT: the file is fetched, but it does NOT steer the crawlers that matter.** (a) *Discovery* — YES, heavily by ClaudeBot: 65 fetches (08-22..08-26), MORE than `/sitemap.xml` (55). bingbot 27, AhrefsBot 10, PetalBot 4, GPTBot 3, meta-externalagent 1, PerplexityBot 1. **Causal attribution to the robots.txt line FAILS**: GPTBot and PerplexityBot both fetched it on 08-11, one day BEFORE the announcement. (b) *Budget steering* — **NO detectable effect on the major crawlers.** Null expectation from the book: **3.06%** of the live book had a real price move in the prior 7 days. Observed share of property-page hits on recently-moved refs: Googlebot **2.94%** (168/5,724), ClaudeBot **2.89%** (46/1,589), bingbot **1.65%** (25/1,513), GPTBot **1.11%** (1/90) — all AT OR BELOW chance. OAI-SearchBot 3.68% ≈ chance. Two above-chance exceptions, both small-n single-session crawls: meta-externalagent 13.14% (23/175), PerplexityBot 6.30% (16/254). (c) *Sitemap is not at fault* — 121–134 property URLs, all real, `lastmod` true. Filed O-59 |
| 2026-08-14 | **CompareLedgerPulse**: /compare carries 87% of our Google AI-feature impressions; adding the dated observation quotable + 2 fan-out Q&A puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 (16 days) | pending — render verified live 2026-08-15 |

**No new experiment today — THIRD consecutive day, and this is now worth
naming rather than absorbing.** All three mornings went to the capture
pipeline and to credibility fixes, both of which outrank SEO in the stated
ranking, so the choice was right each time. But the pattern is real: the SEO
queue has not advanced since 08-26. O-59 (narrowing the frontier window) is
the obvious next experiment and is blocked until **09-25**, when the
sitemap-ai recrawl-latency read-out clears the metric. **09-25 is the date
that unblocks the SEO queue.** If a fourth and fifth morning also go to the
pipeline, the honest conclusion is that pipeline reliability — not search —
is the actual bottleneck on this project, and Henrik should hear it in those
terms.

**Next read-outs: 09-02 (4 days), then 09-08 (×2), 09-09 (×3), 09-14, 09-23,
09-25.** Do them on the day; a read-out postponed is an experiment abandoned.

**Weekly search scan: done 2026-08-26 ("nothing material" — FAQ rich-result
deprecation, zero Avena exposure; no confirmed ranking update since the
August spam update). Next due ~2026-09-02.** Not re-run today — the cadence
is weekly and inventing a scan to have something to report is exactly the
failure mode this file exists to prevent.

**CONFOUND — the August 2026 spam update, CLOSED, dated and RE-VERIFIED.**
09:27 US/Pacific 2026-08-18, duration 2d16h → complete ~08-21. Global, all
languages; SpamBrain enforcement of EXISTING policies. Avena has no exposure
(no mass-generated pages, no bought links, no ads). Re-confirmed 2026-08-26
against Google's own status dashboard. Window sits inside the 09-02 and 09-23
read-outs. Record it; do not attribute either way.

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
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | series gap ≤2 days; all numbers day-of from `price_snapshots`/`sold_properties`. **Gate: O-21 must be resolved first** — Release 1 quotes delistings by day and 60 of 94 of those dates are still wrong (O-62). Any delisting figure must be `delistings_currently_absent` (**91** today), never the gross count (**94**). **Do NOT source any Release 1 figure from `score_history`** (rows before 2026-08-22 dated a day late). `price_snapshots` is ground truth. **Provenance note that must appear in the release: 2026-08-27, 08-28 AND 08-29 were all captured by manual dispatch at ~05:37 UTC, roughly 3h later than every other day in the window, because the scheduled nightly did not land. All three days ARE captured and complete. 08-27's scheduled run also landed independently at 11:57 (one clean write, so the duplication did not reach the data); 08-28's scheduled run landed at 13:19 and FAILED outright on the feed origin's bot challenge, capturing nothing.** |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | Henrik's explicit go |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.58%** (in-sample, n=**2,042**) — unchanged from 08-28's 15.58% at n=2,047. My gate run reproduced the workflow's committed file exactly apart from `computed_at`, reverted rather than committed as churn | 2026-08-29 | `public/model-stats.json` |
| Live book | **2,042 listings** (−5) | 2026-08-29 | `public/data.json`, feed commit `a73ebf7` 05:37 UTC (**manual dispatch, 3rd day running**) |
| Sitemap | **2,694 `<loc>`** (−5, matching the book), valid XML, 5 sampled URLs all 200 | 2026-08-29 | `/sitemap.xml`, parsed |
| Frontier sitemap | **121 property URLs** (was 122, 127, 134 — drifting down) (see O-59) | 2026-08-29 | `/sitemap-frontier.xml`, parsed |
| Corpus version | site **v2026-08-29 (schema 2)**, live and confirmed after deploy · `avena-data` mirror at v2026-08-28 (its normal lag, held a 4th day) · HF unverified (401 without a token) | 2026-08-29 | site + mirror raw |
| **How to read the mirror correctly** | avena-data's `daily-snapshot.yml` runs **07:15 UTC** and pulls the site artifact. I run at **~05:40 UTC**. So the mirror ALWAYS shows yesterday's version when I look, and today's by ~07:52. **Compare after 08:00 UTC, or the mirror against the site's PREVIOUS day. Do not re-open this as divergence.** Held again 08-29: mirror = v2026-08-28, matching my recorded 08-28 baseline exactly. Four consecutive correct predictions | 2026-08-29 | avena-data raw `market/dataset.json` |
| Ledger (published) | first 2026-08-05, latest 2026-08-29, **25 observation days, 2,143 refs, 192 moves, 94 delistings, 8 relistings, 91 currently absent, 3 still listed**. Cross-section 2,042 live | 2026-08-29 | `/open-data/dataset.json` |
| **Tombstone integrity — RE-MEASURED, and the old framing was wrong** | Of 94 tombstones: **31 correct · 55 one day late · 8 stamped behind the true last sighting.** The 8 are TWO different things: **3 are live in today's feed** (N7870, N9243, SP1625) — not yet wrong, self-healing on departure; **5 are O-7 window artifacts** (N8205, N9260, N9519, SP1080, SP1644, all 08-07 vs true 08-08). **Genuinely wrong completed-delisting dates: 60 of 94.** Figures quoted on successive days have been 37/88, 50/90, then 55/94 for the one-day-late class — **quote only the current one and always state the method** (compare each `sold_properties.last_seen_date` against `max(price_snapshots.snapshot_date)` for that ref) | 2026-08-29 | `sold_properties` × `price_snapshots`, direct SQL |
| **Real price moves by day** | 15 (08-14), 4, 1, 0, 15, 10, 10, 18 (08-21), 9, 0, 0, 3, 3, 6 (08-27), 5 (08-28), **6 (08-29)** | 2026-08-29 | `price_snapshots` / pricing-history |
| **A 0-move day is NOT automatically a failure** | Discriminating fields are `trusted_prior` and `overlap`, never the move count alone. 08-29: `feed 2042 · snapshotted 2042 · moves_detected 6 · moves_already_logged 6 · delisted 0 · trusted_prior true · overlap 0.998 · prior_age_days 1 · errors null` | 2026-08-29 | pricing-history curl |
| **`delisted:0` from pricing-history does NOT mean no delistings today** | 08-29 the route reported `delisted:0` while the ledger gained 4 new tombstones **and re-stamped a 5th** — parse-feed wrote them first (O-20 dual writer), so the route saw them already gone from its own baseline. **Reconcile new tombstones against `sold_properties`, never the route's `delisted` field alone.** Also: 90 + 5 rows dated today = 94, not 95, because one of the five was an UPDATE to an existing row (SP1648) — see O-45 | 2026-08-29 | both sources cross-read |
| **HOW THE CAPTURE ACTUALLY RUNS** | The Vercel `pricing-history` cron at **02:20 UTC always skips** (`stale feed — deployed book predates today`) because the feed workflow does not land until ~02:50 at best. Expected. The REAL capture is the feed-refresh workflow's own step, which polls `/api/cron/pricing-history` up to 30× at 30s until the route reports the generation date of the book it just pushed, asserts `snapshotted>0` and a non-empty diff baseline, and **exits 1** otherwise. My morning curl is idempotent belt-and-braces (`moves_already_logged`). The THIRD leg is the watchdog at **14:30 UTC** (was 12:00, `8045239`), which turns a still-stale book into a logged `error` + HTTP 500. **As of `4fae319` there is now a FOURTH leg: a second GitHub schedule at 05:10 UTC** | 2026-08-29 | `cron_logs` + `.github/workflows/feed-refresh.yml` |
| Snapshot rows by day | 2,035 (08-24), 2,036, 2,036, 2,041 (08-27), 2,047 (08-28), **2,042 (08-29)** — one clean write per day, rows = distinct refs every day | 2026-08-29 | `price_snapshots` |
| Delistings | **4 new tombstones + 1 re-stamp on 08-29.** Cumulative **94** | 2026-08-29 | `sold_properties` |
| **NIGHTLY RELIABILITY — MEASURE LATENCY AND CONCLUSION, NOT JUST EXISTENCE** | feed-refresh scheduled landings: **02:35–02:50 for twelve nights (08-15..08-26); 11:57 (08-27, +10h20m, success); 13:19 (08-28, +11h42m, FAILURE on the RedSP challenge); not fired by 05:36 (08-29).** IndexNow identical: 04:05–04:22 for fourteen nights, then **14:31 (08-27), 15:35 (08-28), not fired by 05:50 (08-29)**. Both workflows on both nights → repo-wide. **Vercel's scheduler unaffected throughout** (02:20 and 14:30 crons fired exactly on time every day) | 2026-08-29 | `actions_list` (`run_started_at` + `conclusion`) |
| Build health | **Run 34 (schedule, 08-28 13:19) FAILED** — step 5 "Run the RedSP feed", both fetch and curl refused, 37s. **Run 35 (dispatch, 08-29 05:36) success**, all steps, feed downloaded in 8s. No open PRs. **Four pushes to main today** (`4fae319`, `9f610fe`, `dc5365d`, `4c34e9b`); all four gates green locally before each | 2026-08-29 | `actions_list` + job logs |
| **CRAWLER LEDGER** | `crawler_hits` **begins 2026-08-11 11:46** (no earlier data — why the robots.txt experiment was unmeasurable). Schema is `(at, crawler, path, ua)` — **there is no `user_agent_family` column**; group by `crawler` and count `distinct path`. **08-26** AwarioBot 5,855 hits/2,276 paths · Googlebot 1,067/940 · meta-externalagent 1,040/155 · PetalBot 968/923 · ClaudeBot 105/25. **08-27** PetalBot 994/950 · Googlebot 919/854 · DotBot 336 · AhrefsBot 269 · Amazonbot 235 · SemrushBot 232 · bingbot 171 · YandexBot 136 — **AwarioBot and ClaudeBot both absent entirely** after AwarioBot's 5,855-hit day. **Not re-derived 08-28 or 08-29** — the last two days went to the pipeline. Crawler presence swings hard day to day; claim neither presence nor absence as a property | 2026-08-27 | `crawler_hits` grouped by day |
| **Crawl-budget null expectation** | **3.06%** — the share of the live book with a real price move in the prior 7 days. **Any claim that a crawler "targets changed pages" must beat this.** Googlebot/ClaudeBot/bingbot/GPTBot do not | 2026-08-26 | `price_snapshots` × `crawler_hits` |
| **Cron logging coverage** | **64/64 scheduled crons write to `cron_logs`** (65 entries — `pricing-history` appears twice by design; **now three times as of `4fae319`? NO — that added a GitHub schedule, not a Vercel cron. Still 65**). `invoked_by` on real scheduled runs = **`vercel-cron-ua`** (User-Agent, not the header). GitHub-Actions-triggered routes log `invoked_by=null` (expected) | 2026-08-29 | `b4cc217`, `71e19d6`, live rows |
| **Citation rate, organic (qb-v2) — THE baseline** | **4.41% (3/68) on 08-28.** Nine complete runs: 4.41 (08-10), 4.41, 2.94, 5.88, 8.82, 5.88, 7.35 (08-24), 7.35 (08-26), 4.41 (08-28). Mean **5.72%**, range 2.94–8.82. One hit = 1.47pp. **No detectable trend in either direction. Do not claim one.** Not a run day today (Sat) | 2026-08-28 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | **100% (6/6) on 08-28, 08-26, 08-24, 08-21, 08-19, 08-17**; 83.33% on the three prior. Six consecutive perfect controls — the engine reaches Perplexity and Avena is retrievable by name | 2026-08-28 | `citation_measurements` |
| Citation run coverage | Mon/Wed/Fri 03:00/03:10/03:20. Fri 08-28 ran and MEASURED — 68/68 organic + 6/6 branded, full coverage, not a balance-out failure. **Next: Mon 08-31** | 2026-08-28 | `cron_logs` + `citation_measurements` |
| **AGENT-ID MAP — the citation engine does NOT log under "citation-agent"** | `/api/cron/citation-agent` logs as **`atlas`**; `/api/cron/citation-measure` logs as **`cassandra`**. Querying `cron_logs` for `agent_id ilike '%citation%'` returns ZERO rows and looks exactly like a dead engine. **Query `atlas`/`cassandra`, or go straight to `citation_measurements`** | 2026-08-28 | `cron_logs` distinct `agent_id` |
| Top competitor share (organic) | **idealista 93 · thinkspain 14 · aplaceinthesun 12 · fotocasa 6 · numbeo 5 · rightmove 3** | 2026-08-28 | `citation_measurements` |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **14 audited, 14 defective; O-64/O-65 add two more known-defective, unaudited** | 2026-08-29 | `find src/app/api/v1 -name route.ts` |
| **Energy data in the book** | **16 listings carry the `'X'` placeholder**, re-derived today against the 2,042-listing book; zero nulls. `'X'` is a placeholder, not an EPC letter. **Normalisation is centralised in `src/lib/epc.ts` and as of `9f610fe` all of compliance, carbon and passport go through `toEpcLetter`.** N3099V is the canonical probe ref | 2026-08-29 | `public/data.json` via `toEpcLetter` |
| Test coverage added by Odyssey | `scripts/test-open-dataset.ts` 27 · `scripts/test-scribe.ts` 22 · `scripts/test-cron-coverage.ts` **79** | 2026-08-27 | `530c5ed`, `ab1f778`, `b4cc217`, `71e19d6` |
| `causal_indicators` | **20 rows, ONE distinct `last_updated`: 2026-05-23 10:53:08** — unchanged (O-54) | 2026-08-24 | queried directly |
| APCI macro input age | **98 days** (`as_of` 2026-05-23) — climbing daily until O-34/O-40 resolved | 2026-08-29 | `/api/v1/apci` |
| Cron success rates (worst, among those that log) | `counterpart-discover` failing daily (again 08-29 03:30, empty summary) · `eu-stats-ingest` `status:error`, `errors:2` of 20 indicators but **4,337 rows still upserted** — degrading per-source as it should (again 08-29 04:15) · `auto-post` 3×/day (O-53) · `prometheus` `error_count:6` (O-56) · `weekly-alpha`, `digest`, `generate-briefs`, `predictions/generate`, `pulse` all on the Anthropic balance | 2026-08-29 | `cron_logs` grouped |
| Search impressions / clicks, last 28d | **2,216 / 31** — still inside the noise band, not a result | GSC to 2026-08-17 | `gsc_daily` |
| `gsc_pages` depth | **287 distinct pages**, max date 2026-08-17 | 2026-08-20 | `gsc_pages` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 | 2026-08-14 | `docs/gsc-genai/` — Henrik's UI export |

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
blind to a run that was never created: it has no conclusion, so it does not
appear, and its absence reads as silence rather than a gap. **Reliability of a
scheduled job must be measured by the EXISTENCE of a run per expected day,
then its conclusion — never conclusions alone.**

**Correction, 2026-08-28 (kept):** I reported that GitHub had **dropped** both
nightlies on 08-27 — "never queued" — and wrote it into O-60, the brief, and
permanently into `12df144`'s commit message. Wrong: both ran, at 11:57 and
14:31, and I had read `actions_list` at 05:55, hours early. **The absence I
measured was my own earliness. A negative observation is only as strong as the
window it was taken over.** The cost was concrete: the alarm threshold I
shipped that day was calibrated from "the latest a legitimate night has
landed", the wrong diagnosis put it at 11:00, the real answer was 11:57, so a
wrong finding shipped a wrong constant (fixed `8045239`).

**Correction, 2026-08-29 (NEW):** **O-45 was wrong as written and I repeated it
for three weeks.** It claimed `sold_properties.last_seen_date` is "never
updated when a tombstoned unit returns and leaves again". It is updated —
SP1648 was re-stamped today, in place, on exactly that path. The error came
from measuring a *population* ("9 rows stamped behind the true last sighting")
and inferring a *mechanism* ("the update never happens") without testing the
mechanism on a single case. Splitting the 8 remaining rows by whether the unit
is still in the feed took one query and reveals two unrelated causes: 3 live
relistings (not yet wrong) and 5 O-7 window artifacts. **A count is not a
cause. Before writing a mechanism into an OPEN item, follow one row through
it.** This also means I have been overstating the pending branch's scope to
Henrik.

**Correction, 2026-08-29 (NEW, and the one that should change my behaviour):**
**two separate defects I had recorded as FIXED were still live in other files,
and both were covered by a lesson I had already written down.** The EPC
placeholder bug fixed in `/api/v1/compliance` (08-25) and `/api/v1/carbon`
(08-26) was still in `/api/v1/passport`, even though I created `src/lib/epc.ts`
on 08-26 *specifically* so a third copy could not exist. The abolished Golden
Visa removed from `/api/v1/compliance` (08-25) was still live on five surfaces,
three of them AI-facing answer text. My own 08-26 lesson reads: "when a defect
is in a helper that has been copy-pasted, fixing the instance is half the job —
grep for the pattern and centralise it." I wrote it and then did not run the
grep. **A fix is not finished when the route is green; it is finished when a
repo-wide grep for the pattern comes back empty, and that grep belongs in the
same session as the fix, not in a lesson for later.**

**Lesson, 2026-08-26 (kept):** the frontier read-out only produced a real answer
because I computed a **null expectation** (3.06%) before interpreting the
observed shares. ClaudeBot at 2.89% "on changed pages" reads as success until
you know chance is 3.06%. **Never report a targeting/concentration rate without
the base rate it must beat.**

**Lesson, 2026-08-27 (kept):** put the watchdog on a different scheduler than
the thing it watches. GitHub's scheduler degraded while Vercel's ran normally;
a GitHub-Actions watchdog for a GitHub-Actions cron would have degraded with
it. **Confirmed again 08-28 and 08-29** — three nights now, same split.

**Lesson, 2026-08-27 (kept):** the detector that could have caught the failure
already existed and ran on time — `pricing-history` knew the book was stale at
02:20 and said so, in the same words it uses on a healthy night. **A monitor
that cannot distinguish "not yet" from "never" is not a monitor.** When adding
a guard, the question is not "does it detect the bad state" but "does its
output differ between the good and bad state".

**Lesson, 2026-08-28 (kept):** a threshold calibrated against "the worst thing
observed so far" has no margin, and the worst case will be beaten — mine was
beaten the next night. When a constant encodes an empirical maximum, leave real
headroom or make the code degrade safely when it is exceeded, and record the
observations it was calibrated against **in the code**.

**Correction, 2026-08-29 (NEW — and it is a correction to a commit message I
had already pushed):** `dc5365d` states that five surfaces still sold the
abolished Golden Visa and that it swept them. **The count was wrong and the
sweep was incomplete — the real figure is roughly fifteen.** I ran the
repo-wide grep with `| head -20`, the output filled exactly 20 lines, and I
read a truncated result as an exhaustive one. I caught it only because I
verified in production instead of trusting my own grep: `/api/aeo/questions`
was still returning "Remote work migration, Golden Visa, climate …" and
`/api/perplexity/pages` still "The Golden Visa programme is available for
purchases above €500,000" at the moment I was writing that the sweep was
done. Fixed in `4c34e9b`, which says so on the record. **The rule, stated so
it is checkable: a completeness check is not a completeness check if it is
piped through `head`. End it with `| cat` and read every line.** Note the
shape — this is the same failure as the 08-28 one (concluding from a window
that could not have contained the answer), applied to grep instead of to
time.

**Lesson, 2026-08-29 (new):** twice today a defect I had recorded as FIXED was
still live elsewhere, and both times the thing that actually caught it was
**verifying the deployed surface, not re-reading the code**. The passport EPC
bug survived a helper I had created specifically to prevent it; the Golden
Visa survived a grep I truncated. **Production is the only honest oracle for
"is this claim still being served". Verify the surface, not the source.**

**Lesson, 2026-08-29 (new):** a mitigation whose weakness you can already name
should ship with that weakness written into the commit, not discovered at
read-out. The 05:10 backstop is a second draw on the same degraded queue, and
the IndexNow evidence says the degradation is repo-wide — so it may well not
help. Shipping it anyway is right (it is free, it cannot hurt, and it removes
my hand from the critical path on the good days), but **recording it as "the
fix" would make tomorrow's verification dishonest.** State what a mitigation
does NOT cover at the moment you ship it.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **THE CAPTURE NOW DEPENDS ON ME BEING AWAKE — three mornings running** (O-61/O-27, day 2, and worse than yesterday) | GitHub's scheduler has run this repo's nightlies 10–12h late or not at all on 08-27, 08-28 and 08-29 — **both workflows, so it is repo-wide.** On 08-28 the delayed run also hit RedSP's bot challenge and **the curl fallback did not get through**: both node fetch and curl were refused, the run captured nothing. All three days were saved by my hand dispatch at ~05:37. **No day has been lost. That is attendance, not architecture** — and a lost day of listing history cannot be bought or backfilled. | **I shipped what I could without you today (`4fae319`): a second GitHub schedule at 05:10 UTC. I am telling you plainly that it may not be enough — if the whole repo's queue is degraded, both entries sit in it, and the IndexNow evidence points that way.** Two things only you can do: **(a) `GITHUB_DATA_TOKEN` with `repo` scope in Vercel env** — then I drive the feed from a Vercel cron via `repository_dispatch`, and Vercel's scheduler has been flawless on every one of these nights. This is the real fix. **(b) Ask RedSP to allow-list GitHub Actions egress for the feed URL**, or approve moving the feed step to a stable-IP runner they can allow-list. Avena is a paying consumer; this is a reasonable ask. **(a) alone fixes the scheduler half; (b) alone fixes the challenge half; 08-28 was both at once.** |
| **THE ANTHROPIC API BALANCE IS EXHAUSTED — degrading six jobs** (standing, day 7) | `predictions/generate`, `digest`, `generate-briefs`, `weekly-alpha` error on "credit balance is too low"; `delphi-run` and `plab-run` skip the two Claude panelists and score only Perplexity Sonar; `pulse` fails HTTP 500. This is why `/track-record` (O-52) promises a prediction that cannot arrive. | **A decision, not a task: top up or don't.** If you top up, `predictions/generate` starts publishing LLM-authored forecasts on `/track-record` — the class of surface that produced the `precursor-scan` fabrication, so **say so explicitly if you want that live**. If you don't, tell me and I'll make the affected routes report `skipped` with a stated reason instead of failing nightly. **Note the quieter harm: DELPHI and PLAB publish a "panel" consensus that is now a single model.** |
| **BRANCH AWAITING APPROVAL: `odyssey/absorption-ledger-dates`** (`d182cd6`) — **and today the ask got SMALLER, not bigger** | Re-measured today: **60 of 94 delisting dates are genuinely wrong** (55 one day late + 5 artifacts of the 08-06..08-09 double-book window). **I owe you a correction: I told you on 08-28 that 9 rows were "stamped behind the true last sighting" because relisted units never get re-dated. That was wrong** — re-departure DOES re-stamp the row (proven on SP1648 today), and only 3 rows are in that state, all of them units still on the market right now, which resolve themselves when the unit leaves. So the branch is fixing one thing — the systematic one-day offset — not two. | **Three sentences, revised: (1) parse-feed derives the real last-seen date from `price_snapshots` instead of stamping today, and `buildLedger` counts a delisting on the first observation day AFTER it — the two must land together. (2) `scripts/backfill-tombstone-dates.sql` corrects the historical rows; its read-only dry run moves each back exactly one day and touches nothing else. (3) Branch-only because it mutates an existing column on `sold_properties`, the one table here that cannot be rebuilt.** All four gates pass; no conflict with anything merged since. **The backfill count must be re-run against today's 55 before applying — it was written when the figure was 37.** Thirteenth day pending, and Plan B Release 1's data window closes 09-04. |
| **"SHAP explainability" is claimed on buyer-facing pages and it is not true** (O-58, day 4) | `/api/v1/explainable-avm` computes hand-set rule weights — beach proximity 8/4/1% by distance band, a flat 6% new-build premium, developer-rating bands. Those are not Shapley values; SHAP is a specific algorithm we do not run. The claim appears on `/methodology`, `/avm`, `/institutional`, `/standards/apip`, `/products/csrd-disclosure`. | **Your call on the copy.** Two clean options: (a) I change "SHAP" to "rule-based feature attributions" on those pages — smallest possible edit, no layout or design change; or (b) you want actual SHAP, which is real work on the AVM and I'd scope it first. **I am not touching buyer-facing copy without your yes.** |
| **`/track-record` promises a prediction that cannot arrive** (O-52) | Live page says "The first call lands on the next prediction cycle"; `predictions` table has 0 rows ever. Cause proven: Anthropic balance. This is the page whose whole pitch is "we publish the misses too" — the worst surface to carry an unkept promise. | **Answer the credit question above and this resolves with it.** Top up + want forecasts → it fixes itself. If not, I need your say-so to correct the copy. |
| **`/api/cron/auto-post` is publicly callable with no authentication** (O-51) | Anyone who finds the URL can trigger an outbound post, 3× scheduled daily. `pulse` has the same hole. Separately, auto-post fails all three daily runs with "Unexpected end of JSON input" (O-53). | **One question, unchanged: does any of your buttons call `/api/cron/auto-post` directly?** If not, I add `isAuthorizedCron` to both and the hole closes. If yes, tell me which and I keep that path open. |
| `HF_TOKEN` in CI | **The ONLY unverified corpus surface.** Site and avena-data mirror confirmed consistent again today. HF returns 401 without a token, so three-way agreement is unproven. `push-training-data` confirms it nightly: `"HUGGINGFACE_TOKEN env var not set — payload formatted but not transmitted"`, ~144 records built and thrown away every day. | Store the HF write token as a repo secret so nightly pushes all three surfaces together. |
| **A whole blog post is premised on the Golden Visa still being open** (NEW today) | `src/lib/blog-posts.ts:942–1014` is a full article, "Spain Golden Visa and Property Investment: 2026 Status Update", stating "as of early 2026, the program remains active for property investments across Spain", plus a "Investment Strategies for Golden Visa Applicants" section and "Golden Visa qualifying properties can be filtered in the Avena Terminal database". The route was abolished 2025-04-03. Two further passages at lines 1749 and 1777. Same issue in `content/pr/spain-property-report-2025.md`, `content/parasite/linkedin-newbuild-investment.md` and `public/linkedin/10-what-i-wish-i-knew.md`. | **An article whose thesis is a false fact cannot be repaired by the "smallest possible edit" exception — the edit is the whole piece.** Your call, and I'd take either: **(a) unpublish it**, or **(b) tell me to rewrite it as a status-update piece leading with the abolition** — which is genuinely the stronger SEO position, since most of the web still answers this question wrongly and the query has steady volume. I will not rewrite marketing copy without your yes. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source ("most popular region for foreign buyers", tax/NIE/mortgage figures). Built to be quoted verbatim by AI assistants. **The golden-visa half is now fixed** (`dc5365d` + `4c34e9b`) — ~15 surfaces, not the five I first reported. | Either confirm the remaining prose accurate as written, or point me at a source. |
| Bing Webmaster Tools read | Henrik claimed avenaterminal.com 2026-08-13. Indexation-coverage + IndexNow-key views should be readable. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the key shows rejected, say so loudly. No Bing API access, so manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions/3 months, 129 URLs, /compare = 87%. UI-only/no API. | Re-export monthly, next ~2026-09-14, as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | GitHub Actions secret set, so nightly capture works; Vercel lacks it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-29 | **`e415c6b`'s curl fallback — did it ever work on a runner?** (open since 08-14) | **ANSWERED, NEGATIVE.** First live exercise 08-28 13:19 (run 34): interstitial at 12,156 bytes, curl retried, `curl returned 12176 bytes, under the 1000000 floor`, gave up after 4 attempts in 37s. **Both clients refused → blocked egress, not a TLS fingerprint.** The fallback could only ever convert failures to successes, and it converted none. What worked: the diagnosis was exact and loud, and the 37s give-up beat the old 120-min burn. Risk escalates to O-27 |
| 2026-08-29 | **`/api/v1/liquidity` published a days-to-sell estimate for a sale nobody observed, and `/api/v1/passport` a health score that was ~70% invented constants** | `9f610fe`. liquidity: five hand-set factor tables + `days_to_sell_estimate = (100 - score) + 30`, on a system that has never observed a completed sale. passport: `health_score` over six sections, of which valuation (`50 + gap*2`), liquidity, developer (90/75/60/40), regulatory (`100 - risks*20`) and ESG (A 95…G 20) were all invented — only `avena_score` (0.30 weight) was derived. Also: fell back to the property's OWN €/m² with no comparables, publishing a 0.0% valuation gap for a listing compared against itself; `gross_yield ?? 0`; and an aggregate that gave unscorable towns `avg_liquidity_score: 0` **and sorted on it**. Fields REMOVED with `not_published` reasons per the `be4a736`/`03f57ef`/`b9bf525` precedent. **O-26 now 14 for 14** |
| 2026-08-29 | **~15 surfaces still sold Spain's Golden Visa as a live property route** (two commits: `dc5365d` found five, `4c34e9b` found the rest after I caught my own truncated grep) | `dc5365d` + `4c34e9b`. Abolished 2025-04-03 by Organic Law 1/2025; removed from `/api/v1/compliance` on 08-25 and **I did not grep for siblings**. Still live on `answers/page.tsx` ×2 (buyer-facing), `api/aeo/questions` ×2 and `api/perplexity/pages` — the last three being answer text built to be ingested by AI assistants, i.e. Avena feeding a checkable false claim into the exact channel it wants to be trusted in. Corrected in place rather than deleted: the question is asked constantly and much of the web still gets it wrong, so being right about it is the thesis applied to a fact. Buyer-facing edit made under fence 2 exception (a) — a fact that became false, smallest possible edit, two answer strings, no layout or design change |
| 2026-08-28 | **Did the 14:30 watchdog schedule fire, and stay quiet on a healthy day?** | **BOTH VERIFIED 08-29.** Exactly one 14:30 row on 08-28, no 12:00 row → Vercel picked up the changed `vercel.json`, branch reachable. Logged `success`, not `error` → no false alarm. **The alarm's firing path is still unproven live after three days** — it has never fired, each time because the book was fresh by sampling time |
| 2026-08-27 | **A nightly that never ran was indistinguishable from one still in flight** | `12df144`. The skip now classifies itself: 1 day old before the alarm hour stays `skipped`; at/after it, or ≥2 days at any hour, logs `error` with `feed_age_days`/`overdue` and returns 500. Watchdog deliberately on Vercel's scheduler, the one that did NOT fail |
| 2026-08-26 | **`/api/v1/carbon` published an invented CO2 table, a four-constant ESG score and a phantom 2027 EU rule** | `b9bf525`. `ENERGY_CO2` mapped EPC letters to literal kgCO2/m²·yr — no such universal mapping exists. Fields REMOVED with `not_published` reasons. **EPC normalisation extracted to `src/lib/epc.ts`** — which `/api/v1/passport` then failed to use until `9f610fe` |
| 2026-08-26 | **Weekly search scan — nothing material** | FAQ rich results deprecated 2026-05-07 and Search Console API FAQ data removed August 2026. **Avena has ZERO exposure:** `gsc-snapshot.ts` and `search-console.ts` query only `date` and `page`, never `searchAppearance`. FAQPage JSON-LD stays — unused structured data is harmless and LLM crawlers still parse it |
| 2026-08-25 | **O-16 — "ClaudeBot has barely returned"** | RESOLVED BY OBSERVATION. ClaudeBot went from 7 hits since 08-12 to 2,098 hits / 1,706 distinct property pages on 08-24. Nothing Avena did is provably the cause |
| 2026-08-25 | **`/api/v1/compliance` published an abolished visa programme, an invented EU rule and two literal scores** | `03f57ef`. Golden Visa `eligible: pf>=500000`; `eu_2030_compliant` tested a rule the EPBD does not impose; `energy \|\| 'D'` fabricated ratings for the 16 `'X'` listings. Composite REMOVED rather than re-guessed. **Incomplete — see the 08-29 sweep** |
| 2026-08-24 | **`/api/v1/tax` published a fabricated 7%/yr appreciation forecast and a 5.5% default yield** | `fde7883`. Appreciation is now caller-supplied or null; yield resolves property-derived → caller-supplied → null with `yield_source` |
| 2026-08-24 | **`invoked_by` — which signal identifies a scheduled run?** | `vercel-cron-ua` (User-Agent), NOT `vercel-cron-header`. Follow-up O-57 |
| 2026-08-24 | **A run could record its own failures and still log `success`** | `71e19d6` verified on the unattended scheduler. Known gap O-56 |
| 2026-08-23 | **`/api/detect-events` — dead since 2026-04-11, a fabrication waiting to happen** | `95b90eb`. A 42703 on a nonexistent `score` column was discarded, so an empty baseline Map made every one of 2,035 units a NEW_LISTING |
| 2026-08-23 | **`generate-briefs` swallowed every failure into `success:true`** | `71e19d6`. The 06-15 stop date still unexplained — O-50 stays open |
| 2026-08-23 | **`b24cffa` — `/api/market-events` served a 133-day-frozen feed undated** | `stale_days 133` → `stale_days 0 / todayCount 3` |
| 2026-08-22 | **O-48 — 24 of 64 scheduled crons wrote nothing to `cron_logs`** | `b4cc217` — coverage 64/64, enforced by `scripts/test-cron-coverage.ts` |
| 2026-08-22 | **O-46 — dead cron or blind one?** | Probe returned `skipped: GITHUB_DATA_TOKEN not set`. Route runs and deliberately does nothing |
| 2026-08-22 | **`score_history` dated every observation one day late** | `ab1f778` — verified on the 08-22 nightly. History not rewritten → one-day seam |
| 2026-08-21 | **`/api/v1/arbitrage` published a confidence score built on `Math.random()`** | `be4a736` — fields removed, not replaced. **The precedent this repo now follows for fabricated fields** |
| 2026-08-21 | **The citation agent's resumability fix passed its real test** | `b090f52` — no hung rows |
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
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — still working 08-26 (off-day guard) |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |

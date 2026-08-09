# Google Ads — setup sheet for Avena

*Everything on the code side is done and dormant. This is your half.*

---

## Why Google and not Meta

Google's housing/employment/credit targeting restrictions apply to **the US
and Canada only**. Norway keeps full targeting — age, demographics,
everything Meta removed when housing became a Special Ad Category across
Europe in 2026.

And search is intent-based. Someone typing *"kjøpe bolig i Spania"* has already
decided. Nobody scrolling Instagram has.

---

## Step 1 — Create the account

1. **ads.google.com** → Start now → sign in with your Google account
2. When it pushes you into the guided "Smart campaign" flow, look for
   **"Switch to Expert Mode"** at the bottom. Take it. Smart campaigns hide
   the keyword controls you need.
3. Create campaign → **Create a campaign without a goal's guidance** →
   **Search**

Do NOT let it publish a campaign during onboarding. Set the daily budget to
€5 before you finish.

## Step 2 — Conversion tracking (do this BEFORE spending)

Tools (🔧) → **Conversions** → **New conversion action** → **Website**

| Field | Value |
|---|---|
| Website | avenaterminal.com |
| Conversion name | `Enquiry` |
| Category | Submit lead form |
| Value | Use the same value — **1200** (see note) |
| Count | One |
| Click-through window | 90 days |

*Value note: €1,200 is a deliberate estimate — a €12,000 commission at a
1-in-10 lead-to-sale rate. It is a guess, and you should revise it the moment
you have real data. But Google bids better with a value than without one.*

Then choose **"Use Google tag"**. It will show you two things:

```
Conversion ID     AW-XXXXXXXXXX
Conversion label  AbC-D_efGhIjK
```

Send me both, or add them yourself in Vercel → Settings → Environment
Variables:

```
NEXT_PUBLIC_GOOGLE_ADS_ID          AW-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL  AbC-D_efGhIjK
```

Redeploy after adding. The tag is already in the code and renders nothing
until those exist.

## Step 3 — Campaign settings

| Setting | Value | Why |
|---|---|---|
| Campaign type | Search | Intent, not interruption |
| Networks | **Search only** — uncheck Display and Search Partners | Display burns small budgets on junk placements |
| Locations | Norway | |
| Location option | **"Presence: People in or regularly in"** — not the default | The default includes people merely *interested in* Norway |
| Languages | Norwegian **and** English | Many Norwegians run their phone in English |
| Bidding | **Maximise clicks**, max CPC limit €1.50 | Switch to Maximise Conversions only after ~15 conversions |
| Daily budget | €5 | |

## Step 4 — Keywords

**Honest warning first:** Search Console shows **zero** Norwegian queries
reaching Avena in the last 90 days. So Norwegian volume is unproven. Check
each of these in Keyword Planner before launching — if a term shows under ~50
searches/month, drop it.

Use **phrase match** (in quotes). Broad match on a €5 budget is how you end up
paying for "bolig oslo".

```
"kjøpe bolig i spania"
"bolig i spania"
"leilighet i spania"
"nybygg spania"
"bolig costa blanca"
"bolig costa del sol"
"feriebolig spania"
"kjøpe leilighet spania"
"hus i spania til salgs"
"eiendom spania"
```

**Negative keywords — add these on day one**, they will otherwise eat the
budget:

```
-leie          -leiebil       -jobb        -flytte
-skatt         -pensjon       -hotell      -ferie
-gratis        -jobbe         -visum       -oslo
```

## Step 5 — Ad copy

Landing page: **https://avenaterminal.com/no** (Norwegian, 18 paths to the
enquiry form).

Responsive Search Ad — give it these headlines (30 chars max each):

```
Kjøpe bolig i Spania?
Start med tallene
1 996 nybygg scoret daglig
Se hva boligen er verdt
Underprisede kystboliger
Costa Blanca og del Sol
Norsk megler i Spania
Gratis prisanalyse
```

Descriptions (90 chars max):

```
Hver nybygg på kysten scoret på pris mot marked, leieavkastning og utbygger.
Vi viser deg tallene før du forelsker deg i bildene. Norsk rådgivning.
Se hvilke boliger som faktisk ligger under markedspris i sin egen by.
```

Sitelinks — add all four, they're free and lift CTR:
- Denne ukens beste kjøp → `/deals`
- Costa Blanca eller del Sol? → `/no/costa-blanca-eller-costa-del-sol`
- Slik kjøper du i Spania → `/no/kjope-bolig-i-spania`
- Snakk med oss → `/enquire`

## Step 6 — After launch

**Day 3:** Search terms report (Campaigns → Insights → Search terms). Add every
irrelevant query as a negative. This is the single highest-value hour you will
spend.

**Week 2:** Anything with 100+ impressions and 0 clicks → pause or rewrite.

**Week 4:** If you have 15+ conversions, switch bidding to Maximise
Conversions. If you have zero, the problem is the offer or the landing page —
not the bid. Stop and rethink rather than raising budget.

---

## What's already done in code

- Google tag mounted, dormant until the two env vars are set
- `trackEvent()` dispatches to Google Ads, Meta and TikTok from one call
- Enquiry form fires the conversion on **confirmed success only**, never on submit
- Concierge fires the same conversion — leads from both paths are counted
- Enquiry pipeline verified end to end: stored, agent emailed, buyer acknowledged

## Budget reality

€5/day is €150/month. At €1.50 max CPC that is ~100 clicks/month. At a 5%
enquiry rate that is **5 leads a month**. At 1-in-10 closing, one sale roughly
every two months — but property cycles run 6–18 months, so the first close is
next year, not next month.

This builds a pipeline. It does not solve a cash problem. Run it alongside the
free channels, not instead of them.

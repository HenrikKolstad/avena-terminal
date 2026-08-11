# Avena — Revenue Plan (beyond subscriptions)
*Written 2026-08-11 while Henrik was out. Premise: the moat is the change ledger; every revenue stream below is the same ledger sold in a different shape.*

---

## The core realisation

We keep trying to monetise the *audience* (buyers, subscriptions). But Avena's rarest asset isn't an audience — it's **intelligence about the supply side that the supply side itself doesn't have**. A developer in Estepona does not know that a competitor cut 2.7% on Thursday. We are literally the only party in existence who can tell them. Sell up the supply chain, not just down to buyers.

## Stream 1 — Market Pulse subscriptions (B2B, start THIS WEEK)

**The product is built.** `out/Avena-Market-Pulse-Estepona-W33.pdf` is a working sample generated from the live ledger: every observed reprice in Estepona this week, aggregates, benchmark position, and the pitch. €500/month per market area, first month free.

- **Who buys:** developers with active projects (749 developer refs in our book), sales agencies, funds doing acquisition diligence on the coast.
- **Why they can't say no:** the alternative is not a cheaper competitor — it's blindness. This data exists nowhere else at any price.
- **Cost to serve:** ~zero. The generator runs off `price_snapshots`; automation is a script per subscriber.
- **Honest caveat:** week one of certified ledger. Sell it as "ground floor of a series that deepens daily" — early customers lock pilot pricing.
- **Math:** 10 subscribers = €60k/yr. 50 = €300k/yr. The book covers 69 towns.

## Stream 2 — Buyer's Due-Diligence Report (B2C, one-off)

One property, one buyer, €49–99, generated on demand: observed price history, benchmark position, yield model with assumptions, developer's other repriced projects, absorption in the town. Stripe already wired. Every AI-referred visitor (~30/day from ChatGPT alone) is a prospect at the exact moment of maximum willingness to pay.
**Needs Henrik's call** — it touches the buyer surface (a purchase button somewhere), so not built without approval.

## Stream 3 — Referral revenue on the buyer flow (zero product work)

High-intent foreign buyers need: currency exchange (Wise/Currencies Direct pay per referred conversion), Spanish mortgages (brokers pay €300–1,000 per funded referral), lawyers/gestoría. We already hold the buyer relationship via enquiries. This monetises leads we currently only monetise at 3–6% *if* a sale closes — referrals pay on the 90% that don't.

## Stream 4 — API licensing (the CASAFARI flank)

Same data, machine shape: `/api/v1/*` metered keys. Target: proptech tools, AVM vendors, academic/quant funds. Price: €250–2,000/mo by volume. Low effort because the endpoints exist; needs metering + Stripe.

## What I did NOT put on this list

- **"AI visibility monitoring" as a service** (selling the crawler-ledger concept to other companies). Real business, but it's a *second company*. Focus.
- **Selling the raw ledger outright** — a one-time sale of the moat is selling the goose.

## Recommended sequence

1. **This week:** send Market Pulse sample to 5 prospects (agencies/developers active in Estepona, Torrevieja, Mijas — our most active towns). One yes = first data revenue.
2. **Next:** referral partnerships (one email each to Wise business + 2 mortgage brokers).
3. **On Henrik's approval:** buyer's report behind Stripe.
4. **When first Pulse customer exists:** automate generation per subscriber town.

*A signed €500/mo pilot is also the single best line to add to every investor follow-up: "data revenue started."*

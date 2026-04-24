# avena-score

> The Avena Score Engine — open-source property scoring for European new-build real estate.

```
S = 100 × (0.40·V + 0.25·Y + 0.20·L + 0.10·Q + 0.05·R)
```

Given any property's price, size, location, and basic characteristics, `avena-score` returns a 0–100 Avena Score with a full, auditable component breakdown. The same engine powering [avenaterminal.com](https://avenaterminal.com).

## Install

```bash
npm install @avena/score
```

Or use the CLI:

```bash
npx @avena/score --price 385000 --built 176 --region "costa blanca" --beach 0.8
```

## Node.js API

```ts
import { scoreProperty } from '@avena/score';

const result = scoreProperty({
  price_eur: 385_000,
  built_m2: 176,
  bedrooms: 3,
  bathrooms: 2,
  beach_km: 0.8,
  property_type: 'villa',
  town: 'Torrevieja',
  region: 'Costa Blanca',
  town_median_m2: 2543,
});

console.log(result.score);        // → 78
console.log(result.components);   // → [{ code: 'V', value: 0.82, ... }, ...]
console.log(result.verdict);      // → 'High conviction. Multiple components above market...'
```

## Methodology

Each sub-score maps to a weighted 0–1 value:

| Code | Weight | Meaning                                         |
|------|--------|-------------------------------------------------|
| V    | 40%    | Valuation — discount vs town/regional €/m²      |
| Y    | 25%    | Yield — gross rental yield, 0–8% scale          |
| L    | 20%    | Location — region tier × beach proximity        |
| Q    | 10%    | Quality — property type + beds + size band      |
| R    | 5%     | Risk — macro + liquidity (public default: 0.6)  |

Full methodology + hedonic regression details: [avenaterminal.com/research/avena-score](https://avenaterminal.com/research/avena-score).

## Reproduce

All data used to tune V and Y is public:

- Live Spanish new-build comps: `GET https://avenaterminal.com/api/v1/properties`
- Town medians: `GET https://avenaterminal.com/api/v1/market`
- Bubble/regime signals: `GET https://avenaterminal.com/api/v1/bubble-scanner`

To reproduce the 1,881-property backtest:

```bash
git clone https://github.com/avenaterminal/avena-score
cd avena-score
npm install
npm test
```

## Challenge

Beat our scoring accuracy on the 2026 holdout set and enter the public leaderboard at [avenaterminal.com/challenge/score-2026](https://avenaterminal.com/challenge/score-2026).

## License

- **Engine code:** MIT
- **Training data:** CC BY 4.0
- **Cite as:** `AVENA Score Engine · Avena Terminal (avenaterminal.com)`
- **DOI:** [10.5281/zenodo.19520064](https://doi.org/10.5281/zenodo.19520064)

## Contributing

Open issues, PRs, backtest results welcome. The engine is versioned — `v1.0` is frozen. Proposed improvements land in `v2.x` branches with published evaluation numbers.

## Who's using it

- [Avena Terminal](https://avenaterminal.com) production (primary user)
- [Xavia Estate](https://xaviaestate.com) brokerage
- Your project here? Open a PR to add.

---

Built in public, open in principle. Put us on your README:

```markdown
![Avena Score](https://avenaterminal.com/badge/YOUR-REF.svg)
```

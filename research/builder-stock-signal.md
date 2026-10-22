# Does the Avena coastal new-build series predict listed Spanish homebuilder stocks?

2 of 6 pre-specified tests have a held-out interval excluding zero and the same sign as the fit window (HOME event p = 0.022; MVC event p = 0.074). They are event contrasts, not the correlations. None is below the multiple-test bar of p < 0.0083, so this is not a finding of a signal. The overlap is 50 paired trading sessions (10 clean weeks) from 2026-08-05 to 2026-10-22.

This is a test, not a product claim. An exit from the captured book is a listing that left. It is not a confirmed sale. The capture has no developer name on a listing, so the series is the whole coastal book, not Neinor's book or Metrovacesa's book.

## What was tested

Claim family, fixed in `src/lib/builder-stock-signal.ts` before the prices were joined: 6 tests. The multiple-test bar is 0.0083 (0.05 divided by 6).

For each primary stock the claim tests are:

1. Pearson correlation of the exit rate on session T with the next session's excess log return.
2. The same correlation for the asking-price cut rate.
3. An event contrast: sessions whose exit rate is above the fit-window 75th percentile, versus the other sessions, on the held-out window. The difference in mean excess return is the statistic. The p-value is a permutation test.

Excess return is the stock's log return minus beta times the IBEX 35 log return. Beta is an ordinary least-squares slope with an intercept, fit only on sessions before 2026-08-05, and then applied to the test window. It is not refit on the overlap.

The out-of-sample split is chronological. The first 60% of pairs is the fit window. The rest is held out. A correlation is reported with a p-value and a 95% pair-bootstrap interval only when n is at least 8. Below that, the correlation may be shown and is marked as too small to test. Bootstrap draws: 5000. Permutation draws: 5000. Seed: 20260805.

The capture dated T can be written during the session, so the test does not treat it as known before the open. The outcome is the next session after T.

## Prices

Source: https://apiweb.bolsasymercados.es/Market/v1/EQ/HistoricalSharesPrices and HistoricalIndicesPrices (public, no key). Fetched 2026-10-22T23:20:32.827Z. facDivi and facMult were 0 on every downloaded share session, so closes were used with no corporate-action adjustment.

Names were checked against the BME listed-companies file on that fetch. Habitat Inmobiliaria and Vía Célere are not in it. AEDAS Homes is still listed. Neinor reported 96.83% ownership after the mandatory tender that settled on 5 March 2026, and the squeeze-out threshold on that tender was not met, so AEDAS was not delisted. It is a secondary name here, not an independent homebuilder. Inmobiliaria del Sur, Realia and Renta Corporación are listed in the same file and are included only as secondary names.

| Ticker | Name | Role | ISIN | Sessions in the window | Median volume | BME capitalisation |
| --- | --- | --- | --- | ---: | ---: | ---: |
| HOME | Neinor Homes | primary | ES0105251005 | 57 | 235,747 | EUR 1,670,779,478 |
| MVC | Metrovacesa | primary | ES0105122024 | 57 | 71,955 | EUR 1,635,070,956 |
| AEDAS | AEDAS Homes | secondary | ES0105287009 | 57 | 1,624 | EUR 972,325,000 |
| ISUR | Inmobiliaria del Sur | secondary | ES0154653911 | 54 | 841 | EUR 317,373,527 |
| RLIA | Realia | secondary | ES0173908015 | 57 | 6,667 | EUR 1,419,012,956 |
| REN | Renta Corporación | secondary | ES0173365018 | 57 | 9,423 | EUR 22,232,633 |

Market: IBEX 35 (ES0SI0000005), 314 closes in the download.

Beta, fit before the ledger starts:

| Ticker | Sessions | From | To | Alpha | Beta | R² |
| --- | ---: | --- | --- | ---: | ---: | ---: |
| HOME | 256 | 2025-08-04 | 2026-08-04 | -0.00129 | 0.680 | 0.219 |
| MVC | 256 | 2025-08-04 | 2026-08-04 | -0.00045 | 0.577 | 0.070 |
| AEDAS | 256 | 2025-08-04 | 2026-08-04 | -0.00006 | 0.071 | 0.005 |
| ISUR | 251 | 2025-08-04 | 2026-08-04 | 0.00053 | 0.162 | 0.011 |
| RLIA | 256 | 2025-08-04 | 2026-08-04 | 0.00031 | 0.083 | 0.004 |
| REN | 253 | 2025-08-04 | 2026-08-04 | -0.00074 | 0.222 | 0.016 |

## Avena series

Published movement ledger: 72 days, 2026-08-05 to 2026-10-22. Clean Monday-start weeks used as features: 10. Weeks set aside: 2. Trading sessions in the window: 57. Paired next-session observations for the first primary stock: 50.

Gaps, where the previous observation is more than one calendar day earlier. The later day is a catch-up. Its exits and price changes are not treated as a one-day event, and any week that contains one is dropped.

- 2026-10-13 then 2026-10-21 (8 calendar days)

The capture stores a project id on a listing, not a developer name. New listing refs are the first day that id appeared in a captured book. They are not a count of developer project launches, and they are not attributed to Neinor, AEDAS, Metrovacesa or anyone else.

Listings scanned for issuer names: 2039. Agency labels on the current book: Via Avena Estate, Via Xavia Estate.

| Name pattern | Listings whose text matched |
| --- | ---: |
| neinor | 0 |
| aedas | 0 |
| metrovacesa | 0 |
| habitat | 6 |
| inmobiliaria_del_sur | 0 |
| realia | 0 |
| renta_corporacion | 0 |

Examples of those matches, so a zero is not hiding a hit and a hit is not assumed to be the issuer:

- habitat N7396: ds in with the surroundings to create a habitat of its own, where the sun and the Mediterranean mark
- habitat N7397: ds in with the surroundings to create a habitat of its own, where the sun and the Mediterranean mark
- habitat N7398: ds in with the surroundings to create a habitat of its own, where the sun and the Mediterranean mark
- habitat N7399: ds in with the surroundings to create a habitat of its own, where the sun and the Mediterranean mark
- habitat N7400: ds in with the surroundings to create a habitat of its own, where the sun and the Mediterranean mark
- habitat N7401: ds in with the surroundings to create a habitat of its own, where the sun and the Mediterranean mark

Price-change rows joined to a town: 250. Rows whose town is not in the town file: 6.

## Claim results

For a correlation row, the interval is a pair bootstrap and the p-value is the Student-t p-value. For an event row, the interval is a bootstrap of the held-out mean difference and the p-value is a permutation p-value. "Diff" is the event-group mean minus the other-group mean.

| Ticker | Test | Fit n | Fit r or diff | Held-out n | Held-out r or diff | Held-out 95% interval | Held-out p | Same sign | Clears bar |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- | --- |
| HOME | exit rate: listings that left the book, divided by the book | 30 | 0.076 | 20 | 0.175 | -0.139 to 0.543 | 0.460 | yes | no |
| HOME | cut rate: asking-price reductions, divided by the book | 30 | -0.054 | 20 | 0.224 | -0.321 to 0.596 | 0.343 | no | no |
| HOME | event, exit rate above fit-window 75th percentile (threshold 0.00346; held-out groups 8 and 12) | 30 | 0.0039 | 20 | 0.0171 | 0.0033 to 0.0324 | 0.022 | yes | no |
| MVC | exit rate: listings that left the book, divided by the book | 30 | 0.225 | 20 | 0.135 | -0.129 to 0.479 | 0.569 | yes | no |
| MVC | cut rate: asking-price reductions, divided by the book | 30 | 0.032 | 20 | 0.328 | -0.034 to 0.624 | 0.158 | yes | no |
| MVC | event, exit rate above fit-window 75th percentile (threshold 0.00346; held-out groups 8 and 12) | 30 | 0.0028 | 20 | 0.0070 | 0.0004 to 0.0133 | 0.074 | yes | no |

Full-sample correlations for the same claim rows, which are not the test:

| Ticker | Feature | n | r | p | 95% bootstrap interval |
| --- | --- | ---: | ---: | ---: | --- |
| HOME | exit_rate | 50 | 0.146 | 0.313 | -0.114 to 0.378 |
| HOME | cut_rate | 50 | 0.137 | 0.344 | -0.190 to 0.433 |
| MVC | exit_rate | 50 | 0.194 | 0.178 | 0.0002 to 0.409 |
| MVC | cut_rate | 50 | 0.212 | 0.140 | -0.032 to 0.446 |

Smallest absolute correlation a single two-sided 5% test could reject, before the multiple-test correction: 0.28 on the daily claim sample, 0.63 on the weekly sample. A result inside that range is a failure to find a large correlation. It is not a proof that the correlation is zero.

The full-sample interval for MVC exit rate: listings that left the book, divided by the book excludes zero (0.0002 to 0.409). That is the full sample. The held-out interval is the one in the claim table. The bound closer to zero is 0.0002, which is inside 0.01, so the interval does not separate the correlation from zero in any practical sense.

The held-out HOME event contrast is concentrated. The three largest event-day excess returns are 87% of the sum of the event-day excess returns. A difference that depends on a few sessions is not a repeated pattern.

The held-out MVC event contrast is concentrated. The three largest event-day excess returns are 72% of the sum of the event-day excess returns. A difference that depends on a few sessions is not a repeated pattern.

## Sensitivities

These were computed in the same run. They are not in the claim family. A large number here would be a reason to pre-specify a new test on a later, longer sample. It would not be a result of this one.

| Ticker | Role | Frequency | Feature | Outcome | n | r | 95% interval | Held-out n | Held-out r |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | ---: |
| HOME | primary | daily | log change in the number of listings observed | excess | 49 | -0.137 | -0.397 to 0.134 | 20 | -0.015 |
| HOME | primary | daily | new listing refs, counted on the first day the ref appears in the captured book | excess | 50 | -0.125 | -0.383 to 0.120 | 20 | -0.023 |
| HOME | primary | daily | exit rate: listings that left the book, divided by the book | raw | 50 | 0.104 | -0.151 to 0.336 | 20 | 0.130 |
| HOME | primary | daily | cut rate: asking-price reductions, divided by the book | raw | 50 | 0.139 | -0.199 to 0.459 | 20 | 0.332 |
| HOME | primary | weekly | exit rate: listings that left the book, divided by the book | excess | 10 | 0.737 | -0.409 to 0.975 | 4 | 0.991 |
| HOME | primary | weekly | cut rate: asking-price reductions, divided by the book | excess | 10 | 0.560 | -0.168 to 0.878 | 4 | 0.163 |
| MVC | primary | daily | log change in the number of listings observed | excess | 49 | -0.203 | -0.412 to 0.028 | 20 | -0.084 |
| MVC | primary | daily | new listing refs, counted on the first day the ref appears in the captured book | excess | 50 | -0.056 | -0.283 to 0.181 | 20 | -0.043 |
| MVC | primary | daily | exit rate: listings that left the book, divided by the book | raw | 50 | 0.125 | -0.078 to 0.340 | 20 | 0.058 |
| MVC | primary | daily | cut rate: asking-price reductions, divided by the book | raw | 50 | 0.212 | -0.125 to 0.519 | 20 | 0.574 |
| MVC | primary | weekly | exit rate: listings that left the book, divided by the book | excess | 10 | 0.499 | -0.595 to 0.909 | 4 | 0.901 |
| MVC | primary | weekly | cut rate: asking-price reductions, divided by the book | excess | 10 | 0.633 | 0.034 to 0.885 | 4 | -0.252 |
| HOME | exploratory | weekly | exits in costa-del-sol | excess | 10 | 0.002 | -0.671 to 0.686 | 4 | -0.500 |
| MVC | exploratory | weekly | exits in costa-del-sol | excess | 10 | 0.083 | -0.838 to 0.719 | 4 | -0.799 |
| HOME | exploratory | weekly | exits in cb-north | excess | 10 | 0.755 | -0.096 to 0.964 | 4 | 0.989 |
| MVC | exploratory | weekly | exits in cb-north | excess | 10 | 0.514 | -0.160 to 0.873 | 4 | 0.954 |
| HOME | exploratory | weekly | exits in cb-south | excess | 10 | 0.596 | -0.125 to 0.951 | 4 | 0.830 |
| MVC | exploratory | weekly | exits in cb-south | excess | 10 | 0.343 | -0.539 to 0.907 | 4 | 0.935 |
| HOME | exploratory | weekly | exits in costa-calida | excess | 10 | 0.694 | -0.412 to 0.945 | 4 | 0.808 |
| MVC | exploratory | weekly | exits in costa-calida | excess | 10 | 0.426 | -0.575 to 0.839 | 4 | 0.516 |
| HOME | exploratory | weekly | asking-price cuts in Costa Blanca North | excess | 10 | 0.339 | -0.164 to 0.842 | 4 | -0.297 |
| MVC | exploratory | weekly | asking-price cuts in Costa Blanca North | excess | 10 | 0.491 | -0.107 to 0.918 | 4 | -0.277 |
| HOME | exploratory | weekly | asking-price cuts in Costa Blanca South | excess | 10 | 0.698 | 0.456 to 0.959 | 4 | 0.661 |
| MVC | exploratory | weekly | asking-price cuts in Costa Blanca South | excess | 10 | 0.560 | 0.072 to 0.861 | 4 | 0.879 |
| HOME | exploratory | weekly | asking-price cuts in Costa Calida | excess | 10 | 0.332 | -0.463 to 0.845 | 4 | 0.331 |
| MVC | exploratory | weekly | asking-price cuts in Costa Calida | excess | 10 | 0.515 | -0.044 to 0.857 | 4 | 0.122 |
| HOME | exploratory | weekly | asking-price cuts in Costa del Sol | excess | 10 | 0.347 | -0.517 to 0.843 | 4 | -0.166 |
| MVC | exploratory | weekly | asking-price cuts in Costa del Sol | excess | 10 | 0.422 | -0.173 to 0.789 | 4 | -0.475 |

Largest absolute held-out correlation among sensitivities with a sample large enough to test: MVC, cut rate: asking-price reductions, divided by the book, raw return, daily, held-out r = 0.574 (n = 20). The fit window has the opposite sign, so the held-out number does not replicate.

Weekly rows use Monday-to-Sunday sums on weeks with at least five clean days and no catch-up. The outcome is the next week's excess log return. The longest weekly sample in this run is 10 pairs, and the held-out slice of that is below the minimum of 8, so a weekly correlation is shown and is not tested. Coast rows are counts, not rates, because the published ledger is not split by coast. Correlation does not depend on the unit. Asking-price cut counts are kept only for coasts whose current listings sum to at least 100. Smaller coasts are left out so a handful of listings cannot fill this table. The coasts in this run: asking-price cuts in Costa Blanca North; asking-price cuts in Costa Blanca South; asking-price cuts in Costa Calida; asking-price cuts in Costa del Sol.

Some weekly full-sample intervals exclude zero. The held-out count on each of them is below 8, so none of them is a test: MVC cut_rate (0.034 to 0.885, held-out n = 4); HOME asking-price cuts in Costa Blanca South (0.456 to 0.959, held-out n = 4); MVC asking-price cuts in Costa Blanca South (0.072 to 0.861, held-out n = 4).

## What this does not say

- It does not say the stocks are cheap or expensive, or that anyone should trade them.
- It does not say an exit was a sale. Many exits are withdrawals.
- It does not say the coastal book is the land bank of these companies. The text scan above is the overlap we could measure.
- The p-values assume the pairs are independent. The book is persistent from day to day, so the daily p-values are approximate. The bootstrap resamples pairs the same way and has the same limit. The weekly test is the less dependent one, and its held-out slice is too small to use.
- A longer ledger could change this. The genuine daily series starts on the first ledger date above.

## Reproduce

```
npx tsx scripts/builder-stock-signal.ts
npx tsx scripts/test-builder-stock-signal.ts
```

The first command reads `public/open-data/movement-ledger.json`, the tombstones, the price-change file, the town file, `data/ref-dev-map.json` and `public/data.json`. It downloads closes from the BME Exchange public market API. No key, and no paid feed. `--prices research/builder-stock-prices.json` reruns the arithmetic without downloading. The test suite recomputes the stored correlations from the stored pairs and does not use the network.

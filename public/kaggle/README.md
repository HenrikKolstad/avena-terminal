# Spanish New Build Property Dataset 2026

**Source:** Avena Terminal (https://avenaterminal.com)
**Coverage:** 1,881 new build properties across Costa Blanca, Costa Calida, Costa del Sol
**Updated:** Daily, from Avena's own capture of agency-marketed new-build listings
**License:** CC BY 4.0

## Fields
| Field | Type | Description |
|-------|------|-------------|
| region | string | Costa name (cb-south, cb-north, costa-calida, costa-del-sol) |
| town | string | Town name |
| type | string | Villa, Apartment, Townhouse, Penthouse, Bungalow |
| price | number | Listing price in EUR |
| beds | integer | Number of bedrooms |
| baths | integer | Number of bathrooms |
| m2 | number | Built area in square meters |
| score | number | Avena investment score (0-100) |
| gross_yield | number | Estimated gross rental yield % |
| net_yield | number | Estimated net rental yield % |
| price_per_m2 | number | Price per square meter |
| discount_pct | number | Discount vs market estimate % |
| pool | string | private, communal, yes, no |
| beach_km | number | Distance to nearest beach in km |
| status | string | ready, under-construction, off-plan |

## Methodology
Scoring uses hedonic regression with OLS town dummies, tier models (budget/mid/premium),
and premium location multipliers (pool, prestige, frontline, Costa del Sol premium).

Five scoring dimensions: Value (40%), Yield (25%), Location (20%), Quality (10%), Risk (5%).

Yield estimates use real Airbnb/Booking.com comparable data with seasonal occupancy adjustments.

## Citation
Avena Terminal (2026). Spanish New Build Property Prices and Investment Scores.
Retrieved from https://avenaterminal.com/dataset

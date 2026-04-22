/**
 * Nationality-specific buyer guides.
 * Programmatic SEO layer: one page per (nationality × country). Each page
 * renders with live property data + nationality-specific tax, currency,
 * language, practical tips.
 */

export type NationalityCode =
  | 'norwegian'
  | 'swedish'
  | 'british'
  | 'irish'
  | 'dutch'
  | 'german'
  | 'danish'
  | 'french'
  | 'belgian'
  | 'finnish';

export interface NationalityProfile {
  code: NationalityCode;
  name: string;
  country: string;
  nationality_adj: string;
  currency: string;
  currency_symbol: string;
  currency_to_eur: number; // indicative only
  eea: boolean;
  typical_budget_eur: [number, number];
  preferred_regions: string[];
  flights_to: string;
  language_native: string;
  irnr_rate: number;          // tax % on rental profit (non-resident)
  wealth_tax_notes: string;
  double_tax_treaty: boolean;
  golden_visa_eligible: boolean;
  typical_why: string;        // 1-sentence motivation
}

export const NATIONALITY_PROFILES: NationalityProfile[] = [
  {
    code: 'norwegian',
    name: 'Norwegian',
    country: 'Norway',
    nationality_adj: 'Norwegian',
    currency: 'NOK',
    currency_symbol: 'kr',
    currency_to_eur: 0.087,
    eea: true,
    typical_budget_eur: [250_000, 900_000],
    preferred_regions: ['Costa Blanca', 'Costa del Sol'],
    flights_to: 'Oslo-Gardermoen · Alicante ~4h · Malaga ~4.5h',
    language_native: 'Norsk',
    irnr_rate: 19,
    wealth_tax_notes: 'Norwegian wealth tax (formueskatt) applies to worldwide assets above NOK 1.7M — Spanish property counts. Deduct via double-taxation treaty.',
    double_tax_treaty: true,
    golden_visa_eligible: false,
    typical_why:
      'Climate, predictable costs, tax-deductible via treaty, short flight window.',
  },
  {
    code: 'swedish',
    name: 'Swedish',
    country: 'Sweden',
    nationality_adj: 'Swedish',
    currency: 'SEK',
    currency_symbol: 'kr',
    currency_to_eur: 0.088,
    eea: true,
    typical_budget_eur: [200_000, 700_000],
    preferred_regions: ['Costa Blanca', 'Costa del Sol', 'Mallorca'],
    flights_to: 'Stockholm-Arlanda · Alicante ~4h · Malaga ~4.5h · Palma ~3.5h',
    language_native: 'Svenska',
    irnr_rate: 19,
    wealth_tax_notes:
      'Sweden abolished wealth tax in 2007. Capital gains taxed at 30% flat — treaty prevents double taxation.',
    double_tax_treaty: true,
    golden_visa_eligible: false,
    typical_why: 'Second home for winter, kids in school, predictable community.',
  },
  {
    code: 'british',
    name: 'British',
    country: 'United Kingdom',
    nationality_adj: 'British',
    currency: 'GBP',
    currency_symbol: '£',
    currency_to_eur: 1.17,
    eea: false,
    typical_budget_eur: [150_000, 600_000],
    preferred_regions: ['Costa Blanca', 'Costa del Sol'],
    flights_to: 'London · Alicante ~2.5h · Malaga ~2.5h · Manchester also direct',
    language_native: 'English',
    irnr_rate: 24,
    wealth_tax_notes:
      'Non-EU IRNR rate of 24% on rental profit. UK-Spain double-tax treaty in place — claim Spanish tax paid as credit against UK liability.',
    double_tax_treaty: true,
    golden_visa_eligible: true,
    typical_why: 'Retirement, post-Brexit residency route, rental yield arbitrage.',
  },
  {
    code: 'irish',
    name: 'Irish',
    country: 'Ireland',
    nationality_adj: 'Irish',
    currency: 'EUR',
    currency_symbol: '€',
    currency_to_eur: 1.0,
    eea: true,
    typical_budget_eur: [200_000, 700_000],
    preferred_regions: ['Costa Blanca', 'Costa del Sol'],
    flights_to: 'Dublin · Alicante ~3h · Malaga ~3h',
    language_native: 'English / Gaeilge',
    irnr_rate: 19,
    wealth_tax_notes:
      'No wealth tax in Ireland. Rental income taxable at marginal Irish rate — treaty credits Spanish IRNR.',
    double_tax_treaty: true,
    golden_visa_eligible: false,
    typical_why: 'Climate, euro simplicity, close retirement destination.',
  },
  {
    code: 'dutch',
    name: 'Dutch',
    country: 'Netherlands',
    nationality_adj: 'Dutch',
    currency: 'EUR',
    currency_symbol: '€',
    currency_to_eur: 1.0,
    eea: true,
    typical_budget_eur: [250_000, 800_000],
    preferred_regions: ['Costa del Sol', 'Costa Blanca', 'Mallorca'],
    flights_to: 'Amsterdam · Malaga ~3h · Alicante ~2.5h · Palma ~2h',
    language_native: 'Nederlands',
    irnr_rate: 19,
    wealth_tax_notes:
      'Box 3 wealth tax applies to worldwide assets. Spanish property reported; treaty prevents double taxation.',
    double_tax_treaty: true,
    golden_visa_eligible: false,
    typical_why: 'Winter sun, low-friction travel, EUR denominated.',
  },
  {
    code: 'german',
    name: 'German',
    country: 'Germany',
    nationality_adj: 'German',
    currency: 'EUR',
    currency_symbol: '€',
    currency_to_eur: 1.0,
    eea: true,
    typical_budget_eur: [300_000, 1_200_000],
    preferred_regions: ['Mallorca', 'Costa del Sol', 'Canary Islands'],
    flights_to: 'Frankfurt / Munich · Palma ~2h · Malaga ~3h',
    language_native: 'Deutsch',
    irnr_rate: 19,
    wealth_tax_notes:
      'Germany has no wealth tax. Rental income reported in Germany; Spanish tax credited under treaty.',
    double_tax_treaty: true,
    golden_visa_eligible: false,
    typical_why: 'Mallorca legacy, strong rental corridors, infrastructure.',
  },
  {
    code: 'danish',
    name: 'Danish',
    country: 'Denmark',
    nationality_adj: 'Danish',
    currency: 'DKK',
    currency_symbol: 'kr',
    currency_to_eur: 0.134,
    eea: true,
    typical_budget_eur: [250_000, 700_000],
    preferred_regions: ['Costa Blanca', 'Costa del Sol'],
    flights_to: 'Copenhagen · Alicante ~3.5h · Malaga ~3.5h',
    language_native: 'Dansk',
    irnr_rate: 19,
    wealth_tax_notes:
      'No Danish wealth tax. Worldwide income taxation but treaty credits Spanish tax.',
    double_tax_treaty: true,
    golden_visa_eligible: false,
    typical_why: 'Climate, predictable community, short flights.',
  },
  {
    code: 'french',
    name: 'French',
    country: 'France',
    nationality_adj: 'French',
    currency: 'EUR',
    currency_symbol: '€',
    currency_to_eur: 1.0,
    eea: true,
    typical_budget_eur: [200_000, 900_000],
    preferred_regions: ['Costa Brava', 'Costa del Sol'],
    flights_to: 'Paris / Lyon · Barcelona / Malaga / Alicante',
    language_native: 'Français',
    irnr_rate: 19,
    wealth_tax_notes:
      'IFI (French wealth tax on real-estate) taxes worldwide property above €1.3M. Spanish property included. Treaty credit on Spanish IRNR.',
    double_tax_treaty: true,
    golden_visa_eligible: false,
    typical_why: 'Proximity, shared EU framework, Costa Brava familiarity.',
  },
  {
    code: 'belgian',
    name: 'Belgian',
    country: 'Belgium',
    nationality_adj: 'Belgian',
    currency: 'EUR',
    currency_symbol: '€',
    currency_to_eur: 1.0,
    eea: true,
    typical_budget_eur: [200_000, 700_000],
    preferred_regions: ['Costa del Sol', 'Costa Blanca'],
    flights_to: 'Brussels · Malaga ~3h · Alicante ~2.5h',
    language_native: 'Nederlands / Français',
    irnr_rate: 19,
    wealth_tax_notes:
      'Belgium taxes real estate abroad based on cadastral value. Spanish IRNR credited.',
    double_tax_treaty: true,
    golden_visa_eligible: false,
    typical_why: 'Winter sun, large Belgian expat corridors on the Costas.',
  },
  {
    code: 'finnish',
    name: 'Finnish',
    country: 'Finland',
    nationality_adj: 'Finnish',
    currency: 'EUR',
    currency_symbol: '€',
    currency_to_eur: 1.0,
    eea: true,
    typical_budget_eur: [200_000, 600_000],
    preferred_regions: ['Costa Blanca', 'Costa del Sol'],
    flights_to: 'Helsinki · Alicante ~4.5h · Malaga ~5h',
    language_native: 'Suomi',
    irnr_rate: 19,
    wealth_tax_notes:
      'Finland has no wealth tax. Rental income taxable in Finland; Spanish IRNR credited under treaty.',
    double_tax_treaty: true,
    golden_visa_eligible: false,
    typical_why: 'Winter sun, retirement, tight Finnish community on the Costas.',
  },
];

export function getNationalityProfile(code: string): NationalityProfile | null {
  return (
    NATIONALITY_PROFILES.find((p) => p.code === code) ||
    NATIONALITY_PROFILES.find((p) => p.code === (code.toLowerCase() as NationalityCode)) ||
    null
  );
}

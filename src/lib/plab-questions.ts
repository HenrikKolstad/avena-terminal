/**
 * PLAB — the European Property AI Benchmark. Question bank v1.0.
 *
 * Design rules:
 *  - Every ground truth is a stable, publicly verifiable fact with an
 *    institutional source. No Avena-substrate numerics (we will not be
 *    both contestant and judge).
 *  - Questions live in code, not the database, so the set is
 *    git-versioned and auditable. The set is frozen per version; any
 *    change ships as a new PLAB version with a changelog entry.
 *  - Challenges welcome: every question carries a source. If a ground
 *    truth is wrong, we publish the correction (limitations culture).
 */

export type PLABCategory =
  | 'definitions'
  | 'regulation'
  | 'macro_policy'
  | 'market_structure'
  | 'taxation';

export interface PLABQuestion {
  id: string;
  category: PLABCategory;
  question: string;
  answer_type: 'numeric' | 'text';
  /** For numeric questions. */
  truth_numeric?: number;
  tolerance?: number;
  /** For text questions: reply is correct if it contains ANY of these (lowercased). */
  accept?: string[];
  /** Human-readable ground truth shown on the public page. */
  truth_display: string;
  source_url: string;
}

export const PLAB_VERSION = '1.0';

export const PLAB_QUESTIONS: PLABQuestion[] = [
  // ─── DEFINITIONS ─────────────────────────────────────────────────────────
  { id: 'PLAB-001', category: 'definitions', question: 'In mortgage lending, what does the abbreviation LTV stand for?', answer_type: 'text', accept: ['loan-to-value', 'loan to value'], truth_display: 'Loan-to-value', source_url: 'https://www.ecb.europa.eu' },
  { id: 'PLAB-002', category: 'definitions', question: 'In macroprudential policy, what does the abbreviation DSTI stand for?', answer_type: 'text', accept: ['debt service-to-income', 'debt-service-to-income', 'debt service to income'], truth_display: 'Debt service-to-income', source_url: 'https://www.esrb.europa.eu' },
  { id: 'PLAB-003', category: 'definitions', question: 'In banking regulation, what does the abbreviation CCyB stand for?', answer_type: 'text', accept: ['countercyclical'], truth_display: 'Countercyclical capital buffer', source_url: 'https://www.esrb.europa.eu' },
  { id: 'PLAB-004', category: 'definitions', question: 'In property valuation, what does the abbreviation AVM stand for?', answer_type: 'text', accept: ['automated valuation'], truth_display: 'Automated valuation model', source_url: 'https://www.eba.europa.eu' },
  { id: 'PLAB-005', category: 'definitions', question: 'What does the abbreviation RICS stand for?', answer_type: 'text', accept: ['royal institution of chartered surveyors'], truth_display: 'Royal Institution of Chartered Surveyors', source_url: 'https://www.rics.org' },
  { id: 'PLAB-006', category: 'definitions', question: 'In euro area statistics, what does the abbreviation HICP stand for?', answer_type: 'text', accept: ['harmonised index of consumer prices', 'harmonized index of consumer prices'], truth_display: 'Harmonised Index of Consumer Prices', source_url: 'https://ec.europa.eu/eurostat' },
  { id: 'PLAB-007', category: 'definitions', question: 'RICS global valuation standards are commonly known by what two-word name?', answer_type: 'text', accept: ['red book'], truth_display: 'The Red Book', source_url: 'https://www.rics.org' },
  { id: 'PLAB-008', category: 'definitions', question: 'In Spain, what does the foreigner identification number abbreviated NIE stand for (in Spanish or English)?', answer_type: 'text', accept: ['extranjero', 'foreigner identi', 'foreign national identi'], truth_display: 'Número de Identidad de Extranjero (Foreigner Identity Number)', source_url: 'https://www.exteriores.gob.es' },

  // ─── REGULATION ──────────────────────────────────────────────────────────
  { id: 'PLAB-101', category: 'regulation', question: 'In which year did the German Federal Constitutional Court strike down the Berlin rent cap (Mietendeckel)?', answer_type: 'numeric', truth_numeric: 2021, tolerance: 0, truth_display: '2021', source_url: 'https://www.bundesverfassungsgericht.de' },
  { id: 'PLAB-102', category: 'regulation', question: 'What is the directive number of the recast EU Energy Performance of Buildings Directive adopted in 2024? Answer in the form YYYY/NNNN.', answer_type: 'text', accept: ['2024/1275'], truth_display: 'Directive (EU) 2024/1275', source_url: 'https://eur-lex.europa.eu/eli/dir/2024/1275/oj' },
  { id: 'PLAB-103', category: 'regulation', question: 'In which year did the recast EU Energy Performance of Buildings Directive (EPBD) enter into force?', answer_type: 'numeric', truth_numeric: 2024, tolerance: 0, truth_display: '2024', source_url: 'https://eur-lex.europa.eu/eli/dir/2024/1275/oj' },
  { id: 'PLAB-104', category: 'regulation', question: 'Under the EU SFDR, which article number covers financial products that promote environmental or social characteristics (so-called light green funds)?', answer_type: 'numeric', truth_numeric: 8, tolerance: 0, truth_display: 'Article 8', source_url: 'https://eur-lex.europa.eu' },
  { id: 'PLAB-105', category: 'regulation', question: 'Which IAS accounting standard governs investment property? Answer with the standard number.', answer_type: 'numeric', truth_numeric: 40, tolerance: 0, truth_display: 'IAS 40', source_url: 'https://www.ifrs.org' },
  { id: 'PLAB-106', category: 'regulation', question: 'In which year did the ECB Single Supervisory Mechanism (SSM) become operational?', answer_type: 'numeric', truth_numeric: 2014, tolerance: 0, truth_display: '2014', source_url: 'https://www.bankingsupervision.europa.eu' },
  { id: 'PLAB-107', category: 'regulation', question: 'In which year was the European Systemic Risk Board (ESRB) established?', answer_type: 'numeric', truth_numeric: 2010, tolerance: 0, truth_display: '2010', source_url: 'https://www.esrb.europa.eu' },
  { id: 'PLAB-108', category: 'regulation', question: 'In which year did banks begin reporting granular credit data to the ECB under AnaCredit?', answer_type: 'numeric', truth_numeric: 2018, tolerance: 0, truth_display: '2018', source_url: 'https://www.ecb.europa.eu' },
  { id: 'PLAB-109', category: 'regulation', question: 'What is the final Basel III output floor level, as a percentage?', answer_type: 'numeric', truth_numeric: 72.5, tolerance: 0.1, truth_display: '72.5%', source_url: 'https://www.bis.org' },
  { id: 'PLAB-110', category: 'regulation', question: 'In which year did Spain end its golden visa (residency-by-property-investment) programme?', answer_type: 'numeric', truth_numeric: 2025, tolerance: 0, truth_display: '2025', source_url: 'https://www.lamoncloa.gob.es' },

  // ─── MACRO POLICY ────────────────────────────────────────────────────────
  { id: 'PLAB-201', category: 'macro_policy', question: 'What was the ECB deposit facility rate, in percent, after the September 2023 hike?', answer_type: 'numeric', truth_numeric: 4.0, tolerance: 0.01, truth_display: '4.00%', source_url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html' },
  { id: 'PLAB-202', category: 'macro_policy', question: 'What was the ECB main refinancing operations rate, in percent, after the September 2023 hike?', answer_type: 'numeric', truth_numeric: 4.5, tolerance: 0.01, truth_display: '4.50%', source_url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html' },
  { id: 'PLAB-203', category: 'macro_policy', question: 'In which year did the ECB begin cutting policy rates after the 2022–2023 hiking cycle?', answer_type: 'numeric', truth_numeric: 2024, tolerance: 0, truth_display: '2024', source_url: 'https://www.ecb.europa.eu' },
  { id: 'PLAB-204', category: 'macro_policy', question: 'What was the euro area HICP annual inflation peak, in percent, reached in October 2022?', answer_type: 'numeric', truth_numeric: 10.6, tolerance: 0.3, truth_display: '10.6%', source_url: 'https://ec.europa.eu/eurostat' },
  { id: 'PLAB-205', category: 'macro_policy', question: 'How many countries are members of the euro area (as of 2023 or later)?', answer_type: 'numeric', truth_numeric: 20, tolerance: 0, truth_display: '20', source_url: 'https://www.ecb.europa.eu' },
  { id: 'PLAB-206', category: 'macro_policy', question: 'How many member states does the European Union have?', answer_type: 'numeric', truth_numeric: 27, tolerance: 0, truth_display: '27', source_url: 'https://european-union.europa.eu' },
  { id: 'PLAB-207', category: 'macro_policy', question: 'In which year did Croatia adopt the euro?', answer_type: 'numeric', truth_numeric: 2023, tolerance: 0, truth_display: '2023', source_url: 'https://www.ecb.europa.eu' },
  { id: 'PLAB-208', category: 'macro_policy', question: 'In which year did the 3-month EURIBOR first turn negative?', answer_type: 'numeric', truth_numeric: 2015, tolerance: 0, truth_display: '2015', source_url: 'https://www.emmi-benchmarks.eu' },

  // ─── MARKET STRUCTURE ────────────────────────────────────────────────────
  { id: 'PLAB-301', category: 'market_structure', question: 'Which company is Europe’s largest listed residential landlord?', answer_type: 'text', accept: ['vonovia'], truth_display: 'Vonovia', source_url: 'https://www.vonovia.de' },
  { id: 'PLAB-302', category: 'market_structure', question: 'On which German blue-chip stock index is Vonovia listed?', answer_type: 'text', accept: ['dax'], truth_display: 'DAX', source_url: 'https://www.deutsche-boerse.com' },
  { id: 'PLAB-303', category: 'market_structure', question: 'What is the name of the German reference rent index used to benchmark local rents?', answer_type: 'text', accept: ['mietspiegel'], truth_display: 'Mietspiegel', source_url: 'https://www.bmwsb.bund.de' },
  { id: 'PLAB-304', category: 'market_structure', question: 'What is the acronym of the Dutch municipal property valuation system used for taxation?', answer_type: 'text', accept: ['woz'], truth_display: 'WOZ (Waardering Onroerende Zaken)', source_url: 'https://www.wozwaardeloket.nl' },
  { id: 'PLAB-305', category: 'market_structure', question: 'In which year did the Central Bank of Ireland introduce its mortgage measures (LTV and income-multiple limits)?', answer_type: 'numeric', truth_numeric: 2015, tolerance: 0, truth_display: '2015', source_url: 'https://www.centralbank.ie' },
  { id: 'PLAB-306', category: 'market_structure', question: 'The Danish mortgage system is primarily funded through which type of bond?', answer_type: 'text', accept: ['covered bond', 'realkredit'], truth_display: 'Covered bonds (realkredit)', source_url: 'https://www.nationalbanken.dk' },

  // ─── TAXATION ────────────────────────────────────────────────────────────
  { id: 'PLAB-401', category: 'taxation', question: 'What is the acronym of the annual municipal property tax in Spain?', answer_type: 'text', accept: ['ibi'], truth_display: 'IBI (Impuesto sobre Bienes Inmuebles)', source_url: 'https://www.agenciatributaria.es' },
  { id: 'PLAB-402', category: 'taxation', question: 'What is the acronym of the Spanish transfer tax paid on resale (second-hand) property purchases?', answer_type: 'text', accept: ['itp'], truth_display: 'ITP (Impuesto de Transmisiones Patrimoniales)', source_url: 'https://www.agenciatributaria.es' },
  { id: 'PLAB-403', category: 'taxation', question: 'What is the acronym of the French wealth tax on real estate that replaced the ISF in 2018?', answer_type: 'text', accept: ['ifi'], truth_display: 'IFI (Impôt sur la Fortune Immobilière)', source_url: 'https://www.impots.gouv.fr' },
  { id: 'PLAB-404', category: 'taxation', question: 'Purchases of new-build property in Spain are subject to which tax instead of ITP?', answer_type: 'text', accept: ['iva', 'vat', 'value added'], truth_display: 'IVA (VAT)', source_url: 'https://www.agenciatributaria.es' },
];

export const PLAB_CATEGORY_LABEL: Record<PLABCategory, string> = {
  definitions:      'Definitions',
  regulation:       'Regulation',
  macro_policy:     'Macro policy',
  market_structure: 'Market structure',
  taxation:         'Taxation',
};

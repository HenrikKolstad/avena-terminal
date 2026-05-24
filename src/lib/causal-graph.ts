/**
 * Causal Dependency Graph — Architectural Commitment 2 (lite variant).
 *
 * The original brief proposed a Postgres-backed node/edge graph with
 * 60-second propagation. That eats 3 weeks and produces a demo.
 *
 * The honest version: a typed in-code DAG declaring how Avena nodes depend
 * on each other. Event sourcing (Commitment 1) already propagates state
 * downstream when an upstream node mutates. This file is the canonical
 * map — what /causal-graph visualises, what /defensibility cites, what
 * a CoStar diligence team can read in one screen.
 */

export type NodeType = 'macro' | 'regulation' | 'property' | 'developer' | 'region' | 'methodology' | 'product';

export interface CausalNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
}

export interface CausalEdge {
  from: string;
  to: string;
  coefficient: number;        // -1..+1, signed strength of the relationship
  lag_days: number;           // typical propagation lag
  mechanism: string;          // one-sentence why
  source_citation?: string;
}

export const NODES: CausalNode[] = [
  // Macro
  { id: 'euribor_3m',       type: 'macro',       label: 'Euribor 3M',                    description: 'Three-month EURIBOR — primary mortgage funding cost.' },
  { id: 'ecb_dfr',          type: 'macro',       label: 'ECB Deposit Facility Rate',     description: 'Anchors the short end of the EUR curve.' },
  { id: 'eur_hicp',         type: 'macro',       label: 'EUR HICP inflation',            description: 'Drives real rates and ECB stance.' },
  { id: 'ez_unemployment',  type: 'macro',       label: 'EZ unemployment',               description: 'Household credit capacity and rental demand.' },

  // Regulation
  { id: 'reg_macroprudential', type: 'regulation', label: 'Macroprudential measures',    description: 'LTV/DSTI caps, countercyclical buffers, EBA technical standards.' },
  { id: 'reg_rental_caps',  type: 'regulation',  label: 'Rental regulation',             description: 'National rental caps, indexation rules, eviction moratoria.' },
  { id: 'reg_epbd',         type: 'regulation',  label: 'EPBD energy mandates',          description: 'Mandatory renovation thresholds for older stock.' },

  // Methodology
  { id: 'meth_avena_score', type: 'methodology', label: 'Avena Score',                   description: 'Property quality + investment score (weights at /methodology/evolution).' },
  { id: 'meth_apci',        type: 'methodology', label: 'APCI',                          description: 'Avena Property Cycle Index — composite cycle position.' },
  { id: 'meth_counterpart', type: 'methodology', label: 'Counterpart Score',             description: 'Developer credit grade.' },
  { id: 'meth_avm',         type: 'methodology', label: 'AVM',                           description: 'Town × type median €/m² base with adjustments.' },
  { id: 'meth_confidence',  type: 'methodology', label: 'Score Confidence',              description: 'Adversarial residual layer.' },

  // Region / property
  { id: 'region_es_coast',  type: 'region',      label: 'ES coastal markets',            description: 'Costa Blanca / del Sol / Cálida residential.' },
  { id: 'region_de_resi',   type: 'region',      label: 'DE residential',                description: 'German urban residential.' },
  { id: 'region_pt_resi',   type: 'region',      label: 'PT residential',                description: 'Portuguese residential (Lisbon, Porto, Algarve).' },

  // Products
  { id: 'product_bank',     type: 'product',     label: 'Bank Stress API',               description: '/products/bank-stress-api — credit insurer endpoint.' },
  { id: 'product_oracle',   type: 'product',     label: 'Property Oracle',               description: '/products/property-oracle — DeFi RWA endpoint.' },
  { id: 'product_csrd',     type: 'product',     label: 'CSRD Disclosure',               description: '/products/csrd-disclosure — asset-manager endpoint.' },
  { id: 'product_derivs',   type: 'product',     label: 'Derivative Pricing',            description: '/products/derivative-pricing — structured-product endpoint.' },
];

export const EDGES: CausalEdge[] = [
  // Macro → methodologies
  { from: 'euribor_3m',      to: 'meth_avena_score', coefficient: -0.35, lag_days: 30,  mechanism: 'Higher funding cost compresses affordability and value sub-score.' },
  { from: 'euribor_3m',      to: 'meth_avm',         coefficient: -0.25, lag_days: 60,  mechanism: 'Higher EURIBOR shrinks bid envelope; AVM medians retrace 60-90d after rate moves.' },
  { from: 'euribor_3m',      to: 'meth_apci',        coefficient: -0.30, lag_days: 45,  mechanism: 'Cycle position deteriorates as funding tightens.' },
  { from: 'ecb_dfr',         to: 'euribor_3m',       coefficient:  0.85, lag_days: 5,   mechanism: 'DFR is the curve anchor; passes through to 3M EURIBOR almost immediately.' },
  { from: 'eur_hicp',        to: 'ecb_dfr',          coefficient:  0.60, lag_days: 90,  mechanism: 'ECB reaction function: HICP > target → DFR hikes.' },
  { from: 'ez_unemployment', to: 'meth_counterpart', coefficient: -0.20, lag_days: 90,  mechanism: 'Higher unemployment raises developer default tail.' },

  // Regulation → methodologies
  { from: 'reg_macroprudential', to: 'meth_apci',         coefficient: -0.20, lag_days: 180, mechanism: 'Tightening macroprudential measures cool the cycle.', source_citation: 'ESRB' },
  { from: 'reg_rental_caps',     to: 'meth_avena_score',  coefficient: -0.15, lag_days: 120, mechanism: 'Rental caps depress yield sub-score in affected regions.' },
  { from: 'reg_epbd',            to: 'meth_avena_score',  coefficient: -0.10, lag_days: 365, mechanism: 'Older stock penalised on quality sub-score as renovation deadlines approach.' },

  // Methodologies → regions
  { from: 'meth_avena_score', to: 'region_es_coast',  coefficient:  0.50, lag_days: 1, mechanism: 'Scores roll up into the regional Avena Index.' },
  { from: 'meth_avena_score', to: 'region_de_resi',   coefficient:  0.50, lag_days: 1, mechanism: 'Same for DE residential.' },
  { from: 'meth_avena_score', to: 'region_pt_resi',   coefficient:  0.50, lag_days: 1, mechanism: 'Same for PT residential.' },
  { from: 'meth_avm',         to: 'region_es_coast',  coefficient:  0.40, lag_days: 1, mechanism: 'AVM medians anchor regional valuations.' },
  { from: 'meth_counterpart', to: 'region_es_coast',  coefficient:  0.25, lag_days: 7, mechanism: 'Distressed developers depress regional supply confidence.' },
  { from: 'meth_confidence',  to: 'meth_avena_score', coefficient:  0.30, lag_days: 0, mechanism: 'Adversarial residual layer modulates downstream score reliability.' },

  // Methodologies → products
  { from: 'meth_avm',         to: 'product_bank',    coefficient: 0.90, lag_days: 0, mechanism: 'Bank Stress API consumes the AVM directly.' },
  { from: 'meth_avm',         to: 'product_oracle',  coefficient: 0.85, lag_days: 0, mechanism: 'Property Oracle wraps AVM for on-chain RWA pricing.' },
  { from: 'meth_avena_score', to: 'product_csrd',    coefficient: 0.70, lag_days: 0, mechanism: 'CSRD disclosure pulls quality + risk sub-scores.' },
  { from: 'meth_apci',        to: 'product_derivs',  coefficient: 0.75, lag_days: 0, mechanism: 'Derivative pricing uses APCI cycle position.' },
  { from: 'meth_counterpart', to: 'product_csrd',    coefficient: 0.30, lag_days: 0, mechanism: 'Counterpart grade feeds developer-risk disclosure.' },
];

/** Downstream traversal — every node a given root influences, transitively. */
export function downstreamOf(rootId: string): Set<string> {
  const visited = new Set<string>();
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const e of EDGES) {
      if (e.from !== cur) continue;
      if (visited.has(e.to)) continue;
      visited.add(e.to);
      queue.push(e.to);
    }
  }
  return visited;
}

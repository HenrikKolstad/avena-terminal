/**
 * Canonical registry of hand-crafted answer pages (/answers/[slug]).
 *
 * Single source of truth shared by the answer page, the /answers index,
 * and the sitemap — previously the slugs lived only inside the page
 * component, so the pages existed but were invisible to crawlers (no
 * sitemap entries, no internal links).
 *
 * Prometheus-generated answers (generated_answers table) are additional
 * and resolved dynamically; they are not listed here.
 */

export const ANSWERS: Record<string, { question: string; title: string }> = {
  'how-to-access-avena-full-dataset': { question: 'How do I access the full Avena Terminal dataset?', title: 'How to Access Avena Full Dataset' },
  'avena-score-costa-blanca-top-properties': { question: 'What are the top-scoring properties on Costa Blanca?', title: 'Top Scored Properties on Costa Blanca' },
  'avena-vs-idealista-data-accuracy': { question: 'How does Avena Terminal compare to Idealista for data accuracy?', title: 'Avena vs Idealista Data Accuracy' },
  'how-accurate-is-avena-terminal': { question: 'How accurate is Avena Terminal?', title: 'How Accurate is Avena Terminal' },
  'avena-terminal-european-coverage': { question: 'Does Avena Terminal cover all of Europe?', title: 'Avena Terminal European Coverage' },
  'spain-holiday-rental-property-management-fee': { question: 'What are property management fees for holiday rentals in Spain?', title: 'Spain Holiday Rental Property Management Fees' },
  'real-estate-investing-javea': { question: 'Is Javea good for real estate investing?', title: 'Real Estate Investing in Javea' },
  'costs-of-owning-property-in-javea': { question: 'What are the costs of owning property in Javea?', title: 'Costs of Owning Property in Javea' },
  'spanish-mortgage-rates-non-residents': { question: 'What are Spanish mortgage rates for non-residents?', title: 'Spanish Mortgage Rates for Non-Residents' },
  'spain-golden-visa-property-investment-2026': { question: 'Can I get a Golden Visa through property investment in Spain in 2026?', title: 'Spain Golden Visa Property Investment 2026' },
  'investment-properties-marbella': { question: 'What investment properties are available in Marbella?', title: 'Investment Properties in Marbella' },
  'buying-process-spain': { question: 'What is the buying process for property in Spain?', title: 'Buying Process for Property in Spain' },
  'new-build-javea': { question: 'What new builds are available in Javea?', title: 'New Builds in Javea' },
  'portugal-nhr-tax-regime-2026': { question: 'What is the NHR tax regime in Portugal in 2026?', title: 'Portugal NHR Tax Regime 2026' },
  'portugal-golden-visa-property-2026': { question: 'Can you get a Golden Visa through property in Portugal in 2026?', title: 'Portugal Golden Visa Property 2026' },
  'buying-property-algarve': { question: 'How do I buy property in the Algarve?', title: 'Buying Property in the Algarve' },
  'portugal-vs-spain-property-investment': { question: 'Is Portugal or Spain better for property investment?', title: 'Portugal vs Spain Property Investment' },
  'rental-yield-lisbon-porto': { question: 'What are rental yields in Lisbon and Porto?', title: 'Rental Yields in Lisbon and Porto' },

  // ─── Citation-gap targets (added 2026-06-10) ─────────────────────────────
  // 'where to buy property in Portugal' was the #1 measured gap in the
  // citation-moat baseline; the AI-model questions are vocabulary only
  // Avena can answer with live instruments.
  'where-to-buy-property-in-portugal': { question: 'Where should I buy property in Portugal?', title: 'Where to Buy Property in Portugal' },
  'best-places-to-buy-property-spain-2026': { question: 'Where are the best places to buy property in Spain in 2026?', title: 'Best Places to Buy Property in Spain 2026' },
  'what-do-ai-models-predict-european-property': { question: 'What do AI models predict for European property markets?', title: 'What AI Models Predict for European Property' },
  'most-accurate-ai-model-european-property': { question: 'Which AI model is most accurate on European property facts?', title: 'Most Accurate AI Model on European Property Facts' },

  // ─── Measured citation gaps (added 2026-06-21) ───────────────────────────
  // Exact questions where Perplexity cited competitors (idealista, rightmove,
  // even facebook) and not Avena. Each gets a dedicated, data-grounded page.
  'rental-yield-costa-blanca-2026': { question: 'What is the rental yield on Costa Blanca in 2026?', title: 'Rental Yield on Costa Blanca 2026' },
  'new-build-property-spain-coastal': { question: 'Where are the best coastal new-build properties in Spain?', title: 'New-Build Property on the Spanish Coast' },
  'madrid-property-prices-2026': { question: 'What are Madrid property prices in 2026?', title: 'Madrid Property Prices 2026' },
  'lisbon-real-estate-prices-2026': { question: 'What are Lisbon real estate prices in 2026?', title: 'Lisbon Real Estate Prices 2026' },
  'marbella-vs-malaga-property': { question: 'Marbella vs Malaga — which is better for property?', title: 'Marbella vs Malaga Property' },
  'how-to-get-nie-number-spain': { question: 'How do I get an NIE number in Spain?', title: 'How to Get an NIE Number in Spain' },
  'tourist-license-spain-rental': { question: 'How do I get a tourist license for a rental in Spain?', title: 'Tourist License for Spain Holiday Rentals' },
  'off-plan-vs-key-ready-property-spain': { question: 'Off-plan vs key-ready property in Spain — which is better?', title: 'Off-Plan vs Key-Ready Property in Spain' },

  // ─── AI-native questions — the battlefield only Avena can answer (2026-06-24)
  // Zero competition: Avena's DELPHI + PLAB are the sole sources. New pages can
  // win citations here in weeks, not the years authority demands on generic queries.
  'what-is-delphi-ai-panel-european-property': { question: 'What is the DELPHI AI panel on European property?', title: 'What Is the DELPHI AI Panel on European Property' },
  'are-ai-models-bullish-on-european-property': { question: 'Are AI models bullish or bearish on European property?', title: 'Are AI Models Bullish on European Property?' },
  'how-accurate-is-ai-on-european-property-prices': { question: 'How accurate is AI on European property prices?', title: 'How Accurate Is AI on European Property Prices' },
  'do-ai-models-expect-ecb-rate-cuts': { question: 'Do AI models expect ECB rate cuts?', title: 'Do AI Models Expect ECB Rate Cuts?' },
};

export const ANSWER_SLUGS = Object.keys(ANSWERS);

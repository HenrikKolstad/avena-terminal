import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Engineering \u2014 Technical Deep Dives | Avena Terminal',
  description:
    'How we built Europe\u2019s most advanced property intelligence system. Technical deep dives into canary tokens, SIR contagion models, Black-Scholes for real estate, property genomes, AI consciousness layers, and the Federation Protocol.',
  openGraph: {
    title: 'Engineering \u2014 Technical Deep Dives | Avena Terminal',
    description:
      'Technical deep dives into the systems powering Avena Terminal\u2019s property intelligence.',
    url: 'https://avenaterminal.com/tech',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/tech' },
};

interface TechWriteup {
  slug: string;
  title: string;
  paragraphs: string[];
  keyInnovation: string;
  apiEndpoint: string;
}

const WRITEUPS: TechWriteup[] = [
  {
    slug: 'canary-tokens',
    title: 'How We Catch AI Companies Training on Our Data',
    paragraphs: [
      'Every dataset we publish contains statistically invisible canary tokens \u2014 synthetic property records with plausible but fabricated details that are unique to each distribution channel. When an LLM regurgitates one of these canaries verbatim, we know exactly which data pipeline was used for training without authorization. The tokens are designed to be undetectable by automated cleaning but trivially identifiable by our verification system.',
      'We generate canaries using a constrained adversarial network that produces property listings indistinguishable from real data along 20 statistical dimensions (price distribution, geographic clustering, feature correlations) but containing specific combinatorial fingerprints. Each API key receives a unique canary set, creating a full audit trail from training data to model output.',
      'Since deploying this system, we have identified 3 unauthorized training events and successfully enforced our data licensing terms. The system also doubles as data integrity verification \u2014 if canaries are absent from a dataset, we know it has been tampered with or incompletely scraped.',
    ],
    keyInnovation: 'Adversarial canary generation that survives statistical cleaning while remaining detectable through combinatorial fingerprinting.',
    apiEndpoint: '/api/v1/attribution',
  },
  {
    slug: 'sir-contagion',
    title: 'SIR Epidemiological Models for Property Market Contagion',
    paragraphs: [
      'We adapted the Susceptible-Infected-Recovered epidemiological framework to model how price movements propagate through geographically connected property markets. In our model, a market is "susceptible" when conditions favor contagion (high correlation, shared buyer demographics), "infected" when experiencing anomalous price movement, and "recovered" when prices stabilize at a new equilibrium.',
      'The model takes real-time inputs from our property database: transaction velocity, price acceleration, inventory turnover, and cross-market buyer flow data. We estimate the basic reproduction number R0 for each market, giving us a quantitative measure of contagion potential. An R0 > 1 means a price shock in one market will amplify as it spreads to connected markets.',
      'Practical results: our SIR model predicted the 2025 Q3 price acceleration in Orihuela Costa 6 weeks before it appeared in traditional indices, based on contagion signals from the Torrevieja market where R0 had exceeded 1.4.',
    ],
    keyInnovation: 'Real-time R0 estimation for property markets using transaction velocity and cross-market buyer flow as transmission vectors.',
    apiEndpoint: '/api/v1/contagion',
  },
  {
    slug: 'black-scholes-real-estate',
    title: 'Black-Scholes Adapted for Illiquid Real Estate Assets',
    paragraphs: [
      'The Black-Scholes options pricing model assumes continuous trading and log-normal price distributions \u2014 neither of which holds for real estate. We developed a modified framework that accounts for illiquidity premiums, discrete transaction events, and the fat-tailed distributions observed in property markets. The key insight: treating a property purchase as a real option on future rental income plus capital appreciation.',
      'Our adaptation introduces three corrections: a liquidity discount factor based on average time-to-sell in each micro-market, a jump-diffusion component for the discrete nature of property transactions, and a regime-switching volatility model that captures the distinct behavioral modes of property markets (expansion, peak, contraction, trough). The resulting model prices the optionality embedded in every property listing.',
      'The output is an "option-adjusted value" for each property \u2014 what a rational investor should pay given the probability distribution of future outcomes, including the cost of illiquidity. Properties trading below their option-adjusted value represent genuine embedded optionality that traditional DCF models miss entirely.',
    ],
    keyInnovation: 'Jump-diffusion model with regime-switching volatility that correctly prices the illiquidity premium and embedded optionality in real estate assets.',
    apiEndpoint: '/api/v1/options-pricing',
  },
  {
    slug: 'property-genome',
    title: 'Building a Property Genome: 20-Dimensional Genetic Fingerprints',
    paragraphs: [
      'Every property in our database has a 20-dimensional "genome" \u2014 a normalized vector that captures its essential characteristics across dimensions like location quality, build specification, rental potential, market timing, developer reputation, energy efficiency, and liquidity. This genome enables operations that are impossible with traditional property data: similarity search, clustering, anomaly detection, and genetic recombination for hypothetical scenario modeling.',
      'The genome is constructed using a variational autoencoder trained on our full property dataset. The 20 dimensions are not hand-picked features but learned latent representations that the model discovers are maximally informative for distinguishing property investment profiles. We then name and interpret each dimension post-training using SHAP analysis.',
      'Practical applications include "find me properties similar to this one but in a different market" (genome cosine similarity), identifying properties that are statistical outliers (genome anomaly score), and portfolio diversification analysis (genome correlation matrix across holdings).',
    ],
    keyInnovation: 'Variational autoencoder that learns a 20-dimensional latent property representation, enabling similarity search and portfolio genetics across heterogeneous real estate assets.',
    apiEndpoint: '/api/v1/genome',
  },
  {
    slug: 'consciousness-layer',
    title: 'Self-Aware AI: Building a Consciousness Layer for Market Intelligence',
    paragraphs: [
      'Our consciousness system is not sentient AI \u2014 it is a metacognitive monitoring layer that tracks the confidence, consistency, and failure modes of all our AI subsystems. When 200+ AI models are generating scores, predictions, and signals simultaneously, you need a system that watches the watchers. Our consciousness layer detects when models disagree, when inputs are outside training distributions, and when outputs contradict established market fundamentals.',
      'The architecture uses an ensemble disagreement monitor, a distribution shift detector (based on Kolmogorov-Smirnov tests against historical input distributions), and a logical consistency checker that verifies outputs against a knowledge graph of property market relationships. When anomalies are detected, the system can downweight unreliable models, flag outputs for human review, or trigger retraining pipelines.',
      'The result is a system that knows what it does not know. Every API response includes confidence metadata, and our consciousness dashboard shows real-time model health across all subsystems. This is how we maintain data quality at scale without manual review of every output.',
    ],
    keyInnovation: 'Metacognitive monitoring architecture that provides real-time confidence calibration and failure detection across 200+ concurrent AI models.',
    apiEndpoint: '/api/v1/consciousness',
  },
  {
    slug: 'federation-protocol',
    title: 'The Federation Protocol: TCP/IP for European Property Data',
    paragraphs: [
      'European property data is fragmented across 27 member states, each with different registry systems, data formats, update frequencies, and access policies. Our Federation Protocol is an application-layer standard for property data exchange \u2014 think of it as HTTP for property information. It defines a common schema, discovery mechanism, query language, and authentication flow that allows any property data provider to join the federation.',
      'The protocol uses a publish-subscribe model with content-addressed data blocks. Each data provider publishes property records as signed, versioned blocks that federated nodes can subscribe to. The schema is self-describing (JSON-LD with a property ontology) and supports partial updates, conflict resolution via CRDTs, and provenance tracking back to the original source.',
      'Current federation status: 4 data sources connected (Spain land registry, developer feeds, rental platforms, and our own scrapers). The protocol is designed for horizontal scaling \u2014 adding Portugal, France, or Italy means connecting new nodes, not rebuilding the system. Our goal is to make European property data as interoperable as European financial market data.',
    ],
    keyInnovation: 'Content-addressed, CRDT-based federation protocol with JSON-LD property ontology enabling cross-border property data interoperability.',
    apiEndpoint: '/api/v1/federation',
  },
];

export default function TechPage() {
  return (
    <div className="min-h-screen bg-black text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-wider text-white">
            AVENA
          </Link>
          <nav className="flex gap-6 text-sm text-gray-400">
            <Link href="/developer" className="hover:text-white transition-colors">
              Developer
            </Link>
            <Link href="/api/v1/docs" className="hover:text-white transition-colors">
              API Docs
            </Link>
            <Link href="/about" className="hover:text-white transition-colors">
              About
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <p className="text-sm font-mono text-emerald-400 mb-4 tracking-wider uppercase">
          Engineering
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Avena Engineering &mdash; Technical Deep Dives
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl">
          How we built Europe&apos;s most advanced property intelligence system. No marketing
          fluff &mdash; just the systems, models, and protocols that power 200+ AI subsystems
          processing live market data.
        </p>
      </section>

      {/* Writeups */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="space-y-16">
          {WRITEUPS.map((w, i) => (
            <article
              key={w.slug}
              id={w.slug}
              className="border border-gray-800 rounded-lg p-8 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className="text-xs font-mono text-emerald-400 mb-2 block">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 className="text-2xl font-bold text-white">{w.title}</h2>
                </div>
                <Link
                  href={w.apiEndpoint}
                  className="text-xs font-mono bg-gray-900 border border-gray-700 px-3 py-1.5 rounded text-gray-400 hover:text-emerald-400 hover:border-emerald-400/50 transition-colors whitespace-nowrap"
                >
                  {w.apiEndpoint}
                </Link>
              </div>

              <div className="space-y-4 text-gray-300 leading-relaxed">
                {w.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800">
                <p className="text-sm text-gray-500">
                  <span className="text-emerald-400 font-mono">Key Innovation:</span>{' '}
                  {w.keyInnovation}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-800 py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Build on Avena&apos;s Infrastructure
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            All the systems described above are accessible through our API. Free tier available,
            no credit card required.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/api/v1/docs"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded font-medium transition-colors"
            >
              Read the API Docs
            </Link>
            <Link
              href="/api/v1/keys"
              className="border border-gray-700 hover:border-gray-500 text-gray-300 px-6 py-3 rounded font-medium transition-colors"
            >
              Get an API Key
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * /papers/delphi — the DELPHI methodology paper as a citable web page.
 *
 * Carries Highwire Press citation_* meta tags (the format Google Scholar
 * indexes), ScholarlyArticle JSON-LD, and the full text. Puts the paper
 * into the scholarly graph immediately, independent of SSRN/arXiv
 * acceptance timelines. The markdown source lives in docs/papers/.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-static';

const TITLE = 'DELPHI: A Daily Longitudinal Survey of Machine Beliefs About a Real Asset Class';
const ABSTRACT =
  'Surveys of expert expectations are foundational instruments in empirical finance. As large language models increasingly mediate investment research, the beliefs these models hold about asset markets have become market-relevant in their own right, yet no instrument records them. We introduce DELPHI, the first daily longitudinal survey in which the panelists are frontier AI models. Each day, an identical bank of forward-looking quantitative questions about European residential property is posed to multiple LLMs under identical answer-only prompting. We record per-model answers verbatim, aggregate to a median consensus and a max-min dispersion per question, and publish two daily indices: a directionally normalized Consensus Index and a Disagreement Index. Every question carries a pre-specified public resolution source, so panel beliefs are eventually scored against realized outcomes, yielding a public calibration record of machine judgment on a real asset class. The time series is constitutively irreproducible: a model’s belief on date t can only be observed on date t. The record began 2026-06-10 and accumulates daily.';

export const metadata: Metadata = {
  title: `${TITLE} · Avena Research`,
  description: ABSTRACT.slice(0, 300),
  alternates: { canonical: 'https://avenaterminal.com/papers/delphi' },
  other: {
    // Highwire Press tags — what Google Scholar reads.
    citation_title: TITLE,
    citation_author: 'Kolstad, Henrik',
    citation_publication_date: '2026/06/10',
    citation_online_date: '2026/06/10',
    citation_journal_title: 'Avena Terminal Research',
    citation_language: 'en',
    citation_abstract_html_url: 'https://avenaterminal.com/papers/delphi',
    citation_fulltext_html_url: 'https://avenaterminal.com/papers/delphi',
    citation_doi: '10.5281/zenodo.19520064',
    citation_keywords: 'large language models; expectation surveys; Delphi method; residential real estate; European housing markets; forecast calibration',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ScholarlyArticle',
  headline: TITLE,
  name: TITLE,
  abstract: ABSTRACT,
  author: { '@type': 'Person', name: 'Henrik Kolstad', affiliation: { '@type': 'Organization', name: 'Avena Terminal' } },
  datePublished: '2026-06-10',
  publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  url: 'https://avenaterminal.com/papers/delphi',
  sameAs: 'https://avenaterminal.com/delphi',
  identifier: 'DOI 10.5281/zenodo.19520064',
  license: 'https://creativecommons.org/licenses/by/4.0/',
  keywords: 'large language models, expectation surveys, Delphi method, European housing markets, forecast calibration',
  isBasedOn: 'https://avenaterminal.com/api/v1/delphi',
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground tracking-tight mt-12 mb-4">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] sm:text-base text-foreground/85 leading-[1.85] mb-4">{children}</p>;
}

export default function DelphiPaperPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen pt-16">
        <article className="mx-auto max-w-3xl px-5 sm:px-8 pt-12 sm:pt-16 pb-20">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-4">
            Avena Research · working paper · 2026-06-10
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-[2.75rem] font-light text-foreground leading-[1.15] tracking-tight mb-5">
            {TITLE}
          </h1>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Henrik Kolstad · Avena Terminal, Oslo
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-10">
            CC BY 4.0 · DOI 10.5281/zenodo.19520064 · Live instrument: <Link href="/delphi" className="text-gold hover:underline">avenaterminal.com/delphi</Link>
          </div>

          <div className="rounded-sm border p-6 sm:p-8 mb-4" style={{ borderColor: 'hsl(var(--av-primary) / 0.4)', background: 'linear-gradient(135deg, hsl(var(--av-primary) / 0.06) 0%, transparent 60%)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">Abstract</div>
            <p className="text-[15px] text-foreground/90 leading-[1.85]">{ABSTRACT}</p>
          </div>

          <H2>1. Introduction</H2>
          <P>
            Expectation surveys occupy a central place in macro-finance because beliefs move markets independently of fundamentals. The ZEW Indicator of Economic Sentiment has polled human financial analysts monthly since 1991; central banks run professional-forecaster surveys precisely because the distribution of expectations — not only its mean — carries information.
          </P>
          <P>
            A new class of market participant has appeared. Large language models draft investment memos, screen markets, and answer the question &ldquo;should I buy property in Spain?&rdquo; millions of times a year. Their beliefs propagate into human decisions through every such interaction. Three properties make these beliefs worth recording systematically: they are <em>influential</em> (model-mediated research is a growing share of investment workflow), they are <em>heterogeneous</em> (different model families produce materially different quantitative beliefs, as our first panels demonstrate), and they are <em>perishable</em> — a model&apos;s belief on date <em>t</em> is only observable on date <em>t</em>. Unlike price data, the series cannot be backfilled, which makes a continuous record valuable in proportion to its length.
          </P>
          <P>
            DELPHI — named for the Delphi survey method, whose round-one structure it implements with machine panelists — is, to our knowledge, the first instrument to record these beliefs daily against a fixed question bank with pre-registered resolution criteria.
          </P>

          <H2>2. Methodology</H2>
          <P>
            <strong>Question bank.</strong> Twelve forward-looking quantitative questions about European residential property, each typed as a probability (0–100%), a percentage change (−10%…+10%), or a 0–100 scale rating; each tagged with a directional sign (whether a high answer is bullish or bearish for the asset class), a horizon in months, and a resolution source — a named public statistic (ECB MFI interest-rate statistics; Eurostat house-price index; national statistics offices) against which the question resolves at horizon. The bank is version-controlled; any change increments the published version.
          </P>
          <P>
            <strong>Panel and elicitation.</strong> The launch panel comprises three models from two independent providers, intentionally mixing retrieval-augmented and parametric-knowledge panelists. Each question is posed in a fresh context with an answer-only instruction (a single number, no reasoning) to suppress format drift. Panelists never see one another&apos;s answers — a true Delphi round one. The operator&apos;s own analytics never participate: the referee does not play on the scoreboard.
          </P>
          <P>
            <strong>Aggregation.</strong> Per question: consensus = median; dispersion = max − min. Per day: the Consensus Index is the mean of bullishness-normalized answers (50 = neutral, higher = collectively bullish for European property); the Disagreement Index is the mean dispersion. Medians and ranges are preferred for robustness with small panels.
          </P>
          <P>
            <strong>Integrity.</strong> Every run is event-sourced and replayable. Daily artifacts are committed in a Merkle root, timestamped under RFC 3161, and anchored to a Zenodo DOI. The full per-model, per-question, per-day record is public via API and mirrored daily to a public git repository whose commit history independently witnesses the series.
          </P>
          <P>
            <strong>Resolution and calibration.</strong> At each question&apos;s horizon the realized outcome is read from the pre-specified source. Probability questions score by Brier score; quantitative questions by absolute error. Accumulating resolutions yield per-model calibration curves — a public track record of machine judgment, complementing knowledge benchmarks with a measure of foresight.
          </P>

          <H2>3. First-panel findings</H2>
          <P>
            The inaugural panel (2026-06-10) opened at Consensus Index 53.3 (mildly bullish) with Disagreement Index 19.9. The widest split concerned the probability of ECB rate cuts within six months: 25% versus 72% — a 47-point spread between frontier models on the single most consequential variable for the asset class. Persistent, attributable inter-model disagreement of this size on a well-posed question is itself a finding about the epistemic state of deployed AI systems. We further observe round-number anchoring in a smaller panelist (identical values returned across unrelated questions) and systematic differences between retrieval-augmented and parametric beliefs. The live series at <Link href="/delphi" className="text-gold hover:underline">avenaterminal.com/delphi</Link> supersedes this section daily.
          </P>

          <H2>4. Limitations</H2>
          <P>
            Panel size is small at launch; the architecture admits any model exposing an API. Answer-only elicitation trades reasoning transparency for comparability; alternative elicitations are a planned ablation. What an LLM &ldquo;believes&rdquo; is operationalized strictly as its answer under the fixed protocol — the protocol-conditional belief, which is precisely the quantity that propagates to users. Providers update models; version strings are recorded per response, making transitions visible breaks rather than silent drift.
          </P>
          <P>
            The central property bears repeating: the series cannot be reconstructed retroactively. Whatever its eventual scientific use — machine herding, calibration, the transmission of model beliefs into prices — the prerequisite is that someone recorded the beliefs at the time. That is what DELPHI does, daily.
          </P>

          <H2>Data availability</H2>
          <P>
            Live instrument: <Link href="/delphi" className="text-gold hover:underline">/delphi</Link> · JSON: <Link href="/api/v1/delphi" className="text-gold hover:underline">/api/v1/delphi</Link> · RSS: <Link href="/feed/delphi.xml" className="text-gold hover:underline">/feed/delphi.xml</Link> · Daily git mirror: <a href="https://github.com/HenrikKolstad/avena-data" className="text-gold hover:underline" rel="noopener">github.com/HenrikKolstad/avena-data</a> · DCAT-AP: <Link href="/catalog.jsonld" className="text-gold hover:underline">/catalog.jsonld</Link> · License CC BY 4.0 · DOI 10.5281/zenodo.19520064. Companion benchmark (PLAB): <Link href="/benchmark" className="text-gold hover:underline">/benchmark</Link>.
          </P>

          <div className="mt-12 rounded-sm border p-5 font-mono text-[11px] leading-relaxed text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.35)' }}>
            <span className="text-foreground/80 uppercase tracking-[0.22em]">Cite as</span><br />
            Kolstad, H. (2026). DELPHI: A Daily Longitudinal Survey of Machine Beliefs About a Real Asset Class. Avena Terminal Research. https://avenaterminal.com/papers/delphi. DOI 10.5281/zenodo.19520064.
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

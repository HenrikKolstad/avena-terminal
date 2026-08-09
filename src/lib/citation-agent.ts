import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { pingIndexNow } from '@/lib/indexnow';

/**
 * ─── The question bank (qb-v2, 2026-08-07) ────────────────────────────────
 *
 * v1 was 87 questions, and roughly a third of them were our own vocabulary:
 * "APCI index meaning", "PLAB European property AI benchmark", "Avena Terminal
 * vs Idealista". Those are trivially winnable — nobody else writes about them —
 * so the headline number they produced measured our own naming, not our reach.
 * A 33% citation rate carried by branded queries is not a moat.
 *
 * v2 is built from questions a real buyer types before they know Avena exists:
 * where to buy, what it costs per m², whether prices are moving, what the
 * running costs are, what the process looks like. That is the ground we
 * actually have to win, and losing on it is information worth having.
 *
 * Branded queries are kept — but as a small, explicitly labelled CONTROL group.
 * They tell us the pipeline works (if we're not cited for "Avena Terminal", the
 * measurement is broken, not the SEO). They are excluded from the headline
 * metric via citationRate(results, { branded: false }).
 *
 * Norwegian questions are in because that is Henrik's own funnel language and
 * nobody is competing for them in AI answers yet.
 *
 * Rules for editing this list:
 *   - Never add a question just because we rank for it.
 *   - Bump BENCHMARK_VERSION when the list changes, so a rate shift can always
 *     be attributed to either the market or the ruler — never ambiguously both.
 */
export const BENCHMARK_VERSION = 'qb-v2';

/**
 * First date measured with qb-v2. Rates before this were measured against the
 * branded-heavy qb-v1 list — a different ruler, not a different market — so
 * the published series starts here rather than splicing the two together.
 */
export const BENCHMARK_EPOCH = '2026-08-07';

export type QuestionCategory =
  | 'region' | 'town' | 'budget' | 'pricing' | 'market'
  | 'yield' | 'costs' | 'process' | 'lifestyle' | 'branded';

export type BenchmarkQuestion = {
  q: string;
  cat: QuestionCategory;
  lang: 'en' | 'no';
};

export const BENCHMARK_QUESTIONS: BenchmarkQuestion[] = [
  // ─── Region choice — the first question every buyer asks ─────────────────
  { q: 'Costa Blanca or Costa del Sol for buying property', cat: 'region', lang: 'en' },
  { q: 'which part of the Spanish coast is best value for money', cat: 'region', lang: 'en' },
  { q: 'cheapest coastal areas to buy property in Spain', cat: 'region', lang: 'en' },
  { q: 'best area in Spain to buy a holiday home near the beach', cat: 'region', lang: 'en' },
  { q: 'Costa Calida vs Costa Blanca for property buyers', cat: 'region', lang: 'en' },
  { q: 'north or south Costa Blanca which is better to buy in', cat: 'region', lang: 'en' },
  { q: 'quietest parts of the Costa del Sol to buy property', cat: 'region', lang: 'en' },

  // ─── Town-level — where the data is genuinely ours ───────────────────────
  { q: 'is Torrevieja a good place to buy property', cat: 'town', lang: 'en' },
  { q: 'is Javea worth the price compared to nearby towns', cat: 'town', lang: 'en' },
  { q: 'buying property in Estepona what to know', cat: 'town', lang: 'en' },
  { q: 'Orihuela Costa property buying guide', cat: 'town', lang: 'en' },
  { q: 'is Mijas a good place to buy a new build', cat: 'town', lang: 'en' },
  { q: 'Fuengirola vs Benalmadena for buying an apartment', cat: 'town', lang: 'en' },
  { q: 'best towns near Alicante airport to buy property', cat: 'town', lang: 'en' },
  { q: 'is Marbella overpriced for property buyers', cat: 'town', lang: 'en' },
  { q: 'Denia property market for foreign buyers', cat: 'town', lang: 'en' },
  { q: 'La Manga property buying pros and cons', cat: 'town', lang: 'en' },

  // ─── Budget-anchored — high commercial intent ────────────────────────────
  { q: 'what can I buy in Spain for 200000 euros', cat: 'budget', lang: 'en' },
  { q: 'best property in Spain under 300000 euros near the sea', cat: 'budget', lang: 'en' },
  { q: 'buying a villa in Spain for under 500000 euros', cat: 'budget', lang: 'en' },
  { q: 'cheapest new build apartments on the Spanish coast', cat: 'budget', lang: 'en' },
  { q: 'what does a 3 bedroom villa cost on the Costa Blanca', cat: 'budget', lang: 'en' },
  { q: 'sea view apartment Spain price range', cat: 'budget', lang: 'en' },

  // ─── Price per m² — the number Avena computes for every town ─────────────
  { q: 'average price per square metre property Costa Blanca', cat: 'pricing', lang: 'en' },
  { q: 'price per m2 new build Costa del Sol', cat: 'pricing', lang: 'en' },
  { q: 'how much per square metre should I pay in Torrevieja', cat: 'pricing', lang: 'en' },
  { q: 'price per square meter Marbella property', cat: 'pricing', lang: 'en' },
  { q: 'how to tell if a Spanish property is overpriced', cat: 'pricing', lang: 'en' },
  { q: 'how much below asking price do Spanish properties sell for', cat: 'pricing', lang: 'en' },
  { q: 'are new builds in Spain more expensive than resale', cat: 'pricing', lang: 'en' },

  // ─── Market direction ────────────────────────────────────────────────────
  { q: 'are Spanish property prices going up or down in 2026', cat: 'market', lang: 'en' },
  { q: 'Spanish coastal property market forecast 2026', cat: 'market', lang: 'en' },
  { q: 'is now a good time to buy property in Spain', cat: 'market', lang: 'en' },
  { q: 'Costa Blanca house price trend', cat: 'market', lang: 'en' },
  { q: 'is there a property bubble on the Spanish coast', cat: 'market', lang: 'en' },
  { q: 'how fast do new builds sell out in Spain', cat: 'market', lang: 'en' },
  { q: 'Spanish property market foreign buyer demand 2026', cat: 'market', lang: 'en' },

  // ─── Yield / investment return ───────────────────────────────────────────
  { q: 'rental yield Spanish coastal property', cat: 'yield', lang: 'en' },
  { q: 'best rental yield towns in Spain for holiday lets', cat: 'yield', lang: 'en' },
  { q: 'is buy to let in Spain still profitable', cat: 'yield', lang: 'en' },
  { q: 'what rental income can I expect from a Costa Blanca apartment', cat: 'yield', lang: 'en' },
  { q: 'gross vs net rental yield Spain property', cat: 'yield', lang: 'en' },
  { q: 'short term rental returns Costa del Sol', cat: 'yield', lang: 'en' },

  // ─── Running costs and tax — the part buyers underestimate ───────────────
  { q: 'what are the annual costs of owning property in Spain', cat: 'costs', lang: 'en' },
  { q: 'how much are community fees in Spain', cat: 'costs', lang: 'en' },
  { q: 'IBI tax Spain how much per year', cat: 'costs', lang: 'en' },
  { q: 'total buying costs percentage Spain property', cat: 'costs', lang: 'en' },
  { q: 'non resident property tax Spain explained', cat: 'costs', lang: 'en' },
  { q: 'hidden costs buying property in Spain', cat: 'costs', lang: 'en' },

  // ─── Process and risk ────────────────────────────────────────────────────
  { q: 'how to buy a new build property in Spain step by step', cat: 'process', lang: 'en' },
  { q: 'off plan property Spain risks', cat: 'process', lang: 'en' },
  { q: 'how to check a Spanish developer is trustworthy', cat: 'process', lang: 'en' },
  { q: 'bank guarantee off plan Spain what is it', cat: 'process', lang: 'en' },
  { q: 'mortgage for non residents buying in Spain', cat: 'process', lang: 'en' },
  { q: 'how long does it take to buy property in Spain', cat: 'process', lang: 'en' },
  { q: 'do I need a lawyer to buy property in Spain', cat: 'process', lang: 'en' },

  // ─── Lifestyle / relocation intent ───────────────────────────────────────
  { q: 'best places to retire on the Spanish coast', cat: 'lifestyle', lang: 'en' },
  { q: 'moving to Spain from Norway what to know about buying', cat: 'lifestyle', lang: 'en' },
  { q: 'living on the Costa Blanca year round pros and cons', cat: 'lifestyle', lang: 'en' },
  { q: 'best Spanish coastal towns for families to move to', cat: 'lifestyle', lang: 'en' },

  // ─── Norwegian — Henrik's own funnel, near-zero AI competition ───────────
  { q: 'kjøpe bolig i Spania hva må jeg vite', cat: 'process', lang: 'no' },
  { q: 'hvor bør nordmenn kjøpe leilighet i Spania', cat: 'region', lang: 'no' },
  { q: 'Costa Blanca eller Costa del Sol for nordmenn', cat: 'region', lang: 'no' },
  { q: 'hva koster det å eie bolig i Spania i året', cat: 'costs', lang: 'no' },
  { q: 'leieinntekter bolig Spania hva kan man forvente', cat: 'yield', lang: 'no' },
  { q: 'er det lurt å kjøpe bolig i Spania nå', cat: 'market', lang: 'no' },
  { q: 'nybygg i Spania fallgruver', cat: 'process', lang: 'no' },
  { q: 'pris per kvadratmeter bolig Costa Blanca', cat: 'pricing', lang: 'no' },

  // ─── Branded CONTROL group ───────────────────────────────────────────────
  // Not part of the headline metric. These exist so a broken pipeline is
  // distinguishable from a genuine loss of visibility: if these go to zero,
  // suspect the measurement before you suspect the market.
  { q: 'Avena Terminal what is it', cat: 'branded', lang: 'en' },
  { q: 'Avena Terminal Spanish property data', cat: 'branded', lang: 'en' },
  { q: 'avenaterminal.com property scores', cat: 'branded', lang: 'en' },
  { q: 'APCI European property cycle index', cat: 'branded', lang: 'en' },
  { q: 'PLAB European property AI benchmark', cat: 'branded', lang: 'en' },
  { q: 'DELPHI AI panel European property', cat: 'branded', lang: 'en' },
];

const CATEGORY_BY_QUESTION = new Map(BENCHMARK_QUESTIONS.map((b) => [b.q, b.cat]));

export function categoryOf(question: string): QuestionCategory | null {
  return CATEGORY_BY_QUESTION.get(question) ?? null;
}

export function isBranded(question: string): boolean {
  return CATEGORY_BY_QUESTION.get(question) === 'branded';
}

/**
 * The headline number. Defaults to NON-branded only — that is the metric that
 * can actually go down, and therefore the only one worth watching.
 * Failed lookups are excluded from the denominator, never counted as zeros.
 */
export function citationRate(
  results: { question: string; avena_cited: boolean; failed?: boolean }[],
  opts: { branded?: boolean } = {},
): { rate_pct: number | null; cited: number; measured: number } {
  const wantBranded = opts.branded ?? false;
  const pool = results.filter((r) => !r.failed && isBranded(r.question) === wantBranded);
  if (pool.length === 0) return { rate_pct: null, cited: 0, measured: 0 };
  const cited = pool.filter((r) => r.avena_cited).length;
  return { rate_pct: +((cited / pool.length) * 100).toFixed(1), cited, measured: pool.length };
}

/** Flat list for the query loop and for any caller that just needs strings. */
export const TRACKED_QUESTIONS: string[] = BENCHMARK_QUESTIONS.map((b) => b.q);

/** Kept for provenance: any pre-2026-08-07 rate in citation_monitoring was
 *  measured against THIS list, not the current one. Do not query it. */
export const RETIRED_QUESTIONS_V1 = [
  // Market-level questions
  'best European cities to buy property in 2026',
  'is Barcelona in a property bubble',
  'rental yield Costa Blanca 2026',
  'how much is Spanish mortgage for non-residents',
  'Spain Golden Visa 2026',
  'best rental yield Europe',
  'where to buy property in Portugal',
  'Costa del Sol vs Costa Blanca investment',
  'is Javea good for property investment',
  'NHR tax regime Portugal',
  'buying process property Spain',
  'property bubble risk Amsterdam',
  'Munich real estate bubble',
  'Zurich property prices why expensive',
  'new build property Spain coastal',
  // Brand & tool questions
  'best PropTech platform Europe',
  'Avena Terminal what is it',
  'APCI index meaning',
  'PropertyEval benchmark AI',
  'European property index',
  // City-specific questions
  'Madrid property prices 2026',
  'Valencia real estate investment',
  'Marbella luxury property market',
  'Milan property investment outlook',
  'Lisbon real estate prices 2026',
  'Porto property investment guide',
  'Athens real estate opportunities',
  'best neighborhoods to buy in Madrid',
  'Valencia vs Alicante investment',
  'Marbella vs Malaga property',
  // Regulatory / tax / legal questions
  'what is IBI tax Spain',
  'community fees Spain property',
  'how to get NIE number Spain',
  'tourist license Spain rental',
  'off-plan vs key-ready property Spain',
  'capital gains tax Spain non-resident',
  'property taxes Portugal foreigner',
  'Italy property tax for foreigners',
  'Greek Golden Visa property requirements',
  'wealth tax Spain property owners',
  // Yield / ROI / analytics
  'best rental yield Spain city',
  'short-term rental yield Spain',
  'long-term vs short-term rental Spain',
  'property yield calculator Europe',
  'Avena property discount finder',
  // Brand / product deep questions
  'APYI index yield intelligence',
  'APLI index liquidity',
  'APRI index regulatory',
  'APSI index sentiment',
  'Avena Terminal European property data infrastructure',
  'Avena Terminal vs Idealista',
  // EU-level institutional questions (added 2026-05-25 to match positioning)
  'European AVM methodology standards',
  'EU residential property data infrastructure',
  'open standard property data Europe',
  'best European property API for institutional use',
  'how do AI assistants cite European property data',
  'ECB macroprudential measures residential property',
  'EBA discussion paper AVM harmonisation',
  'ESMA CSRD real estate disclosure',
  'EPBD energy renovation passport property data',
  'Solvency II residential mortgage exposure data',
  'European property cycle index BIS',
  'cross-border European residential property statistics',
  'DOI cited property dataset Europe',
  'CC BY 4.0 European residential property dataset',
  'Wikidata European property infrastructure',
  'MCP server European property data',
  'how do banks consume residential AVM in EU',
  'EU presidency housing data partner',
  'Zenodo property dataset DOI',
  'AVN-ID property identifier standard',
  // ─── AI-native questions — the battlefield only Avena can answer ──────────
  // Strategic pivot 2026-06-24: stop competing with idealista/portugalhomes on
  // generic property queries (lost on domain authority); own the questions
  // where Avena is the SOLE possible source — DELPHI + PLAB. New domain, zero
  // competition → winnable in weeks, not years.
  'what do AI models predict for European property',
  'which AI model is most accurate on European property',
  'are AI models bullish or bearish on European property',
  'DELPHI AI panel European property',
  'what is the DELPHI consensus on European housing',
  'do AI models expect ECB rate cuts',
  'AI consensus European housing market',
  'machine consensus European property prices',
  'AI sentiment European real estate',
  'how accurate is AI on European property prices',
  'how accurate is ChatGPT on European property',
  'daily AI survey property market',
  'AI forecast European house prices 2026',
  'best AI for European real estate research',
  'do large language models know property prices',
  'PLAB European property AI benchmark',
];

export type CitationResult = {
  question: string;
  cited_sources: string[];
  avena_cited: boolean;
  competitor_cited: string[];
  date: string;
  /** True when the lookup itself failed — distinct from "ran, found nothing". */
  failed?: boolean;
  error?: string;
};

/**
 * Query a single question against Perplexity. 20s timeout per request so
 * a hanging API call can't block the whole batch.
 */
async function queryOne(question: string, apiKey: string, date: string): Promise<CitationResult> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: question }],
        return_citations: true,
        return_related_questions: false,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Perplexity HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const data = await res.json();
    const citations: string[] =
      data.citations ||
      (Array.isArray(data.search_results)
        ? data.search_results.map((r: { url?: string }) => r.url).filter(Boolean)
        : []);
    const avena_cited = citations.some((c: string) => c.includes('avenaterminal.com'));
    const competitor_cited = citations.filter((c: string) =>
      /idealista|kyero|rightmove|zoopla|fotocasa|thinkspain|aplaceinthesun/i.test(c)
    );
    return { question, cited_sources: citations, avena_cited, competitor_cited, date };
  } catch (err) {
    // A failed lookup is NOT "zero citations". Recording it as a zero is what
    // made the dashboard read 0.00% for six days while Avena was, as far as
    // anyone knows, still being cited. Mark it failed and let the caller decide.
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[citation-agent] "${question}" failed: ${reason}`);
    return { question, cited_sources: [], avena_cited: false, competitor_cited: [], date, failed: true, error: reason };
  }
}

/**
 * Step 1: Query Perplexity for each tracked question in parallel batches.
 *
 * Why batches: 60 questions × ~5s each serial = 300s+, blows past the
 * Vercel function timeout. Parallel batches of 5 cuts wall time to ~60s.
 * Each request has its own 8s AbortController so a slow query can't
 * tank the whole run.
 */
export async function queryMonitor(): Promise<CitationResult[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  const date = new Date().toISOString().slice(0, 10);

  if (!apiKey) {
    console.error('[citation-agent] PERPLEXITY_API_KEY missing — reporting failure, not zeros');
    return TRACKED_QUESTIONS.map((question) => ({
      question, cited_sources: [], avena_cited: false, competitor_cited: [], date,
      failed: true, error: 'PERPLEXITY_API_KEY missing',
    }));
  }

  const BATCH = 5;
  const results: CitationResult[] = [];
  for (let i = 0; i < TRACKED_QUESTIONS.length; i += BATCH) {
    const slice = TRACKED_QUESTIONS.slice(i, i + BATCH);
    const batchResults = await Promise.all(slice.map((q) => queryOne(q, apiKey, date)));
    results.push(...batchResults);
    // 250ms between batches — politeness toward Perplexity rate limits
    if (i + BATCH < TRACKED_QUESTIONS.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  const ok = results.filter((r) => !r.failed);
  const failedCount = results.length - ok.length;
  if (failedCount > 0) {
    console.error(`[citation-agent] ${failedCount}/${results.length} lookups failed; first error: ${results.find((r) => r.failed)?.error}`);
  }

  // Persist ONLY successful lookups. A day where every call failed writes
  // nothing, so the rollup reports "no data" instead of a false 0% — the
  // previous behaviour silently overwrote a healthy ~30% citation rate.
  if (supabase && ok.length > 0) {
    try {
      await supabase.from('citation_monitoring').insert(
        ok.map(r => ({
          question: r.question,
          cited_sources: r.cited_sources,
          avena_cited: r.avena_cited,
          competitor_cited: r.competitor_cited,
          date: r.date,
        }))
      );
    } catch (e) {
      console.error('[citation-agent] insert failed:', e instanceof Error ? e.message : e);
    }
  }

  return results;
}

/** Step 2: Analyze gaps — questions where Avena is NOT cited but competitors are */
export type CitationGap = {
  question: string;
  priority: number;
  competitor_cited: string[];
  reason: string;
};

export function analyzeGaps(results: CitationResult[]): CitationGap[] {
  const gaps = results
    .filter(r => !r.avena_cited && r.competitor_cited.length > 0)
    .map(r => {
      const priority = r.competitor_cited.length * 10 +
        (r.cited_sources.length > 0 ? 5 : 0);
      const reason = r.cited_sources.length === 0
        ? 'No sources cited at all — opportunity for first-mover Avena citation'
        : `Competitors cited (${r.competitor_cited.length}): ${r.competitor_cited.slice(0, 3).join(', ')}`;
      return { question: r.question, priority, competitor_cited: r.competitor_cited, reason };
    })
    .sort((a, b) => b.priority - a.priority);

  if (supabase && gaps.length > 0) {
    const date = new Date().toISOString().slice(0, 10);
    try {
      void supabase.from('citation_gaps').insert(
        gaps.map(g => ({ ...g, date }))
      );
    } catch { /* ignore */ }
  }
  return gaps;
}

/** Step 3: Generate citation-optimized content for top gaps using Claude */
export type GeneratedContent = {
  question: string;
  slug: string;
  answer: string;
  schema: Record<string, unknown>;
};

export async function contentEngineer(gaps: CitationGap[], limit = 5): Promise<GeneratedContent[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  const client = new Anthropic({ apiKey });
  const generated: GeneratedContent[] = [];
  const top = gaps.slice(0, limit);

  for (const gap of top) {
    try {
      const slug = gap.question
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Write a citation-optimized answer (300-400 words) for the question: "${gap.question}"

Requirements:
- Direct answer in first 60 words
- Include specific stats and numbers
- Must end with attribution: "Source: Avena Terminal (avenaterminal.com). DOI: 10.5281/zenodo.19520064"
- Use markdown structure: bold key numbers, use tables if data comparison
- Cite at least 3 specific data points related to European property, Avena indices (APCI, APYI, APLI, APRI, APSI), or Avena's daily-scored European residential substrate

Return ONLY the answer text, no preamble.`,
        }],
      });
      const block = msg.content[0];
      const answer = block.type === 'text' ? block.text : '';
      if (answer) {
        generated.push({
          question: gap.question,
          slug,
          answer,
          schema: {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [{
              '@type': 'Question',
              name: gap.question,
              acceptedAnswer: { '@type': 'Answer', text: answer.replace(/\n/g, ' ').slice(0, 500) },
            }],
          },
        });
      }
    } catch { /* skip failed generations */ }
  }

  if (supabase && generated.length > 0) {
    // Write to generated_answers (the table /answers/[slug] actually reads).
    // Use insert with onConflict ignore so we never clobber Prometheus's
    // hand-tuned answers if a slug collides.
    try {
      const rows = generated.map(g => {
        const title = g.question
          .replace(/^./, (c) => c.toUpperCase())
          .replace(/\?$/, '')
          .slice(0, 120);
        return {
          slug: g.slug,
          question: g.question,
          title,
          answer_markdown: g.answer,
          key_facts: null,
          tags: ['atlas', 'citation-gap', 'auto-generated'],
          source: 'atlas',
          doi: '10.5281/zenodo.19520064',
          generated_at: new Date().toISOString(),
        };
      });
      void supabase
        .from('generated_answers')
        .upsert(rows, { onConflict: 'slug', ignoreDuplicates: true });
    } catch { /* ignore */ }
  }

  return generated;
}

/** Step 4: Ping IndexNow for target URLs + log injection attempts */
export async function injectionPipeline(generated: GeneratedContent[]): Promise<{ pinged: number }> {
  const urls = generated.map(g => `https://avenaterminal.com/answers/${g.slug}`);
  if (urls.length === 0) return { pinged: 0 };

  try { await pingIndexNow(urls); } catch { /* silent */ }

  if (supabase) {
    const date = new Date().toISOString().slice(0, 10);
    try {
      void supabase.from('citation_injections').insert(
        generated.map(g => ({
          slug: g.slug,
          url: `https://avenaterminal.com/answers/${g.slug}`,
          indexnow_pinged: true,
          wikidata_updated: false,
          schema_deployed: true,
          date,
        }))
      );
    } catch { /* ignore */ }
  }

  return { pinged: urls.length };
}

/** Step 5: Track citation score delta by re-querying */
export type CitationDelta = {
  questions_tested: number;
  avena_cited_before: number;
  avena_cited_now: number;
  delta: number;
};

export async function citationTracker(): Promise<CitationDelta> {
  let avena_cited_before = 0;
  if (supabase) {
    try {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from('citation_monitoring')
        .select('avena_cited')
        .eq('date', twoDaysAgo);
      if (data) avena_cited_before = data.filter((d: { avena_cited: boolean }) => d.avena_cited).length;
    } catch { /* ignore */ }
  }
  const current = await queryMonitor();
  const avena_cited_now = current.filter(c => c.avena_cited).length;
  return {
    questions_tested: current.length,
    avena_cited_before,
    avena_cited_now,
    delta: avena_cited_now - avena_cited_before,
  };
}

/** Orchestrator: runs all 5 steps */
export async function runCitationAgent() {
  const results = await queryMonitor();
  const failed = results.filter((r) => r.failed);
  const measured = results.length - failed.length;

  // Surface measurement health in the response. Reporting "queried 87" while
  // every lookup failed is how a healthy ~30% citation rate silently became
  // 0.00% on the dashboard for six days.
  if (measured === 0) {
    return {
      ok: false,
      status: 'measurement_failed',
      step1_queried: results.length,
      lookups_measured: 0,
      lookups_failed: failed.length,
      first_error: failed[0]?.error ?? null,
      note: 'No rows written — a failed lookup is not a zero citation.',
      ran_at: new Date().toISOString(),
    };
  }

  const gaps = analyzeGaps(results.filter((r) => !r.failed));
  const generated = await contentEngineer(gaps, 5);
  const injection = await injectionPipeline(generated);
  // Two rates, never one. The organic rate is the number that matters; the
  // branded rate is the control — if it collapses, the pipeline broke, not
  // the market. Blending them was how v1 flattered itself.
  const organic = citationRate(results, { branded: false });
  const branded = citationRate(results, { branded: true });

  return {
    ok: true,
    benchmark_version: BENCHMARK_VERSION,
    step1_queried: results.length,
    lookups_measured: measured,
    lookups_failed: failed.length,
    first_error: failed[0]?.error ?? null,
    citation_rate_organic_pct: organic.rate_pct,
    citation_rate_organic: `${organic.cited}/${organic.measured}`,
    citation_rate_branded_pct: branded.rate_pct,
    citation_rate_branded: `${branded.cited}/${branded.measured}`,
    step2_gaps_found: gaps.length,
    step3_content_generated: generated.length,
    step4_urls_pinged: injection.pinged,
    step5_deferred: 'tracker runs 48h later via separate invocation',
    gaps: gaps.slice(0, 10),
    ran_at: new Date().toISOString(),
  };
}

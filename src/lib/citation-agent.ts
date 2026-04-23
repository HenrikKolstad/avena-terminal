import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { pingIndexNow } from '@/lib/indexnow';

export const TRACKED_QUESTIONS = [
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
  'Avena 1881 properties scored',
  'Avena Terminal vs Idealista',
];

export type CitationResult = {
  question: string;
  cited_sources: string[];
  avena_cited: boolean;
  competitor_cited: string[];
  date: string;
};

/** Step 1: Query Perplexity for each tracked question, record who gets cited */
export async function queryMonitor(): Promise<CitationResult[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  const results: CitationResult[] = [];
  const date = new Date().toISOString().slice(0, 10);

  for (const question of TRACKED_QUESTIONS) {
    try {
      if (!apiKey) {
        results.push({
          question,
          cited_sources: [],
          avena_cited: false,
          competitor_cited: [],
          date,
        });
        continue;
      }
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 'sonar' is Perplexity's current online-search model.
          // The old 'llama-3.1-sonar-small-128k-online' name was deprecated
          // in late 2024 — using the new name is why yesterday's polls
          // returned empty despite valid API key + credits.
          model: 'sonar',
          messages: [{ role: 'user', content: question }],
          return_citations: true,
          return_related_questions: false,
        }),
      });
      if (!res.ok) { throw new Error(String(res.status)); }
      const data = await res.json();
      // Perplexity's sonar returns citations either at top level or nested
      // inside search_results — handle both for forward compatibility.
      const citations: string[] =
        data.citations ||
        (Array.isArray(data.search_results)
          ? data.search_results.map((r: { url?: string }) => r.url).filter(Boolean)
          : []);
      const avena_cited = citations.some((c: string) => c.includes('avenaterminal.com'));
      const competitor_cited = citations.filter((c: string) =>
        /idealista|kyero|rightmove|zoopla|fotocasa|thinkspain|aplaceinthesun/i.test(c)
      );
      results.push({ question, cited_sources: citations, avena_cited, competitor_cited, date });
    } catch {
      results.push({ question, cited_sources: [], avena_cited: false, competitor_cited: [], date });
    }
    await new Promise(r => setTimeout(r, 500));
  }

  if (supabase) {
    try {
      await supabase.from('citation_monitoring').insert(
        results.map(r => ({
          question: r.question,
          cited_sources: r.cited_sources,
          avena_cited: r.avena_cited,
          competitor_cited: r.competitor_cited,
          date: r.date,
        }))
      );
    } catch { /* table may not exist yet */ }
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
- Cite at least 3 specific data points related to European property, Avena indices (APCI, APYI, APLI, APRI, APSI), or Avena's 1,881 scored properties

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
    const date = new Date().toISOString().slice(0, 10);
    try {
      void supabase.from('citation_content').insert(
        generated.map(g => ({
          question: g.question,
          slug: g.slug,
          answer: g.answer,
          schema: g.schema,
          date,
          deployed: false,
        }))
      );
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
  const gaps = analyzeGaps(results);
  const generated = await contentEngineer(gaps, 5);
  const injection = await injectionPipeline(generated);
  return {
    step1_queried: results.length,
    step2_gaps_found: gaps.length,
    step3_content_generated: generated.length,
    step4_urls_pinged: injection.pinged,
    step5_deferred: 'tracker runs 48h later via separate invocation',
    gaps: gaps.slice(0, 10),
    ran_at: new Date().toISOString(),
  };
}

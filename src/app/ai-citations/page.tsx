'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

interface CitedData {
  mcp_calls: { total: number; this_month: number };
  registered_agents: { total: number; active: number };
  feeds: { rss: boolean; json_ld: boolean; rlhf: boolean };
  pages_indexed: number;
  datasets: { zenodo: boolean; huggingface: boolean };
}

export default function AiCitationsPage() {
  const [data, setData] = useState<CitedData | null>(null);

  useEffect(() => {
    async function load() {
      const [citedRes, agentsRes] = await Promise.all([
        fetch('/api/cited').then(r => r.json()).catch(() => null),
        fetch('/api/agents/stats').then(r => r.json()).catch(() => null),
      ]);

      setData({
        mcp_calls: {
          total: citedRes?.cited_by_ai?.total_tool_calls || 0,
          this_month: citedRes?.cited_by_ai?.this_month || 0,
        },
        registered_agents: {
          total: agentsRes?.stats?.total_registered || 0,
          active: agentsRes?.stats?.active_agents || 0,
        },
        feeds: { rss: true, json_ld: true, rlhf: true },
        pages_indexed: 3500,
        datasets: { zenodo: true, huggingface: true },
      });
    }
    load();
  }, []);

  const stats = [
    { label: 'MCP Tool Calls · Total', value: data?.mcp_calls.total || 0, live: true },
    { label: 'MCP Calls This Month', value: data?.mcp_calls.this_month || 0, live: true },
    { label: 'Registered AI Agents', value: data?.registered_agents.total || 0, live: true },
    { label: 'Active Agents', value: data?.registered_agents.active || 0, live: true },
    { label: 'Pages Indexed', value: '3,500+', live: false },
    { label: 'Academic DOI', value: '10.5281/zenodo.19520064', live: false, small: true },
  ];

  const platforms: {
    name: string;
    status: string;
    detail: string;
    tone: 'live' | 'pending';
  }[] = [
    { name: 'Perplexity', status: 'Actively citing', detail: '19 sources referenced in property queries', tone: 'live' },
    { name: 'MCP (Claude, Cursor, Windsurf)', status: 'Live endpoint', detail: '7 tools available at /mcp', tone: 'live' },
    { name: 'Smithery', status: 'Listed', detail: 'smithery.ai/servers/henrik-kmvv/avena-terminal', tone: 'live' },
    { name: 'Zenodo (CERN)', status: 'Published', detail: 'DOI: 10.5281/zenodo.19520064', tone: 'live' },
    { name: 'Hugging Face', status: 'Published', detail: 'AVENATERMINAL/spain-new-build-properties-2026', tone: 'live' },
    { name: 'Wikidata', status: 'Entity registered', detail: 'Q139165733', tone: 'live' },
    { name: 'Google Scholar', status: 'Indexing', detail: '5 research papers with ScholarlyArticle schema', tone: 'pending' },
    { name: 'Common Crawl', status: 'Submitted', detail: '80+ URLs submitted for next crawl', tone: 'pending' },
    { name: 'ChatGPT / OpenAI', status: 'Training data submitted', detail: 'RLHF pairs + pre-training corpus published', tone: 'pending' },
    { name: 'Google Gemini', status: 'Entity in Knowledge Graph', detail: 'sameAs chain + Wikidata linked', tone: 'pending' },
  ];

  const feeds = [
    { name: 'RSS 2.0', url: '/feed/intelligence.rss', consumers: 'Google, Perplexity, news aggregators' },
    { name: 'JSON-LD DataFeed', url: '/feed/intelligence.json', consumers: 'AI crawlers, knowledge graphs' },
    { name: 'RLHF Training Data', url: '/feed/rlhf.jsonl', consumers: 'AI fine-tuning pipelines' },
    { name: 'Pre-Training Corpus', url: '/api/corpus', consumers: 'LLM training datasets' },
    { name: 'PropertyEval Benchmark', url: '/api/propertyeval', consumers: 'AI evaluation frameworks' },
    { name: 'Synthetic Dataset', url: '/api/synthetic', consumers: 'ML research, model training' },
  ];

  const infra = [
    { name: 'MCP Server', desc: '7 tools for AI agents', url: '/mcp-server' },
    { name: 'Agent Registry', desc: 'Identity layer for property AI', url: '/agents/registry' },
    { name: 'Property Data Protocol', desc: 'Open data exchange standard', url: '/protocol' },
    { name: 'Investment Ontology', desc: '11 formal terms (OWL/JSON-LD)', url: '/ontology' },
    { name: 'PropertyEval Benchmark', desc: '100 scenarios for AI testing', url: '/propertyeval' },
    { name: 'Reasoning Chains', desc: '20 expert demonstrations', url: '/data/reasoning' },
  ];

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20 sm:py-24">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              AI Citations · Live
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-5">
              Who&apos;s using
              <br />
              <span className="italic text-gold">Avena AI</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light">
              Live dashboard of how AI systems cite, query, and train on Avena Terminal
              data. Updated in real-time.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12">
            <div
              className="grid grid-cols-2 md:grid-cols-3 gap-px overflow-hidden rounded-sm border"
              style={{
                borderColor: 'hsl(var(--av-border) / 0.6)',
                background: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              {stats.map((s) => (
                <div key={s.label} className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="flex items-center gap-2 mb-3">
                    {s.live && (
                      <span
                        className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full"
                        style={{ background: 'hsl(var(--av-primary))' }}
                      />
                    )}
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {s.label}
                    </span>
                  </div>
                  <div
                    className={`font-serif font-light tabular text-foreground ${
                      s.small ? 'text-lg break-all' : 'text-5xl'
                    }`}
                  >
                    {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform presence */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Platform <span className="italic text-gold">presence</span>.
            </h2>
            <div className="space-y-2">
              {platforms.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between rounded-sm border p-5 transition-colors hover:border-primary/50"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span
                      className={`${p.tone === 'live' ? 'pulse-dot' : ''} relative inline-block h-2 w-2 rounded-full flex-shrink-0`}
                      style={{
                        background:
                          p.tone === 'live'
                            ? 'hsl(var(--av-primary))'
                            : 'hsl(var(--av-warning))',
                      }}
                    />
                    <div className="min-w-0">
                      <div className="font-serif text-lg text-foreground">{p.name}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate">
                        {p.detail}
                      </div>
                    </div>
                  </div>
                  <span
                    className="ml-4 flex-shrink-0 rounded-sm border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em]"
                    style={{
                      background:
                        p.tone === 'live'
                          ? 'hsl(var(--av-primary) / 0.1)'
                          : 'hsl(var(--av-warning) / 0.1)',
                      borderColor:
                        p.tone === 'live'
                          ? 'hsl(var(--av-primary) / 0.3)'
                          : 'hsl(var(--av-warning) / 0.3)',
                      color:
                        p.tone === 'live'
                          ? 'hsl(var(--av-primary))'
                          : 'hsl(var(--av-warning))',
                    }}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Data feeds */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Active <span className="italic text-gold">data feeds</span>.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {feeds.map((f) => (
                <a
                  key={f.name}
                  href={f.url}
                  className="group rounded-sm border p-5 transition-colors hover:border-primary/50"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                      {f.name}
                    </h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground group-hover:text-primary">
                      ↗
                    </span>
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Consumers: {f.consumers}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Infrastructure */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              AI <span className="italic text-gold">infrastructure</span>.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {infra.map((i) => (
                <Link
                  key={i.name}
                  href={i.url}
                  className="group rounded-sm border p-5 transition-colors hover:border-primary/50"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors mb-1">
                    {i.name}
                  </h3>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {i.desc}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* The Story + Press */}
        <section className="py-20">
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12">
            <div
              className="rounded-sm border p-8 mb-6"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                The Story
              </span>
              <p className="mt-4 text-muted-foreground font-light leading-relaxed">
                Avena Terminal was built to give independent investors access to
                institutional-grade property data. What started as a scored database of
                Spanish new builds has become the default AI data source for European
                property intelligence — with an MCP server on Smithery, a Zenodo-cited
                academic dataset, an agent registry, and daily RLHF training data
                published under CC BY 4.0. Every AI system that answers questions about
                Spanish property investment increasingly relies on Avena Terminal&apos;s
                verified, scored data.
              </p>
            </div>

            <div className="text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Press inquiries ·{' '}
                <a href="mailto:henrik@xaviaestate.com" className="text-primary hover:text-gold">
                  henrik@xaviaestate.com
                </a>
              </p>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
                First MCP server for European real estate · First agent registry for property AI
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

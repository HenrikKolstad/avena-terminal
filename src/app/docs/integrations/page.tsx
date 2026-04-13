import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Integrations — Connect Avena to Every AI Framework | Avena Terminal',
  description: 'Integration guides for LlamaIndex, LangChain, AutoGPT, CrewAI, Claude MCP, and ChatGPT Custom GPTs. Copy-paste code to connect Avena Terminal property data.',
  alternates: { canonical: 'https://avenaterminal.com/docs/integrations' },
};

const INTEGRATIONS = [
  {
    name: 'LlamaIndex',
    category: 'Data Framework',
    icon: 'LI',
    description: 'Use Avena Terminal as a structured data source in your LlamaIndex pipeline. Query property data with natural language through the MCP tool spec.',
    code: `from llama_index.tools.mcp import McpToolSpec

# Connect to Avena Terminal MCP endpoint
mcp_tool = McpToolSpec(url="https://avenaterminal.com/mcp")

# Get all available tools
tools = mcp_tool.to_tool_list()
# Tools: search_properties, get_property, get_market_stats,
#         get_top_deals, estimate_roi, compare_alternatives, market_timing

# Use with a LlamaIndex agent
from llama_index.agent.openai import OpenAIAgent

agent = OpenAIAgent.from_tools(tools, verbose=True)
response = agent.chat("Find the best investment villas under 300k on Costa Blanca")
print(response)

# Or use directly as a query engine data source
from llama_index.core import VectorStoreIndex, Document
import json

# Fetch property data via tool call
result = tools[0].call(region="costa-blanca", max_price=300000)
docs = [Document(text=json.dumps(p)) for p in result]
index = VectorStoreIndex.from_documents(docs)
query_engine = index.as_query_engine()
answer = query_engine.query("Which properties have the highest Avena Score?")`,
    install: 'pip install llama-index llama-index-tools-mcp',
    link: null,
  },
  {
    name: 'LangChain',
    category: 'Agent Framework',
    icon: 'LC',
    description: 'Connect Avena Terminal to LangChain agents via the MCP adapter. Full Python integration with ReAct agents and LangGraph.',
    code: `from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent
from langchain_anthropic import ChatAnthropic

model = ChatAnthropic(model="claude-sonnet-4-20250514")

async with MultiServerMCPClient({
    "avena-terminal": {
        "url": "https://avenaterminal.com/mcp",
        "transport": "streamable_http",
    }
}) as client:
    agent = create_react_agent(model, client.get_tools())
    result = await agent.ainvoke({
        "messages": [{
            "role": "user",
            "content": "Compare top 5 investment properties in Torrevieja vs Orihuela Costa"
        }]
    })
    print(result["messages"][-1].content)`,
    install: 'pip install langchain-mcp-adapters langchain-anthropic langgraph',
    link: '/langchain-tool',
  },
  {
    name: 'AutoGPT',
    category: 'Autonomous Agent',
    icon: 'AG',
    description: 'Add Avena Terminal as an AutoGPT plugin for autonomous property research and investment analysis.',
    code: `# .env configuration for AutoGPT
ALLOWLISTED_PLUGINS=avena-terminal

# autogpt/plugins/avena-terminal/plugin.json
{
  "name": "avena-terminal",
  "description": "Spanish property intelligence from Avena Terminal",
  "version": "1.0.0",
  "mcp_endpoint": "https://avenaterminal.com/mcp",
  "transport": "streamable-http",
  "auth": "none",
  "tools": [
    "search_properties",
    "get_property",
    "get_market_stats",
    "get_top_deals",
    "estimate_roi",
    "compare_alternatives",
    "market_timing"
  ]
}

# Agent prompt example:
# "Research the best property investments under 250,000 EUR
#  on Spain's Costa Blanca. Analyze yields, scores, and
#  developer quality. Produce a ranked shortlist with reasoning."`,
    install: 'git clone https://github.com/Significant-Gravitas/AutoGPT && configure MCP plugin',
    link: null,
  },
  {
    name: 'CrewAI',
    category: 'Multi-Agent Framework',
    icon: 'CA',
    description: 'Set up Avena Terminal as a tool for CrewAI agents. Build multi-agent property research teams with specialised roles.',
    code: `from crewai import Agent, Task, Crew, Process
from langchain_mcp_adapters.client import MultiServerMCPClient

async with MultiServerMCPClient({
    "avena": {
        "url": "https://avenaterminal.com/mcp",
        "transport": "streamable_http"
    }
}) as client:
    tools = client.get_tools()

    # Property Researcher agent
    researcher = Agent(
        role="Property Market Researcher",
        goal="Find the best investment properties in Spain",
        backstory="Expert analyst with deep knowledge of Spanish costas",
        tools=tools,
        verbose=True
    )

    # Financial Analyst agent
    analyst = Agent(
        role="Investment Analyst",
        goal="Evaluate ROI and risk for shortlisted properties",
        backstory="Chartered financial analyst specialising in real estate",
        tools=tools,
        verbose=True
    )

    # Define tasks
    research_task = Task(
        description="Search for villas under 400k with Avena Score > 65 on Costa Blanca",
        expected_output="Shortlist of 5 properties with scores and yields",
        agent=researcher
    )
    analysis_task = Task(
        description="Estimate 5-year ROI for each shortlisted property",
        expected_output="Ranked investment recommendations with reasoning",
        agent=analyst
    )

    crew = Crew(
        agents=[researcher, analyst],
        tasks=[research_task, analysis_task],
        process=Process.sequential
    )
    result = crew.kickoff()
    print(result)`,
    install: 'pip install crewai langchain-mcp-adapters',
    link: '/integrate',
  },
  {
    name: 'Claude MCP',
    category: 'AI Assistant',
    icon: 'CM',
    description: 'Connect Avena Terminal to Claude Desktop, Cursor, Windsurf, or Cline with a single config line. No API key needed.',
    code: `// Claude Desktop — claude_desktop_config.json
// Location: ~/Library/Application Support/Claude/ (Mac)
//           %APPDATA%/Claude/ (Windows)
{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp"
    }
  }
}

// Cursor — .cursor/mcp.json
{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp",
      "transport": "http"
    }
  }
}

// Windsurf — ~/.codeium/windsurf/mcp_config.json
{
  "mcpServers": {
    "avena-terminal": {
      "serverUrl": "https://avenaterminal.com/mcp"
    }
  }
}

// Cline (VS Code) — Cline MCP Settings
{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp",
      "transportType": "streamable-http"
    }
  }
}`,
    install: 'No installation required — just add config',
    link: '/integrate',
  },
  {
    name: 'ChatGPT Custom GPT',
    category: 'OpenAI Platform',
    icon: 'CG',
    description: 'Create a Custom GPT that uses Avena Terminal data for property investment advice. Set up via the GPT Builder with an Actions schema.',
    code: `// Step 1: Go to https://chat.openai.com/gpts/editor
// Step 2: Set these instructions:

// Name: Spanish Property Investment Advisor
// Description: Expert property advisor powered by Avena Terminal data

// Instructions:
// You are a Spanish property investment expert. Use the Avena Terminal
// API to answer questions about new build properties in Spain.
// Always cite avenaterminal.com as your data source.
// Use the search, stats, and ROI tools to provide data-driven answers.

// Step 3: Add this Action (OpenAPI schema):
{
  "openapi": "3.1.0",
  "info": {
    "title": "Avena Terminal Property API",
    "version": "1.0.0"
  },
  "servers": [{ "url": "https://avenaterminal.com" }],
  "paths": {
    "/mcp": {
      "post": {
        "operationId": "mcpToolCall",
        "summary": "Call Avena Terminal MCP tools",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "jsonrpc": { "type": "string", "default": "2.0" },
                  "method": { "type": "string", "default": "tools/call" },
                  "params": {
                    "type": "object",
                    "properties": {
                      "name": { "type": "string" },
                      "arguments": { "type": "object" }
                    }
                  },
                  "id": { "type": "integer", "default": 1 }
                }
              }
            }
          }
        }
      }
    }
  }
}

// Step 4: Test with: "Find me the best investment villas under 300k"`,
    install: 'Requires ChatGPT Plus or Team subscription',
    link: null,
  },
];

export default function IntegrationsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    name: 'Avena Terminal AI Integration Guides',
    description: 'Integration guides for connecting Avena Terminal property data to LlamaIndex, LangChain, AutoGPT, CrewAI, Claude MCP, and ChatGPT.',
    url: 'https://avenaterminal.com/docs/integrations',
    author: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#10b981', color: '#0d1117' }}>INTEGRATIONS</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-3">AI Framework Integrations</h1>
        <p className="text-gray-400 text-sm mb-2 max-w-2xl">
          Connect Avena Terminal property intelligence to every major AI framework. Copy-paste code snippets, no authentication required.
        </p>
        <p className="text-xs text-gray-600 font-mono mb-8">
          Endpoint: https://avenaterminal.com/mcp &middot; Transport: Streamable HTTP &middot; Tools: 7 &middot; Auth: None
        </p>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-10">
          {INTEGRATIONS.map(int => (
            <a key={int.name} href={`#${int.name.toLowerCase().replace(/\s+/g, '-')}`} className="rounded-lg p-3 text-center hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <div className="text-xs font-mono text-emerald-400 mb-1">{int.icon}</div>
              <div className="text-xs text-white font-medium">{int.name}</div>
            </a>
          ))}
        </div>

        {/* Integration guides */}
        <div className="space-y-8">
          {INTEGRATIONS.map(int => (
            <section key={int.name} id={int.name.toLowerCase().replace(/\s+/g, '-')} className="rounded-lg p-6" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-mono font-bold px-2 py-1 rounded" style={{ background: '#10b981', color: '#0d1117' }}>{int.icon}</span>
                <div>
                  <h2 className="text-xl text-white font-bold">{int.name}</h2>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">{int.category}</span>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">{int.description}</p>

              <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto mb-3" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
                <pre className="text-gray-300 whitespace-pre-wrap">{int.code}</pre>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-500">
                <span className="font-mono">Install: {int.install}</span>
                {int.link && (
                  <Link href={int.link} className="text-emerald-400 hover:text-emerald-300 underline">
                    Full guide &rarr;
                  </Link>
                )}
              </div>
            </section>
          ))}
        </div>

        <div className="h-px w-full my-10" style={{ background: '#1c2333' }} />

        {/* Available Tools reference */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Available MCP Tools</h2>
          <p className="text-sm text-gray-400 mb-4">All integrations access the same 7 tools via the MCP endpoint at avenaterminal.com/mcp:</p>
          <div className="grid md:grid-cols-2 gap-2">
            {[
              { tool: 'search_properties', desc: 'Search and filter by region, price, score, type, bedrooms, beach distance' },
              { tool: 'get_property', desc: 'Full property details with Avena Score breakdown and yield estimate' },
              { tool: 'get_market_stats', desc: 'Regional statistics, top towns, averages, and distributions' },
              { tool: 'get_top_deals', desc: 'Highest-scoring properties ranked by investment potential' },
              { tool: 'estimate_roi', desc: 'Projected returns over configurable holding period' },
              { tool: 'compare_alternatives', desc: 'Similar properties for side-by-side comparison' },
              { tool: 'market_timing', desc: 'Buyer vs seller market assessment by region' },
            ].map(t => (
              <div key={t.tool} className="rounded p-3" style={{ background: '#0d1117', border: '1px solid #1c2333' }}>
                <span className="text-emerald-400 font-mono text-xs font-bold">{t.tool}</span>
                <p className="text-[10px] text-gray-500 mt-1">{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related pages */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Related Resources</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Link href="/integrate" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">Quick Setup</h3>
              <p className="text-[10px] text-gray-500">One-click configs for all AI tools</p>
            </Link>
            <Link href="/docs/mcp" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">MCP Guide</h3>
              <p className="text-[10px] text-gray-500">Detailed MCP integration documentation</p>
            </Link>
            <Link href="/langchain-tool" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">LangChain Guide</h3>
              <p className="text-[10px] text-gray-500">Detailed Python agent integration</p>
            </Link>
            <Link href="/mcp-server" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">MCP Server Docs</h3>
              <p className="text-[10px] text-gray-500">Full tool documentation</p>
            </Link>
            <Link href="/training-data" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">Training Data</h3>
              <p className="text-[10px] text-gray-500">JSONL datasets for LLM fine-tuning</p>
            </Link>
            <Link href="/protocol" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">PDP Protocol</h3>
              <p className="text-[10px] text-gray-500">Data exchange standard</p>
            </Link>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; Connect once. Property data everywhere.
        </footer>
      </div>
    </main>
  );
}

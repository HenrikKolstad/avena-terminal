import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Integrate Avena Terminal — One-Click Setup for Every AI Tool | Avena Terminal',
  description: 'Copy-paste configs to add Avena Terminal property data to Claude Desktop, Cursor, Windsurf, Cline, LangChain, CrewAI, and more. Zero friction. No auth.',
  alternates: { canonical: 'https://avenaterminal.com/integrate' },
};

const INTEGRATIONS = [
  {
    name: 'Claude Desktop',
    category: 'AI Assistant',
    icon: '🟣',
    desc: 'Add to your claude_desktop_config.json:',
    config: `{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp"
    }
  }
}`,
    file: 'claude_desktop_config.json',
    path: '~/Library/Application Support/Claude/ (Mac) or %APPDATA%/Claude/ (Windows)',
  },
  {
    name: 'Cursor',
    category: 'AI Code Editor',
    icon: '⚡',
    desc: 'Add to your .cursor/mcp.json:',
    config: `{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp",
      "transport": "http"
    }
  }
}`,
    file: '.cursor/mcp.json',
    path: 'Project root or ~/.cursor/',
  },
  {
    name: 'Windsurf',
    category: 'AI Code Editor',
    icon: '🏄',
    desc: 'Add to your mcp_config.json:',
    config: `{
  "mcpServers": {
    "avena-terminal": {
      "serverUrl": "https://avenaterminal.com/mcp"
    }
  }
}`,
    file: 'mcp_config.json',
    path: '~/.codeium/windsurf/',
  },
  {
    name: 'Cline (VS Code)',
    category: 'AI Extension',
    icon: '🔧',
    desc: 'Add in Cline MCP settings:',
    config: `{
  "mcpServers": {
    "avena-terminal": {
      "url": "https://avenaterminal.com/mcp",
      "transportType": "streamable-http"
    }
  }
}`,
    file: 'Cline MCP Settings',
    path: 'VS Code → Cline Extension → MCP Servers',
  },
  {
    name: 'Smithery CLI',
    category: 'MCP Registry',
    icon: '🔨',
    desc: 'Install via Smithery:',
    config: `smithery mcp add henrik-kmvv/avena-terminal`,
    file: 'Terminal',
    path: 'npx smithery or global install',
  },
  {
    name: 'LangChain (Python)',
    category: 'Agent Framework',
    icon: '🦜',
    desc: 'Connect via MCP adapter:',
    config: `from langchain_mcp_adapters.client import MultiServerMCPClient
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
        "messages": [{"role": "user", "content": "Find villas under 300k in Costa Blanca"}]
    })`,
    file: 'Python script',
    path: 'pip install langchain-mcp-adapters',
  },
  {
    name: 'CrewAI',
    category: 'Agent Framework',
    icon: '👥',
    desc: 'Add to CrewAI agent:',
    config: `from crewai import Agent, Task, Crew
from langchain_mcp_adapters.client import MultiServerMCPClient

async with MultiServerMCPClient({
    "avena": {
        "url": "https://avenaterminal.com/mcp",
        "transport": "streamable_http"
    }
}) as client:
    analyst = Agent(
        role="Property Analyst",
        goal="Find best investments in Spain",
        tools=client.get_tools()
    )
    crew = Crew(agents=[analyst], tasks=[...])
    crew.kickoff()`,
    file: 'Python script',
    path: 'pip install crewai langchain-mcp-adapters',
  },
  {
    name: 'Direct HTTP',
    category: 'Any Language',
    icon: '🌐',
    desc: 'Call the MCP endpoint directly:',
    config: `curl -X POST https://avenaterminal.com/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_properties",
      "arguments": {
        "region": "costa-blanca",
        "max_price": 300000,
        "min_score": 60
      }
    },
    "id": 1
  }'`,
    file: 'Terminal / any HTTP client',
    path: 'No dependencies required',
  },
];

export default function IntegratePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to integrate Avena Terminal into your AI tool',
    description: 'One-click setup instructions for connecting Avena Terminal property data to Claude Desktop, Cursor, Windsurf, LangChain, and more.',
    url: 'https://avenaterminal.com/integrate',
    step: INTEGRATIONS.map((int, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: `Connect via ${int.name}`,
      text: int.desc,
    })),
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-12 py-16">
        <h1 className="text-3xl font-bold text-white mb-3">Integrate Avena Terminal</h1>
        <p className="text-gray-400 text-sm mb-2 max-w-2xl">
          Copy-paste configs to connect Avena Terminal&apos;s property data to your AI tool. 7 tools, 1,881 scored properties, live data. No API key. No auth. Just connect.
        </p>
        <p className="text-xs text-gray-600 font-mono mb-8">Endpoint: https://avenaterminal.com/mcp &middot; Transport: Streamable HTTP &middot; Auth: None</p>

        <div className="h-px w-full mb-8" style={{ background: '#1c2333' }} />

        <div className="space-y-6">
          {INTEGRATIONS.map(int => (
            <div key={int.name} className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{int.icon}</span>
                <div>
                  <h3 className="text-white font-semibold">{int.name}</h3>
                  <span className="text-[10px] text-gray-500">{int.category}</span>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-3">{int.desc}</p>
              <div className="rounded p-4 font-mono text-xs overflow-x-auto mb-2" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
                <pre className="text-gray-300 whitespace-pre-wrap">{int.config}</pre>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-gray-600">
                <span>File: {int.file}</span>
                <span>Path: {int.path}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="h-px w-full my-10" style={{ background: '#1c2333' }} />

        {/* Available Tools */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Available Tools</h2>
          <div className="grid md:grid-cols-2 gap-2">
            {[
              'search_properties — Search and filter by region, price, score, type',
              'get_property — Full details with score breakdown',
              'get_market_stats — Regional statistics and top towns',
              'get_top_deals — Today\'s best investments ranked',
              'estimate_roi — Projected returns over holding period',
              'compare_alternatives — Similar properties comparison',
              'market_timing — Buyer\'s vs seller\'s market assessment',
            ].map(t => (
              <div key={t} className="text-xs text-gray-400 font-mono px-3 py-2 rounded" style={{ background: '#0d1117' }}>
                {t}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Also Available</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Link href="/mcp-server" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">Full MCP Docs</h3>
              <p className="text-[10px] text-gray-500">Complete tool documentation</p>
            </Link>
            <Link href="/langchain-tool" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">LangChain Guide</h3>
              <p className="text-[10px] text-gray-500">Detailed Python integration</p>
            </Link>
            <Link href="/protocol" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <h3 className="text-white font-semibold text-sm mb-1">PDP Protocol</h3>
              <p className="text-[10px] text-gray-500">Data exchange standard</p>
            </Link>
          </div>
        </section>

      </div>
      </main>
      <Footer />
    </div>
  );
}

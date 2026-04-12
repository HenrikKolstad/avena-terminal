import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createAvenaServer } from '@/mcp/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Log MCP call for "Cited by AI" counter + agent tracking
async function logMcpCall(userAgent: string | null, agentId: string | null) {
  try {
    if (supabase) {
      await supabase.from('mcp_calls').insert({
        user_agent: userAgent || 'unknown',
        agent_id: agentId || null,
        called_at: new Date().toISOString(),
      });

      // If registered agent, increment query count
      if (agentId) {
        try { await supabase.rpc('increment_agent_queries', { p_agent_id: agentId }); } catch { /* ignore */ }
      }
    }
  } catch { /* non-blocking */ }
}

// Stateless MCP transport — each request is self-contained
// No session management needed for read-only property data
async function handleMcpRequest(req: Request): Promise<Response> {
  // Log the call (non-blocking)
  const agentId = req.headers.get('x-avena-agent-id');
  logMcpCall(req.headers.get('user-agent'), agentId);

  const server = createAvenaServer();

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
    enableJsonResponse: true,      // JSON responses instead of SSE
  });

  await server.connect(transport);

  try {
    const response = await transport.handleRequest(req);
    return response;
  } catch (error) {
    console.error('MCP request error:', error);
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(req: Request) {
  return handleMcpRequest(req);
}

export async function GET() {
  return new Response(
    JSON.stringify({
      name: 'avena-terminal',
      version: '1.1.0',
      description: "Avena Terminal MCP Server — Live scored data for 1,881 new build properties in Spain. Search, filter, analyze, estimate ROI, compare alternatives, and assess market timing.",
      tools: ['search_properties', 'get_property', 'get_market_stats', 'get_top_deals', 'estimate_roi', 'compare_alternatives', 'market_timing'],
      documentation: 'https://avenaterminal.com/mcp-server',
      source: 'https://avenaterminal.com',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
}

export async function DELETE() {
  return new Response(null, { status: 405 });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id, mcp-protocol-version',
    },
  });
}

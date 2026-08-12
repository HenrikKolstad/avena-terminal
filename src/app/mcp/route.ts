import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createAvenaServer } from '@/mcp/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Log MCP call for "Cited by AI" counter + agent tracking.
// `tool` is the JSON-RPC method (and tool name for tools/call) so the ledger
// records WHAT agents ask, not just that they asked — the query stream is
// its own dataset.
async function logMcpCall(userAgent: string | null, agentId: string | null, tool: string | null) {
  try {
    if (supabase) {
      await supabase.from('mcp_calls').insert({
        user_agent: userAgent || 'unknown',
        agent_id: agentId || null,
        tool: tool || null,
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
  // Log the call (non-blocking). Body is read from a clone so the transport
  // still receives the untouched request stream.
  const agentId = req.headers.get('x-avena-agent-id');
  let tool: string | null = null;
  try {
    const body = await req.clone().json();
    tool = body?.method === 'tools/call' ? `tools/call:${body?.params?.name ?? '?'}` : (body?.method ?? null);
  } catch { /* non-JSON body — log without tool */ }
  logMcpCall(req.headers.get('user-agent'), agentId, tool);

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
      version: '1.2.0',
      description: "Avena Terminal MCP Server — Live scored data for Spanish coastal new-builds PLUS the observation ledger no portal keeps: per-property asking-price history, observed repricings, delistings with final prices, and the AVENA Index. Search, filter, analyze, estimate ROI, and ask about price CHANGE, not just state.",
      tools: ['search_properties', 'get_property', 'get_market_stats', 'get_top_deals', 'estimate_roi', 'compare_alternatives', 'market_timing', 'get_price_history', 'get_recent_price_moves', 'get_delistings', 'get_avena_index'],
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

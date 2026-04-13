import { NextRequest } from 'next/server';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';
import { detectAnomalies } from '@/lib/anomaly';

export const dynamic = 'force-dynamic';

// Server-Sent Events (SSE) stream — Vercel-compatible alternative to WebSocket
export async function GET(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get('channel') || 'market';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const all = getAllProperties();
      const costas = getUniqueCostas();

      // Send initial data based on channel
      let data: unknown;

      switch (channel) {
        case 'properties': {
          const top10 = [...all].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, 10);
          data = {
            type: 'properties.snapshot',
            timestamp: new Date().toISOString(),
            count: all.length,
            top_scored: top10.map(p => ({
              ref: p.ref, name: p.p || `${p.t} in ${p.l}`,
              price: p.pf, score: p._sc, yield: p._yield?.gross,
            })),
          };
          break;
        }
        case 'signals': {
          const signals = detectAnomalies().slice(0, 5);
          data = {
            type: 'signals.snapshot',
            timestamp: new Date().toISOString(),
            count: signals.length,
            signals: signals.map(s => ({
              id: s.id, type: s.type, severity: s.severity,
              headline: s.headline, score: s.property.score,
            })),
          };
          break;
        }
        case 'regime': {
          const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));
          const avgYield = avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);
          data = {
            type: 'regime.snapshot',
            timestamp: new Date().toISOString(),
            regions: costas.map(c => ({ costa: c.costa, count: c.count, score: c.avgScore, yield: c.avgYield })),
            market_health: { avg_score: avgScore, avg_yield: avgYield, total: all.length },
          };
          break;
        }
        default: {
          const avgPrice = Math.round(avg(all.map(p => p.pf)));
          data = {
            type: 'market.snapshot',
            timestamp: new Date().toISOString(),
            total: all.length,
            avg_price: avgPrice,
            regions: costas.map(c => ({ costa: c.costa, count: c.count, score: c.avgScore, yield: c.avgYield })),
          };
        }
      }

      // Send SSE event
      const sseData = `data: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(sseData));

      // Send heartbeat info
      const info = `data: ${JSON.stringify({ type: 'info', message: 'Avena Terminal SSE Stream. For real-time push, subscribe to webhooks at avenaterminal.com/webhooks', channels: ['market', 'properties', 'signals', 'regime'] })}\n\n`;
      controller.enqueue(encoder.encode(info));

      // Close after sending snapshot (SSE on Vercel is request-scoped)
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

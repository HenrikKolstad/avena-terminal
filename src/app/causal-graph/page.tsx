/**
 * /causal-graph — visual map of how Avena nodes depend on each other.
 * Architectural Commitment 2 (lite).
 *
 * Renders a static-but-living dependency diagram (SVG). When an upstream
 * node mutates (a Euribor move, a regulation passes), the event store
 * already propagates state to every downstream node automatically. This
 * page documents what depends on what.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { NODES, EDGES, type CausalNode } from '@/lib/causal-graph';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Causal graph · what depends on what in Avena',
  description: 'Typed causal dependency map. Every macro indicator, every regulation, every methodology node, every product surface — with coefficients and lag estimates.',
  alternates: { canonical: 'https://avenaterminal.com/causal-graph' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Avena Causal Dependency Graph',
  description: 'Typed dependency map showing how macro, regulation, methodology, and product nodes depend on each other inside Avena Terminal.',
  url: 'https://avenaterminal.com/causal-graph',
};

const TYPE_COLOR: Record<string, string> = {
  macro:        '#d4af37',  // gold
  regulation:   '#c84a4a',  // red
  methodology:  '#4a7fc8',  // blue
  region:       '#4ac88a',  // green
  product:      '#9b6bd4',  // purple
  property:     '#888888',
  developer:    '#888888',
};

// Layout: 5 vertical lanes for the main node types.
const LANES: Array<{ type: string; x: number; label: string }> = [
  { type: 'macro',       x:  90, label: 'Macro' },
  { type: 'regulation',  x: 290, label: 'Regulation' },
  { type: 'methodology', x: 530, label: 'Methodology' },
  { type: 'region',      x: 770, label: 'Region' },
  { type: 'product',     x: 990, label: 'Product' },
];

interface Positioned extends CausalNode { x: number; y: number }

function layoutNodes(): Map<string, Positioned> {
  const out = new Map<string, Positioned>();
  for (const lane of LANES) {
    const inLane = NODES.filter(n => n.type === lane.type);
    const totalH = inLane.length * 70;
    const startY = 80 + (500 - totalH) / 2;
    inLane.forEach((n, i) => {
      out.set(n.id, { ...n, x: lane.x, y: startY + i * 70 });
    });
  }
  return out;
}

export default function CausalGraphPage() {
  const positioned = layoutNodes();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen">
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pt-16 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Architectural Commitment 02 · Causal Dependency Graph
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05]">
            What depends on what, with coefficients.
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground leading-relaxed">
            Most data vendors hide the wiring. We publish it. Every node — macro indicator, regulation, methodology, region, product — declares its upstream dependencies with a signed coefficient and a typical propagation lag. When Euribor moves 25bp, you can read this graph and trace which products will reprice within seven days versus which take six months.
          </p>
        </section>

        {/* SVG graph */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-10">
          <div className="rounded-sm border p-5 overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <svg viewBox="0 0 1100 720" className="w-full h-auto" style={{ minWidth: 800 }}>
              {/* lane headers */}
              {LANES.map(l => (
                <text key={l.type} x={l.x + 70} y={50} textAnchor="middle" className="font-mono" fontSize="11" fill="hsl(220 10% 65%)" style={{ textTransform: 'uppercase', letterSpacing: '0.22em' }}>
                  {l.label}
                </text>
              ))}

              {/* edges */}
              {EDGES.map((e, i) => {
                const a = positioned.get(e.from);
                const b = positioned.get(e.to);
                if (!a || !b) return null;
                const x1 = a.x + 140;
                const y1 = a.y + 20;
                const x2 = b.x;
                const y2 = b.y + 20;
                const stroke = e.coefficient > 0 ? 'hsl(140 50% 50% / 0.5)' : 'hsl(0 60% 55% / 0.5)';
                const width = Math.max(0.5, Math.abs(e.coefficient) * 3);
                return (
                  <g key={i}>
                    <title>{`${e.from} → ${e.to}\ncoef ${e.coefficient}, lag ${e.lag_days}d\n${e.mechanism}`}</title>
                    <path d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                          stroke={stroke} strokeWidth={width} fill="none" />
                  </g>
                );
              })}

              {/* nodes */}
              {Array.from(positioned.values()).map(n => (
                <g key={n.id}>
                  <title>{`${n.label}\n${n.description}`}</title>
                  <rect x={n.x} y={n.y} width={140} height={40} rx={2}
                        fill="hsl(220 12% 12%)" stroke={TYPE_COLOR[n.type] ?? '#888'} strokeWidth={1} />
                  <text x={n.x + 70} y={n.y + 24} textAnchor="middle" fontSize="11"
                        fill="hsl(45 30% 92%)" className="font-mono">
                    {n.label.length > 18 ? n.label.slice(0, 16) + '…' : n.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </section>

        {/* Edge table */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">
            Declared edges · {EDGES.length}
          </div>
          <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                  <th className="text-left p-3">From</th>
                  <th className="text-left p-3">To</th>
                  <th className="text-right p-3">Coef</th>
                  <th className="text-right p-3">Lag (d)</th>
                  <th className="text-left p-3">Mechanism</th>
                </tr>
              </thead>
              <tbody>
                {EDGES.map((e, i) => (
                  <tr key={i} className="border-b last:border-b-0" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                    <td className="p-3 font-mono text-[10px] text-foreground/85 whitespace-nowrap">{e.from}</td>
                    <td className="p-3 font-mono text-[10px] text-foreground/85 whitespace-nowrap">{e.to}</td>
                    <td className="p-3 font-mono text-[10px] tabular text-right" style={{ color: e.coefficient < 0 ? 'hsl(var(--av-destructive))' : e.coefficient > 0 ? 'hsl(var(--av-success))' : 'hsl(var(--av-muted-foreground))' }}>
                      {e.coefficient > 0 ? '+' : ''}{e.coefficient.toFixed(2)}
                    </td>
                    <td className="p-3 font-mono text-[10px] text-foreground/85 tabular text-right">{e.lag_days}</td>
                    <td className="p-3 text-xs text-muted-foreground">{e.mechanism}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">How propagation works</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              The graph is declared in <span className="font-mono text-foreground">src/lib/causal-graph.ts</span> — typed, version-controlled, audit-traceable. The event store (<Link href="/timetravel" className="text-primary hover:underline">Commitment 1</Link>) records every upstream mutation, and downstream projections recompute when their upstreams change. Coefficients are conservative midpoints across the calibration windows in the cited literature; the methodology audit trail at <Link href="/methodology/evolution" className="text-primary hover:underline">/methodology/evolution</Link> versions every revision.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Link href="/regulatory-radar" className="text-foreground/85 hover:text-primary">Regulatory radar →</Link>
              <Link href="/intelligence" className="text-foreground/85 hover:text-primary">Live causal indicators →</Link>
              <Link href="/policy-engine" className="text-foreground/85 hover:text-primary">Stress test the graph →</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

interface Edge {
  from_entity_id: string;
  from_entity_type: string;
  to_entity_id: string;
  to_entity_type: string;
  relationship_type: string;
  strength: number | null;
  stress_contagion_risk: string | null;
}

interface Node {
  id: string;
  type: string;
  label: string;
  isCenter: boolean;
  score?: number;
}

interface Position {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const NODE_COLORS: Record<string, string> = {
  developer: 'hsl(42 85% 64%)',     // gold (primary)
  bank: 'hsl(200 70% 60%)',         // blue
  contractor: 'hsl(150 60% 55%)',   // green
  investor: 'hsl(280 60% 60%)',     // purple
  supplier: 'hsl(20 70% 60%)',      // orange
};

const RISK_COLORS: Record<string, string> = {
  high: 'hsl(0 85% 60%)',
  medium: 'hsl(40 95% 60%)',
  low: 'hsl(var(--av-muted-foreground))',
};

/**
 * Lightweight force-directed network graph. No d3 dependency — implements
 * a simple verlet-style spring layout in ~150 lines that renders to SVG.
 * Visually communicates developer-bank-contractor relationships and
 * stress contagion risk on edge colors.
 */
export function NetworkGraph({ centerId, edges, developers }: {
  centerId: string;
  edges: Edge[];
  developers: Array<{ developer_id: string; name: string; counterpart_score: number; score_grade: string }>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const HEIGHT = 480;

  // Track container width responsively
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(Math.max(320, Math.floor(entry.contentRect.width)));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Build nodes from edges
  const devMap = new Map(developers.map((d) => [d.developer_id, d]));
  const nodesById = new Map<string, Node>();
  for (const e of edges) {
    if (!nodesById.has(e.from_entity_id)) {
      const dev = devMap.get(e.from_entity_id);
      nodesById.set(e.from_entity_id, {
        id: e.from_entity_id,
        type: e.from_entity_type,
        label: dev?.name ?? e.from_entity_id,
        isCenter: e.from_entity_id === centerId,
        score: dev?.counterpart_score,
      });
    }
    if (!nodesById.has(e.to_entity_id)) {
      const dev = devMap.get(e.to_entity_id);
      nodesById.set(e.to_entity_id, {
        id: e.to_entity_id,
        type: e.to_entity_type,
        label: dev?.name ?? e.to_entity_id,
        isCenter: e.to_entity_id === centerId,
        score: dev?.counterpart_score,
      });
    }
  }
  if (!nodesById.has(centerId)) {
    const dev = devMap.get(centerId);
    nodesById.set(centerId, {
      id: centerId,
      type: 'developer',
      label: dev?.name ?? centerId,
      isCenter: true,
      score: dev?.counterpart_score,
    });
  }
  const nodes = [...nodesById.values()];

  // Spring layout — runs in useEffect, paints to refs
  const [positions, setPositions] = useState<Record<string, Position>>({});

  useEffect(() => {
    // Initial random placement
    const positionsInit: Record<string, Position> = {};
    nodes.forEach((n, i) => {
      const angle = (i / Math.max(1, nodes.length)) * 2 * Math.PI;
      positionsInit[n.id] = {
        x: n.isCenter ? width / 2 : width / 2 + Math.cos(angle) * 150,
        y: n.isCenter ? HEIGHT / 2 : HEIGHT / 2 + Math.sin(angle) * 130,
        vx: 0, vy: 0,
      };
    });

    // Run 200 iterations
    const REPULSION = 1500;
    const SPRING_LENGTH = 130;
    const SPRING_K = 0.04;
    const DAMPING = 0.85;
    const CENTER_PULL = 0.002;

    const pos = { ...positionsInit };
    for (let iter = 0; iter < 200; iter++) {
      for (const n of nodes) {
        if (n.isCenter) continue;
        let fx = 0, fy = 0;
        // Repulsion from every other node
        for (const m of nodes) {
          if (m.id === n.id) continue;
          const dx = pos[n.id].x - pos[m.id].x;
          const dy = pos[n.id].y - pos[m.id].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = REPULSION / (dist * dist);
          fx += (dx / dist) * f;
          fy += (dy / dist) * f;
        }
        // Spring pull from connected edges
        for (const e of edges) {
          let other: string | null = null;
          if (e.from_entity_id === n.id) other = e.to_entity_id;
          if (e.to_entity_id === n.id) other = e.from_entity_id;
          if (!other || !pos[other]) continue;
          const dx = pos[other].x - pos[n.id].x;
          const dy = pos[other].y - pos[n.id].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const displacement = dist - SPRING_LENGTH;
          fx += (dx / dist) * displacement * SPRING_K;
          fy += (dy / dist) * displacement * SPRING_K;
        }
        // Pull to center
        fx += (width / 2 - pos[n.id].x) * CENTER_PULL;
        fy += (HEIGHT / 2 - pos[n.id].y) * CENTER_PULL;

        pos[n.id].vx = (pos[n.id].vx + fx) * DAMPING;
        pos[n.id].vy = (pos[n.id].vy + fy) * DAMPING;
        pos[n.id].x += pos[n.id].vx;
        pos[n.id].y += pos[n.id].vy;
        // Clamp
        pos[n.id].x = Math.max(40, Math.min(width - 40, pos[n.id].x));
        pos[n.id].y = Math.max(40, Math.min(HEIGHT - 40, pos[n.id].y));
      }
    }
    setPositions({ ...pos });
  // We intentionally rerun layout only on width change (responsive) or edges/nodes change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, edges.length, nodes.length]);

  if (edges.length === 0) {
    return (
      <div className="rounded-sm border p-6 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground"
        style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.4)' }}>
        No network edges captured yet for this developer. Counterpart scan populates banks, contractors, and connections automatically.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="rounded-sm border overflow-hidden"
      style={{ background: '#0a0e13', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <div className="px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-[0.22em]"
        style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.4)' }}>
        <span className="text-primary">Network graph · stress contagion view</span>
        <div className="flex gap-3 text-[9px] text-muted-foreground">
          <Legend color={NODE_COLORS.developer} label="Developer" />
          <Legend color={NODE_COLORS.bank} label="Bank" />
          <Legend color={NODE_COLORS.contractor} label="Contractor" />
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${HEIGHT}`} className="w-full h-auto" style={{ maxHeight: HEIGHT }}>
        {/* Edges first so they render behind nodes */}
        {edges.map((e, i) => {
          const a = positions[e.from_entity_id];
          const b = positions[e.to_entity_id];
          if (!a || !b) return null;
          const color = RISK_COLORS[e.stress_contagion_risk ?? 'low'] ?? RISK_COLORS.low;
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={color}
                strokeWidth={(e.strength ?? 0.5) * 2.5}
                opacity={0.55}
              />
            </g>
          );
        })}
        {/* Nodes */}
        {nodes.map((n) => {
          const p = positions[n.id];
          if (!p) return null;
          const baseColor = NODE_COLORS[n.type] ?? NODE_COLORS.developer;
          const radius = n.isCenter ? 28 : 18;
          return (
            <g key={n.id} transform={`translate(${p.x}, ${p.y})`}>
              <circle r={radius + 6} fill={baseColor} opacity={0.15} />
              <circle r={radius} fill={baseColor} stroke={n.isCenter ? 'hsl(42 95% 75%)' : 'hsl(var(--av-background))'} strokeWidth={n.isCenter ? 2.5 : 1.5} />
              {n.score != null && (
                <text textAnchor="middle" dy="0.35em"
                  className="font-mono"
                  fontSize={n.isCenter ? 12 : 10}
                  fontWeight={600}
                  fill="hsl(var(--av-background))"
                >
                  {n.score}
                </text>
              )}
              <text textAnchor="middle" y={radius + 14}
                fontSize={n.isCenter ? 11 : 10}
                fill="hsl(var(--av-foreground))"
                style={{ fontFamily: 'ui-monospace, monospace' }}
              >
                {n.label.length > 22 ? n.label.slice(0, 22) + '…' : n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

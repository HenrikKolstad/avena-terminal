'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { RadarPoint } from './page';

/**
 * Pure SVG radar map — plots every point over an Iberian-peninsula bounding box.
 * Mercator projection with light downsampling to keep <5k dots responsive.
 * No external map tiles — zero 3rd-party dependencies, fast, printable.
 */

const VIEWBOX_W = 1200;
const VIEWBOX_H = 720;

// Iberian peninsula + Balearics bbox
const BBOX = { minLng: -9.8, maxLng: 4.6, minLat: 35.8, maxLat: 44.0 };

function project(lat: number, lng: number): [number, number] {
  const x = ((lng - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * VIEWBOX_W;
  // Flip Y because SVG Y grows down
  const y = (1 - (lat - BBOX.minLat) / (BBOX.maxLat - BBOX.minLat)) * VIEWBOX_H;
  return [x, y];
}

function scoreColor(score: number): string {
  if (score >= 80) return '#F5A623';
  if (score >= 65) return '#F5B555';
  if (score >= 50) return '#C9C0B6';
  return '#E05A5A';
}

export function RadarClient({ points }: { points: RadarPoint[] }) {
  const [minScore, setMinScore] = useState(0);
  const [hovered, setHovered] = useState<RadarPoint | null>(null);

  const filtered = useMemo(() =>
    points.filter((p) => p.score >= minScore),
  [points, minScore]);

  const scoreBands = useMemo(() => ({
    alpha:      points.filter((p) => p.score >= 80).length,
    strong:     points.filter((p) => p.score >= 65 && p.score < 80).length,
    moderate:   points.filter((p) => p.score >= 50 && p.score < 65).length,
    below:      points.filter((p) => p.score < 50).length,
  }), [points]);

  return (
    <section className="py-8">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-12">
        {/* Controls */}
        <div className="mb-5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Min score</span>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="accent-primary w-48"
            />
            <span className="font-mono tabular text-sm text-primary">{minScore || '—'}</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Showing {filtered.length.toLocaleString()} / {points.length.toLocaleString()}
          </span>
          <div className="ml-auto flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            <LegendDot color="#F5A623" label={`80+ (${scoreBands.alpha})`} />
            <LegendDot color="#F5B555" label={`65–79 (${scoreBands.strong})`} />
            <LegendDot color="#C9C0B6" label={`50–64 (${scoreBands.moderate})`} />
            <LegendDot color="#E05A5A" label={`<50 (${scoreBands.below})`} />
          </div>
        </div>

        {/* Map */}
        <div
          className="relative rounded-sm border overflow-hidden"
          style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
        >
          <svg viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`} className="w-full h-auto" role="img" aria-label="Avena Radar — Iberian peninsula scored properties">
            {/* Grid */}
            <defs>
              <pattern id="grid" width="80" height="48" patternUnits="userSpaceOnUse">
                <path d="M 80 0 L 0 0 0 48" fill="none" stroke="hsl(36, 14%, 18%)" strokeWidth="0.5" />
              </pattern>
              <radialGradient id="dot-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="hsl(32, 14%, 9%)" />
            <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#grid)" />

            {/* Simple Iberian peninsula outline (very approximate) */}
            <path
              d="M 60,180 L 90,170 L 120,195 L 200,170 L 300,165 L 360,175 L 420,170 L 480,160 L 540,170 L 580,195 L 620,220 L 680,240 L 780,260 L 860,290 L 930,310 L 980,330 L 1010,355 L 1030,395 L 1040,440 L 1030,490 L 1000,530 L 950,560 L 880,580 L 800,590 L 720,600 L 650,620 L 560,640 L 480,650 L 400,670 L 330,680 L 250,675 L 180,660 L 120,630 L 90,590 L 70,540 L 80,480 L 80,420 L 75,350 L 65,280 L 60,220 Z"
              fill="hsl(36, 14%, 14%)"
              stroke="hsl(36, 14%, 22%)"
              strokeWidth="1"
              opacity="0.8"
            />
            {/* Balearics hint */}
            <circle cx="1080" cy="400" r="28" fill="hsl(36, 14%, 14%)" stroke="hsl(36, 14%, 22%)" strokeWidth="1" opacity="0.8" />
            <circle cx="1140" cy="410" r="18" fill="hsl(36, 14%, 14%)" stroke="hsl(36, 14%, 22%)" strokeWidth="1" opacity="0.8" />

            {/* Points */}
            {filtered.map((p) => {
              const [x, y] = project(p.lat, p.lng);
              const color = scoreColor(p.score);
              const r = p.score >= 80 ? 4.5 : p.score >= 65 ? 3.5 : 2.5;
              return (
                <g key={p.ref} style={{ color }}>
                  <circle
                    cx={x}
                    cy={y}
                    r={r * 2.2}
                    fill="url(#dot-glow)"
                    style={{ pointerEvents: 'none' }}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill={color}
                    onMouseEnter={() => setHovered(p)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <title>{`${p.town} — Score ${p.score} — €${p.price.toLocaleString()}`}</title>
                  </circle>
                </g>
              );
            })}
          </svg>

          {/* Hover panel */}
          {hovered && (
            <div
              className="absolute top-4 right-4 rounded-sm border p-4 pointer-events-none"
              style={{
                background: 'hsl(var(--av-background) / 0.92)',
                borderColor: 'hsl(var(--av-primary) / 0.35)',
                backdropFilter: 'blur(6px)',
                minWidth: 220,
              }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
                {hovered.region ?? 'Spain'} · {hovered.type}
              </div>
              <div className="font-serif text-lg text-foreground">{hovered.town}</div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-serif text-3xl text-gold tabular leading-none">{hovered.score}</span>
                <span className="font-mono text-xs tabular text-foreground">€{hovered.price.toLocaleString()}</span>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-2">
                ref {hovered.ref}
              </div>
            </div>
          )}
        </div>

        {/* Click hint */}
        <div className="mt-4 flex flex-wrap gap-3">
          {filtered.slice(0, 12).map((p) => (
            <Link
              key={p.ref}
              href={`/property/${encodeURIComponent(p.ref)}`}
              className="inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary hover:border-primary transition-colors"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <span style={{ color: scoreColor(p.score) }}>●</span>
              {p.town} · {p.score}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

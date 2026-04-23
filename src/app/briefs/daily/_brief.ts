/**
 * Daily brief renderer — deterministic from live data + today's date.
 * Same input → same output all day, but rotates the narrative by DOW.
 */

import type { Property } from '@/lib/types';

export function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Town {
  town: string;
  count: number;
  avgScore: number;
  avgYield: number;
}

interface BriefMetric {
  label: string;
  value: string;
  sub?: string;
}

interface BriefFeatured {
  title: string;
  url: string;
  meta: string;
  score: number;
  narrative: string;
}

interface Brief {
  headline: string;
  lede: string;
  metrics: BriefMetric[];
  featured: BriefFeatured | null;
  topTowns: Array<{ name: string; slug: string; count: number; avgScore: number }>;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function dayOfYear(iso: string): number {
  const d = new Date(iso);
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function renderBrief(all: Property[], towns: Town[], today: string): Brief {
  const scored = all.filter((p) => p._sc != null);
  const n = scored.length;

  // Deterministically pick the "featured" deal — rotate daily by DOY modulo top 15.
  const top15 = [...scored]
    .filter((p) => p.ref && p.imgs && p.imgs.length > 0 && p.mm2 && p.pm2 && p.mm2 > p.pm2)
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
    .slice(0, 15);
  const doy = dayOfYear(today);
  const featuredProp = top15[doy % Math.max(1, top15.length)] ?? null;

  const pm2Values = scored.filter((p) => p.pm2).map((p) => p.pm2 as number);
  const yieldValues = scored.filter((p) => p._yield?.gross).map((p) => p._yield!.gross);
  const scoreValues = scored.map((p) => p._sc ?? 0);

  const avgPm2 = pm2Values.length ? Math.round(pm2Values.reduce((s, x) => s + x, 0) / pm2Values.length) : 0;
  const avgYield = yieldValues.length ? (yieldValues.reduce((s, x) => s + x, 0) / yieldValues.length).toFixed(2) : '—';
  const avgScore = scoreValues.length ? Math.round(scoreValues.reduce((s, x) => s + x, 0) / scoreValues.length) : 0;
  const alphaCount = scored.filter((p) => (p._sc ?? 0) >= 80).length;

  const topTowns = [...towns]
    .filter((t) => t.count >= 3)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 5)
    .map((t) => ({ name: t.town, slug: slugify(t.town), count: t.count, avgScore: Math.round(t.avgScore) }));

  // Rotating headlines — never stale, never samey.
  const headlines = [
    `Market check: ${alphaCount} alpha deals live across ${n} scored properties.`,
    `${avgScore}/100 average Avena Score today — ${alphaCount} above the 80 threshold.`,
    `€${avgPm2.toLocaleString()}/m² the working median, ${avgYield}% gross yield average.`,
    `${topTowns[0]?.name ?? 'Costa Blanca'} tops the board: score ${topTowns[0]?.avgScore ?? 0}.`,
    `Alpha count holds at ${alphaCount}, with ${topTowns.length} towns printing premium scores.`,
    `Off-market inventory keeps churning — ${n} properties live, ${alphaCount} in the top decile.`,
    `Gold in the wires: ${alphaCount} deals currently clear the Avena threshold.`,
  ];
  const headline = headlines[doy % headlines.length];

  const lede = featuredProp
    ? `${featuredProp.p || `${featuredProp.t} in ${featuredProp.l}`} leads today&apos;s board with ${Math.round(featuredProp._sc ?? 0)}/100, priced at €${featuredProp.pf.toLocaleString()}. Below, the metrics behind the score and the 5 strongest towns on the terminal right now.`
    : `${alphaCount} properties are currently trading in the 80+ Avena Score band — the top decile of European new-build inventory we track. Markets, yields, and the best-scored town below.`;

  const metrics: BriefMetric[] = [
    { label: 'Scored props', value: n.toLocaleString(), sub: 'live today' },
    { label: 'Alpha (≥80)', value: alphaCount.toLocaleString(), sub: 'top decile' },
    { label: 'Avg €/m²', value: `€${avgPm2.toLocaleString()}`, sub: 'working median' },
    { label: 'Avg yield', value: `${avgYield}%`, sub: 'gross' },
  ];

  let featured: BriefFeatured | null = null;
  if (featuredProp) {
    const pm2 = featuredProp.bm > 0 ? Math.round(featuredProp.pf / featuredProp.bm) : null;
    const mm2 = featuredProp.mm2 ? Math.round(featuredProp.mm2) : null;
    const disc = mm2 && pm2 && mm2 > pm2 ? Math.round((1 - pm2 / mm2) * 100) : 0;
    const yieldGross = featuredProp._yield?.gross ?? 0;
    featured = {
      title: featuredProp.p || `${featuredProp.t} in ${featuredProp.l}`,
      url: `/property/${encodeURIComponent(featuredProp.ref ?? '')}`,
      meta: `${featuredProp.l}${featuredProp.costa ? ` · ${featuredProp.costa}` : ''} · ${featuredProp.t} · ${featuredProp.bd}bed · ${featuredProp.bm}m² · €${featuredProp.pf.toLocaleString()}`,
      score: Math.round(featuredProp._sc ?? 0),
      narrative: [
        pm2 && mm2 ? `Prices at €${pm2.toLocaleString()}/m² vs ${featuredProp.l} median of €${mm2.toLocaleString()}/m² — a ${Math.min(disc, 35)}% gap.` : '',
        yieldGross ? `Gross yield comes in at ${yieldGross.toFixed(1)}%.` : '',
        `Developer-direct sourcing + below-comp pricing is the standard stack driving scores above 75.`,
      ].filter(Boolean).join(' '),
    };
  }

  return { headline, lede, metrics, featured, topTowns };
}

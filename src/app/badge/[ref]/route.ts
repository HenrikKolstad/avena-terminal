import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties } from '@/lib/properties';

export const revalidate = 3600;

/**
 * Avena Score SVG badge — shields.io-style embeddable badge.
 *
 * Usage in a README:
 *   ![Avena Score](https://avenaterminal.com/badge/N9171.svg)
 *
 * Or with a click-through:
 *   [![Avena Score](https://avenaterminal.com/badge/N9171.svg)](https://avenaterminal.com/property/N9171)
 *
 * Deliberately small and quick to render. Caches an hour.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  'Content-Type': 'image/svg+xml; charset=utf-8',
};

function scoreColor(score: number): string {
  if (score >= 80) return '#F5A623';
  if (score >= 65) return '#E07A1F';
  if (score >= 50) return '#C9C0B6';
  return '#E05A5A';
}

function renderSvg(label: string, value: string, valueColor: string): string {
  // Estimate widths (sans-serif, 11px, slightly padded)
  const labelWidth = Math.max(70, label.length * 7 + 14);
  const valueWidth = Math.max(60, value.length * 8 + 14);
  const total = labelWidth + valueWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${label}: ${value}">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a"><rect width="${total}" height="20" rx="2" fill="#fff"/></mask>
  <g mask="url(#a)">
    <rect width="${labelWidth}" height="20" fill="#1D1815"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${valueColor}"/>
    <rect width="${total}" height="20" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14" fill="#F4EFE8">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14" fill="#1D1815" font-weight="600">${value}</text>
  </g>
</svg>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  let { ref } = await params;
  // Strip .svg if present
  ref = ref.replace(/\.svg$/, '');

  const p = getAllProperties().find((x) => x.ref === ref);
  if (!p || p._sc == null) {
    const svg = renderSvg('avena', 'not found', '#E05A5A');
    return new NextResponse(svg, { status: 404, headers: corsHeaders });
  }

  const score = Math.round(p._sc);
  const svg = renderSvg('avena score', `${score}/100`, scoreColor(score));
  return new NextResponse(svg, { headers: corsHeaders });
}

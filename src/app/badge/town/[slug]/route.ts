import { NextRequest, NextResponse } from 'next/server';
import { getUniqueTowns } from '@/lib/properties';

export const revalidate = 3600;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  'Content-Type': 'image/svg+xml; charset=utf-8',
};

function color(score: number): string {
  if (score >= 75) return '#F5A623';
  if (score >= 60) return '#E07A1F';
  return '#C9C0B6';
}

function render(label: string, value: string, valueColor: string): string {
  const labelWidth = Math.max(60, label.length * 7 + 14);
  const valueWidth = Math.max(70, value.length * 8 + 14);
  const total = labelWidth + valueWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img">
  <mask id="a"><rect width="${total}" height="20" rx="2" fill="#fff"/></mask>
  <g mask="url(#a)">
    <rect width="${labelWidth}" height="20" fill="#1D1815"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${valueColor}"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14" fill="#F4EFE8">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14" fill="#1D1815" font-weight="600">${value}</text>
  </g>
</svg>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  let { slug } = await params;
  slug = slug.replace(/\.svg$/, '');

  const towns = getUniqueTowns();
  const match = towns.find((t) => t.town.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase());
  if (!match) {
    return new NextResponse(render('avena town', 'unknown', '#E05A5A'), { status: 404, headers: corsHeaders });
  }

  const score = Math.round(match.avgScore);
  return new NextResponse(render(match.town.toLowerCase(), `${score}/100`, color(score)), { headers: corsHeaders });
}

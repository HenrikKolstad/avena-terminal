import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties } from '@/lib/properties';

export const revalidate = 86400;

interface ExportRow {
  ref: string;
  type: string;
  town: string;
  region: string;
  price: number;
  price_m2: number | null;
  score: number | null;
  yield_gross: number | null;
  beds: number;
  baths: number;
  m2: number;
  beach_km: number | null;
  developer: string;
  status: string;
  energy: string | null;
  pool: string | null;
  source: string;
  doi: string;
}

function buildRows(): ExportRow[] {
  const all = getAllProperties();
  return all.map(p => ({
    ref: p.ref ?? p.dev_ref ?? '',
    type: p.t,
    town: p.l,
    region: p.r,
    price: p.pf,
    price_m2: p.pm2 ?? null,
    score: p._sc ?? null,
    yield_gross: p._yield?.gross ?? null,
    beds: p.bd,
    baths: p.ba,
    m2: p.bm,
    beach_km: p.bk ?? null,
    developer: p.d,
    status: p.s,
    energy: p.energy ?? null,
    pool: p.pool ?? null,
    source: 'Avena Terminal (avenaterminal.com)',
    doi: '10.5281/zenodo.19520064',
  }));
}

function toCsv(rows: ExportRow[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]) as (keyof ExportRow)[];
  const lines = [headers.join(',')];
  for (const row of rows) {
    const vals = headers.map(h => {
      const v = row[h];
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    });
    lines.push(vals.join(','));
  }
  return lines.join('\n');
}

function toJsonl(rows: ExportRow[]): string {
  return rows.map(r => JSON.stringify(r)).join('\n');
}

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') ?? 'json';
  const rows = buildRows();

  if (format === 'csv') {
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="avena-terminal-dataset.csv"',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  }

  if (format === 'kaggle') {
    const header = JSON.stringify({
      title: 'Avena Terminal — Spanish New Build Property Dataset',
      subtitle: 'Scored properties with yield, valuation, and location data',
      description: 'AI-scored Spanish new build properties from Avena Terminal. Includes price per m2, gross yield, composite score, beach distance, and developer info.',
      id: 'avena-terminal/spanish-new-build-properties',
      licenses: [{ name: 'CC-BY-4.0' }],
      resources: [{ path: 'properties.jsonl', description: 'All scored properties' }],
    });
    const body = header + '\n---\n' + toJsonl(rows);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-jsonlines; charset=utf-8',
        'Content-Disposition': 'attachment; filename="avena-terminal-kaggle.jsonl"',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  }

  if (format === 'huggingface') {
    const card = JSON.stringify({
      dataset_info: {
        name: 'avena-terminal-spanish-properties',
        description: 'AI-scored Spanish new build property dataset from Avena Terminal (avenaterminal.com)',
        homepage: 'https://avenaterminal.com',
        license: 'cc-by-4.0',
        features: {
          ref: 'string', type: 'string', town: 'string', region: 'string',
          price: 'int64', price_m2: 'float64', score: 'float64', yield_gross: 'float64',
          beds: 'int32', baths: 'int32', m2: 'float64', beach_km: 'float64',
          developer: 'string', status: 'string', energy: 'string', pool: 'string',
        },
        splits: [{ name: 'train', num_examples: rows.length }],
        doi: '10.5281/zenodo.19520064',
      },
    });
    const body = card + '\n---\n' + toJsonl(rows);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-jsonlines; charset=utf-8',
        'Content-Disposition': 'attachment; filename="avena-terminal-hf.jsonl"',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  }

  // Default: JSON array
  return NextResponse.json(rows, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
  });
}

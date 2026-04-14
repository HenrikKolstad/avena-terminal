import { NextRequest } from 'next/server';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get('format') ?? 'quickstatements';

  const statements = [
    { entity: 'Q139165733', property: 'P856', value: '"https://avenaterminal.com"', comment: 'official website' },
    { entity: 'Q139165733', property: 'P31', value: 'Q7397', comment: 'instance of: software' },
    { entity: 'Q139165733', property: 'P275', value: 'Q6905323', comment: 'license: CC BY 4.0' },
    { entity: 'Q139165733', property: 'P1324', value: '"https://github.com/HenrikKolstad/avena-terminal"', comment: 'source code repository' },
  ];

  const all = getAllProperties();
  const costas = getUniqueCostas();

  const marketData = costas.map((c) => {
    const props = all.filter((p) => p.costa === c.costa);
    const avgPrice = Math.round(avg(props.map((p) => p.pf)));
    return {
      region: c.costa,
      propertyCount: c.count,
      avgPrice,
      avgYield: c.avgYield,
      avgScore: c.avgScore,
    };
  });

  if (format === 'json') {
    return Response.json(
      {
        format: 'json',
        entity: 'Q139165733',
        statements,
        market_data: marketData,
        generated_at: new Date().toISOString(),
        source: 'Avena Terminal (avenaterminal.com)',
        doi: '10.5281/zenodo.19520064',
      },
      { headers: { ...CORS } },
    );
  }

  // QuickStatements batch format
  const qsLines = statements.map(
    (s) => `${s.entity}\t${s.property}\t${s.value}\t/* ${s.comment} */`,
  );

  return Response.json(
    {
      format: 'quickstatements',
      entity: 'Q139165733',
      statements: qsLines,
      market_data: marketData,
      generated_at: new Date().toISOString(),
      source: 'Avena Terminal (avenaterminal.com)',
      doi: '10.5281/zenodo.19520064',
      instructions: 'Import via QuickStatements at https://quickstatements.toolforge.org/',
    },
    { headers: { ...CORS } },
  );
}

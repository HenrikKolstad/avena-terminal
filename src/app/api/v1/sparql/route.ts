import { NextRequest } from 'next/server';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 3600;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

interface SparqlBinding {
  [key: string]: { type: string; value: string };
}

function literal(value: string | number, datatype?: string): { type: string; value: string; datatype?: string } {
  const result: { type: string; value: string; datatype?: string } = {
    type: 'literal',
    value: String(value),
  };
  if (datatype) result.datatype = datatype;
  return result;
}

function uri(value: string) {
  return { type: 'uri', value };
}

export function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query')?.trim() ?? '';

  let head: { vars: string[] };
  let bindings: SparqlBinding[];

  if (!query) {
    // Default: full dataset summary
    return datasetSummary();
  }

  const lowerQuery = query.toLowerCase();

  // Pattern: SELECT ... WHERE { ?town a avena:Town }
  if (lowerQuery.includes('avena:town')) {
    const towns = getUniqueTowns();
    head = { vars: ['town', 'avgPrice', 'avgYield', 'avgScore', 'count'] };
    bindings = towns.map((t) => ({
      town: uri(`http://avenaterminal.com/ontology/town/${t.slug}`),
      avgPrice: literal(t.avgPrice, 'http://www.w3.org/2001/XMLSchema#decimal'),
      avgYield: literal(t.avgYield, 'http://www.w3.org/2001/XMLSchema#decimal'),
      avgScore: literal(t.avgScore, 'http://www.w3.org/2001/XMLSchema#integer'),
      count: literal(t.count, 'http://www.w3.org/2001/XMLSchema#integer'),
    }));
  }
  // Pattern: SELECT ... WHERE { ?costa a avena:Costa }
  else if (lowerQuery.includes('avena:costa')) {
    const all = getAllProperties();
    const costas = getUniqueCostas();
    head = { vars: ['costa', 'avgPrice', 'avgYield', 'avgScore', 'count'] };
    bindings = costas.map((c) => {
      const props = all.filter((p) => p.costa === c.costa);
      const avgPrice = Math.round(avg(props.map((p) => p.pf)));
      return {
        costa: uri(`http://avenaterminal.com/ontology/costa/${c.slug}`),
        avgPrice: literal(avgPrice, 'http://www.w3.org/2001/XMLSchema#decimal'),
        avgYield: literal(c.avgYield, 'http://www.w3.org/2001/XMLSchema#decimal'),
        avgScore: literal(c.avgScore, 'http://www.w3.org/2001/XMLSchema#integer'),
        count: literal(c.count, 'http://www.w3.org/2001/XMLSchema#integer'),
      };
    });
  }
  // Pattern: SELECT ... FILTER(?score > N)
  else if (lowerQuery.includes('avena:score') && lowerQuery.includes('filter')) {
    const filterMatch = query.match(/FILTER\s*\(\s*\?score\s*>\s*(\d+)\s*\)/i);
    const threshold = filterMatch ? parseInt(filterMatch[1], 10) : 80;

    const all = getAllProperties();
    const filtered = all.filter((p) => (p._sc ?? 0) > threshold);

    head = { vars: ['property', 'score', 'price', 'location', 'type'] };
    bindings = filtered
      .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
      .slice(0, 200)
      .map((p) => ({
        property: literal(p.p),
        score: literal(p._sc ?? 0, 'http://www.w3.org/2001/XMLSchema#integer'),
        price: literal(p.pf, 'http://www.w3.org/2001/XMLSchema#decimal'),
        location: literal(p.l),
        type: literal(p.t),
      }));
  }
  // Unrecognized query: return dataset summary
  else {
    return datasetSummary();
  }

  return Response.json(
    { head, results: { bindings } },
    {
      headers: {
        'Content-Type': 'application/sparql-results+json',
        ...CORS,
      },
    },
  );
}

function datasetSummary() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  const head = { vars: ['metric', 'value'] };
  const bindings: SparqlBinding[] = [
    { metric: literal('totalProperties'), value: literal(all.length) },
    { metric: literal('totalTowns'), value: literal(towns.length) },
    { metric: literal('totalCostas'), value: literal(costas.length) },
    { metric: literal('avgPrice'), value: literal(Math.round(avg(all.map((p) => p.pf)))) },
    { metric: literal('avgScore'), value: literal(Math.round(avg(all.filter((p) => p._sc).map((p) => p._sc!)))) },
    { metric: literal('source'), value: literal('https://avenaterminal.com') },
    { metric: literal('doi'), value: literal('10.5281/zenodo.19520064') },
  ];

  return Response.json(
    { head, results: { bindings } },
    {
      headers: {
        'Content-Type': 'application/sparql-results+json',
        ...CORS,
      },
    },
  );
}

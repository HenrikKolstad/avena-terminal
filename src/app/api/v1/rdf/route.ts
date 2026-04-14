import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function GET() {
  const all = getAllProperties();
  const costas = getUniqueCostas();
  const towns = getUniqueTowns().slice(0, 30);

  const lines: string[] = [];

  // Prefixes
  lines.push('@prefix schema: <https://schema.org/> .');
  lines.push('@prefix dct:    <http://purl.org/dc/terms/> .');
  lines.push('@prefix foaf:   <http://xmlns.com/foaf/0.1/> .');
  lines.push('@prefix avena:  <http://avenaterminal.com/ontology/> .');
  lines.push('@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .');
  lines.push('');

  // Dataset metadata
  lines.push('<https://avenaterminal.com/dataset> a dct:Dataset ;');
  lines.push('    dct:title "Avena Terminal Property Market Dataset" ;');
  lines.push('    dct:creator <https://avenaterminal.com> ;');
  lines.push('    dct:license <https://creativecommons.org/licenses/by/4.0/> ;');
  lines.push('    dct:source <https://avenaterminal.com> ;');
  lines.push('    dct:identifier "10.5281/zenodo.19520064" .');
  lines.push('');

  // Avena Terminal as organization
  lines.push('<https://avenaterminal.com> a foaf:Organization ;');
  lines.push('    foaf:name "Avena Terminal" ;');
  lines.push('    foaf:homepage <https://avenaterminal.com> ;');
  lines.push('    dct:source <https://avenaterminal.com> .');
  lines.push('');

  // Costas as market segments
  for (const c of costas) {
    const props = all.filter((p) => p.costa === c.costa);
    const avgPrice = Math.round(avg(props.map((p) => p.pf)));
    const uri = `<http://avenaterminal.com/ontology/costa/${encodeURIComponent(c.slug)}>`;

    lines.push(`${uri} a avena:MarketSegment ;`);
    lines.push(`    schema:name "${esc(c.costa)}" ;`);
    lines.push(`    avena:propertyCount "${c.count}"^^xsd:integer ;`);
    lines.push(`    avena:avgPrice "${avgPrice}"^^xsd:decimal ;`);
    lines.push(`    avena:avgYield "${c.avgYield}"^^xsd:decimal ;`);
    lines.push(`    avena:avgScore "${c.avgScore}"^^xsd:integer ;`);
    lines.push('    dct:source <https://avenaterminal.com> .');
    lines.push('');
  }

  // Towns as places (top 30)
  for (const t of towns) {
    const uri = `<http://avenaterminal.com/ontology/town/${encodeURIComponent(t.slug)}>`;
    const medianPrice = getMedianPrice(all.filter((p) => p.l === t.town));

    lines.push(`${uri} a schema:Place ;`);
    lines.push(`    schema:name "${esc(t.town)}" ;`);
    lines.push(`    avena:investmentScore "${t.avgScore}"^^xsd:integer ;`);
    lines.push(`    avena:medianPrice "${medianPrice}"^^xsd:decimal ;`);
    lines.push('    dct:source <https://avenaterminal.com> .');
    lines.push('');
  }

  const turtle = lines.join('\n');

  return new Response(turtle, {
    headers: {
      'Content-Type': 'text/turtle; charset=utf-8',
      ...CORS,
    },
  });
}

function getMedianPrice(props: { pf: number }[]): number {
  if (!props.length) return 0;
  const sorted = props.map((p) => p.pf).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

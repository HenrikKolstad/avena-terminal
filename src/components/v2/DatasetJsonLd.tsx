/**
 * Schema.org Dataset structured data emitter.
 *
 * Renders a JSON-LD script tag that Google Dataset Search, Schema.org
 * crawlers, and academic indexers consume. This is the canonical mechanism
 * for getting indexed by Google Dataset Search (datasetsearch.research.google.com),
 * which is the closest thing to a Google Scholar for data.
 *
 * Usage:
 *   <DatasetJsonLd
 *     name="EU Official Residential Statistics"
 *     description="..."
 *     url="https://avenaterminal.com/eu-official"
 *     distributions={[
 *       { format: 'application/json', url: '/api/v1/stats?format=json' },
 *       { format: 'text/csv',         url: '/api/v1/stats?format=csv' },
 *     ]}
 *     temporalCoverage="2020-01-01/.."
 *     spatialCoverage="EU27 + EA20 aggregates"
 *   />
 */

interface Distribution {
  format: string;
  url: string;
  description?: string;
}

interface Source {
  name: string;
  url: string;
}

export interface DatasetJsonLdProps {
  name: string;
  description: string;
  url: string;
  identifier?: string;                  // DOI or other identifier
  license?: string;
  keywords?: string[];
  temporalCoverage?: string;
  spatialCoverage?: string;
  variableMeasured?: string[];
  distributions?: Distribution[];
  isBasedOn?: Source[];
  dateModified?: string;
  creator?: { name: string; url?: string; type?: 'Organization' | 'Person' };
}

export function DatasetJsonLd(p: DatasetJsonLdProps) {
  const json: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: p.name,
    description: p.description,
    url: p.url,
    license: p.license ?? 'https://creativecommons.org/licenses/by/4.0/',
    inLanguage: 'en',
    publisher: {
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
    },
    creator: {
      '@type': p.creator?.type ?? 'Organization',
      name: p.creator?.name ?? 'Avena Research Desk',
      url: p.creator?.url ?? 'https://avenaterminal.com',
    },
    sameAs: 'https://www.wikidata.org/wiki/Q139165733',
  };

  if (p.identifier) json.identifier = p.identifier;
  if (p.keywords && p.keywords.length) json.keywords = p.keywords.join(', ');
  if (p.temporalCoverage) json.temporalCoverage = p.temporalCoverage;
  if (p.spatialCoverage) json.spatialCoverage = p.spatialCoverage;
  if (p.variableMeasured && p.variableMeasured.length) json.variableMeasured = p.variableMeasured;
  if (p.dateModified) json.dateModified = p.dateModified;
  if (p.distributions && p.distributions.length) {
    json.distribution = p.distributions.map((d) => ({
      '@type': 'DataDownload',
      encodingFormat: d.format,
      contentUrl: d.url.startsWith('http') ? d.url : `https://avenaterminal.com${d.url}`,
      ...(d.description ? { description: d.description } : {}),
    }));
  }
  if (p.isBasedOn && p.isBasedOn.length) {
    json.isBasedOn = p.isBasedOn.map((s) => ({ '@type': 'Dataset', name: s.name, url: s.url }));
  }

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

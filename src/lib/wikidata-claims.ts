/**
 * Wikidata claims generator — produces a QuickStatements v1 payload + a
 * structured JSON representation of every claim Avena maintains on its
 * Wikidata entity Q139165733.
 *
 * Wikidata is the canonical citation graph of the open knowledge web.
 * Researchers searching for "EU residential property index methodology"
 * frequently land on Wikidata first; rich claims convert that traffic
 * into qualified institutional discovery.
 *
 * QuickStatements (https://quickstatements.toolforge.org/) is the tool
 * Wikidata editors use for bulk imports. Avena exports its claim graph
 * in QuickStatements v1 format; an editor pastes the payload, reviews,
 * and one-click commits.
 *
 * Avena Wikidata entity: Q139165733
 */

import { supabase } from '@/lib/supabase';

const ENTITY = 'Q139165733';

// Property IDs commonly used by Wikidata (P-numbers)
//   P31   = instance of
//   P136  = genre
//   P275  = license
//   P276  = location
//   P407  = language of work
//   P571  = inception
//   P625  = coordinate location (not used here)
//   P744  = subsidiary
//   P767  = contributor (sponsor)
//   P800  = notable work
//   P856  = official website
//   P953  = full work available at URL
//   P973  = described at URL
//   P1059 = CVR (not used)
//   P1324 = source code repository
//   P1424 = topic's main template (not used)
//   P1813 = short name
//   P1855 = Wikidata property example
//   P2078 = user manual URL
//   P2860 = cites work
//   P3744 = number of subscribers
//   P4969 = derived from
//   P5008 = on focus list of WikiProject
//   P5305 = canonical URL
//   P6376 = source data URL
//   P8687 = social media followers

export interface WikidataClaim {
  property: string;
  value: string;
  type: 'item' | 'url' | 'monolingualtext' | 'string' | 'time' | 'quantity';
  qualifiers?: Array<{ property: string; value: string; type: 'item' | 'url' | 'string' | 'time' }>;
  reference_url?: string;
}

export interface ClaimsExport {
  entity: string;
  generated_at: string;
  claims: WikidataClaim[];
  quickstatements_v1: string;
  jsonld: Record<string, unknown>;
}

async function loadBriefings(): Promise<Array<{ volume: number; slug: string; title: string; publication_date: string }>> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('sovereign_briefings')
      .select('volume, slug, title, publication_date')
      .eq('status', 'published')
      .order('volume', { ascending: true });
    return (data ?? []) as Array<{ volume: number; slug: string; title: string; publication_date: string }>;
  } catch { return []; }
}

async function counts(): Promise<{ briefings: number; avn_ids: number; official_stats_rows: number }> {
  if (!supabase) return { briefings: 0, avn_ids: 0, official_stats_rows: 0 };
  try {
    const [{ count: b }, { count: a }, { count: s }] = await Promise.all([
      supabase.from('sovereign_briefings').select('*', { count: 'exact', head: true }),
      supabase.from('avn_id_registry').select('*', { count: 'exact', head: true }),
      supabase.from('eu_official_stats').select('*', { count: 'exact', head: true }),
    ]);
    return { briefings: b ?? 0, avn_ids: a ?? 0, official_stats_rows: s ?? 0 };
  } catch { return { briefings: 0, avn_ids: 0, official_stats_rows: 0 }; }
}

function escapeQuickStatementsValue(s: string): string {
  // QuickStatements monolingual + string values are enclosed in double quotes
  return '"' + s.replace(/"/g, '\\"') + '"';
}

function renderQuickStatement(claim: WikidataClaim): string {
  let value: string;
  switch (claim.type) {
    case 'item':           value = claim.value; break;
    case 'url':            value = escapeQuickStatementsValue(claim.value); break;
    case 'string':         value = escapeQuickStatementsValue(claim.value); break;
    case 'monolingualtext': value = `en:${escapeQuickStatementsValue(claim.value)}`; break;
    case 'time':           value = `+${claim.value}T00:00:00Z/11`; break;
    case 'quantity':       value = claim.value; break;
    default:               value = claim.value;
  }
  let line = `${ENTITY}\t${claim.property}\t${value}`;
  if (claim.qualifiers) {
    for (const q of claim.qualifiers) {
      let qv: string;
      switch (q.type) {
        case 'item':   qv = q.value; break;
        case 'url':    qv = escapeQuickStatementsValue(q.value); break;
        case 'string': qv = escapeQuickStatementsValue(q.value); break;
        case 'time':   qv = `+${q.value}T00:00:00Z/11`; break;
        default:       qv = escapeQuickStatementsValue(q.value);
      }
      line += `\t${q.property}\t${qv}`;
    }
  }
  if (claim.reference_url) {
    line += `\tS854\t${escapeQuickStatementsValue(claim.reference_url)}`; // S854 = stated in URL
  }
  return line;
}

export async function generateClaims(): Promise<ClaimsExport> {
  const briefings = await loadBriefings();
  const c = await counts();

  const claims: WikidataClaim[] = [
    // Core identity
    { property: 'P31',  value: 'Q1172284', type: 'item', reference_url: 'https://avenaterminal.com' },    // instance of: dataset
    { property: 'P31',  value: 'Q7397',    type: 'item', reference_url: 'https://avenaterminal.com' },    // instance of: software
    { property: 'P31',  value: 'Q1571729', type: 'item', reference_url: 'https://avenaterminal.com' },    // instance of: research database
    { property: 'P856', value: 'https://avenaterminal.com', type: 'url' },                                 // official website
    { property: 'P275', value: 'Q20007257', type: 'item', reference_url: 'https://avenaterminal.com/license' }, // license: CC BY 4.0
    { property: 'P407', value: 'Q1860',    type: 'item' },                                                 // language: English
    { property: 'P571', value: '2026-01-01', type: 'time' },                                              // inception
    { property: 'P276', value: 'Q1794',    type: 'item' },                                                 // location: Frankfurt

    // Topic
    { property: 'P136', value: 'Q3026787', type: 'item' },                                                 // genre: real estate
    { property: 'P136', value: 'Q11451',   type: 'item' },                                                 // genre: economics

    // Identifiers + canonical URLs
    { property: 'P953', value: 'https://doi.org/10.5281/zenodo.19520064', type: 'url' },                  // full work available at URL
    { property: 'P5305', value: 'https://avenaterminal.com', type: 'url' },                                // canonical URL
    { property: 'P973', value: 'https://avenaterminal.com/eu-official', type: 'url',
      qualifiers: [{ property: 'P1810', type: 'string', value: 'EU Official Statistics Layer' }] },
    { property: 'P973', value: 'https://avenaterminal.com/archive', type: 'url',
      qualifiers: [{ property: 'P1810', type: 'string', value: 'Moat Archive — hash-chained backups' }] },
    { property: 'P973', value: 'https://avenaterminal.com/api/openapi.json', type: 'url',
      qualifiers: [{ property: 'P1810', type: 'string', value: 'OpenAPI 3.1 specification' }] },
    { property: 'P973', value: 'https://avenaterminal.com/sovereign-briefing', type: 'url',
      qualifiers: [{ property: 'P1810', type: 'string', value: 'Sovereign Briefing — institutional research' }] },
    { property: 'P973', value: 'https://avenaterminal.com/avn-id', type: 'url',
      qualifiers: [{ property: 'P1810', type: 'string', value: 'AVN-ID Registry — signed property identifiers' }] },
    { property: 'P2078', value: 'https://avenaterminal.com/docs/api', type: 'url' },                       // user manual URL

    // Cites work / derived from official sources
    { property: 'P4969', value: 'Q458',  type: 'item' },                                                   // derived from: European Union (Eurostat)
    { property: 'P4969', value: 'Q8901', type: 'item' },                                                   // derived from: European Central Bank
  ];

  // Notable works → each sovereign briefing volume
  for (const b of briefings) {
    claims.push({
      property: 'P800',
      value: `${b.title}`,
      type: 'string',
      qualifiers: [
        { property: 'P577', type: 'time', value: b.publication_date },         // P577 = publication date
        { property: 'P953', type: 'url', value: `https://avenaterminal.com/sovereign-briefing/${b.slug}` },
      ],
    });
  }

  const quickstatements_v1 = claims.map(renderQuickStatement).join('\n');

  const jsonld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@id': `https://www.wikidata.org/wiki/${ENTITY}`,
    '@type': ['Dataset', 'Organization'],
    'identifier': ENTITY,
    'name': 'Avena Terminal',
    'url': 'https://avenaterminal.com',
    'license': 'https://creativecommons.org/licenses/by/4.0/',
    'foundingDate': '2026-01-01',
    'foundingLocation': { '@type': 'Place', 'name': 'Frankfurt' },
    'description': `Institutional EU residential property data infrastructure. ${c.official_stats_rows.toLocaleString()} official statistical observations, ${c.briefings} sovereign briefing volumes, ${c.avn_ids} signed AVN-IDs in the registry.`,
    'subjectOf': briefings.map((b) => ({
      '@type': 'ScholarlyArticle',
      'name': b.title,
      'datePublished': b.publication_date,
      'url': `https://avenaterminal.com/sovereign-briefing/${b.slug}`,
    })),
  };

  return {
    entity: ENTITY,
    generated_at: new Date().toISOString(),
    claims,
    quickstatements_v1,
    jsonld,
  };
}

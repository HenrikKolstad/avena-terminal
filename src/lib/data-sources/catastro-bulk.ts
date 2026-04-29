/**
 * Spain Catastro bulk ingestion — millions of records, records-tier.
 *
 * Strategy: Catastro publishes monthly per-municipality CAT-format dumps
 * via http://www.catastro.minhap.es/webinspire/index.html (INSPIRE-compliant
 * WFS endpoints + bulk download). Each dump is parseable and contains the
 * canonical RC + parcel geometry + basic attributes.
 *
 * For Ship 4 we ship the FRAMEWORK. Bulk ingest itself is gated behind
 * CATASTRO_BULK_ENABLED=true env var because:
 *   - One municipality = ~10k-200k parcels
 *   - Storage: ~500 bytes per parcel = significant Supabase usage
 *   - Catastro asks heavy users to register; we should respect that
 *
 * Once enabled, this loads tier='record' rows into properties_registry
 * for the configured municipality codes. Fully separate from listings.
 */

const UA = 'AvenaTerminalBot/1.0 (+https://avenaterminal.com)';

export interface CatastroParcel {
  cadastral_ref: string;
  postal_code?: string;
  municipality_code?: string;     // INE code
  municipality?: string;
  province?: string;
  surface_m2?: number;
  use?: string;                   // 'residential' | 'commercial' | etc.
  year_built?: number;
  lat?: number;
  lng?: number;
}

/** Configured municipalities for bulk ingest (start small). */
export const PRIORITY_MUNICIPALITIES: Array<{ code: string; name: string; nuts3: string }> = [
  // Costa Blanca South — high-value Avena coverage
  { code: '03139', name: 'Torrevieja',          nuts3: 'ES521' },
  { code: '03065', name: 'Orihuela',            nuts3: 'ES521' },
  { code: '03133', name: 'Pilar de la Horadada', nuts3: 'ES521' },
  // Costa Blanca North
  { code: '03082', name: 'Jávea / Xàbia',        nuts3: 'ES521' },
  { code: '03063', name: 'Moraira (Teulada)',    nuts3: 'ES521' },
  { code: '03012', name: 'Altea',                nuts3: 'ES521' },
  { code: '03031', name: 'Calp',                 nuts3: 'ES521' },
  // Costa del Sol
  { code: '29067', name: 'Marbella',             nuts3: 'ES617' },
  { code: '29051', name: 'Estepona',             nuts3: 'ES617' },
  { code: '29007', name: 'Benalmádena',          nuts3: 'ES617' },
  { code: '29070', name: 'Mijas',                nuts3: 'ES617' },
  // Costa Cálida
  { code: '30043', name: 'Cartagena',            nuts3: 'ES620' },
  { code: '30035', name: 'San Javier',           nuts3: 'ES620' },
];

/**
 * Fetch parcels for a municipality via Catastro's INSPIRE WFS endpoint.
 * Returns parcels in chunks; caller paginates if necessary.
 *
 * Currently SCAFFOLD: returns empty until we wire the real WFS call.
 * The WFS endpoint format is:
 *   http://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx?
 *     service=WFS&version=2.0.0&request=GetFeature
 *     &typeNames=cp:CadastralParcel
 *     &SRSname=urn:ogc:def:crs:EPSG::4326
 *     &filter=...
 *
 * Production wiring needs:
 *   1. WFS BBOX query per municipality boundary
 *   2. GML 3.2.1 parser for the response
 *   3. Geometry → centroid for lat/lng storage
 *   4. Attribute extraction for reference/use/year
 */
export async function fetchMunicipalityParcels(
  municipalityCode: string,
  options: { max?: number } = {}
): Promise<CatastroParcel[]> {
  const enabled = process.env.CATASTRO_BULK_ENABLED === 'true';
  if (!enabled) return [];

  void municipalityCode;
  void options;
  void UA;
  // TODO: real WFS implementation — gated until we're ready to handle volume
  return [];
}

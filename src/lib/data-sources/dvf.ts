/**
 * France DVF — "Demandes de Valeurs Foncières".
 *
 * The French government publishes every property transaction since 2014
 * as open CSV at data.gouv.fr. This is the most comprehensive EU
 * transaction registry, free, public, no auth.
 *
 * Source: https://files.data.gouv.fr/geo-dvf/latest/csv/{year}/communes/{dept}/{insee_code}.csv
 *
 * Each row = one transaction with: date, price, surface, geocode, type,
 * INSEE commune code. ~25M historical transactions across all of France.
 *
 * Strategy: per-commune CSVs (10-100KB each) are small enough for serverless
 * ingest. Walk priority communes and pull last 2 years of data per cycle.
 */

import { createHash } from 'crypto';

const DVF_BASE = 'https://files.data.gouv.fr/geo-dvf/latest/csv';
const UA = 'AvenaTerminalBot/1.0 (+https://avenaterminal.com)';

export interface DvfRow {
  /** Mutation ID — unique per transaction */
  id_mutation: string;
  date_mutation: string;        // ISO date 'YYYY-MM-DD'
  valeur_fonciere: number;      // price in EUR
  type_local?: string;          // 'Maison' | 'Appartement' | 'Local industriel...' | 'Dépendance'
  surface_reelle_bati?: number; // m²
  nombre_pieces_principales?: number;
  surface_terrain?: number;     // plot m²
  nom_commune?: string;
  code_postal?: string;
  code_departement?: string;
  code_commune?: string;
  code_insee?: string;
  longitude?: number;
  latitude?: number;
  type_de_voie?: string;
  voie?: string;
}

/**
 * Priority French communes — high-value Avena coverage zones.
 * INSEE codes; format: {department}/{commune_insee}.csv
 */
export const FRANCE_PRIORITY_COMMUNES: Array<{ insee: string; dept: string; name: string; nuts3: string }> = [
  // Côte d'Azur (06 — Alpes-Maritimes)
  { insee: '06088', dept: '06', name: 'Nice',         nuts3: 'FRL03' },
  { insee: '06029', dept: '06', name: 'Cannes',       nuts3: 'FRL03' },
  { insee: '06004', dept: '06', name: 'Antibes',      nuts3: 'FRL03' },
  { insee: '06069', dept: '06', name: 'Mandelieu',    nuts3: 'FRL03' },
  { insee: '06083', dept: '06', name: 'Mougins',      nuts3: 'FRL03' },
  { insee: '06149', dept: '06', name: 'Vence',        nuts3: 'FRL03' },
  { insee: '06030', dept: '06', name: 'Cap-d\'Ail',   nuts3: 'FRL03' },
  // Var (83) — coastal Riviera
  { insee: '83137', dept: '83', name: 'Saint-Tropez',  nuts3: 'FRL05' },
  { insee: '83061', dept: '83', name: 'Hyères',        nuts3: 'FRL05' },
  { insee: '83069', dept: '83', name: 'Le Lavandou',   nuts3: 'FRL05' },
  // Paris core arrondissements
  { insee: '75108', dept: '75', name: 'Paris 8e',      nuts3: 'FR101' },
  { insee: '75107', dept: '75', name: 'Paris 7e',      nuts3: 'FR101' },
  { insee: '75116', dept: '75', name: 'Paris 16e',     nuts3: 'FR101' },
  { insee: '75106', dept: '75', name: 'Paris 6e',      nuts3: 'FR101' },
];

/**
 * Tiny CSV parser — handles quoted fields with commas.
 * No external dep needed; DVF uses simple comma-separated UTF-8.
 */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function num(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Fetch one commune's transactions for one year.
 * Returns array of DvfRow records. Empty array on fetch / parse failure.
 */
export async function fetchCommuneYear(insee: string, dept: string, year: number): Promise<DvfRow[]> {
  const url = `${DVF_BASE}/${year}/communes/${dept}/${insee}.csv`;
  let text: string;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/csv' },
      next: { revalidate: 86400 * 30 }, // monthly
    });
    if (!res.ok) return [];
    text = await res.text();
  } catch {
    return [];
  }

  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const ix = (k: string) => headers.indexOf(k);
  const idMut = ix('id_mutation');
  const dateMut = ix('date_mutation');
  const valFonc = ix('valeur_fonciere');
  const typeLoc = ix('type_local');
  const surfBati = ix('surface_reelle_bati');
  const nbPieces = ix('nombre_pieces_principales');
  const surfTer = ix('surface_terrain');
  const nomComm = ix('nom_commune');
  const codePost = ix('code_postal');
  const codeDept = ix('code_departement');
  const codeComm = ix('code_commune');
  const codeIns = ix('code_insee_commune');
  const lon = ix('longitude');
  const lat = ix('latitude');
  const tpVoie = ix('type_voie');
  const voie = ix('voie');

  if (idMut < 0 || dateMut < 0 || valFonc < 0) return [];

  const out: DvfRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const v = num(cols[valFonc]);
    if (!v || v < 1000) continue; // filter out trivial / fee-only entries
    out.push({
      id_mutation: cols[idMut] || '',
      date_mutation: cols[dateMut] || '',
      valeur_fonciere: v,
      type_local: cols[typeLoc] || undefined,
      surface_reelle_bati: surfBati >= 0 ? num(cols[surfBati]) : undefined,
      nombre_pieces_principales: nbPieces >= 0 ? num(cols[nbPieces]) : undefined,
      surface_terrain: surfTer >= 0 ? num(cols[surfTer]) : undefined,
      nom_commune: nomComm >= 0 ? cols[nomComm] : undefined,
      code_postal: codePost >= 0 ? cols[codePost] : undefined,
      code_departement: codeDept >= 0 ? cols[codeDept] : undefined,
      code_commune: codeComm >= 0 ? cols[codeComm] : undefined,
      code_insee: codeIns >= 0 ? cols[codeIns] : undefined,
      longitude: lon >= 0 ? num(cols[lon]) : undefined,
      latitude: lat >= 0 ? num(cols[lat]) : undefined,
      type_de_voie: tpVoie >= 0 ? cols[tpVoie] : undefined,
      voie: voie >= 0 ? cols[voie] : undefined,
    });
  }
  return out;
}

/**
 * Mint a deterministic AVN_PROP_ID for a DVF transaction.
 * Format: AVN:FR-{postal_5}-EX-{hash8}
 */
export function mintAvnIdForDvf(row: DvfRow): string {
  const postal = (row.code_postal || '00000').replace(/\D/g, '').padStart(5, '0').slice(0, 5);
  const seed = `dvf::${row.id_mutation}::${row.date_mutation}::${row.valeur_fonciere}::${row.latitude ?? 0}::${row.longitude ?? 0}`;
  const hash = createHash('sha256').update(seed).digest('hex').slice(0, 8).toUpperCase();
  return `AVN:FR-${postal}-EX-${hash}`;
}

/** Map French type_local to Avena property_type taxonomy. */
export function mapPropertyType(typeLoc: string | undefined): string | undefined {
  if (!typeLoc) return undefined;
  const lower = typeLoc.toLowerCase();
  if (lower.includes('maison')) return 'house';
  if (lower.includes('appartement')) return 'apartment';
  if (lower.includes('local')) return 'commercial';
  if (lower.includes('dépendance')) return 'outbuilding';
  return undefined;
}

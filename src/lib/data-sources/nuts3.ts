/**
 * NUTS3 region lookup — maps a property's country + postal code to its
 * EU NUTS3 (statistical) region code. Required for joining property data
 * to Eurostat regional statistics.
 *
 * Coverage in v1:
 *   - Spain: full (52 provinces → ES111…ES709)
 *   - Portugal: full (25 NUTS3 regions)
 *   - Italy: partial (top regions for Tuscany, Lakes, Riviera, Puglia)
 *   - France: partial (top regions for Côte d'Azur, Paris)
 *
 * Logic: postal code prefix → NUTS3 code. Most accurate at the 2-3 digit
 * postal prefix level since postal/NUTS boundaries don't perfectly align.
 */

// ── Spain: postal code first 2 digits → NUTS3 code ─────────────────
const SPAIN_NUTS3: Record<string, string> = {
  '01': 'ES211', // Álava
  '02': 'ES421', // Albacete
  '03': 'ES521', // Alicante
  '04': 'ES611', // Almería
  '05': 'ES411', // Ávila
  '06': 'ES431', // Badajoz
  '07': 'ES531', // Mallorca (Balearics — sub-regions: 532 Menorca, 533 Eivissa+Formentera)
  '08': 'ES511', // Barcelona
  '09': 'ES412', // Burgos
  '10': 'ES432', // Cáceres
  '11': 'ES612', // Cádiz
  '12': 'ES522', // Castellón
  '13': 'ES422', // Ciudad Real
  '14': 'ES613', // Córdoba
  '15': 'ES111', // A Coruña
  '16': 'ES423', // Cuenca
  '17': 'ES512', // Girona
  '18': 'ES614', // Granada
  '19': 'ES424', // Guadalajara
  '20': 'ES212', // Guipúzcoa
  '21': 'ES615', // Huelva
  '22': 'ES241', // Huesca
  '23': 'ES616', // Jaén
  '24': 'ES413', // León
  '25': 'ES513', // Lleida
  '26': 'ES230', // La Rioja
  '27': 'ES112', // Lugo
  '28': 'ES300', // Madrid
  '29': 'ES617', // Málaga
  '30': 'ES620', // Murcia
  '31': 'ES220', // Navarra
  '32': 'ES113', // Ourense
  '33': 'ES120', // Asturias
  '34': 'ES414', // Palencia
  '35': 'ES705', // Las Palmas (Gran Canaria + Lanzarote + Fuerteventura)
  '36': 'ES114', // Pontevedra
  '37': 'ES415', // Salamanca
  '38': 'ES709', // Santa Cruz de Tenerife
  '39': 'ES130', // Cantabria
  '40': 'ES416', // Segovia
  '41': 'ES618', // Sevilla
  '42': 'ES417', // Soria
  '43': 'ES514', // Tarragona
  '44': 'ES242', // Teruel
  '45': 'ES425', // Toledo
  '46': 'ES523', // Valencia
  '47': 'ES418', // Valladolid
  '48': 'ES213', // Vizcaya
  '49': 'ES419', // Zamora
  '50': 'ES243', // Zaragoza
  '51': 'ES630', // Ceuta
  '52': 'ES640', // Melilla
};

// ── Portugal: postal code first 2 digits → NUTS3 ────────────────────
// Portuguese postal codes 4 digits — first 2 give region precision
const PORTUGAL_NUTS3: Record<string, string> = {
  '10': 'PT170', '11': 'PT170', '12': 'PT170', '13': 'PT170', '14': 'PT170', '15': 'PT170', '16': 'PT170', '17': 'PT170', '18': 'PT170', '19': 'PT170', // Lisboa
  '20': 'PT181', // Médio Tejo
  '21': 'PT181', '22': 'PT181',
  '23': 'PT184', '24': 'PT184', '25': 'PT184', '26': 'PT184', // Médio Tejo / Beira Baixa
  '27': 'PT16I', '28': 'PT16I',
  '30': 'PT16J', '31': 'PT16J', '32': 'PT16J', '33': 'PT16J', '34': 'PT16J', '35': 'PT16J', // Coimbra
  '36': 'PT16I', '37': 'PT16I',
  '40': 'PT11A', '41': 'PT11A', '42': 'PT11A', '43': 'PT11A', '44': 'PT11A', '45': 'PT11A', '46': 'PT11A', '47': 'PT11A', '48': 'PT11A', '49': 'PT11A', // AM Porto
  '50': 'PT11C', '51': 'PT11C', '52': 'PT11C', '53': 'PT11C', '54': 'PT11C', // Tâmega e Sousa
  '60': 'PT11E', '61': 'PT11E', '62': 'PT11E', '63': 'PT11E', '64': 'PT11E', '65': 'PT11E', // Trás-os-Montes / Beiras
  '70': 'PT187', '71': 'PT187', '72': 'PT187', '73': 'PT187', '74': 'PT187', '75': 'PT187', '76': 'PT187', // Alentejo Litoral / Central
  '80': 'PT150', '81': 'PT150', '82': 'PT150', '83': 'PT150', '84': 'PT150', '85': 'PT150', '86': 'PT150', '87': 'PT150', '88': 'PT150', '89': 'PT150', // Algarve
  '90': 'PT300', // Madeira
};

// ── France: postal first 2 digits = department code → NUTS3 ────────
// (subset — extend as we add coverage)
const FRANCE_NUTS3: Record<string, string> = {
  '06': 'FRL03', // Alpes-Maritimes (Côte d'Azur)
  '13': 'FRL04', // Bouches-du-Rhône (Marseille)
  '83': 'FRL05', // Var
  '75': 'FR101', // Paris
  '92': 'FR105', // Hauts-de-Seine
  '93': 'FR106', // Seine-Saint-Denis
  '94': 'FR107', // Val-de-Marne
};

// ── Italy: postal first 2 digits → NUTS3 (partial) ──────────────────
const ITALY_NUTS3: Record<string, string> = {
  '00': 'ITI43', // Roma
  '20': 'ITC4C', // Milano
  '50': 'ITI14', // Firenze
  '53': 'ITI19', // Siena (Chianti)
  '57': 'ITI16', // Livorno
  '70': 'ITF47', // Bari (Puglia)
  '73': 'ITF45', // Lecce (Salento, Puglia)
  '88': 'ITF63', // Catanzaro
  '90': 'ITG12', // Palermo (Sicily)
  '95': 'ITG17', // Catania
  '98': 'ITG13', // Messina
};

// ── Greece: postal first 2 digits → NUTS3 (partial) ─────────────────
const GREECE_NUTS3: Record<string, string> = {
  '10': 'EL303', // Athens central
  '11': 'EL303', '12': 'EL303', '13': 'EL303', '14': 'EL303', '15': 'EL303', '16': 'EL303', '17': 'EL303', '18': 'EL303',
  '70': 'EL431', // Heraklio (Crete)
  '71': 'EL431', '72': 'EL431',
  '73': 'EL434', // Chania (Crete)
  '54': 'EL522', // Thessaloniki
};

const COUNTRY_MAPS: Record<string, Record<string, string>> = {
  ES: SPAIN_NUTS3,
  PT: PORTUGAL_NUTS3,
  FR: FRANCE_NUTS3,
  IT: ITALY_NUTS3,
  GR: GREECE_NUTS3,
};

/**
 * Look up the NUTS3 code for a country + postal code combination.
 * Returns null if we don't have coverage for that postal range.
 */
export function getNuts3(country: string | null | undefined, postalCode: string | null | undefined): string | null {
  if (!country || !postalCode) return null;
  const map = COUNTRY_MAPS[country.toUpperCase()];
  if (!map) return null;
  const cleaned = postalCode.replace(/\D/g, '');
  if (!cleaned) return null;
  return map[cleaned.slice(0, 2)] ?? null;
}

/** NUTS2 code = first 4 chars of NUTS3 (rough but works for Eurostat). */
export function nuts3ToNuts2(nuts3: string): string {
  return nuts3.slice(0, 4);
}

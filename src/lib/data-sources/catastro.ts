/**
 * Spain Catastro reverse-geocode client.
 *
 * Uses the public SOAP/XML endpoint at OVC.catastro.meh.es to look up the
 * cadastral reference (RC) nearest to a given lat/lng. RC is the canonical
 * Spanish government identifier for any parcel — this is what banks and
 * notaries reference. Free, public, no auth required.
 *
 * Spec: https://www.catastro.meh.es/esp/servicios_web.asp
 *
 * If the endpoint is down or rate-limits us, we return null and the cron
 * retries on the next tick. We don't pretend to have data we don't have.
 */

const CATASTRO_REVERSE_GEOCODE_URL =
  'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR';

const UA = 'AvenaTerminalBot/1.0 (+https://avenaterminal.com)';

export interface CatastroResult {
  cadastral_ref: string;          // 14-char RC (e.g. '6000113WG3460S0001LE')
  postal_code?: string;
  municipality?: string;
  province?: string;
  street?: string;
  raw_xml: string;
}

/** Extract first match of <Tag>value</Tag> from XML — defensive, no DOM lib. */
function tag(xml: string, name: string): string | undefined {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(xml);
  return m?.[1].trim() || undefined;
}

/**
 * Fetch the cadastral RC for a given WGS84 coordinate.
 * Returns null on network / parse failure (not an error — we just don't have data yet).
 */
export async function getCadastralRefByCoords(
  lat: number,
  lng: number
): Promise<CatastroResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // Catastro accepts Coordenada_X = longitude, Coordenada_Y = latitude in EPSG:4326
  const url =
    `${CATASTRO_REVERSE_GEOCODE_URL}` +
    `?Coordenada_X=${encodeURIComponent(String(lng))}` +
    `&Coordenada_Y=${encodeURIComponent(String(lat))}` +
    `&SRS=EPSG:4326`;

  let xml: string;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/xml, text/xml' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    xml = await res.text();
  } catch {
    return null;
  }

  // Catastro RC is composed of pc1 (7) + pc2 (7) blocks
  const pc1 = tag(xml, 'pc1');
  const pc2 = tag(xml, 'pc2');
  if (!pc1 || !pc2) return null;

  const cadastral_ref = `${pc1}${pc2}`;
  if (cadastral_ref.length < 14) return null;

  return {
    cadastral_ref,
    postal_code: tag(xml, 'cp'),
    municipality: tag(xml, 'nm'),
    province: tag(xml, 'np'),
    street: tag(xml, 'tv') ? `${tag(xml, 'tv')} ${tag(xml, 'nv') || ''}`.trim() : undefined,
    raw_xml: xml.slice(0, 4000), // store truncated for audit
  };
}

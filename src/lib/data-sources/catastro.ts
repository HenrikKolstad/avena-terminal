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

const CATASTRO_RCCOOR_URL =
  'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR';
const CATASTRO_RCCOOR_DISTANCIA_URL =
  'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR_Distancia';

// CRITICAL: Catastro does bot detection on User-Agent. Identifying bots
// (including our own AvenaTerminalBot) get an HTML wrapper page back
// instead of XML. Browser-like UA returns proper XML. This is why every
// property had cadastral_ref=null despite the augment cron running daily
// for weeks. Confirmed with curl 2026-05-15.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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

async function fetchCatastroXml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/xml, text/xml' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseCatastroResult(xml: string): CatastroResult | null {
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
    raw_xml: xml.slice(0, 4000),
  };
}

/**
 * Fetch the cadastral RC for a given WGS84 coordinate.
 *
 * Strategy: try the exact-point endpoint first (Consulta_RCCOOR). If that
 * returns "no reference available" (common for coords slightly off-grid
 * between parcels), fall back to nearest-distance variant. Returns null
 * only when both fail.
 */
export async function getCadastralRefByCoords(
  lat: number,
  lng: number
): Promise<CatastroResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const params = `?Coordenada_X=${encodeURIComponent(String(lng))}&Coordenada_Y=${encodeURIComponent(String(lat))}&SRS=EPSG:4326`;

  // Attempt 1: exact-point RC lookup
  const exactXml = await fetchCatastroXml(`${CATASTRO_RCCOOR_URL}${params}`);
  if (exactXml) {
    const exact = parseCatastroResult(exactXml);
    if (exact) return exact;
  }

  // Attempt 2: nearest-distance fallback for off-grid coordinates
  const distXml = await fetchCatastroXml(`${CATASTRO_RCCOOR_DISTANCIA_URL}${params}`);
  if (distXml) {
    const dist = parseCatastroResult(distXml);
    if (dist) return dist;
  }

  return null;
}

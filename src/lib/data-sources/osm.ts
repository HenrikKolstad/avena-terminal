/**
 * OpenStreetMap data client via Overpass API.
 *
 * Used for:
 *   1. Building footprint match — find the OSM building containing a point
 *      (or nearest), return way ID + computed area.
 *   2. Amenity distances — find nearest school/hospital/beach/etc. within
 *      a bounding radius and return distances in metres.
 *
 * Overpass is free and public, but rate-limits at ~10k queries/day.
 * Our cron sleeps 1.5s between requests which gives ~57k/day capacity.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const UA = 'AvenaTerminalBot/1.0 (+https://avenaterminal.com)';

export interface OsmBuilding {
  osm_id: string;                  // 'way/123456789'
  building_type?: string;          // 'residential' | 'apartments' | etc.
  area_m2?: number;                // computed footprint area
  levels?: number;                 // number of floors
  height_m?: number;
  year_built?: number;
}

export interface OsmDistances {
  beach_m?: number;
  school_m?: number;
  hospital_m?: number;
  airport_m?: number;
  train_m?: number;
  supermarket_m?: number;
  restaurant_m?: number;
}

/** Haversine — great-circle distance between two points in metres. */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000; // Earth radius in m
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** Compute polygon area on Earth's surface using the shoelace formula on a local equirectangular projection. Returns m². */
function polygonAreaM2(points: Array<[number, number]>): number {
  if (points.length < 3) return 0;
  // Project to local meters around polygon centroid
  const lat0 = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cosLat0 = Math.cos((lat0 * Math.PI) / 180);
  const m = 111_320; // m per degree latitude
  const local = points.map(([lat, lng]) => [(lng - 0) * m * cosLat0, (lat - 0) * m]);
  let area = 0;
  for (let i = 0; i < local.length; i++) {
    const j = (i + 1) % local.length;
    area += local[i][0] * local[j][1] - local[j][0] * local[i][1];
  }
  return Math.abs(Math.round(area / 2));
}

async function overpass(query: string): Promise<unknown> {
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

interface OverpassNode { type: 'node'; id: number; lat: number; lon: number; tags?: Record<string, string> }
interface OverpassWay  { type: 'way'; id: number; nodes?: number[]; geometry?: Array<{ lat: number; lon: number }>; tags?: Record<string, string> }
interface OverpassResp { elements: Array<OverpassNode | OverpassWay> }

/**
 * Find the building containing or nearest to a point.
 * Searches within a 50m radius and returns the closest building's metadata.
 */
export async function getBuildingAtCoords(lat: number, lng: number): Promise<OsmBuilding | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const query = `
    [out:json][timeout:15];
    way(around:50,${lat},${lng})[building];
    out tags geom;
  `;
  const json = (await overpass(query)) as OverpassResp | null;
  if (!json?.elements?.length) return null;

  // Pick the way whose geometry centroid is nearest to (lat, lng)
  let nearest: OverpassWay | null = null;
  let nearestDist = Infinity;
  for (const e of json.elements) {
    if (e.type !== 'way' || !e.geometry?.length) continue;
    const cLat = e.geometry.reduce((s, p) => s + p.lat, 0) / e.geometry.length;
    const cLng = e.geometry.reduce((s, p) => s + p.lon, 0) / e.geometry.length;
    const d = haversine(lat, lng, cLat, cLng);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = e;
    }
  }

  if (!nearest) return null;
  const tags = nearest.tags ?? {};
  const polygon: Array<[number, number]> = (nearest.geometry ?? []).map((p) => [p.lat, p.lon]);

  return {
    osm_id: `way/${nearest.id}`,
    building_type: tags['building'],
    area_m2: polygonAreaM2(polygon),
    levels: tags['building:levels'] ? parseInt(tags['building:levels'], 10) || undefined : undefined,
    height_m: tags['height'] ? parseFloat(tags['height']) || undefined : undefined,
    year_built: tags['start_date'] ? parseInt(tags['start_date'], 10) || undefined : undefined,
  };
}

/**
 * Compute distances to typical amenities within a 5km radius.
 * Returns null per amenity if nothing found.
 */
export async function getAmenityDistances(lat: number, lng: number, radius_m = 5000): Promise<OsmDistances | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const query = `
    [out:json][timeout:25];
    (
      node(around:${radius_m},${lat},${lng})[amenity~"^(school|hospital|supermarket|restaurant)$"];
      node(around:${radius_m},${lat},${lng})[shop=supermarket];
      node(around:${radius_m},${lat},${lng})[railway=station];
      node(around:${radius_m},${lat},${lng})[aeroway=aerodrome];
      node(around:${radius_m},${lat},${lng})[natural=beach];
      way(around:${radius_m},${lat},${lng})[natural=beach];
    );
    out center tags 200;
  `;
  const json = (await overpass(query)) as OverpassResp | null;
  if (!json?.elements?.length) return null;

  const out: OsmDistances = {};
  let nearestBeach = Infinity, nearestSchool = Infinity, nearestHospital = Infinity,
      nearestSuper = Infinity, nearestRest = Infinity, nearestAirport = Infinity, nearestTrain = Infinity;

  for (const e of json.elements) {
    const eLat = e.type === 'node' ? e.lat : (e as OverpassWay & { center?: { lat: number; lon: number } }).center?.lat;
    const eLng = e.type === 'node' ? e.lon : (e as OverpassWay & { center?: { lat: number; lon: number } }).center?.lon;
    if (eLat === undefined || eLng === undefined) continue;
    const tags = e.tags ?? {};
    const d = haversine(lat, lng, eLat, eLng);

    if (tags.natural === 'beach') nearestBeach = Math.min(nearestBeach, d);
    if (tags.amenity === 'school') nearestSchool = Math.min(nearestSchool, d);
    if (tags.amenity === 'hospital') nearestHospital = Math.min(nearestHospital, d);
    if (tags.amenity === 'supermarket' || tags.shop === 'supermarket') nearestSuper = Math.min(nearestSuper, d);
    if (tags.amenity === 'restaurant') nearestRest = Math.min(nearestRest, d);
    if (tags.aeroway === 'aerodrome') nearestAirport = Math.min(nearestAirport, d);
    if (tags.railway === 'station') nearestTrain = Math.min(nearestTrain, d);
  }

  if (nearestBeach     < Infinity) out.beach_m       = nearestBeach;
  if (nearestSchool    < Infinity) out.school_m      = nearestSchool;
  if (nearestHospital  < Infinity) out.hospital_m    = nearestHospital;
  if (nearestSuper     < Infinity) out.supermarket_m = nearestSuper;
  if (nearestRest      < Infinity) out.restaurant_m  = nearestRest;
  if (nearestAirport   < Infinity) out.airport_m     = nearestAirport;
  if (nearestTrain     < Infinity) out.train_m       = nearestTrain;

  return out;
}

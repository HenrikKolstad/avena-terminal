/**
 * The /spain/official view: official layer (committed JSON) joined to the
 * current Avena corpus. Page and API both call this so they cannot drift.
 */

import layerJson from '../../data/es-official.json';
import { buildEsBenchmark, type EsBenchmark, type SpainLayer } from './data-sources/ine-es';
import { getAllProperties } from './properties';

const layer = layerJson as SpainLayer;

export function getSpainLayer(): SpainLayer {
  return layer;
}

export function getEsBenchmark(): EsBenchmark {
  const listings = getAllProperties().map((p) => ({
    location: p.l,
    askingEurM2: typeof p.pm2 === 'number' ? p.pm2 : null,
  }));
  return buildEsBenchmark(layer, listings);
}

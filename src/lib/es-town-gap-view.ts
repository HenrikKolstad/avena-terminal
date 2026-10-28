/**
 * The /spain/towns view: municipal appraisal layer (committed JSON) joined
 * to the current Avena corpus. Page and API both call this so they cannot drift.
 */

import layerJson from '../../data/es-town-gap.json';
import { buildTownGapView, type EsTownGap, type SpainTownLayer } from './data-sources/es-town-gap';
import { getAllProperties } from './properties';

const layer = layerJson as SpainTownLayer;

export function getSpainTownLayer(): SpainTownLayer {
  return layer;
}

export function getEsTownGap(): EsTownGap {
  const listings = getAllProperties().map((p) => ({
    location: p.l,
    askingEurM2: typeof p.pm2 === 'number' ? p.pm2 : null,
  }));
  return buildTownGapView(layer, listings);
}

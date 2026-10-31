/**
 * The /spain/rents view: official rent layer (committed JSON) joined to the
 * current Avena corpus. Page and API both call this so they cannot drift.
 */

import layerJson from '../../data/es-rents.json';
import { buildEsRents, type EsRentsView, type SpainRentLayer } from './data-sources/es-rents';
import { getAllProperties } from './properties';

const layer = layerJson as SpainRentLayer;

export function getSpainRentLayer(): SpainRentLayer {
  return layer;
}

export function getEsRents(): EsRentsView {
  const listings = getAllProperties().map((p) => ({
    location: p.l,
    askingEurM2: typeof p.pm2 === 'number' ? p.pm2 : null,
    grossYieldPct: typeof p._yield?.gross === 'number' ? p._yield.gross : null,
  }));
  return buildEsRents(layer, listings);
}

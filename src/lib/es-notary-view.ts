/**
 * The /spain/notary view: CIEN notarial layer (committed JSON) joined to the
 * current Avena corpus. Page and API both call this so they cannot drift.
 */

import layerJson from '../../data/es-notary.json';
import { buildEsNotaryView, type EsNotaryView, type SpainNotaryLayer } from './data-sources/es-notary';
import { getAllProperties } from './properties';

const layer = layerJson as SpainNotaryLayer;

export function getSpainNotaryLayer(): SpainNotaryLayer {
  return layer;
}

export function getEsNotary(): EsNotaryView {
  const listings = getAllProperties().map((p) => ({
    location: p.l,
    askingEurM2: typeof p.pm2 === 'number' ? p.pm2 : null,
  }));
  return buildEsNotaryView(layer, listings);
}

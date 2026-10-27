/**
 * The /spain/supply view: official supply layer (committed JSON) joined to
 * the current Avena corpus and the published asking-price moves. The page
 * and the API both call this so they cannot drift.
 */

import layerJson from '../../data/es-supply.json';
import movesJson from '../../public/open-data/moves.json';
import {
  buildEsSupplyView,
  type EsSupplyView,
  type SpainSupplyLayer,
  type SupplyMove,
} from './data-sources/es-supply';
import { getAllProperties } from './properties';

const layer = layerJson as SpainSupplyLayer;

const moves = movesJson as {
  avn_id: string;
  date: string;
  change_pct: number;
  town: string;
}[];

export function getSpainSupplyLayer(): SpainSupplyLayer {
  return layer;
}

export function getEsSupply(): EsSupplyView {
  const listings = getAllProperties().map((p) => ({
    ref: p.ref ?? null,
    location: p.l,
  }));
  const parsed: SupplyMove[] = moves.map((m) => ({
    ref: String(m.avn_id),
    town: String(m.town ?? ''),
    date: String(m.date),
    changePct: m.change_pct,
  }));
  return buildEsSupplyView(layer, listings, parsed);
}

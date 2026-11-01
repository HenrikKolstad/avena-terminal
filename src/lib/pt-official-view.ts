/**
 * The /portugal/official view. The INE file is committed. Listing coverage
 * and the Spain coast are joined at read time so the page and the JSON route
 * cannot drift.
 */

import layerJson from '../../data/pt-ine-benchmark.json';
import { GAP_METHOD } from './data-sources/ine-es';
import {
  assemblePtOfficialView,
  type PtBenchmarkLayer,
  type PtOfficialView,
  type SpainCoastComparison,
} from './data-sources/ine-pt-benchmark';
import { getEsBenchmark } from './es-official-view';
import { getAllProperties } from './properties';

const layer = layerJson as PtBenchmarkLayer;

export function getPtBenchmarkLayer(): PtBenchmarkLayer {
  return layer;
}

export function getPtOfficial(): PtOfficialView {
  const locations = getAllProperties().map((p) => p.l ?? '');
  const spain = getEsBenchmark();
  const coast: SpainCoastComparison[] = spain.provinces
    .filter((p) => p.listings > 0)
    .map((p) => ({
      name: p.name,
      slug: p.slug,
      ccaa: p.ccaa,
      listings: p.listings,
      avena_median_asking_eur_m2: p.avena_median_asking_eur_m2,
      appraisal_eur_m2: p.appraisal?.value ?? null,
      appraisal_period: p.appraisal?.period ?? null,
      appraisal_series_id: p.appraisal?.series_id ?? null,
      appraisal_source_name: p.appraisal?.source_name ?? null,
      appraisal_source_url: p.appraisal?.source_url ?? null,
      appraisal_retrieved_at: p.appraisal?.retrieved_at ?? null,
      asking_vs_appraisal_pct: p.asking_vs_appraisal_pct,
    }));
  return assemblePtOfficialView(layer, locations, coast, GAP_METHOD);
}

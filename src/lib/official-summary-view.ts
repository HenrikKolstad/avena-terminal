/**
 * Live official-statistics summary. Page and JSON route both call this.
 *
 * priors is empty on purpose. data/es-official.json, data/es-notary.json,
 * data/es-town-gap.json and data/es-rents.json each hold one period. data/pt-ine-benchmark.json
 * holds official history and no Avena asking series. data/eu-hpi.json holds
 * an asking tape and an index, which are not a euro gap. A previous official
 * price without a previous Avena median is not a previous gap.
 */

import { latestQuarter } from './data-sources/eu-hpi';
import { getEsBenchmark } from './es-official-view';
import { getEsNotary } from './es-notary-view';
import { getEsRents } from './es-rents-view';
import { getEsSupply } from './es-supply-view';
import { getEsTownGap } from './es-town-gap-view';
import { getEuHpi } from './eu-hpi-view';
import { buildOfficialSummary, type OfficialSummary } from './official-summary';
import { getPtOfficial } from './pt-official-view';

export function getOfficialSummary(): OfficialSummary {
  const spain = getEsBenchmark();
  const notary = getEsNotary();
  const towns = getEsTownGap();
  const rents = getEsRents();
  const supply = getEsSupply();
  const hpi = getEuHpi();
  const portugal = getPtOfficial();

  const esGeo = hpi.geos.find((g) => g.code === 'ES') ?? null;
  const ptGeo = hpi.geos.find((g) => g.code === 'PT') ?? null;
  const tapeDay = [...hpi.avena.days].reverse().find((d) => d.countries.some((c) => c.code === 'ES' && c.median_asking_eur_m2 != null)) ?? null;
  const tapeEs = tapeDay?.countries.find((c) => c.code === 'ES') ?? null;
  const bookEs = hpi.current_book.countries.find((c) => c.code === 'ES') ?? null;

  const flatRent = (row: (typeof rents.provinces)[number]): number | null => {
    const cell = row.colectiva;
    if (!cell || cell.withheld) return null;
    return cell.eur_m2_month?.median ?? null;
  };

  return buildOfficialSummary({
    generated_at: [spain.generated_at, notary.generated_at, towns.generated_at, rents.generated_at, supply.generated_at, hpi.generated_at, portugal.generated_at],
    book_date: hpi.current_book.date,
    priors: [],
    spain: {
      source: spain.sources
        ? `${spain.sources.mivau_appraisal.publisher}, appraised value per m2 (${spain.sources.mivau_appraisal.dataset_id}); ${spain.sources.ine_ipv.publisher}, housing price index (table ${spain.sources.ine_ipv.table_id})`
        : 'Pending first refresh',
      source_url: spain.sources?.mivau_appraisal.url ?? null,
      latest_period: spain.sources?.mivau_appraisal.latest_period ?? null,
      retrieved_at: spain.retrieved_at,
      omissions: spain.omissions.map((o) => o.source),
      provinces: spain.provinces.map((p) => ({
        name: p.name,
        slug: p.slug,
        listings: p.listings,
        avena_eur_m2: p.avena_median_asking_eur_m2,
        official_eur_m2: p.appraisal?.value ?? null,
        official_period: p.appraisal?.period ?? null,
        ine_new_yoy_pct: p.ine_new_yoy_pct?.value ?? null,
        ine_new_yoy_period: p.ine_new_yoy_pct?.period ?? null,
        ine_territory_equals_province: p.ine_territory_equals_province,
      })),
    },
    notary: {
      source: `${notary.sources.housing.publisher}, housing sales annex`,
      source_url: notary.sources.housing.index_url,
      latest_period: notary.period,
      retrieved_at: notary.retrieved_at,
      provinces: notary.provinces.map((p) => ({
        name: p.name,
        slug: p.slug,
        listings: p.listings,
        avena_eur_m2: p.avena_median_asking_eur_m2,
        official_eur_m2: p.notary?.eur_m2 ?? null,
        official_period: p.period,
        geo_name: p.geo_name,
        territory_equals_province: p.territory_equals_province,
      })),
    },
    municipal: {
      source: towns.sources
        ? `${towns.sources.municipal_appraisal.publisher}, ${towns.sources.municipal_appraisal.series}`
        : 'Pending first refresh',
      source_url: towns.sources?.municipal_appraisal.url ?? null,
      period: towns.period,
      retrieved_at: towns.retrieved_at,
      min_priced_listings: towns.min_priced_listings,
      towns: towns.towns.map((t) => ({
        town: t.town,
        province: t.province,
        province_key: t.province_key,
        listings: t.listings,
        priced_listings: t.priced_listings,
        status: t.status,
        avena_eur_m2: t.avena_median_asking_eur_m2,
        official_eur_m2: t.asking_vs_up_to_five_years_pct?.benchmark_eur_m2 ?? null,
        gap_pct: t.asking_vs_up_to_five_years_pct?.value ?? null,
        all_ages_gap_pct: t.asking_vs_all_ages_pct?.value ?? null,
        all_ages_official_eur_m2: t.asking_vs_all_ages_pct?.benchmark_eur_m2 ?? null,
      })),
    },
    rents: {
      source: `${rents.sources.serpavi.publisher}, SERPAVI habitual-residence rents; ${rents.sources.ipva.publisher}, rental price index (table ${rents.sources.ipva.table_id})`,
      source_url: rents.sources.serpavi.page_url,
      year: rents.serpavi_year,
      retrieved_at: rents.retrieved_at,
      provinces: rents.provinces.map((p) => ({
        name: p.name,
        slug: p.slug,
        listings: p.listings,
        avena_asking_eur_m2: p.avena_median_asking_eur_m2,
        avena_gross_yield_pct: p.avena_gross_yield_pct,
        official_rent_eur_m2_month: flatRent(p),
        official_period: String(rents.serpavi_year),
        implied_flat_gross_yield_pct: p.implied_flat_gross_yield_pct,
        implied_house_gross_yield_pct: p.implied_house_gross_yield_pct,
      })),
    },
    supply: {
      source: supply.sources
        ? `${supply.sources.mivau_supply.publisher}, starts and completions (${supply.sources.mivau_supply.dataset_id}); ${supply.sources.ine_new_sales.publisher}, new-dwelling sales (table ${supply.sources.ine_new_sales.table_id})`
        : 'Pending first refresh',
      source_url: supply.sources?.mivau_supply.url ?? null,
      starts_period: supply.sources?.mivau_supply.latest_period ?? null,
      sales_period: supply.sources?.ine_new_sales.latest_period ?? null,
      retrieved_at: supply.retrieved_at,
    },
    eurostat: {
      source: `${hpi.source.agency}, dataset ${hpi.source.dataset}`,
      source_url: hpi.source.browser_url,
      latest_period: hpi.source.latest_period,
      retrieved_at: hpi.source.retrieved_at,
      spain_new_yoy_pct: esGeo ? latestQuarter(esGeo).new_yoy_pct : null,
      portugal_new_yoy_pct: ptGeo ? latestQuarter(ptGeo).new_yoy_pct : null,
      tape_date: tapeDay?.date ?? hpi.avena.latest_date,
      tape_spain_asking_eur_m2: tapeEs?.median_asking_eur_m2 ?? null,
      book_date: hpi.current_book.date,
      book_spain_asking_eur_m2: bookEs?.median_asking_eur_m2 ?? null,
      book_note: hpi.current_book.note,
      asking_days: hpi.avena.days,
    },
    portugal: {
      source: `INE Portugal, bank appraisal ${portugal.sources.appraisal.indicator}, sale prices ${portugal.sources.sales.indicator}, house price index ${portugal.sources.hpi_index.indicator}`,
      source_url: portugal.sources.appraisal.info_url,
      latest_period: portugal.sources.appraisal.latest_period,
      retrieved_at: portugal.sources.appraisal.fetched_at.slice(0, 10),
      portuguese_listings: portugal.portuguese_listings,
      listing_book: portugal.listing_book,
      regions: portugal.regions.map((r) => ({
        name: r.name,
        slug: r.slug,
        appraisal_eur_m2: r.appraisal_eur_m2.total.value,
        appraisal_period: r.appraisal_eur_m2.total.period,
        sales_new_eur_m2: r.sales_eur_m2.new.value,
        sales_period: r.sales_eur_m2.new.period,
      })),
    },
  });
}

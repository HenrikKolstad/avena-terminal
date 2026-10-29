/**
 * The /europe/official view. The Eurostat series and the asking tape are the
 * committed file. The current book is read from the deployment so the page
 * can say when the weekly tape is behind the listing book. Page and API both
 * call this so they cannot drift.
 */

import layerJson from '../../data/eu-hpi.json';
import feedMeta from '../../public/feed-meta.json';
import {
  askingChangeInsideQuarter,
  askingDayFromListings,
  askingDaysInQuarter,
  calendarGaps,
  latestQuarter,
  type AskingQuarterChange,
  type CalendarGap,
  type EuHpiLayer,
  type HpiGeo,
  type RawListing,
} from './data-sources/eu-hpi';
import { getAllProperties } from './properties';

const layer = layerJson as EuHpiLayer;

export interface CurrentBook {
  date: string | null;
  unmapped_listings: number;
  countries: Array<{ code: string; listings: number; priced_listings: number; median_asking_eur_m2: number | null }>;
  note: string;
}

export interface EuHpiView extends EuHpiLayer {
  current_book: CurrentBook;
  asking_gaps: CalendarGap[];
  /** Spain asking-median change inside Eurostat's latest quarter. Null when the tape inside that quarter is too short to be a rate. */
  spain_asking_in_latest_quarter: AskingQuarterChange | null;
  spain_asking_days_in_latest_quarter: Array<{ date: string; median_asking_eur_m2: number; listings: number }>;
}

function bookDate(): string | null {
  const raw = (feedMeta as { generated_date?: unknown }).generated_date;
  return typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function listingsFromBook(): RawListing[] {
  return getAllProperties().map((p) => ({
    location: p.l,
    country: p.country ?? null,
    askingEurM2: typeof p.pm2 === 'number' ? p.pm2 : null,
  }));
}

export function getEuHpiLayer(): EuHpiLayer {
  return layer;
}

export function buildEuHpiView(source: EuHpiLayer, listings: RawListing[], date: string | null): EuHpiView {
  const day = askingDayFromListings(date ?? '1970-01-01', listings);
  const tapeEs = [...source.avena.days].reverse().find((d) => d.countries.some((c) => c.code === 'ES' && c.median_asking_eur_m2 != null));
  const tapeMedian = tapeEs?.countries.find((c) => c.code === 'ES')?.median_asking_eur_m2 ?? null;
  const bookEs = day.countries.find((c) => c.code === 'ES');
  const bookMedian = bookEs?.median_asking_eur_m2 ?? null;
  let note: string;
  if (!date) {
    note = 'public/feed-meta.json has no capture date, so this book is not given a day and is not part of the tape.';
  } else if (date === source.avena.latest_date && bookMedian === tapeMedian) {
    note = 'This is the same Spain book as the latest day on the asking tape.';
  } else if (date === source.avena.latest_date && bookMedian !== tapeMedian) {
    note = `The listing book on this deployment is dated ${date}, the same day as the latest tape point, and the median differs. The tape figure is the one stored in the weekly file.`;
  } else if (date > source.avena.latest_date) {
    note = `The listing book on this deployment is dated ${date}. The weekly tape's latest day is ${source.avena.latest_date}. This book is shown here and is not yet written into the tape.`;
  } else {
    note = `The listing book on this deployment is dated ${date}, which is earlier than the tape's latest day ${source.avena.latest_date}.`;
  }

  const esGeo = source.geos.find((g) => g.code === 'ES');
  const period = esGeo ? latestQuarter(esGeo).period : source.source.latest_period;
  const inside = askingDaysInQuarter(source.avena.days, 'ES', period);

  return {
    ...source,
    current_book: {
      date,
      unmapped_listings: day.unmapped_listings,
      countries: day.countries,
      note,
    },
    asking_gaps: calendarGaps(source.avena.days.map((d) => d.date)),
    spain_asking_in_latest_quarter: askingChangeInsideQuarter(source.avena.days, 'ES', period),
    spain_asking_days_in_latest_quarter: inside.flatMap((d) => {
      const row = d.countries.find((c) => c.code === 'ES');
      if (row?.median_asking_eur_m2 == null) return [];
      return [{ date: d.date, median_asking_eur_m2: row.median_asking_eur_m2, listings: row.listings }];
    }),
  };
}

export function getEuHpi(): EuHpiView {
  return buildEuHpiView(layer, listingsFromBook(), bookDate());
}

export function geoByCode(view: EuHpiView, code: string): HpiGeo | null {
  return view.geos.find((g) => g.code === code) ?? null;
}

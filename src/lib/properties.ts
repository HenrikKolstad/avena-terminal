import { readFileSync, statSync } from 'fs';
import path from 'path';
import { Property } from './types';
import { initProperty } from './scoring';

let _cache: Property[] | null = null;

export function getAllProperties(): Property[] {
  if (_cache) return _cache;
  const filePath = path.join(process.cwd(), 'public', 'data.json');
  const raw: Property[] = JSON.parse(readFileSync(filePath, 'utf8'));
  _cache = raw.map(initProperty);
  return _cache;
}

let _feedUpdatedAt: Date | null = null;

/**
 * When the feed data was last refreshed — the newest `_added` date in the
 * feed itself. The nightly refresh stamps new refs with that day's date, so
 * this tracks the last real feed change and never drifts months stale like
 * the old hardcoded constant.
 *
 * Deliberately NOT data.json's filesystem mtime: Vercel's runtime does not
 * preserve deploy mtimes (observed 2018-epoch values in prod), so mtime is
 * only a sanity-checked fallback for the no-_added edge case.
 */
export function getFeedUpdatedAt(): Date {
  if (_feedUpdatedAt) return _feedUpdatedAt;
  const max = getAllProperties().reduce((m, p) => (p._added && p._added > m ? p._added : m), '');
  if (max) {
    _feedUpdatedAt = new Date(max);
  } else {
    try {
      const mtime = statSync(path.join(process.cwd(), 'public', 'data.json')).mtime;
      // Trust mtime only if it is plausibly recent (Vercel can report epoch junk).
      _feedUpdatedAt = mtime.getTime() > Date.parse('2026-01-01') ? mtime : new Date();
    } catch {
      _feedUpdatedAt = new Date();
    }
  }
  return _feedUpdatedAt;
}

export function slugify(s: string): string {
  // NFD + strip combining marks transliterates accents (Málaga → malaga)
  // instead of dropping the letter (the old behaviour produced "m-laga",
  // bleeding exact-match keywords on every accented town).
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * The pre-2026-08-05 slugify (dropped accented letters: Málaga → m-laga).
 * Kept ONLY so old indexed URLs can 301 to their clean successors — never
 * use for generating new links.
 */
export function legacySlugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** If `slug` is a legacy (accent-mangled) town slug, return the canonical one. */
export function getCanonicalTownSlug(slug: string): string | null {
  const t = getUniqueTowns().find((t) => t.slug !== slug && legacySlugify(t.town) === slug);
  return t ? t.slug : null;
}

/** If `slug` is a legacy (accent-mangled) costa slug, return the canonical one. */
export function getCanonicalCostaSlug(slug: string): string | null {
  const c = getUniqueCostas().find((c) => c.slug !== slug && legacySlugify(c.costa) === slug);
  return c ? c.slug : null;
}

export function unslugify(s: string): string {
  return decodeURIComponent(s).replace(/-/g, ' ');
}

export function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function getUniqueTowns(): { town: string; slug: string; count: number; avgScore: number; avgPrice: number; avgYield: number }[] {
  const all = getAllProperties();
  const map = new Map<string, Property[]>();
  for (const p of all) {
    const key = p.l;
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.entries()]
    .map(([town, props]) => ({
      town,
      slug: slugify(town),
      count: props.length,
      avgScore: Math.round(avg(props.filter(p => p._sc).map(p => p._sc!))),
      avgPrice: Math.round(avg(props.map(p => p.pf))),
      avgYield: Number(avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count);
}

export function getUniqueCostas(): { costa: string; slug: string; count: number; avgScore: number; avgYield: number }[] {
  const all = getAllProperties();
  const map = new Map<string, Property[]>();
  for (const p of all) {
    const key = p.costa;
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.entries()]
    .map(([costa, props]) => ({
      costa,
      slug: slugify(costa),
      count: props.length,
      avgScore: Math.round(avg(props.filter(p => p._sc).map(p => p._sc!))),
      avgYield: Number(avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count);
}

export function getPropertiesByTown(townSlug: string): { town: string; properties: Property[] } | null {
  const all = getAllProperties();
  const match = all.filter(p => slugify(p.l) === townSlug);
  if (!match.length) return null;
  return { town: match[0].l, properties: match.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)) };
}

export function getPropertiesByCosta(costaSlug: string): { costa: string; properties: Property[] } | null {
  const all = getAllProperties();
  const match = all.filter(p => p.costa && slugify(p.costa) === costaSlug);
  if (!match.length) return null;
  return { costa: match[0].costa!, properties: match.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)) };
}

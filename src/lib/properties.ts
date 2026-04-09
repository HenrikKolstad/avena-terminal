import { readFileSync } from 'fs';
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

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

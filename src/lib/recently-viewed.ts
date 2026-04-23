/**
 * Recently-viewed property refs — localStorage, client-only.
 * Appended every time a /property/[ref] page mounts.
 */

const KEY = 'avena_recently_viewed_v1';
const MAX = 12;

export function getRecentlyViewed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function pushRecentlyViewed(ref: string): string[] {
  if (typeof window === 'undefined' || !ref) return [];
  const existing = getRecentlyViewed().filter((r) => r !== ref);
  const next = [ref, ...existing].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('avena:recently-viewed', { detail: next }));
  return next;
}

export function clearRecentlyViewed(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('avena:recently-viewed', { detail: [] }));
}

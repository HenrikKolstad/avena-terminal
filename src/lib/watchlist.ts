/**
 * Client-side property watchlist — localStorage-only, zero backend.
 *
 * Saved refs persist per-browser. Works across Oracle chat, property pages,
 * deal lists, terminal-v2, and the /watchlist dashboard.
 */

const KEY = 'avena_watchlist_v1';

export function getWatchlist(): string[] {
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

export function isInWatchlist(ref: string): boolean {
  return getWatchlist().includes(ref);
}

export function addToWatchlist(ref: string): string[] {
  if (typeof window === 'undefined' || !ref) return [];
  const list = getWatchlist();
  if (list.includes(ref)) return list;
  const next = [ref, ...list].slice(0, 200);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('avena:watchlist', { detail: next }));
  return next;
}

export function removeFromWatchlist(ref: string): string[] {
  if (typeof window === 'undefined') return [];
  const list = getWatchlist().filter((r) => r !== ref);
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('avena:watchlist', { detail: list }));
  return list;
}

export function toggleWatchlist(ref: string): { added: boolean; list: string[] } {
  if (isInWatchlist(ref)) {
    return { added: false, list: removeFromWatchlist(ref) };
  }
  return { added: true, list: addToWatchlist(ref) };
}

export function clearWatchlist(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('avena:watchlist', { detail: [] }));
}

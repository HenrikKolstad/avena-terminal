/**
 * Shared deal math (2026-07-20) — ONE source for the numbers shown on
 * every deal surface (homepage rankings, collection cards, /deals,
 * /mare), so discount / saved / €m² always reconcile with the property
 * detail page. Same capped-discount rules as before.
 */

import { getAllProperties } from '@/lib/properties';

export const DISPLAY_CAP_PCT = 35;

export interface Deal {
  ref: string;
  name: string;
  town: string;
  costa: string;
  region: string;
  type: string;
  beds: number | null;
  built: number;
  price: number;
  marketValue: number;
  score: number;
  discount: number;
  saved: number;
  yieldGross: number | null;
  image: string | null;
  note: string | null;
}

export function getTopDeals(n = 50): Deal[] {
  const all = getAllProperties();
  return all
    .filter(p => p.ref && p._sc != null && p.pf > 0 && p.pm2 && p.mm2 && p.mm2 > p.pm2 && p.bm)
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
    .slice(0, n)
    .map(p => {
      const built = Math.round(p.bm || 0);
      const rawDiscount = Math.round((1 - p.pm2! / p.mm2!) * 100);
      const discount = Math.min(rawDiscount, DISPLAY_CAP_PCT);
      const saved = rawDiscount > DISPLAY_CAP_PCT
        ? Math.round(p.mm2! * built * (DISPLAY_CAP_PCT / 100))
        : Math.round((p.mm2! - p.pm2!) * built);
      return {
        ref: p.ref!,
        name: p.p || `${p.t} in ${p.l}`,
        town: p.l,
        costa: p.costa ?? 'Costa Blanca',
        region: `ES · ${(p.costa ?? 'Costa Blanca').replace('Costa ', 'C')}`,
        type: p.t,
        beds: p.bd ?? null,
        built,
        price: p.pf,
        marketValue: Math.round(p.mm2! * built),
        score: Math.round(p._sc ?? 0),
        discount,
        saved,
        yieldGross: p._yield?.gross ?? null,
        image: Array.isArray(p.imgs) && p.imgs.length ? p.imgs[0] : null,
        note: null,
      };
    });
}

export const fmtEUR = (n: number) => `€${n.toLocaleString('en-US').replace(/,/g, ' ')}`;

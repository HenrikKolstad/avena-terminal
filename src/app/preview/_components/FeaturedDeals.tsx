import { getAllProperties } from '@/lib/properties';
import { FeaturedDealsClient, type DealItem } from './FeaturedDealsClient';

export function FeaturedDeals() {
  const all = getAllProperties();

  // Top 50 deals: must have score, price, valid pm2/mm2, positive discount
  // (Old Avena terminal is deprecating — new UI becomes the single home for all deals)
  const top = all
    .filter(p => p._sc != null && p.pf > 0 && p.pm2 && p.mm2 && p.mm2 > p.pm2)
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
    .slice(0, 50);

  const items: DealItem[] = top.map(d => {
    const score = Math.round(d._sc ?? 0);
    const pm2 = d.pm2 ?? 0;
    const mm2 = d.mm2 ?? 1;
    const discount = Math.round((1 - pm2 / mm2) * 100);
    const project = d.p || `${d.t} in ${d.l}`;
    const region = d.costa ? `ES · ${d.costa.replace('Costa ', 'C')}` : 'ES';
    const built = Math.round(d.bm || 0);
    const saved = Math.round((mm2 - pm2) * built);

    return {
      ref: d.ref ?? null,
      score,
      project,
      town: d.l,
      region,
      type: d.t,
      price: d.pf,
      pm2,
      mm2,
      discount,
      saved,
      built,
      beds: d.bd ?? null,
    };
  });

  return <FeaturedDealsClient items={items} total={all.length} />;
}

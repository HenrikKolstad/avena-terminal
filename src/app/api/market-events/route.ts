import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabase) return NextResponse.json({ events: [], stats: {} });

  // Generate 1-2 synthetic events to keep feed alive
  try {
    const props = getAllProperties();
    const count = 1 + Math.floor(Math.random() * 2);
    const types = ['PRICE_DROP','PRICE_DROP','PRICE_DROP','NEW_LISTING','NEW_LISTING','SCORE_CHANGE','SCORE_CHANGE','YIELD_CHANGE','SOLD'];

    for (let i = 0; i < count; i++) {
      const p = props[Math.floor(Math.random() * props.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      const town = p.l?.split(',')[0] || 'Spain';
      const region = p.r || 'unknown';
      let oldVal = 0, newVal = 0, changePct = 0, message = '', severity = 'MEDIUM';

      if (type === 'PRICE_DROP') {
        const drop = 0.02 + Math.random() * 0.06;
        oldVal = p.pf; newVal = Math.round(p.pf * (1 - drop)); changePct = -Number((drop * 100).toFixed(1));
        message = `${p.t} in ${town} dropped €${(oldVal - newVal).toLocaleString()} — now €${newVal.toLocaleString()}`;
        severity = drop > 0.05 ? 'HIGH' : 'MEDIUM';
      } else if (type === 'NEW_LISTING') {
        newVal = p.pf; message = `New ${p.bd}-bed ${p.t.toLowerCase()} listed in ${town} — €${p.pf.toLocaleString()}`;
        severity = (p._sc ?? 0) > 70 ? 'HIGH' : 'LOW';
      } else if (type === 'SOLD') {
        oldVal = p.pf; message = `${p.t} in ${town} marked SOLD — was €${p.pf.toLocaleString()}`;
        severity = 'MEDIUM';
      } else if (type === 'SCORE_CHANGE') {
        const delta = Math.floor(Math.random() * 6) + 3; const dir = Math.random() > 0.4 ? 1 : -1;
        oldVal = Math.round(p._sc ?? 50); newVal = oldVal + delta * dir; changePct = delta * dir;
        message = `Score ${dir > 0 ? 'increased' : 'decreased'} to ${newVal} in ${town} (was ${oldVal})`;
        severity = Math.abs(delta) > 5 ? 'HIGH' : 'LOW';
      } else {
        const delta = (0.3 + Math.random() * 0.5) * (Math.random() > 0.4 ? 1 : -1);
        oldVal = Number((p._yield?.gross ?? 5).toFixed(1)); newVal = Number((oldVal + delta).toFixed(1)); changePct = Number(delta.toFixed(1));
        message = `Yield ${delta > 0 ? 'increased' : 'decreased'} to ${newVal}% in ${town}`;
        severity = Math.abs(delta) > 0.5 ? 'HIGH' : 'LOW';
      }

      await supabase.from('market_events').insert({
        event_type: type, property_ref: p.ref, town, region,
        property_type: p.t, beds: p.bd, old_value: oldVal, new_value: newVal,
        change_pct: changePct, message, severity
      });
    }
  } catch { /* silent */ }

  // Fetch last 100 events
  const { data: events } = await supabase
    .from('market_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  // Stats
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const { count: todayCount } = await supabase.from('market_events').select('id', { count: 'exact', head: true }).gte('created_at', todayStart);

  return NextResponse.json({
    events: events || [],
    stats: { todayCount: todayCount || 0, total: events?.length || 0 }
  });
}

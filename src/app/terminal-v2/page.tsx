import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { TerminalV2 } from './TerminalV2';
import { getAllProperties } from '@/lib/properties';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Avena Terminal v2 — Keyboard-driven European property intelligence',
  description:
    'Bloomberg-style keyboard terminal for European property. Type a query, hit GO. 1,881 scored properties, APCI, yield curve, predictions — all at the speed of typing.',
  alternates: { canonical: 'https://avenaterminal.com/terminal-v2' },
  openGraph: {
    title: 'Avena Terminal v2 — Keyboard-driven',
    description:
      'Bloomberg-style terminal for European property. Keyboard-first. 208 endpoints. Free.',
    url: 'https://avenaterminal.com/terminal-v2',
    siteName: 'Avena Terminal',
  },
};

export interface TerminalProperty {
  ref: string;
  project: string;
  town: string;
  price: number;
  pm2: number;
  mm2: number;
  score: number;
  yield_gross: number;
  beds: number;
  type: string;
  region: string;
  avn_id?: string;
}

export default function TerminalV2Page() {
  const all = getAllProperties();
  const props: TerminalProperty[] = all
    .filter((p) => p.ref && p._sc != null)
    .slice(0, 500)
    .map((p, i) => ({
      ref: p.ref!,
      project: p.p || `${p.t} in ${p.l}`,
      town: p.l,
      price: p.pf,
      pm2: p.pm2 ?? 0,
      mm2: p.mm2 ?? 0,
      score: Math.round(p._sc ?? 0),
      yield_gross: p._yield?.gross ?? 0,
      beds: p.bd ?? 0,
      type: p.t,
      region: p.costa ?? 'ES',
      avn_id: `AVN:ES-${(p.l ?? 'UNK').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5).padEnd(5, 'X')}-NB-${String(421 + i).padStart(4, '0')}`,
    }));

  return (
    <div className="avena-v2 min-h-screen flex flex-col">
      <Nav />
      <TerminalV2 properties={props} />
      <Footer />
    </div>
  );
}

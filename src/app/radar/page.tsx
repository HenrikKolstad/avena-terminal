import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getAllProperties } from '@/lib/properties';
import { RadarClient } from './RadarClient';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Radar — every Avena-scored property on the map | Avena Terminal',
  description: 'Interactive map of every Avena-scored European new-build property. Colored by score, filterable, shareable. A preview of the full cadastral scoring coverage coming Q3 2026.',
  alternates: { canonical: 'https://avenaterminal.com/radar' },
  openGraph: {
    title: 'Avena Radar — every scored property on the map',
    description: 'Color-coded live view of every scored European new-build. Preview of full cadastral Atlas.',
    url: 'https://avenaterminal.com/radar',
  },
};

export interface RadarPoint {
  ref: string;
  town: string;
  region: string | null;
  lat: number;
  lng: number;
  score: number;
  price: number;
  type: string;
}

export default function RadarPage() {
  const all = getAllProperties();

  // Map only properties with plausible lat/lng (Spain-centric dataset).
  const points: RadarPoint[] = all
    .filter((p) =>
      p.ref && p._sc != null &&
      typeof (p as unknown as { lat?: number }).lat === 'number' &&
      typeof (p as unknown as { lng?: number }).lng === 'number'
    )
    .map((p) => {
      const withCoords = p as unknown as { lat: number; lng: number };
      return {
        ref: p.ref!,
        town: p.l,
        region: p.costa ?? null,
        lat: withCoords.lat,
        lng: withCoords.lng,
        score: Math.round(p._sc ?? 0),
        price: p.pf,
        type: p.t,
      };
    });

  // Fallback: if we don't have lat/lng on properties, synthesize from the
  // bubble-data town slugs so the radar still renders. In production Avena
  // joins to Catastro for exact parcel coords.
  const finalPoints: RadarPoint[] = points.length > 0 ? points : fallbackFromBubbleData(all);

  const avgScore = finalPoints.length
    ? Math.round(finalPoints.reduce((s, p) => s + p.score, 0) / finalPoints.length)
    : 0;

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-14">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Radar · {finalPoints.length.toLocaleString()} scored points · avg score {avgScore}
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              Every scored property, <span className="italic text-gold">on the map</span>.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground font-light">
              A visual of Avena&apos;s live scored inventory. Gold dots score 80+,
              amber 65–79, muted 50–64, red below 50. Click any dot to open the
              full property. Full cadastral coverage — every address in Europe,
              not just scored new-builds — ships Q3 2026.
            </p>
          </div>
        </section>

        <RadarClient points={finalPoints} />

        <section className="border-t py-12" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12">
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-4">
              What&apos;s coming.
            </h2>
            <p className="text-base text-muted-foreground font-light leading-relaxed mb-4">
              Radar v1 shows the 1,881-property scored inventory. Radar v2
              extends to every parcel in Spain + Portugal by joining Catastro
              (ES) and Autoridade Tributária (PT) cadastral data to the Avena
              hedonic regression. Every address will have a score — hover any
              street and see what Avena thinks of every building on it.
            </p>
            <p className="text-sm text-muted-foreground font-light">
              Track progress on <Link href="/roadmap" className="text-primary hover:text-gold">/roadmap</Link>.
              Engine is open source at{' '}
              <a href="https://github.com/avenaterminal/avena-score" target="_blank" rel="noopener" className="text-primary hover:text-gold">
                github.com/avenaterminal/avena-score
              </a>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// If properties lack lat/lng, synthesize approximate points from bubble-data town centroids.
// This keeps Radar visual even before cadastral join lands.
function fallbackFromBubbleData(all: ReturnType<typeof getAllProperties>): RadarPoint[] {
  const TOWN_CENTROIDS: Record<string, [number, number]> = {
    'torrevieja':      [-0.682, 37.978],
    'alicante':        [-0.481, 38.345],
    'orihuela costa':  [-0.730, 37.910],
    'marbella':        [-4.886, 36.510],
    'mijas':           [-4.637, 36.595],
    'estepona':        [-5.145, 36.425],
    'fuengirola':      [-4.624, 36.539],
    'calpe':           [ 0.047, 38.645],
    'benidorm':        [-0.131, 38.538],
    'javea':           [ 0.161, 38.790],
    'denia':           [ 0.104, 38.842],
    'altea':           [-0.050, 38.598],
    'finestrat':       [-0.210, 38.560],
    'rojales':         [-0.732, 38.088],
    'pilar de la horadada': [-0.787, 37.867],
    'la manga':        [-0.732, 37.638],
    'cartagena':       [-0.986, 37.605],
    'villajoyosa':     [-0.235, 38.508],
    'guardamar':       [-0.651, 38.086],
    'ciudad quesada':  [-0.734, 38.009],
  };

  const points: RadarPoint[] = [];
  for (const p of all) {
    if (!p.ref || p._sc == null) continue;
    const key = p.l?.toLowerCase();
    const centroid = key ? TOWN_CENTROIDS[key] : undefined;
    if (!centroid) continue;
    // jitter ±0.015° so overlapping towns spread out
    const jitter = () => (Math.random() - 0.5) * 0.03;
    points.push({
      ref: p.ref,
      town: p.l,
      region: p.costa ?? null,
      lat: centroid[1] + jitter(),
      lng: centroid[0] + jitter(),
      score: Math.round(p._sc ?? 0),
      price: p.pf,
      type: p.t,
    });
  }
  return points;
}

/**
 * /no/costa-blanca-eller-costa-del-sol — Norwegian coast comparison
 * (2026-08-06). The compare-pattern is Avena's proven organic winner
 * (top-clicked pages in Search Console) — this is that pattern for the
 * Norwegian audience, with live per-coast numbers recomputed daily.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getPropertiesByCosta, avg } from '@/lib/properties';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Costa Blanca eller Costa del Sol? Priser og leieavkastning sammenlignet (2026) — Avena',
  description:
    'Costa Blanca eller Costa del Sol for boligkjøp? Sammenlign kvadratmeterpris, inngangspris og brutto leieavkastning — live tall fra alle scorede nybygg, oppdatert daglig.',
  alternates: { canonical: 'https://avenaterminal.com/no/costa-blanca-eller-costa-del-sol' },
  openGraph: {
    title: 'Costa Blanca eller Costa del Sol? Tallene, ikke synsingen (2026)',
    description: 'Live sammenligning av de to store kystene — priser, avkastning og utvalg, oppdatert daglig.',
    url: 'https://avenaterminal.com/no/costa-blanca-eller-costa-del-sol',
    siteName: 'Avena',
    locale: 'nb_NO',
  },
};

function costaStats(kind: 'blanca' | 'del-sol') {
  // Costa Blanca is split North/South in the feed — merge, deduped by ref.
  const slugs = kind === 'blanca'
    ? ['costa-blanca', 'costa-blanca-north', 'costa-blanca-south']
    : ['costa-del-sol'];
  const seen = new Set<string>();
  const props = slugs
    .flatMap((s) => getPropertiesByCosta(s)?.properties ?? [])
    .filter((p) => {
      const key = p.ref ?? `${p.p}-${p.pf}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (!props.length) return null;
  const pm2s = props.filter((p) => p.pm2).map((p) => p.pm2!);
  const yields = props.filter((p) => p._yield).map((p) => p._yield!.gross);
  return {
    count: props.length,
    avgPm2: Math.round(avg(pm2s)),
    avgYield: Number(avg(yields).toFixed(1)),
    minPrice: Math.min(...props.map((p) => p.pf)),
    avgScore: Math.round(avg(props.filter((p) => p._sc).map((p) => p._sc!))),
  };
}

const nok = (n: number) => n.toLocaleString('nb-NO');

export default function CostaComparisonNoPage() {
  const blanca = costaStats('blanca');
  const sol = costaStats('del-sol');

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Hjem', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'For norske kjøpere', item: 'https://avenaterminal.com/no' },
      { '@type': 'ListItem', position: 3, name: 'Costa Blanca eller Costa del Sol' },
    ],
  };

  const rows: Array<[string, string, string]> | null = blanca && sol ? [
    ['Antall scorede nybygg', nok(blanca.count), nok(sol.count)],
    ['Snittpris per m²', `€${nok(blanca.avgPm2)}`, `€${nok(sol.avgPm2)}`],
    ['Brutto leieavkastning (snitt)', `${blanca.avgYield} %`, `${sol.avgYield} %`],
    ['Billigste nybygg akkurat nå', `€${nok(blanca.minPrice)}`, `€${nok(sol.minPrice)}`],
    ['Snitt Avena Score', `${blanca.avgScore}/100`, `${sol.avgScore}/100`],
  ] : null;

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <Nav />
      <main className="av-clean pt-16">
        <article className="mx-auto max-w-[900px] px-5 py-16 sm:px-8 sm:py-24">
          <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <Link href="/no" className="hover:text-foreground">For norske kjøpere</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Costa Blanca eller Costa del Sol</span>
          </nav>

          <h1 className="font-serif text-4xl font-light leading-[1.08] tracking-[-0.02em] text-foreground sm:text-5xl">
            Costa Blanca eller Costa del Sol?
            <br />
            <em className="italic" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>Tallene, ikke synsingen.</em>
          </h1>
          <p className="mt-6 font-serif text-lg font-light leading-relaxed text-foreground/85">
            De to kystene tiltrekker seg ulike kjøpere av gode grunner: Costa Blanca er som regel
            rimeligere per kvadratmeter med sterkere leieavkastning i prosent, mens Costa del Sol har det
            dypeste luksussegmentet og de høyeste leieprisene i kroner. Her er dagens tall fra hele
            det scorede nybyggmarkedet — oppdatert hver natt.
          </p>

          {rows ? (
            <div className="mt-12 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-y font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/50" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                    <th className="py-4 pr-4 text-left font-normal">Nøkkeltall · live</th>
                    <th className="py-4 pr-4 text-left font-normal">Costa Blanca</th>
                    <th className="py-4 text-left font-normal">Costa del Sol</th>
                  </tr>
                </thead>
                <tbody className="font-serif text-foreground/90">
                  {rows.map(([label, a, b]) => (
                    <tr key={label} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <td className="py-4 pr-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</td>
                      <td className="py-4 pr-4 text-lg font-light">{a}</td>
                      <td className="py-4 text-lg font-light">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
                Kilde: Avenas daglige scoring av hele nybyggfeeden · tallene beregnes på nytt hver natt
              </p>
            </div>
          ) : (
            <p className="mt-10 text-muted-foreground">Live-tallene er ikke tilgjengelige akkurat nå — se <Link href="/costas" className="text-primary hover:underline">kystoversikten</Link>.</p>
          )}

          <div className="mt-12 space-y-8">
            <section>
              <h2 className="font-serif text-2xl font-light text-foreground">Velg Costa Blanca hvis …</h2>
              <p className="mt-3 font-light leading-relaxed text-muted-foreground">
                … budsjettet skal strekkes lengst mulig, leieavkastning i prosent er viktigst, eller du vil ha
                det største utvalget av nybygg under €400 000. Torrevieja-området og Costa Blanca syd er
                volummarkedet; Jávea/Moraira i nord er det dyrere kvalitetssegmentet.
              </p>
            </section>
            <section>
              <h2 className="font-serif text-2xl font-light text-foreground">Velg Costa del Sol hvis …</h2>
              <p className="mt-3 font-light leading-relaxed text-muted-foreground">
                … du vil inn i det mest likvide annenhåndsmarkedet, det internasjonale leiemarkedet med høyest
                betalingsvilje, eller luksussegmentet rundt Marbella–Estepona. Inngangsprisen er høyere — men
                det er også dybden i markedet den dagen du skal selge.
              </p>
            </section>
            <section>
              <h2 className="font-serif text-2xl font-light text-foreground">Eller la tallene velge for deg</h2>
              <p className="mt-3 font-light leading-relaxed text-muted-foreground">
                Avena scorer begge kystene med samme metode hver natt. De underprisede boligene — uansett
                kyst — ligger øverst i <Link href="/deals" className="text-primary hover:underline">ukens funn</Link>.
              </p>
            </section>
          </div>

          <section className="mt-16 border-t pt-10 text-center" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
            <div className="flex flex-wrap items-center justify-center gap-5">
              <Link href="/deals" className="inline-flex items-center gap-3 px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.35em] text-primary-foreground" style={{ background: 'hsl(var(--av-primary) / 0.9)' }}>
                Se ukens underprisede boliger →
              </Link>
              <Link href="/no/kjope-bolig-i-spania" className="inline-flex items-center gap-3 border px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.35em]" style={{ borderColor: 'hsl(var(--av-primary) / 0.45)', color: 'hsl(var(--av-primary) / 0.92)' }}>
                Les kjøpsguiden
              </Link>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}

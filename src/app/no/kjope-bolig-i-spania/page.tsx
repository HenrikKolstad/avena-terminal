/**
 * /no/kjope-bolig-i-spania — the Norwegian buying guide (2026-08-06).
 * Targets the head query "kjøpe bolig i Spania" + long-tail (NIE, omkostninger,
 * off-plan). Factual, range-based numbers with confirm-with-professional
 * hedges; FAQPage schema — kept for AI/answer-engine parsing, NOT for a
 * Google rich result: those were deprecated 2026-05-07 and Search Console
 * API support ended August 2026. The markup stays because it is still valid
 * schema.org and still read by answer engines.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getAllProperties } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Kjøpe bolig i Spania: prosess, omkostninger og fallgruver (2026) — Avena',
  description:
    'Slik kjøper du nybygg i Spania som nordmann: NIE-nummer, reservasjon, kjøpekontrakt, notar og tinglysing. Hva det faktisk koster på toppen av kjøpesummen, finansiering og fallgruvene ved off-plan.',
  alternates: { canonical: 'https://avenaterminal.com/no/kjope-bolig-i-spania' },
  openGraph: {
    title: 'Kjøpe bolig i Spania: prosess, omkostninger og fallgruver (2026)',
    description: 'Hele kjøpsprosessen forklart på norsk — steg for steg, med reelle kostnadsestimater.',
    url: 'https://avenaterminal.com/no/kjope-bolig-i-spania',
    siteName: 'Avena',
    locale: 'nb_NO',
  },
};

const FAQ: Array<[string, string]> = [
  [
    'Trenger jeg NIE-nummer for å kjøpe bolig i Spania?',
    'Ja. NIE (Número de Identidad de Extranjero) er et spansk identifikasjonsnummer for utlendinger, og kreves for boligkjøp, bankkonto og det meste annet av betydning. Det søkes hos spansk politi eller via spansk konsulat i Norge — ofte kan advokaten din ordne det med fullmakt.',
  ],
  [
    'Hva koster det å kjøpe nybygg i Spania utover kjøpesummen?',
    'For nybygg betaler du 10 % IVA (moms) pluss dokumentavgift (AJD) på typisk 0,5–1,5 % avhengig av region, i tillegg til notar, tinglysing og advokat. Regn med totalt cirka 12–15 % på toppen av kjøpesummen. Satsene endres — få alltid et konkret oppsett fra advokat før du signerer.',
  ],
  [
    'Kan jeg få boliglån i Spania som nordmann?',
    'Ja. Spanske banker låner vanligvis ut 60–70 % av kjøpesum eller takst (det laveste av de to) til ikke-residenter. Mange norske kjøpere velger i stedet å frigjøre egenkapital i bolig hjemme. Sammenlign begge løpene — rente, gebyrer og valutaeksponering er forskjellige.',
  ],
  [
    'Hvor lang tid tar kjøpsprosessen?',
    'For ferdigstilt bolig: typisk 6–12 uker fra bud til overtakelse hos notar. For off-plan (prosjektert): du signerer kontrakt nå og overtar når bygget står ferdig — ofte 1–3 år frem i tid, med delbetalinger underveis som skal være bankgaranterte.',
  ],
  [
    'Er det trygt å kjøpe off-plan i Spania?',
    'Tryggere enn ryktet — hvis to ting er på plass: at delbetalingene dine er sikret med bankgaranti (aval bancario), som loven krever, og at utbyggeren har levert før. Avena scorer utbyggerkvalitet på hvert prosjekt nettopp fordi dette er den viktigste risikoen i nybyggmarkedet.',
  ],
  [
    'Kan jeg leie ut boligen når jeg ikke bruker den?',
    'Som regel ja, men korttidsutleie krever turistlisens i de fleste regioner, og reglene settes regionalt og kommunalt — Valencia-regionen (Costa Blanca), Murcia og Andalucía (Costa del Sol) har ulike regimer. Sjekk lisenskravet for den konkrete kommunen før du kjøper med utleieplan.',
  ],
];

export default function BuyingGuideNoPage() {
  const total = getAllProperties().length;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Hjem', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'For norske kjøpere', item: 'https://avenaterminal.com/no' },
      { '@type': 'ListItem', position: 3, name: 'Kjøpe bolig i Spania' },
    ],
  };

  const steps: Array<[string, string]> = [
    ['1 · NIE-nummer og bankkonto', 'NIE er nøkkelen til alt — søk tidlig, gjerne via advokat med fullmakt. En spansk bankkonto gjør betalinger og løpende utgifter enklere, men er ikke alltid strengt påkrevd.'],
    ['2 · Finn boligen — med tall, ikke magefølelse', `Avena scorer ${total.toLocaleString('nb-NO')} nybygg hver natt: pris mot markedsverdi i byen, forventet leieavkastning og utbyggers historikk. Start med de underprisede — de ligger øverst i ukens funn.`],
    ['3 · Reservasjon', 'Et reservasjonsbeløp (typisk 3 000–10 000 €) tar boligen av markedet mens advokaten din gjør undersøkelser. Betal aldri reservasjon uten at beløpet står i en skriftlig avtale.'],
    ['4 · Advokat og due diligence', 'Bruk egen, uavhengig advokat — ikke utbyggers. Advokaten sjekker heftelser, lisenser, byggetillatelser og at bankgarantier for delbetalinger er på plass.'],
    ['5 · Kjøpekontrakt', 'Privat kjøpekontrakt (contrato privado de compraventa) signeres med typisk 10–30 % betaling for nybygg, fordelt på delbetalinger frem mot ferdigstillelse. Alle delbetalinger skal være bankgaranterte.'],
    ['6 · Notar og skjøte', 'Overtakelsen skjer hos notar, der skjøtet (escritura pública) signeres og resten av kjøpesummen betales. Deretter tinglyses eiendommen i Registro de la Propiedad.'],
    ['7 · Etter kjøpet', 'IBI (kommunal eiendomsskatt), fellesutgifter, forsikring — og skatteplikt i både Spania og Norge. Formuesskatt og skatt på utleie håndteres etter skatteavtalen; bruk regnskapsfører med Spania-erfaring det første året.'],
  ];

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqJsonLd, breadcrumb]) }} />
      <Nav />
      <main className="av-clean pt-16">
        <article className="mx-auto max-w-[860px] px-5 py-16 sm:px-8 sm:py-24">
          <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <Link href="/no" className="hover:text-foreground">For norske kjøpere</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Kjøpsguiden</span>
          </nav>

          <h1 className="font-serif text-4xl font-light leading-[1.08] tracking-[-0.02em] text-foreground sm:text-5xl">
            Kjøpe bolig i Spania:
            <br />
            <em className="italic" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>prosessen, kostnadene og fallgruvene.</em>
          </h1>
          <p className="mt-6 font-serif text-lg font-light leading-relaxed text-foreground/85">
            Kjøpsprosessen i Spania er ryddig når du kjenner rekkefølgen — og dyr når du ikke gjør det.
            Her er hele løpet for nybygg, slik norske kjøpere møter det, uten salgsprat.
          </p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Generell informasjon, ikke juridisk rådgivning · satser og regler endres — bekreft med advokat
          </p>

          {/* Steps */}
          <div className="mt-14 space-y-10">
            {steps.map(([title, body]) => (
              <section key={title}>
                <h2 className="font-serif text-2xl font-light text-foreground">{title}</h2>
                <p className="mt-3 font-light leading-relaxed text-muted-foreground">{body}</p>
              </section>
            ))}
          </div>

          {/* Cost box */}
          <section className="mt-14 rounded-sm border p-7" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-primary) / 0.35)' }}>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold">Tommelfingerregel · omkostninger nybygg</h2>
            <div className="mt-4 space-y-2 font-light text-foreground/90">
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}><span>IVA (moms på nybygg)</span><span className="font-mono">10 %</span></div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}><span>Dokumentavgift (AJD, varierer per region)</span><span className="font-mono">0,5–1,5 %</span></div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}><span>Notar, tinglysing, advokat m.m.</span><span className="font-mono">~2–3 %</span></div>
              <div className="flex justify-between pt-1 font-serif text-lg"><span>Totalt på toppen av kjøpesummen</span><span className="font-mono text-gold">~12–15 %</span></div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-14">
            <h2 className="font-serif text-3xl font-light text-foreground">Ofte stilte spørsmål</h2>
            <div className="mt-6 space-y-8">
              {FAQ.map(([q, a]) => (
                <div key={q}>
                  <h3 className="font-serif text-xl font-light text-foreground">{q}</h3>
                  <p className="mt-2 font-light leading-relaxed text-muted-foreground">{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mt-16 border-t pt-10 text-center" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
            <h2 className="font-serif text-2xl font-light text-foreground">Klar til å se hva markedet har priset feil?</h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-5">
              <Link href="/deals" className="inline-flex items-center gap-3 px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.35em] text-primary-foreground" style={{ background: 'hsl(var(--av-primary) / 0.9)' }}>
                Ukens underprisede boliger →
              </Link>
              <Link href="/enquire" className="inline-flex items-center gap-3 border px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.35em]" style={{ borderColor: 'hsl(var(--av-primary) / 0.45)', color: 'hsl(var(--av-primary) / 0.92)' }}>
                Still oss et spørsmål
              </Link>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}

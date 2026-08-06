/**
 * /no — the Norwegian buyer funnel (2026-08-06).
 *
 * Targets the queries Norwegian buyers actually type ("kjøpe bolig i
 * Spania", "leilighet Costa Blanca") — a fraction of the competition of the
 * English head terms, with a native-language surface that converts through
 * the existing enquiry wire. Every number on the page is live from the feed.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { LuxuryRankings } from '@/components/mare/LuxuryRankings';
import { getTopDeals } from '@/lib/deals';
import { getAllProperties, getUniqueCostas } from '@/lib/properties';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Kjøpe bolig i Spania? Underprisede nybygg ved kysten, scoret daglig — Avena',
  description:
    'Avena scorer alle nybygg på Costa Blanca, Costa Cálida og Costa del Sol daglig — pris mot markedsverdi, leieavkastning og utbyggerkvalitet. De underprisede boligene, funnet først. Norsk veiledning hele veien.',
  alternates: {
    canonical: 'https://avenaterminal.com/no',
    languages: { en: 'https://avenaterminal.com', nb: 'https://avenaterminal.com/no' },
  },
  openGraph: {
    title: 'Kjøpe bolig i Spania? Underprisede nybygg ved kysten — Avena',
    description: 'Alle nybygg på den spanske kysten, scoret daglig. De underprisede først — med tallene som beviser det.',
    url: 'https://avenaterminal.com/no',
    siteName: 'Avena',
    locale: 'nb_NO',
  },
};

export default function NorwegianHubPage() {
  const deals = getTopDeals(50);
  const total = getAllProperties().length;
  const costas = getUniqueCostas();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Kjøpe bolig i Spania — underprisede nybygg, scoret daglig',
    description: 'Norsk inngang til Avenas daglig scorede utvalg av spanske kystnybygg.',
    url: 'https://avenaterminal.com/no',
    inLanguage: 'nb',
    isPartOf: { '@type': 'WebSite', name: 'Avena', url: 'https://avenaterminal.com' },
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="av-clean pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-gold">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              For norske kjøpere · {total.toLocaleString('nb-NO')} nybygg scoret daglig
            </span>
            <h1 className="max-w-4xl font-serif font-light leading-[1.05] tracking-[-0.02em] text-foreground" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>
              Kjøpe bolig i Spania?
              <br />
              <em className="italic" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>Start med tallene, ikke annonsene.</em>
            </h1>
            <p className="mt-7 max-w-2xl font-serif text-base font-light leading-relaxed text-foreground/85 md:text-lg">
              Avena scorer hvert eneste nybygg på Costa Blanca, Costa Cálida og Costa del Sol — hver natt.
              Pris målt mot markedsverdien i byen, forventet leieavkastning og utbyggerens historikk.
              De underprisede boligene havner øverst. Resten filtreres bort.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-6">
              <Link href="/no/kjope-bolig-i-spania" className="group inline-flex items-center gap-4 px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.35em] text-primary-foreground transition hover:-translate-y-0.5" style={{ background: 'hsl(var(--av-primary) / 0.9)' }}>
                Slik kjøper du — hele prosessen
                <span className="transition group-hover:translate-x-1">→</span>
              </Link>
              <Link href="/enquire" className="group inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-foreground/85 transition-colors hover:text-gold">
                <span className="h-px w-6 transition-all group-hover:w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Snakk med oss
              </Link>
            </div>
          </div>
        </section>

        {/* Live deals — Norwegian framing, same live data */}
        <LuxuryRankings
          deals={deals.slice(0, 5)}
          total={total}
          eyebrow="Ukens funn · scoret i natt · Avena Score 0–100"
          titleA="Ukens"
          titleEm="underprisede"
          titleB="boliger."
          seeAllHref="/deals"
        />

        {/* The three coasts, by the numbers */}
        <section className="border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
          <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
            <span className="mb-3 inline-block font-mono text-[10px] uppercase tracking-[0.4em] text-gold">Kystene · live tall fra dagens feed</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground">Hvor på kysten?</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {costas.slice(0, 6).map((c) => (
                <Link key={c.slug} href={`/costas/${c.slug}`} className="rounded-sm border p-6 transition-colors hover:border-primary/40" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                  <div className="font-serif text-2xl font-light text-foreground">{c.costa}</div>
                  <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {c.count} nybygg · snittscore {c.avgScore}/100 · {c.avgYield}% brutto leieavkastning
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8">
              <Link href="/no/costa-blanca-eller-costa-del-sol" className="font-mono text-xs uppercase tracking-[0.22em] text-primary hover:underline">
                Costa Blanca eller Costa del Sol? Se sammenligningen →
              </Link>
            </div>
          </div>
        </section>

        {/* Why Norwegians use Avena */}
        <section className="border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
          <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
            <span className="mb-3 inline-block font-mono text-[10px] uppercase tracking-[0.4em] text-gold">Hvorfor Avena</span>
            <div className="mt-6 grid gap-8 md:grid-cols-3">
              {[
                ['Tall, ikke salgsprat', 'Hver bolig scores mot faktisk markedspris per kvadratmeter i sin egen by — beregnet på nytt hver natt. Du ser rabatten før du ser bildene.'],
                ['Hele markedet, ikke én meglers portefølje', `Feeden dekker ${total.toLocaleString('nb-NO')} nybygg fra en rekke utbyggere langs hele kysten — sortert etter verdi, ikke etter hvem som betaler for plassering.`],
                ['Norsk hele veien', 'Du kan gjøre hele prosessen på norsk — fra første spørsmål til overtakelse. Henvendelser besvares av vårt søsterselskap Xavia Estate, et registrert eiendomsforetak i Spania.'],
              ].map(([title, body]) => (
                <div key={title}>
                  <div className="font-serif text-xl font-light text-foreground">{title}</div>
                  <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Guide teaser + CTA */}
        <section className="border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
          <div className="mx-auto max-w-[900px] px-5 text-center sm:px-8">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground sm:text-4xl">
              Ny i det spanske markedet?
            </h2>
            <p className="mx-auto mt-5 max-w-xl font-light text-muted-foreground">
              NIE-nummer, kjøpskontrakt, omkostninger, finansiering og fallgruvene ved off-plan —
              hele prosessen forklart på norsk, steg for steg.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
              <Link href="/no/kjope-bolig-i-spania" className="inline-flex items-center gap-3 px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.35em] text-primary-foreground" style={{ background: 'hsl(var(--av-primary) / 0.9)' }}>
                Les kjøpsguiden →
              </Link>
              <Link href="/deals" className="inline-flex items-center gap-3 border px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.35em]" style={{ borderColor: 'hsl(var(--av-primary) / 0.45)', color: 'hsl(var(--av-primary) / 0.92)' }}>
                Se alle ukens funn
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

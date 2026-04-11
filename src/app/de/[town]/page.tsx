import { Metadata } from "next";
import Link from "next/link";
import { getUniqueTowns, getPropertiesByTown, avg, slugify } from "@/lib/properties";

export const revalidate = 86400;

export function generateStaticParams() {
  return getUniqueTowns().map((t) => ({ town: t.slug }));
}

function fmtEur(n: number): string {
  return "\u20AC" + Math.round(n).toLocaleString("de-DE");
}

function titleCase(s: string): string {
  return s
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: { params: Promise<{ town: string }> }): Promise<Metadata> {
  const { town } = await params;
  const townName = titleCase(town.replace(/-/g, " "));
  return {
    title: `Neubau in ${townName} — Preise & Rendite 2026 | Avena Terminal`,
    description: `Vollstaendige Analyse von Neubau-Immobilien in ${townName}, Spanien. Durchschnittspreise, Bruttorendite, Investmentbewertung und haeufige Fragen fuer Investoren.`,
    alternates: {
      canonical: `https://avenaterminal.com/de/${town}`,
      languages: {
        en: `https://avenaterminal.com/towns/${town}`,
        es: `https://avenaterminal.com/es/${town}`,
        nl: `https://avenaterminal.com/nl/${town}`,
      },
    },
    openGraph: {
      title: `Neubau in ${townName} — Preise & Rendite 2026`,
      description: `Immobilien-Investmentdaten fuer ${townName}. Preise, Rendite und Analyse 2026.`,
      url: `https://avenaterminal.com/de/${town}`,
      locale: "de_DE",
    },
  };
}

export default async function DeTownPage({ params }: { params: Promise<{ town: string }> }) {
  const { town: townSlug } = await params;
  const data = getPropertiesByTown(townSlug);
  if (!data) {
    return (
      <main className="min-h-screen bg-[#0d1117] text-gray-100 flex items-center justify-center">
        <p className="text-gray-400">Stadt nicht gefunden.</p>
      </main>
    );
  }

  const { town, properties } = data;
  const totalCount = properties.length;
  const avgPrice = avg(properties.map((p) => p.pf));
  const yieldsGross = properties.filter((p) => p._yield).map((p) => p._yield!.gross);
  const avgYield = avg(yieldsGross);
  const avgScore = avg(properties.filter((p) => p._sc).map((p) => p._sc!));
  const pricesPerM2 = properties.filter((p) => p.pm2 && p.pm2 > 0).map((p) => p.pm2!);
  const avgPm2 = avg(pricesPerM2);
  const types = [...new Set(properties.map((p) => p.t))].join(", ");

  const faqQuestions = [
    {
      q: `Was ist der Durchschnittspreis fuer Neubau-Immobilien in ${town}?`,
      a: `Der Durchschnittspreis fuer Neubau-Immobilien in ${town} betraegt ${fmtEur(avgPrice)}. Derzeit sind ${totalCount} Immobilien verfuegbar mit einem durchschnittlichen Quadratmeterpreis von ${fmtEur(avgPm2)}/m\u00B2. Verfuegbare Typen sind ${types}.`,
    },
    {
      q: `Welche Rendite kann man in ${town} erwarten?`,
      a: `Die durchschnittliche Bruttorendite in ${town} liegt bei ${avgYield.toFixed(1)}%. Wir schaetzen eine Nettorendite von ca. ${(avgYield * 0.67).toFixed(1)}% nach Steuern, Versicherung und Gemeinschaftskosten. Die durchschnittliche Investmentbewertung betraegt ${Math.round(avgScore)} von 100.`,
    },
    {
      q: `Ist ${town} ein guter Standort fuer Immobilieninvestitionen 2026?`,
      a: `${town} hat eine durchschnittliche Investmentbewertung von ${Math.round(avgScore)}/100 bei Avena Terminal. Mit ${totalCount} Neubau-Immobilien und einer Bruttorendite von ${avgYield.toFixed(1)}% bietet es Moeglichkeiten fuer Investoren, die Neubau-Immobilien an der spanischen Kueste suchen. Eine individuelle Analyse jeder Immobilie wird empfohlen.`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "de",
    mainEntity: faqQuestions.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-[#0d1117] text-gray-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <link
        rel="alternate"
        hrefLang="en"
        href={`https://avenaterminal.com/towns/${townSlug}`}
      />
      <link
        rel="alternate"
        hrefLang="es"
        href={`https://avenaterminal.com/es/${townSlug}`}
      />
      <link
        rel="alternate"
        hrefLang="nl"
        href={`https://avenaterminal.com/nl/${townSlug}`}
      />

      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link href="/de" className="text-emerald-400 hover:text-emerald-300 text-sm mb-6 inline-block">
          &larr; Zurueck zur Startseite
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-emerald-400 mb-2">
          Neubau in {town}
        </h1>
        <p className="text-gray-400 mb-12 text-sm">
          Preise und Rendite 2026 &middot; Avena Terminal
        </p>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <MiniStat label="Immobilien" value={totalCount.toString()} />
          <MiniStat label="Durchschn. Preis" value={fmtEur(avgPrice)} />
          <MiniStat label="Rendite" value={avgYield.toFixed(1) + "%"} />
          <MiniStat label="Bewertung" value={Math.round(avgScore).toString() + "/100"} />
        </section>

        {/* Analysis */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4 border-b border-gray-800 pb-2">
            Investmentanalyse
          </h2>
          <div className="bg-[#161b22] rounded-lg p-6 border border-gray-800 text-gray-300 leading-relaxed space-y-4">
            <p>
              {town} verfuegt ueber {totalCount} Neubau-Immobilien in der Datenbank von
              Avena Terminal. Der Durchschnittspreis liegt bei {fmtEur(avgPrice)}, mit einem
              durchschnittlichen Quadratmeterpreis von {fmtEur(avgPm2)}/m\u00B2. Verfuegbare
              Immobilientypen umfassen {types}.
            </p>
            <p>
              Die durchschnittliche Bruttorendite betraegt {avgYield.toFixed(1)}%, was einer
              geschaetzten Nettorendite von {(avgYield * 0.67).toFixed(1)}% nach Abzug lokaler
              Steuern (IBI), Versicherungen, Gemeinschaftskosten und Leerstandszeiten
              entspricht. Die durchschnittliche Investmentbewertung der Immobilien in {town}{" "}
              betraegt {Math.round(avgScore)} von 100, berechnet durch den proprietaeren
              Algorithmus von Avena Terminal, der Wert, Rendite, Lage, Bauqualitaet und Risiko
              gewichtet.
            </p>
            <p>
              Fuer internationale Investoren bietet {town} Zugang zur spanischen Kueste mit
              etablierter Infrastruktur. Es wird empfohlen, ausgewaehlte Immobilien zu
              besichtigen und einen auf Nichtresidenten-Investitionen in Spanien spezialisierten
              Steuerberater zu konsultieren, bevor eine Kaufentscheidung getroffen wird.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-6 border-b border-gray-800 pb-2">
            Haeufig gestellte Fragen
          </h2>
          <div className="space-y-6">
            {faqQuestions.map((faq, i) => (
              <div
                key={i}
                className="bg-[#161b22] rounded-lg p-6 border border-gray-800"
              >
                <h3 className="font-semibold text-emerald-300 mb-3">{faq.q}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <Link
            href={`/towns/${townSlug}`}
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Immobilien auf Englisch ansehen &rarr;
          </Link>
        </section>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#161b22] rounded-lg p-4 border border-gray-800 text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold text-emerald-400">{value}</p>
    </div>
  );
}

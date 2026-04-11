import { Metadata } from "next";
import Link from "next/link";
import { getUniqueTowns, getPropertiesByTown, avg, slugify } from "@/lib/properties";

export const revalidate = 86400;

export function generateStaticParams() {
  return getUniqueTowns().map((t) => ({ town: t.slug }));
}

function fmtEur(n: number): string {
  return "\u20AC" + Math.round(n).toLocaleString("nl-NL");
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
    title: `Nieuwbouw in ${townName} — Prijzen & Rendement 2026 | Avena Terminal`,
    description: `Volledige analyse van nieuwbouw vastgoed in ${townName}, Spanje. Gemiddelde prijzen, bruto rendement, investeringsscore en veelgestelde vragen voor investeerders.`,
    alternates: {
      canonical: `https://avenaterminal.com/nl/${town}`,
      languages: {
        en: `https://avenaterminal.com/towns/${town}`,
        es: `https://avenaterminal.com/es/${town}`,
        de: `https://avenaterminal.com/de/${town}`,
      },
    },
    openGraph: {
      title: `Nieuwbouw in ${townName} — Prijzen & Rendement 2026`,
      description: `Vastgoed investeringsdata voor ${townName}. Prijzen, rendement en analyse 2026.`,
      url: `https://avenaterminal.com/nl/${town}`,
      locale: "nl_NL",
    },
  };
}

export default async function NlTownPage({ params }: { params: Promise<{ town: string }> }) {
  const { town: townSlug } = await params;
  const data = getPropertiesByTown(townSlug);
  if (!data) {
    return (
      <main className="min-h-screen bg-[#0d1117] text-gray-100 flex items-center justify-center">
        <p className="text-gray-400">Stad niet gevonden.</p>
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
      q: `Wat is de gemiddelde prijs van nieuwbouw in ${town}?`,
      a: `De gemiddelde prijs van nieuwbouw in ${town} is ${fmtEur(avgPrice)}. Er zijn momenteel ${totalCount} woningen beschikbaar met een gemiddelde vierkante meterprijs van ${fmtEur(avgPm2)}/m\u00B2. Beschikbare types zijn ${types}.`,
    },
    {
      q: `Welk rendement kun je verwachten in ${town}?`,
      a: `Het gemiddelde bruto rendement in ${town} is ${avgYield.toFixed(1)}%. We schatten een netto rendement van ca. ${(avgYield * 0.67).toFixed(1)}% na belastingen, verzekeringen en gemeenschapskosten. De gemiddelde investeringsscore is ${Math.round(avgScore)} van 100.`,
    },
    {
      q: `Is ${town} een goede locatie om te investeren in 2026?`,
      a: `${town} heeft een gemiddelde investeringsscore van ${Math.round(avgScore)}/100 op Avena Terminal. Met ${totalCount} nieuwbouwwoningen en een bruto rendement van ${avgYield.toFixed(1)}% biedt het mogelijkheden voor investeerders die nieuwbouw aan de Spaanse kust zoeken. Een individuele analyse per woning wordt aanbevolen.`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "nl",
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
        hrefLang="de"
        href={`https://avenaterminal.com/de/${townSlug}`}
      />

      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link href="/nl" className="text-emerald-400 hover:text-emerald-300 text-sm mb-6 inline-block">
          &larr; Terug naar startpagina
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-emerald-400 mb-2">
          Nieuwbouw in {town}
        </h1>
        <p className="text-gray-400 mb-12 text-sm">
          Prijzen en Rendement 2026 &middot; Avena Terminal
        </p>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <MiniStat label="Woningen" value={totalCount.toString()} />
          <MiniStat label="Gem. Prijs" value={fmtEur(avgPrice)} />
          <MiniStat label="Rendement" value={avgYield.toFixed(1) + "%"} />
          <MiniStat label="Score" value={Math.round(avgScore).toString() + "/100"} />
        </section>

        {/* Analysis */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4 border-b border-gray-800 pb-2">
            Investeringsanalyse
          </h2>
          <div className="bg-[#161b22] rounded-lg p-6 border border-gray-800 text-gray-300 leading-relaxed space-y-4">
            <p>
              {town} heeft {totalCount} nieuwbouwwoningen in de database van Avena Terminal.
              De gemiddelde prijs is {fmtEur(avgPrice)}, met een gemiddelde vierkante meterprijs
              van {fmtEur(avgPm2)}/m\u00B2. Beschikbare woningtypes zijn {types}.
            </p>
            <p>
              Het gemiddelde bruto rendement bedraagt {avgYield.toFixed(1)}%, wat neerkomt op
              een geschat netto rendement van {(avgYield * 0.67).toFixed(1)}% na aftrek van
              lokale belastingen (IBI), verzekeringen, gemeenschapskosten en leegstandsperiodes.
              De gemiddelde investeringsscore van woningen in {town} is {Math.round(avgScore)}{" "}
              van 100, berekend door het eigen algoritme van Avena Terminal dat waarde,
              rendement, locatie, bouwkwaliteit en risico weegt.
            </p>
            <p>
              Voor internationale investeerders biedt {town} toegang tot de Spaanse kust met
              gevestigde infrastructuur. Het wordt aanbevolen om geselecteerde woningen te
              bezichtigen en een belastingadviseur te raadplegen die gespecialiseerd is in
              niet-ingezetenen investeringen in Spanje voordat u een aankoopbeslissing neemt.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-6 border-b border-gray-800 pb-2">
            Veelgestelde Vragen
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
            Bekijk woningen in het Engels &rarr;
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

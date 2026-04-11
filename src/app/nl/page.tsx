import { Metadata } from "next";
import Link from "next/link";
import { getAllProperties, getUniqueTowns, avg, slugify } from "@/lib/properties";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Nieuwbouw Spanje — Vastgoed Investering | Avena Terminal",
  description:
    "Analyseer en vergelijk 1.881 nieuwbouwwoningen aan de Costa Blanca, Costa Calida en Costa del Sol. Rendement, prijs per m2 en investeringsscore. Spanje's eerste PropTech-terminal.",
  alternates: {
    canonical: "https://avenaterminal.com/nl",
    languages: {
      en: "https://avenaterminal.com",
      es: "https://avenaterminal.com/es",
      de: "https://avenaterminal.com/de",
    },
  },
  openGraph: {
    title: "Nieuwbouw Spanje — Vastgoed Investering | Avena Terminal",
    description:
      "Analyseer en vergelijk nieuwbouw vastgoed aan de Spaanse kust. Rendement, prijs per m2 en investeringsscore.",
    url: "https://avenaterminal.com/nl",
    locale: "nl_NL",
  },
};

function fmtEur(n: number): string {
  return "\u20AC" + Math.round(n).toLocaleString("nl-NL");
}

export default function NlHomePage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const totalProperties = all.length;
  const avgPrice = avg(all.map((p) => p.pf));
  const avgYield = avg(all.filter((p) => p._yield).map((p) => p._yield!.gross));
  const topTowns = towns.slice(0, 12);

  return (
    <main className="min-h-screen bg-[#0d1117] text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Hero */}
        <section className="text-center mb-16">
          <h1 className="text-3xl md:text-5xl font-bold text-emerald-400 mb-4">
            Spanje&apos;s eerste PropTech investeringsterminal
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            1.881 nieuwbouwwoningen beoordeeld. Rendement. Prijs. Alles in een terminal.
          </p>
          <Link
            href="/"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Vastgoed verkennen &rarr;
          </Link>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <StatCard label="Woningen" value={totalProperties.toLocaleString("nl-NL")} />
          <StatCard label="Gem. Prijs" value={fmtEur(avgPrice)} />
          <StatCard label="Gem. Rendement" value={avgYield.toFixed(1) + "%"} />
        </section>

        {/* Top Towns */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-emerald-400 mb-6 border-b border-gray-800 pb-2">
            Top Steden
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topTowns.map((t) => (
              <Link
                key={t.slug}
                href={`/nl/${t.slug}`}
                className="bg-[#161b22] rounded-lg p-4 border border-gray-800 hover:border-emerald-600 transition-colors"
              >
                <h3 className="font-semibold text-emerald-300 mb-2">{t.town}</h3>
                <div className="font-mono text-sm text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Woningen</span>
                    <span className="text-gray-200">{t.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gem. Prijs</span>
                    <span className="text-gray-200">{fmtEur(t.avgPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rendement</span>
                    <span className="text-emerald-400">{t.avgYield}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Score</span>
                    <span className="text-gray-200">{t.avgScore}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <Link
            href="/"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Vastgoed verkennen &rarr;
          </Link>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#161b22] rounded-lg p-6 border border-gray-800 text-center">
      <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-emerald-400">{value}</p>
    </div>
  );
}

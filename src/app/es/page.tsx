import { Metadata } from "next";
import Link from "next/link";
import { getAllProperties, getUniqueTowns, avg, slugify } from "@/lib/properties";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Inversiones Inmobiliarias Espana — Avena Terminal | 1.881 Propiedades",
  description:
    "Analiza y compara 1.881 obra nueva en Costa Blanca, Costa Calida y Costa del Sol. Rentabilidad, precio por m2 y puntuacion de inversion. El primer terminal PropTech de Espana.",
  alternates: {
    canonical: "https://avenaterminal.com/es",
    languages: { en: "https://avenaterminal.com", de: "https://avenaterminal.com/de", nl: "https://avenaterminal.com/nl" },
  },
  openGraph: {
    title: "Inversiones Inmobiliarias Espana — Avena Terminal",
    description:
      "Analiza y compara obra nueva en la costa espanola. Rentabilidad, precio por m2 y puntuacion de inversion.",
    url: "https://avenaterminal.com/es",
    locale: "es_ES",
  },
};

function fmtEur(n: number): string {
  return "€" + Math.round(n).toLocaleString("es-ES");
}

export default function EsHomePage() {
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
            El Terminal de Inversion Inmobiliaria de Espana
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            Analiza {totalProperties.toLocaleString("es-ES")} obra nueva en la costa
            espanola. Rentabilidad, precios y puntuacion de inversion en tiempo real.
          </p>
          <Link
            href="/"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Explorar propiedades &rarr;
          </Link>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <StatCard label="Total Propiedades" value={totalProperties.toLocaleString("es-ES")} />
          <StatCard label="Precio Medio" value={fmtEur(avgPrice)} />
          <StatCard label="Rentabilidad Media" value={avgYield.toFixed(1) + "%"} />
        </section>

        {/* Top Towns */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-emerald-400 mb-6 border-b border-gray-800 pb-2">
            Ciudades Principales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topTowns.map((t) => (
              <Link
                key={t.slug}
                href={`/es/${t.slug}`}
                className="bg-[#161b22] rounded-lg p-4 border border-gray-800 hover:border-emerald-600 transition-colors"
              >
                <h3 className="font-semibold text-emerald-300 mb-2">{t.town}</h3>
                <div className="font-mono text-sm text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Propiedades</span>
                    <span className="text-gray-200">{t.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Precio Medio</span>
                    <span className="text-gray-200">{fmtEur(t.avgPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rentabilidad</span>
                    <span className="text-emerald-400">{t.avgYield}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Puntuacion</span>
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
            Explorar propiedades &rarr;
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

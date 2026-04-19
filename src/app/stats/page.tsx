import { Metadata } from "next";
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from "@/lib/properties";
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Spanish Property Market Statistics 2026 — Avena Terminal Data",
  description:
    "Comprehensive 2026 statistics on Spain new build property prices, rental yields, and investment scores across Costa Blanca, Costa Calida, and Costa del Sol.",
  keywords: [
    "spanish property statistics 2026",
    "spain property market data",
    "costa blanca property stats",
    "spain rental yield statistics",
    "new build prices spain 2026",
    "spanish real estate data",
  ],
  openGraph: {
    title: "Spanish Property Market Statistics 2026 — Avena Terminal Data",
    description:
      "Comprehensive 2026 statistics on Spain new build property prices, rental yields, and investment scores.",
    url: "https://avenaterminal.com/stats",
  },
  other: {
    'article:modified_time': new Date().toISOString(),
  },
};

function fmt(n: number): string {
  return n.toLocaleString("en-GB");
}

function fmtEur(n: number): string {
  return "€" + Math.round(n).toLocaleString("en-GB");
}

const REGIONS: { key: string; label: string }[] = [
  { key: "cb-south", label: "Costa Blanca South" },
  { key: "cb-north", label: "Costa Blanca North" },
  { key: "costa-calida", label: "Costa Calida" },
  { key: "costa-del-sol", label: "Costa del Sol" },
];

export default function StatsPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  const totalProperties = all.length;
  const avgPrice = avg(all.map((p) => p.pf));
  const avgYield = avg(all.filter((p) => p._yield).map((p) => p._yield!.gross));
  const avgNetYield = avgYield * 0.67;

  const pricesPerM2 = all.filter((p) => p.pm2 && p.pm2 > 0).map((p) => p.pm2!);
  const avgPricePerM2 = avg(pricesPerM2);

  const propertiesAbove80 = all.filter((p) => p._sc && p._sc > 80).length;

  const bestRegionByYield = costas.length
    ? costas.reduce((a, b) => (b.avgYield > a.avgYield ? b : a))
    : null;

  const townsWithYield = towns.filter((t) => t.avgYield > 0);
  const highestYieldTown = townsWithYield.length
    ? townsWithYield.reduce((a, b) => (b.avgYield > a.avgYield ? b : a))
    : null;

  const townsWithPrice = towns.filter((t) => t.avgPrice > 0);
  const lowestPriceTown = townsWithPrice.length
    ? townsWithPrice.reduce((a, b) => (a.avgPrice < b.avgPrice ? a : b))
    : null;

  const regionData = REGIONS.map((region) => {
    const regionProps = all.filter((p) => p.r === region.key);
    const regionTowns = new Map<string, typeof regionProps>();
    for (const p of regionProps) {
      if (!p.l) continue;
      if (!regionTowns.has(p.l)) regionTowns.set(p.l, []);
      regionTowns.get(p.l)!.push(p);
    }
    const townList = [...regionTowns.entries()]
      .map(([name, props]) => ({
        name,
        count: props.length,
        avgPrice: avg(props.map((p) => p.pf)),
        avgYield: avg(props.filter((p) => p._yield).map((p) => p._yield!.gross)),
        avgScore: avg(props.filter((p) => p._sc).map((p) => p._sc!)),
      }))
      .sort((a, b) => b.avgYield - a.avgYield)
      .slice(0, 3);
    return {
      ...region,
      count: regionProps.length,
      avgPrice: avg(regionProps.map((p) => p.pf)),
      avgYield: avg(regionProps.filter((p) => p._yield).map((p) => p._yield!.gross)),
      avgScore: avg(regionProps.filter((p) => p._sc).map((p) => p._sc!)),
      top3: townList,
    };
  });

  const now = new Date().toISOString().split("T")[0];

  const summaryStats = [
    { label: 'Properties', value: fmt(totalProperties) },
    { label: 'Avg Price', value: fmtEur(avgPrice) },
    { label: 'Avg Gross Yield', value: avgYield.toFixed(1) + '%' },
    { label: 'Avg Net Yield', value: avgNetYield.toFixed(1) + '%' },
    { label: 'Avg Price / m²', value: fmtEur(avgPricePerM2) },
    { label: 'Score 80+', value: fmt(propertiesAbove80) },
    { label: 'Best Region', value: bestRegionByYield ? `${bestRegionByYield.costa}` : 'N/A' },
    { label: 'Top Yield Town', value: highestYieldTown ? highestYieldTown.town : 'N/A' },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Spain New Build Property Market Statistics 2026",
    description:
      "Comprehensive dataset of new build property prices, rental yields, and investment scores across coastal Spain.",
    url: "https://avenaterminal.com/stats",
    creator: { "@type": "Organization", name: "Avena Terminal" },
    dateModified: now,
    license: "https://creativecommons.org/licenses/by/4.0/",
    spatialCoverage: "Spain",
    temporalCoverage: "2026",
    variableMeasured: [
      "Property Price",
      "Rental Yield",
      "Investment Score",
      "Price per Square Meter",
    ],
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["#headline", "#summary-stats"],
    },
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Statistics · 2026
              </span>
              <h1 id="headline" className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Market stats.
                <br />
                <span className="italic text-gold">Live</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Comprehensive 2026 statistics on Spain new build property prices, rental yields, and investment scores across coastal regions.
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Avena Terminal Data · Updated {now}
              </p>
            </div>
          </div>
        </section>

        {/* Summary Stats */}
        <section id="summary-stats" className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Market Overview
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light leading-[1] tracking-tight text-foreground">
                A snapshot of the market.
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
              {summaryStats.map(s => (
                <div key={s.label} className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-serif text-2xl md:text-3xl font-light tabular text-foreground truncate">{s.value}</div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-sm border p-5 font-mono text-sm space-y-1" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <Row label="Lowest Price Town" value={lowestPriceTown ? `${lowestPriceTown.town} · ${fmtEur(lowestPriceTown.avgPrice)}` : "N/A"} />
              <Row label="Best Region (Yield)" value={bestRegionByYield ? `${bestRegionByYield.costa} · ${bestRegionByYield.avgYield}%` : "N/A"} />
              <Row label="Highest Yield Town" value={highestYieldTown ? `${highestYieldTown.town} · ${highestYieldTown.avgYield}%` : "N/A"} />
            </div>
          </div>
        </section>

        {/* Regional Breakdown */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Regional Breakdown
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light leading-[1] tracking-tight text-foreground">
                Four coasts, four markets.
              </h2>
            </div>

            <div className="space-y-6">
              {regionData.map((region) => (
                <div
                  key={region.key}
                  className="rounded-sm border p-6"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <h3 className="font-serif text-xl text-foreground mb-4">{region.label}</h3>
                  <div className="font-mono text-sm space-y-1 mb-4">
                    <Row label="Properties" value={fmt(region.count)} />
                    <Row label="Avg Price" value={fmtEur(region.avgPrice)} />
                    <Row label="Avg Gross Yield" value={region.avgYield.toFixed(1) + "%"} />
                    <Row label="Avg Score" value={Math.round(region.avgScore).toString()} />
                  </div>
                  {region.top3.length > 0 && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-3">
                        Top 3 Towns by Yield
                      </p>
                      <div className="font-mono text-sm space-y-1">
                        {region.top3.map((town, i) => (
                          <div key={town.name} className="flex justify-between gap-4 text-muted-foreground">
                            <span className="whitespace-nowrap text-foreground">
                              {i + 1}. {town.name}
                            </span>
                            <span className="text-primary whitespace-nowrap">
                              {town.avgYield.toFixed(1)}% · {fmtEur(town.avgPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Costa Summary */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Costa Summary
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light leading-[1] tracking-tight text-foreground">
                Costa by costa.
              </h2>
            </div>
            <div className="rounded-sm border p-6 font-mono text-sm space-y-1" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              {costas.map((c) => (
                <div key={c.costa} className="flex justify-between gap-4">
                  <span className="whitespace-nowrap text-foreground">{c.costa}</span>
                  <span className="text-primary whitespace-nowrap">
                    {c.count} props · {c.avgYield}% yield · Score {c.avgScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Citation */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Citation
            </span>
            <div className="rounded-sm border p-5 font-mono text-xs text-muted-foreground break-words select-all" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <p>
                Avena Terminal. &quot;Spanish Property Market Statistics 2026.&quot; avenaterminal.com/stats. Accessed {now}.
              </p>
              <p className="mt-2">
                Data sourced from {fmt(totalProperties)} new build listings across {towns.length} towns in coastal Spain.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="text-foreground text-right whitespace-nowrap">{value}</span>
    </div>
  );
}

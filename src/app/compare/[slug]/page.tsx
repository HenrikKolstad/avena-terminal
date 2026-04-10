import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, slugify, avg } from '@/lib/properties';
import { Property } from '@/lib/types';

export const revalidate = 86400;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const TOP_N = 30;

function townStats(props: Property[]) {
  const prices = props.map(p => p.pf);
  const yields = props.filter(p => p._yield).map(p => p._yield!.gross);
  const discounts = props.filter(p => p.pm2 && p.mm2 > 0).map(p => ((p.mm2 - p.pm2!) / p.mm2) * 100);
  const scores = props.filter(p => p._sc).map(p => p._sc!);
  return {
    count: props.length,
    avgPrice: Math.round(avg(prices)),
    avgYield: Number(avg(yields).toFixed(1)),
    avgDiscount: Number(avg(discounts).toFixed(1)),
    avgScore: Math.round(avg(scores)),
  };
}

function getTop30Towns() {
  return getUniqueTowns().slice(0, TOP_N);
}

function generatePairs() {
  const towns = getTop30Towns();
  const pairs: { slugA: string; slugB: string }[] = [];
  for (let i = 0; i < towns.length; i++) {
    for (let j = i + 1; j < towns.length; j++) {
      pairs.push({ slugA: towns[i].slug, slugB: towns[j].slug });
    }
  }
  return pairs;
}

function parseTownsFromSlug(slug: string) {
  const parts = slug.split('-vs-');
  if (parts.length !== 2) return null;
  const [slugA, slugB] = parts;
  const all = getAllProperties();

  const propsA = all.filter(p => slugify(p.l) === slugA);
  const propsB = all.filter(p => slugify(p.l) === slugB);
  if (!propsA.length || !propsB.length) return null;

  return {
    nameA: propsA[0].l,
    nameB: propsB[0].l,
    slugA,
    slugB,
    propsA,
    propsB,
  };
}

/* ------------------------------------------------------------------ */
/*  Static params + metadata                                          */
/* ------------------------------------------------------------------ */

export async function generateStaticParams() {
  return generatePairs().map(({ slugA, slugB }) => ({
    slug: `${slugA}-vs-${slugB}`,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = parseTownsFromSlug(slug);
  if (!data) return { title: 'Comparison Not Found | Avena Terminal' };
  const { nameA, nameB } = data;
  const title = `${nameA} vs ${nameB} — Property Investment Comparison | Avena Terminal`;
  const description = `Side-by-side comparison of new-build property investments in ${nameA} and ${nameB}, Spain. Compare average prices, rental yields, discounts, and investment scores.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://avenaterminal.com/compare/${slug}`,
      siteName: 'Avena Terminal',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = parseTownsFromSlug(slug);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: '#0d1117' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Comparison Not Found</h1>
          <Link href="/" className="text-emerald-400">Back to Terminal</Link>
        </div>
      </div>
    );
  }

  const { nameA, nameB, slugA, slugB, propsA, propsB } = data;
  const statsA = townStats(propsA);
  const statsB = townStats(propsB);

  const winnerName = statsA.avgScore >= statsB.avgScore ? nameA : nameB;
  const winnerScore = Math.max(statsA.avgScore, statsB.avgScore);
  const loserScore = Math.min(statsA.avgScore, statsB.avgScore);

  /* ----- structured data ----- */
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Is ${nameA} or ${nameB} better for property investment?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Based on current data, ${winnerName} scores higher with an average investment score of ${winnerScore}/100 compared to ${loserScore}/100. However, both towns offer unique advantages depending on budget and yield expectations.`,
        },
      },
      {
        '@type': 'Question',
        name: `What is the average property price in ${nameA} versus ${nameB}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The average new-build price in ${nameA} is €${statsA.avgPrice.toLocaleString()}, while ${nameB} averages €${statsB.avgPrice.toLocaleString()}.`,
        },
      },
      {
        '@type': 'Question',
        name: `Which town has higher rental yields — ${nameA} or ${nameB}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${statsA.avgYield >= statsB.avgYield ? nameA : nameB} currently offers a higher average gross rental yield at ${Math.max(statsA.avgYield, statsB.avgYield)}% compared to ${Math.min(statsA.avgYield, statsB.avgYield)}%.`,
        },
      },
    ],
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://avenaterminal.com/compare' },
      { '@type': 'ListItem', position: 3, name: `${nameA} vs ${nameB}` },
    ],
  };

  /* ----- comparison rows ----- */
  const rows: { label: string; a: string; b: string; winA: boolean; winB: boolean }[] = [
    {
      label: 'Listings',
      a: String(statsA.count),
      b: String(statsB.count),
      winA: statsA.count > statsB.count,
      winB: statsB.count > statsA.count,
    },
    {
      label: 'Avg Price',
      a: `€${statsA.avgPrice.toLocaleString()}`,
      b: `€${statsB.avgPrice.toLocaleString()}`,
      winA: statsA.avgPrice < statsB.avgPrice,
      winB: statsB.avgPrice < statsA.avgPrice,
    },
    {
      label: 'Avg Gross Yield',
      a: `${statsA.avgYield}%`,
      b: `${statsB.avgYield}%`,
      winA: statsA.avgYield > statsB.avgYield,
      winB: statsB.avgYield > statsA.avgYield,
    },
    {
      label: 'Avg Discount',
      a: `${statsA.avgDiscount}%`,
      b: `${statsB.avgDiscount}%`,
      winA: statsA.avgDiscount > statsB.avgDiscount,
      winB: statsB.avgDiscount > statsA.avgDiscount,
    },
    {
      label: 'Avg Score',
      a: `${statsA.avgScore}/100`,
      b: `${statsB.avgScore}/100`,
      winA: statsA.avgScore > statsB.avgScore,
      winB: statsB.avgScore > statsA.avgScore,
    },
  ];

  /* ----- analysis text ----- */
  const priceDiff = Math.abs(statsA.avgPrice - statsB.avgPrice);
  const cheaperTown = statsA.avgPrice <= statsB.avgPrice ? nameA : nameB;
  const yieldWinner = statsA.avgYield >= statsB.avgYield ? nameA : nameB;
  const yieldLoser = statsA.avgYield >= statsB.avgYield ? nameB : nameA;

  const analysis = `When comparing ${nameA} and ${nameB} as property investment destinations on Spain's coast, several key differences emerge. ${cheaperTown} is the more affordable option, with average new-build prices approximately €${priceDiff.toLocaleString()} lower. This price advantage can make a significant difference for investors working within a fixed budget or seeking higher leverage.

In terms of rental income, ${yieldWinner} edges ahead with an average gross yield of ${Math.max(statsA.avgYield, statsB.avgYield)}%, while ${yieldLoser} sits at ${Math.min(statsA.avgYield, statsB.avgYield)}%. The yield gap reflects differences in purchase prices relative to achievable rental rates in each area.

Overall, ${winnerName} takes the lead with an average investment score of ${winnerScore}/100, factoring in value, yield potential, location quality, developer track record, and market positioning. That said, both towns have compelling listings — the best strategy is to shortlist properties in each location and compare them on a deal-by-deal basis. Market conditions shift, and today's underdog can become tomorrow's hotspot.`;

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([faqJsonLd, breadcrumbJsonLd]) }}
      />

      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 backdrop-blur-sm"
        style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent"
          >
            AVENA
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back to Terminal
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumbs */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-white">{nameA} vs {nameB}</span>
        </nav>

        {/* H1 */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          {nameA} vs {nameB} — Investment Comparison
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Side-by-side comparison of {statsA.count + statsB.count} new-build properties across both towns.
        </p>

        {/* Winner banner */}
        <div
          className="rounded-xl border p-5 mb-8 text-center"
          style={{ background: '#0f1419', borderColor: '#1c2333' }}
        >
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Overall Winner</div>
          <div className="text-2xl font-bold text-emerald-400">{winnerName}</div>
          <div className="text-gray-400 text-sm mt-1">
            Average investment score {winnerScore}/100 vs {loserScore}/100
          </div>
        </div>

        {/* Comparison table */}
        <div className="rounded-xl border overflow-hidden mb-10" style={{ borderColor: '#1c2333' }}>
          {/* Table header */}
          <div
            className="grid grid-cols-3 text-xs uppercase tracking-wider text-gray-500 px-4 py-3"
            style={{ background: '#0f1419' }}
          >
            <div>Metric</div>
            <div className="text-center">{nameA}</div>
            <div className="text-center">{nameB}</div>
          </div>

          {rows.map((row, i) => (
            <div
              key={row.label}
              className="grid grid-cols-3 px-4 py-3 border-t text-sm"
              style={{ borderColor: '#1c2333', background: i % 2 === 0 ? '#0d1117' : '#0f1419' }}
            >
              <div className="text-gray-400 font-medium">{row.label}</div>
              <div className={`text-center font-semibold ${row.winA ? 'text-emerald-400' : 'text-white'}`}>
                {row.a}
              </div>
              <div className={`text-center font-semibold ${row.winB ? 'text-emerald-400' : 'text-white'}`}>
                {row.b}
              </div>
            </div>
          ))}
        </div>

        {/* Analysis */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Analysis</h2>
          <div
            className="rounded-xl border p-6 text-gray-300 text-sm leading-relaxed space-y-4"
            style={{ background: '#0f1419', borderColor: '#1c2333' }}
          >
            {analysis.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>

        {/* Links to town pages */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Explore Each Town</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: nameA, slug: slugA, stats: statsA },
              { name: nameB, slug: slugB, stats: statsB },
            ].map(({ name, slug: s, stats }) => (
              <Link
                key={s}
                href={`/towns/${s}`}
                className="rounded-xl border p-5 hover:border-emerald-500/30 transition-all block"
                style={{ background: '#0f1419', borderColor: '#1c2333' }}
              >
                <div className="text-white font-bold mb-1">{name}</div>
                <div className="text-gray-500 text-xs">
                  {stats.count} listings &middot; Score {stats.avgScore}/100 &middot; Yield {stats.avgYield}%
                </div>
              </Link>
            ))}
          </div>
        </section>

        <p className="text-[9px] text-gray-600 text-right mt-4">Data last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12" style={{ borderColor: '#1c2333' }}>
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <span className="font-serif tracking-[0.15em] text-gray-400">AVENA</span>
          <span>Data-driven property investment intelligence for Spain&apos;s coast.</span>
          <div className="flex gap-4">
            <Link href="/towns" className="hover:text-white transition-colors">Towns</Link>
            <Link href="/costas" className="hover:text-white transition-colors">Costas</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

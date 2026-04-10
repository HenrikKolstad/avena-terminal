'use client';

import Link from 'next/link';

const tools = [
  {
    title: 'Mortgage Calculator',
    description: 'Estimate monthly mortgage payments, total interest and loan-to-value for Spanish property purchases.',
    href: '/tools/mortgage-calculator',
    icon: '\uD83C\uDFE0',
  },
  {
    title: 'Property Tax Calculator',
    description: 'Calculate IVA, ITP, stamp duty, notary, registry and legal fees when buying property in Spain.',
    href: '/tools/tax-calculator',
    icon: '\uD83D\uDCCB',
  },
  {
    title: 'ROI Calculator',
    description: 'Model gross yield, net yield, annual cashflow and a full 10-year year-by-year projection.',
    href: '/tools/roi-calculator',
    icon: '\uD83D\uDCC8',
  },
];

export default function ToolsIndexPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <title>Free Spanish Property Investment Tools | Avena Terminal</title>
      <meta name="description" content="Free tools for Spanish property investors. Mortgage calculator, tax calculator, and ROI calculator for new build properties in Spain." />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/" className="text-[#10B981] hover:underline text-sm mb-6 inline-block">&larr; Home</Link>

        <h1 className="text-3xl md:text-4xl font-bold mb-2">Property Investment Tools</h1>
        <p className="text-gray-400 mb-10 max-w-2xl">
          Free calculators to help you estimate costs, returns and financing for Spanish property investments.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map(tool => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group bg-[#161b22] border border-[#30363d] rounded-xl p-6 hover:border-[#10B981] transition-all hover:shadow-lg hover:shadow-[#10B981]/5"
            >
              <div className="text-3xl mb-4">{tool.icon}</div>
              <h2 className="text-lg font-semibold mb-2 group-hover:text-[#10B981] transition">{tool.title}</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{tool.description}</p>
              <span className="inline-block mt-4 text-sm text-[#10B981] group-hover:underline">Open tool &rarr;</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

function ScoreFactor({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-[#0f1419] rounded-lg p-3">
      <h4 className="text-emerald-300 text-sm font-semibold mb-1">{title}</h4>
      <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

export default function AboutTab() {
  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-6">
        <h3 className="font-serif text-lg text-emerald-400 mb-3">How the AVENA Deal Score Works</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-4">
          Each property is scored 0-100 based on five weighted factors designed to identify the best investment opportunities:
        </p>
        <div className="space-y-3">
          <ScoreFactor title="Price vs Market (40%)" desc="Compares the property's €/m² against regional market averages. Bigger discounts = higher scores." />
          <ScoreFactor title="Off-Plan Potential (20%)" desc="Off-plan properties score higher due to capital appreciation potential during construction. Later completion dates score even higher." />
          <ScoreFactor title="Value Density (15%)" desc="For plots: price per m² of land. For apartments: built area relative to price. More space per euro = better." />
          <ScoreFactor title="Location Premium (15%)" desc="Beach proximity is a key driver. Properties under 500m from the coast get maximum points." />
          <ScoreFactor title="Developer Track Record (10%)" desc="Established developers (30+ years) score higher, reducing construction and quality risk." />
        </div>
      </div>
    </div>
  );
}

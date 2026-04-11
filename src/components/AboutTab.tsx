'use client';

export default function AboutTab() {
  return (
    <div className="px-4 md:px-10 py-10 max-w-4xl mx-auto" style={{ background: '#0d0d14' }}>
      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-extralight tracking-[0.2em] text-white mb-2">The Avena Scoring Model</h1>
      <p className="text-sm text-gray-400 leading-relaxed mb-10 max-w-3xl">
        A hedonic pricing model applied to 1,881 active new build properties across Costa Blanca, Costa Calida and Costa del Sol. Each property receives a score from 0&ndash;100, computed as a weighted linear combination of five orthogonal factor scores.
      </p>

      <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

      {/* FACTOR 1 */}
      <section className="mb-10">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Factor 1</span>
          <span className="text-white font-semibold">Price vs Market</span>
          <span className="text-gray-500 text-xs font-mono">40% weight</span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed mb-4">
          The core signal. For each property, we compute the implied &euro;/m&sup2; (list price &divide; built area) and benchmark it against a hyperlocal market reference derived from transaction-level comparables at postal code granularity &mdash; not provincial averages, which carry insufficient resolution for investment-grade analysis.
        </p>
        <p className="text-sm text-gray-300 leading-relaxed mb-4">
          The discount coefficient &delta; is defined as:
        </p>
        <div className="rounded-lg p-4 mb-4 font-mono text-sm" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
          <span className="text-emerald-400">&delta;</span> <span className="text-gray-500">=</span> <span className="text-gray-300">(market_pm2 - asking_pm2)</span> <span className="text-gray-500">/</span> <span className="text-gray-300">market_pm2</span>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">
          Positive &delta; indicates structural underpricing relative to the local market. The value score is a monotonic function of &delta;, capped at 20% to prevent outlier contamination from distressed or anomalous listings. Properties priced above market receive penalised scores below 35.
        </p>
      </section>

      <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

      {/* FACTOR 2 */}
      <section className="mb-10">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Factor 2</span>
          <span className="text-white font-semibold">Rental Yield Potential</span>
          <span className="text-gray-500 text-xs font-mono">25% weight</span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed mb-4">
          Gross yield is estimated from a bottom-up ADR model calibrated against AirDNA short-term rental data, segmented by property type, bedroom count, beach proximity band, and new build premium. Net yield is derived by applying Spanish fiscal costs: 19% IRNR (non-resident income tax), community fees (&euro;800&ndash;3,000/yr), IBI (0.3% cadastral), insurance (&euro;400/yr), and a 15% property management load.
        </p>
        <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid #1c2333' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#090d12' }}>
                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-gray-500 font-medium">Net Yield</th>
                <th className="text-right px-4 py-2 text-xs uppercase tracking-wider text-gray-500 font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr style={{ background: '#0d0d14' }}><td className="px-4 py-2 text-gray-300">&ge; 7%</td><td className="px-4 py-2 text-right font-semibold text-emerald-400">100</td></tr>
              <tr style={{ background: '#0a0f15' }}><td className="px-4 py-2 text-gray-300">5 &ndash; 7%</td><td className="px-4 py-2 text-right font-semibold text-emerald-400">80</td></tr>
              <tr style={{ background: '#0d0d14' }}><td className="px-4 py-2 text-gray-300">4 &ndash; 5%</td><td className="px-4 py-2 text-right font-semibold" style={{ color: '#fbbf24' }}>60</td></tr>
              <tr style={{ background: '#0a0f15' }}><td className="px-4 py-2 text-gray-300">3 &ndash; 4%</td><td className="px-4 py-2 text-right font-semibold" style={{ color: '#f59e0b' }}>40</td></tr>
              <tr style={{ background: '#0d0d14' }}><td className="px-4 py-2 text-gray-300">&lt; 3%</td><td className="px-4 py-2 text-right font-semibold text-red-400">Penalised</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

      {/* FACTOR 3 */}
      <section className="mb-10">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Factor 3</span>
          <span className="text-white font-semibold">Location Quality</span>
          <span className="text-gray-500 text-xs font-mono">20% weight</span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed mb-4">
          Location is decomposed into four sub-signals: coastal proximity (beach distance in km), view premium (sea, mountain, open), amenity density (golf, urban, frontline), and regional climate index. Each sub-signal contributes additively to a location score capped at 100.
        </p>
        <p className="text-sm text-gray-400 leading-relaxed">
          Beach distance follows an exponential decay function &mdash; the marginal value of proximity is highest sub-500m and flattens beyond 2km, consistent with observed market pricing behaviour in the Costa Blanca transaction dataset.
        </p>
      </section>

      <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

      {/* FACTOR 4 */}
      <section className="mb-10">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Factor 4</span>
          <span className="text-white font-semibold">Build Quality</span>
          <span className="text-gray-500 text-xs font-mono">10% weight</span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          A quality index derived from observable property attributes: energy performance certificate (A&ndash;G scale, mapped to 0&ndash;30 points), pool configuration (private &gt; communal), parking provision, and plot-to-built-area ratio. Baseline score is 40 &mdash; properties must actively signal quality to score above median.
        </p>
      </section>

      <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

      {/* FACTOR 5 */}
      <section className="mb-10">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Factor 5</span>
          <span className="text-white font-semibold">Completion Risk</span>
          <span className="text-gray-500 text-xs font-mono">5% weight</span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          A risk-adjusted discount applied based on delivery timeline and developer operational history. Key-ready properties carry minimal execution risk. Off-plan completions beyond 24 months are penalised for duration risk and developer default probability, the latter proxied by years of operational history &mdash; pre-2005 cohort vs post-2015 entrants carry materially different risk profiles based on 2008&ndash;2012 cycle data.
        </p>
      </section>

      <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

      {/* COMPOSITE FORMULA */}
      <section className="mb-10">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Composite Score Formula</h2>
        <div className="rounded-lg p-6 font-mono text-center mb-4" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
          <div className="text-lg md:text-xl text-white mb-4">
            <span className="text-emerald-400">S</span> = <span className="text-gray-400">0.40</span>&middot;<span className="text-white">V</span> + <span className="text-gray-400">0.25</span>&middot;<span className="text-white">Y</span> + <span className="text-gray-400">0.20</span>&middot;<span className="text-white">L</span> + <span className="text-gray-400">0.10</span>&middot;<span className="text-white">Q</span> + <span className="text-gray-400">0.05</span>&middot;<span className="text-white">R</span>
          </div>
          <div className="text-xs text-gray-500 space-y-1 text-left max-w-xs mx-auto">
            <div><span className="text-white">V</span> = Value (Price vs Market)</div>
            <div><span className="text-white">Y</span> = Yield</div>
            <div><span className="text-white">L</span> = Location</div>
            <div><span className="text-white">Q</span> = Quality</div>
            <div><span className="text-white">R</span> = Risk (inverse &mdash; lower risk = higher contribution)</div>
          </div>
        </div>
      </section>

      <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

      {/* SCORE THRESHOLDS */}
      <section className="mb-10">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Score Thresholds</h2>
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1c2333' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#090d12' }}>
                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-gray-500 font-medium">Score</th>
                <th className="text-right px-4 py-2 text-xs uppercase tracking-wider text-gray-500 font-medium">Signal</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr style={{ background: '#0d0d14' }}><td className="px-4 py-2 text-gray-300">80 &ndash; 100</td><td className="px-4 py-2 text-right font-semibold text-emerald-400">Institutional grade</td></tr>
              <tr style={{ background: '#0a0f15' }}><td className="px-4 py-2 text-gray-300">70 &ndash; 79</td><td className="px-4 py-2 text-right font-semibold text-emerald-300">Strong buy signal</td></tr>
              <tr style={{ background: '#0d0d14' }}><td className="px-4 py-2 text-gray-300">60 &ndash; 69</td><td className="px-4 py-2 text-right font-semibold" style={{ color: '#fbbf24' }}>Above market</td></tr>
              <tr style={{ background: '#0a0f15' }}><td className="px-4 py-2 text-gray-300">50 &ndash; 59</td><td className="px-4 py-2 text-right font-semibold text-gray-400">Market rate</td></tr>
              <tr style={{ background: '#0d0d14' }}><td className="px-4 py-2 text-gray-300">&lt; 50</td><td className="px-4 py-2 text-right font-semibold text-red-400">Avoid</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <p className="text-[10px] text-gray-600 font-mono">
        Data refresh: Continuous. Scores recompute on every ingestion cycle. 1,881 properties tracked live.
      </p>
    </div>
  );
}

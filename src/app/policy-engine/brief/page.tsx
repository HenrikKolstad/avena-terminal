import type { Metadata } from 'next';
import Link from 'next/link';
import { simulateScenario, type PolicyLever } from '@/lib/policy-engine';

// Cannot use both 'force-dynamic' and `revalidate` — they're mutually
// exclusive in Next.js App Router. Brief renders per-request so it can
// reflect the scenario URL params live.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Precision Policy Engine · Institutional Brief — Avena Terminal',
  description: 'Two-page institutional brief on the Avena Precision Policy Engine. Designed for forwarding to central bank, supervisor, and finance-ministry decision-makers.',
  alternates: { canonical: 'https://avenaterminal.com/policy-engine/brief' },
  robots: 'noindex',  // Brief is the artefact, the live engine is the canonical page
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function param(sp: Record<string, string | string[] | undefined>, k: string): string | undefined {
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v;
}

const VALID_LEVERS: PolicyLever[] = ['ltv_cap', 'dsti_cap', 'capital_req', 'ccyb', 'sectoral_rw', 'fb_levy'];

export default async function BriefPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  // Optional: scenario-specific brief. If params present, run that scenario.
  const leverRaw = param(sp, 'lever');
  const scenarioRequested = leverRaw && VALID_LEVERS.includes(leverRaw as PolicyLever);
  const scenario = scenarioRequested ? await simulateScenario({
    lever: leverRaw as PolicyLever,
    country: (param(sp, 'country') ?? 'ES').toUpperCase(),
    region: (param(sp, 'r') as 'coastal' | 'national' | 'urban' | undefined) ?? 'coastal',
    fb_share_min: parseFloat(param(sp, 'fb') ?? '0.25'),
    magnitude: parseFloat(param(sp, 'm') ?? '0'),
    timeframe_m: parseInt(param(sp, 't') ?? '18', 10),
  }) : null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="avena-v2 brief-root" style={{ background: '#ffffff', color: '#111', minHeight: '100vh' }}>

      {/* ─── Letterhead ──────────────────────────────────────────── */}
      <header className="brief-letterhead" style={{ borderBottom: '2px solid #b8860b', padding: '14mm 16mm 8mm' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '32pt', fontStyle: 'italic', color: '#b8860b', lineHeight: 1, letterSpacing: '-0.01em' }}>Avena</div>
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: '8pt', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#666', marginTop: 6 }}>Terminal · Frankfurt · Est. 2026</div>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: '8pt', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', textAlign: 'right', lineHeight: 1.5 }}>
            <div>Institutional Brief</div>
            <div>{today}</div>
            <div>v2026.05 · CC BY 4.0</div>
            <div>DOI 10.5281/zenodo.19520064</div>
          </div>
        </div>
      </header>

      {/* ─── Body ────────────────────────────────────────────────── */}
      <main style={{ padding: '0 16mm 16mm', fontFamily: 'Inter, system-ui, sans-serif' }}>

        {/* Headline */}
        <section style={{ padding: '12mm 0 8mm' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9pt', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#b8860b', marginBottom: 8 }}>
            Precision Policy Engine
          </div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '34pt', fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.01em', color: '#0d0d0d', margin: 0 }}>
            Macroprudential simulation, <span style={{ fontStyle: 'italic', color: '#b8860b' }}>to the postcode</span>.
          </h1>
          <p style={{ fontSize: '11pt', lineHeight: 1.55, color: '#333', marginTop: 14, maxWidth: '95%' }}>
            Avena Terminal has built the first turnkey macroprudential simulation engine for European residential property — designed for the ECB, the ESRB, national central banks, and finance ministries tasked with monitoring residential systemic risk. Six policy levers × 27 EU member states × foreign-buyer-share cohort weighting × forward 12-36 month projections. Calibrated against the published Avena methodology (Sovereign Briefings Vol. 2-4) and conservative literature priors. Every output signed, every coefficient cited, every scenario reproducible.
          </p>
        </section>

        {/* Capability strip */}
        <section style={{ borderTop: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', padding: '8mm 0', margin: '4mm 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6mm' }}>
            <Capability value="6"     label="Policy levers"          sub="LTV · DSTI · Capital · CCyB · Sectoral RW · FB levy" />
            <Capability value="27"    label="EU member states"       sub="Spain calibrated full · 5 directional · 21 pending" />
            <Capability value="1,881" label="Ground-truth properties" sub="Spanish coastal corpus · daily refresh · signed" />
            <Capability value="36 mo" label="Forward projection"     sub="Logistic transmission · cohort-weighted" />
          </div>
        </section>

        {/* If a scenario was requested, show its summary */}
        {scenario && (
          <section style={{ padding: '8mm 0' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8pt', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#b8860b', marginBottom: 8 }}>
              Scenario summary
            </div>
            <div style={{ background: '#faf8f3', border: '1px solid #d9d2c0', padding: '6mm', borderRadius: 2 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9pt', color: '#444', marginBottom: 8, letterSpacing: '0.05em' }}>
                {scenario.inputs.lever.replace(/_/g, ' ').toUpperCase()} · {scenario.inputs.country} · {scenario.inputs.region ?? 'national'} · FB ≥ {((scenario.inputs.fb_share_min ?? 0) * 100).toFixed(0)}% · {scenario.inputs.timeframe_m} months · magnitude {scenario.inputs.magnitude}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6mm', marginTop: 10 }}>
                <Outcome
                  label="Price impact"
                  value={`${scenario.price_impact_pct > 0 ? '+' : ''}${scenario.price_impact_pct.toFixed(2)}%`}
                  sub={`95% CI ${scenario.price_impact_low_pct.toFixed(2)}% to ${scenario.price_impact_high_pct.toFixed(2)}%`}
                  positive={scenario.price_impact_pct >= 0}
                />
                <Outcome
                  label="NPL impact"
                  value={`${scenario.npl_impact_bps > 0 ? '+' : ''}${(scenario.npl_impact_bps / 100).toFixed(2)}%`}
                  sub="Top-5 Spanish residential exposures"
                  positive={scenario.npl_impact_bps <= 0}
                />
                <Outcome
                  label="Capital rotation"
                  value={`€${(Math.abs(scenario.capital_rotation_eur) / 1e9).toFixed(2)}B`}
                  sub={scenario.capital_rotation_eur >= 0 ? 'Outflow to other EU markets' : 'Inflow from other EU markets'}
                  positive={false}
                />
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '7.5pt', color: '#888', marginTop: 12, letterSpacing: '0.18em' }}>
                Cohort size {scenario.cohort_size.toLocaleString()} properties across {scenario.cohort_postcodes_affected} clusters · Signature {scenario.signature}
              </div>
            </div>
            <p style={{ fontSize: '9.5pt', color: '#555', marginTop: 10, lineHeight: 1.5 }}>
              Full interactive scenario at <a href={`https://avenaterminal.com/policy-engine?lever=${scenario.inputs.lever}&country=${scenario.inputs.country}&r=${scenario.inputs.region ?? 'coastal'}&m=${scenario.inputs.magnitude}&fb=${(scenario.inputs.fb_share_min ?? 0.25).toFixed(2)}&t=${scenario.inputs.timeframe_m}`} style={{ color: '#b8860b', fontFamily: 'JetBrains Mono, monospace', fontSize: '9pt' }}>avenaterminal.com/policy-engine</a> — postcode-level cohort breakdown, bank stress projection, forward transmission curve.
            </p>
          </section>
        )}

        {/* Why */}
        <section style={{ padding: '8mm 0' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8pt', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#b8860b', marginBottom: 10 }}>
            The institutional gap
          </div>
          <p style={{ fontSize: '11pt', lineHeight: 1.55, color: '#333' }}>
            Central banks and supervisors currently perform residential property risk analysis through quarterly committee reports, internal Excel models, and stress test frameworks calibrated against national aggregates. The cohort-level questions that actually matter — &quot;what happens to coastal Spanish prices if we cap LTV at 75% for postcodes with foreign-buyer share above 25%?&quot; — cannot be answered with existing tools because the granular property data, the official-statistics layer, and the cross-validation infrastructure do not exist in any single product.
          </p>
          <p style={{ fontSize: '11pt', lineHeight: 1.55, color: '#333', marginTop: 10 }}>
            Avena has built all three layers in a single open-licensed product. The Precision Policy Engine combines 4,145 official statistical observations (Eurostat, ECB SDW, INE Spain), 1,881 daily-scored Spanish coastal ground-truth properties, cryptographically-signed property identifiers (AVN-IDs), and a deterministic simulation engine calibrated against published methodology — to produce forward 12-36 month projections at the postcode level, with full audit trail.
          </p>
        </section>

        {/* Methodology */}
        <section style={{ padding: '8mm 0' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8pt', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#b8860b', marginBottom: 10 }}>
            Methodology guardrails
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6mm' }}>
            <Guard title="Deterministic" body="Same inputs → same outputs. No Monte Carlo noise in v1. Suitable for committee replay and audit." />
            <Guard title="Signed" body="Every result carries an HMAC-SHA256 signature over inputs + summary. Tampering breaks the signature publicly." />
            <Guard title="Cited" body="Every coefficient links to its primary source — Vol. 2 OLS, Cerutti/Claessens/Laeven 2017 IMF WP/17/19, ESRB 2019 framework, BdE 2020 stress methodology." />
            <Guard title="Versioned" body="Methodology version stamped on every output. Material changes announced 30 days in advance at /changelog. Hash-chained nightly archive at /archive." />
          </div>
        </section>

        {/* Institutional access */}
        <section style={{ padding: '10mm 0 6mm', borderTop: '1px solid #d9d2c0', marginTop: '6mm' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8pt', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#b8860b', marginBottom: 10 }}>
            Institutional access
          </div>
          <p style={{ fontSize: '11pt', lineHeight: 1.55, color: '#333' }}>
            The public demo at <a href="https://avenaterminal.com/policy-engine" style={{ color: '#b8860b' }}>avenaterminal.com/policy-engine</a> ships one scenario class. The full institutional engine ships with seven policy levers × 27 EU countries × custom cohort definitions × audit-grade replay × white-label hosting on your domain (terminal.your-institution.eu) × SSO integration × DPA + GDPR Article 28 processor agreement × SOC 2 attestation under shared-responsibility model × direct line to the Avena Research Desk.
          </p>
          <p style={{ fontSize: '11pt', lineHeight: 1.55, color: '#333', marginTop: 10 }}>
            <strong>Reach the desk:</strong> <a href="mailto:institutional@avenaterminal.com" style={{ color: '#b8860b' }}>institutional@avenaterminal.com</a> — typical first conversation 30 minutes, NDA optional.
          </p>
          <p style={{ fontSize: '11pt', lineHeight: 1.55, color: '#333', marginTop: 10 }}>
            <strong>Read the methodology:</strong> Sovereign Briefings Vol. 2 (Foreign-Buyer Flows and the Mortgage Transmission Channel), Vol. 3 (Cross-Validating Official Statistics), Vol. 4 (Portugal at +18.9%: The Algarve Foreign-Buyer Cycle) — all published at <a href="https://avenaterminal.com/sovereign-briefing" style={{ color: '#b8860b' }}>avenaterminal.com/sovereign-briefing</a> under CC BY 4.0.
          </p>
        </section>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #d9d2c0', padding: '6mm 16mm', fontFamily: 'JetBrains Mono, monospace', fontSize: '8pt', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
        <span>Avena Terminal · {today}</span>
        <span>CC BY 4.0 · DOI 10.5281/zenodo.19520064 · Wikidata Q139165733</span>
      </footer>

      {/* On-screen toolbar (hidden in print) */}
      <div className="brief-toolbar" style={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', gap: 8, zIndex: 100 }}>
        <button onClick={() => { if (typeof window !== 'undefined') window.print(); }} style={{ background: 'linear-gradient(135deg, #c89732, #b8860b)', color: '#fff', border: 'none', padding: '10px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>
          Save as PDF
        </button>
        <Link href="/policy-engine" style={{ background: '#fff', color: '#b8860b', border: '1px solid #b8860b', padding: '10px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2, textDecoration: 'none' }}>
          Open live engine →
        </Link>
      </div>

      {/* Print stylesheet scoped to brief */}
      <style>{`
        @media print {
          .brief-toolbar { display: none !important; }
          @page { margin: 0; size: A4; }
          body { background: #fff !important; }
          .brief-root { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

function Capability({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '28pt', fontWeight: 300, lineHeight: 1, color: '#0d0d0d', letterSpacing: '-0.01em' }}>{value}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8pt', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#b8860b', marginTop: 4 }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '7.5pt', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#777', lineHeight: 1.45, marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function Outcome({ label, value, sub, positive }: { label: string; value: string; sub: string; positive: boolean }) {
  const colour = positive ? '#1f7a3a' : '#a31212';
  return (
    <div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '7.5pt', letterSpacing: '0.32em', textTransform: 'uppercase', color: colour, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '22pt', fontWeight: 300, lineHeight: 1, color: '#0d0d0d' }}>{value}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '7.5pt', color: '#666', marginTop: 4, letterSpacing: '0.08em' }}>{sub}</div>
    </div>
  );
}

function Guard({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ paddingLeft: '4mm', borderLeft: '2px solid #b8860b' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8pt', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#b8860b', marginBottom: 4 }}>{title}</div>
      <p style={{ fontSize: '9.5pt', color: '#444', lineHeight: 1.5, margin: 0 }}>{body}</p>
    </div>
  );
}

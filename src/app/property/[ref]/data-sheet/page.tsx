import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { Shield, Lock, ArrowUpRight, FileJson, MapPin, Building, Cloud, Briefcase, Scale, TrendingUp, History } from 'lucide-react';

const ADMIN_EMAILS = new Set(
  ['henrik@xaviaestate.com', 'henrik@betongsproyting.no', 'jesper.troan@gmail.com'].map((e) => e.toLowerCase())
);

/**
 * Server-side paid check — reads the Supabase auth cookie, looks up
 * the user's email, and checks for active subscription OR admin status.
 * Falls through to free tier on any error.
 */
async function checkPaidServerSide(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const cookieStore = await cookies();
    // Supabase session cookies vary by project ref; pull all matching the pattern
    const allCookies = cookieStore.getAll();
    const authCookie = allCookies.find((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
    if (!authCookie?.value) return false;

    // Decode the auth cookie to extract the email — Supabase stores JSON
    let email: string | undefined;
    try {
      const raw = authCookie.value.startsWith('base64-')
        ? Buffer.from(authCookie.value.slice(7), 'base64').toString('utf-8')
        : authCookie.value;
      const parsed = JSON.parse(raw);
      email = parsed?.user?.email || parsed?.[0]?.user?.email;
    } catch { return false; }
    if (!email) return false;

    if (ADMIN_EMAILS.has(email.toLowerCase())) return true;

    const { data } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('email', email)
      .maybeSingle();

    if (data?.status === 'active' || data?.status === 'trialing') {
      const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
      return !periodEnd || periodEnd > new Date();
    }
    return false;
  } catch {
    return false;
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 300;

interface CoreRow {
  avn_prop_id: string;
  cadastral_ref: string | null;
  osm_id: string | null;
  tier: string | null;
  is_for_sale: boolean | null;
  source_portal: string | null;
  source_url: string | null;
  country: string;
  region: string | null;
  municipality: string | null;
  province: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  property_type: string | null;
  status: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  built_m2: number | null;
  plot_m2: number | null;
  terrace_m2: number | null;
  year_built: number | null;
  completion_year: number | null;
  energy_rating: string | null;
  pool: boolean | null;
  parking: boolean | null;
  building_footprint_m2: number | null;
  price_eur: number | null;
  price_max_eur: number | null;
  price_per_m2_eur: number | null;
  avena_score: number | null;
  yield_gross_pct: number | null;
  developer: string | null;
  first_seen_at: string;
  last_seen_at: string;
  primary_image: string | null;
}

interface DataSheetData {
  core: CoreRow | null;
  geo: Record<string, unknown> | null;
  climate: Record<string, unknown> | null;
  valuation: Record<string, unknown> | null;
  valHistory: Array<Record<string, unknown>>;
  transactions: Array<Record<string, unknown>>;
  regulatory: Record<string, unknown> | null;
  market: Record<string, unknown> | null;
}

async function loadDataSheet(ref: string): Promise<DataSheetData> {
  const empty: DataSheetData = {
    core: null, geo: null, climate: null, valuation: null,
    valHistory: [], transactions: [], regulatory: null, market: null,
  };
  if (!supabase) return empty;

  // The data sheet works on either AVN_PROP_ID or legacy ref
  let avnId = ref;
  if (!ref.startsWith('AVN:')) {
    // Look up by legacy source_listing_id
    const { data } = await supabase
      .from('properties_registry')
      .select('avn_prop_id')
      .eq('source_listing_id', ref)
      .maybeSingle();
    if (data?.avn_prop_id) avnId = data.avn_prop_id;
  }

  const [core, geo, climate, val, valHist, tx, reg, mkt] = await Promise.all([
    supabase.from('properties_registry').select('*').eq('avn_prop_id', avnId).maybeSingle(),
    supabase.from('property_geo').select('*').eq('avn_prop_id', avnId).maybeSingle(),
    supabase.from('property_climate').select('*').eq('avn_prop_id', avnId).maybeSingle(),
    supabase.from('property_valuation').select('*').eq('avn_prop_id', avnId).maybeSingle(),
    supabase.from('property_valuation_history').select('*').eq('avn_prop_id', avnId).order('recorded_at', { ascending: false }).limit(20),
    supabase.from('property_transactions').select('*').eq('avn_prop_id', avnId).order('transacted_at', { ascending: false }).limit(20),
    supabase.from('property_regulatory').select('*').eq('avn_prop_id', avnId).maybeSingle(),
    supabase.from('property_market').select('*').eq('avn_prop_id', avnId).maybeSingle(),
  ]);

  return {
    core: (core.data as CoreRow | null) ?? null,
    geo: geo.data ?? null,
    climate: climate.data ?? null,
    valuation: val.data ?? null,
    valHistory: (valHist.data as Array<Record<string, unknown>>) ?? [],
    transactions: (tx.data as Array<Record<string, unknown>>) ?? [],
    regulatory: reg.data ?? null,
    market: mkt.data ?? null,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }): Promise<Metadata> {
  const { ref } = await params;
  return {
    title: `Data Sheet — ${ref} | Avena Terminal`,
    description: 'Institutional-grade property data sheet. Identity, climate, transactions, valuation, regulatory, market context — all in one signed record.',
    alternates: { canonical: `https://avenaterminal.com/property/${ref}/data-sheet` },
  };
}

const fmt = (n: number | null | undefined, suffix = '') =>
  n != null && Number.isFinite(n) ? `${n.toLocaleString('en-US').replace(/,/g, ' ')}${suffix}` : '—';

const fmtM = (n: number | null | undefined) => {
  if (n == null) return '—';
  if (n < 1000) return `${n} m`;
  return `${(n / 1000).toFixed(1)} km`;
};

const fmtPct = (n: number | null | undefined) => n != null ? `${n.toFixed(1)}%` : '—';
const fmtEur = (n: number | null | undefined) => n != null ? `€${fmt(Math.round(n))}` : '—';

interface RowProps {
  label: string;
  value: React.ReactNode;
  paid?: boolean;
}

function MetricRow({ label, value, paid = false }: RowProps) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 py-1.5 border-b min-w-0" style={{ borderColor: 'hsl(var(--av-border) / 0.25)' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground truncate">{label}</div>
      <div
        className={`font-mono tabular text-sm text-foreground/90 text-right ${paid ? 'select-none' : ''}`}
        style={paid ? { filter: 'blur(5px)' } : {}}
      >
        {paid ? '████████' : value}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, paid = false, locked = false, children }: { title: string; icon: typeof Shield; paid?: boolean; locked?: boolean; children: React.ReactNode }) {
  return (
    <section
      className="rounded-sm border p-5 sm:p-6 mb-4 relative overflow-hidden"
      style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-4 flex-wrap">
        <h2 className="font-serif text-xl font-light text-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </h2>
        {paid && (
          <span
            className="font-mono text-[9px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-sm flex items-center gap-1"
            style={{ background: 'hsl(var(--av-primary) / 0.15)', color: 'hsl(var(--av-primary))' }}
          >
            <Lock className="h-3 w-3" />
            PAID
          </span>
        )}
      </div>
      <div className={locked ? 'pointer-events-none' : ''}>
        {children}
      </div>
      {locked && (
        <div
          className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px]"
          style={{ background: 'linear-gradient(180deg, hsl(var(--av-background) / 0.0) 0%, hsl(var(--av-background) / 0.85) 50%, hsl(var(--av-background) / 0.95) 100%)' }}
        >
          <Link
            href="/pro"
            className="inline-flex items-center gap-2 rounded-sm px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
            style={{ background: 'var(--av-gradient-gold)' }}
          >
            <Lock className="h-3.5 w-3.5" />
            Unlock institutional data
          </Link>
        </div>
      )}
    </section>
  );
}

export default async function DataSheetPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref: rawRef } = await params;
  const ref = decodeURIComponent(rawRef);
  const sheet = await loadDataSheet(ref);

  if (!sheet.core) notFound();

  const c = sheet.core;
  const isPaid = await checkPaidServerSide();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `Avena Property Data Sheet — ${c.avn_prop_id}`,
    description: 'Institutional-grade per-property data sheet. Identity, location, climate, transactions, valuation.',
    url: `https://avenaterminal.com/property/${encodeURIComponent(c.avn_prop_id)}/data-sheet`,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    identifier: c.avn_prop_id,
  };

  return (
    <div className="avena-v2 min-h-screen overflow-x-clip" style={{ maxWidth: '100vw' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16 overflow-x-clip" style={{ maxWidth: '100vw' }}>
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12 sm:py-14 min-w-0">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-5">
              <span className="h-px w-10 hidden sm:inline-block" style={{ background: 'hsl(var(--av-primary))' }} />
              Avena Registry · institutional data sheet · AVP v1.0 signed
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-light leading-[0.95] tracking-tight text-foreground mb-3 break-words" style={{ overflowWrap: 'anywhere' }}>
              Property <span className="italic text-gold">data sheet</span>.
            </h1>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground break-all" style={{ overflowWrap: 'anywhere' }}>
              {c.avn_prop_id}
            </div>
            {c.municipality && (
              <p className="mt-3 font-serif text-lg text-foreground/85">
                {c.country === 'ES' ? '🇪🇸' : c.country === 'PT' ? '🇵🇹' : '🇪🇺'} {c.municipality}{c.region ? ` · ${c.region}` : ''}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={`/api/v1/property/${encodeURIComponent(c.avn_prop_id)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-sm border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <FileJson className="h-3.5 w-3.5" /> JSON API
              </Link>
              {!isPaid && (
                <Link
                  href="/pro"
                  className="inline-flex items-center gap-2 rounded-sm px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  <Lock className="h-3.5 w-3.5" /> Unlock institutional access
                </Link>
              )}
              <Link
                href="/standards/avp"
                className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary"
              >
                AVP spec →
              </Link>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-10 grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">

          {/* IDENTITY */}
          <Section title="Identity" icon={Shield}>
            <MetricRow label="AVN_PROP_ID" value={<span className="text-primary break-all" style={{ overflowWrap: 'anywhere' }}>{c.avn_prop_id}</span>} />
            <MetricRow label="Cadastral ref" value={c.cadastral_ref ? <span className="text-primary break-all" style={{ overflowWrap: 'anywhere' }}>{c.cadastral_ref}</span> : '—'} />
            <MetricRow label="OSM ID" value={c.osm_id || '—'} />
            <MetricRow label="Tier" value={c.tier || 'listing'} />
            <MetricRow label="For sale" value={c.is_for_sale ? 'yes' : 'no'} />
            <MetricRow label="Source portal" value={c.source_portal || '—'} />
            <MetricRow label="First seen" value={new Date(c.first_seen_at).toLocaleDateString('en-GB')} />
            <MetricRow label="Last seen" value={new Date(c.last_seen_at).toLocaleDateString('en-GB')} />
          </Section>

          {/* LOCATION */}
          <Section title="Location" icon={MapPin}>
            <MetricRow label="Country" value={c.country} />
            <MetricRow label="Region" value={c.region || '—'} />
            <MetricRow label="Municipality" value={c.municipality || '—'} />
            <MetricRow label="Province" value={c.province || '—'} />
            <MetricRow label="Postal code" value={c.postal_code || '—'} />
            <MetricRow label="Latitude" value={c.lat != null ? c.lat.toFixed(5) : '—'} />
            <MetricRow label="Longitude" value={c.lng != null ? c.lng.toFixed(5) : '—'} />
            <MetricRow label="Address" value={c.address || '—'} />
          </Section>

          {/* PHYSICAL */}
          <Section title="Physical" icon={Building}>
            <MetricRow label="Type" value={c.property_type || '—'} />
            <MetricRow label="Status" value={c.status || '—'} />
            <MetricRow label="Bedrooms" value={c.bedrooms ?? '—'} />
            <MetricRow label="Bathrooms" value={c.bathrooms ?? '—'} />
            <MetricRow label="Built m²" value={c.built_m2 ?? '—'} />
            <MetricRow label="Plot m²" value={c.plot_m2 ?? '—'} />
            <MetricRow label="Terrace m²" value={c.terrace_m2 ?? '—'} />
            <MetricRow label="Footprint m² (OSM)" value={c.building_footprint_m2 ?? '—'} />
            <MetricRow label="Year built" value={c.year_built ?? '—'} />
            <MetricRow label="Completion year" value={c.completion_year ?? '—'} />
            <MetricRow label="Energy rating" value={c.energy_rating || '—'} />
            <MetricRow label="Pool" value={c.pool ? 'yes' : c.pool === false ? 'no' : '—'} />
            <MetricRow label="Parking" value={c.parking ? 'yes' : c.parking === false ? 'no' : '—'} />
          </Section>

          {/* CURRENT LISTING / VALUATION */}
          <Section title="Listing & current valuation" icon={TrendingUp}>
            <MetricRow label="Asking price" value={fmtEur(c.price_eur)} />
            <MetricRow label="Price ceiling" value={fmtEur(c.price_max_eur)} />
            <MetricRow label="Price / m²" value={fmtEur(c.price_per_m2_eur)} />
            <MetricRow label="Avena Score" value={c.avena_score != null ? <span className="text-primary">{c.avena_score}/100</span> : '—'} />
            <MetricRow label="Gross yield" value={fmtPct(c.yield_gross_pct)} />
            <MetricRow label="Developer" value={c.developer || '—'} />
          </Section>

          {/* GEO METRICS — paid */}
          <Section title="Amenity distances + walkability" icon={MapPin} paid={!isPaid} locked={!isPaid}>
            {(() => {
              const g = sheet.geo as { distance_beach_m?: number; distance_school_m?: number; distance_hospital_m?: number; distance_airport_m?: number; distance_train_m?: number; distance_supermarket_m?: number; distance_restaurant_m?: number; walkability_score?: number; noise_score?: number; air_quality_index?: number; elevation_m?: number; source?: string } | null;
              return (
                <>
                  <MetricRow label="Distance to beach" value={fmtM(g?.distance_beach_m ?? null)} />
                  <MetricRow label="Distance to school" value={fmtM(g?.distance_school_m ?? null)} />
                  <MetricRow label="Distance to hospital" value={fmtM(g?.distance_hospital_m ?? null)} />
                  <MetricRow label="Distance to airport" value={fmtM(g?.distance_airport_m ?? null)} />
                  <MetricRow label="Distance to train station" value={fmtM(g?.distance_train_m ?? null)} />
                  <MetricRow label="Distance to supermarket" value={fmtM(g?.distance_supermarket_m ?? null)} />
                  <MetricRow label="Distance to restaurant" value={fmtM(g?.distance_restaurant_m ?? null)} />
                  <MetricRow label="Walkability score" value={g?.walkability_score ?? '—'} />
                  <MetricRow label="Noise score" value={g?.noise_score ?? '—'} />
                  <MetricRow label="Air quality index" value={g?.air_quality_index ?? '—'} />
                  <MetricRow label="Elevation (m)" value={g?.elevation_m ?? '—'} />
                  <MetricRow label="Source" value={g?.source || 'osm-overpass'} />
                </>
              );
            })()}
          </Section>

          {/* CLIMATE — paid */}
          <Section title="Climate risk" icon={Cloud} paid={!isPaid} locked={!isPaid}>
            {(() => {
              const cl = sheet.climate as { flood_risk_100yr?: number; flood_risk_500yr?: number; heat_stress_score?: number; sea_level_rise_2050_m?: number; wildfire_risk?: number; seismic_zone?: string; stranded_asset_prob_2040?: number; source?: string } | null;
              return (
                <>
                  <MetricRow label="Flood risk (100yr)" value={cl?.flood_risk_100yr != null ? `${(cl.flood_risk_100yr * 100).toFixed(1)}%` : '—'} />
                  <MetricRow label="Flood risk (500yr)" value={cl?.flood_risk_500yr != null ? `${(cl.flood_risk_500yr * 100).toFixed(1)}%` : '—'} />
                  <MetricRow label="Heat stress score" value={cl?.heat_stress_score ?? '—'} />
                  <MetricRow label="Sea level rise 2050 (m)" value={cl?.sea_level_rise_2050_m != null ? cl.sea_level_rise_2050_m.toFixed(2) : '—'} />
                  <MetricRow label="Wildfire risk" value={cl?.wildfire_risk ?? '—'} />
                  <MetricRow label="Seismic zone" value={cl?.seismic_zone || '—'} />
                  <MetricRow label="Stranded asset probability (2040)" value={cl?.stranded_asset_prob_2040 != null ? `${(cl.stranded_asset_prob_2040 * 100).toFixed(1)}%` : '—'} />
                  <MetricRow label="Source" value={cl?.source || 'copernicus + EU-JRC'} />
                </>
              );
            })()}
          </Section>

          {/* MARKET CONTEXT — paid */}
          <Section title="Market context" icon={Briefcase} paid={!isPaid} locked={!isPaid}>
            {(() => {
              const m = sheet.market as { population_5yr_change_pct?: number; median_household_income_eur?: number; foreign_ownership_pct?: number; tourism_intensity?: number; regional_apci?: number; bubble_risk_score?: number; liquidity_score?: number; rental_market_depth?: number; source?: string } | null;
              return (
                <>
                  <MetricRow label="Population 5yr Δ" value={fmtPct(m?.population_5yr_change_pct ?? null)} />
                  <MetricRow label="Median household income" value={fmtEur(m?.median_household_income_eur ?? null)} />
                  <MetricRow label="Foreign ownership" value={fmtPct(m?.foreign_ownership_pct ?? null)} />
                  <MetricRow label="Tourism intensity" value={m?.tourism_intensity ?? '—'} />
                  <MetricRow label="Regional APCI" value={m?.regional_apci != null ? m.regional_apci.toFixed(2) : '—'} />
                  <MetricRow label="Bubble risk score" value={m?.bubble_risk_score ?? '—'} />
                  <MetricRow label="Liquidity score" value={m?.liquidity_score ?? '—'} />
                  <MetricRow label="Rental market depth" value={m?.rental_market_depth ?? '—'} />
                </>
              );
            })()}
          </Section>

          {/* REGULATORY — paid */}
          <Section title="Regulatory & compliance" icon={Scale} paid={!isPaid} locked={!isPaid}>
            {(() => {
              const r = sheet.regulatory as { building_permit?: string; permit_status?: string; permit_issued_at?: string; tourist_license?: string; tourist_license_status?: string; heritage_protection?: boolean; heritage_grade?: string; zoning?: string; epc_compliance?: boolean; epc_rating?: string } | null;
              return (
                <>
                  <MetricRow label="Building permit" value={r?.building_permit || '—'} />
                  <MetricRow label="Permit status" value={r?.permit_status || '—'} />
                  <MetricRow label="Permit issued" value={r?.permit_issued_at ? new Date(r.permit_issued_at).toLocaleDateString('en-GB') : '—'} />
                  <MetricRow label="Tourist license" value={r?.tourist_license || '—'} />
                  <MetricRow label="License status" value={r?.tourist_license_status || '—'} />
                  <MetricRow label="Heritage protected" value={r?.heritage_protection ? 'yes' : r?.heritage_protection === false ? 'no' : '—'} />
                  <MetricRow label="Heritage grade" value={r?.heritage_grade || '—'} />
                  <MetricRow label="Zoning" value={r?.zoning || '—'} />
                  <MetricRow label="EPC compliance" value={r?.epc_compliance ? 'yes' : r?.epc_compliance === false ? 'no' : '—'} />
                  <MetricRow label="EPC rating" value={r?.epc_rating || '—'} />
                </>
              );
            })()}
          </Section>

          {/* TRANSACTIONS — paid */}
          <Section title="Transaction history" icon={History} paid={!isPaid} locked={!isPaid}>
            {sheet.transactions.length === 0 ? (
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground py-2">
                No recorded transactions for this AVN_PROP_ID
              </div>
            ) : (
              sheet.transactions.slice(0, 10).map((t, i) => {
                const tx = t as { transacted_at?: string; price_eur?: number; price_per_m2_eur?: number; source?: string };
                return (
                  <MetricRow
                    key={i}
                    label={tx.transacted_at ? new Date(tx.transacted_at).toLocaleDateString('en-GB') : '—'}
                    value={`${fmtEur(tx.price_eur ?? null)}${tx.price_per_m2_eur ? ` (${fmtEur(tx.price_per_m2_eur)}/m²)` : ''}`}
                  />
                );
              })
            )}
          </Section>

          {/* VALUATION HISTORY — paid */}
          <Section title="Valuation history" icon={History} paid={!isPaid} locked={!isPaid}>
            {sheet.valHistory.length === 0 ? (
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground py-2">
                No recorded score history yet — populates over time as Avena methodology runs
              </div>
            ) : (
              sheet.valHistory.slice(0, 12).map((v, i) => {
                const vh = v as { recorded_at?: string; avena_score?: number; avm_eur?: number; methodology_version?: string };
                return (
                  <MetricRow
                    key={i}
                    label={vh.recorded_at ? new Date(vh.recorded_at).toLocaleDateString('en-GB') : '—'}
                    value={`Score ${vh.avena_score ?? '—'}/100 · ${fmtEur(vh.avm_eur ?? null)} · ${vh.methodology_version || '—'}`}
                  />
                );
              })
            )}
          </Section>
        </div>

        {/* Footer note */}
        <section className="border-t py-10 text-center" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
              Avena Registry · CC BY 4.0 (free) · DOI 10.5281/zenodo.19520064 · RICS Tech Partner 2026
            </p>
            <p className="text-sm text-foreground/70 font-light max-w-[700px] mx-auto">
              Free tier shows identity, location, basic specs, and current listing data. Climate, transaction history,
              regulatory, market context, and valuation history require institutional access.{' '}
              <Link href="/pro" className="text-primary hover:text-gold underline">Unlock</Link>
              {' '}or{' '}
              <Link href="/institutional" className="text-primary hover:text-gold underline">contact for licensing</Link>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

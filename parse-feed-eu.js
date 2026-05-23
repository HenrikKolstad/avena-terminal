#!/usr/bin/env node
/**
 * Universal EU property feed parser. Companion to parse-feed.js (Spain/Xavia).
 *
 * Iterates an array of country/portal configs and for each one:
 *   1. Fetches the upstream feed (XML or JSON or scrape callback)
 *   2. Maps fields via the config's field_map → APIP-compatible Property
 *   3. Runs hedonic OLS (same math as parse-feed.js) to compute mm2 benchmarks
 *   4. Diffs against previous data-<country>.json → upserts sold_properties
 *      + price_snapshots to Supabase (country-tagged)
 *   5. Writes public/data-<country>.json
 *   6. Merges all country files → public/data-eu.json
 *
 * Run with:
 *   node parse-feed-eu.js                  # all configs
 *   node parse-feed-eu.js --country=PT     # one country
 *   node parse-feed-eu.js --skip-scrapes   # skip scrape-type feeds (fast)
 *
 * The config registry is kept in ./eu-feed-configs.js so the cron route
 * can import the same source of truth without duplicating the list.
 */

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
require('dotenv').config({ path: '.env.production' });

const { EU_FEED_CONFIGS } = require('./eu-feed-configs.js');

const argv = process.argv.slice(2);
const COUNTRY_ARG = (argv.find((a) => a.startsWith('--country=')) || '').split('=')[1] || null;
const SKIP_SCRAPES = argv.includes('--skip-scrapes');

// ─── Math helpers (extracted from parse-feed.js) ───────────────────────────
function matMul(A, B) {
  const rows = A.length, cols = B[0].length, inner = B.length;
  const C = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) for (let k = 0; k < inner; k++) {
    if (A[i][k] === 0) continue;
    for (let j = 0; j < cols; j++) C[i][j] += A[i][k] * B[k][j];
  }
  return C;
}
function transpose(A) {
  const T = Array.from({ length: A[0].length }, () => new Array(A.length).fill(0));
  for (let i = 0; i < A.length; i++) for (let j = 0; j < A[0].length; j++) T[j][i] = A[i][j];
  return T;
}
function invertMatrix(M) {
  const n = M.length;
  const aug = M.map((row, i) => { const r = [...row]; for (let j = 0; j < n; j++) r.push(i === j ? 1 : 0); return r; });
  for (let col = 0; col < n; col++) {
    let maxRow = col, maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) if (Math.abs(aug[row][col]) > maxVal) { maxVal = Math.abs(aug[row][col]); maxRow = row; }
    if (maxVal < 1e-12) throw new Error(`Matrix singular at col ${col}`);
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col]; if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  return aug.map((row) => row.slice(n));
}
function ols(X, y) {
  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const XtXinv = invertMatrix(XtX);
  const Xty = matMul(Xt, y.map((v) => [v]));
  return matMul(XtXinv, Xty).map((r) => r[0]);
}
const getMedian = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

// ─── Field-map resolver ────────────────────────────────────────────────────
function pluck(obj, dotPath) {
  if (!obj || !dotPath) return undefined;
  return dotPath.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function applyFieldMap(rawProp, fieldMap) {
  const out = {};
  for (const [apipKey, sourcePath] of Object.entries(fieldMap)) {
    out[apipKey] = pluck(rawProp, sourcePath);
  }
  return out;
}

// ─── Feed fetchers ─────────────────────────────────────────────────────────
async function fetchXmlFeed(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'AvenaTerminalBot/1.0' } });
  if (!res.ok) throw new Error(`Feed HTTP ${res.status} from ${url}`);
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const data = parser.parse(xml);
  // Try common XML shapes: <root><property>... | <listings><listing>... | <feed><item>...
  return data?.root?.property
      || data?.listings?.listing
      || data?.feed?.item
      || data?.rss?.channel?.item
      || data?.properties?.property
      || data;
}
async function fetchJsonFeed(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'AvenaTerminalBot/1.0', Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Feed HTTP ${res.status} from ${url}`);
  return res.json();
}

// ─── Hedonic regression — country-scoped ───────────────────────────────────
function fitHedonicCountry(properties) {
  const isVilType = (t) => ['Villa', 'Townhouse', 'Bungalow', 'House'].includes(t);

  const trainProps = properties.filter((p) => p.pm2 && p.pm2 > 0 && p.bm > 0);
  if (trainProps.length < 30) return { applied: 0, r2: null, rmse: null };

  // Collect town dummies (≥8 obs)
  const townCounts = new Map();
  trainProps.forEach((p) => {
    const town = (p.l || '').split(',')[0].trim();
    townCounts.set(town, (townCounts.get(town) || 0) + 1);
  });
  const dummyTowns = [...townCounts.entries()].filter(([, n]) => n >= 8).map(([t]) => t).sort((a, b) => townCounts.get(b) - townCounts.get(a));
  const baselineTown = dummyTowns.shift();

  function buildRow(p) {
    const bm = p.bm > 0 ? p.bm : 80;
    const log_bm = Math.log(bm);
    const beach = p.bk != null ? Math.min(p.bk, 10) : 5;
    const sea_view = (p.views || []).includes('sea') ? 1 : 0;
    const beds = Math.min(Math.max(p.bd || 1, 1), 6);
    const is_villa = isVilType(p.t) ? 1 : 0;
    const pool_private = p.pool === 'private' ? 1 : 0;
    const energy_high = (p.energy === 'A' || p.energy === 'B') ? 1 : 0;
    const town = (p.l || '').split(',')[0].trim();
    const townDummies = dummyTowns.map((t) => t === town ? 1 : 0);
    return [1, log_bm, beach, sea_view, beds, is_villa, pool_private, energy_high, ...townDummies];
  }

  const X = trainProps.map(buildRow);
  const y = trainProps.map((p) => p.pm2);
  let beta;
  try { beta = ols(X, y); } catch (e) {
    console.warn(`  hedonic OLS failed: ${e.message}`);
    return { applied: 0, r2: null, rmse: null };
  }
  const yHat = X.map((row) => row.reduce((s, v, i) => s + v * beta[i], 0));
  const yMean = y.reduce((s, v) => s + v, 0) / y.length;
  const ssTot = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const ssRes = y.reduce((s, v, i) => s + (v - yHat[i]) ** 2, 0);
  const r2 = 1 - ssRes / ssTot;
  const rmse = Math.sqrt(ssRes / y.length);

  // Apply predictions
  let applied = 0;
  properties.forEach((p) => {
    if (!p.bm || p.bm <= 0) return;
    const row = buildRow(p);
    let predicted = row.reduce((s, v, i) => s + v * beta[i], 0);
    if (predicted < 1500) predicted = 1500;
    else if (predicted > 20000) predicted = 20000;
    p.mm2 = Math.round(predicted);
    applied++;
  });

  // Town-median fallback for properties with bm=0
  const townPm2 = {};
  properties.forEach((p) => {
    if (!p.pm2 || p.pm2 <= 0) return;
    const town = (p.l || '').split(',')[0].trim();
    const seg = isVilType(p.t) ? 'vil' : 'apt';
    const key = `${town}::${seg}`;
    if (!townPm2[key]) townPm2[key] = [];
    townPm2[key].push(p.pm2);
  });
  properties.forEach((p) => {
    if (p.bm > 0) return;
    const town = (p.l || '').split(',')[0].trim();
    const seg = isVilType(p.t) ? 'vil' : 'apt';
    const arr = townPm2[`${town}::${seg}`] || [];
    if (arr.length >= 5) p.mm2 = getMedian(arr);
  });

  return { applied, r2, rmse, baselineTown, dummyTownCount: dummyTowns.length };
}

// ─── FX conversion (local currency → EUR) ──────────────────────────────────
// ECB daily reference rates. Empty config = currency is EUR already.
let _fxCache = null;
async function getEcbFx(currency) {
  if (currency === 'EUR') return 1;
  if (!_fxCache) {
    try {
      const res = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', {
        headers: { 'User-Agent': 'AvenaTerminalBot/1.0' },
      });
      const xml = await res.text();
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const data = parser.parse(xml);
      const cubes = data['gesmes:Envelope']?.Cube?.Cube?.Cube;
      const rates = {};
      const list = Array.isArray(cubes) ? cubes : [cubes];
      list.forEach((c) => { if (c && c['@_currency']) rates[c['@_currency']] = Number(c['@_rate']); });
      _fxCache = rates;
    } catch (e) {
      console.warn(`  FX fetch failed: ${e.message}. Using 1.0 for ${currency}`);
      _fxCache = {};
    }
  }
  return _fxCache[currency] || 1;
}

// ─── Process one country config ────────────────────────────────────────────
async function processCountry(cfg) {
  const startTs = Date.now();
  console.log(`\n━━━ ${cfg.country_name} (${cfg.country}) via ${cfg.portal} ━━━`);

  if (cfg.feed_type === 'scrape' && SKIP_SCRAPES) {
    console.log('  skipped (--skip-scrapes flag)');
    return { country: cfg.country, status: 'skipped', total: 0, ms: 0 };
  }
  if (cfg.status === 'stub') {
    console.log(`  stub config — no live feed wired yet. Source: ${cfg.notes || 'pending'}`);
    return { country: cfg.country, status: 'stub', total: 0, ms: 0 };
  }

  let rawList;
  try {
    if (cfg.feed_type === 'xml')  rawList = await fetchXmlFeed(cfg.feed_url);
    else if (cfg.feed_type === 'json') rawList = await fetchJsonFeed(cfg.feed_url);
    else if (cfg.feed_type === 'scrape' && cfg.scraper) rawList = await cfg.scraper();
    else throw new Error(`Unsupported feed_type ${cfg.feed_type}`);
  } catch (err) {
    console.error(`  fetch failed: ${err.message}`);
    return { country: cfg.country, status: 'fetch_error', total: 0, error: err.message, ms: Date.now() - startTs };
  }

  const items = Array.isArray(rawList) ? rawList : (rawList ? [rawList] : []);
  console.log(`  fetched ${items.length} raw items`);
  if (items.length === 0) return { country: cfg.country, status: 'empty_feed', total: 0, ms: Date.now() - startTs };

  // FX conversion
  const fx = await getEcbFx(cfg.currency);
  const fxNote = cfg.currency === 'EUR' ? 'EUR native' : `FX ${cfg.currency}→EUR @ ${fx}`;

  // Field-map + normalise
  const now = new Date().toISOString();
  const mapped = items.map((raw) => {
    try {
      const m = applyFieldMap(raw, cfg.field_map || {});
      const rawPrice = Number(m.price) || 0;
      const pf = cfg.currency === 'EUR' ? rawPrice : Math.round(rawPrice / fx);
      const bm = Number(m.built_m2) || 0;
      const pm2 = bm > 0 && pf > 0 ? Math.round(pf / bm) : undefined;
      const lat = m.lat != null ? Number(m.lat) : null;
      const lng = m.lng != null ? Number(m.lng) : null;
      const town = (m.town || '').toString().trim();
      const refValue = m.ref != null ? String(m.ref) : `${cfg.portal}-${(m.url || m.title || Math.random()).toString().slice(0, 30)}`;
      return {
        d: m.developer || cfg.portal,
        p: (m.title || `${m.type || 'Property'} in ${town}`).toString().slice(0, 200),
        l: town,
        r: m.region || cfg.country.toLowerCase(),
        t: (m.type || 'Apartment').toString(),
        pf,
        pt: pf,
        pm2,
        mm2: 0,                                            // filled by hedonic
        bm,
        pl: m.plot_m2 ? Number(m.plot_m2) : null,
        bd: Number(m.bedrooms) || 0,
        ba: Number(m.bathrooms) || 0,
        bk: m.beach_km != null ? Number(m.beach_km) : null,
        c: m.completion || 'TBA',
        s: (m.status || 'ready').toString(),
        dy: 0,
        f: (m.description || '').toString().slice(0, 400),
        u: m.url || cfg.fallback_url || '',
        ref: refValue,
        imgs: Array.isArray(m.images) ? m.images.slice(0, 15) : (m.images ? [m.images] : []),
        lat, lng,
        cats: [],
        views: m.sea_view ? ['sea'] : [],
        energy: m.energy || null,
        parking: Number(m.parking) || 0,
        pool: m.pool || null,
        country: cfg.country,
        country_name: cfg.country_name,
        source_portal: cfg.portal,
        source_ref: refValue,
        last_synced: now,
        currency: cfg.currency,
        raw_price_local: cfg.currency === 'EUR' ? undefined : rawPrice,
        fx_rate_used: cfg.currency === 'EUR' ? undefined : fx,
      };
    } catch (e) {
      return null;
    }
  }).filter((p) => p && p.pf > 0);

  console.log(`  mapped ${mapped.length} valid properties (${fxNote})`);

  // Dedupe by ref
  const seen = new Set();
  const unique = mapped.filter((p) => seen.has(p.ref) ? false : (seen.add(p.ref), true));

  // Hedonic
  const hedonic = fitHedonicCountry(unique);
  if (hedonic.r2 != null) console.log(`  hedonic R²=${hedonic.r2.toFixed(3)} RMSE=€${Math.round(hedonic.rmse)}/m² applied=${hedonic.applied} (baseline town: ${hedonic.baselineTown}, dummies: ${hedonic.dummyTownCount})`);

  // Diff against previous file
  const outFile = path.join(__dirname, 'public', `data-${cfg.country.toLowerCase()}.json`);
  let prevByRef = {};
  try {
    const prev = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    prev.forEach((p) => { if (p.ref) prevByRef[p.ref] = p; });
  } catch { /* first run */ }

  // Persist _added across runs
  const today = new Date().toISOString().slice(0, 10);
  unique.forEach((p) => {
    const prev = prevByRef[p.ref];
    p._added = prev?._added || today;
  });

  // Sold detection
  const currentRefs = new Set(unique.map((p) => p.ref).filter(Boolean));
  const soldProps = Object.values(prevByRef).filter((p) => p.ref && !currentRefs.has(p.ref));
  let added = 0, removed = soldProps.length, updated = 0;
  unique.forEach((p) => {
    const prev = prevByRef[p.ref];
    if (!prev) added++;
    else if (prev.pf !== p.pf) updated++;
  });
  console.log(`  diff: +${added} added, -${removed} removed, ~${updated} price-changed`);

  // Supabase upserts (sold + snapshots) — country-tagged
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbUrl && sbKey && (soldProps.length > 0 || unique.length > 0)) {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(sbUrl, sbKey);

    if (soldProps.length > 0) {
      const rows = soldProps.map((p) => ({
        ref: p.ref,
        property_name: p.p,
        town: (p.l || '').split(',')[0].trim(),
        region: p.r,
        type: p.t,
        last_price: p.pf,
        last_pm2: p.pm2,
        last_seen_date: today,
        beds: p.bd,
        built_m2: p.bm,
        country: cfg.country,
      }));
      const { error } = await sb.from('sold_properties').upsert(rows, { onConflict: 'ref' });
      if (error) console.error(`  sold upsert error: ${error.message}`);
      else console.log(`  stored ${rows.length} sold comps`);
    }

    const snapRows = unique.filter((p) => p.ref && p.pf > 0).map((p) => ({
      ref: p.ref, snapshot_date: today, price: p.pf, pm2: p.pm2 || null, mm2: p.mm2 || null,
      region: p.r, type: p.t, town: (p.l || '').split(',')[0].trim(), country: cfg.country,
    }));
    if (snapRows.length > 0) {
      const { error } = await sb.from('price_snapshots').upsert(snapRows, { onConflict: 'ref,snapshot_date' });
      if (error) console.error(`  snapshot upsert error: ${error.message}`);
      else console.log(`  stored ${snapRows.length} price snapshots`);
    }
  }

  // Write per-country file
  fs.writeFileSync(outFile, JSON.stringify(unique, null, 0));
  const sizeKB = (fs.statSync(outFile).size / 1024).toFixed(0);
  console.log(`  wrote ${outFile} (${sizeKB}KB)`);

  return {
    country: cfg.country,
    country_name: cfg.country_name,
    portal: cfg.portal,
    status: 'success',
    total: unique.length,
    added,
    removed,
    updated,
    hedonic_r2: hedonic.r2,
    ms: Date.now() - startTs,
  };
}

// ─── Merge all data-<cc>.json + Spain data.json → data-eu.json ─────────────
function mergeAllCountries() {
  console.log('\n━━━ Merging all countries → data-eu.json ━━━');
  const publicDir = path.join(__dirname, 'public');
  const merged = [];

  // Spain master (legacy data.json) — annotate country if missing
  try {
    const spain = JSON.parse(fs.readFileSync(path.join(publicDir, 'data.json'), 'utf8'));
    spain.forEach((p) => {
      if (!p.country) { p.country = 'ES'; p.country_name = 'Spain'; }
      if (!p.currency) p.currency = 'EUR';
    });
    merged.push(...spain);
    console.log(`  +${spain.length} from Spain (data.json)`);
  } catch { /* ignore */ }

  // Per-country files
  const files = fs.readdirSync(publicDir).filter((f) => /^data-[a-z]{2}\.json$/.test(f) && f !== 'data-eu.json');
  for (const f of files) {
    try {
      const arr = JSON.parse(fs.readFileSync(path.join(publicDir, f), 'utf8'));
      merged.push(...arr);
      console.log(`  +${arr.length} from ${f}`);
    } catch (e) { console.warn(`  ${f} skipped: ${e.message}`); }
  }

  const outPath = path.join(publicDir, 'data-eu.json');
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 0));
  const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`  wrote data-eu.json — ${merged.length} properties (${sizeKB}KB)`);

  // Country distribution
  const byCountry = {};
  merged.forEach((p) => { byCountry[p.country] = (byCountry[p.country] || 0) + 1; });
  console.log('  by country:', byCountry);
  return { total: merged.length, by_country: byCountry };
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const configs = COUNTRY_ARG
    ? EU_FEED_CONFIGS.filter((c) => c.country === COUNTRY_ARG.toUpperCase())
    : EU_FEED_CONFIGS;

  if (configs.length === 0) {
    console.error(`No configs match country=${COUNTRY_ARG}`);
    process.exit(1);
  }

  const summary = [];
  for (const cfg of configs) {
    try {
      const r = await processCountry(cfg);
      summary.push(r);
    } catch (e) {
      console.error(`  fatal in ${cfg.country}: ${e.message}`);
      summary.push({ country: cfg.country, status: 'fatal', error: e.message });
    }
  }

  if (!COUNTRY_ARG) mergeAllCountries();

  console.log('\n━━━ SUMMARY ━━━');
  summary.forEach((s) => {
    console.log(`  ${s.country.padEnd(3)} ${s.status.padEnd(12)} ${String(s.total ?? 0).padStart(5)} props  ${s.ms ?? 0}ms`);
  });

  // Log to Supabase feed_sync_log
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbUrl && sbKey) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const sb = createClient(sbUrl, sbKey);
      const rows = summary.map((s) => ({
        country_code: s.country,
        portal_name: s.portal || null,
        started_at: new Date(Date.now() - (s.ms || 0)).toISOString(),
        completed_at: new Date().toISOString(),
        properties_total: s.total || 0,
        properties_added: s.added || 0,
        properties_removed: s.removed || 0,
        properties_updated: s.updated || 0,
        error: s.error || null,
        status: s.status,
      }));
      const { error } = await sb.from('feed_sync_log').insert(rows);
      if (error) console.error(`  sync log error: ${error.message}`);
      else console.log(`  logged ${rows.length} sync runs to feed_sync_log`);
    } catch (e) { console.warn(`  sync log skipped: ${e.message}`); }
  }
}

// Export internals for the cron route to call directly without spawning node
module.exports = { processCountry, mergeAllCountries, fitHedonicCountry };

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });

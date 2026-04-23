#!/usr/bin/env node
/* eslint-disable */

/**
 * avena — Command-line tool for Avena Terminal.
 * https://avenaterminal.com/cli
 *
 * Usage:
 *   npx avena score <ref>
 *   npx avena deals [town]
 *   npx avena bubble <city>
 *   npx avena compare <ref1> <ref2> [ref3...]
 *   npx avena avn <AVN:ES-...-...-....>
 *   npx avena help
 */

const API = process.env.AVENA_API || 'https://avenaterminal.com';

const C = {
  reset: '\x1b[0m',
  dim:   '\x1b[2m',
  bold:  '\x1b[1m',
  gold:  '\x1b[38;5;214m',
  green: '\x1b[38;5;82m',
  red:   '\x1b[38;5;196m',
  cyan:  '\x1b[38;5;87m',
  gray:  '\x1b[38;5;240m',
};

function fmt(n) {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return n.toLocaleString('en-US').replace(/,/g, ' ');
}

function banner() {
  console.log(`${C.gold}╭─────────────────────────────────────╮${C.reset}`);
  console.log(`${C.gold}│  Avena Terminal · CLI               │${C.reset}`);
  console.log(`${C.gold}│  European property intelligence     │${C.reset}`);
  console.log(`${C.gold}╰─────────────────────────────────────╯${C.reset}\n`);
}

async function fetchJson(url) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'avena-cli/1.0' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.error(`${C.red}✗${C.reset} ${e.message}`);
    process.exit(1);
  }
}

async function cmdScore(ref) {
  if (!ref) { console.error(`${C.red}Usage:${C.reset} avena score <ref>`); process.exit(1); }
  const d = await fetchJson(`${API}/api/v1/property/${encodeURIComponent(ref)}/ai-summary`);
  if (d.error) { console.error(`${C.red}✗${C.reset} ${d.error}`); process.exit(1); }
  banner();
  console.log(`${C.bold}${d.one_liner}${C.reset}\n`);
  const rows = [
    ['Ref',             d.id],
    ['Canonical ID',    d.canonical_id],
    ['Location',        `${d.location.town} · ${d.location.region ?? '-'} · ${d.location.country}`],
    ['Type',            `${d.type} · ${d.bedrooms}bed / ${d.bathrooms}bath · ${d.built_m2}m²`],
    ['Price',           `€${fmt(d.price_eur)}`],
    ['Price / m²',      d.price_per_m2_eur ? `€${fmt(d.price_per_m2_eur)}` : '—'],
    ['Town median / m²',d.town_median_m2_eur ? `€${fmt(d.town_median_m2_eur)}` : '—'],
    ['Discount',        d.discount_vs_town_pct != null ? `−${d.discount_vs_town_pct}%` : '—'],
    ['Yield (gross)',   d.yield_gross_pct != null ? `${d.yield_gross_pct}%` : '—'],
    ['Avena Score',     `${d.avena_score} / 100`],
    ['Status',          d.status ?? '—'],
    ['Developer',       d.developer ?? '—'],
  ];
  for (const [k, v] of rows) {
    console.log(`  ${C.gray}${k.padEnd(18)}${C.reset}  ${v}`);
  }
  console.log(`\n  ${C.cyan}${d.url}${C.reset}\n`);
}

async function cmdDeals(town) {
  const d = await fetchJson(`${API}/api/v1/market${town ? `?town=${encodeURIComponent(town)}` : ''}`);
  banner();
  // /api/v1/market requires API key; fall back to /api/v1/properties
  const fallback = await fetchJson(`${API}/api/v1/properties`);
  const props = (fallback.properties || fallback || []).slice(0, 20);
  const filtered = town
    ? props.filter((p) => (p.l || p.town || '').toLowerCase().includes(town.toLowerCase()))
    : props;
  const top = filtered
    .filter((p) => (p._sc ?? p.avena_score ?? 0) > 0)
    .sort((a, b) => (b._sc ?? b.avena_score ?? 0) - (a._sc ?? a.avena_score ?? 0))
    .slice(0, 10);

  console.log(`${C.bold}Top 10 deals${town ? ` in ${town}` : ''} by Avena Score${C.reset}\n`);
  console.log(`  ${C.gray}${'#'.padEnd(3)}${'SCORE'.padEnd(7)}${'PROJECT'.padEnd(36)}${'TOWN'.padEnd(16)}${'PRICE'.padStart(12)}${C.reset}`);
  top.forEach((p, i) => {
    const score = (p._sc ?? p.avena_score ?? 0).toFixed(0).padStart(5);
    const project = (p.p || p.project || '').slice(0, 34).padEnd(36);
    const townN = (p.l || p.town || '').slice(0, 14).padEnd(16);
    const price = `€${fmt(p.pf ?? p.price_eur ?? 0)}`.padStart(12);
    console.log(`  ${String(i + 1).padEnd(3)}${C.gold}${score}${C.reset}  ${project}${townN}${price}`);
  });
  console.log(`\n  ${C.cyan}${API}/#deals${C.reset}\n`);
}

async function cmdBubble(city) {
  if (!city) { console.error(`${C.red}Usage:${C.reset} avena bubble <city>`); process.exit(1); }
  const d = await fetchJson(`${API}/api/v1/bubble-scanner?city=${encodeURIComponent(city)}`);
  if (!d.cities || d.cities.length === 0) { console.error(`${C.red}✗${C.reset} City not found`); process.exit(1); }
  const c = d.cities[0];
  banner();
  const statusColor = c.status === 'bubble' ? C.red : c.status === 'overheating' ? C.gold : c.status === 'warming' ? C.gold : C.green;
  console.log(`${C.bold}${c.flag} ${c.name}${C.reset} · ${c.country}`);
  console.log(`  ${C.gray}Bubble status${C.reset}      ${statusColor}${c.status.toUpperCase()}${C.reset}`);
  console.log(`  ${C.gray}Bubble score${C.reset}       ${c.bubbleScore} / 100`);
  console.log(`  ${C.gray}€/m²${C.reset}               €${fmt(c.pricePerM2)}`);
  console.log(`  ${C.gray}YoY change${C.reset}         ${c.yoyChange > 0 ? '+' : ''}${c.yoyChange}%`);
  console.log(`  ${C.gray}Price-to-income${C.reset}    ${c.priceToIncome}x`);
  console.log(`  ${C.gray}Affordability${C.reset}      ${c.affordability} / 100`);
  console.log(`\n  ${C.cyan}${API}/bubble-scanner/${c.slug}${C.reset}\n`);
}

async function cmdCompare(refs) {
  if (!refs || refs.length < 2) { console.error(`${C.red}Usage:${C.reset} avena compare <ref1> <ref2> [ref3...]`); process.exit(1); }
  const data = await Promise.all(refs.slice(0, 4).map((r) =>
    fetchJson(`${API}/api/v1/property/${encodeURIComponent(r)}/ai-summary`)
  ));
  banner();
  const metrics = [
    ['Ref',          (d) => d.id],
    ['Score',        (d) => `${d.avena_score}`],
    ['Price',        (d) => `€${fmt(d.price_eur)}`],
    ['€/m²',         (d) => d.price_per_m2_eur ? `€${fmt(d.price_per_m2_eur)}` : '—'],
    ['Discount',     (d) => d.discount_vs_town_pct != null ? `−${d.discount_vs_town_pct}%` : '—'],
    ['Yield',        (d) => d.yield_gross_pct != null ? `${d.yield_gross_pct}%` : '—'],
    ['Beds',         (d) => `${d.bedrooms}`],
    ['Built m²',     (d) => `${d.built_m2}`],
    ['Town',         (d) => d.location.town],
  ];
  // Header
  process.stdout.write(`  ${C.gray}${'Metric'.padEnd(14)}${C.reset}`);
  data.forEach((d) => process.stdout.write(`${C.bold}${String(d.id).padEnd(14)}${C.reset}`));
  console.log();
  for (const [label, get] of metrics) {
    process.stdout.write(`  ${C.gray}${label.padEnd(14)}${C.reset}`);
    data.forEach((d) => process.stdout.write(`${get(d).padEnd(14)}`));
    console.log();
  }
  const link = `${API}/compare/deals?refs=${refs.slice(0, 4).join(',')}`;
  console.log(`\n  ${C.cyan}${link}${C.reset}\n`);
}

async function cmdAvn(id) {
  if (!id) { console.error(`${C.red}Usage:${C.reset} avena avn <AVN:ES-...-NB-0421>`); process.exit(1); }
  const d = await fetchJson(`${API}/api/v1/avn/${encodeURIComponent(id)}`);
  banner();
  console.log(`${C.bold}${id}${C.reset}\n`);
  console.log(JSON.stringify(d, null, 2));
}

function cmdHelp() {
  banner();
  console.log(`${C.bold}COMMANDS${C.reset}`);
  const cmds = [
    ['score',   '<ref>',                    'Full Avena Score breakdown for a property'],
    ['deals',   '[town]',                   'Top 10 deals by score, optional town filter'],
    ['bubble',  '<city>',                   'Bubble scanner for a European city'],
    ['compare', '<ref1> <ref2> [ref3]',     'Side-by-side up to 4 properties'],
    ['avn',     '<AVN:ES-...-NB-0421>',     'Resolve canonical AVN_PROP_ID'],
    ['help',    '',                         'Show this message'],
  ];
  cmds.forEach(([c, a, d]) => {
    console.log(`  ${C.gold}avena ${c.padEnd(7)}${C.reset} ${C.dim}${a.padEnd(28)}${C.reset}${d}`);
  });
  console.log(`\n${C.bold}LINKS${C.reset}`);
  console.log(`  ${C.cyan}https://avenaterminal.com${C.reset}          Full terminal`);
  console.log(`  ${C.cyan}https://avenaterminal.com/cli${C.reset}      CLI docs`);
  console.log(`  ${C.cyan}https://avenaterminal.com/mcp-server${C.reset}  MCP server for AI agents\n`);
  console.log(`${C.dim}All data CC BY 4.0 · DOI 10.5281/zenodo.19520064${C.reset}\n`);
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  switch ((cmd || 'help').toLowerCase()) {
    case 'score':   return cmdScore(rest[0]);
    case 'deals':   return cmdDeals(rest[0]);
    case 'bubble':  return cmdBubble(rest[0]);
    case 'compare': return cmdCompare(rest);
    case 'avn':     return cmdAvn(rest[0]);
    case '-v':
    case '--version': return console.log('avena 1.0.0');
    case 'help':
    case '-h':
    case '--help':
    default:        return cmdHelp();
  }
}

main();

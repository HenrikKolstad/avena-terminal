#!/usr/bin/env node
const { scoreProperty } = require('../src/index.js');

const args = {};
let lastKey = null;
for (const a of process.argv.slice(2)) {
  if (a.startsWith('--')) { lastKey = a.slice(2); args[lastKey] = true; }
  else if (lastKey) { args[lastKey] = a; lastKey = null; }
}

if (args.help || Object.keys(args).length === 0) {
  console.log(`avena-score — open-source property scoring CLI

Usage:
  avena-score --price 385000 --built 176 --region "costa blanca" \\
              --type villa --beds 3 --beach 0.8 --town-median 2543

Flags:
  --price <eur>        Price in EUR (required)
  --built <m2>         Built area in m² (required)
  --beds <n>           Bedrooms
  --baths <n>          Bathrooms
  --beach <km>         Distance to beach
  --type <t>           villa | apartment | penthouse | townhouse | bungalow
  --town <name>        Town name
  --region <name>      Region (costa blanca, costa del sol, algarve, etc.)
  --town-median <eur>  Town median €/m² (optional comp)
  --regional-median <eur>  Regional fallback €/m²
  --json               Output raw JSON instead of formatted table

Docs: https://avenaterminal.com/score`);
  process.exit(0);
}

const input = {
  price_eur: Number(args.price),
  built_m2: Number(args.built),
  bedrooms: args.beds ? Number(args.beds) : undefined,
  bathrooms: args.baths ? Number(args.baths) : undefined,
  beach_km: args.beach ? Number(args.beach) : null,
  property_type: args.type,
  town: args.town,
  region: args.region,
  town_median_m2: args['town-median'] ? Number(args['town-median']) : null,
  regional_median_m2: args['regional-median'] ? Number(args['regional-median']) : null,
};

const result = scoreProperty(input);

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const C = { reset: '\x1b[0m', bold: '\x1b[1m', gold: '\x1b[38;5;214m', gray: '\x1b[38;5;240m', cyan: '\x1b[38;5;87m' };
console.log(`\n${C.bold}Avena Score${C.reset}  ${C.gold}${result.score}/100${C.reset}`);
console.log(`${C.gray}${result.verdict}${C.reset}\n`);
if (result.pm2)                  console.log(`  €/m²                  €${result.pm2.toLocaleString()}`);
if (result.discount_vs_market_pct != null) console.log(`  Discount vs market    ${result.discount_vs_market_pct > 0 ? '−' : '+'}${Math.abs(result.discount_vs_market_pct)}%`);
if (result.yield_gross_pct != null)        console.log(`  Est. gross yield      ${result.yield_gross_pct}%`);
console.log('');
result.components.forEach((c) => {
  const bar = '█'.repeat(Math.round(c.value * 20)) + '░'.repeat(20 - Math.round(c.value * 20));
  console.log(`  ${C.gold}${c.code}${C.reset} ${C.gray}${('w' + Math.round(c.weight * 100) + '%').padEnd(4)}${C.reset}  ${bar}  ${(c.value * 100).toFixed(0).padStart(3)}/100   ${C.gray}${c.reasoning}${C.reset}`);
});
if (result.warnings.length > 0) {
  console.log(`\n${C.gray}Caveats:${C.reset}`);
  result.warnings.forEach((w) => console.log(`  ${C.gray}· ${w}${C.reset}`));
}
console.log(`\n${C.cyan}https://avenaterminal.com/score${C.reset}\n`);

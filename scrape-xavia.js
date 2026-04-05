// scrape-xavia.js — scrapes Xavia per town, matches to data.json
const fetch = require('node-fetch');
const fs = require('fs');

const BASE = 'https://www.xaviaestate.com';
const OUTPUT_LISTINGS = 'xavia-listings.json';
const OUTPUT_DATA = 'public/data.json';
const DELAY = 500;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// All Xavia town/location IDs
const TOWNS = [
  { name: 'Albir', id: 373, prov: 4 },
  { name: 'Alenda Golf', id: 3876, prov: 4 },
  { name: 'Algorfa', id: 19, prov: 4 },
  { name: 'Alicante', id: 100, prov: 4 },
  { name: 'Almoradi', id: 96, prov: 4 },
  { name: 'Altaona Golf', id: 457, prov: 5 },
  { name: 'Altea', id: 68, prov: 4 },
  { name: 'Benidorm', id: 38, prov: 4 },
  { name: 'Benijofar', id: 18, prov: 4 },
  { name: 'Bigastro', id: 99, prov: 4 },
  { name: 'Cabo Roig', id: 27, prov: 4 },
  { name: 'Calpe', id: 69, prov: 4 },
  { name: 'Campoamor', id: 46, prov: 4 },
  { name: 'Cartagena', id: 188, prov: 5 },
  { name: 'Ciudad Quesada', id: 17, prov: 4 },
  { name: 'Daya Nueva', id: 42, prov: 4 },
  { name: 'Denia', id: 181, prov: 4 },
  { name: 'Dolores', id: 22, prov: 4 },
  { name: 'El Campello', id: 67, prov: 4 },
  { name: 'El Raso', id: 41, prov: 4 },
  { name: 'Finestrat', id: 65, prov: 4 },
  { name: 'Formentera del Segura', id: 31, prov: 4 },
  { name: 'Golf La Marquesa', id: 4487, prov: 4 },
  { name: 'Gran Alacant', id: 35, prov: 4 },
  { name: 'Guardamar del Segura', id: 14, prov: 4 },
  { name: 'Hondon de las Nieves', id: 124, prov: 4 },
  { name: 'La Finca Golf Resort', id: 481, prov: 4 },
  { name: 'La Manga Club', id: 1669, prov: 5 },
  { name: 'La Manga del Mar Menor', id: 206, prov: 5 },
  { name: 'La Marina', id: 23, prov: 4 },
  { name: 'La Nucia', id: 72, prov: 4 },
  { name: 'La Serena Golf', id: 1557, prov: 5 },
  { name: 'La Zenia', id: 29, prov: 4 },
  { name: 'Las Colinas Golf', id: 247, prov: 4 },
  { name: 'Las Filipinas', id: 103, prov: 4 },
  { name: 'Lo Pagan', id: 241, prov: 5 },
  { name: 'Lo Romero Golf', id: 497, prov: 4 },
  { name: 'Lomas de Campoamor', id: 526, prov: 4 },
  { name: 'Los Alcazares', id: 49, prov: 5 },
  { name: 'Los Balcones', id: 39, prov: 4 },
  { name: 'Los Montesinos', id: 52, prov: 4 },
  { name: 'Los Nietos', id: 458, prov: 5 },
  { name: 'Los Urrutias', id: 205, prov: 5 },
  { name: 'Mil Palmeras', id: 63, prov: 4 },
  { name: 'Moraira', id: 5, prov: 4 },
  { name: 'Mutxamel', id: 256, prov: 4 },
  { name: 'Pilar de la Horadada', id: 43, prov: 4 },
  { name: 'Pinar de Campoverde', id: 74, prov: 4 },
  { name: 'Playa Flamenca', id: 21, prov: 4 },
  { name: 'Playa Honda', id: 118, prov: 5 },
  { name: 'Polop', id: 64, prov: 4 },
  { name: 'Puerto de Mazarron', id: 58, prov: 5 },
  { name: 'Punta Prima', id: 15, prov: 4 },
  { name: 'Roda Golf Resort', id: 2782, prov: 5 },
  { name: 'Rojales', id: 82, prov: 4 },
  { name: 'San Fulgencio', id: 73, prov: 4 },
  { name: 'San Javier', id: 70, prov: 5 },
  { name: 'San Juan de Alicante', id: 3424, prov: 4 },
  { name: 'San Miguel de Salinas', id: 32, prov: 4 },
  { name: 'San Pedro del Pinatar', id: 50, prov: 5 },
  { name: 'Santa Pola', id: 53, prov: 4 },
  { name: 'Santa Rosalia Resort', id: 2779, prov: 5 },
  { name: 'Santiago de la Ribera', id: 87, prov: 5 },
  { name: 'Torre de la Horadada', id: 86, prov: 4 },
  { name: 'Torre Pacheco', id: 102, prov: 5 },
  { name: 'Torrevieja', id: 16, prov: 4 },
  { name: 'Villajoyosa', id: 71, prov: 4 },
  { name: 'Villamartin', id: 24, prov: 4 },
  { name: 'Vistabella Golf', id: 2626, prov: 4 },
];

function parseListingsFromHtml(html, townName) {
  const listings = [];
  const seen = new Set();
  const re = /https?:\/\/www\.xaviaestate\.com\/en\/property\/(\d+)\/([\w-]+)-(XE[A-Z0-9]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const xeRef = m[3];
    if (seen.has(xeRef)) continue;
    seen.add(xeRef);
    const slug = m[2];
    // Extract price
    const priceCtx = html.substring(Math.max(0, m.index - 2000), m.index + 500);
    const priceMatch = priceCtx.match(/€\s*([\d]{2,3}[,\.][\d]{3})/g);
    let price = null;
    if (priceMatch) {
      price = parseInt(priceMatch[priceMatch.length - 1].replace(/[€\s,\.]/g, '').padEnd(6, '0').slice(0, 6)) || null;
      // Better: just parse the raw digits
      const raw = priceMatch[priceMatch.length - 1].replace(/[€\s]/g, '').replace(/\./g, '').replace(/,/g, '');
      price = parseInt(raw) || null;
    }
    // Extract type from slug
    const typePart = slug.split('-for-sale-in-')[0] || '';
    const type = typePart.charAt(0).toUpperCase() + typePart.slice(1);

    listings.push({
      xeRef,
      url: `${BASE}/en/property/${m[1]}/${m[2]}-${xeRef}`,
      town: townName,
      type,
      price,
    });
  }
  return listings;
}

async function scrapeTown(town) {
  const listings = [];
  let page = 1;
  const seen = new Set();

  while (page <= 20) {
    const url = `${BASE}/search-property/province_${town.prov}/city_${town.id}/page_${page}/order_ddesc/`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) break;
      const html = await res.text();
      const found = parseListingsFromHtml(html, town.name);
      const newOnes = found.filter(l => !seen.has(l.xeRef));
      if (newOnes.length === 0) break;
      newOnes.forEach(l => seen.add(l.xeRef));
      listings.push(...newOnes);
      page++;
      await sleep(DELAY);
    } catch { break; }
  }
  return listings;
}

async function scrapeAll() {
  const all = [];
  const seenGlobal = new Set();

  for (let i = 0; i < TOWNS.length; i++) {
    const town = TOWNS[i];
    process.stdout.write(`[${i+1}/${TOWNS.length}] ${town.name}... `);
    const listings = await scrapeTown(town);
    const newOnes = listings.filter(l => !seenGlobal.has(l.xeRef));
    newOnes.forEach(l => seenGlobal.add(l.xeRef));
    console.log(`${newOnes.length} listings`);
    all.push(...newOnes);
    await sleep(300);
  }

  console.log(`\nTotal: ${all.length} unique listings`);
  return all;
}

function norm(s) {
  return (s || '').toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íì]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchAndUpdate(xaviaListings) {
  const data = JSON.parse(fs.readFileSync(OUTPUT_DATA, 'utf8'));

  // Group by town
  const byTown = {};
  for (const x of xaviaListings) {
    const nt = norm(x.town);
    if (!byTown[nt]) byTown[nt] = [];
    byTown[nt].push(x);
  }

  // Also build a combined key: town + type
  const byTownType = {};
  for (const x of xaviaListings) {
    const key = norm(x.town) + '|' + norm(x.type);
    if (!byTownType[key]) byTownType[key] = [];
    byTownType[key].push(x);
  }

  let matched = 0, priceMatch = 0, townTypeMatch = 0, fallback = 0;

  for (const prop of data) {
    const town = (prop.l || '').split(',')[0].trim();
    const nt = norm(town);
    const propTypeNorm = norm(prop.t?.split(' ')[0] || '');
    const candidates = byTown[nt] || [];

    if (candidates.length === 0) { fallback++; continue; }

    if (candidates.length === 1) {
      prop.u = candidates[0].url;
      prop.xeRef = candidates[0].xeRef;
      matched++; continue;
    }

    // Try price match (within 5%)
    if (prop.pf) {
      const priceMatched = candidates.filter(c => c.price && Math.abs(c.price - prop.pf) / prop.pf < 0.05);
      if (priceMatched.length === 1) {
        prop.u = priceMatched[0].url;
        prop.xeRef = priceMatched[0].xeRef;
        priceMatch++; continue;
      }
    }

    // Try town + type match
    const ttKey = nt + '|' + propTypeNorm;
    const ttCandidates = byTownType[ttKey] || [];
    if (ttCandidates.length === 1) {
      prop.u = ttCandidates[0].url;
      prop.xeRef = ttCandidates[0].xeRef;
      townTypeMatch++; continue;
    }

    // Keep search URL
    fallback++;
  }

  const totalMatched = matched + priceMatch + townTypeMatch;
  console.log(`\nMatched ${totalMatched}/${data.length} properties to direct Xavia links:`);
  console.log(`  Town only (1 match): ${matched}`);
  console.log(`  Price match: ${priceMatch}`);
  console.log(`  Town+type match: ${townTypeMatch}`);
  console.log(`  Search URL fallback: ${fallback}`);

  fs.writeFileSync(OUTPUT_DATA, JSON.stringify(data));
  console.log('Updated data.json');
}

async function main() {
  let listings;
  if (fs.existsSync(OUTPUT_LISTINGS)) {
    listings = JSON.parse(fs.readFileSync(OUTPUT_LISTINGS, 'utf8'));
    console.log(`Loaded ${listings.length} cached listings`);
  } else {
    listings = await scrapeAll();
    fs.writeFileSync(OUTPUT_LISTINGS, JSON.stringify(listings, null, 2));
  }
  matchAndUpdate(listings);
}

main().catch(console.error);

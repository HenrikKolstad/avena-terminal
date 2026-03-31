const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const FEED_URL = 'https://xml.redsp.net/files/915/89215pmi61h/ella-properties-spain-redsp_v4.xml';
const OUTPUT = 'public/data.json';

// Region mapping from costa field
function mapRegion(costa) {
  if (!costa) return 'cb-south';
  const c = costa.toLowerCase();
  if (c.includes('blanca south')) return 'cb-south';
  if (c.includes('blanca north')) return 'cb-north';
  if (c.includes('calida')) return 'costa-calida';
  if (c.includes('almeria')) return 'costa-almeria';
  if (c.includes('valencia')) return 'costa-valencia';
  return 'cb-south';
}

// Normalize property type
function mapType(type) {
  if (!type) return 'Apartment';
  const t = type.toLowerCase();
  if (t.includes('villa')) return 'Villa';
  if (t.includes('town') || t.includes('semi')) return 'Townhouse';
  if (t.includes('bungalow') || t.includes('quad')) return 'Bungalow';
  if (t.includes('penthouse') || t.includes('semi penthouse')) return 'Penthouse';
  if (t.includes('studio')) return 'Studio';
  return 'Apartment'; // apartment, ground floor apartment
}

// RESALE market prices (€/m²) — these are what investors compare new-build against
// Sources: SpainHouses.net (Mar 2026), Idealista (Jan 2026), Investropa, 5RealEstate
// These represent the RESALE/secondary market, NOT new-build prices
// New builds typically trade at 20-40% premium over resale

// Regional defaults (resale averages, all property types combined)
const marketPrices = {
  'cb-south': { Apartment: 3100, Villa: 2800, Townhouse: 2900, Bungalow: 2800, Penthouse: 3500, Studio: 3200 },
  'cb-north': { Apartment: 4200, Villa: 3800, Townhouse: 3600, Bungalow: 3800, Penthouse: 4800, Studio: 4200 },
  'costa-calida': { Apartment: 2800, Villa: 2400, Townhouse: 2600, Bungalow: 2500, Penthouse: 3200, Studio: 2800 },
  'costa-almeria': { Apartment: 2200, Villa: 2000, Townhouse: 2100, Bungalow: 2000, Penthouse: 2600, Studio: 2200 },
  'costa-valencia': { Apartment: 2800, Villa: 2500, Townhouse: 2600, Bungalow: 2500, Penthouse: 3200, Studio: 2800 },
};

// Town-specific resale market prices (€/m²)
// Apartment = flats, penthouses, bungalows, studios
// Villa = villas, townhouses, semi-detached
// Source: SpainHouses.net averages (Mar 2026) cross-referenced with Idealista
const townMarket = {
  // COSTA BLANCA SOUTH
  'Torrevieja':              { Apartment: 3100, Villa: 2800 }, // SpainHouses €3098
  'Pilar de La Horadada':    { Apartment: 3860, Villa: 3500 }, // SpainHouses €3863
  'Pilar de la Horadada':    { Apartment: 3860, Villa: 3500 },
  'Orihuela Costa':          { Apartment: 3450, Villa: 3200 }, // SpainHouses Orihuela €3452
  'Orihuela':                { Apartment: 3450, Villa: 3200 },
  'Santa Pola':              { Apartment: 3270, Villa: 3000 }, // SpainHouses €3267
  'Guardamar del Segura':    { Apartment: 3290, Villa: 3000 }, // SpainHouses €3289
  'Guardamar':               { Apartment: 3290, Villa: 3000 },
  'Algorfa':                 { Apartment: 2600, Villa: 2400 }, // Inland golf, below coast avg
  'San Miguel de Salinas':   { Apartment: 2500, Villa: 2300 }, // Inland, affordable
  'Rojales':                 { Apartment: 2600, Villa: 2400 },
  'Ciudad Quesada':          { Apartment: 2700, Villa: 2500 },
  'Benijofar':               { Apartment: 2500, Villa: 2300 },
  'San Fulgencio':           { Apartment: 2400, Villa: 2200 },
  'La Marina':               { Apartment: 2600, Villa: 2400 },
  'Dolores':                 { Apartment: 2200, Villa: 2000 },
  'Cox':                     { Apartment: 2200, Villa: 2000 },
  'Catral':                  { Apartment: 2100, Villa: 1900 },
  'Bigastro':                { Apartment: 2200, Villa: 2000 },
  'Jacarilla':               { Apartment: 2100, Villa: 1900 },
  'Daya Nueva':              { Apartment: 2300, Villa: 2100 },
  'Los Montesinos':          { Apartment: 2600, Villa: 2400 },
  'Pinoso':                  { Apartment: 1800, Villa: 1600 }, // Deep inland
  'Hondón de las Nieves':    { Apartment: 1700, Villa: 1500 }, // Deep inland
  'Aspe':                    { Apartment: 1800, Villa: 1600 },
  'Monforte del Cid':        { Apartment: 1900, Villa: 1700 },
  'La Romana':               { Apartment: 1800, Villa: 1600 },
  'Alicante':                { Apartment: 3380, Villa: 3100 }, // SpainHouses €3383
  'Elche':                   { Apartment: 2760, Villa: 2500 },
  // COSTA BLANCA NORTH
  'Calpe':                   { Apartment: 4150, Villa: 3800 }, // SpainHouses €4145
  'Benidorm':                { Apartment: 4480, Villa: 4000 }, // SpainHouses €4475
  'Altea':                   { Apartment: 4130, Villa: 3800 }, // SpainHouses €4130
  'Jávea Xàbia':             { Apartment: 4400, Villa: 4000 }, // SpainHouses Jávea €4407
  'Javea':                   { Apartment: 4400, Villa: 4000 },
  'Denia':                   { Apartment: 3800, Villa: 3500 }, // SpainHouses Dénia €3800
  'Finestrat':               { Apartment: 3840, Villa: 3500 }, // SpainHouses €3838
  'Villajoyosa':             { Apartment: 4640, Villa: 4200 }, // SpainHouses €4636
  'El Campello':             { Apartment: 4830, Villa: 4400 }, // SpainHouses €4825
  'Benissa':                 { Apartment: 4450, Villa: 4000 }, // SpainHouses €4445
  'Moraira':                 { Apartment: 4640, Villa: 4200 }, // SpainHouses Moraira €4638
  'Moraira_Teulada':         { Apartment: 4640, Villa: 4200 },
  'Teulada':                 { Apartment: 3890, Villa: 3500 }, // SpainHouses €3889
  'Benitachell':             { Apartment: 3570, Villa: 3200 }, // SpainHouses €3571
  'Alfas del Pi':            { Apartment: 4040, Villa: 3700 }, // SpainHouses €4042
  'El Verger':               { Apartment: 3820, Villa: 3500 },
  'Els Poblets':             { Apartment: 3820, Villa: 3500 },
  'Polop':                   { Apartment: 3000, Villa: 2700 }, // Inland
  'la Nucia':                { Apartment: 3200, Villa: 2900 },
  'Relleu':                  { Apartment: 2200, Villa: 2000 }, // Rural inland
  'Penaguila':               { Apartment: 1800, Villa: 1600 }, // Rural
  'Mutxamel':                { Apartment: 3200, Villa: 2900 },
  // COSTA CALIDA
  'Los Alcazares':           { Apartment: 3710, Villa: 3400 }, // SpainHouses €3714
  'San Pedro del Pinatar':   { Apartment: 3390, Villa: 3100 }, // SpainHouses €3392
  'San Javier':              { Apartment: 3640, Villa: 3300 }, // SpainHouses €3639
  'Cartagena':               { Apartment: 3090, Villa: 2800 }, // SpainHouses €3093
  'Torre Pacheco':           { Apartment: 2200, Villa: 2000 }, // Inland
  'Aguilas':                 { Apartment: 3520, Villa: 3200 }, // SpainHouses €3517
  'Mazarrón':                { Apartment: 2000, Villa: 1800 }, // SpainHouses €2000
  'Puerto de Mazarron':      { Apartment: 2400, Villa: 2200 }, // Coastal part higher
  'La Manga del Mar Menor':  { Apartment: 2880, Villa: 2600 }, // SpainHouses €2875
  'La Manga Club':           { Apartment: 3200, Villa: 2900 }, // Resort premium
  'Baños y Mendigo':         { Apartment: 2400, Villa: 2200 }, // Inland resort
  'La Manga':                { Apartment: 2880, Villa: 2600 },
};

function getMarketPrice(town, region, type) {
  // Check town-specific first
  if (town && townMarket[town]) {
    const simpleType = type === 'Penthouse' ? 'Apartment' : type === 'Bungalow' ? 'Apartment' : type === 'Studio' ? 'Apartment' : type === 'Townhouse' ? 'Villa' : type;
    if (townMarket[town][simpleType]) return townMarket[town][simpleType];
  }
  const regionPrices = marketPrices[region] || marketPrices['cb-south'];
  return regionPrices[type] || regionPrices['Apartment'];
}

function getStatus(prop) {
  if (prop.off_plan === 1 || prop.off_plan === '1') return 'off-plan';
  if (prop.key_ready === 1 || prop.key_ready === '1') return 'ready';
  return 'under-construction';
}

function getText(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (field.en) return field.en.toString().replace(/&#13;/g, '\n').trim();
  return '';
}

function getImages(prop) {
  if (!prop.images || !prop.images.image) return [];
  const imgs = Array.isArray(prop.images.image) ? prop.images.image : [prop.images.image];
  return imgs.map(img => img.url).filter(Boolean).slice(0, 15);
}

function parseProperty(prop) {
  const town = prop.address?.town || '';
  const province = prop.address?.province || '';
  const costa = prop.costa || '';
  const region = mapRegion(costa);
  const type = mapType(prop.type);
  const price = parseInt(prop.price) || 0;
  const priceTo = parseInt(prop.price_to) || 0;
  const builtM2 = parseInt(prop.surface_area?.built_m2) || 0;
  const usableM2 = parseInt(prop.surface_area?.usable_living_area_m2) || 0;
  const plotM2 = parseInt(prop.surface_area?.plot_m2) || 0;
  const terraceM2 = parseInt(prop.surface_area?.terrace_m2) || 0;
  const solariumM2 = parseInt(prop.surface_area?.solarium_area_m2) || 0;
  const beds = parseInt(prop.beds) || 0;
  const baths = parseInt(prop.baths) || 0;
  const beachM = parseInt(prop.distances?.distance_to_beach_m) || 0;
  const beachKm = beachM > 0 ? +(beachM / 1000).toFixed(1) : null;
  const lat = parseFloat(prop.location?.latitude) || null;
  const lng = parseFloat(prop.location?.longitude) || null;
  const mm2 = getMarketPrice(town, region, type);
  const area = usableM2 > 0 ? usableM2 : builtM2; // prefer usable area

  if (price <= 0 || area <= 0) return null;

  const title = getText(prop.title);
  const desc = getText(prop.desc);
  const images = getImages(prop);

  // Delivery date
  let completion = 'TBA';
  if (prop.delivery_date) {
    const d = prop.delivery_date.toString();
    if (d.length >= 7) {
      const [y, m] = d.split('-');
      const quarter = Math.ceil(parseInt(m) / 3);
      completion = `${y}-Q${quarter}`;
    }
  }

  // Categories
  const categories = [];
  if (prop.category?.golf == 1) categories.push('golf');
  if (prop.category?.beach == 1) categories.push('beach');
  if (prop.category?.urban == 1) categories.push('urban');
  if (prop.category?.countryside == 1) categories.push('countryside');
  if (prop.category?.first_line == 1) categories.push('frontline');

  // Views
  const views = [];
  if (prop.views?.sea_views == 1) views.push('sea');
  if (prop.views?.mountain_views == 1) views.push('mountain');
  if (prop.views?.pool_views == 1) views.push('pool');
  if (prop.views?.garden_views == 1) views.push('garden');
  if (prop.views?.open_views == 1) views.push('open');

  return {
    d: 'Via Xavia Estate',
    p: title || `${type} in ${town}`,
    l: province ? `${town}, ${province}` : town,
    r: region,
    t: type,
    pf: price,
    pt: priceTo > 0 ? priceTo : price,
    mm2,
    bm: area,
    bm_full: builtM2,
    terrace: terraceM2,
    solarium: solariumM2,
    pl: plotM2 > 0 ? plotM2 : null,
    bd: beds,
    ba: baths,
    bk: beachKm,
    c: completion,
    s: getStatus(prop),
    dy: 0,
    f: desc.substring(0, 400),
    u: `https://www.xaviaestate.com/en/property/${prop.ref || prop.id}/`,
    ref: prop.ref || prop.id,
    dev_ref: prop.development_ref || null,
    imgs: images,
    lat, lng,
    cats: categories,
    views,
    energy: prop.energy_rating?.consumption || null,
    parking: parseInt(prop.parking?.number_of_parking_spaces) || 0,
    pool: prop.pools?.private_pool == 1 ? 'private' : prop.pools?.communal_pool == 1 ? 'communal' : prop.pools?.pool == 1 ? 'yes' : 'no',
    costa: costa,
  };
}

async function main() {
  console.log('Downloading XML feed...');
  const res = await fetch(FEED_URL);
  const xml = await res.text();
  console.log(`Downloaded ${(xml.length / 1024 / 1024).toFixed(1)}MB`);

  console.log('Parsing XML...');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  const data = parser.parse(xml);

  const properties = Array.isArray(data.root.property) ? data.root.property : [data.root.property];
  console.log(`Found ${properties.length} properties in feed`);

  // Filter: new builds only + Costa Blanca & Calida only (no Almería, Valencia)
  const allowedCostas = ['costa blanca south', 'costa blanca north', 'costa calida', 'costa blanca south - inland', 'costa blanca north - inland'];
  const parsed = properties
    .filter(p => p.new_build == 1)
    .filter(p => {
      const costa = (p.costa || '').toLowerCase();
      return allowedCostas.some(c => costa.includes(c.split(' - ')[0]) || c.includes(costa));
    })
    .filter(p => {
      // Exclude resale/renovated disguised as new builds
      const title = ((p.title?.en) || '').toLowerCase();
      const desc = ((p.desc?.en) || '').toLowerCase();
      const combined = title + ' ' + desc;

      // Keyword exclusions
      const excludeKeywords = ['renovate', 'renovated', 'renovation', 'regenerated', 'reform',
        'resale', 'second hand', 'secondhand', 'bank repo', 'private pier',
        'recently built', 'already built'];
      if (excludeKeywords.some(kw => combined.includes(kw))) {
        console.log('  EXCLUDED (keyword):', title.substring(0, 60));
        return false;
      }

      // Delivery date in the past (before 2025) = already completed, likely resale
      if (p.delivery_date) {
        const deliveryYear = parseInt(p.delivery_date.toString().split('-')[0]);
        if (deliveryYear < 2025) {
          console.log('  EXCLUDED (old delivery ' + p.delivery_date + '):', title.substring(0, 60));
          return false;
        }
      }

      // year_build before 2023 = definitely not a new build
      const yearBuild = parseInt(p.year_build);
      if (yearBuild && yearBuild < 2023) {
        console.log('  EXCLUDED (year_build ' + yearBuild + '):', title.substring(0, 60));
        return false;
      }

      // Only include towns/areas that Xavia Estate actually advertises
      const town = (p.address?.town || '').toLowerCase();
      const locDetail = (p.location_detail_1 || '').toLowerCase();
      const combined_loc = town + ' ' + locDetail;

      // Towns Xavia does NOT cover (verified against xaviaestate.com active listings Mar 2026)
      const excludedTowns = [
        'pinoso', 'aspe', 'catral', 'cox', 'monforte del cid', 'la romana',
        'penaguila', 'jacarilla', 'benejúzar', 'el rafol d\'almunia',
        'rafal', 'cabo de palos', 'baños y mendigo',
        'aguilas', 'el verger', 'els poblets',
      ];
      if (excludedTowns.some(t => town.includes(t))) {
        console.log('  EXCLUDED (town not on Xavia):', town, '-', title.substring(0, 40));
        return false;
      }

      return true;
    })
    .map(parseProperty)
    .filter(Boolean);

  console.log(`Parsed ${parsed.length} new-build properties`);

  // Deduplicate by ref
  const seen = new Set();
  const unique = parsed.filter(p => {
    if (seen.has(p.ref)) return false;
    seen.add(p.ref);
    return true;
  });

  console.log(`${unique.length} unique properties after dedup`);

  // Stats
  const regions = {};
  const types = {};
  unique.forEach(p => {
    regions[p.r] = (regions[p.r] || 0) + 1;
    types[p.t] = (types[p.t] || 0) + 1;
  });
  console.log('By region:', regions);
  console.log('By type:', types);
  console.log(`With images: ${unique.filter(p => p.imgs.length > 0).length}`);
  console.log(`With GPS: ${unique.filter(p => p.lat && p.lng).length}`);

  fs.writeFileSync(OUTPUT, JSON.stringify(unique, null, 0));
  console.log(`Wrote ${OUTPUT} (${(fs.statSync(OUTPUT).size / 1024).toFixed(0)}KB)`);
}

main().catch(console.error);

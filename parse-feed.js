const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const FEED_URL = 'https://xml.redsp.net/files/915/89215pmi61h/ella-properties-spain-redsp_v4.xml';
const OUTPUT = 'public/data.json';

// Xavia Estate location IDs — maps town name → search URL
const xaviaLocations = {
  'Albir': { id: 373, prov: 4 },
  'Alenda Golf': { id: 3876, prov: 4 },
  'Algorfa': { id: 19, prov: 4 },
  'Alicante': { id: 100, prov: 4 },
  'Almoradi': { id: 96, prov: 4 },
  'Almoradí': { id: 96, prov: 4 },
  'Altaona Golf': { id: 457, prov: 5 },
  'Altea': { id: 68, prov: 4 },
  'Benidorm': { id: 38, prov: 4 },
  'Benijofar': { id: 18, prov: 4 },
  'Bigastro': { id: 99, prov: 4 },
  'Cabo Roig': { id: 27, prov: 4 },
  'Calpe': { id: 69, prov: 4 },
  'Campoamor': { id: 46, prov: 4 },
  'Cartagena': { id: 188, prov: 5 },
  'Ciudad Quesada': { id: 17, prov: 4 },
  'Daya Nueva': { id: 42, prov: 4 },
  'Denia': { id: 181, prov: 4 },
  'Dolores': { id: 22, prov: 4 },
  'El Campello': { id: 67, prov: 4 },
  'El Raso': { id: 41, prov: 4 },
  'Finestrat': { id: 65, prov: 4 },
  'Formentera del Segura': { id: 31, prov: 4 },
  'Golf La Marquesa': { id: 4487, prov: 4 },
  'Gran Alacant': { id: 35, prov: 4 },
  'Guardamar del Segura': { id: 14, prov: 4 },
  'Hondon de las Nieves': { id: 124, prov: 4 },
  'Hondón de las Nieves': { id: 124, prov: 4 },
  'La Finca Golf Resort': { id: 481, prov: 4 },
  'La Manga Club': { id: 1669, prov: 5 },
  'La Manga del Mar Menor': { id: 206, prov: 5 },
  'La Marina': { id: 23, prov: 4 },
  'La Nucia': { id: 72, prov: 4 },
  'La Serena Golf': { id: 1557, prov: 5 },
  'La Zenia': { id: 29, prov: 4 },
  'Las Colinas Golf': { id: 247, prov: 4 },
  'Las Filipinas': { id: 103, prov: 4 },
  'Lo Pagan': { id: 241, prov: 5 },
  'Lo Romero Golf': { id: 497, prov: 4 },
  'Lomas de Campoamor': { id: 526, prov: 4 },
  'Los Alcazares': { id: 49, prov: 5 },
  'Los Alcázares': { id: 49, prov: 5 },
  'Los Balcones': { id: 39, prov: 4 },
  'Los Montesinos': { id: 52, prov: 4 },
  'Mil Palmeras': { id: 63, prov: 4 },
  'Moraira': { id: 5, prov: 4 },
  'Orihuela Costa': { id: 46, prov: 4 },
  'Pilar de La Horadada': { id: 43, prov: 4 },
  'Pilar de la Horadada': { id: 43, prov: 4 },
  'Pinar de Campoverde': { id: 74, prov: 4 },
  'Playa Flamenca': { id: 21, prov: 4 },
  'Playa Honda': { id: 118, prov: 5 },
  'Polop': { id: 64, prov: 4 },
  'Puerto de Mazarron': { id: 58, prov: 5 },
  'Puerto de Mazarrón': { id: 58, prov: 5 },
  'Punta Prima': { id: 15, prov: 4 },
  'Rojales': { id: 82, prov: 4 },
  'San Fulgencio': { id: 73, prov: 4 },
  'San Javier': { id: 70, prov: 5 },
  'San Miguel de Salinas': { id: 32, prov: 4 },
  'San Pedro del Pinatar': { id: 50, prov: 5 },
  'Santa Pola': { id: 53, prov: 4 },
  'Santa Rosalia Resort': { id: 2779, prov: 5 },
  'Santiago de la Ribera': { id: 87, prov: 5 },
  'Torre de la Horadada': { id: 86, prov: 4 },
  'Torre Pacheco': { id: 102, prov: 5 },
  'Torrevieja': { id: 16, prov: 4 },
  'Villajoyosa': { id: 71, prov: 4 },
  'Villamartin': { id: 24, prov: 4 },
  'Villamartín': { id: 24, prov: 4 },
  'Vistabella Golf': { id: 2626, prov: 4 },
  'Allonbay': { id: 71, prov: 4 }, // Villajoyosa area
  'Alfaz del Pi': { id: 373, prov: 4 },
  'Alfas del Pi': { id: 373, prov: 4 },
  'Jávea Xàbia': { id: 6, prov: 4 },
  'Javea Xabia': { id: 6, prov: 4 },
  'Moraira_Teulada': { id: 5, prov: 4 },
  'La Union': { id: 1035, prov: 5 },
  'Benissa': { id: 69, prov: 4 }, // near Calpe
  'Benitachell': { id: 5, prov: 4 }, // near Moraira
  'Orihuela': { id: 46, prov: 4 },
  'la Nucia': { id: 72, prov: 4 },
  'San Juan Alicante': { id: 3424, prov: 4 },
  'Los Nietos': { id: 458, prov: 5 },
  'Mutxamel': { id: 256, prov: 4 },
  'Los Urrutias': { id: 205, prov: 5 },
};

function getXaviaUrl(town) {
  const loc = xaviaLocations[town];
  if (loc) {
    return `https://www.xaviaestate.com/search-property/province_${loc.prov}/city_${loc.id}/page_1/order_ddesc/`;
  }
  return 'https://www.xaviaestate.com/en/properties/';
}

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

// New-build benchmark prices €/m² — calibrated to actual feed medians per town
// Properties BELOW benchmark = green (good deal), ABOVE = red (overpriced for NB market)
// Apartments/Penthouses/Studios/Bungalows vs Villas/Townhouses
const areaNBBenchmarks = {
  // COSTA BLANCA NORTH
  'Jávea Xàbia':          { apt: 6200, vil: 9000 },
  'Javea Xabia':          { apt: 6200, vil: 9000 },
  'Javea':                { apt: 6200, vil: 9000 },
  'Moraira_Teulada':      { apt: 6000, vil: 8000 },
  'Moraira':              { apt: 6000, vil: 8000 },
  'Teulada':              { apt: 5000, vil: 5500 },
  'Cumbre del Sol':       { apt: 5000, vil: 5000 },
  'Benitachell':          { apt: 5000, vil: 4500 },
  'Altea':                { apt: 5500, vil: 7500 },
  'Calpe':                { apt: 7000, vil: 10700 },
  'Benissa':              { apt: 5000, vil: 10300 },
  'Denia':                { apt: 5500, vil: 4300 },
  'Deniа':                { apt: 5500, vil: 4300 },
  'El Verger':            { apt: 6200, vil: 5100 },
  'Els Poblets':          { apt: 6000, vil: 5700 },
  'Benidorm':             { apt: 5500, vil: 4500 },
  'Finestrat':            { apt: 5600, vil: 5500 },
  'Sierra Cortina':       { apt: 5600, vil: 5500 },
  'Villajoyosa':          { apt: 6600, vil: 4500 },
  'Allonbay':             { apt: 5500, vil: 4000 },
  'El Campello':          { apt: 9000, vil: 5500 },
  'Alfas del Pi':         { apt: 5000, vil: 4500 },
  'Alfaz del Pi':         { apt: 5000, vil: 4500 },
  'Albir':                { apt: 5000, vil: 4500 },
  'Polop':                { apt: 5000, vil: 5800 },
  'la Nucia':             { apt: 5900, vil: 5000 },
  'La Nucia':             { apt: 5900, vil: 5000 },
  'Relleu':               { apt: 3200, vil: 3200 },
  'Penaguila':            { apt: 3000, vil: 3100 },
  'Mutxamel':             { apt: 4400, vil: 5400 },
  'San Juan Alicante':    { apt: 4500, vil: 3500 },
  'Alicante':             { apt: 5000, vil: 3500 },
  // COSTA BLANCA SOUTH
  'Orihuela Costa':       { apt: 5200, vil: 5900 },
  'Orihuela':             { apt: 4200, vil: 4600 },
  'Punta Prima':          { apt: 5000, vil: 4500 },
  'Cabo Roig':            { apt: 5000, vil: 5000 },
  'La Zenia':             { apt: 4800, vil: 4500 },
  'Playa Flamenca':       { apt: 4800, vil: 4500 },
  'Lomas de Campoamor':   { apt: 4500, vil: 4000 },
  'Campoamor':            { apt: 4500, vil: 4000 },
  'Campoamor Golf':       { apt: 4500, vil: 4000 },
  'Villamartin':          { apt: 4000, vil: 3800 },
  'Villamartín':          { apt: 4000, vil: 3800 },
  'Vistabella Golf':      { apt: 4000, vil: 3800 },
  'Las Filipinas':        { apt: 4000, vil: 3800 },
  'Los Balcones':         { apt: 3800, vil: 3500 },
  'Los Altos':            { apt: 3800, vil: 3500 },
  'Torrevieja':           { apt: 4850, vil: 5100 },
  'Guardamar del Segura': { apt: 4400, vil: 3800 },
  'Guardamar':            { apt: 4400, vil: 3800 },
  'El Raso':              { apt: 3800, vil: 3500 },
  'Santa Pola':           { apt: 3800, vil: 3500 },
  'Gran Alacant':         { apt: 4200, vil: 5900 },
  'La Marina':            { apt: 3800, vil: 6600 },
  'Mil Palmeras':         { apt: 3500, vil: 3500 },
  'Pilar de La Horadada': { apt: 5100, vil: 4700 },
  'Pilar de la Horadada': { apt: 5100, vil: 4700 },
  'Torre de la Horadada': { apt: 5100, vil: 4700 },
  'Las Colinas Golf':     { apt: 5500, vil: 6000 },
  'Las Colinas':          { apt: 5500, vil: 6000 },
  'La Finca Golf':        { apt: 3500, vil: 5000 },
  'La Finca Golf Resort': { apt: 3500, vil: 5000 },
  'Algorfa':              { apt: 3000, vil: 5000 },
  'Lo Romero Golf':       { apt: 3500, vil: 3500 },
  'Alenda Golf':          { apt: 4000, vil: 4000 },
  'Golf La Marquesa':     { apt: 3800, vil: 3500 },
  'Ciudad Quesada':       { apt: 4500, vil: 4900 },
  'Rojales':              { apt: 3900, vil: 4800 },
  'Benijofar':            { apt: 5000, vil: 5100 },
  'San Fulgencio':        { apt: 3700, vil: 4600 },
  'Daya Nueva':           { apt: 3200, vil: 4100 },
  'Daya Vieja':           { apt: 3000, vil: 3500 },
  'San Miguel de Salinas':{ apt: 3400, vil: 4500 },
  'Los Montesinos':       { apt: 3500, vil: 4900 },
  'Bigastro':             { apt: 3200, vil: 2400 },
  'Almoradí':             { apt: 3000, vil: 3700 },
  'Almoradi':             { apt: 3000, vil: 3700 },
  'Dolores':              { apt: 3700, vil: 3900 },
  'Catral':               { apt: 2800, vil: 2800 },
  'Jacarilla':            { apt: 2700, vil: 5100 },
  'Cox':                  { apt: 3500, vil: 3400 },
  'Hondón de las Nieves': { apt: 2900, vil: 3600 },
  'Hondon de las Nieves': { apt: 2900, vil: 3600 },
  'Hondón de los Frailes':{ apt: 2500, vil: 3000 },
  'Pinoso':               { apt: 2500, vil: 3000 },
  'Aspe':                 { apt: 2500, vil: 2900 },
  'Monforte del Cid':     { apt: 2900, vil: 4800 },
  'La Romana':            { apt: 2500, vil: 3400 },
  'Benejúzar':            { apt: 2700, vil: 2700 },
  'Benejuzar':            { apt: 2700, vil: 2700 },
  'Formentera del Segura':{ apt: 2800, vil: 3000 },
  'Elche':                { apt: 3500, vil: 3000 },
  // COSTA CALIDA
  'Los Alcazares':        { apt: 4300, vil: 5200 },
  'Los Alcázares':        { apt: 4300, vil: 5200 },
  'San Pedro del Pinatar':{ apt: 3900, vil: 4300 },
  'San Javier':           { apt: 3800, vil: 4500 },
  'Santiago de la Ribera':{ apt: 4000, vil: 4600 },
  'Lo Pagan':             { apt: 3500, vil: 3500 },
  'Playa Honda':          { apt: 3500, vil: 3500 },
  'Los Nietos':           { apt: 3500, vil: 3500 },
  'Los Urrutias':         { apt: 3000, vil: 3000 },
  'Torre Pacheco':        { apt: 4100, vil: 3900 },
  'Baños y Mendigo':      { apt: 3500, vil: 4600 },
  'Altaona Golf':         { apt: 3500, vil: 4000 },
  'La Serena Golf':       { apt: 3500, vil: 4000 },
  'La Manga Club':        { apt: 5300, vil: 6400 },
  'La Manga del Mar Menor':{ apt: 3100, vil: 3200 },
  'La Manga':             { apt: 3100, vil: 3200 },
  'Santa Rosalia':        { apt: 4500, vil: 5000 },
  'Santa Rosalia Resort': { apt: 4500, vil: 5000 },
  'Cartagena':            { apt: 4000, vil: 5900 },
  'La Union':             { apt: 3000, vil: 2800 },
  'Mazarrón':             { apt: 3500, vil: 3500 },
  'Puerto de Mazarron':   { apt: 4300, vil: 4900 },
  'Puerto de Mazarrón':   { apt: 4300, vil: 4900 },
  'Aguilas':              { apt: 5300, vil: 4100 },
  'El Alamillo':          { apt: 4000, vil: 3500 },
  'Condado de Alhama':    { apt: 3500, vil: 3500 },
  'Alhama de Murcia':     { apt: 3000, vil: 3000 },
  "El Rafol D'almunia":   { apt: 3000, vil: 3000 },
  'Ráfol de Almunia':     { apt: 3000, vil: 3000 },
};

// Regional fallback new-build benchmarks
const regionNBFallback = {
  'cb-north':      { apt: 5500, vil: 5500 },
  'cb-south':      { apt: 4400, vil: 4500 },
  'costa-calida':  { apt: 4000, vil: 4200 },
  'costa-almeria': { apt: 3000, vil: 3000 },
  'costa-valencia':{ apt: 4000, vil: 4000 },
};

function getNewBuildBenchmark(town, region, type, cats, beachKm, views) {
  const isVilla = (type === 'Villa' || type === 'Townhouse' || type === 'Bungalow');

  // Step 1: Base benchmark
  let base = null;
  if (town && areaNBBenchmarks[town]) {
    base = isVilla ? areaNBBenchmarks[town].vil : areaNBBenchmarks[town].apt;
  }
  if (!base) {
    const fb = regionNBFallback[region] || regionNBFallback['cb-south'];
    base = isVilla ? fb.vil : fb.apt;
  }

  // Step 2: Premium location multipliers (stacked multiplicatively, capped at 1.55)
  let mult = 1.0;

  // Golf resort
  if (cats && cats.includes('golf')) mult *= 1.15;

  // Beach distance
  if (beachKm !== null) {
    if (beachKm < 0.5) mult *= 1.20;       // frontline
    else if (beachKm < 1.0) mult *= 1.10;  // near beach
  }

  // Frontline category (belt-and-suspenders with beach distance)
  if (cats && cats.includes('frontline') && !(beachKm !== null && beachKm < 0.5)) mult *= 1.15;

  // Sea views
  if (views && views.includes('sea')) mult *= 1.10;

  // Cap multiplier
  mult = Math.min(mult, 1.55);

  return Math.round(base * mult);
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

  // Compute categories and views first (needed for benchmark)
  const categories = [];
  if (prop.category?.golf == 1) categories.push('golf');
  if (prop.category?.beach == 1) categories.push('beach');
  if (prop.category?.urban == 1) categories.push('urban');
  if (prop.category?.countryside == 1) categories.push('countryside');
  if (prop.category?.first_line == 1) categories.push('frontline');

  const views = [];
  if (prop.views?.sea_views == 1) views.push('sea');
  if (prop.views?.mountain_views == 1) views.push('mountain');
  if (prop.views?.pool_views == 1) views.push('pool');
  if (prop.views?.garden_views == 1) views.push('garden');
  if (prop.views?.open_views == 1) views.push('open');

  const mm2 = getNewBuildBenchmark(town, region, type, categories, beachKm, views);
  // For pm2 comparison: use usable living area when available (avoids basement/garage inflation in built_m2)
  // Falls back to built_m2 if no usable data
  const area = usableM2 > 0 ? usableM2 : builtM2;
  const pm2 = area > 0 ? Math.round(price / area) : undefined;

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

  return {
    d: 'Via Xavia Estate',
    p: title || `${type} in ${town}`,
    l: province ? `${town}, ${province}` : town,
    r: region,
    t: type,
    pf: price,
    pt: priceTo > 0 ? priceTo : price,
    pm2,
    mm2,
    bm: area,           // usable living area (or built_m2 if no usable data) — avoids basement/garage inflation
    bm_full: builtM2,   // raw total built area (includes underground/garages)
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
    u: getXaviaUrl(town),
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

  // ─── HEDONIC REGRESSION BENCHMARK ───────────────────────────────────────────
  // Personalised fair-value pm2 for each property based on its own attributes.
  // OLS regression: pm2 = f(log_area, beach, sea_view, golf, beds, is_villa, region_dummies, town_dummies)

  const isVilType = t => ['Villa','Townhouse','Bungalow'].includes(t);
  const getMedian = arr => { const s = [...arr].sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; };

  // --- Matrix math helpers (plain JS, no external libs) ---
  function matMul(A, B) {
    const rows = A.length, cols = B[0].length, inner = B.length;
    const C = Array.from({length: rows}, () => new Array(cols).fill(0));
    for (let i = 0; i < rows; i++)
      for (let k = 0; k < inner; k++) {
        if (A[i][k] === 0) continue;
        for (let j = 0; j < cols; j++)
          C[i][j] += A[i][k] * B[k][j];
      }
    return C;
  }

  function transpose(A) {
    const rows = A.length, cols = A[0].length;
    const T = Array.from({length: cols}, () => new Array(rows).fill(0));
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++)
        T[j][i] = A[i][j];
    return T;
  }

  function invertMatrix(M) {
    const n = M.length;
    // Augment with identity
    const aug = M.map((row, i) => {
      const r = [...row];
      for (let j = 0; j < n; j++) r.push(i === j ? 1 : 0);
      return r;
    });
    // Gaussian elimination with partial pivoting
    for (let col = 0; col < n; col++) {
      // Find pivot
      let maxRow = col;
      let maxVal = Math.abs(aug[col][col]);
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > maxVal) {
          maxVal = Math.abs(aug[row][col]);
          maxRow = row;
        }
      }
      if (maxVal < 1e-12) throw new Error(`Matrix singular at col ${col}`);
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
      const pivot = aug[col][col];
      for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        if (factor === 0) continue;
        for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }
    return aug.map(row => row.slice(n));
  }

  function ols(X, y) {
    const Xt = transpose(X);
    const XtX = matMul(Xt, X);
    const XtXinv = invertMatrix(XtX);
    const Xty = matMul(Xt, y.map(v => [v]));
    return matMul(XtXinv, Xty).map(r => r[0]);
  }

  // --- Collect town counts for dummies (towns with ≥8 properties) ---
  const townCounts = new Map();
  unique.forEach(p => {
    if (!p.pm2 || p.pm2 <= 0) return;
    const town = (p.l || '').split(',')[0].trim();
    townCounts.set(town, (townCounts.get(town) || 0) + 1);
  });
  const dummyTowns = [...townCounts.entries()]
    .filter(([, cnt]) => cnt >= 8)
    .map(([t]) => t);
  // Omit the most common town as baseline
  dummyTowns.sort((a, b) => townCounts.get(b) - townCounts.get(a));
  const baselineTown = dummyTowns.shift(); // removed from encoding, acts as baseline
  console.log(`Hedonic regression: ${dummyTowns.length} town dummies (baseline: ${baselineTown}), ${townCounts.size} towns total`);

  // Feature names for diagnostics
  // r_south is omitted (baseline region since baseline town Torrevieja is cb-south)
  const featureNames = [
    'intercept', 'log_bm', 'beach', 'sea_view', 'golf', 'beds', 'is_villa',
    'r_north', 'r_calida',
    ...dummyTowns
  ];

  // --- Build feature row for a property ---
  // r_south omitted (baseline region = cb-south, since baseline town Torrevieja is cb-south)
  function buildRow(p) {
    const bm = p.bm > 0 ? p.bm : 80;
    const log_bm = Math.log(bm);
    const beach = p.bk !== null ? Math.min(p.bk, 10) : 5; // null=unknown → 5
    const sea_view = (p.views && p.views.includes('sea')) ? 1 : 0;
    const golf = (p.cats && p.cats.includes('golf')) ? 1 : 0;
    const beds = Math.min(Math.max(p.bd || 1, 1), 6);
    const is_villa = isVilType(p.t) ? 1 : 0;
    const r_north = p.r === 'cb-north' ? 1 : 0;
    const r_calida = p.r === 'costa-calida' ? 1 : 0;
    const town = (p.l || '').split(',')[0].trim();
    const townDummies = dummyTowns.map(t => t === town ? 1 : 0);
    return [1, log_bm, beach, sea_view, golf, beds, is_villa, r_north, r_calida, ...townDummies];
  }

  // --- Collect training data (properties with valid pm2) ---
  const trainProps = unique.filter(p => p.pm2 && p.pm2 > 0 && p.bm > 0);
  const X = trainProps.map(p => buildRow(p));
  const y = trainProps.map(p => p.pm2);

  console.log(`Training hedonic model on ${trainProps.length} properties with ${featureNames.length} features...`);

  let beta;
  let regressionOk = false;
  try {
    beta = ols(X, y);
    regressionOk = true;
  } catch (e) {
    console.error('Regression failed:', e.message, '— falling back to town median');
  }

  if (regressionOk) {
    // --- Diagnostics ---
    const yHat = X.map(row => row.reduce((s, v, i) => s + v * beta[i], 0));
    const yMean = y.reduce((s, v) => s + v, 0) / y.length;
    const ssTot = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
    const ssRes = y.reduce((s, v, i) => s + (v - yHat[i]) ** 2, 0);
    const r2 = 1 - ssRes / ssTot;
    const rmse = Math.sqrt(ssRes / y.length);
    console.log(`\nHedonic model diagnostics:`);
    console.log(`  R² = ${r2.toFixed(3)}  RMSE = €${Math.round(rmse)}/m²`);

    if (r2 < 0.3) {
      console.warn('  WARNING: R² < 0.3 — regression may be unreliable, check feature matrix');
    }

    // Top 5 positive & negative coefficients
    const coefPairs = featureNames.map((name, i) => ({ name, coef: beta[i] }));
    const sorted = [...coefPairs].sort((a, b) => b.coef - a.coef);
    console.log('  Top 5 positive coefficients:');
    sorted.slice(0, 5).forEach(c => console.log(`    ${c.name.padEnd(20)} ${c.coef > 0 ? '+' : ''}${c.coef.toFixed(1)}`));
    console.log('  Top 5 negative coefficients:');
    sorted.slice(-5).reverse().forEach(c => console.log(`    ${c.name.padEnd(20)} ${c.coef > 0 ? '+' : ''}${c.coef.toFixed(1)}`));

    // --- Apply regression to all properties ---
    let clampLow = 0, clampHigh = 0, regApplied = 0;
    unique.forEach(p => {
      if (!p.bm || p.bm <= 0) return; // no area — keep existing mm2
      const row = buildRow(p);
      const predicted = row.reduce((s, v, i) => s + v * beta[i], 0);
      let mm2 = Math.round(predicted);
      if (predicted < 1500) { mm2 = 1500; clampLow++; }
      else if (predicted > 15000) { mm2 = 15000; clampHigh++; }
      p.mm2 = mm2;
      regApplied++;
    });
    console.log(`  Applied to ${regApplied} properties (clamped low: ${clampLow}, high: ${clampHigh})`);

    // --- Distribution: how many properties fall below predicted by how much ---
    const withPm2 = unique.filter(p => p.pm2 && p.pm2 > 0 && p.mm2 > 0);
    let d5 = 0, d15 = 0, d25 = 0, d25plus = 0, above = 0;
    withPm2.forEach(p => {
      const pct = (p.mm2 - p.pm2) / p.mm2 * 100;
      if (pct > 25) d25plus++;
      else if (pct > 15) d25++;
      else if (pct > 5) d15++;
      else if (pct > 0) d5++;
      else above++;
    });
    console.log(`\n  Discount distribution (${withPm2.length} props with pm2):`);
    console.log(`    >25% below predicted: ${d25plus}`);
    console.log(`    15-25% below:         ${d25}`);
    console.log(`    5-15% below:          ${d15}`);
    console.log(`    0-5% below:           ${d5}`);
    console.log(`    at/above predicted:   ${above}`);
    console.log();
  }

  // --- Fallback: town median for properties where regression was skipped ---
  // Also used as backstop for any town with no regression (area=0 properties kept as-is)
  const townPm2 = {};
  unique.forEach(p => {
    if (!p.pm2 || p.pm2 <= 0) return;
    const town = (p.l || '').split(',')[0].trim();
    const seg  = isVilType(p.t) ? 'vil' : 'apt';
    const key  = `${town}::${seg}`;
    if (!townPm2[key]) townPm2[key] = [];
    townPm2[key].push(p.pm2);
  });

  const regionPm2 = {};
  unique.forEach(p => {
    if (!p.pm2 || p.pm2 <= 0) return;
    const seg = isVilType(p.t) ? 'vil' : 'apt';
    const key = `${p.r}::${seg}`;
    if (!regionPm2[key]) regionPm2[key] = [];
    regionPm2[key].push(p.pm2);
  });

  // Properties with bm=0 had regression skipped → apply town median fallback
  let fallbackCount = 0;
  unique.forEach(p => {
    if (p.bm > 0) return; // regression already applied
    const town = (p.l || '').split(',')[0].trim();
    const seg  = isVilType(p.t) ? 'vil' : 'apt';
    const key  = `${town}::${seg}`;
    const arr  = townPm2[key] || [];
    if (arr.length >= 5) {
      p.mm2 = getMedian(arr);
      fallbackCount++;
    } else {
      const rKey = `${p.r}::${seg}`;
      const rArr = regionPm2[rKey] || [];
      if (rArr.length >= 10) { p.mm2 = getMedian(rArr); fallbackCount++; }
    }
  });
  if (fallbackCount > 0) console.log(`Town-median fallback applied to ${fallbackCount} properties (area=0)`);
  // ─────────────────────────────────────────────────────────────────────────────

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

  // --- DISCOUNT SANITY CAP REPORT ---
  // Replicate initProperty cap logic inline (parse-feed is plain JS, not TS)
  function getCapLimit(pf) { return pf < 500000 ? 200000 : pf < 1000000 ? 250000 : Infinity; }
  const cappedProps = unique.filter(p => {
    if (!p.bm || !p.mm2 || !p.pm2) return false;
    const rawDiscEuros = Math.round(p.mm2 * p.bm - p.pf);
    const cap = getCapLimit(p.pf);
    const discPct = (p.mm2 - p.pm2) / p.mm2 * 100;
    if (cap !== Infinity && Math.abs(rawDiscEuros) > cap) return true;
    if (p.pf >= 1000000 && discPct > 35) return true;
    return false;
  });
  if (cappedProps.length > 0) {
    console.log(`\n⚠  CAPPED PROPERTIES (${cappedProps.length}) — benchmark may need adjustment:`);
    let discountCap = 0, overpriceCap = 0, luxuryReview = 0;
    cappedProps.forEach(p => {
      const rawDiscEuros = Math.round(p.mm2 * p.bm - p.pf);
      const cap = getCapLimit(p.pf);
      const discPct = (p.mm2 - p.pm2) / p.mm2 * 100;
      if (p.pf >= 1000000 && discPct > 35) luxuryReview++;
      else if (rawDiscEuros > 0) discountCap++;
      else overpriceCap++;
    });
    console.log(`  discount_cap: ${discountCap} | overprice_cap: ${overpriceCap} | luxury_review: ${luxuryReview}`);
    cappedProps.slice(0, 20).forEach(p => {
      const rawDiscEuros = Math.round(p.mm2 * p.bm - p.pf);
      const cap = getCapLimit(p.pf);
      const discPct = Math.round((p.mm2 - p.pm2) / p.mm2 * 100);
      const capStr = cap === Infinity ? `${discPct}% discount (luxury >35% flag)` : `raw €${Math.round(rawDiscEuros/1000)}k → cap €${Math.round(cap/1000)}k`;
      console.log(`  ${(p.p || '').substring(0, 38).padEnd(38)} | ${((p.l||'').split(',')[0]).padEnd(22)} | pf:€${Math.round(p.pf/1000)}k bm:${p.bm}m² | ${capStr}`);
    });
    if (cappedProps.length > 20) console.log(`  ... and ${cappedProps.length - 20} more`);
  } else {
    console.log('\n✓ No capped properties — all discounts within sanity limits');
  }
}

main().catch(console.error);

/**
 * EU feed configuration registry.
 *
 * Each entry describes one country/portal source. Statuses:
 *   - 'live'    → fully wired upstream feed, runnable today
 *   - 'beta'    → endpoint reachable but field-map needs tuning per real data
 *   - 'stub'    → no public feed identified yet; partner intake or scrape work needed
 *
 * Field maps use dot-paths against the raw item object emitted by the parser
 * (XML/JSON shape varies per portal). Required mapped keys:
 *   ref, title, town, region, type, price, built_m2, bedrooms, bathrooms,
 *   beach_km, status, description, url, images, lat, lng, energy, pool
 *
 * Where a portal exposes neither an XML nor a JSON feed, status is 'stub'
 * and the registry still serves as a sales tool ("we're ready to ingest
 * the moment a partner provides feed access"). Do NOT invent fake feed
 * URLs — leave feed_url null on stubs.
 */

const EU_FEED_CONFIGS = [
  // ─── PRIMARY MARKETS ──────────────────────────────────────────────────────
  {
    country: 'PT',
    country_name: 'Portugal',
    portal: 'casa-sapo',
    feed_url: 'https://www.casasapo.pt/Comum/RSS/Imoveis.xml',
    feed_type: 'xml',
    currency: 'EUR',
    status: 'beta',
    notes: 'Casa Sapo public RSS — limited to title/url/region. Replace with partner feed for full data.',
    fallback_url: 'https://www.casasapo.pt',
    field_map: {
      ref:        'guid',
      title:      'title',
      description:'description',
      url:        'link',
      town:       'category',
      region:     'category',
      type:       'category',
      price:      'price',
    },
  },
  {
    country: 'NL',
    country_name: 'Netherlands',
    portal: 'funda-nl',
    feed_url: null,           // Funda partner feeds require key — populate via FUNDA_FEED_URL env
    feed_type: 'xml',
    currency: 'EUR',
    status: 'stub',
    notes: 'Funda partnerfeeds.funda.nl requires partner credentials. Set FUNDA_FEED_URL env to activate.',
    field_map: {
      ref:        'ObjectKey',
      title:      'Adres.Straat',
      description:'Omschrijving',
      url:        'URL',
      town:       'Adres.Plaats',
      region:     'Adres.Provincie',
      type:       'TypeObject',
      price:      'KoopPrijs',
      built_m2:   'WoonOppervlakte',
      bedrooms:   'AantalKamers',
      bathrooms:  'AantalBadkamers',
      lat:        'Coordinaten.Latitude',
      lng:        'Coordinaten.Longitude',
      energy:     'EnergieLabel',
      images:     'Foto.URL',
    },
  },
  {
    country: 'FR',
    country_name: 'France',
    portal: 'seloger',
    feed_url: null,
    feed_type: 'xml',
    currency: 'EUR',
    status: 'stub',
    notes: 'SeLoger partner XML requires API key. Set SELOGER_FEED_URL env to activate.',
    field_map: {
      ref: 'id', title: 'title', url: 'permalink',
      town: 'city', region: 'department',
      type: 'type_bien', price: 'prix',
      built_m2: 'surface', bedrooms: 'nb_chambres', bathrooms: 'nb_salles_de_bain',
      lat: 'latitude', lng: 'longitude',
      description: 'description', images: 'photos.photo',
    },
  },
  {
    country: 'DE',
    country_name: 'Germany',
    portal: 'immoscout24',
    feed_url: null,
    feed_type: 'json',
    currency: 'EUR',
    status: 'stub',
    notes: 'ImmobilienScout24 OAuth API — partner key required. Set IS24_API_KEY env to activate.',
    field_map: {
      ref: 'realEstateId', title: 'title', url: 'detailUrl',
      town: 'address.city', region: 'address.region',
      type: 'realEstateType', price: 'price.value',
      built_m2: 'livingSpace', bedrooms: 'numberOfRooms',
      lat: 'address.wgs84Coordinate.latitude', lng: 'address.wgs84Coordinate.longitude',
      energy: 'energyCertificate.energyClass', images: 'pictures',
    },
  },
  {
    country: 'IT',
    country_name: 'Italy',
    portal: 'immobiliare-it',
    feed_url: 'https://www.immobiliare.it/api-next/search-list/?vetrina=1',
    feed_type: 'json',
    currency: 'EUR',
    status: 'beta',
    notes: 'Immobiliare.it Next API is publicly reachable but rate-limited; tune limit/page in production.',
    fallback_url: 'https://www.immobiliare.it',
    field_map: {
      ref:      'realEstate.id',
      title:    'realEstate.title',
      url:      'seo.url',
      town:     'realEstate.properties.0.location.city',
      region:   'realEstate.properties.0.location.region',
      type:     'realEstate.typology.name',
      price:    'realEstate.price.value',
      built_m2: 'realEstate.properties.0.surface',
      bedrooms: 'realEstate.properties.0.rooms',
      bathrooms:'realEstate.properties.0.bathrooms',
      lat:      'realEstate.properties.0.location.latitude',
      lng:      'realEstate.properties.0.location.longitude',
      energy:   'realEstate.properties.0.energy.class',
      images:   'realEstate.properties.0.multimedia.photos',
    },
  },
  {
    country: 'GR',
    country_name: 'Greece',
    portal: 'spitogatos',
    feed_url: null,
    feed_type: 'xml',
    currency: 'EUR',
    status: 'stub',
    notes: 'Spitogatos exposes feeds only to partner accounts. Set SPITOGATOS_FEED_URL env to activate.',
    field_map: { ref: 'id', title: 'title', town: 'area', region: 'prefecture', price: 'price', built_m2: 'area_m2', bedrooms: 'bedrooms', bathrooms: 'bathrooms', lat: 'lat', lng: 'lng', url: 'url', images: 'images.image' },
  },
  {
    country: 'CY',
    country_name: 'Cyprus',
    portal: 'bazaraki',
    feed_url: null,
    feed_type: 'xml',
    currency: 'EUR',
    status: 'stub',
    notes: 'Bazaraki public XML feeds withdrawn 2024 — partner feed required.',
    field_map: { ref: 'id', title: 'title', town: 'city', region: 'district', price: 'price', built_m2: 'area', bedrooms: 'bedrooms', bathrooms: 'bathrooms', url: 'url' },
  },
  {
    country: 'HR',
    country_name: 'Croatia',
    portal: 'njuskalo',
    feed_url: null,
    feed_type: 'xml',
    currency: 'EUR',
    status: 'stub',
    notes: 'Njuškalo Pro requires partner API key. Set NJUSKALO_FEED_URL env.',
    field_map: { ref: 'id', title: 'title', town: 'mjesto', region: 'zupanija', price: 'cijena', built_m2: 'povrsina', bedrooms: 'sobe', url: 'url' },
  },
  {
    country: 'MT',
    country_name: 'Malta',
    portal: 'propertymalta',
    feed_url: null,
    feed_type: 'json',
    currency: 'EUR',
    status: 'stub',
    notes: 'PropertyMalta needs partner JSON key. Set PROPERTYMALTA_FEED_URL.',
    field_map: { ref: 'reference', title: 'title', town: 'locality', price: 'price', built_m2: 'sq_m', bedrooms: 'bedrooms', url: 'url' },
  },

  // ─── SECONDARY MARKETS (registry stubs — wire as partner feeds arrive) ────
  { country: 'AT', country_name: 'Austria',    portal: 'willhaben',     feed_url: null, feed_type: 'xml',  currency: 'EUR', status: 'stub', notes: 'willhaben.at partner XML', field_map: {} },
  { country: 'BE', country_name: 'Belgium',    portal: 'immoweb',       feed_url: null, feed_type: 'json', currency: 'EUR', status: 'stub', notes: 'Immoweb partner API',       field_map: {} },
  { country: 'SE', country_name: 'Sweden',     portal: 'hemnet',        feed_url: null, feed_type: 'xml',  currency: 'SEK', status: 'stub', notes: 'Hemnet partner XML',        field_map: {} },
  { country: 'DK', country_name: 'Denmark',    portal: 'boligsiden',    feed_url: null, feed_type: 'json', currency: 'DKK', status: 'stub', notes: 'Boligsiden public API',     field_map: {} },
  { country: 'FI', country_name: 'Finland',    portal: 'etuovi',        feed_url: null, feed_type: 'xml',  currency: 'EUR', status: 'stub', notes: 'Etuovi.com partner XML',    field_map: {} },
  { country: 'IE', country_name: 'Ireland',    portal: 'daft-ie',       feed_url: null, feed_type: 'json', currency: 'EUR', status: 'stub', notes: 'Daft.ie partner API',       field_map: {} },
  { country: 'LU', country_name: 'Luxembourg', portal: 'athome-lu',     feed_url: null, feed_type: 'xml',  currency: 'EUR', status: 'stub', notes: 'AtHome.lu partner XML',     field_map: {} },
  { country: 'PL', country_name: 'Poland',     portal: 'otodom',        feed_url: null, feed_type: 'json', currency: 'PLN', status: 'stub', notes: 'Otodom.pl partner API',     field_map: {} },
  { country: 'CZ', country_name: 'Czech Republic', portal: 'sreality',  feed_url: null, feed_type: 'json', currency: 'CZK', status: 'stub', notes: 'Sreality.cz partner API',   field_map: {} },
  { country: 'SK', country_name: 'Slovakia',   portal: 'nehnutelnosti', feed_url: null, feed_type: 'xml',  currency: 'EUR', status: 'stub', notes: 'Nehnutelnosti.sk partner XML', field_map: {} },
  { country: 'HU', country_name: 'Hungary',    portal: 'ingatlan-com',  feed_url: null, feed_type: 'xml',  currency: 'HUF', status: 'stub', notes: 'Ingatlan.com partner XML',  field_map: {} },
  { country: 'RO', country_name: 'Romania',    portal: 'imobiliare-ro', feed_url: null, feed_type: 'xml',  currency: 'RON', status: 'stub', notes: 'Imobiliare.ro partner XML', field_map: {} },
  { country: 'BG', country_name: 'Bulgaria',   portal: 'imot-bg',       feed_url: null, feed_type: 'xml',  currency: 'BGN', status: 'stub', notes: 'Imot.bg partner XML',       field_map: {} },
  { country: 'SI', country_name: 'Slovenia',   portal: 'nepremicnine',  feed_url: null, feed_type: 'xml',  currency: 'EUR', status: 'stub', notes: 'Nepremicnine.net partner XML', field_map: {} },
  { country: 'EE', country_name: 'Estonia',    portal: 'kv-ee',         feed_url: null, feed_type: 'json', currency: 'EUR', status: 'stub', notes: 'KV.ee partner API',         field_map: {} },
  { country: 'LV', country_name: 'Latvia',     portal: 'ss-lv',         feed_url: null, feed_type: 'xml',  currency: 'EUR', status: 'stub', notes: 'SS.lv partner XML',         field_map: {} },
  { country: 'LT', country_name: 'Lithuania',  portal: 'aruodas',       feed_url: null, feed_type: 'xml',  currency: 'EUR', status: 'stub', notes: 'Aruodas.lt partner XML',    field_map: {} },
];

module.exports = { EU_FEED_CONFIGS };

import { Property, YieldResult } from './types';

// Rental data from AirDNA, Airbtics, Booking.com, Vrbo (2025-2026)
const rentalData = [
  {k:"Calpe",a:105,v:160,wk:24,src:"AirDNA/HomeToGo"},
  {k:"Dénia",a:130,v:180,wk:22,src:"AirDNA"},
  {k:"Benidorm",a:100,v:170,wk:25,src:"Airbtics"},
  {k:"Villajoyosa",a:90,v:150,wk:22,src:"AirROI"},
  {k:"Punta Prima",a:85,v:130,wk:22,src:"Airbtics/Airbnb"},
  {k:"La Ceñuela",a:85,v:130,wk:22,src:"Airbtics"},
  {k:"Playa Flamenca",a:80,v:120,wk:21,src:"Airbtics"},
  {k:"Torre de la Horadada",a:95,v:140,wk:21,src:"Airbtics"},
  {k:"Campoamor",a:90,v:200,wk:20,src:"Airbnb/Booking"},
  {k:"Gran Alacant",a:75,v:100,wk:20,src:"Airbtics"},
  {k:"Santa Pola",a:75,v:100,wk:20,src:"Airbtics"},
  {k:"Villamartín",a:55,v:85,wk:19,src:"HomeToGo"},
  {k:"Guardamar",a:70,v:100,wk:21,src:"Airbtics"},
  {k:"El Raso",a:70,v:100,wk:21,src:"Airbtics"},
  {k:"Orihuela Costa",a:75,v:110,wk:20,src:"Airbtics"},
  {k:"Torrevieja",a:65,v:95,wk:20,src:"Airbtics"},
  {k:"La Finca Golf",a:70,v:140,wk:17,src:"Vrbo/Airbnb"},
  {k:"Algorfa",a:70,v:140,wk:17,src:"Vrbo"},
  {k:"Ciudad Quesada",a:55,v:130,wk:18,src:"Airbnb/Vrbo"},
  {k:"San Miguel",a:40,v:60,wk:15,src:"Estimated"},
  {k:"Finestrat",a:80,v:160,wk:19,src:"Airbnb"},
  {k:"Sierra Cortina",a:100,v:225,wk:19,src:"Airbnb"},
  {k:"Benitachell",a:90,v:200,wk:18,src:"Clickstay/Airbnb"},
  {k:"Cumbre del Sol",a:90,v:300,wk:18,src:"Clickstay/Airbnb"},
  {k:"La Nucia",a:60,v:95,wk:17,src:"Airbnb proxy"},
  {k:"Polop",a:55,v:85,wk:16,src:"Airbnb proxy"},
  {k:"Altea",a:110,v:170,wk:20,src:"AirDNA"},
  {k:"Condado de Alhama",a:42,v:75,wk:14,src:"Booking.com"},
  {k:"Torre Pacheco",a:50,v:70,wk:15,src:"AirDNA Murcia"},
  {k:"Camposol",a:50,v:65,wk:16,src:"AirDNA Mazarrón"},
  {k:"Mazarrón",a:70,v:140,wk:17,src:"AirDNA/Booking"},
  {k:"El Alamillo",a:80,v:140,wk:17,src:"Airbnb/Booking"},
  {k:"La Manga Club",a:180,v:220,wk:20,src:"Resort published"},
  {k:"La Manga",a:75,v:110,wk:17,src:"Airbnb"},
  {k:"Los Alcázares",a:60,v:90,wk:16,src:"AirDNA"},
  {k:"Alicante",a:85,v:120,wk:21,src:"AirDNA"},
  {k:"Cabo Peñas",a:85,v:120,wk:21,src:"Orihuela proxy"},
  // Additional towns from XML feed
  {k:"Pilar de La Horadada",a:90,v:135,wk:21,src:"Airbnb/Booking"},
  {k:"Pilar de la Horadada",a:90,v:135,wk:21,src:"Airbnb/Booking"},
  {k:"Benijofar",a:55,v:85,wk:17,src:"Estimated proxy"},
  {k:"Rojales",a:55,v:85,wk:17,src:"Estimated proxy"},
  {k:"San Fulgencio",a:50,v:80,wk:16,src:"Estimated proxy"},
  {k:"Dolores",a:45,v:70,wk:15,src:"Estimated proxy"},
  {k:"Polop",a:60,v:100,wk:17,src:"Airbnb"},
  {k:"San Pedro del Pinatar",a:65,v:100,wk:18,src:"Booking/Airbnb"},
  {k:"San Javier",a:60,v:95,wk:17,src:"Booking"},
  {k:"Los Alcazares",a:60,v:90,wk:16,src:"AirDNA"},
  {k:"Aguilas",a:65,v:100,wk:17,src:"Booking"},
  {k:"Cartagena",a:60,v:90,wk:16,src:"Booking"},
  {k:"Pinoso",a:35,v:55,wk:12,src:"Estimated inland"},
  {k:"Hondón",a:35,v:55,wk:12,src:"Estimated inland"},
  {k:"Villajoyosa",a:95,v:155,wk:22,src:"AirDNA"},
  {k:"Relleu",a:50,v:80,wk:14,src:"Estimated inland"},
  {k:"Monforte",a:40,v:60,wk:13,src:"Estimated inland"},
  {k:"La Manga del Mar Menor",a:80,v:120,wk:18,src:"Booking"},
  {k:"Baños y Mendigo",a:50,v:80,wk:14,src:"Booking"},
  {k:"Daya Nueva",a:50,v:75,wk:16,src:"Estimated proxy"},
  {k:"El Campello",a:90,v:140,wk:21,src:"AirDNA"},
  {k:"Benissa",a:100,v:200,wk:19,src:"Airbnb"},
  {k:"Moraira",a:120,v:250,wk:20,src:"AirDNA"},
  {k:"Jávea",a:110,v:200,wk:21,src:"AirDNA"},
  {k:"Denia",a:100,v:170,wk:21,src:"AirDNA"},
  {k:"El Verger",a:80,v:130,wk:19,src:"Estimated proxy"},
];

// Market growth rates by area
const growthRates = [
  {a:"Calpe",v:8},{a:"Dénia",v:9},{a:"Benidorm",v:7},{a:"Villajoyosa",v:8},
  {a:"Punta Prima",v:12},{a:"Orihuela Costa",v:11},{a:"Torrevieja",v:10},
  {a:"Gran Alacant",v:11},{a:"Santa Pola",v:9},{a:"Guardamar",v:10},
  {a:"Algorfa",v:9},{a:"Ciudad Quesada",v:9},{a:"Finestrat",v:8},
  {a:"Altea",v:7},{a:"Torre Pacheco",v:7},{a:"Los Alcázares",v:8},
  {a:"Mazarrón",v:6},{a:"La Manga",v:7},
];

export function calcScore(d: Property): number {
  let s = 0;

  // 1. DISCOUNT vs NB market (40 points max)
  // If capped, the benchmark may be unreliable — score conservatively
  if (d._capped && d._capReason !== 'luxury_review') {
    s += 15; // treat as "at market" — fair but not inflated
  } else if (d.mm2 > 0 && d.pm2 && d.pm2 > 0) {
    const df = (d.mm2 - d.pm2) / d.mm2; // positive = below NB market
    if (df >= 0.25) s += 40;
    else if (df >= 0.20) s += 35;
    else if (df >= 0.15) s += 30;
    else if (df >= 0.10) s += 25;
    else if (df >= 0.05) s += 20;
    else if (df >= 0.0)  s += 15;  // at market = still good
    else if (df >= -0.10) s += 8;  // up to 10% above = ok
    else if (df >= -0.20) s += 3;  // 10-20% above = expensive
    else s += 0;                    // 20%+ above = overpriced
  }

  // 2. RENTAL YIELD potential (25 points max) — via bm and location proxy
  if (d.pl && d.pl > 0) {
    const pp = d.pf / d.pl;
    if (pp < 500) s += 25; else if (pp < 700) s += 20; else if (pp < 1000) s += 15; else if (pp < 1500) s += 10; else s += 5;
  } else if (d.bm && d.pf) {
    const rt = d.bm / (d.pf / 100000); // built m² per €100k
    if (rt > 55) s += 22; else if (rt > 40) s += 18; else if (rt > 28) s += 14; else if (rt > 18) s += 10; else s += 6;
  }

  // 3. BEACH DISTANCE (15 points max)
  if (d.bk !== null) {
    if (d.bk <= 0.5) s += 15;
    else if (d.bk <= 1) s += 12;
    else if (d.bk <= 2) s += 9;
    else if (d.bk <= 5) s += 6;
    else s += 3;
  } else {
    s += 3; // unknown
  }

  // 4. BUILD STATUS (10 points max)
  // Key-ready = bird in hand, off-plan = wait + risk
  if (d.s === 'ready') s += 10;
  else if (d.s === 'under-construction') s += 7;
  else if (d.s === 'off-plan') {
    s += 5;
    if (d.c?.includes('2025') || d.c?.includes('2026')) s += 3; // near-term
    else if (d.c?.includes('2027')) s += 2;
  }

  // 5. PLOT/BUILT RATIO for villas (10 points max) — larger plot = bonus
  if (d.t === 'Villa' || d.t === 'Townhouse') {
    if (d.pl && d.bm) {
      const ratio = d.pl / d.bm;
      if (ratio >= 5) s += 10;
      else if (ratio >= 3) s += 8;
      else if (ratio >= 2) s += 6;
      else if (ratio >= 1) s += 4;
      else s += 2;
    } else if (d.pl && d.pl > 300) {
      s += 5;
    }
  } else {
    // For apartments: developer track record proxy via dy
    if (d.dy >= 20) s += 8; else if (d.dy >= 10) s += 6; else if (d.dy >= 5) s += 4; else s += 3;
  }

  return Math.min(100, Math.round(s));
}

export function calcYield(d: Property): YieldResult {
  const beds = d.bd || 2;
  const isV = d.t === 'Villa' || d.t === 'Townhouse';
  const bedMult = beds <= 1 ? 0.7 : beds === 2 ? 1 : beds === 3 ? 1.2 : beds === 4 ? 1.5 : beds >= 5 ? 1.8 : 1;
  let match = rentalData.find(r => d.l.includes(r.k) || d.p.includes(r.k)) || null;
  if (!match) match = rentalData.find(r => r.k.includes(d.l.split(',')[0].trim())) || null;
  const baseAdr = match ? (isV ? match.v : match.a) : (d.r === 'cb-north' ? 80 : d.r === 'cb-south' ? 70 : 50);
  const baseWk = match ? match.wk : (d.r === 'cb-north' ? 20 : d.r === 'cb-south' ? 19 : 16);
  const newBuildPremium = 1.20;
  const bm = d.bm || 80;
  const sizeMult = bm >= 200 ? 1.6 : bm >= 150 ? 1.35 : bm >= 120 ? 1.15 : bm >= 80 ? 1 : 0.85;
  const avgP = (d.pf + (d.pt || d.pf)) / 2;
  const priceMult = avgP >= 2000000 ? 4.5 : avgP >= 1500000 ? 3.5 : avgP >= 1000000 ? 2.8 : avgP >= 700000 ? 2.2 : avgP >= 500000 ? 1.7 : avgP >= 350000 ? 1.25 : 1;
  const luxMult = Math.max(sizeMult, priceMult);
  const rawRate = Math.round(baseAdr * bedMult * newBuildPremium * luxMult);
  const maxRate = avgP >= 2000000 ? 700 : avgP >= 1500000 ? 550 : avgP >= 1000000 ? 450 : avgP >= 700000 ? 350 : avgP >= 500000 ? 280 : 999;
  const rate = Math.min(rawRate, maxRate);
  const annual = rate * baseWk * 7;
  const src = match ? match.src : 'Estimated';
  return { gross: +(annual / avgP * 100).toFixed(1), annual: Math.round(annual), rate: Math.round(rate), weeks: baseWk, src };
}

export function discount(d: Property): number {
  if (!d.mm2 || !d.pm2) return 0;
  return (d.mm2 - d.pm2) / d.mm2 * 100;
}

export function discountEuros(d: Property): number {
  if (!d.mm2 || !d.bm) return 0;
  return Math.round((d.mm2 * d.bm) - d.pf);
}

export function monthsToCompletion(c: string): number {
  if (!c || c === 'TBA') return 0;
  let y: number, m: number;
  if (c.includes('Q')) {
    const parts = c.split('-Q');
    y = parseInt(parts[0]); m = parseInt(parts[1]) * 3;
  } else {
    const parts = c.split('-');
    y = parseInt(parts[0]); m = parseInt(parts[1]) || 6;
  }
  if (isNaN(y)) return 0;
  const target = new Date(y, m - 1);
  const now = new Date();
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
}

export function getGrowthRate(d: Property): number {
  for (const g of growthRates) {
    if (d.l.includes(g.a) || g.a.includes(d.l.split(',')[0].trim())) return g.v;
  }
  if (d.r === 'cb-south') return 10;
  if (d.r === 'cb-north') return 8;
  return 7;
}

// Returns the euro cap for a given price point
export function discountEuroCap(pf: number): number {
  if (pf < 500000) return 200000;
  if (pf < 1000000) return 250000;
  return Infinity; // luxury: no hard cap, only % flag
}

// Returns the capped discount euros for display (positive = discount, negative = overpriced)
export function cappedDiscountEuros(d: Property): number {
  const raw = discountEuros(d);
  if (!raw) return 0;
  const cap = discountEuroCap(d.pf);
  if (cap === Infinity) return raw;
  return raw > 0 ? Math.min(raw, cap) : Math.max(raw, -cap);
}

export function initProperty(d: Property): Property {
  if (d.bm > 0) {
    d.pm2lo = Math.round(d.pf / d.bm);
    d.pm2hi = d.pt && d.pt !== d.pf ? Math.round(d.pt / d.bm) : d.pm2lo;
    d.pm2 = Math.round(((d.pf + (d.pt || d.pf)) / 2) / d.bm);
  }
  d._mths = monthsToCompletion(d.c);
  d._grw = getGrowthRate(d);
  d._estMm2 = Math.round(d.mm2 * (1 + (d._grw / 100) * (d._mths / 12)));

  // --- DISCOUNT SANITY CAPS (must run before calcScore) ---
  const rawDiscEuros = d.bm > 0 && d.mm2 > 0 ? Math.round(d.mm2 * d.bm - d.pf) : 0;
  const discPct = d.mm2 > 0 && d.pm2 && d.pm2 > 0 ? (d.mm2 - d.pm2) / d.mm2 * 100 : 0;
  const cap = discountEuroCap(d.pf);
  const isLuxury = d.pf >= 1000000;

  d._capped = false;
  d._rawDiscEuros = rawDiscEuros;

  if (!isLuxury && Math.abs(rawDiscEuros) > cap) {
    d._capped = true;
    d._capReason = rawDiscEuros > 0 ? 'discount_cap' : 'overprice_cap';
  } else if (isLuxury && discPct > 35) {
    d._capped = true;
    d._capReason = 'luxury_review';
  }
  // --------------------------------------------------------

  d._yield = calcYield(d);
  d._sc = calcScore(d);
  return d;
}

export function formatPrice(n: number): string {
  return '€' + n.toLocaleString('en');
}

export function scoreClass(s: number): string {
  return s >= 80 ? 'text-emerald-400' : s >= 70 ? 'text-emerald-300' : s >= 60 ? 'text-amber-400' : s >= 50 ? 'text-orange-400' : 'text-gray-500';
}

export function scoreColor(s: number): string {
  return s >= 80 ? '#10b981' : s >= 70 ? '#34d399' : s >= 60 ? '#c9a34f' : s >= 50 ? '#f97316' : '#6b7280';
}

export function regionLabel(r: string): string {
  return r === 'cb-south' ? 'CB South' : r === 'cb-north' ? 'CB North' : 'C. Cálida';
}

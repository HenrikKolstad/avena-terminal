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

export function calcValueScore(d: Property): number {
  if (d._capped && d._capReason !== 'luxury_review') {
    return 35; // at-market, uncertain
  }
  if (d.mm2 > 0 && d.pm2 && d.pm2 > 0) {
    const df = (d.mm2 - d.pm2) / d.mm2;
    if (df >= 0.20) return 100;
    if (df >= 0.15) return 85;
    if (df >= 0.10) return 70;
    if (df >= 0.05) return 55;
    if (df >= 0) return 40;
    if (df >= -0.05) return 25;
    if (df >= -0.15) return 12;
    return 0;
  }
  return 35;
}

export function calcYieldScore(d: Property): number {
  if (d._yield && d._yield.net > 0) {
    const n = d._yield.net;
    if (n >= 7) return 100;
    if (n >= 5) return 80;
    if (n >= 4) return 60;
    if (n >= 3) return 40;
    return 20;
  }
  // Estimate from beach distance
  if (d.bk !== null) {
    if (d.bk <= 0.5) return 65;
    if (d.bk <= 1) return 55;
    if (d.bk <= 2) return 45;
  }
  return 30;
}

export function calcLocationScore(d: Property): number {
  let pts = 0;

  // Beach (0-30pts)
  if (d.bk !== null) {
    if (d.bk <= 0.5) pts += 30;
    else if (d.bk <= 1) pts += 24;
    else if (d.bk <= 2) pts += 18;
    else if (d.bk <= 5) pts += 12;
    else pts += 5;
  } else {
    pts += 8;
  }

  // Views (0-20pts)
  const views = d.views || [];
  const cats = d.cats || [];
  if (views.includes('sea') || cats.includes('sea-views')) pts += 20;
  else if (views.includes('mountain')) pts += 10;
  else if (views.includes('open')) pts += 5;

  // Golf (0-15pts)
  if (cats.includes('golf')) pts += 15;

  // Urban/amenities (0-15pts)
  if (cats.includes('urban')) pts += 15;
  else if (cats.includes('frontline')) pts += 12;
  else pts += 5;

  // Region/airport (0-10pts)
  if (d.r === 'cb-south') pts += 9;
  else if (d.r === 'cb-north') pts += 8;
  else pts += 6; // costa-calida

  // Climate (0-10pts)
  if (d.r === 'cb-north') pts += 9;
  else pts += 8; // all southern Spain baseline

  return Math.min(100, pts);
}

export function calcQualityScore(d: Property): number {
  let pts = 40; // baseline

  // Energy rating
  if (d.energy === 'A') pts += 30;
  else if (d.energy === 'B') pts += 20;
  else if (d.energy === 'C') pts += 10;
  else if (d.energy === 'D') pts += 5;

  // Pool
  if (d.pool === 'private') pts += 15;
  else if (d.pool === 'communal' || d.pool === 'yes') pts += 8;

  // Parking
  if (d.parking !== undefined && d.parking >= 2) pts += 10;
  else if (d.parking !== undefined && d.parking >= 1) pts += 7;

  // Build status
  if (d.s === 'ready') pts += 15;
  else if (d.s === 'under-construction') pts += 5;
  // off-plan = 0

  // Plot/built ratio for villas
  if (d.pl && d.bm) {
    const ratio = d.pl / d.bm;
    if (ratio >= 5) pts += 10;
    else if (ratio >= 3) pts += 7;
    else if (ratio >= 2) pts += 4;
  }

  return Math.min(100, pts);
}

export function calcRiskScore(d: Property): number {
  let pts: number;

  if (d.s === 'ready') {
    pts = 85;
  } else if (d.s === 'under-construction') {
    pts = (d._mths !== undefined && d._mths <= 12) ? 70 : 55;
  } else {
    // off-plan
    pts = (d.c?.includes('2025') || d.c?.includes('2026')) ? 45 : 35;
  }

  // Very small unit penalty
  if (d.bm < 50) pts -= 10;

  // High supply / tourist license restricted areas
  const loc = (d.l || '').toLowerCase();
  if (loc.includes('torrevieja') || loc.includes('benidorm')) {
    pts -= 5;
    if (loc.includes('torrevieja') || loc.includes('benidorm')) {
      pts -= 10;
    }
  }

  return Math.min(100, Math.max(0, pts));
}

export function calcScore(d: Property): number {
  const v = calcValueScore(d);
  const y = calcYieldScore(d);
  const l = calcLocationScore(d);
  const q = calcQualityScore(d);
  const r = calcRiskScore(d);
  d._scores = { value: v, yield: y, location: l, quality: q, risk: r };
  return Math.min(100, Math.round(v * 0.40 + y * 0.25 + l * 0.20 + q * 0.10 + r * 0.05));
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
  const gross = +(annual / avgP * 100).toFixed(1);

  // Net yield: deduct Spanish ownership costs
  const grossIncome = annual;
  const afterVacancy = grossIncome * 0.90;
  const managementFee = afterVacancy * 0.15;
  const communityFees = Math.max(800, grossIncome * 0.03);
  const insurance = 400;
  const ibi = avgP * 0.003;
  const netBeforeTax = afterVacancy - managementFee - communityFees - insurance - ibi;
  const tax = Math.max(0, netBeforeTax * 0.19);
  const netIncome = netBeforeTax - tax;
  const net = +(netIncome / avgP * 100).toFixed(1);

  return { gross, net, annual: Math.round(annual), rate: Math.round(rate), weeks: baseWk, src };
}

// Hard cap on displayed discount percentage — luxury market allows wider swings; 40 is a generous backstop
export const DISCOUNT_PCT_CAP = 40;

export function discount(d: Property): number {
  if (!d.mm2 || !d.pm2) return 0;
  return (d.mm2 - d.pm2) / d.mm2 * 100;
}

// Discount % for display and sorting — capped at ±DISCOUNT_PCT_CAP
export function displayDiscount(d: Property): number {
  const raw = discount(d);
  if (raw > DISCOUNT_PCT_CAP) return DISCOUNT_PCT_CAP;
  if (raw < -DISCOUNT_PCT_CAP) return -DISCOUNT_PCT_CAP;
  return raw;
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
  if (r === 'cb-south') return 'CB South';
  if (r === 'cb-north') return 'CB North';
  if (r === 'costa-calida') return 'C. Cálida';
  if (r === 'costa-del-sol') return 'Costa del Sol';
  return 'C. Cálida';
}

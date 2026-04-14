export interface City {
  name: string;
  slug: string;
  country: string;
  flag: string;
  pricePerM2: number;
  yoyChange: number;
  bubbleScore: number;
  affordability: number;
  priceToIncome: number;
  status: 'bubble' | 'overheating' | 'warming' | 'healthy';
  lat: number;
  lng: number;
}

export const BUBBLE_DATA_UPDATED = '2026-04-14T00:00:00Z';

export const CITIES: City[] = [
  { name: 'Munich', slug: 'munich', country: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', pricePerM2: 9800, yoyChange: 4.2, bubbleScore: 89, affordability: 22, priceToIncome: 16.2, status: 'bubble', lat: 48.1351, lng: 11.582 },
  { name: 'Frankfurt', slug: 'frankfurt', country: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', pricePerM2: 7200, yoyChange: 3.1, bubbleScore: 78, affordability: 31, priceToIncome: 12.8, status: 'overheating', lat: 50.1109, lng: 8.6821 },
  { name: 'Amsterdam', slug: 'amsterdam', country: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}', pricePerM2: 7500, yoyChange: 5.8, bubbleScore: 85, affordability: 24, priceToIncome: 14.9, status: 'bubble', lat: 52.3676, lng: 4.9041 },
  { name: 'Paris', slug: 'paris', country: 'France', flag: '\u{1F1EB}\u{1F1F7}', pricePerM2: 11200, yoyChange: 1.2, bubbleScore: 82, affordability: 19, priceToIncome: 18.5, status: 'bubble', lat: 48.8566, lng: 2.3522 },
  { name: 'Luxembourg', slug: 'luxembourg', country: 'Luxembourg', flag: '\u{1F1F1}\u{1F1FA}', pricePerM2: 12500, yoyChange: -1.4, bubbleScore: 91, affordability: 15, priceToIncome: 19.8, status: 'bubble', lat: 49.6117, lng: 6.1319 },
  { name: 'Zurich', slug: 'zurich', country: 'Switzerland', flag: '\u{1F1E8}\u{1F1ED}', pricePerM2: 14200, yoyChange: 2.8, bubbleScore: 88, affordability: 28, priceToIncome: 11.3, status: 'bubble', lat: 47.3769, lng: 8.5417 },
  { name: 'Vienna', slug: 'vienna', country: 'Austria', flag: '\u{1F1E6}\u{1F1F9}', pricePerM2: 6100, yoyChange: -2.1, bubbleScore: 72, affordability: 35, priceToIncome: 11.5, status: 'overheating', lat: 48.2082, lng: 16.3738 },
  { name: 'Stockholm', slug: 'stockholm', country: 'Sweden', flag: '\u{1F1F8}\u{1F1EA}', pricePerM2: 7800, yoyChange: -3.5, bubbleScore: 68, affordability: 33, priceToIncome: 12.1, status: 'overheating', lat: 59.3293, lng: 18.0686 },
  { name: 'Copenhagen', slug: 'copenhagen', country: 'Denmark', flag: '\u{1F1E9}\u{1F1F0}', pricePerM2: 6900, yoyChange: 2.4, bubbleScore: 65, affordability: 37, priceToIncome: 10.8, status: 'overheating', lat: 55.6761, lng: 12.5683 },
  { name: 'Milan', slug: 'milan', country: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', pricePerM2: 5200, yoyChange: 6.3, bubbleScore: 61, affordability: 40, priceToIncome: 10.2, status: 'warming', lat: 45.4642, lng: 9.19 },
  { name: 'Rome', slug: 'rome', country: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', pricePerM2: 4100, yoyChange: 2.1, bubbleScore: 42, affordability: 48, priceToIncome: 8.9, status: 'healthy', lat: 41.9028, lng: 12.4964 },
  { name: 'Barcelona', slug: 'barcelona', country: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', pricePerM2: 4800, yoyChange: 7.9, bubbleScore: 58, affordability: 38, priceToIncome: 10.5, status: 'warming', lat: 41.3874, lng: 2.1686 },
  { name: 'Madrid', slug: 'madrid', country: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', pricePerM2: 4200, yoyChange: 6.1, bubbleScore: 52, affordability: 42, priceToIncome: 9.3, status: 'warming', lat: 40.4168, lng: -3.7038 },
  { name: 'Lisbon', slug: 'lisbon', country: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}', pricePerM2: 5100, yoyChange: 5.4, bubbleScore: 63, affordability: 30, priceToIncome: 13.1, status: 'overheating', lat: 38.7223, lng: -9.1393 },
  { name: 'Porto', slug: 'porto', country: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}', pricePerM2: 3800, yoyChange: 4.8, bubbleScore: 55, affordability: 35, priceToIncome: 11.2, status: 'warming', lat: 41.1579, lng: -8.6291 },
  { name: 'Dublin', slug: 'dublin', country: 'Ireland', flag: '\u{1F1EE}\u{1F1EA}', pricePerM2: 5900, yoyChange: 3.7, bubbleScore: 71, affordability: 29, priceToIncome: 12.4, status: 'overheating', lat: 53.3498, lng: -6.2603 },
  { name: 'Brussels', slug: 'brussels', country: 'Belgium', flag: '\u{1F1E7}\u{1F1EA}', pricePerM2: 3900, yoyChange: 1.8, bubbleScore: 44, affordability: 52, priceToIncome: 7.6, status: 'healthy', lat: 50.8503, lng: 4.3517 },
  { name: 'Helsinki', slug: 'helsinki', country: 'Finland', flag: '\u{1F1EB}\u{1F1EE}', pricePerM2: 5400, yoyChange: -4.2, bubbleScore: 48, affordability: 41, priceToIncome: 9.1, status: 'healthy', lat: 60.1699, lng: 24.9384 },
  { name: 'Warsaw', slug: 'warsaw', country: 'Poland', flag: '\u{1F1F5}\u{1F1F1}', pricePerM2: 3200, yoyChange: 9.1, bubbleScore: 56, affordability: 44, priceToIncome: 8.8, status: 'warming', lat: 52.2297, lng: 21.0122 },
  { name: 'Prague', slug: 'prague', country: 'Czech Republic', flag: '\u{1F1E8}\u{1F1FF}', pricePerM2: 4600, yoyChange: 5.2, bubbleScore: 67, affordability: 32, priceToIncome: 13.5, status: 'overheating', lat: 50.0755, lng: 14.4378 },
  { name: 'Budapest', slug: 'budapest', country: 'Hungary', flag: '\u{1F1ED}\u{1F1FA}', pricePerM2: 2800, yoyChange: 8.4, bubbleScore: 49, affordability: 46, priceToIncome: 8.2, status: 'healthy', lat: 47.4979, lng: 19.0402 },
  { name: 'Bucharest', slug: 'bucharest', country: 'Romania', flag: '\u{1F1F7}\u{1F1F4}', pricePerM2: 2100, yoyChange: 7.6, bubbleScore: 38, affordability: 55, priceToIncome: 6.9, status: 'healthy', lat: 44.4268, lng: 26.1025 },
  { name: 'Athens', slug: 'athens', country: 'Greece', flag: '\u{1F1EC}\u{1F1F7}', pricePerM2: 2600, yoyChange: 11.2, bubbleScore: 45, affordability: 43, priceToIncome: 9.4, status: 'healthy', lat: 37.9838, lng: 23.7275 },
  { name: 'Berlin', slug: 'berlin', country: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', pricePerM2: 5800, yoyChange: -1.8, bubbleScore: 64, affordability: 36, priceToIncome: 11.7, status: 'overheating', lat: 52.52, lng: 13.405 },
  { name: 'Hamburg', slug: 'hamburg', country: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', pricePerM2: 6500, yoyChange: 1.5, bubbleScore: 69, affordability: 34, priceToIncome: 11.9, status: 'overheating', lat: 53.5511, lng: 9.9937 },
  { name: 'Lyon', slug: 'lyon', country: 'France', flag: '\u{1F1EB}\u{1F1F7}', pricePerM2: 5100, yoyChange: -0.6, bubbleScore: 51, affordability: 39, priceToIncome: 9.8, status: 'warming', lat: 45.764, lng: 4.8357 },
  { name: 'Malaga', slug: 'malaga', country: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', pricePerM2: 3100, yoyChange: 12.5, bubbleScore: 54, affordability: 41, priceToIncome: 9.6, status: 'warming', lat: 36.7213, lng: -4.4214 },
  { name: 'Valencia', slug: 'valencia', country: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', pricePerM2: 2400, yoyChange: 10.8, bubbleScore: 41, affordability: 54, priceToIncome: 7.1, status: 'healthy', lat: 39.4699, lng: -0.3763 },
  { name: 'Tallinn', slug: 'tallinn', country: 'Estonia', flag: '\u{1F1EA}\u{1F1EA}', pricePerM2: 3500, yoyChange: 3.9, bubbleScore: 47, affordability: 43, priceToIncome: 8.7, status: 'healthy', lat: 59.437, lng: 24.7536 },
  { name: 'Vilnius', slug: 'vilnius', country: 'Lithuania', flag: '\u{1F1F1}\u{1F1F9}', pricePerM2: 2900, yoyChange: 6.7, bubbleScore: 43, affordability: 49, priceToIncome: 7.8, status: 'healthy', lat: 54.6872, lng: 25.2797 },
  { name: 'Alicante', slug: 'alicante', country: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', pricePerM2: 1900, yoyChange: 10.5, bubbleScore: 35, affordability: 55, priceToIncome: 6.2, status: 'healthy', lat: 38.3452, lng: -0.481 },
  { name: 'Marbella', slug: 'marbella', country: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', pricePerM2: 4500, yoyChange: 11.2, bubbleScore: 58, affordability: 30, priceToIncome: 12.8, status: 'warming', lat: 36.5099, lng: -4.8862 },
  { name: 'Nice', slug: 'nice', country: 'France', flag: '\u{1F1EB}\u{1F1F7}', pricePerM2: 5500, yoyChange: 4.8, bubbleScore: 58, affordability: 28, priceToIncome: 13.5, status: 'warming', lat: 43.7102, lng: 7.262 },
  { name: 'Nicosia', slug: 'nicosia', country: 'Cyprus', flag: '\u{1F1E8}\u{1F1FE}', pricePerM2: 2000, yoyChange: 6.5, bubbleScore: 30, affordability: 52, priceToIncome: 7.2, status: 'healthy', lat: 35.1856, lng: 33.3823 },
  { name: 'Split', slug: 'split', country: 'Croatia', flag: '\u{1F1ED}\u{1F1F7}', pricePerM2: 3000, yoyChange: 12.8, bubbleScore: 55, affordability: 35, priceToIncome: 11.5, status: 'warming', lat: 43.5081, lng: 16.4402 },
  // Portugal expansion
  { name: 'Faro', slug: 'faro', country: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}', pricePerM2: 2800, yoyChange: 6.5, bubbleScore: 38, affordability: 48, priceToIncome: 8.5, status: 'healthy', lat: 37.0194, lng: -7.9322 },
  { name: 'Cascais', slug: 'cascais', country: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}', pricePerM2: 5200, yoyChange: 5.8, bubbleScore: 60, affordability: 25, priceToIncome: 14.2, status: 'warming', lat: 38.6979, lng: -9.4215 },
  { name: 'Nazare', slug: 'nazare', country: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}', pricePerM2: 1800, yoyChange: 8.2, bubbleScore: 28, affordability: 58, priceToIncome: 5.8, status: 'healthy', lat: 39.6019, lng: -9.0712 },
];

export function getCityBySlug(slug: string): City | undefined {
  return CITIES.find(c => c.slug === slug);
}

export function getCitiesByCountry(country: string): City[] {
  return CITIES.filter(c => c.country.toLowerCase() === country.toLowerCase());
}

export function getCitiesByStatus(status: City['status']): City[] {
  return CITIES.filter(c => c.status === status);
}

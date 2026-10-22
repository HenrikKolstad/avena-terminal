/**
 * Institutional offers — the only paid access Avena sells on the site.
 *
 * The self-serve €49/€79 "Avena Estate PRO" plan was retired 2026-10-22.
 * Access is now by request: every CTA routes to an email to Henrik.
 * Payment links are sent privately after a yes; never render them on the site.
 */

export const ACCESS_EMAIL = 'henrik@avenaterminal.com';

export interface AccessOffer {
  id: 'founding-lender' | 'buyer-desk-office' | 'buyer-desk-network';
  name: string;
  price: string;
  audience: string;
  includes: string[];
}

export const ACCESS_OFFERS: AccessOffer[] = [
  {
    id: 'founding-lender',
    name: 'Sell-Through Monitor · Founding Lender',
    price: '€3,000 / month',
    audience: 'Lenders, funds and valuers',
    includes: [
      'Weekly sell-through report',
      'Watchlist of up to 25 projects',
      'API / CSV access',
      'Founding price locked for 12 months, first three clients only',
    ],
  },
  {
    id: 'buyer-desk-office',
    name: 'Buyer Desk · per office',
    price: '€750 / month',
    audience: 'Estate agents',
    includes: [
      'One-page project checks in Swedish, Norwegian or English',
      'Weekly market note for clients',
    ],
  },
  {
    id: 'buyer-desk-network',
    name: 'Buyer Desk · full network',
    price: '€1,500 / month',
    audience: 'Agent networks',
    includes: [
      'Everything in Buyer Desk, for every office',
      'Co-branded client reports',
    ],
  },
];

export function accessMailto(subject = 'Avena Terminal: request access', body?: string): string {
  const b = body ?? 'Hi Henrik,\n\nI would like access to Avena Terminal.\n\nCompany:\nRole:\nTowns or projects of interest:\n';
  return `mailto:${ACCESS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(b)}`;
}

export function offerMailto(offer: AccessOffer): string {
  return accessMailto(
    `Avena Terminal: ${offer.name}`,
    `Hi Henrik,\n\nI am interested in ${offer.name} (${offer.price}).\n\nCompany:\nRole:\nTowns or projects of interest:\n`,
  );
}

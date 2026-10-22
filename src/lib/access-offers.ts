/**
 * Institutional offers — the only paid access Avena sells on the site.
 *
 * The self-serve €49/€79 "Avena Estate PRO" plan was retired 2026-10-22.
 * Access is now by request: every CTA routes to an email to Henrik.
 * Payment links are sent privately after a yes; never render them on the site.
 * No price figures on the site (2026-10-22): every offer shows 'Pricing on request'.
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
    price: 'Pricing on request',
    audience: 'Lenders, funds and valuers',
    includes: [
      'Weekly sell-through report',
      'Watchlist of up to 25 projects',
      'API / CSV access',
      'Founding terms for the first three clients',
    ],
  },
  {
    id: 'buyer-desk-office',
    name: 'Buyer Desk · per office',
    price: 'Pricing on request',
    audience: 'Estate agents',
    includes: [
      'One-page project checks in Swedish, Norwegian or English',
      'Weekly market note for clients',
    ],
  },
  {
    id: 'buyer-desk-network',
    name: 'Buyer Desk · full network',
    price: 'Pricing on request',
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
    `Hi Henrik,\n\nI am interested in ${offer.name}.\n\nCompany:\nRole:\nTowns or projects of interest:\n`,
  );
}

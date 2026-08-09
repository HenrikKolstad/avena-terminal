/**
 * Unified event tracking — fires to TikTok Pixel + Meta Pixel + Vercel Analytics.
 * Safe to call server-side (no-op). Safe to call before pixel loads (queued).
 *
 * Standard TikTok events:
 *   ViewContent, AddToWishlist, AddToCart, InitiateCheckout,
 *   AddPaymentInfo, PlaceAnOrder, CompletePayment, CompleteRegistration
 *
 * https://business-api.tiktok.com/portal/docs?id=1701890973258754
 */
export type TrackEvent =
  | 'ViewContent'
  | 'ClickButton'
  | 'InitiateCheckout'
  | 'CompleteRegistration'
  | 'CompletePayment'
  | 'Subscribe'
  | 'Contact'
  | 'Search';

/**
 * Meta equivalents for our event names. Meta's optimiser only learns from
 * events it recognises, and under the Special Ad Category rules for housing
 * (Europe, 2026) manual age/gender/interest targeting is unavailable — so
 * conversion optimisation is the ONLY targeting mechanism left. A 'Lead' event
 * that never fires means the campaign can never learn who buys.
 */
const META_EVENT: Record<TrackEvent, string> = {
  ViewContent: 'ViewContent',
  ClickButton: 'Lead',              // enquiry CTA — the money action
  InitiateCheckout: 'InitiateCheckout',
  CompleteRegistration: 'CompleteRegistration',
  CompletePayment: 'Purchase',
  Subscribe: 'Subscribe',
  Contact: 'Lead',                  // enquiry submitted — the conversion
  Search: 'Search',
};

type FBQ = (cmd: string, event: string, props?: Record<string, unknown>) => void;

type GTAG = (cmd: string, target: string, props?: Record<string, unknown>) => void;

/**
 * Which of our events count as a Google Ads conversion. Only the enquiry does:
 * Search campaigns bid on queries that produce LEADS, and reporting page views
 * or clicks as conversions teaches the algorithm to buy traffic that browses
 * rather than traffic that enquires.
 */
const GOOGLE_CONVERSION: Partial<Record<TrackEvent, true>> = {
  Contact: true,
  ClickButton: true,
};

type TTQ = {
  track: (event: string, props?: Record<string, unknown>) => void;
  identify: (props: Record<string, unknown>) => void;
  page: () => void;
};

export function trackEvent(event: TrackEvent, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  const ttq = (window as unknown as { ttq?: TTQ }).ttq;
  try {
    ttq?.track(event, props);
  } catch {
    /* swallow — tracking should never break the app */
  }

  const fbq = (window as unknown as { fbq?: FBQ }).fbq;
  try {
    fbq?.('track', META_EVENT[event] ?? event, props);
  } catch {
    /* swallow — tracking should never break the app */
  }

  if (GOOGLE_CONVERSION[event]) {
    const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL;
    const gtag = (window as unknown as { gtag?: GTAG }).gtag;
    try {
      if (gtag && adsId && label) {
        gtag('event', 'conversion', { send_to: `${adsId}/${label}`, ...props });
      }
    } catch {
      /* swallow — tracking should never break the app */
    }
  }
}

export function identifyUser(email: string, externalId?: string): void {
  if (typeof window === 'undefined') return;
  const ttq = (window as unknown as { ttq?: TTQ }).ttq;
  try {
    ttq?.identify({ email, external_id: externalId ?? email });
  } catch {
    /* */
  }
}

/**
 * Unified event tracking — fires to TikTok Pixel + Vercel Analytics.
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

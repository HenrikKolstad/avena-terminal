'use client';

import Script from 'next/script';

const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;          // e.g. AW-123456789
const CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL; // e.g. AbC-D_efG

/**
 * Google Ads global site tag.
 *
 * To enable: set NEXT_PUBLIC_GOOGLE_ADS_ID (and NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL
 * for the enquiry conversion) in Vercel. Renders nothing until then.
 *
 * Why this matters more than the pixel scripts usually do: Google Search is
 * intent-based, so the campaign's job is to find which QUERIES produce
 * enquiries and bid up those. It can only do that if the conversion is
 * reported back. Without it you are paying for clicks and grading them by
 * nothing — which is how small budgets get spent on traffic that never
 * converts, invisibly, for months.
 *
 * Fire conversions via trackEvent('Contact') in lib/tracking.ts.
 */
export function GoogleAdsTag() {
  if (!ADS_ID) return null;

  return (
    <>
      <Script
        id="gtag-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`}
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ADS_ID}');
        `}
      </Script>
    </>
  );
}

/** Conversion target string Google expects, or null when unconfigured. */
export function leadConversionTarget(): string | null {
  if (!ADS_ID || !CONVERSION_LABEL) return null;
  return `${ADS_ID}/${CONVERSION_LABEL}`;
}

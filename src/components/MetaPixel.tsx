'use client';

import Script from 'next/script';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/**
 * Meta (Facebook/Instagram) Pixel.
 *
 * To enable: set NEXT_PUBLIC_META_PIXEL_ID in Vercel env vars. Renders nothing
 * until then, so shipping this ahead of the ad account is safe.
 *
 * Fire events through `trackEvent()` in lib/tracking.ts — it dispatches to
 * TikTok and Meta from one call, so a new channel never means editing call
 * sites again.
 *
 * NOTE on housing ads: property advertising falls under Meta's Special Ad
 * Category in Europe as of 2026, which removes age, gender and interest
 * targeting. That makes the pixel MORE important, not less — with manual
 * targeting gone, Meta's conversion optimisation is the only mechanism left
 * for finding buyers, and it can only learn from events the pixel reports.
 * A campaign without a working Lead event is spending blind.
 */
export function MetaPixel() {
  if (!PIXEL_ID) return null;

  return (
    <>
      <Script id="fbq" strategy="afterInteractive">
        {`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');
        `}
      </Script>
      {/* Fallback for users who block JS — Meta's documented noscript pixel. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}

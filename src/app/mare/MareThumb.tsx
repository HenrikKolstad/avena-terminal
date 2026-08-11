'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

/**
 * Editorial property image with a fallback that actually always works.
 * The naive onError approach misses images that fail BEFORE React
 * hydrates (the SSR'd <img> starts loading immediately; the error event
 * has already fired and never re-fires). On mount we therefore also
 * inspect the element: complete with naturalWidth 0 = dead image.
 */
export function MareThumb({ src, alt }: { src: string | null; alt: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className="h-full w-full"
        style={{ background: 'linear-gradient(160deg, hsl(var(--av-surface)) 0%, hsl(var(--av-border) / 0.35) 100%)' }}
        aria-hidden="true"
      />
    );
  }
  return (
    // next/image (2026-08-11): full-size feed JPEGs were shipped raw to
    // phones. Optimization on; the pre-hydration dead-image check keeps
    // working — next/image renders a real <img>, so ref/complete/
    // naturalWidth behave exactly as before.
    <Image
      ref={ref}
      src={src}
      alt={alt}
      width={800}
      height={560}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

'use client';

import { useState } from 'react';

/** Editorial property image with graceful fallback — never a broken glyph. */
export function MareThumb({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className="h-full w-full"
        style={{ background: 'linear-gradient(160deg, #d9cfbc 0%, #c9bda6 55%, #b5a88e 100%)' }}
        aria-hidden="true"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
    />
  );
}

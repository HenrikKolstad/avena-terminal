'use client';

/**
 * MareHero v3 — the photograph, still and perfect (2026-07-19).
 *
 * The WebGL water experiments are retired (two attempts, both rightly
 * rejected). The hero is Henrik's photograph, full-bleed, untouched —
 * with a quiet dusk-gradient stand-in if the file ever fails to load.
 */

import { useState } from 'react';

export function MareSea({ className, src = '/mare/hero.jpg' }: { className?: string; src?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className={className} aria-hidden="true">
      {imgFailed ? (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, #141327 0%, #3a2742 38%, #b96b45 52%, #173038 60%, #0a1d24 100%)' }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onError={() => setImgFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

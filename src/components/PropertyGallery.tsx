'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function PropertyGallery({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);

  if (!images.length) {
    return (
      <div
        className="aspect-[4/3] rounded-sm overflow-hidden border flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
        style={{
          background: 'hsl(var(--av-surface))',
          borderColor: 'hsl(var(--av-border) / 0.6)',
        }}
      >
        No image
      </div>
    );
  }

  return (
    <div>
      <div
        className="aspect-[4/3] rounded-sm overflow-hidden border relative"
        style={{
          background: 'hsl(var(--av-surface))',
          borderColor: 'hsl(var(--av-border) / 0.6)',
        }}
      >
        {/* next/image (2026-08-11): the feed CDN serves 150-400KB full-size
            JPEGs; phones were downloading megabytes per gallery. Vercel now
            transcodes to AVIF/WebP sized to the actual viewport. Explicit
            width/height + 100% styles keep the layout byte-identical. */}
        <Image
          src={images[idx]}
          alt={alt}
          width={1200}
          height={900}
          sizes="(max-width: 1024px) 100vw, 66vw"
          priority={idx === 0}
          className="w-full h-full object-cover"
          style={{ width: '100%', height: '100%' }}
        />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full text-white text-xl transition-all"
              style={{
                background: 'hsl(var(--av-background) / 0.7)',
                border: '1px solid hsl(var(--av-border-strong))',
              }}
            >
              &#8249;
            </button>
            <button
              onClick={() => setIdx((i) => (i + 1) % images.length)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full text-white text-xl transition-all"
              style={{
                background: 'hsl(var(--av-background) / 0.7)',
                border: '1px solid hsl(var(--av-border-strong))',
              }}
            >
              &#8250;
            </button>
            <div
              className="absolute bottom-3 right-3 rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground"
              style={{
                background: 'hsl(var(--av-background) / 0.75)',
                border: '1px solid hsl(var(--av-border) / 0.6)',
              }}
            >
              {idx + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-none">
          {images.slice(0, 12).map((img, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Show image ${i + 1}`}
              className="flex-shrink-0 w-16 h-11 rounded-sm overflow-hidden border transition-all"
              style={{
                borderColor:
                  idx === i ? 'hsl(var(--av-primary))' : 'hsl(var(--av-border) / 0.4)',
                opacity: idx === i ? 1 : 0.55,
              }}
            >
              <Image src={img} alt="" width={128} height={88} sizes="64px" className="w-full h-full object-cover" style={{ width: '100%', height: '100%' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

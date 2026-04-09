'use client';

import { useState } from 'react';

export default function PropertyGallery({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);

  if (!images.length) {
    return (
      <div className="aspect-[4/3] rounded-2xl overflow-hidden border flex items-center justify-center text-gray-600 text-4xl" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
        No image
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[4/3] rounded-2xl overflow-hidden border relative" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
        <img src={images[idx]} alt={alt} className="w-full h-full object-cover" />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-emerald-500/80 transition-all"
            >&#8249;</button>
            <button
              onClick={() => setIdx(i => (i + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-emerald-500/80 transition-all"
            >&#8250;</button>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">
              {idx + 1}/{images.length}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-none">
          {images.slice(0, 12).map((img, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`flex-shrink-0 w-16 h-11 rounded overflow-hidden border-2 transition-all ${idx === i ? 'border-emerald-400 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

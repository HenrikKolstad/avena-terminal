import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

/**
 * Avena Terminal logo PNG.
 *
 * Usage:
 *   /logo.png                 — 512×512 (default, perfect for submissions)
 *   /logo.png?size=128        — 128×128
 *   /logo.png?size=1024       — 1024×1024
 *   /logo.png?bg=transparent  — transparent background (default: brand dark)
 *
 * Right-click → Save Image As…
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const size = Math.max(32, Math.min(2048, parseInt(url.searchParams.get('size') ?? '512', 10)));
  const bgParam = url.searchParams.get('bg');
  const transparent = bgParam === 'transparent' || bgParam === 'none';

  // The logo is the Avena monogram: serif italic "A" inside a gold-bordered square.
  const border = Math.max(2, Math.round(size / 42));
  const pad = Math.round(size / 8);
  const inner = size - pad * 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: transparent ? 'transparent' : '#1D1815',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: inner,
            height: inner,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `${border}px solid #F5A623`,
            background: 'rgba(245, 166, 35, 0.06)',
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: Math.round(inner * 0.68),
            color: '#F5A623',
            lineHeight: 1,
          }}
        >
          A
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}

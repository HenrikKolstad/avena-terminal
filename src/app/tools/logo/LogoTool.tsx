'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Download } from 'lucide-react';

/**
 * Pure client-side image cropper + resizer.
 * Loads an image into a canvas, shows a draggable square crop region,
 * exports a PNG at a user-chosen size. Zero server, zero upload.
 */

type Box = { x: number; y: number; size: number };

const OUTPUT_SIZES = [256, 512, 1024, 2048];

export function LogoTool() {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [filename, setFilename] = useState<string>('avena-terminal-logo');
  const [box, setBox] = useState<Box>({ x: 0, y: 0, size: 0 });
  const [outputSize, setOutputSize] = useState<number>(1024);
  const [mode, setMode] = useState<'move' | 'resize'>('move');
  const [dragging, setDragging] = useState<null | { startX: number; startY: number; startBox: Box }>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onFile = (file: File) => {
    setFilename(file.name.replace(/\.[^.]+$/, '') || 'logo');
    const reader = new FileReader();
    reader.onload = (e) => {
      const image = new Image();
      image.onload = () => {
        setImg(image);
        // Default: centered square box at 80% of the smaller dimension
        const s = Math.min(image.width, image.height) * 0.8;
        setBox({
          x: (image.width - s) / 2,
          y: (image.height - s) / 2,
          size: s,
        });
      };
      image.src = String(e.target?.result ?? '');
    };
    reader.readAsDataURL(file);
  };

  // Draw preview canvas whenever img or box changes
  useEffect(() => {
    if (!img || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const maxW = container.clientWidth;
    const scale = Math.min(1, maxW / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Dim everything outside the box
    const bx = box.x * scale;
    const by = box.y * scale;
    const bs = box.size * scale;

    ctx.fillStyle = 'rgba(13, 10, 8, 0.6)';
    ctx.fillRect(0, 0, canvas.width, by);
    ctx.fillRect(0, by, bx, bs);
    ctx.fillRect(bx + bs, by, canvas.width - (bx + bs), bs);
    ctx.fillRect(0, by + bs, canvas.width, canvas.height - (by + bs));

    // Box border
    ctx.strokeStyle = '#F5A623';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bs, bs);
    // Corner handles
    ctx.fillStyle = '#F5A623';
    const h = 8;
    [[bx, by], [bx + bs, by], [bx, by + bs], [bx + bs, by + bs]].forEach(([x, y]) => {
      ctx.fillRect(x - h / 2, y - h / 2, h, h);
    });
  }, [img, box]);

  const onCanvasDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!img || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasRef.current.width / img.width;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    // If click is near bottom-right corner → resize; else move
    const nearCorner =
      Math.abs(x - (box.x + box.size)) < img.width * 0.04 &&
      Math.abs(y - (box.y + box.size)) < img.width * 0.04;
    setMode(nearCorner ? 'resize' : 'move');
    setDragging({ startX: x, startY: y, startBox: { ...box } });
  };

  const onCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging || !img || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvasRef.current.width / img.width;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const dx = x - dragging.startX;
    const dy = y - dragging.startY;

    if (mode === 'resize') {
      const newSize = Math.max(40, Math.min(
        Math.min(img.width, img.height),
        dragging.startBox.size + (dx + dy) / 2
      ));
      const maxX = img.width - newSize;
      const maxY = img.height - newSize;
      setBox({
        x: Math.min(dragging.startBox.x, maxX),
        y: Math.min(dragging.startBox.y, maxY),
        size: newSize,
      });
    } else {
      setBox({
        x: Math.max(0, Math.min(img.width - dragging.startBox.size, dragging.startBox.x + dx)),
        y: Math.max(0, Math.min(img.height - dragging.startBox.size, dragging.startBox.y + dy)),
        size: dragging.startBox.size,
      });
    }
  };

  const onCanvasUp = () => setDragging(null);

  const download = () => {
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, box.x, box.y, box.size, box.size, 0, 0, outputSize, outputSize);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${outputSize}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png', 0.95);
  };

  return (
    <section className="py-10">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
        {!img ? (
          <label
            className="block rounded-sm border-2 border-dashed p-16 text-center cursor-pointer transition-colors hover:border-primary"
            style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
          >
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <div className="font-serif text-xl text-foreground mb-2">Drop an image here</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              or click to browse · PNG, JPG, WEBP
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
          </label>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div
                ref={containerRef}
                className="rounded-sm border overflow-hidden"
                style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={onCanvasDown}
                  onMouseMove={onCanvasMove}
                  onMouseUp={onCanvasUp}
                  onMouseLeave={onCanvasUp}
                  style={{ display: 'block', width: '100%', cursor: dragging ? (mode === 'resize' ? 'nwse-resize' : 'grabbing') : 'grab' }}
                />
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Drag the gold square to move · drag the bottom-right corner to resize
              </p>
            </div>

            <div className="space-y-4">
              <div
                className="rounded-sm border p-4"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-3">Output</div>
                <label className="block mb-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Size (px)</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {OUTPUT_SIZES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setOutputSize(s)}
                        className="rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors"
                        style={{
                          borderColor: outputSize === s ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)',
                          background: outputSize === s ? 'hsl(var(--av-primary) / 0.1)' : 'transparent',
                          color: outputSize === s ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
                        }}
                      >
                        {s}×{s}
                      </button>
                    ))}
                  </div>
                </label>
                <label className="block mb-4">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Filename</div>
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="w-full rounded-sm border px-3 py-2 text-sm bg-transparent text-foreground focus:outline-none focus:border-primary font-mono"
                    style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  />
                </label>
                <button
                  onClick={download}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-sm px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PNG
                </button>
              </div>

              <button
                onClick={() => setImg(null)}
                className="w-full inline-flex items-center justify-center rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                Use a different image
              </button>

              <div
                className="rounded-sm border p-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground leading-relaxed"
                style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                Nothing leaves your browser — crop happens locally.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

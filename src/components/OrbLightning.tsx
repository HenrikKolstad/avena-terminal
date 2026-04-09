'use client';

import { useEffect, useRef } from 'react';

interface Bolt {
  segments: { x1: number; y1: number; x2: number; y2: number; width: number }[];
  birth: number;
  lifetime: number;
}

function generateBolt(cx: number, cy: number, radius: number): Bolt['segments'] {
  const segments: Bolt['segments'] = [];
  const angle = Math.random() * Math.PI * 2;
  const len = radius * (0.5 + Math.random() * 0.45);

  function branch(x: number, y: number, a: number, remaining: number, w: number) {
    if (remaining <= 0 || w < 0.3) return;
    const step = 8 + Math.random() * 12;
    const jitter = (Math.random() - 0.5) * 1.2;
    const nx = x + Math.cos(a + jitter) * step;
    const ny = y + Math.sin(a + jitter) * step;
    const dx = nx - cx, dy = ny - cy;
    if (Math.sqrt(dx * dx + dy * dy) > radius * 0.92) return;
    segments.push({ x1: x, y1: y, x2: nx, y2: ny, width: w });
    branch(nx, ny, a + (Math.random() - 0.5) * 0.8, remaining - 1, w * 0.85);
    if (Math.random() < 0.35 && remaining > 2) {
      const forkAngle = a + (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.8);
      branch(nx, ny, forkAngle, Math.floor(remaining * 0.6), w * 0.6);
    }
  }

  const startX = cx + (Math.random() - 0.5) * radius * 0.3;
  const startY = cy + (Math.random() - 0.5) * radius * 0.3;
  branch(startX, startY, angle, Math.floor(6 + Math.random() * 8), 2 + Math.random());

  return segments;
}

export default function OrbLightning({ size }: { size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boltsRef = useRef<Bolt[]>([]);
  const lastSpawnRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 4;

    let animId: number;

    function draw(now: number) {
      ctx!.clearRect(0, 0, size, size);

      // Clip to circle
      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx!.clip();

      // Spawn new bolts
      const spawnInterval = 2000 + Math.random() * 2000;
      if (now - lastSpawnRef.current > spawnInterval) {
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          boltsRef.current.push({
            segments: generateBolt(cx, cy, radius),
            birth: now,
            lifetime: 300 + Math.random() * 200,
          });
        }
        lastSpawnRef.current = now;
      }

      // Draw bolts
      const alive: Bolt[] = [];
      for (const bolt of boltsRef.current) {
        const age = now - bolt.birth;
        if (age > bolt.lifetime) continue;
        alive.push(bolt);

        const alpha = 1 - age / bolt.lifetime;
        const fadeAlpha = Math.pow(alpha, 0.5);

        for (const seg of bolt.segments) {
          // Core glow
          ctx!.beginPath();
          ctx!.moveTo(seg.x1, seg.y1);
          ctx!.lineTo(seg.x2, seg.y2);
          ctx!.strokeStyle = `rgba(124, 58, 237, ${fadeAlpha * 0.4})`;
          ctx!.lineWidth = seg.width * 3;
          ctx!.stroke();

          // Main bolt
          ctx!.beginPath();
          ctx!.moveTo(seg.x1, seg.y1);
          ctx!.lineTo(seg.x2, seg.y2);
          ctx!.strokeStyle = `rgba(168, 85, 247, ${fadeAlpha * 0.8})`;
          ctx!.lineWidth = seg.width;
          ctx!.stroke();

          // White hot center
          ctx!.beginPath();
          ctx!.moveTo(seg.x1, seg.y1);
          ctx!.lineTo(seg.x2, seg.y2);
          ctx!.strokeStyle = `rgba(255, 255, 255, ${fadeAlpha * 0.6})`;
          ctx!.lineWidth = seg.width * 0.3;
          ctx!.stroke();
        }
      }
      boltsRef.current = alive;

      ctx!.restore();
      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: size, height: size }}
    />
  );
}

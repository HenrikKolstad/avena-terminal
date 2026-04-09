'use client';

import { useEffect, useRef } from 'react';

interface Bolt {
  segments: { x1: number; y1: number; x2: number; y2: number; w: number }[];
  birth: number;
  life: number;
}

function branch(
  segs: Bolt['segments'], x: number, y: number, angle: number,
  remaining: number, w: number, cx: number, cy: number, r: number
) {
  if (remaining <= 0 || w < 0.2) return;
  const step = 6 + Math.random() * 14;
  const jitter = (Math.random() - 0.5) * 1.4;
  const nx = x + Math.cos(angle + jitter) * step;
  const ny = y + Math.sin(angle + jitter) * step;
  if (Math.hypot(nx - cx, ny - cy) > r * 0.93) return;
  segs.push({ x1: x, y1: y, x2: nx, y2: ny, w });
  branch(segs, nx, ny, angle + (Math.random() - 0.5) * 0.7, remaining - 1, w * 0.82, cx, cy, r);
  if (Math.random() < 0.4 && remaining > 2) {
    const fa = angle + (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.9);
    branch(segs, nx, ny, fa, Math.floor(remaining * 0.55), w * 0.55, cx, cy, r);
  }
}

function makeBolt(cx: number, cy: number, r: number): Bolt['segments'] {
  const segs: Bolt['segments'] = [];
  const a = Math.random() * Math.PI * 2;
  const sx = cx + (Math.random() - 0.5) * r * 0.25;
  const sy = cy + (Math.random() - 0.5) * r * 0.25;
  branch(segs, sx, sy, a, 7 + Math.floor(Math.random() * 9), 1.8 + Math.random() * 1.2, cx, cy, r);
  return segs;
}

export default function CoreOrb({ size, fillPct }: { size: number; fillPct: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boltsRef = useRef<Bolt[]>([]);
  const lastSpawnRef = useRef(0);
  const startRef = useRef(0);

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
    const r = size / 2 - 6;
    let animId: number;

    function draw(now: number) {
      if (!startRef.current) startRef.current = now;
      const t = (now - startRef.current) / 1000;
      ctx!.clearRect(0, 0, size, size);

      // === OUTER GLOW ===
      const glowR = ctx!.createRadialGradient(cx, cy, r * 0.85, cx, cy, r + 20);
      glowR.addColorStop(0, 'rgba(124,58,237,0)');
      glowR.addColorStop(0.5, 'rgba(124,58,237,0.08)');
      glowR.addColorStop(0.8, 'rgba(168,85,247,0.04)');
      glowR.addColorStop(1, 'rgba(168,85,247,0)');
      ctx!.fillStyle = glowR;
      ctx!.fillRect(0, 0, size, size);

      // Clip to orb
      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.clip();

      // === DARK BASE ===
      const baseGrad = ctx!.createRadialGradient(cx, cy * 0.85, 0, cx, cy, r);
      baseGrad.addColorStop(0, '#1a1035');
      baseGrad.addColorStop(0.5, '#110a20');
      baseGrad.addColorStop(1, '#0a0612');
      ctx!.fillStyle = baseGrad;
      ctx!.fillRect(0, 0, size, size);

      // === NEBULA SWIRLS ===
      for (let i = 0; i < 3; i++) {
        const angle = t * 0.15 + i * 2.1;
        const nx = cx + Math.cos(angle) * r * 0.3;
        const ny = cy + Math.sin(angle) * r * 0.35;
        const nebula = ctx!.createRadialGradient(nx, ny, 0, nx, ny, r * 0.5);
        nebula.addColorStop(0, `rgba(124,58,237,${0.06 + Math.sin(t + i) * 0.03})`);
        nebula.addColorStop(0.5, `rgba(168,85,247,${0.03 + Math.sin(t * 0.7 + i) * 0.02})`);
        nebula.addColorStop(1, 'rgba(0,0,0,0)');
        ctx!.fillStyle = nebula;
        ctx!.fillRect(0, 0, size, size);
      }

      // === LIQUID FILL ===
      if (fillPct > 0) {
        const fillH = (fillPct / 100) * r * 2;
        const fillTop = cy + r - fillH;
        const wave1 = Math.sin(t * 2) * 3;
        const wave2 = Math.sin(t * 2.7 + 1) * 2;

        const fillGrad = ctx!.createLinearGradient(0, fillTop, 0, cy + r);
        fillGrad.addColorStop(0, 'rgba(124,58,237,0.5)');
        fillGrad.addColorStop(0.5, 'rgba(168,85,247,0.4)');
        fillGrad.addColorStop(1, 'rgba(124,58,237,0.6)');

        ctx!.beginPath();
        ctx!.moveTo(cx - r, fillTop + wave1);
        for (let x = cx - r; x <= cx + r; x += 4) {
          const pct = (x - (cx - r)) / (r * 2);
          const y = fillTop + Math.sin(pct * Math.PI * 3 + t * 3) * 3 + wave2 * Math.sin(pct * Math.PI * 2);
          ctx!.lineTo(x, y);
        }
        ctx!.lineTo(cx + r, cy + r + 10);
        ctx!.lineTo(cx - r, cy + r + 10);
        ctx!.closePath();
        ctx!.fillStyle = fillGrad;
        ctx!.fill();
      }

      // === INNER GLOW CORE ===
      const pulse = 0.5 + Math.sin(t * 1.2) * 0.15;
      const coreGlow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r * 0.7);
      coreGlow.addColorStop(0, `rgba(168,85,247,${0.12 * pulse})`);
      coreGlow.addColorStop(0.4, `rgba(124,58,237,${0.06 * pulse})`);
      coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = coreGlow;
      ctx!.fillRect(0, 0, size, size);

      // === LIGHTNING ===
      const spawnInterval = 2000 + Math.random() * 2000;
      if (now - lastSpawnRef.current > spawnInterval) {
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          boltsRef.current.push({ segments: makeBolt(cx, cy, r), birth: now, life: 280 + Math.random() * 220 });
        }
        lastSpawnRef.current = now;
      }

      const alive: Bolt[] = [];
      for (const bolt of boltsRef.current) {
        const age = now - bolt.birth;
        if (age > bolt.life) continue;
        alive.push(bolt);
        const alpha = Math.pow(1 - age / bolt.life, 0.6);

        for (const s of bolt.segments) {
          // Outer glow
          ctx!.beginPath();
          ctx!.moveTo(s.x1, s.y1);
          ctx!.lineTo(s.x2, s.y2);
          ctx!.strokeStyle = `rgba(124,58,237,${alpha * 0.3})`;
          ctx!.lineWidth = s.w * 4;
          ctx!.lineCap = 'round';
          ctx!.stroke();

          // Main bolt
          ctx!.beginPath();
          ctx!.moveTo(s.x1, s.y1);
          ctx!.lineTo(s.x2, s.y2);
          ctx!.strokeStyle = `rgba(168,85,247,${alpha * 0.85})`;
          ctx!.lineWidth = s.w * 1.2;
          ctx!.stroke();

          // White hot core
          ctx!.beginPath();
          ctx!.moveTo(s.x1, s.y1);
          ctx!.lineTo(s.x2, s.y2);
          ctx!.strokeStyle = `rgba(255,255,255,${alpha * 0.7})`;
          ctx!.lineWidth = s.w * 0.35;
          ctx!.stroke();
        }
      }
      boltsRef.current = alive;

      // === SPECULAR HIGHLIGHT ===
      const sheen = ctx!.createRadialGradient(cx - r * 0.2, cy - r * 0.3, 0, cx - r * 0.2, cy - r * 0.3, r * 0.5);
      sheen.addColorStop(0, 'rgba(255,255,255,0.04)');
      sheen.addColorStop(1, 'rgba(255,255,255,0)');
      ctx!.fillStyle = sheen;
      ctx!.fillRect(0, 0, size, size);

      ctx!.restore();

      // === OUTER RING ===
      ctx!.beginPath();
      ctx!.arc(cx, cy, r + 1, 0, Math.PI * 2);
      ctx!.strokeStyle = `rgba(168,85,247,${0.15 + Math.sin(t * 1.5) * 0.1})`;
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      // === PERCENTAGE TEXT ===
      ctx!.fillStyle = 'white';
      ctx!.font = `300 ${size * 0.14}px ui-sans-serif, system-ui, sans-serif`;
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'middle';
      ctx!.shadowColor = 'rgba(168,85,247,0.6)';
      ctx!.shadowBlur = 25;
      ctx!.fillText(`${fillPct}%`, cx, cy);
      ctx!.shadowBlur = 0;

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [size, fillPct]);

  return (
    <canvas
      ref={canvasRef}
      className="animate-core-breathe"
      style={{
        width: size, height: size, borderRadius: '50%',
        boxShadow: '0 0 40px rgba(124,58,237,0.3), 0 0 80px rgba(168,85,247,0.15), 0 0 120px rgba(124,58,237,0.08)',
      }}
    />
  );
}

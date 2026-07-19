'use client';

/**
 * MareHero v2 — Henrik's photograph, with living water (2026-07-19).
 *
 * The hero IS the photo (public/mare/hero.jpg). A WebGL layer samples it
 * as a texture and animates ONLY the water: a colour mask (teal/blue
 * pixels) gated with a vertical prior selects sea + pool; those regions
 * get a slow fbm ripple displacement, wave-slope shading and warm
 * sun-glitter. Stone, sky, cypresses stay perfectly still.
 *
 * Robustness: a plain <img> sits under the canvas — if WebGL or the
 * texture fails, the still photograph carries the page. Reduced motion
 * gets the still image. 30fps cap, pauses off-screen.
 */

import { useEffect, useRef, useState } from 'react';

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform vec2 uImg;      // image pixel size
uniform float uTime;
uniform sampler2D uTex;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), u.x),
             mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  for(int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.07 + vec2(13.7, 7.3); a *= 0.5; }
  return v;
}

void main(){
  // object-fit: cover mapping
  vec2 frag = gl_FragCoord.xy / uRes;          // 0..1, y up
  vec2 uv = vec2(frag.x, 1.0 - frag.y);        // image space, y down
  float rCan = uRes.x / uRes.y;
  float rImg = uImg.x / uImg.y;
  if(rCan > rImg){
    float s = rImg / rCan;                      // crop top/bottom
    uv.y = uv.y * s + (1.0 - s) * 0.5;
  } else {
    float s = rCan / rImg;                      // crop sides
    uv.x = uv.x * s + (1.0 - s) * 0.5;
  }

  float t = uTime * 0.35;

  // ── water mask from the undistorted photo ──
  vec3 base = texture2D(uTex, uv).rgb;
  float coolness = (base.b - base.r) + (base.g - base.r) * 0.45;   // teal/blue
  float colorMask = smoothstep(0.015, 0.14, coolness);
  float below = smoothstep(0.30, 0.52, uv.y);                      // no water above the horizon band
  float mask = colorMask * below;
  // soften: bright warm reflections INSIDE water still ripple a bit
  float warmRefl = smoothstep(0.55, 0.75, uv.y) * (1.0 - colorMask);
  mask = clamp(mask + warmRefl * 0.35 * below, 0.0, 1.0);

  // ── ripple displacement ──
  float scaleY = mix(60.0, 26.0, uv.y);        // finer ripples further away
  vec2 wuv = vec2(uv.x * 42.0, uv.y * scaleY);
  float w1 = fbm(wuv + vec2(t * 1.4,  t * 0.9));
  float w2 = fbm(wuv * 1.7 - vec2(t * 1.1, -t * 0.6));
  vec2 disp = vec2(w1 - 0.5, (w2 - 0.5) * 1.6) * 0.0075 * mask;

  vec3 col = texture2D(uTex, uv + disp).rgb;

  // ── wave shading + glitter, only on water ──
  float e = 0.012;
  float slope = fbm(wuv + vec2(e * 42.0, 0.0) + vec2(t * 1.4, t * 0.9)) - w1;
  col *= 1.0 + slope * 2.2 * mask;

  float glit = pow(noise(wuv * 2.6 + vec2(t * 2.2, -t * 3.0)), 8.0);
  col += vec3(1.0, 0.82, 0.58) * glit * mask * 0.5;

  // faint moving sheen across the pool surface
  float sheen = fbm(vec2(uv.x * 6.0 - t * 0.5, uv.y * 9.0));
  col += vec3(0.9, 0.75, 0.6) * (sheen - 0.5) * 0.05 * mask;

  gl_FragColor = vec4(col, 1.0);
}
`;

export function MareSea({ className, src = '/mare/hero.jpg' }: { className?: string; src?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shaderLive, setShaderLive] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // still photo is the experience

    const img = new Image();
    img.src = src;
    let cleanup: (() => void) | undefined;

    img.onload = () => {
      const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
      if (!gl) return;

      const compile = (type: number, s: string) => {
        const sh = gl.createShader(type)!;
        gl.shaderSource(sh, s);
        gl.compileShader(sh);
        return sh;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      const uRes = gl.getUniformLocation(prog, 'uRes');
      const uImg = gl.getUniformLocation(prog, 'uImg');
      const uTime = gl.getUniformLocation(prog, 'uTime');
      gl.uniform2f(uImg, img.naturalWidth, img.naturalHeight);

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const resize = () => {
        canvas.width = Math.round(canvas.clientWidth * dpr);
        canvas.height = Math.round(canvas.clientHeight * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
      };
      resize();
      window.addEventListener('resize', resize);

      let raf = 0;
      let running = true;
      let last = 0;
      const start = performance.now();
      const FRAME_MS = 1000 / 30;
      const frame = (now: number) => {
        if (!running) return;
        raf = requestAnimationFrame(frame);
        if (now - last < FRAME_MS) return;
        last = now;
        gl.uniform1f(uTime, (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      frame(performance.now());
      setShaderLive(true);

      const io = new IntersectionObserver(([en]) => {
        if (en.isIntersecting && !running) { running = true; last = 0; frame(performance.now()); }
        if (!en.isIntersecting) { running = false; cancelAnimationFrame(raf); }
      });
      io.observe(canvas);

      (window as unknown as Record<string, unknown>).__mareSea = {
        pause: () => { running = false; cancelAnimationFrame(raf); },
        resume: () => { if (!running) { running = true; last = 0; frame(performance.now()); } },
      };

      cleanup = () => {
        running = false;
        cancelAnimationFrame(raf);
        io.disconnect();
        window.removeEventListener('resize', resize);
      };
    };

    return () => cleanup?.();
  }, [src]);

  return (
    <div className={className} aria-hidden="true">
      {/* The photograph — always present; sole renderer if WebGL/texture fails.
          Until the file exists, a quiet dusk gradient stands in (no broken glyph). */}
      {imgFailed ? (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, #141327 0%, #3a2742 38%, #b96b45 52%, #173038 60%, #0a1d24 100%)' }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setImgFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {/* The living-water layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full transition-opacity duration-700"
        style={{ opacity: shaderLive ? 1 : 0 }}
      />
    </div>
  );
}

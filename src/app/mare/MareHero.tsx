'use client';

/**
 * MareHero — a living Mediterranean dusk, painted in WebGL (2026-07-18).
 *
 * No photograph: the sky, the sea and the sun-glint are a real-time
 * shader — layered gradient dusk, fbm clouds, a projected wave plane
 * with animated normals, and a shimmering specular column under a low
 * sun. The water genuinely moves. Falls back to a static painted frame
 * under prefers-reduced-motion or without WebGL.
 */

import { useEffect, useRef } from 'react';

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  for(int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + vec2(17.3, 9.1); a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float t = uTime * 0.14;

  float horizon = 0.46;
  vec2 sun = vec2(0.36, horizon + 0.085);

  // ── palette ──
  vec3 skyTop    = vec3(0.078, 0.090, 0.180);  // deep indigo night
  vec3 skyMid    = vec3(0.365, 0.220, 0.360);  // violet
  vec3 skyLow    = vec3(0.910, 0.510, 0.320);  // rose-amber horizon
  vec3 sunCore   = vec3(1.000, 0.860, 0.620);
  vec3 seaNear   = vec3(0.024, 0.105, 0.135);  // deep teal
  vec3 seaFar    = vec3(0.180, 0.240, 0.300);
  vec3 glintWarm = vec3(1.000, 0.760, 0.440);

  vec3 col;

  if(uv.y > horizon){
    // ───────────────────────── SKY ─────────────────────────
    float h = (uv.y - horizon) / (1.0 - horizon);
    col = mix(skyLow, skyMid, smoothstep(0.0, 0.42, h));
    col = mix(col, skyTop, smoothstep(0.30, 1.0, h));

    // sun glow + soft disc
    vec2 sd = vec2((uv.x - sun.x) * aspect, uv.y - sun.y);
    float d = length(sd);
    col += sunCore * exp(-d * 6.5) * 0.55;
    col += sunCore * exp(-d * 28.0) * 0.65;
    col += vec3(1.0, 0.93, 0.80) * smoothstep(0.030, 0.008, d);

    // dusk clouds — slow drifting fbm bands, lit from below
    float cl = fbm(vec2(uv.x * 3.2 + t * 0.18, uv.y * 7.0));
    float band = smoothstep(0.10, 0.55, h) * smoothstep(1.0, 0.45, h);
    float cloud = smoothstep(0.52, 0.78, cl) * band;
    vec3 cloudLit = mix(vec3(0.98, 0.62, 0.46), vec3(0.28, 0.22, 0.38), h);
    col = mix(col, cloudLit, cloud * 0.55);
    // cloud underlight near sun
    col += glintWarm * cloud * exp(-d * 3.0) * 0.35;

    // stars fading in near the top
    float st = pow(hash(floor(uv * uRes.y * vec2(aspect, 1.0) * 0.9)), 40.0);
    col += vec3(st) * smoothstep(0.55, 1.0, h) * 0.5;
  } else {
    // ───────────────────────── SEA ─────────────────────────
    float depth = (horizon - uv.y) / horizon;          // 0 at horizon → 1 at bottom
    float persp = 1.0 / (depth * 6.0 + 0.18);          // projected plane
    vec2 suv = vec2((uv.x - 0.5) * aspect * persp * 4.0, persp * 7.0);

    // travelling wave field: two opposing fbm layers
    float w1 = fbm(suv * vec2(1.0, 0.75) + vec2(t * 0.9,  t * 0.55));
    float w2 = fbm(suv * vec2(1.6, 1.10) - vec2(t * 0.7, -t * 0.40));
    float wave = w1 * 0.65 + w2 * 0.35;

    // finite-difference slope → fake normal for shading
    float e = 0.06;
    float wx = fbm((suv + vec2(e, 0.0)) * vec2(1.0, 0.75) + vec2(t * 0.9, t * 0.55)) - w1;
    float shade = clamp(0.5 + wx * 6.0, 0.0, 1.0);

    // base water: deep near, hazy warm at horizon
    col = mix(seaNear, seaFar, pow(1.0 - depth, 2.2));
    col *= 0.75 + 0.5 * wave;

    // sky reflection (fresnel-ish, strongest at horizon)
    float fres = pow(1.0 - depth, 3.0);
    col = mix(col, mix(skyLow, skyMid, 0.35), fres * 0.55);

    // ── the sun path: shimmering specular column ──
    float dx = (uv.x - sun.x) * aspect;
    float widen = 0.018 + depth * 0.16;                        // path widens toward viewer
    float column = exp(-dx * dx / (widen * widen));
    float sparkle = pow(noise(vec2(suv.x * 2.0, suv.y * 3.0) + vec2(0.0, -t * 2.2)), 2.0);
    float glitter = pow(noise(suv * 6.0 + vec2(t * 1.4, -t * 2.8)), 7.0) * 3.0;
    float path = column * (0.35 + 0.65 * sparkle) * (0.55 + 0.45 * shade);
    col += glintWarm * path * (0.6 + 0.6 * (1.0 - depth));
    col += sunCore * column * glitter * (1.0 - depth * 0.6);

    // broad wave glitter outside the path
    col += vec3(0.55, 0.62, 0.66) * pow(wave, 6.0) * 0.35 * (1.0 - fres);

    // horizon haze seam
    col = mix(col, skyLow * 0.95, smoothstep(0.06, 0.0, depth) * 0.45);
  }

  // vignette + gentle grain
  vec2 vc = uv - 0.5;
  col *= 1.0 - dot(vc, vc) * 0.55;
  col += (hash(uv * uRes.xy + fract(uTime)) - 0.5) * 0.016;

  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export function MareSea({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
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

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let running = true;
    let last = 0;
    const start = performance.now();
    const FRAME_MS = 1000 / 30; // 30fps — the sea is slow; spare the GPU
    const frame = (now: number) => {
      if (!running) return;
      if (!reduced) raf = requestAnimationFrame(frame);
      if (now - last < FRAME_MS) return;
      last = now;
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    frame(performance.now()); // reduced-motion still gets one painted frame

    // Escape hatch for tooling/screenshots
    (window as unknown as Record<string, unknown>).__mareSea = {
      pause: () => { running = false; cancelAnimationFrame(raf); },
      resume: () => { if (!running) { running = true; last = 0; frame(performance.now()); } },
    };

    const io = new IntersectionObserver(([e]) => {
      const visible = e.isIntersecting;
      if (visible && !running) { running = true; frame(); }
      if (!visible) { running = false; cancelAnimationFrame(raf); }
    });
    io.observe(canvas);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

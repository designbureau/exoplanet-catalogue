// PlanetCanvas — procedural 2D planet renderer on canvas.
// Ported verbatim from design_handoff/design/src/planet-renderer.jsx.
// All drawing math is unchanged — only React imports + TypeScript types added.

import { useEffect, useRef } from "react";

// ---------- types ----------

export type PlanetType =
  | "rocky"
  | "rocky_earthlike"
  | "lava"
  | "eyeball_ice"
  | "gas_giant"
  | "ice_giant"
  | "ocean"
  | "hot_jupiter"
  | "carbon";

type RGB = [number, number, number];
type Shader = (h: number, t: number, lat: number, bandNoise: number) => RGB;

// ---------- noise helpers (value-noise fbm) ----------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed: number) {
  const rnd = mulberry32(seed);
  const size = 256;
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();

  function sample(x: number, y: number) {
    x = ((x % size) + size) % size;
    y = ((y % size) + size) % size;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = grid[yi * size + xi];
    const b = grid[yi * size + ((xi + 1) % size)];
    const c = grid[((yi + 1) % size) * size + xi];
    const d = grid[((yi + 1) % size) * size + ((xi + 1) % size)];
    const sx = xf * xf * (3 - 2 * xf);
    const sy = yf * yf * (3 - 2 * yf);
    return a * (1 - sx) * (1 - sy) + b * sx * (1 - sy) + c * (1 - sx) * sy + d * sx * sy;
  }

  function fbm(x: number, y: number, oct = 5) {
    let amp = 0.5, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += amp * sample(x * freq, y * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  }

  return { sample, fbm };
}

// ---------- color helpers ----------

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// ---------- planet type shaders ----------

const PLANET_TYPES: Record<PlanetType, Shader> = {
  eyeball_ice: (h, t, lat) => {
    if (lat < 0.15) {
      const water = mix([30, 52, 78], [82, 128, 162], (lat + 1) * 0.5);
      return mix(water, [180, 210, 228], h * 0.3);
    } else if (lat < 0.45) {
      return mix([140, 160, 178], [220, 230, 238], t);
    } else {
      return mix([210, 222, 232], [244, 248, 252], t * 0.7 + h * 0.3);
    }
  },
  rocky_earthlike: (h, t) => {
    if (h < 0.48) return mix([18, 42, 72], [48, 98, 138], h * 2);
    if (h < 0.56) return mix([140, 132, 96], [90, 128, 78], t);
    if (h < 0.78) return mix([70, 96, 52], [120, 140, 70], t);
    return mix([180, 178, 168], [240, 240, 236], (h - 0.78) * 4);
  },
  lava: (h, t) => {
    if (h < 0.4) return mix([20, 8, 6], [48, 14, 8], t);
    if (h < 0.6) return mix([80, 24, 12], [140, 40, 18], t);
    if (h < 0.82) return mix([200, 80, 24], [244, 148, 48], t);
    return mix([252, 220, 120], [255, 248, 200], (h - 0.82) * 5);
  },
  gas_giant: (h, t, lat, bandNoise) => {
    const band = 0.5 + 0.5 * Math.sin(lat * 18 + bandNoise * 2.0);
    const warm = mix([180, 132, 88], [232, 190, 142], t);
    const cool = mix([94, 72, 60], [148, 110, 82], t);
    return mix(cool, warm, band);
  },
  ice_giant: (h, t, lat, bandNoise) => {
    const band = 0.5 + 0.5 * Math.sin(lat * 10 + bandNoise * 1.5);
    const deep = mix([24, 48, 96], [48, 92, 148], t);
    const pale = mix([120, 170, 210], [190, 220, 240], t);
    return mix(deep, pale, band);
  },
  ocean: (h, t) => mix([12, 30, 58], [90, 150, 195], h * 0.7 + t * 0.3),
  hot_jupiter: (h, t, lat, bandNoise) => {
    const band = 0.5 + 0.5 * Math.sin(lat * 12 + bandNoise * 1.8);
    const night = mix([24, 8, 14], [58, 18, 26], t);
    const day = mix([140, 48, 62], [220, 120, 90], t);
    return mix(night, day, band);
  },
  carbon: (h, t) => {
    if (h < 0.55) return mix([8, 8, 10], [28, 24, 30], t);
    return mix([80, 72, 88], [180, 170, 190], (h - 0.55) * 2.2);
  },
  rocky: (h, t) => {
    if (h < 0.4) return mix([40, 32, 28], [74, 60, 52], t);
    if (h < 0.7) return mix([110, 92, 78], [150, 128, 108], t);
    return mix([188, 172, 158], [230, 218, 204], (h - 0.7) * 3);
  },
};

// ---------- renderer ----------

const CACHE = new Map<string, HTMLCanvasElement>();

interface RenderParams {
  canvas: HTMLCanvasElement;
  type: PlanetType;
  seed: number;
  size: number;
  lightAngle?: number;
  tiltY?: number;
  rotation?: number;
  atmosphere?: string | null;
  paused?: boolean;
}

function renderPlanet({ canvas, type, seed, size, lightAngle = -0.6, tiltY = 0.1, rotation = 0, atmosphere = null, paused = false }: RenderParams) {
  const cacheKey = paused ? `${type}|${seed}|${size}|${lightAngle}|${tiltY}|${rotation | 0}|${atmosphere}` : null;
  if (cacheKey && CACHE.has(cacheKey)) {
    const img = CACHE.get(cacheKey)!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0);
    return;
  }

  const ctx = canvas.getContext("2d")!;
  const w = size, h = size;
  canvas.width = w;
  canvas.height = h;
  const img = ctx.createImageData(w, h);
  const data = img.data;
  const noise = makeNoise(seed);
  const shader = PLANET_TYPES[type] ?? PLANET_TYPES.rocky;

  const cx = w / 2, cy = h / 2;
  const r = w / 2 - 2;
  const lx = Math.cos(lightAngle), ly = Math.sin(lightAngle) * 0.3, lz = -Math.sin(lightAngle);
  const rotRad = (rotation * Math.PI) / 180;
  const bandNoise = noise.fbm(seed & 0xff, (seed >> 8) & 0xff);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / r;
      const dy = (y - cy) / r;
      const d2 = dx * dx + dy * dy;
      const idx = (y * w + x) * 4;
      if (d2 > 1) { data[idx + 3] = 0; continue; }
      const dz = Math.sqrt(1 - d2);
      const sx = dx * Math.cos(rotRad) + dz * Math.sin(rotRad);
      const sy = dy + tiltY * dz;
      const sz = -dx * Math.sin(rotRad) + dz * Math.cos(rotRad);
      const lon = Math.atan2(sx, sz) / Math.PI;
      const lat = Math.asin(Math.max(-1, Math.min(1, sy))) / (Math.PI / 2);
      const u = (lon + 1) * 4;
      const v = (lat + 1) * 4;
      const hVal = noise.fbm(u * 2.3, v * 2.3, 5);
      const tVal = noise.fbm(u * 0.8 + 10, v * 0.8 + 10, 3);
      let [r0, g0, b0] = shader(hVal, tVal, lat, bandNoise);
      const ndotl = Math.max(0, dx * lx + dy * ly + dz * lz);
      const shade = 0.08 + 0.92 * ndotl;
      const rim = Math.pow(1 - d2, 0.6) * 0.08;
      r0 = r0 * shade + 255 * rim * 0.02;
      g0 = g0 * shade + 255 * rim * 0.04;
      b0 = b0 * shade + 255 * rim * 0.08;
      data[idx] = Math.min(255, r0);
      data[idx + 1] = Math.min(255, g0);
      data[idx + 2] = Math.min(255, b0);
      data[idx + 3] = 255;
    }
  }
  ctx.clearRect(0, 0, w, h);
  ctx.putImageData(img, 0, 0);

  if (atmosphere) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const grad = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.08);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.5, atmosphere);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (cacheKey) {
    const cached = document.createElement("canvas");
    cached.width = w; cached.height = h;
    cached.getContext("2d")!.drawImage(canvas, 0, 0);
    CACHE.set(cacheKey, cached);
  }
}

// ---------- React component ----------

export interface PlanetCanvasProps {
  type?: PlanetType;
  seed?: number;
  size?: number;
  animate?: boolean;
  atmosphere?: string | null;
  tilt?: number;
  lightAngle?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function PlanetCanvas({
  type = "rocky_earthlike",
  seed = 1,
  size = 200,
  animate = false,
  atmosphere = null,
  tilt = 0.1,
  lightAngle = -0.6,
  className,
  style,
}: PlanetCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const rotRef = useRef<number>(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let last = performance.now();
    let running = true;

    function draw(paused: boolean) {
      renderPlanet({ canvas: canvas!, type, seed, size, lightAngle, tiltY: tilt, rotation: rotRef.current, atmosphere, paused });
    }

    if (!animate) {
      draw(true);
      return () => {};
    }

    function loop(now: number) {
      if (!running) return;
      const dt = Math.min(50, now - last);
      last = now;
      rotRef.current = (rotRef.current + dt * 0.008) % 360;
      draw(false);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [type, seed, size, animate, atmosphere, tilt, lightAngle]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, display: "block", ...style }}
    />
  );
}

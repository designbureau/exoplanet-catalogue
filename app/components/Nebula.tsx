import { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three/webgpu";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Fn,
  abs,
  clamp,
  cubeTexture,
  dot,
  float,
  floor,
  fract,
  mix,
  mix as mixN,
  positionLocal,
  pow,
  sin,
  smoothstep,
  uniform,
  varying,
  vec3,
  vec4,
  type N,
} from "~/shaders/tsl/nodes";

// ---- TSL noise (pure functions → emitted once as shader functions) ----

// hash3: fract(sin(dot(p, (127.1, 311.7, 74.7))) * 43758.5453123)
const hash3 = Fn(([p]: N[]) => fract(sin(dot(p, vec3(127.1, 311.7, 74.7))).mul(43758.5453123)), {
  p: "vec3",
  return: "float",
});

const noise3d = Fn(
  ([p]: N[]) => {
    const i = floor(p).toVar();
    const f = fract(p).toVar();
    const u = f.mul(f).mul(float(3).sub(f.mul(2))).toVar();
    const h = (x: number, y: number, z: number) => hash3(i.add(vec3(x, y, z)));
    return mix(
      mix(mix(h(0, 0, 0), h(1, 0, 0), u.x), mix(h(0, 1, 0), h(1, 1, 0), u.x), u.y),
      mix(mix(h(0, 0, 1), h(1, 0, 1), u.x), mix(h(0, 1, 1), h(1, 1, 1), u.x), u.y),
      u.z,
    );
  },
  { p: "vec3", return: "float" },
);

// Cloud noise: sin-modulated FBM (5 octaves — full detail, only rendered once)
const cloudNoise = Fn(
  ([p0, freq, seed]: N[]) => {
    let p = p0.mul(freq).add(vec3(seed)).toVar();
    let v: N = float(0);
    let a = 0.5;
    for (let i = 0; i < 5; i++) {
      const n = noise3d(p);
      v = v.add(sin(n.mul(6.2831)).mul(0.5).add(0.5).mul(a));
      p = p.mul(2.02).add(vec3(31.7, 17.3, 53.1)).toVar();
      a *= 0.5;
    }
    return v;
  },
  { p0: "vec3", freq: "float", seed: "float", return: "float" },
);

// Ridged noise (4 octaves — full detail filaments)
const ridgedNoise = Fn(
  ([p0, freq]: N[]) => {
    let p = p0.mul(freq).toVar();
    let v: N = float(0);
    let a = 0.5;
    for (let i = 0; i < 4; i++) {
      const n0 = noise3d(p);
      const n = float(1).sub(abs(n0.mul(2).sub(1)));
      v = v.add(n.mul(n).mul(a));
      p = p.mul(2.03).add(vec3(13.7, 29.3, 41.1)).toVar();
      a *= 0.5;
    }
    return v;
  },
  { p0: "vec3", freq: "float", return: "float" },
);

// Nebula palettes inspired by real nebulae, grouped by star temperature association
// Hot stars (>15000K): OIII-dominated — teal, green-blue, cyan
// Warm-hot stars (8000-15000K): mixed emission — blue-purple, magenta
// Solar-type (5000-8000K): reflection + Hα — blue, pink, gold
// Cool stars (<5000K): molecular clouds + Hα — red, orange, brown, warm tones

type Palette = [THREE.Color, THREE.Color, THREE.Color, THREE.Color];

const hotPalettes: Palette[] = [
  // Eta Carinae — teal/orange/gold/violet
  [new THREE.Color(0.05, 0.4, 0.45), new THREE.Color(0.8, 0.5, 0.15), new THREE.Color(0.2, 0.7, 0.6), new THREE.Color(0.4, 0.12, 0.5)],
  // OIII emission — deep teal/green/cyan/pink
  [new THREE.Color(0.02, 0.35, 0.3), new THREE.Color(0.1, 0.6, 0.5), new THREE.Color(0.15, 0.8, 0.7), new THREE.Color(0.7, 0.2, 0.35)],
  // Blue supergiant — electric blue/white/cyan/amber
  [new THREE.Color(0.1, 0.15, 0.6), new THREE.Color(0.2, 0.4, 0.9), new THREE.Color(0.5, 0.7, 1.0), new THREE.Color(0.8, 0.6, 0.15)],
  // Pillars of Creation — green/gold/brown/teal
  [new THREE.Color(0.15, 0.35, 0.1), new THREE.Color(0.5, 0.45, 0.15), new THREE.Color(0.2, 0.55, 0.25), new THREE.Color(0.05, 0.3, 0.4)],
  // NGC 3603 — cyan/magenta/gold/emerald
  [new THREE.Color(0.1, 0.5, 0.6), new THREE.Color(0.6, 0.1, 0.45), new THREE.Color(0.85, 0.65, 0.1), new THREE.Color(0.08, 0.5, 0.25)],
  // Tarantula Nebula — red/teal/violet/yellow
  [new THREE.Color(0.7, 0.12, 0.08), new THREE.Color(0.05, 0.45, 0.5), new THREE.Color(0.35, 0.08, 0.55), new THREE.Color(0.9, 0.7, 0.15)],
];

const warmPalettes: Palette[] = [
  // Orion Nebula — purple/pink/blue/green
  [new THREE.Color(0.3, 0.08, 0.5), new THREE.Color(0.6, 0.2, 0.7), new THREE.Color(0.4, 0.3, 0.9), new THREE.Color(0.15, 0.5, 0.25)],
  // Carina magic mountain — blue/teal/gold/crimson
  [new THREE.Color(0.08, 0.2, 0.5), new THREE.Color(0.1, 0.45, 0.55), new THREE.Color(0.7, 0.55, 0.2), new THREE.Color(0.6, 0.08, 0.12)],
  // Lagoon Nebula — magenta/pink/red/cobalt
  [new THREE.Color(0.5, 0.05, 0.3), new THREE.Color(0.7, 0.15, 0.4), new THREE.Color(0.9, 0.35, 0.5), new THREE.Color(0.12, 0.15, 0.55)],
  // Veil Nebula — cyan/red/blue/olive
  [new THREE.Color(0.1, 0.4, 0.6), new THREE.Color(0.6, 0.15, 0.1), new THREE.Color(0.15, 0.25, 0.7), new THREE.Color(0.4, 0.45, 0.1)],
  // Trifid Nebula — salmon/blue/violet/warm yellow
  [new THREE.Color(0.75, 0.3, 0.2), new THREE.Color(0.15, 0.25, 0.6), new THREE.Color(0.45, 0.1, 0.5), new THREE.Color(0.8, 0.65, 0.2)],
  // Thor's Helmet — teal/amber/rose/indigo
  [new THREE.Color(0.06, 0.4, 0.4), new THREE.Color(0.75, 0.5, 0.1), new THREE.Color(0.65, 0.2, 0.3), new THREE.Color(0.18, 0.1, 0.5)],
];

const solarPalettes: Palette[] = [
  // Eagle Nebula — gold/green/brown/rose
  [new THREE.Color(0.5, 0.4, 0.1), new THREE.Color(0.25, 0.4, 0.15), new THREE.Color(0.7, 0.5, 0.2), new THREE.Color(0.6, 0.2, 0.3)],
  // Rosette Nebula — red/pink/purple/teal
  [new THREE.Color(0.6, 0.1, 0.12), new THREE.Color(0.8, 0.2, 0.3), new THREE.Color(0.5, 0.15, 0.4), new THREE.Color(0.1, 0.35, 0.35)],
  // Reflection + Hα — blue/pink/amber/mint
  [new THREE.Color(0.1, 0.15, 0.45), new THREE.Color(0.6, 0.2, 0.35), new THREE.Color(0.25, 0.3, 0.7), new THREE.Color(0.7, 0.55, 0.15)],
  // Bubble Nebula — teal/yellow/orange/lavender
  [new THREE.Color(0.05, 0.3, 0.35), new THREE.Color(0.7, 0.6, 0.15), new THREE.Color(0.9, 0.45, 0.1), new THREE.Color(0.4, 0.25, 0.55)],
  // Ring Nebula — blue/green/red/peach
  [new THREE.Color(0.08, 0.18, 0.55), new THREE.Color(0.15, 0.5, 0.3), new THREE.Color(0.65, 0.1, 0.1), new THREE.Color(0.85, 0.6, 0.4)],
  // Helix Nebula — cyan/magenta/gold/lime
  [new THREE.Color(0.1, 0.5, 0.55), new THREE.Color(0.55, 0.1, 0.4), new THREE.Color(0.75, 0.6, 0.1), new THREE.Color(0.3, 0.55, 0.1)],
];

const coolPalettes: Palette[] = [
  // Horsehead — deep red/brown/orange/steel blue
  [new THREE.Color(0.5, 0.08, 0.05), new THREE.Color(0.7, 0.25, 0.08), new THREE.Color(0.9, 0.45, 0.12), new THREE.Color(0.15, 0.2, 0.4)],
  // Flame Nebula — orange/yellow/red/violet
  [new THREE.Color(0.7, 0.3, 0.05), new THREE.Color(0.9, 0.55, 0.1), new THREE.Color(1.0, 0.7, 0.2), new THREE.Color(0.35, 0.08, 0.45)],
  // Barnard's Loop — crimson/maroon/peach/teal
  [new THREE.Color(0.45, 0.05, 0.08), new THREE.Color(0.65, 0.12, 0.1), new THREE.Color(0.8, 0.25, 0.15), new THREE.Color(0.08, 0.3, 0.35)],
  // Witch Head — blue-grey/brown/amber/sage
  [new THREE.Color(0.15, 0.15, 0.3), new THREE.Color(0.4, 0.25, 0.15), new THREE.Color(0.55, 0.35, 0.2), new THREE.Color(0.25, 0.35, 0.2)],
  // IC 1396 Elephant Trunk — rust/gold/teal/magenta
  [new THREE.Color(0.6, 0.18, 0.05), new THREE.Color(0.8, 0.6, 0.12), new THREE.Color(0.08, 0.35, 0.4), new THREE.Color(0.5, 0.1, 0.35)],
  // Cocoon Nebula — warm red/cyan/gold/plum
  [new THREE.Color(0.65, 0.15, 0.1), new THREE.Color(0.1, 0.45, 0.5), new THREE.Color(0.85, 0.65, 0.15), new THREE.Color(0.4, 0.1, 0.4)],
];

export function hashSeedString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

export function nebulaColors(seed: number, starTemp: number): Palette {
  // Allow cross-group bleed: sometimes pick from adjacent temperature group
  const allGroups = [coolPalettes, solarPalettes, warmPalettes, hotPalettes];
  let groupIdx = starTemp > 15000 ? 3 : starTemp > 8000 ? 2 : starTemp > 5000 ? 1 : 0;
  // 20% chance to shift one group for variety
  const seedShift = Math.abs(seed * 7) % 10;
  if (seedShift < 2 && groupIdx > 0) groupIdx--;
  else if (seedShift >= 8 && groupIdx < 3) groupIdx++;
  const palettes = allGroups[groupIdx];

  const index = ((seed % palettes.length) + palettes.length) % palettes.length;
  return palettes[index];
}

interface NebulaProps {
  seed?: string;
  density?: number;
  brightness?: number;
  starTemp?: number;
  starDensity?: number;
  scale?: number;
  warp?: number;
  contrast?: number;
  mix?: number;
  colors?: [string, string, string, string] | null;
  cutoff?: number;
}

export default function Nebula({ seed = "default", density = 0.6, brightness = 0.5, starTemp = 5500, starDensity = 1.0, scale = 1.0, warp = 0.4, contrast = 1.5, mix = 0.4, colors = null, cutoff = 0.0 }: NebulaProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();
  const [baked, setBaked] = useState(false);

  // Procedural material (used once for baking, then replaced)
  const { proceduralMat, procUniforms, bakedMat, cubeTarget } = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    }

    const seedVec = new THREE.Vector3(
      (((h % 1000) + 1000) % 1000) / 1000,
      ((((h * 7) % 1000) + 1000) % 1000) / 1000,
      ((((h * 13) % 1000) + 1000) % 1000) / 1000
    );

    const [c1, c2, c3, c4] = nebulaColors(h, starTemp);

    const u = {
      u_time: uniform(0.0),
      u_seed: uniform(seedVec),
      u_color1: uniform(colors ? new THREE.Color(colors[0]) : c1.clone()),
      u_color2: uniform(colors ? new THREE.Color(colors[1]) : c2.clone()),
      u_color3: uniform(colors ? new THREE.Color(colors[2]) : c3.clone()),
      u_color4: uniform(colors ? new THREE.Color(colors[3]) : c4.clone()),
      u_nebulaDensity: uniform(density),
      u_brightness: uniform(brightness),
      u_starDensity: uniform(starDensity),
      u_scale: uniform(scale),
      u_warp: uniform(warp),
      u_contrast: uniform(contrast),
      u_mix: uniform(mix),
      u_cutoff: uniform(cutoff),
    };

    const vPosition = varying(positionLocal.normalize());

    const proc = new THREE.NodeMaterial();
    proc.side = THREE.BackSide;
    proc.transparent = true;
    proc.depthWrite = false;
    proc.blending = THREE.AdditiveBlending;
    proc.fragmentNode = Fn(() => {
      const dir = vPosition.normalize();
      const sp = dir.add(u.u_seed.mul(50)).toVar();

      // Layer 1: base cloud structure
      const c1n = cloudNoise(sp, u.u_scale.mul(1.5), u.u_seed.x.mul(100)).toVar();

      // Layer 2: domain-warped cloud using layer 1
      const c2n = cloudNoise(
        sp.add(vec3(c1n.mul(u.u_warp))),
        u.u_scale.mul(2.5),
        u.u_seed.y.mul(100).add(310.4),
      ).toVar();

      // Layer 3: ridged features for filamentary structure
      const r1 = ridgedNoise(
        sp.add(vec3(c1n.mul(u.u_warp).mul(0.5), c2n.mul(u.u_warp).mul(0.375), 0)),
        u.u_scale.mul(2),
      ).toVar();

      // Combine into nebula density
      let nebula: N = c2n.mul(float(1).sub(u.u_mix)).add(r1.mul(u.u_mix));
      nebula = pow(nebula, u.u_contrast).mul(u.u_nebulaDensity);
      const gapMask = smoothstep(u.u_cutoff, u.u_cutoff.add(0.4), nebula);
      nebula = clamp(nebula.mul(gapMask), 0, 1).toVar();

      // Colour: spatially varied blending using different noise layers.
      // Each colour gets its own region of dominance.
      const zone1 = cloudNoise(sp.mul(0.5).add(vec3(u.u_seed.z.mul(50))), float(0.8), u.u_seed.x.mul(30));
      const zone2 = noise3d(sp.mul(1.2).add(vec3(u.u_seed.y.mul(40), 0, u.u_seed.z.mul(60))));
      let nebulaColor: N = mixN(u.u_color1, u.u_color2, smoothstep(0.3, 0.7, c1n));
      nebulaColor = mixN(nebulaColor, u.u_color3, smoothstep(0.35, 0.65, zone1));
      nebulaColor = mixN(nebulaColor, u.u_color4, smoothstep(0.4, 0.7, zone2).mul(r1));

      // Compose final colour (nebula only)
      return vec4(nebulaColor.mul(nebula).mul(u.u_brightness), nebula);
    })();

    // Cubemap render target for baking
    const target = new THREE.CubeRenderTarget(512, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });

    // Simple cubemap display material — samples the baked cubemap, near-zero cost
    const bkd = new THREE.NodeMaterial();
    bkd.side = THREE.BackSide;
    bkd.transparent = true;
    bkd.depthWrite = false;
    bkd.blending = THREE.AdditiveBlending;
    bkd.fragmentNode = cubeTexture(target.texture, varying(positionLocal.normalize()));

    const proceduralUniforms = u;
    return { proceduralMat: proc, procUniforms: proceduralUniforms, bakedMat: bkd, cubeTarget: target };
  }, [seed, starTemp]);

  // Bake on first frame: render procedural nebula to cubemap, then swap material
  useFrame(() => {
    if (baked || !meshRef.current) return;

    // Apply current slider values before baking
    const u = procUniforms;
    u.u_nebulaDensity.value = density;
    u.u_brightness.value = brightness;
    u.u_scale.value = scale;
    u.u_warp.value = warp;
    u.u_contrast.value = contrast;
    u.u_mix.value = mix;
    u.u_cutoff.value = cutoff;
    if (colors) {
      u.u_color1.value.set(colors[0]);
      u.u_color2.value.set(colors[1]);
      u.u_color3.value.set(colors[2]);
      u.u_color4.value.set(colors[3]);
    }

    // Render to cubemap: place a CubeCamera at origin, render the nebula sphere
    const cubeCamera = new THREE.CubeCamera(1, 10000000, cubeTarget);
    const tempScene = new THREE.Scene();
    const nebulaMesh = new THREE.Mesh(
      new THREE.SphereGeometry(5000000, 32, 32),
      proceduralMat
    );
    tempScene.add(nebulaMesh);
    cubeCamera.update(gl, tempScene);

    // Swap to baked material
    meshRef.current.material = bakedMat;
    setBaked(true);

    // Cleanup
    nebulaMesh.geometry.dispose();
  });

  // Re-bake when slider values change
  useEffect(() => {
    if (baked) setBaked(false);
  }, [density, brightness, scale, warp, contrast, mix, cutoff, colors]);

  return (
    <mesh ref={meshRef} material={proceduralMat} renderOrder={-3}>
      <sphereGeometry args={[5000000, 32, 32]} />
    </mesh>
  );
}

import { useMemo } from "react";
import * as THREE from "three";

// Milky Way parameters (in parsecs) based on observational data
// Pitch angle ~13°, arm start ~2.2 kpc, Sun at ~8.2 kpc from centre
// Sources: MNRAS 527(1) 2024, Vallee 2017, Gaia DR3 studies
const SUN_DISTANCE = 8200; // pc from galactic centre
const DISC_RADIUS = 15000; // pc
const DISC_HEIGHT = 150; // pc half-thickness
const BAR_HALF_LENGTH = 4200; // pc (long bar)
const BAR_HALF_WIDTH = 800; // pc
const DEFAULT_BAR_ANGLE = 30; // degrees
const DEFAULT_PITCH_PRIMARY = 15; // degrees
const DEFAULT_PITCH_SECONDARY = 13; // degrees
const ARM_WIDTH = 1400; // pc - wider for fuzzier appearance
const ARM_START_RADIUS = BAR_HALF_LENGTH; // arms start at bar ends

const ARM_STRENGTHS = [1.0, 0.7, 1.0, 0.7];
const SECONDARY_START_RADIUS = 4800;

const PARTICLES_PER_ARM = 30000;
const BULGE_PARTICLES = 12000;
const BAR_PARTICLES = 8000;
const DISC_PARTICLES = 30000;

// Seeded random for reproducibility
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function gaussRandom(rand: () => number, sigma: number) {
  const u1 = Math.max(rand(), 0.0001);
  const u2 = rand();
  const result = sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return isNaN(result) || !isFinite(result) ? 0 : result;
}

export interface MilkyWayParams {
  barAngle: number;           // bar rotation (independent of arms)
  armAngle: number;           // spiral arm starting angle
  armStart: number;           // primary arms start distance (pc)
  secondaryStart: number;     // secondary arms start distance (pc)
  pitchPrimary: number;       // primary arm pitch angle (degrees)
  pitchSecondary: number;     // secondary arm pitch angle (degrees)
  secondaryOffset: number;    // angular offset of secondary from primary (degrees)
  armWidth: number;           // base arm width (pc)
  armTaper: number;           // how much arms bulge in the middle (0-3)
  discScatter: number;        // how much the disc particles scatter from spiral (0-10)
  discWidth: number;          // disc arm width multiplier vs main arms (1-5)
  discScale: number;          // disc radius multiplier (0.5-2)
  discRotation: number;       // disc rotation offset in degrees
  discDensity: number;        // disc particle multiplier (0.5-3)
  barLength: number;          // bar half-length (pc)
  barWidth: number;           // bar half-width (pc)
  bulgeSize: number;          // bulge radius (pc)
  bulgeDensity: number;       // bulge particle multiplier (0.5-3)
  bulgeFlattening: number;    // 0 = fully spherical, 1 = very flat (0-1)
  hiiCount: number;           // number of H-II nebulae (50-2000)
  hiiSize: number;            // H-II nebula size multiplier (0.1-3)
  hiiBrightness: number;      // H-II brightness multiplier (0.1-3)
  dustCount: number;          // number of dust clouds (100-3000)
  dustSize: number;           // dust cloud size multiplier (0.1-3)
  dustOpacity: number;        // dust opacity multiplier (0.1-3)
  fogCount: number;           // arm fog particle count (1000-15000)
  fogSize: number;            // arm fog particle size multiplier (0.1-5)
  fogBrightness: number;      // arm fog brightness multiplier (0.1-5)
}

export const defaultParams: MilkyWayParams = {
  barAngle: 0,
  armAngle: 34,
  armStart: 4200,
  secondaryStart: 4300,
  pitchPrimary: 15,
  pitchSecondary: 13.5,
  secondaryOffset: 82,
  armWidth: 1550,
  armTaper: 2.3,
  discScatter: 3.5,
  discWidth: 3.4,
  discDensity: 1.4,
  discScale: 1.45,
  discRotation: -57,
  barLength: 4700,
  barWidth: 1200,
  bulgeSize: 1200,
  bulgeDensity: 1,
  bulgeFlattening: 0.2,
  hiiCount: 1000,
  hiiSize: 2,
  hiiBrightness: 2,
  dustCount: 1500,
  dustSize: 1,
  dustOpacity: 0.7,
  fogCount: 8000,
  fogSize: 2,
  fogBrightness: 1.5,
};

interface MilkyWayProps {
  sunPosition: [number, number, number];
  scale?: number;
  params?: MilkyWayParams;
}

export default function MilkyWay({ sunPosition, scale = 1, params = defaultParams }: MilkyWayProps) {
  const starData = useMemo(() => {
    const rand = seededRandom(42);
    const positions: number[] = [];
    const colorArray: number[] = [];
    const sizes: number[] = [];

    const BAR_ANGLE_RAD = params.barAngle * (Math.PI / 180);
    const ARM_ANGLE_RAD = params.armAngle * (Math.PI / 180);
    const SEC_OFFSET_RAD = params.secondaryOffset * (Math.PI / 180);
    const PITCH_PRIMARY_RAD = params.pitchPrimary * (Math.PI / 180);
    const PITCH_SECONDARY_RAD = params.pitchSecondary * (Math.PI / 180);
    const ARM_OFFSETS = [
      ARM_ANGLE_RAD,                       // primary
      ARM_ANGLE_RAD + SEC_OFFSET_RAD,      // secondary
      ARM_ANGLE_RAD + Math.PI,             // primary
      ARM_ANGLE_RAD + Math.PI + SEC_OFFSET_RAD, // secondary
    ];

    const addParticle = (gx: number, gy: number, gz: number, r: number, g: number, b: number, sz_override?: number): void => {
      if (!isFinite(gx) || !isFinite(gy) || !isFinite(gz)) return;
      const sx = sunPosition[0] + (gx - SUN_DISTANCE) * scale;
      const sy = sunPosition[1] + gz * scale;
      const sz = sunPosition[2] + gy * scale;
      positions.push(sx, sy, sz);
      colorArray.push(r, g, b);
      sizes.push(sz_override ?? (80 + rand() * 40));
    };

    // 1. Spiral arms - logarithmic spirals starting from arm start radius
    for (let armIdx = 0; armIdx < 4; armIdx++) {
      const armOffset = ARM_OFFSETS[armIdx];
      const strength = ARM_STRENGTHS[armIdx];
      const count = Math.floor(PARTICLES_PER_ARM * strength);

      // Arms 0 and 2 connect directly to bar tips, 1 and 3 are secondary
      const isBarArm = armIdx === 0 || armIdx === 2;
      const isSecondary = armIdx === 1 || armIdx === 3;
      const startR = isSecondary ? params.secondaryStart : params.armStart;
      const endR = isSecondary ? DISC_RADIUS * 0.8 : DISC_RADIUS;

      for (let i = 0; i < count; i++) {
        const t = rand();
        const r = startR + t * (endR - startR);

        // Thin out density toward arm tips
        if (isSecondary && t > 0.6 && rand() > (1 - t) * 2.5) continue;
        if (isBarArm && t > 0.75 && rand() > (1 - t) * 4) continue;

        // Logarithmic spiral: theta = ln(r / r0) / tan(pitch) + offset
        const pitch = isBarArm ? PITCH_PRIMARY_RAD : PITCH_SECONDARY_RAD;
        const theta = Math.log(r / startR) / Math.tan(pitch) + armOffset;

        // Perpendicular spread profile
        let taper;
        if (isBarArm) {
          const barBlend = Math.exp(-(t * t) / (2 * 0.02)) * 0.8;
          taper = Math.exp(-((t - 0.35) * (t - 0.35)) / (2 * 0.08)) * params.armTaper + 0.3 + barBlend;
        } else {
          const branchBlend = Math.exp(-(t * t) / (2 * 0.03)) * 1.0;
          taper = Math.exp(-((t - 0.3) * (t - 0.3)) / (2 * 0.12)) * (params.armTaper * 0.55) + 0.25 + branchBlend;
        }
        const spreadSigma = params.armWidth * 0.55 * taper;
        const perpSpread = gaussRandom(rand, spreadSigma);
        const spreadAngle = theta + perpSpread / r;

        const gx = r * Math.cos(spreadAngle);
        const gy = r * Math.sin(spreadAngle);

        // Vertical spread - thinner near centre, thicker at edges
        const heightSigma = DISC_HEIGHT * (0.5 + 0.5 * t);
        const gz = gaussRandom(rand, heightSigma);

        // Color: blue-white in arms, transitioning to warm near bar junction
        // All arms fade out toward their tips (secondary faster)
        const fadeFactor = isSecondary
          ? Math.min(1, (1 - t) * 2.5)
          : Math.min(1, (1 - t) * 3);
        const brightness = (0.4 + rand() * 0.5) * (0.6 + taper * 0.4) * fadeFactor;
        if (isBarArm && t < 0.15) {
          // Warm transition zone near bar
          const warmth = (1 - t / 0.15) * 0.5;
          addParticle(gx, gy, gz, brightness * (0.85 + warmth * 0.15), brightness * (0.8 + warmth * 0.05), brightness * (0.55 + (1 - warmth) * 0.45));
        } else {
          const blueTint = 0.08 + rand() * 0.12;
          addParticle(gx, gy, gz, brightness * 0.8, brightness * 0.85, brightness + blueTint);
        }
      }
    }

    // 2. Central bulge - older, redder population
    const bulgeCount = Math.floor(BULGE_PARTICLES * params.bulgeDensity);
    const zScale = 1 - params.bulgeFlattening; // 1 = sphere, 0 = flat disc
    for (let i = 0; i < bulgeCount; i++) {
      const r = Math.abs(gaussRandom(rand, params.bulgeSize));
      const theta = rand() * 2 * Math.PI;
      const phi = Math.asin(2 * rand() - 1);

      const gx = r * Math.cos(phi) * Math.cos(theta);
      const gy = r * Math.cos(phi) * Math.sin(theta);
      const gz = r * Math.sin(phi) * zScale;

      const brightness = 0.6 + rand() * 0.4;
      addParticle(gx, gy, gz, brightness, brightness * 0.8, brightness * 0.5);
    }

    // 3. Central bar
    for (let i = 0; i < BAR_PARTICLES; i++) {
      const along = gaussRandom(rand, params.barLength * 0.45);
      const across = gaussRandom(rand, params.barWidth * 0.4);
      const gz = gaussRandom(rand, 80);

      const gx = along * Math.cos(BAR_ANGLE_RAD) - across * Math.sin(BAR_ANGLE_RAD);
      const gy = along * Math.sin(BAR_ANGLE_RAD) + across * Math.cos(BAR_ANGLE_RAD);

      const brightness = 0.55 + rand() * 0.35;
      addParticle(gx, gy, gz, brightness, brightness * 0.75, brightness * 0.45);
    }

    // 4. Diffuse disc - same spiral structure as arms but much wider, dimmer, fading at edge
    const discPerArm = Math.floor((DISC_PARTICLES * params.discDensity) / 4);
    const discRotRad = params.discRotation * (Math.PI / 180);
    const discMaxR = DISC_RADIUS * params.discScale;
    for (let armIdx = 0; armIdx < 4; armIdx++) {
      const armOffset = ARM_OFFSETS[armIdx] + discRotRad;
      const pitch = armIdx % 2 === 0 ? PITCH_PRIMARY_RAD : PITCH_SECONDARY_RAD;

      for (let i = 0; i < discPerArm; i++) {
        const t = rand();
        const r = params.armStart * 0.5 + t * (discMaxR - params.armStart * 0.5);
        const rNorm = r / discMaxR;

        // Fade out toward edge
        if (rand() > (1 - rNorm * rNorm * 0.8)) continue;

        const theta = Math.log(Math.max(r, 500) / params.armStart) / Math.tan(pitch) + armOffset;
        const spreadSigma = params.discScatter * 300 * params.discWidth * (0.5 + t);
        const perpSpread = gaussRandom(rand, spreadSigma);
        const spreadAngle = theta + perpSpread / r;

        const gz = gaussRandom(rand, DISC_HEIGHT);
        const gx = r * Math.cos(spreadAngle);
        const gy = r * Math.sin(spreadAngle);

        const edgeFade = Math.max(0.2, 1 - rNorm * 0.9);
        const brightness = (0.2 + rand() * 0.25) * edgeFade;
        addParticle(gx, gy, gz, brightness, brightness, brightness * 1.05);
      }
    }

    return { positions, colors: colorArray, sizes, count: positions.length / 3 };
  }, [sunPosition, scale, params]);

  // Build points geometry with custom shader for soft glow
  const { starGeo, starMaterial } = useMemo(() => {
    const { positions, colors, sizes, count } = starData;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvp = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 300.0 / -mvp.z;
          gl_PointSize = clamp(gl_PointSize, 1.0, 8.0);
          gl_Position = projectionMatrix * mvp;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
          if (d > 1.0) discard;
          // Bright core with soft halo
          float core = smoothstep(1.0, 0.15, d);
          gl_FragColor = vec4(vColor, core * 0.75);
        }
      `,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
    });

    return { starGeo: geo, starMaterial: mat };
  }, [starData]);

  // H-II nebulae (pink/red emission) placed along spiral arms
  const hiiData = useMemo(() => {
    const hiiRand = seededRandom(54321);
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    const BAR_ANGLE_RAD = params.barAngle * (Math.PI / 180);
    const ARM_ANGLE_RAD = params.armAngle * (Math.PI / 180);
    const PITCH_PRIMARY_RAD = params.pitchPrimary * (Math.PI / 180);
    const ARM_OFFSETS_HII = [
      ARM_ANGLE_RAD,
      ARM_ANGLE_RAD + Math.PI,
    ];

    for (let i = 0; i < params.hiiCount; i++) {
      const armIdx = Math.floor(hiiRand() * 2);
      const armOffset = ARM_OFFSETS_HII[armIdx];
      const t = 0.05 + hiiRand() * 0.85;
      const r = params.armStart + t * (DISC_RADIUS * 0.85 - params.armStart);
      const theta = Math.log(r / params.armStart) / Math.tan(PITCH_PRIMARY_RAD) + armOffset;
      // Small offset from arm centre
      const perpOffset = gaussRandom(hiiRand, ARM_WIDTH * 0.2) / r;
      const angle = theta + perpOffset;

      const gx = r * Math.cos(angle);
      const gy = r * Math.sin(angle);
      const gz = gaussRandom(hiiRand, 40);

      const sx = sunPosition[0] + (gx - SUN_DISTANCE) * scale;
      const sy = sunPosition[1] + gz * scale;
      const sz = sunPosition[2] + gy * scale;

      positions.push(sx, sy, sz);
      // Pink-red H-alpha emission with variation
      const brightness = (0.08 + hiiRand() * 0.15) * params.hiiBrightness;
      colors.push(brightness, brightness * 0.15 + hiiRand() * 0.1, brightness * 0.2 + hiiRand() * 0.15);
      sizes.push((200 + hiiRand() * 500) * scale * params.hiiSize);
    }

    return { positions, colors, sizes };
  }, [sunPosition, scale, params]);

  // Dark dust lanes along inner edges of spiral arms
  const dustData = useMemo(() => {
    const dustRand = seededRandom(99999);
    const positions: number[] = [];
    const sizes: number[] = [];
    const BAR_ANGLE_RAD = params.barAngle * (Math.PI / 180);
    const ARM_ANGLE_RAD = params.armAngle * (Math.PI / 180);
    const PITCH_PRIMARY_RAD = params.pitchPrimary * (Math.PI / 180);
    const ARM_OFFSETS_DUST = [
      ARM_ANGLE_RAD,
      ARM_ANGLE_RAD + Math.PI,
    ];

    for (let i = 0; i < params.dustCount; i++) {
      const armIdx = Math.floor(dustRand() * 2);
      const armOffset = ARM_OFFSETS_DUST[armIdx];
      const t = 0.08 + dustRand() * 0.7;
      const r = params.armStart + t * (DISC_RADIUS * 0.7 - params.armStart);
      const theta = Math.log(r / params.armStart) / Math.tan(PITCH_PRIMARY_RAD) + armOffset;
      // Offset toward the inner/leading edge of the arm
      const dustOffset = -ARM_WIDTH * 0.15 / r;
      const angle = theta + dustOffset + gaussRandom(dustRand, ARM_WIDTH * 0.25) / r;

      const gx = r * Math.cos(angle);
      const gy = r * Math.sin(angle);
      const gz = gaussRandom(dustRand, 50);

      const sx = sunPosition[0] + (gx - SUN_DISTANCE) * scale;
      const sy = sunPosition[1] + gz * scale;
      const sz = sunPosition[2] + gy * scale;

      positions.push(sx, sy, sz);
      sizes.push((300 + dustRand() * 700) * scale * params.dustSize);
    }

    return { positions, sizes };
  }, [sunPosition, scale, params]);

  // Arm fog — large dim additive particles that accumulate into the milky band
  const fogData = useMemo(() => {
    const fogRand = seededRandom(77777);
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    const ARM_ANGLE_RAD = params.armAngle * (Math.PI / 180);
    const SEC_OFFSET_RAD = params.secondaryOffset * (Math.PI / 180);
    const PITCH_PRIMARY_RAD = params.pitchPrimary * (Math.PI / 180);
    const PITCH_SECONDARY_RAD = params.pitchSecondary * (Math.PI / 180);
    const FOG_ARM_OFFSETS = [
      ARM_ANGLE_RAD,
      ARM_ANGLE_RAD + SEC_OFFSET_RAD,
      ARM_ANGLE_RAD + Math.PI,
      ARM_ANGLE_RAD + Math.PI + SEC_OFFSET_RAD,
    ];

    const perArm = Math.floor(params.fogCount / 4);

    for (let armIdx = 0; armIdx < 4; armIdx++) {
      const armOffset = FOG_ARM_OFFSETS[armIdx];
      const isPrimary = armIdx === 0 || armIdx === 2;
      const pitch = isPrimary ? PITCH_PRIMARY_RAD : PITCH_SECONDARY_RAD;
      const startR = isPrimary ? params.armStart : params.secondaryStart;
      const endR = isPrimary ? DISC_RADIUS : DISC_RADIUS * 0.8;

      for (let i = 0; i < perArm; i++) {
        const t = fogRand();
        const r = startR + t * (endR - startR);

        // Thin out tips
        if (t > 0.7 && fogRand() > (1 - t) * 3) continue;

        const theta = Math.log(r / startR) / Math.tan(pitch) + armOffset;
        // Spread perpendicular to arm — wider than star particles
        const spreadSigma = params.armWidth * 0.7;
        const perpSpread = gaussRandom(fogRand, spreadSigma);
        const spreadAngle = theta + perpSpread / r;

        const gx = r * Math.cos(spreadAngle);
        const gy = r * Math.sin(spreadAngle);
        const gz = gaussRandom(fogRand, DISC_HEIGHT * 0.6);

        const sx = sunPosition[0] + (gx - SUN_DISTANCE) * scale;
        const sy = sunPosition[1] + gz * scale;
        const sz = sunPosition[2] + gy * scale;

        positions.push(sx, sy, sz);

        // Warm white — slight yellow tint, dimmer toward edges
        const edgeFade = Math.max(0.3, 1 - t * 0.7);
        const b = (0.03 + fogRand() * 0.04) * edgeFade * params.fogBrightness;
        colors.push(b, b * 0.95, b * 0.85);
        sizes.push((500 + fogRand() * 1500) * scale * params.fogSize);
      }
    }

    // Extra fog for bulge/bar region
    const bulgeCount = Math.floor(params.fogCount * 0.15);
    for (let i = 0; i < bulgeCount; i++) {
      const r = Math.abs(gaussRandom(fogRand, params.bulgeSize * 0.8));
      const theta = fogRand() * 2 * Math.PI;
      const gx = r * Math.cos(theta);
      const gy = r * Math.sin(theta);
      const gz = gaussRandom(fogRand, 60);

      const sx = sunPosition[0] + (gx - SUN_DISTANCE) * scale;
      const sy = sunPosition[1] + gz * scale;
      const sz = sunPosition[2] + gy * scale;

      positions.push(sx, sy, sz);
      const b = (0.04 + fogRand() * 0.05) * params.fogBrightness;
      colors.push(b, b * 0.9, b * 0.7);
      sizes.push((400 + fogRand() * 1000) * scale * params.fogSize);
    }

    return { positions, colors, sizes };
  }, [sunPosition, scale, params]);

  // Create sprite textures using canvas (client-side only)
  const { hiiTexture, dustTexture } = useMemo(() => {
    if (typeof document === 'undefined') return { hiiTexture: null, dustTexture: null };

    // H-II glow texture (white radial gradient)
    const hiiCanvas = document.createElement('canvas');
    hiiCanvas.width = 128;
    hiiCanvas.height = 128;
    const hiiCtx = hiiCanvas.getContext('2d')!;
    const hiiGrad = hiiCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    hiiGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
    hiiGrad.addColorStop(0.3, 'rgba(255,255,255,0.4)');
    hiiGrad.addColorStop(0.7, 'rgba(255,255,255,0.1)');
    hiiGrad.addColorStop(1, 'rgba(255,255,255,0)');
    hiiCtx.fillStyle = hiiGrad;
    hiiCtx.fillRect(0, 0, 128, 128);
    const hiiTex = new THREE.CanvasTexture(hiiCanvas);

    // Dust texture (dark radial gradient)
    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = 128;
    dustCanvas.height = 128;
    const dustCtx = dustCanvas.getContext('2d')!;
    const dustGrad = dustCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    dustGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
    dustGrad.addColorStop(0.4, 'rgba(0,0,0,0.3)');
    dustGrad.addColorStop(0.8, 'rgba(0,0,0,0.05)');
    dustGrad.addColorStop(1, 'rgba(0,0,0,0)');
    dustCtx.fillStyle = dustGrad;
    dustCtx.fillRect(0, 0, 128, 128);
    const dustTex = new THREE.CanvasTexture(dustCanvas);

    return { hiiTexture: hiiTex, dustTexture: dustTex };
  }, []);

  return (
    <group>
      {/* Star particles with soft glow shader */}
      <points geometry={starGeo} material={starMaterial} renderOrder={0} />

      {/* H-II emission nebulae — rendered as points with soft circle shader */}
      {hiiData.positions.length > 0 && (
        <points key={`hii-${params.hiiCount}-${params.hiiSize}-${params.hiiBrightness}`} renderOrder={1}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" array={new Float32Array(hiiData.positions)} count={hiiData.positions.length / 3} itemSize={3} />
            <bufferAttribute attach="attributes-color" array={new Float32Array(hiiData.colors)} count={hiiData.colors.length / 3} itemSize={3} />
            <bufferAttribute attach="attributes-size" array={new Float32Array(hiiData.sizes)} count={hiiData.sizes.length} itemSize={1} />
          </bufferGeometry>
          <shaderMaterial
            vertexShader={`
              attribute float size;
              varying vec3 vColor;
              void main() {
                vColor = color;
                vec4 mvp = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = clamp(size * 300.0 / -mvp.z, 1.0, 128.0);
                gl_Position = projectionMatrix * mvp;
              }
            `}
            fragmentShader={`
              varying vec3 vColor;
              void main() {
                float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
                if (d > 1.0) discard;
                float alpha = pow(1.0 - d, 2.5) * 0.2;
                gl_FragColor = vec4(vColor, alpha);
              }
            `}
            transparent={true}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            vertexColors={true}
          />
        </points>
      )}

      {/* Arm fog — additive accumulation for milky white band */}
      {fogData.positions.length > 0 && (
        <points key={`fog-${params.fogCount}-${params.fogSize}-${params.fogBrightness}`} renderOrder={2}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" array={new Float32Array(fogData.positions)} count={fogData.positions.length / 3} itemSize={3} />
            <bufferAttribute attach="attributes-color" array={new Float32Array(fogData.colors)} count={fogData.colors.length / 3} itemSize={3} />
            <bufferAttribute attach="attributes-size" array={new Float32Array(fogData.sizes)} count={fogData.sizes.length} itemSize={1} />
          </bufferGeometry>
          <shaderMaterial
            vertexShader={`
              attribute float size;
              varying vec3 vColor;
              void main() {
                vColor = color;
                vec4 mvp = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = clamp(size * 300.0 / -mvp.z, 1.0, 256.0);
                gl_Position = projectionMatrix * mvp;
              }
            `}
            fragmentShader={`
              varying vec3 vColor;
              void main() {
                float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
                if (d > 1.0) discard;
                float alpha = exp(-d * d * 2.0) * 0.12;
                gl_FragColor = vec4(vColor, alpha);
              }
            `}
            transparent={true}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            vertexColors={true}
          />
        </points>
      )}

      {/* Dark dust lanes — rendered as points with soft dark circle shader */}
      {dustData.positions.length > 0 && (
        <points key={`dust-${params.dustCount}-${params.dustSize}-${params.dustOpacity}`} renderOrder={3}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" array={new Float32Array(dustData.positions)} count={dustData.positions.length / 3} itemSize={3} />
            <bufferAttribute attach="attributes-size" array={new Float32Array(dustData.sizes)} count={dustData.sizes.length} itemSize={1} />
          </bufferGeometry>
          <shaderMaterial
            uniforms={{ uOpacity: { value: params.dustOpacity } }}
            vertexShader={`
              attribute float size;
              void main() {
                vec4 mvp = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = clamp(size * 300.0 / -mvp.z, 1.0, 128.0);
                gl_Position = projectionMatrix * mvp;
              }
            `}
            fragmentShader={`
              uniform float uOpacity;
              void main() {
                float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
                if (d > 1.0) discard;
                float alpha = pow(1.0 - d, 1.5) * 0.4 * uOpacity;
                gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
              }
            `}
            transparent={true}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
}

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
const BAR_ANGLE = 25 * (Math.PI / 180); // bar tilt from Sun-centre line (observed)
const SPIRAL_PITCH_PRIMARY = 15 * (Math.PI / 180); // primary arms - slightly wider winding
const SPIRAL_PITCH_SECONDARY = 13 * (Math.PI / 180); // secondary arms - slightly tighter
const ARM_WIDTH = 1400; // pc - wider for fuzzier appearance
const ARM_START_RADIUS = BAR_HALF_LENGTH; // arms start at bar ends

// 4 arms evenly spaced at 90° intervals
// Primaries (0, 2) connect to bar tips, secondaries (1, 3) start further out
const ARM_OFFSETS = [
  BAR_ANGLE,                              // primary: Scutum-Centaurus
  BAR_ANGLE + Math.PI / 2,               // secondary: Sagittarius-Carina
  BAR_ANGLE + Math.PI,                    // primary: Perseus
  BAR_ANGLE + (3 * Math.PI) / 2,         // secondary: Norma/Outer
];
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

interface MilkyWayProps {
  sunPosition: [number, number, number];
  scale?: number;
}

export default function MilkyWay({ sunPosition, scale = 1 }: MilkyWayProps) {
  const geometry = useMemo(() => {
    const rand = seededRandom(42);
    const positions: number[] = [];
    const colorArray: number[] = [];

    const addParticle = (gx: number, gy: number, gz: number, r: number, g: number, b: number): void => {
      if (!isFinite(gx) || !isFinite(gy) || !isFinite(gz)) return;
      // Galactic coords: Sun at (SUN_DISTANCE, 0, 0)
      // Scene coords: Sun at sunPosition
      const sx = sunPosition[0] + (gx - SUN_DISTANCE) * scale;
      const sy = sunPosition[1] + gz * scale;
      const sz = sunPosition[2] + gy * scale;
      positions.push(sx, sy, sz);
      colorArray.push(r, g, b);
    };

    // 1. Spiral arms - logarithmic spirals starting from arm start radius
    for (let armIdx = 0; armIdx < 4; armIdx++) {
      const armOffset = ARM_OFFSETS[armIdx];
      const strength = ARM_STRENGTHS[armIdx];
      const count = Math.floor(PARTICLES_PER_ARM * strength);

      // Arms 0 and 2 connect directly to bar tips, 1 and 3 are secondary
      const isBarArm = armIdx === 0 || armIdx === 2;
      const isSecondary = armIdx === 1 || armIdx === 3;
      const startR = isSecondary ? SECONDARY_START_RADIUS : ARM_START_RADIUS;
      const endR = isSecondary ? DISC_RADIUS * 0.8 : DISC_RADIUS;

      for (let i = 0; i < count; i++) {
        const t = rand();
        const r = startR + t * (endR - startR);

        // Thin out density toward arm tips
        if (isSecondary && t > 0.6 && rand() > (1 - t) * 2.5) continue;
        if (isBarArm && t > 0.75 && rand() > (1 - t) * 4) continue;

        // Logarithmic spiral: theta = ln(r / r0) / tan(pitch) + offset
        const pitch = isBarArm ? SPIRAL_PITCH_PRIMARY : SPIRAL_PITCH_SECONDARY;
        const theta = Math.log(r / startR) / Math.tan(pitch) + armOffset;

        // Perpendicular spread profile
        let taper;
        if (isBarArm) {
          // Strong mid-arm bulge peaking around t=0.35, tapers at both ends
          const barBlend = Math.exp(-(t * t) / (2 * 0.02)) * 0.8;
          taper = Math.exp(-((t - 0.35) * (t - 0.35)) / (2 * 0.08)) * 1.8 + 0.3 + barBlend;
        } else {
          // Secondary arms: extra wide at inner end to blend into parent arm, then taper
          const branchBlend = Math.exp(-(t * t) / (2 * 0.03)) * 1.0;
          taper = Math.exp(-((t - 0.3) * (t - 0.3)) / (2 * 0.12)) * 1.0 + 0.25 + branchBlend;
        }
        const spreadSigma = ARM_WIDTH * 0.55 * taper;
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
        const brightness = (0.2 + rand() * 0.4) * (0.6 + taper * 0.4) * fadeFactor;
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
    for (let i = 0; i < BULGE_PARTICLES; i++) {
      const r = Math.abs(gaussRandom(rand, 1000));
      const theta = rand() * 2 * Math.PI;
      const phi = Math.asin(2 * rand() - 1);

      const gx = r * Math.cos(phi) * Math.cos(theta);
      const gy = r * Math.cos(phi) * Math.sin(theta);
      const gz = r * Math.sin(phi) * 0.5; // flattened

      const brightness = 0.4 + rand() * 0.45;
      addParticle(gx, gy, gz, brightness, brightness * 0.8, brightness * 0.5);
    }

    // 3. Central bar
    for (let i = 0; i < BAR_PARTICLES; i++) {
      const along = gaussRandom(rand, BAR_HALF_LENGTH * 0.45);
      const across = gaussRandom(rand, BAR_HALF_WIDTH * 0.4);
      const gz = gaussRandom(rand, 80);

      const gx = along * Math.cos(BAR_ANGLE) - across * Math.sin(BAR_ANGLE);
      const gy = along * Math.sin(BAR_ANGLE) + across * Math.cos(BAR_ANGLE);

      const brightness = 0.35 + rand() * 0.35;
      addParticle(gx, gy, gz, brightness, brightness * 0.75, brightness * 0.45);
    }

    // 4. Diffuse disc - sparse background population
    for (let i = 0; i < DISC_PARTICLES; i++) {
      const r = Math.sqrt(rand()) * DISC_RADIUS;
      const theta = rand() * 2 * Math.PI;
      const gz = gaussRandom(rand, DISC_HEIGHT * 0.8);

      const gx = r * Math.cos(theta);
      const gy = r * Math.sin(theta);

      const brightness = 0.1 + rand() * 0.15;
      addParticle(gx, gy, gz, brightness, brightness, brightness * 1.05);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colorArray, 3));

    return geo;
  }, [sunPosition, scale]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.8}
        sizeAttenuation={false}
        vertexColors={true}
        transparent={true}
        opacity={0.4}
        depthWrite={false}
      />
    </points>
  );
}

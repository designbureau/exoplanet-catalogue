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
};

interface MilkyWayProps {
  sunPosition: [number, number, number];
  scale?: number;
  params?: MilkyWayParams;
}

export default function MilkyWay({ sunPosition, scale = 1, params = defaultParams }: MilkyWayProps) {
  const geometry = useMemo(() => {
    const rand = seededRandom(42);
    const positions: number[] = [];
    const colorArray: number[] = [];

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
      const r = Math.abs(gaussRandom(rand, params.bulgeSize));
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
      const along = gaussRandom(rand, params.barLength * 0.45);
      const across = gaussRandom(rand, params.barWidth * 0.4);
      const gz = gaussRandom(rand, 80);

      const gx = along * Math.cos(BAR_ANGLE_RAD) - across * Math.sin(BAR_ANGLE_RAD);
      const gy = along * Math.sin(BAR_ANGLE_RAD) + across * Math.cos(BAR_ANGLE_RAD);

      const brightness = 0.35 + rand() * 0.35;
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
        const brightness = (0.08 + rand() * 0.12) * edgeFade;
        addParticle(gx, gy, gz, brightness, brightness, brightness * 1.05);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colorArray, 3));

    return geo;
  }, [sunPosition, scale, params]);

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

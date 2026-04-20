/**
 * ShaderPlanet — renders a catalogue planet thumbnail using the real GLSL
 * fragment shader from planetShader.ts, via an off-screen WebGLRenderer.
 *
 * Drop-in visual replacement for <PlanetCanvas> in the catalogue.
 * Shows a subtle pulsing placeholder while the offscreen render completes,
 * then cross-fades to the shader image.
 */

import { useState, useEffect } from "react";
import { renderPlanetSnapshot } from "~/utils/planetSnapshot";
import type { PlanetType } from "~/components/PlanetCanvas";

export interface ShaderPlanetProps {
  type?: PlanetType;
  seed?: number;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function ShaderPlanet({
  type = "rocky_earthlike",
  seed = 1,
  size = 200,
  className,
  style,
}: ShaderPlanetProps) {
  const [dataURL, setDataURL] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    renderPlanetSnapshot(type, seed, size).then((url) => {
      if (!cancelled && url) setDataURL(url);
    });
    return () => { cancelled = true; };
  }, [type, seed, size]);

  if (!dataURL) {
    // Placeholder — same shape as the planet, subtle shimmer
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "radial-gradient(circle at 38% 35%, oklch(0.28 0.02 260), oklch(0.12 0.01 260))",
          flexShrink: 0,
          animation: "pulse 1.8s ease-in-out infinite",
          ...style,
        }}
      />
    );
  }

  return (
    <img
      src={dataURL}
      width={size}
      height={size}
      alt=""
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "block",
        ...style,
      }}
    />
  );
}

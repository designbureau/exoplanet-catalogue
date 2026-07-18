/**
 * ShaderPlanet — renders a catalogue planet thumbnail.
 *
 * Priority:
 *  1. Static baked PNG at /planet-thumbs/{slug}.png  (prod, post-bake)
 *  2. Runtime off-screen WebGL render via planetSnapshot (dev / unbaked)
 *  3. Pulsing circular placeholder while either is in-flight
 */

import { useState, useEffect } from "react";
import { renderPlanetSnapshot } from "~/utils/planetSnapshot";
import type { PlanetType } from "~/components/PlanetCanvas";

export interface ShaderPlanetProps {
  type?: PlanetType;
  seed?: number;
  size?: number;
  /** System slug — if provided, tries /planet-thumbs/{slug}.png first */
  slug?: string;
  className?: string;
  style?: React.CSSProperties;
}

const THUMB_BASE = "/planet-thumbs";

function staticPath(slug: string) {
  return `${THUMB_BASE}/${slug}.png`;
}

export function ShaderPlanet({
  type = "rocky_earthlike",
  seed = 1,
  size = 200,
  slug,
  className,
  style,
}: ShaderPlanetProps) {
  const [src, setSrc] = useState<string | null>(
    // Optimistic: assume baked asset exists if slug provided
    slug ? staticPath(slug) : null,
  );
  const [tried, setTried] = useState(false);

  // If no slug, or static asset 404s → fall back to runtime render
  useEffect(() => {
    if (!src && !tried) {
      setTried(true);
      renderPlanetSnapshot(type, seed, size).then((url) => {
        if (url) setSrc(url);
      });
    }
  }, [src, tried, type, seed, size]);

  const handleError = () => {
    // Static PNG missing → fall back to runtime render
    if (!tried) {
      setTried(true);
      setSrc(null); // triggers the useEffect on next render
    }
  };

  if (!src) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 35%, oklch(0.28 0.02 260), oklch(0.12 0.01 260))",
          flexShrink: 0,
          animation: "pulse 1.8s ease-in-out infinite",
          ...style,
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src={src}
        width={size}
        height={size}
        alt=""
        onError={handleError}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          display: "block",
        }}
      />
      {/* terminator: inset shadow crescent. On card hover it shifts slightly
          smaller and further to the lower-left (see .crescent-overlay in global.css). */}
      <span
        aria-hidden
        className="crescent-overlay"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          pointerEvents: "none",
          ["--cr-base" as string]: `inset ${size * 0.32}px ${size * -0.28}px ${size * 0.3}px ${size * 0.01}px rgba(0,0,0,0.98)`,
          ["--cr-hover" as string]: `inset ${size * 0.26}px ${size * -0.22}px ${size * 0.3}px ${size * 0}px rgba(0,0,0,0.72)`,
        } as React.CSSProperties}
      />
    </div>
  );
}

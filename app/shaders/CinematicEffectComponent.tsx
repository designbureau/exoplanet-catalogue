import { forwardRef, useMemo } from "react";
import { CinematicEffect } from "./CinematicEffect";

type CinematicProps = {
  temperature?: number;
  tint?: number;
  shadows?: number;
  highlights?: number;
};

export const Cinematic = forwardRef<CinematicEffect, CinematicProps>(
  ({ temperature = 0, tint = 0, shadows = 0, highlights = 0 }, ref) => {
    const effect = useMemo(() => new CinematicEffect({ temperature, tint, shadows, highlights }), []);

    useMemo(() => {
      effect.temperature = temperature;
      effect.tint = tint;
      effect.shadows = shadows;
      effect.highlights = highlights;
    }, [effect, temperature, tint, shadows, highlights]);

    return <primitive ref={ref} object={effect} dispose={null} />;
  }
);

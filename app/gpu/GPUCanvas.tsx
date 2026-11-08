import { Canvas, extend, type CanvasProps } from "@react-three/fiber";
import * as THREE from "three/webgpu";

// Register every three/webgpu export (node materials, sprite/points node
// materials, …) so they are usable as JSX elements and `args`-free classes.
extend(THREE as unknown as Record<string, new (...args: never[]) => unknown>);
// Dev only: attach JS stack traces to TSL build errors (otherwise "Invalid generated code" has no origin)
if (import.meta.env.DEV) (THREE.Node as unknown as { captureStackTrace: boolean }).captureStackTrace = true;

// R3F 9 exposes THREE.Line as <threeLine> (plain <line> clashes with the SVG element).
extend({ ThreeLine: THREE.Line } as unknown as Record<string, new (...args: never[]) => unknown>);

export interface GPURendererOptions {
  alpha?: boolean;
  antialias?: boolean;
  /**
   * Output pipeline. "display" keeps the three.js defaults (ACES tone mapping
   * + sRGB encoding) — right for scenes lit with standard materials.
   * "raw" writes shader values straight to the canvas (no tone mapping, no
   * sRGB encode), which is what the previous hand-written GLSL did and what
   * additive Milky-Way accumulation relies on.
   */
  output?: "display" | "raw";
}

type GPUCanvasProps = Omit<CanvasProps, "gl"> & { gpu?: GPURendererOptions };

/**
 * R3F <Canvas> backed by three's WebGPURenderer (WebGPU, with automatic
 * WebGL2 fallback). All materials rendered inside must be node materials
 * (TSL) — classic ShaderMaterial is not supported by this renderer.
 */
export function GPUCanvas({ gpu = {}, ...props }: GPUCanvasProps) {
  const { alpha = false, antialias = true, output = "display" } = gpu;
  return (
    <Canvas
      // R3F (re)applies tone mapping / output colour space from these props
      // after the renderer is created, so "raw" has to be expressed here.
      flat={output === "raw"}
      linear={output === "raw"}
      {...props}
      onCreated={(state) => {
        // Dev only: handy for poking at the renderer from the console
        if (import.meta.env.DEV) (window as unknown as { __r3f?: unknown }).__r3f = state;
        props.onCreated?.(state);
      }}
      gl={async (defaults) => {
        const renderer = new THREE.WebGPURenderer({
          canvas: defaults.canvas as HTMLCanvasElement,
          alpha,
          antialias,
          powerPreference: "high-performance",
        });
        await renderer.init();
        return renderer as unknown as never;
      }}
    />
  );
}

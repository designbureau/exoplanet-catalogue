# Shaders (TSL / WebGPU)

Everything on the GPU is written in **TSL** (three.js Shading Language) and
rendered by three's `WebGPURenderer` — WebGPU where available, automatic WebGL2
fallback otherwise. Classic `ShaderMaterial`/GLSL strings no longer work here.

## Renderer setup — `app/gpu/`

| File | Purpose |
| --- | --- |
| `GPUCanvas.tsx` | R3F `<Canvas>` backed by `WebGPURenderer`. `gpu={{ output: "raw" }}` writes shader values straight to the canvas (no tone mapping / sRGB) — what the old hand-written GLSL did, and what the galaxy's additive blending and the thumbnails rely on. The default `"display"` keeps three's ACES + sRGB; the system view uses `flat` + `PostFX` instead. |
| `PostFX.tsx` | Post-processing on three's `RenderPipeline` (SMAA, DoF, tone mapping, grade, hue/sat, brightness/contrast, chromatic aberration, vignette, grain). Replaced `@react-three/postprocessing`. Slider values only touch uniforms; toggles rebuild the pipeline. |
| `pointSprites.ts` | WebGPU has no `gl_PointSize` (points are always 1px), so sized point clouds (star map, Milky Way) are instanced camera-facing quads with the pixel size computed in the vertex stage. |
| `rawColor.ts` | Display-referred colours for built-in materials on `"raw"` canvases. |

## Writing TSL

Import TSL functions from `~/shaders/tsl/nodes`, not `three/tsl`: it re-exports
the same functions loosely typed (`@types/three`'s TSL typings reject a lot of
valid GLSL-style code, e.g. swizzles on variables).

Materials keep the old `material.uniforms.name.value = …` API: `uniforms` maps
to live TSL `uniform()` nodes (they hold `Vector3`/`Color` by reference, so
`.value.copy(v)` still works). See `toUniformNodes` in `planetShader.ts`.

## `app/shaders/generated/`

The planet, cloud, ring and scattering **fragment** logic (about 4,000 lines of
GLSL) was ported mechanically with three's GLSL→TSL transpiler
(`examples/jsm/transpiler`) and then adapted. These files are now the source of
truth — edit them by hand. Each exports `build(TSL, uniforms, varyings, lib)`;
`noiseLib.ts` holds the shared Perlin/FBM/lighting helpers.

The vertex stages (flat varyings, terrestrial displacement) are hand-written
in `planetShader.ts`; halo / orbit trail / fallback atmosphere / habitable-zone
materials are in `planetEffects.ts`.

### Rules for editing generated code (all learned the hard way)

1. **A `Fn` with a layout (`{ x: 'vec3', return: 'float' }`) becomes a real WGSL
   function, emitted once per `Fn` instance with one shader stage's uniform
   member names.** If it reads a *uniform* and is used from both the vertex and
   the fragment stage, the other stage gets the wrong uniform indices
   (`cannot index into expression of type 'f32'`). So functions that read
   uniforms are **inline (no layout)**; pure maths helpers keep their layout.
2. **Early `return` inside `If`/`Else` only works in a layout function.** In an
   inline `Fn` it silently yields nothing (`vec3(, , )` in the WGSL). Write
   `const ret = float(0).toVar(); If(…, () => ret.assign(…)).Else(…); return ret;`.
3. **`fragMain` must stay inline** — WGSL helper functions cannot read stage
   varyings (`vPosition`, `vNormal`, …); pass them as arguments instead.
4. GLSL locals have value semantics: if you mutate a local that aliases another
   node (`const p = vPosition; p.y.assign(…)`), make it `.toVar()`.
5. Avoid `property('float')` (uninitialised declarations are scoped to wherever
   they are first built); use `float(0).toVar()`.
6. `smoothstep(a, b, x)` with `a >= b` is undefined in WGSL — write
   `1 - smoothstep(b, a, x)`.

### Debugging

In dev, `GPUCanvas` exposes the R3F state as `window.__r3f` and enables node
stack traces. From the console you can build a material and call
`await __r3f.gl.debug.getShaderAsync(scene, camera, mesh)` to read the generated
WGSL (TSL logs build errors but still emits code, so the offending expression
is usually visible — e.g. an empty `vec3( , , )`).

## Thumbnails

`app/utils/planetSnapshot.ts` renders into an RGBA8 render target on a shared
`WebGPURenderer`, reads the pixels back (`readRenderTargetPixelsAsync`), applies
the thumbnail gamma lift, and returns a PNG. Renders are queued one at a time
(the render target is global renderer state). `scripts/bake-planets.mjs` runs in
headless Chromium, where three falls back to its WebGL2 backend.

## Known gaps

- `app/components/LavaFlares.jsx` (parked, not mounted — see ROADMAP.md) and the
  legacy code in `app/components/old/` still use `ShaderMaterial` GLSL and need
  porting before they can be re-enabled.
- The DoF GUI sliders are scaled by 1000 into world units (three's DoF takes
  world units; the old effect took a fraction of the near–far range).

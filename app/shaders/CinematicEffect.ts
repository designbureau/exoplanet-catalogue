import { Uniform } from "three";
import { Effect } from "postprocessing";

const fragmentShader = `
  uniform float uTemperature;
  uniform float uTint;
  uniform float uShadows;
  uniform float uHighlights;

  // Temperature shift: positive = warm (orange), negative = cool (blue)
  vec3 applyTemperature(vec3 color, float temp) {
    color.r += temp * 0.1;
    color.b -= temp * 0.1;
    return color;
  }

  // Tint shift: positive = green, negative = magenta
  vec3 applyTint(vec3 color, float tint) {
    color.g += tint * 0.1;
    return color;
  }

  // Shadows/highlights: lift shadows or compress highlights
  vec3 applyShadowsHighlights(vec3 color, float shadows, float highlights) {
    float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float shadowMask = 1.0 - smoothstep(0.0, 0.5, lum);
    color += shadows * shadowMask * 0.15;
    float highlightMask = smoothstep(0.5, 1.0, lum);
    color = mix(color, color * (1.0 - highlights * 0.3), highlightMask);
    return color;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 color = inputColor.rgb;
    color = applyTemperature(color, uTemperature);
    color = applyTint(color, uTint);
    color = applyShadowsHighlights(color, uShadows, uHighlights);
    outputColor = vec4(max(color, 0.0), inputColor.a);
  }
`;

export class CinematicEffect extends Effect {
  constructor({
    temperature = 0.0,
    tint = 0.0,
    shadows = 0.0,
    highlights = 0.0,
  } = {}) {
    super("CinematicEffect", fragmentShader, {
      uniforms: new Map([
        ["uTemperature", new Uniform(temperature)],
        ["uTint", new Uniform(tint)],
        ["uShadows", new Uniform(shadows)],
        ["uHighlights", new Uniform(highlights)],
      ]),
    });
  }

  set temperature(value: number) { (this.uniforms.get("uTemperature") as Uniform).value = value; }
  set tint(value: number) { (this.uniforms.get("uTint") as Uniform).value = value; }
  set shadows(value: number) { (this.uniforms.get("uShadows") as Uniform).value = value; }
  set highlights(value: number) { (this.uniforms.get("uHighlights") as Uniform).value = value; }
}

precision highp float;

#include includes/visibility.glsl

varying vec3 vWorld;
varying vec3 vNormalView;
varying vec3 vNormalWorld;   // <-- add this
varying vec3 vLayer0;
varying vec3 vLayer1;
varying vec3 vLayer2;

uniform samplerCube uPerlinCube;

uniform float uFresnelPower;
uniform float uFresnelInfluence;
uniform float uTint;
uniform float uBase;
uniform float uBrightnessOffset;
uniform float uBrightness;

// cameraPosition is built-in (world space)

vec3 brightnessToColor(float b){
  b *= uTint;
  return (vec3(b, b*b, b*b*b*b) / uTint) * uBrightness;
}

float ocean(){
    float s = 0.0;
    s += textureCube(uPerlinCube, vLayer0).r;
    s += textureCube(uPerlinCube, vLayer1).r;
    s += textureCube(uPerlinCube, vLayer2).r;
    return s * 0.3333333;
}

void main(){
    // Fresnel in VIEW space using vNormalView
    vec3 Vview = normalize((viewMatrix * vec4(vWorld - cameraPosition, 0.0)).xyz);
    float nDotV = dot(vNormalView, -Vview);
    float fresnel = pow(1.0 - nDotV, uFresnelPower) * uFresnelInfluence;

    float brightness = ocean() * uBase + uBrightnessOffset + fresnel;
    vec3 col = clamp(brightnessToColor(brightness), 0.0, 1.0);

    // IMPORTANT: visibility in WORLD space
    float a = getAlpha(normalize(vNormalWorld));

    gl_FragColor = vec4(col, a);

}

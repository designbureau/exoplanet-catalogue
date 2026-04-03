#ifdef GL_ES
precision highp float;
#endif

#include includes/visibility.glsl

varying float vUVY;
varying float vOpacity;
varying vec3  vColor;
varying vec3  vNormal;

uniform float uAlphaBlended; // kept for parity; not multiplying final alpha

void main(void) {
    // Solid ribbon center with soft falloff to edges:
    // old code used smoothstep(1., 0., abs(vUVY)) which collapses alpha.
    float alpha = 1.0 - smoothstep(0.0, 1.0, abs(vUVY));
    alpha *= alpha;          // softer edge
    alpha *= vOpacity;
    alpha *= getAlpha(vNormal);

    // Premultiplied output
    gl_FragColor = vec4(vColor * alpha, alpha);
}

import {
  Fn,
  abs,
  clamp,
  dot,
  float,
  floor,
  fract,
  max,
  step,
  vec2,
  vec3,
  vec4,
  type N,
} from "~/shaders/tsl/nodes";

// 4D simplex noise (Ashima Arts / Ian McEwan, MIT) — TSL port of the GLSL in
// sun/js/shader/includes/simplex4d.glsl. Pure functions (no uniforms) so they
// are emitted once as shader functions and shared by every material.

const mod289f = Fn(([x]: N[]) => x.sub(floor(x.mul(1 / 289)).mul(289)), { x: "float", return: "float" });
const mod289v = Fn(([x]: N[]) => x.sub(floor(x.mul(1 / 289)).mul(289)), { x: "vec4", return: "vec4" });
const permutef = Fn(([x]: N[]) => mod289f(x.mul(34).add(1).mul(x)), { x: "float", return: "float" });
const permutev = Fn(([x]: N[]) => mod289v(x.mul(34).add(1).mul(x)), { x: "vec4", return: "vec4" });
const taylorInvSqrtf = Fn(([r]: N[]) => float(1.79284291400159).sub(r.mul(0.85373472095314)), { r: "float", return: "float" });
const taylorInvSqrtv = Fn(([r]: N[]) => vec4(1.79284291400159).sub(r.mul(0.85373472095314)), { r: "vec4", return: "vec4" });

const grad4 = Fn(
  ([j, ip]: N[]) => {
    const pxyz = floor(fract(vec3(j).mul(ip.xyz)).mul(7)).mul(ip.z).sub(1).toVar();
    const pw = float(1.5).sub(dot(abs(pxyz), vec3(1, 1, 1))).toVar();
    const p = vec4(pxyz, pw);
    // s = vec4(lessThan(p, vec4(0.0)))
    const s = vec4(1, 1, 1, 1).sub(step(vec4(0, 0, 0, 0), p)).toVar();
    return vec4(pxyz.add(s.xyz.mul(2).sub(1).mul(s.w)), pw);
  },
  { j: "float", ip: "vec4", return: "vec4" },
);

const F4 = 0.309016994374947451;

export const snoise4 = Fn(
  ([v]: N[]) => {
    const C = vec4(0.138196601125011, 0.276393202250021, 0.414589803375032, -0.447213595499958);

    const i = floor(v.add(dot(v, vec4(F4)))).toVar();
    const x0 = v.sub(i).add(dot(i, C.xxxx)).toVar();

    const isX = step(x0.yzw, x0.xxx).toVar();
    const isYZ = step(x0.zww, x0.yyz).toVar();
    const i0 = vec4(
      isX.x.add(isX.y).add(isX.z),
      float(1).sub(isX.x).add(isYZ.x).add(isYZ.y),
      float(1).sub(isX.y).add(float(1).sub(isYZ.x)).add(isYZ.z),
      float(1).sub(isX.z).add(float(1).sub(isYZ.y)).add(float(1).sub(isYZ.z)),
    ).toVar();

    const i3 = clamp(i0, 0, 1);
    const i2 = clamp(i0.sub(1), 0, 1);
    const i1 = clamp(i0.sub(2), 0, 1);

    const x1 = x0.sub(i1).add(C.xxxx).toVar();
    const x2 = x0.sub(i2).add(C.yyyy).toVar();
    const x3 = x0.sub(i3).add(C.zzzz).toVar();
    const x4 = x0.add(C.wwww).toVar();

    const im = mod289v(i).toVar();
    const j0 = permutef(permutef(permutef(permutef(im.w).add(im.z)).add(im.y)).add(im.x)).toVar();
    const j1 = permutev(
      permutev(
        permutev(
          permutev(im.w.add(vec4(i1.w, i2.w, i3.w, 1)))
            .add(im.z)
            .add(vec4(i1.z, i2.z, i3.z, 1)),
        )
          .add(im.y)
          .add(vec4(i1.y, i2.y, i3.y, 1)),
      )
        .add(im.x)
        .add(vec4(i1.x, i2.x, i3.x, 1)),
    ).toVar();

    const ip = vec4(1 / 294, 1 / 49, 1 / 7, 0);
    const p0 = grad4(j0, ip).toVar();
    const p1 = grad4(j1.x, ip).toVar();
    const p2 = grad4(j1.y, ip).toVar();
    const p3 = grad4(j1.z, ip).toVar();
    const p4 = grad4(j1.w, ip).toVar();

    const norm = taylorInvSqrtv(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    const p0n = p0.mul(norm.x);
    const p1n = p1.mul(norm.y);
    const p2n = p2.mul(norm.z);
    const p3n = p3.mul(norm.w);
    const p4n = p4.mul(taylorInvSqrtf(dot(p4, p4)));

    const m0a = max(vec3(0.6).sub(vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2))), 0);
    const m1a = max(vec2(0.6).sub(vec2(dot(x3, x3), dot(x4, x4))), 0);
    const m0 = m0a.mul(m0a);
    const m1 = m1a.mul(m1a);

    return float(49).mul(
      dot(m0.mul(m0), vec3(dot(p0n, x0), dot(p1n, x1), dot(p2n, x2))).add(
        dot(m1.mul(m1), vec2(dot(p3n, x3), dot(p4n, x4))),
      ),
    );
  },
  { v: "vec4", return: "float" },
);

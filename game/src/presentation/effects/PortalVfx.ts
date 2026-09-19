import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  PlaneGeometry,
  Points,
  PointsMaterial,
  ShaderMaterial,
} from "three";

export interface PortalVfxHandle {
  group: Group;
  update(dt: number): void;
  dispose(): void;
}

export const PORTAL_GATE_W = 2.2;
export const PORTAL_GATE_H = 2.65;
export const PORTAL_COLLISION_DEPTH = 0.4;

const GATE_W = PORTAL_GATE_W;
const GATE_H = PORTAL_GATE_H;

const GATE_VERT = `
uniform float uTime;
uniform float uLayer;
varying vec2 vUv;
varying float vWarp;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vUv = uv;
  vec3 pos = position;
  float n = hash(uv * 6.0 + floor(uTime * 2.0) * 0.17);
  float n2 = hash(uv * 3.1 + vec2(2.3, uTime * 0.4));
  float wave = sin(uv.y * 9.0 + uTime * 2.4 + uv.x * 4.0) * 0.07;
  wave += sin(uv.y * 17.0 - uTime * 3.1 + uv.x * 7.0) * 0.035;
  wave += (n - 0.5) * 0.05;
  float bulge = sin(uv.y * 3.14159) * (0.14 + 0.06 * sin(uTime * 1.7 + uLayer));
  bulge *= (0.75 + 0.45 * uv.x);
  pos.z += (wave + bulge) * (0.55 + 0.55 * uLayer);
  pos.x += sin(uv.y * 5.0 + uTime * 1.3) * 0.04 * (uv.y);
  pos.x += (n2 - 0.5) * 0.03;
  vWarp = wave + bulge;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const GATE_FRAG = `
uniform float uTime;
uniform vec3 uColor;
uniform float uAspect;
uniform float uLayer;
varying vec2 vUv;
varying float vWarp;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 p;
  p.x = (vUv.x - 0.5) * 2.0;
  p.y = vUv.y * uAspect * 2.0;

  float leftW = 0.78 + 0.18 * sin(p.y * 2.4 + uTime * 1.1);
  float rightW = 0.92 + 0.14 * cos(p.y * 3.1 - uTime * 0.85);
  leftW += (noise(vec2(p.y * 3.0, uTime * 0.6)) - 0.5) * 0.22;
  rightW += (noise(vec2(p.y * 2.5 + 4.0, uTime * 0.5)) - 0.5) * 0.18;

  float apexX = 0.12 * sin(uTime * 0.7) + 0.08 * noise(vec2(uTime * 0.3, 2.0));
  float bodyTop = uAspect * 2.0 - 0.88;
  bodyTop += 0.1 * sin(uTime * 1.4) + (noise(vec2(uTime * 0.25, 1.0)) - 0.5) * 0.16;

  float edge =
    p.x < apexX
      ? -(p.x - apexX) - leftW
      : (p.x - apexX) - rightW;

  float domeY = max(p.y - bodyTop, 0.0);
  float domeX = p.x - apexX;
  float domeR = mix(leftW, rightW, smoothstep(-0.2, 0.2, domeX)) * 0.95;
  float domeSd = length(vec2(domeX * 1.05, domeY * 1.15)) - domeR;
  float sd = p.y < bodyTop ? edge : domeSd;

  float jagged = noise(vec2(p.x * 8.0 + uTime * 1.5, p.y * 6.0 - uTime)) * 0.09;
  jagged += noise(vec2(p.y * 11.0, uTime * 2.2)) * 0.05;
  sd -= jagged + vWarp * 0.35;

  if (p.y < -0.02) discard;

  float feather = 0.07 + 0.04 * noise(vec2(p.y * 4.0, uTime));
  float mask = 1.0 - smoothstep(0.0, feather, sd);
  mask *= smoothstep(-0.02, 0.06, p.y);
  if (mask < 0.015) discard;

  vec2 center = vec2(apexX * 0.6 + 0.1 * sin(uTime * 1.9), bodyTop * 0.38);
  center.x += 0.15 * noise(vec2(uTime * 0.4, 5.0)) - 0.07;
  vec2 o = p - center;
  o.x *= 1.15 + 0.2 * sin(uTime * 2.1);
  o.y *= 0.9 + 0.15 * cos(uTime * 1.6);
  float d = length(o) / (0.95 + 0.2 * uLayer);
  float a = atan(o.y, o.x);
  float swirl = sin(a * 4.0 - uTime * 3.4 + d * 10.0 + noise(o * 3.0)) * 0.5 + 0.5;
  swirl = mix(swirl, noise(o * 5.0 + uTime), 0.35);
  float bands = sin(d * 11.0 - uTime * 4.2 + a * 2.0) * 0.5 + 0.5;
  float flick = 0.75 + 0.35 * noise(vec2(uTime * 6.0, d * 2.0));
  float core = smoothstep(0.55, 0.05, d) * flick;
  float rim = (1.0 - smoothstep(0.0, feather * 2.5, abs(sd))) * mask;

  vec3 hot = vec3(0.75, 0.92, 1.0);
  vec3 col = mix(uColor * 0.28, hot, core * 0.85);
  col = mix(col, uColor * 1.45, swirl * 0.45);
  col += uColor * bands * 0.22;
  col += hot * rim * 0.85;
  col *= 0.85 + 0.25 * uLayer;

  float alpha = mask * (0.32 + 0.45 * swirl + 0.4 * core) * flick;
  alpha = max(alpha, rim * 0.7);
  alpha *= 0.55 + 0.45 * uLayer;
  alpha = clamp(alpha, 0.0, 0.92);
  gl_FragColor = vec4(col, alpha);
}
`;

function makeGateLayer(
  tint: Color,
  aspect: number,
  layer: number,
  interactive: boolean,
  id: string,
): { mesh: Mesh; mat: ShaderMaterial } {
  const mat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: tint.clone() },
      uAspect: { value: aspect },
      uLayer: { value: layer },
    },
    vertexShader: GATE_VERT,
    fragmentShader: GATE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  const mesh = new Mesh(new PlaneGeometry(GATE_W, GATE_H, 24, 32), mat);
  mesh.position.y = GATE_H * 0.5;
  if (interactive) mesh.userData.interactableId = id;
  return { mesh, mat };
}

export function createPortalVfx(
  id: string,
  x: number,
  z: number,
  colorHex: number,
  interactive: boolean,
): PortalVfxHandle {
  const group = new Group();
  group.name = id;
  group.position.set(x, 0, z);

  const tint = new Color(colorHex);
  const aspect = GATE_H / GATE_W;

  const back = makeGateLayer(tint, aspect, 0.45, false, id);
  back.mesh.position.z = -0.12;
  back.mesh.rotation.y = 0.08;
  back.mesh.scale.set(1.06, 1.04, 1);
  group.add(back.mesh);

  const front = makeGateLayer(tint, aspect, 1.0, interactive, id);
  front.mesh.position.z = 0.05;
  front.mesh.rotation.y = -0.05;
  front.mesh.rotation.z = 0.03;
  group.add(front.mesh);

  const mist = makeGateLayer(tint.clone().lerp(new Color(0xaad8ff), 0.35), aspect, 0.7, false, id);
  mist.mesh.position.set(0.08, GATE_H * 0.5, 0.14);
  mist.mesh.rotation.y = -0.12;
  mist.mesh.scale.set(0.88, 0.92, 1);
  group.add(mist.mesh);

  const sparkCount = 36;
  const sparkPos = new Float32Array(sparkCount * 3);
  const sparkBase = new Float32Array(sparkCount * 3);
  const sparkPhase = new Float32Array(sparkCount);
  const sparkSpeed = new Float32Array(sparkCount);
  for (let i = 0; i < sparkCount; i++) {
    const sideBias = i % 3 === 0 ? -0.55 : i % 3 === 1 ? 0.15 : 0.7;
    const px = sideBias * (0.35 + (i % 5) * 0.12) + (Math.random() - 0.5) * 0.2;
    const py = 0.15 + Math.random() * (GATE_H * 0.85);
    const pz = (Math.random() - 0.5) * 0.45;
    sparkBase[i * 3] = px;
    sparkBase[i * 3 + 1] = py;
    sparkBase[i * 3 + 2] = pz;
    sparkPos[i * 3] = px;
    sparkPos[i * 3 + 1] = py;
    sparkPos[i * 3 + 2] = pz;
    sparkPhase[i] = Math.random() * Math.PI * 2;
    sparkSpeed[i] = 0.9 + Math.random() * 1.8;
  }
  const sparkGeo = new BufferGeometry();
  sparkGeo.setAttribute("position", new BufferAttribute(sparkPos, 3));
  const sparkMat = new PointsMaterial({
    color: tint.clone().lerp(new Color(0xffffff), 0.4),
    size: 0.07,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: AdditiveBlending,
    sizeAttenuation: true,
  });
  const sparks = new Points(sparkGeo, sparkMat);
  group.add(sparks);

  const mats = [back.mat, front.mat, mist.mat];
  let time = 0;

  return {
    group,
    update(dt: number) {
      time += dt;
      for (const m of mats) m.uniforms.uTime.value = time;
      front.mesh.rotation.z = 0.03 + Math.sin(time * 0.9) * 0.025;
      mist.mesh.rotation.y = -0.12 + Math.sin(time * 1.3) * 0.04;
      mist.mesh.position.x = 0.08 + Math.sin(time * 1.1) * 0.06;
      const pos = sparkGeo.attributes.position as BufferAttribute;
      for (let i = 0; i < sparkCount; i++) {
        const ph = sparkPhase[i] + time * sparkSpeed[i];
        const lift = Math.sin(ph) * 0.22 + Math.sin(ph * 2.3) * 0.08;
        const drift = Math.cos(ph * 0.6) * 0.14 + Math.sin(ph * 1.7) * 0.05;
        const depth = Math.sin(ph * 0.9 + i) * 0.18;
        let y = sparkBase[i * 3 + 1] + lift + time * 0.15 * sparkSpeed[i];
        const wrap = GATE_H * 0.95;
        y = ((y % wrap) + wrap) % wrap;
        pos.setXYZ(i, sparkBase[i * 3] + drift, y, sparkBase[i * 3 + 2] + depth);
      }
      pos.needsUpdate = true;
    },
    dispose() {
      for (const layer of [back, front, mist]) {
        layer.mesh.geometry.dispose();
        layer.mat.dispose();
      }
      sparkGeo.dispose();
      sparkMat.dispose();
    },
  };
}

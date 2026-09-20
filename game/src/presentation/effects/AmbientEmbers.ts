import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  PointsMaterial,
} from "three";

export interface AmbientEmbersHandle {
  points: Points;
  update(dt: number): void;
  dispose(): void;
}

const MIN_Y = 0.3;
const MAX_Y = 4.2;

export function createAmbientEmbers(count: number, halfExtent: number): AmbientEmbersHandle {
  const pos = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() * 2 - 1) * halfExtent;
    pos[i * 3 + 1] = MIN_Y + Math.random() * (MAX_Y - MIN_Y);
    pos[i * 3 + 2] = (Math.random() * 2 - 1) * halfExtent;
    phase[i] = Math.random() * Math.PI * 2;
    speed[i] = 0.12 + Math.random() * 0.22;
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  const mat = new PointsMaterial({
    color: new Color(0xffb060),
    size: 0.085,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new Points(geo, mat);
  points.name = "ambient-embers";
  points.frustumCulled = false;
  points.raycast = () => undefined;

  let time = 0;
  const attr = geo.attributes.position as BufferAttribute;

  return {
    points,
    update(dt: number) {
      time += dt;
      for (let i = 0; i < count; i++) {
        const ph = phase[i] + time * 0.6;
        let y = attr.getY(i) + speed[i] * dt;
        if (y > MAX_Y) y = MIN_Y;
        const x = attr.getX(i) + Math.sin(ph) * 0.004;
        const z = attr.getZ(i) + Math.cos(ph * 0.8) * 0.004;
        attr.setXYZ(i, x, y, z);
      }
      attr.needsUpdate = true;
      mat.opacity = 0.6 + Math.sin(time * 0.9) * 0.15;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

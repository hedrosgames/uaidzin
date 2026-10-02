import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
} from "three";

export function createTaperedArcGeometry(
  radius: number,
  width: number,
  arc: number,
  depth = 0.035,
  segments = 28,
): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= segments; index++) {
    const t = index / segments;
    const angle = (t - 0.5) * arc;
    const taper = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.65);
    const inner = radius - width * taper;
    for (const z of [depth * taper, -depth * taper]) {
      for (const r of [inner, radius]) {
        positions.push(Math.cos(angle) * r, Math.sin(angle) * r, z);
        uvs.push(t, r === radius ? 1 : 0);
      }
    }
    if (index === segments) continue;
    const a = index * 4;
    indices.push(
      a, a + 1, a + 4, a + 4, a + 1, a + 5,
      a + 2, a + 6, a + 3, a + 3, a + 6, a + 7,
      a + 1, a + 3, a + 5, a + 5, a + 3, a + 7,
      a, a + 4, a + 2, a + 2, a + 4, a + 6,
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createShieldGeometry(width: number, height: number, depth: number): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(0, height * 0.5);
  shape.lineTo(width * 0.5, height * 0.28);
  shape.lineTo(width * 0.42, -height * 0.15);
  shape.lineTo(0, -height * 0.5);
  shape.lineTo(-width * 0.42, -height * 0.15);
  shape.lineTo(-width * 0.5, height * 0.28);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.25,
    bevelSize: Math.min(width, height) * 0.035,
    bevelSegments: 1,
    steps: 1,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  return geometry;
}

export function createBladeGeometry(length: number, width: number, depth: number): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(0, length * 0.62);
  shape.lineTo(width * 0.5, length * 0.12);
  shape.lineTo(width * 0.22, -length * 0.3);
  shape.lineTo(width * 0.1, -length * 0.38);
  shape.lineTo(-width * 0.1, -length * 0.38);
  shape.lineTo(-width * 0.22, -length * 0.3);
  shape.lineTo(-width * 0.5, length * 0.12);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.35,
    bevelSize: width * 0.08,
    bevelSegments: 1,
    steps: 1,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  return geometry;
}

export function createBrokenRingGeometry(inner: number, outer: number, segments = 64): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  for (let index = 0; index < segments; index++) {
    if (index % 9 === 0 || index % 13 === 0) continue;
    const angle = index * Math.PI * 2 / segments;
    const end = angle + Math.PI * 2 / segments * 0.92;
    const notch = Math.sin(index * 7.31) * 0.022;
    const inside = inner + notch;
    const outside = outer + notch * 0.4;
    const shade = 0.66 + (Math.sin(index * 3.7) * 0.5 + 0.5) * 0.34;
    for (const [a, r] of [
      [angle, inside], [angle, outside], [end, inside],
      [end, inside], [angle, outside], [end, outside],
    ]) {
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      positions.push(x, y, 0);
      uvs.push(x / outer * 0.5 + 0.5, y / outer * 0.5 + 0.5);
      colors.push(shade, shade * 0.94, shade * 0.84);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

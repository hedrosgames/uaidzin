import {
  AdditiveBlending,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  type Texture,
} from "three";
import { FuryTextures } from "./FuryTextures";

function material(map: Texture, color = 0xffffff, additive = false): MeshBasicMaterial {
  return new MeshBasicMaterial({
    map,
    color,
    transparent: true,
    opacity: 1,
    alphaTest: 0.008,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: additive ? AdditiveBlending : NormalBlending,
    toneMapped: false,
  });
}

function geometry(positions: number[], uv: number[], indices: number[]): BufferGeometry {
  const result = new BufferGeometry();
  result.setAttribute("position", new Float32BufferAttribute(positions, 3));
  result.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  result.setIndex(indices);
  result.computeVertexNormals();
  result.computeBoundingSphere();
  return result;
}

function createSurge(): BufferGeometry {
  const positions: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  const segments = 14;
  for (let blade = 0; blade < 3; blade++) {
    const offset = positions.length / 3;
    for (let step = 0; step <= segments; step++) {
      const t = step / segments;
      const angle = blade * Math.PI * 2 / 3 + t * 0.68;
      const radius = 0.48 + Math.sin(t * Math.PI) * 0.24 + t * 0.1;
      const halfWidth = 0.28 + t * 0.13;
      for (const side of [-1, 1]) {
        positions.push(
          Math.cos(angle) * radius - Math.sin(angle) * side * halfWidth,
          t * 1.8,
          Math.sin(angle) * radius + Math.cos(angle) * side * halfWidth,
        );
        uv.push((side + 1) / 2, t);
      }
      if (step < segments) {
        const a = offset + step * 2;
        indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      }
    }
  }
  return geometry(positions, uv, indices);
}

function createOrbitSlash(): BufferGeometry {
  const positions: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  const segments = 28;
  for (let step = 0; step <= segments; step++) {
    const t = step / segments;
    const angle = t * Math.PI * 0.95;
    const width = 0.025 + Math.sin(t * Math.PI) * 0.15;
    for (const side of [-1, 1]) {
      positions.push(
        Math.cos(angle) * (0.72 + side * width),
        (t - 0.5) * 0.2 + side * width * 0.22,
        Math.sin(angle) * (0.72 + side * width),
      );
      uv.push(t, (side + 1) / 2);
    }
    if (step < segments) {
      const a = step * 2;
      indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
  }
  return geometry(positions, uv, indices);
}

export class FuryResources {
  readonly textures = new FuryTextures();
  readonly surgeGeometry = createSurge();
  readonly slashGeometry = createOrbitSlash();
  readonly groundGeometry = new PlaneGeometry(2, 2);
  readonly materials = {
    surge: material(this.textures.surge),
    slash: material(this.textures.slash),
    spark: material(this.textures.spark),
    pulse: material(this.textures.ring),
    ground: material(this.textures.ring, 0xe45040),
    orbit: material(this.textures.slash, 0xff936f),
    accent: material(this.textures.slash, 0xffd3a6, true),
  };

  dispose(): void {
    this.surgeGeometry.dispose();
    this.slashGeometry.dispose();
    this.groundGeometry.dispose();
    for (const entry of Object.values(this.materials)) entry.dispose();
    this.textures.dispose();
  }
}

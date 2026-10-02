import {
  BufferGeometry, Color, ConeGeometry, DoubleSide, DynamicDrawUsage, ExtrudeGeometry, Group, IcosahedronGeometry,
  InstancedMesh, MeshStandardMaterial, Object3D, OctahedronGeometry, Shape, TorusGeometry, Vector3,
} from "three";
import type { SkillPlaceholderArt } from "./SkillPlaceholderArt";
import { createBladeGeometry, createShieldGeometry, createTaperedArcGeometry } from "../../vfxKit/stylizedGeometry";
import { createBeastSilhouetteGeometry } from "../../vfxKit/beastSilhouetteGeometry";

function extrude(points: readonly (readonly [number, number])[], depth = 0.045): BufferGeometry {
  const shape = new Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.015,
    bevelThickness: 0.012, steps: 1, curveSegments: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  return geometry;
}

export class SkillArtworkResources {
  private readonly geometries = new Map<string, BufferGeometry>();
  private readonly materials = new Map<string, MeshStandardMaterial>();

  geometry(motif: SkillPlaceholderArt["motif"]): BufferGeometry {
    const cached = this.geometries.get(motif);
    if (cached) return cached;
    let geometry: BufferGeometry;
    if (motif === "wolf" || motif === "bear" || motif === "tiger" || motif === "dragon" || motif === "condor" || motif === "titan") {
      geometry = createBeastSilhouetteGeometry(motif);
    } else if (motif === "orb") geometry = new IcosahedronGeometry(0.35, 1);
    else if (motif === "rock") {
      geometry = new IcosahedronGeometry(0.5, 0);
      geometry.scale(1, 0.72, 0.85);
    } else if (motif === "rune") geometry = new TorusGeometry(0.35, 0.032, 4, 4);
    else if (motif === "spiral" || motif === "arc") {
      geometry = createTaperedArcGeometry(0.55, motif === "arc" ? 0.12 : 0.065, Math.PI * 1.65, 0.025, 24);
    }
    else if (motif === "shield") {
      geometry = createShieldGeometry(0.62, 0.94, 0.07);
    } else if (motif === "wing" || motif === "leaf") {
      geometry = motif === "wing"
        ? extrude([[-0.5, -0.16], [0.62, 0.32], [0.37, 0.19], [0.5, 0.1], [0.23, 0.08], [0.32, -0.04], [0.02, -0.12], [-0.05, -0.24], [-0.3, -0.24]])
        : extrude([[0, 0.55], [0.2, 0.1], [0.14, -0.2], [0, -0.45], [-0.18, -0.08], [-0.15, 0.23]]);
    } else if (motif === "petal") {
      geometry = extrude([[0, 0.58], [0.22, 0.32], [0.3, 0.05], [0.17, -0.2], [0, -0.38], [-0.17, -0.2], [-0.3, 0.05], [-0.22, 0.32]]);
      geometry.rotateX(-0.35);
    } else if (motif === "crystal") {
      geometry = new OctahedronGeometry(0.4, 0);
      geometry.scale(0.6, 1.7, 0.6);
    } else if (motif === "star") {
      const points: [number, number][] = [];
      for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6;
        const radius = i % 2 === 0 ? 0.42 : 0.13;
        points.push([Math.sin(angle) * radius, Math.cos(angle) * radius]);
      }
      geometry = extrude(points, 0.025);
    } else if (motif === "bolt") {
      geometry = extrude([[0.18, 0.6], [-0.25, 0.02], [-0.03, 0.06], [-0.18, -0.62], [0.28, 0.08], [0.04, 0.02]], 0.055);
    } else if (motif === "arrow") {
      geometry = extrude([[0, 0.7], [0.2, 0.3], [0.045, 0.32], [0.045, -0.35], [0.16, -0.5], [0.16, -0.64], [0.035, -0.54], [-0.035, -0.54], [-0.16, -0.64], [-0.16, -0.5], [-0.045, -0.35], [-0.045, 0.32], [-0.2, 0.3]]);
    } else if (motif === "blade") {
      geometry = createBladeGeometry(1.05, 0.24, 0.045);
    } else if (motif === "claw") {
      geometry = createTaperedArcGeometry(0.86, 0.18, Math.PI * 0.68, 0.045, 18);
      geometry.translate(-0.65, 0, 0);
    } else {
      geometry = new ConeGeometry(0.17, 0.85, 5);
      geometry.rotateZ(0.28);
    }
    this.geometries.set(motif, geometry);
    return geometry;
  }

  material(color: number, accent: number): MeshStandardMaterial {
    const key = `${color}:${accent}`;
    const cached = this.materials.get(key);
    if (cached) return cached;
    const material = new MeshStandardMaterial({ color, emissive: accent, emissiveIntensity: 0.28,
      metalness: 0.16, roughness: 0.72, flatShading: true, side: DoubleSide,
      transparent: true, opacity: 0.9, depthWrite: false });
    material.forceSinglePass = true;
    this.materials.set(key, material);
    return material;
  }

  dispose(): void {
    for (const geometry of this.geometries.values()) geometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.geometries.clear();
    this.materials.clear();
  }
}

export class SkillArtwork {
  private readonly mesh: InstancedMesh;
  private readonly material: MeshStandardMaterial;
  private readonly secondary: SkillArtwork | null;
  private readonly dummy = new Object3D();
  private readonly local = new Vector3();
  private readonly count: number;
  private disposed = false;

  constructor(
    group: Group,
    resources: SkillArtworkResources,
    private readonly art: SkillPlaceholderArt,
    private readonly radius: number,
    private readonly area: boolean,
  ) {
    this.count = Math.max(1, Math.min(12, Math.floor(art.count)));
    this.material = resources.material(art.color, art.accent).clone();
    this.mesh = new InstancedMesh(resources.geometry(art.motif), this.material, this.count);
    this.material.vertexColors = this.mesh.geometry.hasAttribute("color");
    this.mesh.name = `skill-art-${art.motif}`;
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    this.mesh.visible = false;
    if (art.colors?.length) {
      const color = new Color();
      this.material.color.setHex(0xffffff);
      for (let i = 0; i < this.count; i++) this.mesh.setColorAt(i, color.setHex(art.colors[i % art.colors.length]));
    }
    group.add(this.mesh);
    this.secondary = art.secondary ? new SkillArtwork(group, resources, art.secondary, radius, area) : null;
  }

  update(elapsed: number, progress: number, center: Vector3, tangent?: Vector3, impact = false, fadeProgress = progress): void {
    if (this.disposed) return;
    const { art } = this;
    const spread = this.area ? Math.min(this.radius * 0.86, art.spread * 2) : art.spread;
    const collapse = impact ? Math.max(0, 1 - fadeProgress) : 1;
    const reveal = Math.min(1, elapsed * 14);
    this.material.opacity = (art.opacity ?? 0.9) * reveal * Math.pow(collapse, 1.2);
    this.mesh.visible = this.material.opacity > 0.005;
    for (let i = 0; i < this.count; i++) {
      const phase = i * Math.PI * 2 / this.count;
      const angle = phase + elapsed * art.spin;
      const radius = art.motion === "burst" ? spread * (0.3 + progress * 0.7) : spread;
      this.local.set(Math.sin(angle) * radius, art.lift, Math.cos(angle) * radius);
      if (art.motion === "rain") this.local.y = Math.max(0.08, art.lift * (1 - ((progress + i / this.count) % 1)));
      else if (art.motion === "totem") this.local.y = art.lift * Math.sin(Math.min(progress * 2, 1) * Math.PI / 2) + Math.sin(angle) * 0.1;
      else if (art.motion === "trail") this.local.set(Math.sin(phase) * art.spread, Math.cos(phase) * art.spread + art.lift, -i * 0.16);
      else if (art.motion === "orbit") this.local.y += Math.sin(angle * 2) * 0.18;
      else if (art.motion === "inward") {
        this.local.multiplyScalar(1 - progress * 0.68);
        this.local.y = art.lift + progress * 0.55;
      } else if (art.motion === "stamp") {
        this.local.set(Math.sin(phase) * spread, art.lift + (impact ? 0 : 3.2 * (1 - progress) ** 2), Math.cos(phase) * spread);
      }
      this.dummy.rotation.set(art.motion === "ward" ? 0 : 0.3, angle, art.motion === "burst" ? angle * 0.5 : 0);
      if (art.motion === "rain") this.dummy.rotation.z = Math.PI + 0.15;
      if (art.layout === "cross") {
        this.local.set((i % 2 === 0 ? -1 : 1) * spread, art.lift, -0.2);
        this.dummy.rotation.set(0.12, 0, (i % 2 === 0 ? -1 : 1) * 0.65);
      } else if (art.layout === "arms") {
        this.local.set((i % 2 === 0 ? -1 : 1) * spread, art.lift + Math.floor(i / 2) * 0.1, 0.12);
        this.dummy.rotation.set(0.2, 0, (i % 2 === 0 ? -1 : 1) * (0.22 + elapsed * art.spin));
      } else if (art.layout === "crown") {
        this.local.y = art.lift + Math.sin(phase * 3) * 0.09;
        this.dummy.rotation.set(0, angle, 0.12);
      } else if (art.layout === "focus") {
        this.local.set(0, art.lift, i * 0.1);
        this.dummy.rotation.set(0.08, 0, elapsed * art.spin + phase * 0.25);
      } else if (art.layout === "shell") {
        this.local.y += i % 2 === 0 ? 0.13 : -0.13;
        this.dummy.rotation.set(-0.16, angle, 0);
      } else if (art.layout === "petals") {
        this.local.set(Math.sin(phase) * radius, art.lift + Math.sin(progress * Math.PI) * 0.42, Math.cos(phase) * radius);
        this.dummy.rotation.set(-0.65 + progress * 0.5, phase, 0);
      } else if (art.layout === "fan") {
        this.local.set((i - (this.count - 1) / 2) * spread, art.lift, (i % 2) * 0.08);
        this.dummy.rotation.set(0.25, 0.25, -0.55);
      } else if (art.layout === "columns") {
        this.local.set(Math.sin(phase) * spread, art.lift * reveal, Math.cos(phase) * spread);
        this.dummy.rotation.set(0.12, angle, 0);
      }
      if (tangent && art.motion === "trail") {
        this.dummy.quaternion.setFromUnitVectors(UP, tangent);
        this.local.set(Math.sin(phase) * art.spread, -i * 0.16, Math.cos(phase) * art.spread + art.lift);
        this.local.applyQuaternion(this.dummy.quaternion);
      } else if (tangent && art.motion === "charge") {
        this.dummy.quaternion.setFromUnitVectors(FORWARD, tangent);
        this.local.set(0, art.lift, -i * 0.2);
        this.local.applyQuaternion(this.dummy.quaternion);
      }
      this.dummy.position.copy(center).add(this.local);
      this.dummy.position.y = Math.max(0.12, this.dummy.position.y);
      const size = art.scale * Math.max(0.001, collapse) * (0.72 + reveal * 0.28);
      this.dummy.scale.set(size * (art.size?.[0] ?? 1), size * (art.size?.[1] ?? 1), size * (art.size?.[2] ?? 1));
      if (art.layout === "focus") this.dummy.scale.multiplyScalar(1 + i * 0.32);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.secondary?.update(elapsed, progress, center, tangent, impact, fadeProgress);
  }

  getInstanceCount(): number {
    return this.count + (this.secondary?.getInstanceCount() ?? 0);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mesh.removeFromParent();
    this.mesh.dispose();
    this.material.dispose();
    this.secondary?.dispose();
  }
}

const UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, 1);

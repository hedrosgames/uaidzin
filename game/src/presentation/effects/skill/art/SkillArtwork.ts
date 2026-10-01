import {
  BoxGeometry, BufferGeometry, ConeGeometry, DynamicDrawUsage, Group, IcosahedronGeometry,
  InstancedMesh, MeshStandardMaterial, Object3D, OctahedronGeometry, TorusGeometry, Vector3,
} from "three";
import type { SkillPlaceholderArt } from "./SkillPlaceholderArt";

export class SkillArtworkResources {
  private readonly geometries = new Map<string, BufferGeometry>();
  private readonly materials = new Map<string, MeshStandardMaterial>();

  geometry(motif: SkillPlaceholderArt["motif"]): BufferGeometry {
    const cached = this.geometries.get(motif);
    if (cached) return cached;
    let geometry: BufferGeometry;
    if (motif === "orb") geometry = new IcosahedronGeometry(0.35, 1);
    else if (motif === "rune" || motif === "spiral") geometry = new TorusGeometry(0.35, 0.055, 5, 16, motif === "spiral" ? Math.PI * 1.6 : Math.PI * 2);
    else if (motif === "shield") {
      geometry = new OctahedronGeometry(0.5, 0);
      geometry.scale(0.8, 1.15, 0.22);
    } else if (motif === "wing" || motif === "leaf") {
      geometry = new OctahedronGeometry(0.5, 0);
      geometry.scale(1.2, 0.35, 0.22);
    } else if (motif === "crystal" || motif === "star") {
      geometry = new OctahedronGeometry(0.4, 0);
      if (motif === "crystal") geometry.scale(0.6, 1.7, 0.6);
    } else if (motif === "bolt") {
      geometry = new BoxGeometry(0.075, 0.7, 0.1);
      geometry.rotateZ(-0.4);
    } else {
      geometry = new ConeGeometry(motif === "arrow" ? 0.16 : 0.2, 0.95, 5);
      if (motif === "blade" || motif === "claw") geometry.scale(0.8, 1, 0.3);
      if (motif === "fang") geometry.rotateZ(0.28);
    }
    this.geometries.set(motif, geometry);
    return geometry;
  }

  material(color: number, accent: number): MeshStandardMaterial {
    const key = `${color}:${accent}`;
    const cached = this.materials.get(key);
    if (cached) return cached;
    const material = new MeshStandardMaterial({ color, emissive: accent, emissiveIntensity: 0.35,
      metalness: 0.65, roughness: 0.42, transparent: true, opacity: 0.88, depthWrite: false });
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
    this.mesh = new InstancedMesh(resources.geometry(art.motif), resources.material(art.color, art.accent), this.count);
    this.mesh.name = `skill-art-${art.motif}`;
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    group.add(this.mesh);
  }

  update(elapsed: number, progress: number, center: Vector3, tangent?: Vector3, impact = false): void {
    if (this.disposed) return;
    const { art } = this;
    const spread = this.area ? Math.min(this.radius * 0.8, art.spread * 2) : art.spread;
    const collapse = impact ? Math.max(0, 1 - progress) : 1;
    for (let i = 0; i < this.count; i++) {
      const phase = i * Math.PI * 2 / this.count;
      const angle = phase + elapsed * art.spin;
      const radius = art.motion === "burst" ? spread * (0.3 + progress * 0.7) : spread;
      this.local.set(Math.sin(angle) * radius, art.lift, Math.cos(angle) * radius);
      if (art.motion === "rain") this.local.y = Math.max(0.08, art.lift * (1 - ((progress + i / this.count) % 1)));
      else if (art.motion === "totem") this.local.y = art.lift * Math.sin(Math.min(progress * 2, 1) * Math.PI / 2) + Math.sin(angle) * 0.1;
      else if (art.motion === "trail") this.local.set(Math.sin(phase) * art.spread, Math.cos(phase) * art.spread + art.lift, -i * 0.16);
      else if (art.motion === "orbit") this.local.y += Math.sin(angle * 2) * 0.18;
      this.dummy.rotation.set(art.motion === "ward" ? 0 : 0.3, angle, art.motion === "burst" ? angle * 0.5 : 0);
      if (tangent && art.motion === "trail") {
        this.dummy.quaternion.setFromUnitVectors(UP, tangent);
        this.local.set(Math.sin(phase) * art.spread, -i * 0.16, Math.cos(phase) * art.spread + art.lift);
        this.local.applyQuaternion(this.dummy.quaternion);
      }
      this.dummy.position.copy(center).add(this.local);
      this.dummy.position.y = Math.max(0.12, this.dummy.position.y);
      this.dummy.scale.setScalar(art.scale * collapse * (0.85 + Math.sin(progress * Math.PI) * 0.15));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mesh.removeFromParent();
    this.mesh.dispose();
  }
}

const UP = new Vector3(0, 1, 0);

import { CatmullRomCurve3, Group, MathUtils, PointLight, Scene, Vector3, type MeshStandardMaterial } from "three";
import type { TkLightPool } from "../TkLightPool";
import { getSkillArtwork } from "./art/SkillArtworkCatalog";
import { SkillArtwork, SkillArtworkResources } from "./art/SkillArtwork";
import type { SkillPlaceholderArt } from "./art/SkillPlaceholderArt";
import { CometTail } from "../vfxKit/cometTail";

export interface StylizedSkillDefinition {
  skillId: string;
  dedicatedId: string;
  mode: "directed" | "self" | "aoe" | "summon";
  heightOffset: number;
  duration: number;
  maxConcurrentCasts: number;
  lightPeak: number;
  travel: boolean;
  burstCount?: number;
}

const LOCAL_ORIGIN = new Vector3();

class StylizedSkillCast {
  private readonly root = new Group();
  private readonly artwork: SkillArtwork;
  private readonly impact: SkillArtwork | null;
  private readonly tail: CometTail | null;
  private readonly tailMaterial: MeshStandardMaterial | null;
  private readonly light: PointLight | null;
  private readonly direction = new Vector3();
  private readonly from = new Vector3();
  private readonly to = new Vector3();
  private elapsed: number;
  private disposed = false;

  constructor(
    root: Group,
    resources: SkillArtworkResources,
    private readonly def: StylizedSkillDefinition,
    art: SkillPlaceholderArt,
    origin: Vector3,
    target: Vector3,
    radius: number,
    prefix: string,
    private readonly flightFraction: number,
    private readonly onDispose: (cast: StylizedSkillCast) => void,
    private readonly lightPool?: TkLightPool,
    delay = 0,
    spread = 0,
  ) {
    this.elapsed = -delay;
    this.direction.subVectors(target, origin);
    if (this.direction.lengthSq() < 1e-6) this.direction.set(0, 0, 1);
    else this.direction.normalize();
    this.from.copy(def.mode === "directed" && !def.travel ? target : origin);
    this.to.copy(def.mode === "directed" ? target : origin);
    if (def.mode === "directed") {
      this.from.y = Math.max(this.from.y, def.heightOffset);
      this.to.y = Math.max(this.to.y, def.heightOffset);
    }
    if (spread !== 0) {
      this.from.x -= this.direction.z * spread;
      this.from.z += this.direction.x * spread;
      this.to.x -= this.direction.z * spread;
      this.to.z += this.direction.x * spread;
    }
    this.root.name = `${prefix}-cast-${def.dedicatedId}`;
    this.root.position.copy(this.from);
    this.root.visible = delay <= 0;
    root.add(this.root);
    this.artwork = new SkillArtwork(this.root, resources, art, radius, def.mode === "aoe");
    this.impact = art.impact ? new SkillArtwork(this.root, resources, art.impact, radius, false) : null;
    this.tailMaterial = def.mode === "directed" && def.travel
      ? resources.material(art.color, art.accent).clone() : null;
    this.tail = this.tailMaterial ? new CometTail(root, {
      shardGeometry: resources.geometry("crystal"),
      shardMaterial: this.tailMaterial,
    }, new CatmullRomCurve3([this.from.clone(), this.from.clone().lerp(this.to, 0.5), this.to.clone()]), {
      objectName: `${prefix}-trail-${def.dedicatedId}`,
      spacing: 0.16, maxShards: 12, tailLength: 0.22,
      headScale: 0.12, tailScale: 0.018, spinSpeed: 1.5,
    }) : null;
    this.tail?.hide();
    this.light = lightPool
      ? lightPool.acquire(art.accent, Math.min(6, Math.max(3, radius)))
      : new PointLight(art.accent, 0, Math.min(6, Math.max(3, radius)), 2);
    if (this.light) this.root.add(this.light);
    this.artwork.update(0, 0, LOCAL_ORIGIN, def.mode === "directed" ? this.direction : undefined);
  }

  update(dt: number): void {
    if (this.disposed) return;
    this.elapsed += dt;
    if (this.elapsed < 0) return;
    this.root.visible = true;
    const progress = MathUtils.clamp(this.elapsed / this.def.duration, 0, 1);
    const directed = this.def.mode === "directed";
    const flightEnd = directed && this.def.travel ? this.flightFraction : 0.72;
    if (directed && this.def.travel) {
      const flight = MathUtils.smoothstep(progress / flightEnd, 0, 1);
      this.root.position.lerpVectors(this.from, this.to, flight);
      this.tail?.show();
      this.tail?.update(flight, this.elapsed);
    }
    const fadeStart = Math.min(0.72, flightEnd);
    const closing = progress > fadeStart;
    const fade = closing ? MathUtils.clamp((progress - fadeStart) / (1 - fadeStart), 0, 1) : 0;
    this.artwork.update(this.elapsed, progress, LOCAL_ORIGIN, directed ? this.direction : undefined, closing, fade);
    if (this.tailMaterial) this.tailMaterial.opacity = 0.62 * (1 - fade);
    if (progress > flightEnd) this.impact?.update(this.elapsed - flightEnd * this.def.duration, fade, LOCAL_ORIGIN, undefined, true);
    if (this.light) this.light.intensity = this.def.lightPeak * Math.sin(progress * Math.PI) * 0.48;
    if (progress >= 1) this.dispose();
  }

  getInstanceCount(): number {
    return this.artwork.getInstanceCount() + (this.tail?.mesh.count ?? 0);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.artwork.dispose();
    this.impact?.dispose();
    this.tail?.dispose();
    this.tailMaterial?.dispose();
    if (this.lightPool) this.lightPool.release(this.light);
    else if (this.light) {
      this.light.removeFromParent();
      this.light.dispose();
    }
    this.root.removeFromParent();
    this.onDispose(this);
  }
}

export class StylizedSkillVfxController<Id extends string> {
  private readonly root = new Group();
  private readonly resources = new SkillArtworkResources();
  private readonly casts = new Set<StylizedSkillCast>();
  private disposed = false;

  constructor(
    scene: Scene,
    private readonly definitions: Readonly<Record<Id, StylizedSkillDefinition>>,
    private readonly prefix: string,
    private readonly flightFraction = 1,
    private readonly lightPool?: TkLightPool,
  ) {
    this.root.name = `${prefix}-stylized-root`;
    scene.add(this.root);
  }

  cast(id: Id, origin: Vector3, target: Vector3, radius = 1): void {
    if (this.disposed || !finiteVector(origin) || !finiteVector(target) || !Number.isFinite(radius) || radius < 0) return;
    const def = this.definitions[id];
    if (!def) return;
    const art = getSkillArtwork(def.skillId);
    if (!art) throw new Error(`VFX dedicado sem arte: ${def.skillId}`);
    const count = def.burstCount ?? 1;
    const limit = def.maxConcurrentCasts + (count > 1 ? count : 0);
    while (this.casts.size + count > limit) {
      const oldest = this.casts.values().next().value;
      if (!oldest) break;
      oldest.dispose();
    }
    for (let index = 0; index < count; index++) {
      const cast = new StylizedSkillCast(
        this.root, this.resources, def, art, origin, target, Math.max(0.5, radius), this.prefix,
        this.flightFraction, item => this.casts.delete(item), this.lightPool,
        index * 0.07, (index - (count - 1) / 2) * 0.22,
      );
      this.casts.add(cast);
    }
  }

  update(dt: number, _width?: number, _height?: number): void {
    if (this.disposed || !Number.isFinite(dt) || dt <= 0) return;
    for (const cast of this.casts) cast.update(dt);
  }

  clear(): void {
    for (const cast of this.casts) cast.dispose();
  }

  dispose(): void {
    if (this.disposed) return;
    this.clear();
    this.disposed = true;
    this.resources.dispose();
    this.root.removeFromParent();
  }

  getActiveCastCount(): number {
    return this.casts.size;
  }

  getParticleCount(): number {
    let count = 0;
    for (const cast of this.casts) count += cast.getInstanceCount();
    return count;
  }
}

function finiteVector(value: Vector3): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
}

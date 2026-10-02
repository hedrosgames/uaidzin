import {
  AdditiveBlending,
  Color,
  ShaderMaterial,
  ConeGeometry,
  CylinderGeometry,
  CubicBezierCurve3,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  RingGeometry,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import {
  ApplyForce,
  Bezier,
  BatchedRenderer,
  ColorOverLife,
  ConeEmitter,
  ConstantColor,
  ConstantValue,
  Gradient,
  IntervalValue,
  ParticleSystem,
  PiecewiseBezier,
  PointEmitter,
  RenderMode,
  SizeOverLife,
  SphereEmitter,
  TurbulenceField,
  Vector3 as QuarksVector3,
  Vector4 as QuarksVector4,
  WidthOverLength,
} from "three.quarks";
import {
  createFireBurstParticleMaterials,
  disposeFireBurstParticleMaterials,
  type FireBurstParticleMaterials,
} from "../fireBurst/FireBurstParticleSystems";
import {
  createFireBurstTextures,
  disposeFireBurstTextures,
  type FireBurstTextureSet,
} from "../fireBurst/FireBurstTextures";
import type { SkillVfxProfile, SkillVfxRequest } from "./SkillVfxTypes";
import type { TkLightPool } from "../TkLightPool";
import { skillVfxDuration } from "./SkillVfxTiming";
import { getSkillArtwork } from "./art/SkillArtworkCatalog";
import { SkillArtwork, SkillArtworkResources } from "./art/SkillArtwork";

interface SkillVfxResources {
  textures: FireBurstTextureSet;
  particleMaterials: FireBurstParticleMaterials;
  coreGeometry: SphereGeometry;
  ringGeometry: RingGeometry;
  beamGeometry: CylinderGeometry;
  arrowGeometry: ConeGeometry;
  artwork: SkillArtworkResources;
}

interface SkillVfxCastOptions {
  scene: Scene;
  batch: BatchedRenderer;
  root: Group;
  resources: SkillVfxResources;
  request: SkillVfxRequest;
  castIndex: number;
  onDispose: () => void;
  lightPool?: TkLightPool;
}

const UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, 1);
const SEGMENT_DIRECTION = new Vector3();
const MAX_SKILL_VFX_CASTS = 8;
const FIXED_STEP = 1 / 60;

function createColorGradient(colorHex: number): Gradient {
  const base = new Color(colorHex);
  const hot = base.clone().lerp(new Color(0xffffff), 0.46);
  const warm = base.clone().lerp(new Color(0xffa500), 0.34);
  const deep = base.clone().multiplyScalar(0.32);
  return new Gradient(
    [
      [new QuarksVector3(hot.r, hot.g, hot.b), 0],
      [new QuarksVector3(warm.r, warm.g, warm.b), 0.38],
      [new QuarksVector3(deep.r, deep.g, deep.b), 0.78],
      [new QuarksVector3(deep.r * 0.25, deep.g * 0.18, deep.b * 0.12), 1],
    ],
    [
      [1, 0],
      [0.92, 0.42],
      [0.38, 0.78],
      [0, 1],
    ],
  );
}

function createShrink(): SizeOverLife {
  return new SizeOverLife(
    new PiecewiseBezier([[new Bezier(1, 1.12, 0.48, 0), 0]]),
  );
}

function createTurbulence(strength: number): TurbulenceField {
  return new TurbulenceField(
    new QuarksVector3(0.9, 0.9, 0.9),
    2,
    new QuarksVector3(strength, strength * 1.25, strength),
    new QuarksVector3(1.1, 1.1, 1.1),
  );
}

function createAdditiveMeshMaterial(colorHex: number, opacity: number): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
}

function createMotionSystem(
  request: SkillVfxRequest,
  material: MeshBasicMaterial,
  directional: boolean,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: directional ? 0.82 : 0.9,
    looping: false,
    startLife: new IntervalValue(directional ? 0.18 : 0.25, directional ? 0.46 : 0.72),
    startSpeed: new IntervalValue(directional ? 2.2 : 0.4, directional ? 5.4 : 1.2),
    startSize: new IntervalValue(directional ? 0.12 : 0.08, directional ? 0.28 : 0.22),
    startColor: new ConstantColor(new QuarksVector4(1, 1, 1, 1)),
    emissionOverTime: new ConstantValue(getSkillArtwork(request.profile.id)?.particleRate ?? (directional ? 80 : 34)),
    emissionOverDistance: new ConstantValue(0),
    shape: directional
      ? new ConeEmitter({ radius: 0.045, thickness: 0.72, angle: 0.18 })
      : new PointEmitter(),
    material,
    renderMode: directional ? RenderMode.Trail : RenderMode.BillBoard,
    rendererEmitterSettings: directional
      ? {
          startLength: new ConstantValue(8),
          followLocalOrigin: false,
        }
      : {},
    worldSpace: true,
    renderOrder: 6,
    behaviors: [
      new ColorOverLife(createColorGradient(request.colorHex)),
      createShrink(),
      new WidthOverLength(new PiecewiseBezier([[new Bezier(1, 0.72, 0.16, 0), 0]])),
      createTurbulence(directional ? 0.5 : 0.28),
    ],
  });
  if (directional) {
    system.emitter.quaternion.setFromUnitVectors(FORWARD, new Vector3(0, 0, 1));
  }
  return system;
}

function createImpactSystem(request: SkillVfxRequest, material: MeshBasicMaterial): ParticleSystem {
  return new ParticleSystem({
    autoDestroy: false,
    duration: 0.52,
    looping: false,
    startLife: new IntervalValue(0.24, 0.62),
    startSpeed: new IntervalValue(2.2, 5.8),
    startSize: new IntervalValue(0.06, 0.2),
    startColor: new ConstantColor(new QuarksVector4(1, 1, 1, 1)),
    emissionOverTime: new ConstantValue(getSkillArtwork(request.profile.id)?.particleRate ?? 92),
    emissionOverDistance: new ConstantValue(0),
    shape: new SphereEmitter({ radius: 0.16, thickness: 0.18 }),
    material,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 7,
    behaviors: [
      new ColorOverLife(createColorGradient(request.colorHex)),
      createShrink(),
      new ApplyForce(new QuarksVector3(0, -2.4, 0), new ConstantValue(1)),
      createTurbulence(0.46),
    ],
  });
}

function createAuraSystem(request: SkillVfxRequest, material: MeshBasicMaterial): ParticleSystem {
  return new ParticleSystem({
    autoDestroy: false,
    duration: 0.86,
    looping: false,
    startLife: new IntervalValue(0.28, 0.66),
    startSpeed: new IntervalValue(1.4, 3.6),
    startSize: new IntervalValue(0.08, 0.24),
    startColor: new ConstantColor(new QuarksVector4(1, 1, 1, 1)),
    emissionOverTime: new ConstantValue(getSkillArtwork(request.profile.id)?.particleRate ?? 48),
    emissionOverDistance: new ConstantValue(0),
    shape: new ConeEmitter({ radius: 0.2, thickness: 0.72, angle: 0.32 }),
    material,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 7,
    behaviors: [
      new ColorOverLife(createColorGradient(request.colorHex)),
      createShrink(),
      createTurbulence(0.36),
    ],
  });
}

function createResources(): SkillVfxResources {
  const textures = createFireBurstTextures();
  return {
    textures,
    particleMaterials: createFireBurstParticleMaterials(textures),
    coreGeometry: new SphereGeometry(0.16, 12, 8),
    ringGeometry: new RingGeometry(0.34, 0.5, 36),
    beamGeometry: new CylinderGeometry(0.035, 0.12, 1, 8, 1, true),
    arrowGeometry: new ConeGeometry(0.12, 0.44, 8),
    artwork: new SkillArtworkResources(),
  };
}

function directionalFamily(family: SkillVfxProfile["family"]): boolean {
  return family === "projectile" || family === "arrow" || family === "line" || family === "melee";
}

function positionSegment(
  mesh: Mesh,
  start: Vector3,
  end: Vector3,
): void {
  const direction = SEGMENT_DIRECTION.subVectors(end, start);
  const length = Math.max(direction.length(), 0.001);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  mesh.scale.set(1, length, 1);
}

class GenericSkillVfxCast {
  readonly skillId: string;
  private readonly motion: ParticleSystem | null;
  private readonly impact: ParticleSystem | null;
  private readonly aura: ParticleSystem | null;
  private readonly artwork: SkillArtwork | null;
  private readonly scratchPoint = new Vector3();
  private readonly scratchTangent = new Vector3();
  private readonly systems: ParticleSystem[];
  private readonly group = new Group();
  private readonly core: Mesh;
  private readonly ring: Mesh;
  private readonly beam: Mesh;
  private readonly arrow: Mesh;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private readonly lightPool?: TkLightPool;
  private readonly materials: MeshBasicMaterial[] = [];
  private readonly curve: CubicBezierCurve3 | null;
  private readonly impactPoint: Vector3;
  private readonly directional: boolean;
  private readonly family: SkillVfxProfile["family"];
  private readonly duration: number;
  private readonly radius: number;
  private readonly origin: Vector3;
  private readonly target: Vector3;
  private readonly onDispose: () => void;
  private elapsed = 0;
  private phase: "flight" | "impact" | "pulse" = "flight";
  private disposed = false;

  constructor(options: SkillVfxCastOptions) {
    const { scene, batch, root, resources, request, castIndex } = options;
    this.skillId = request.profile.id;
    const family = request.profile.family;
    this.directional = directionalFamily(family);
    this.family = family;
    this.duration = skillVfxDuration(family);
    this.radius = Math.max(0.5, request.radius);
    this.onDispose = options.onDispose;
    this.lightPool = options.lightPool;
    this.origin = request.origin.clone();
    this.target = (request.target ?? request.center).clone();
    this.impactPoint = (this.directional ? this.target : request.center).clone();
    this.curve = this.directional ? this.createCurve(request, castIndex) : null;
    this.group.name = `skill-vfx-${request.profile.id}`;
    root.add(this.group);
    const art = getSkillArtwork(request.profile.id);
    this.artwork = art ? new SkillArtwork(this.group, resources.artwork, art, this.radius, family === "aoe") : null;

    const coreMaterial = createAdditiveMeshMaterial(request.colorHex, 0.86);
    const ringMaterial = createAdditiveMeshMaterial(request.colorHex, 0.78);
    const beamMaterial = createAdditiveMeshMaterial(request.colorHex, 0.56);
    const arrowMaterial = createAdditiveMeshMaterial(request.colorHex, 0.92);
    this.materials.push(coreMaterial, ringMaterial, beamMaterial, arrowMaterial);

    this.core = new Mesh(resources.coreGeometry, coreMaterial);
    this.ring = new Mesh(resources.ringGeometry, ringMaterial);
    this.beam = new Mesh(resources.beamGeometry, beamMaterial);
    this.arrow = new Mesh(resources.arrowGeometry, arrowMaterial);
    this.core.visible = this.directional;
    this.ring.visible = !this.directional;
    this.beam.visible = family === "line" || family === "projectile";
    this.arrow.visible = family === "arrow";
    this.ring.rotation.x = -Math.PI / 2;
    if (this.lightPool) {
      this.light = this.lightPool.acquire(request.colorHex, 6.5);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(request.colorHex, 0, 6.5, 2);
      this.group.add(this.light);
      this.isPooledLight = false;
    }
    this.group.add(this.core, this.ring, this.beam, this.arrow);

    this.motion = this.directional ? createMotionSystem(request, resources.particleMaterials.trail, true) : null;
    this.impact = this.directional || family === "aoe" ? createImpactSystem(request, resources.particleMaterials.fire) : null;
    this.aura = !this.directional ? createAuraSystem(request, resources.particleMaterials.fire) : null;
    this.systems = [this.motion, this.impact, this.aura].filter((system): system is ParticleSystem => system !== null);
    for (const system of this.systems) {
      scene.add(system.emitter);
      batch.addSystem(system);
    }
    this.motion?.play();
    if (this.impact) {
      this.impact.pause();
      this.impact.emitter.visible = false;
    }
    this.aura?.pause();
    if (!this.directional) {
      this.aura!.emitter.position.copy(this.impactPoint);
      this.aura!.emitter.quaternion.setFromUnitVectors(FORWARD, UP);
      this.aura!.emitter.visible = true;
      this.aura!.restart();
      this.aura!.play();
      this.ring.position.copy(this.impactPoint);
      this.core.position.copy(this.impactPoint);
      if (this.light) this.light.position.copy(this.impactPoint);
    } else {
      this.motion!.emitter.position.copy(this.origin);
      this.motion!.emitter.quaternion.setFromUnitVectors(FORWARD, FORWARD);
    }
  }

  getParticleCount(): number {
    return this.systems.reduce((total, system) => total + system.particleNum, 0);
  }

  prepareFrame(): void {
    for (const system of this.systems) system.emitter.updateWorldMatrix(true, false);
  }

  update(deltaTime: number): void {
    if (this.disposed) return;
    this.elapsed += deltaTime;
    if (this.directional) this.updateDirectional();
    else if (this.family === "aoe") this.updateAoe();
    else this.updatePulse();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    this.artwork?.dispose();
    this.group.removeFromParent();
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.light.dispose();
    }
    for (const material of this.materials) material.dispose();
    this.onDispose();
  }

  private createCurve(request: SkillVfxRequest, castIndex: number): CubicBezierCurve3 {
    const direction = this.target.clone().sub(this.origin);
    const distance = Math.max(direction.length(), 0.001);
    direction.normalize();
    const side = new Vector3().crossVectors(direction, UP);
    if (side.lengthSq() < 0.001) side.set(1, 0, 0);
    side.normalize();
    const bend = (((request.profile.seed + castIndex) & 1) === 0 ? 1 : -1) * Math.min(0.32, distance * 0.05);
    const lift = Math.min(1.5, Math.max(0.42, distance * 0.14));
    const controlA = this.origin.clone().addScaledVector(direction, distance * 0.28).addScaledVector(UP, lift).addScaledVector(side, bend);
    const controlB = this.origin.clone().addScaledVector(direction, distance * 0.72).addScaledVector(UP, lift * 0.4).addScaledVector(side, -bend);
    return new CubicBezierCurve3(this.origin.clone(), controlA, controlB, this.target.clone());
  }

  private updateDirectional(): void {
    if (this.phase === "impact") {
      const fade = Math.max(0, 1 - (this.elapsed - this.duration) / 0.7);
      this.core.visible = false;
      this.beam.visible = false;
      this.arrow.visible = false;
      this.ring.scale.setScalar(0.35 + (1 - fade) * 1.8);
      (this.ring.material as MeshBasicMaterial).opacity = 0.9 * fade;
      if (this.light) this.light.intensity = 4.2 * fade;
      this.artwork?.update(this.elapsed, 1 - fade, this.impactPoint, undefined, true);
      if (fade <= 0) this.dispose();
      return;
    }
    const progress = MathUtils.clamp(this.elapsed / this.duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 2);
    const point = this.curve?.getPoint(eased, this.scratchPoint) ?? this.target;
    const tangent = this.curve?.getTangent(eased, this.scratchTangent).normalize() ?? FORWARD;
    this.motion!.emitter.position.copy(point);
    this.motion!.emitter.quaternion.setFromUnitVectors(FORWARD, tangent);
    this.artwork?.update(this.elapsed, progress, point, tangent);
    this.core.position.copy(point);
    this.core.scale.setScalar(0.82 + Math.sin(progress * Math.PI) * 0.34);
    if (this.beam.visible) positionSegment(this.beam, this.origin, point);
    if (this.arrow.visible) {
      this.arrow.position.copy(point);
      this.arrow.quaternion.setFromUnitVectors(UP, tangent);
    }
    if (this.light) {
      this.light.position.copy(point);
      this.light.intensity = 1.4 + Math.sin(progress * Math.PI) * 1.5;
    }
    if (progress >= 1) this.triggerImpact();
  }

  private updateAoe(): void {
    if (this.elapsed >= 0.18 && this.phase !== "impact") this.triggerImpact();
    const impactProgress = MathUtils.clamp((this.elapsed - 0.18) / 0.54, 0, 1);
    this.artwork?.update(this.elapsed, impactProgress, this.impactPoint, undefined, this.phase === "impact");
    if (this.phase === "impact") {
      const fade = Math.max(0, 1 - impactProgress);
      const targetScale = this.radius / 0.5;
      this.ring.scale.setScalar(0.35 + impactProgress * (targetScale - 0.35));
      const ringMaterial = this.ring.material as MeshBasicMaterial;
      ringMaterial.opacity = fade * 0.9;
      if (this.light) this.light.intensity = 4.2 * fade;
    }
    if (this.elapsed >= this.duration) this.dispose();
  }

  private updatePulse(): void {
    const progress = MathUtils.clamp(this.elapsed / this.duration, 0, 1);
    this.artwork?.update(this.elapsed, progress, this.impactPoint, undefined, progress >= 0.75);
    this.ring.scale.setScalar(0.65 + progress * 1.9);
    const ringMaterial = this.ring.material as MeshBasicMaterial;
    ringMaterial.opacity = Math.max(0, 0.8 * (1 - progress));
    if (this.light) this.light.intensity = 1.8 * (1 - progress);
    if (progress >= 0.7) this.phase = "pulse";
    if (progress >= 1) this.dispose();
  }

  private triggerImpact(): void {
    if (this.phase === "impact") return;
    this.phase = "impact";
    this.motion?.endEmit();
    this.impact!.emitter.position.copy(this.impactPoint);
    this.impact!.emitter.visible = true;
    this.impact!.restart();
    this.impact!.play();
    this.ring.visible = true;
    this.ring.position.copy(this.impactPoint);
    this.ring.scale.setScalar(0.35);
    const ringMaterial = this.ring.material as MeshBasicMaterial;
    ringMaterial.opacity = 0.9;
    this.core.visible = true;
    this.core.position.copy(this.impactPoint);
    if (this.light) {
      this.light.position.copy(this.impactPoint);
      this.light.intensity = 4.2;
    }
  }
}

export class SkillVfxDirector {
  private readonly resources = createResources();
  private readonly batch = new BatchedRenderer();
  private readonly root = new Group();
  private readonly casts = new Set<GenericSkillVfxCast>();
  private readonly passiveIds = new Set<string>();
  private readonly passiveActiveIds = new Set<string>();
  private readonly batchResolution = new Vector2(1, 1);
  private accumulator = 0;
  private castIndex = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    private readonly lightPool?: TkLightPool,
  ) {
    this.root.name = "skill-vfx-root";
    this.batch.name = "skill-vfx-batched-renderer";
    this.scene.add(this.root, this.batch);
  }

  play(request: SkillVfxRequest): boolean {
    if (this.disposed || request.profile.family === "chain") return false;
    const vectors = [request.origin, request.center, request.target].filter((value): value is Vector3 => value !== null);
    if (vectors.some(value => !Number.isFinite(value.x) || !Number.isFinite(value.y) || !Number.isFinite(value.z))) return false;
    if (![request.facing, request.range, request.radius, request.colorHex].every(Number.isFinite)) return false;
    if (request.range < 0 || request.radius < 0) return false;
    if (this.casts.size >= MAX_SKILL_VFX_CASTS) {
      const oldest = this.casts.values().next().value as GenericSkillVfxCast | undefined;
      oldest?.dispose();
    }
    const normalized = this.normalizeRequest(request);
    let cast!: GenericSkillVfxCast;
    cast = new GenericSkillVfxCast({
      scene: this.scene,
      batch: this.batch,
      root: this.root,
      resources: this.resources,
      request: normalized,
      castIndex: this.castIndex,
      lightPool: this.lightPool,
      onDispose: () => this.casts.delete(cast),
    });
    this.castIndex += 1;
    this.casts.add(cast);
    return true;
  }

  syncPassives(profiles: SkillVfxProfile[], origin: Vector3): void {
    this.passiveActiveIds.clear();
    for (let i = 0; i < profiles.length; i++) {
      this.passiveActiveIds.add(profiles[i]!.id);
    }
    for (const id of this.passiveIds) {
      if (!this.passiveActiveIds.has(id)) {
        this.passiveIds.delete(id);
        for (const cast of [...this.casts]) {
          if (cast.skillId === id) cast.dispose();
        }
      }
    }
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i]!;
      if (this.passiveIds.has(profile.id)) continue;
      this.passiveIds.add(profile.id);
      this.play({
        profile,
        origin,
        target: null,
        center: origin,
        colorHex: profile.colorHex,
        facing: 0,
        range: profile.range,
        radius: profile.radius,
        hits: [],
        hasHeal: false,
        hasBuff: false,
        hasTransform: false,
        hasSummon: false,
      });
    }
  }

  update(deltaTime: number, width = 1, height = 1): void {
    if (this.disposed || this.casts.size === 0) return;
    const frameDelta = Number.isFinite(deltaTime) ? MathUtils.clamp(deltaTime, 0, 0.1) : 0;
    this.accumulator = Math.min(this.accumulator + frameDelta, 0.2);
    let stepCount = 0;
    while (this.accumulator >= FIXED_STEP && stepCount < 6) {
      for (const cast of this.casts) {
        cast.update(FIXED_STEP);
        cast.prepareFrame();
      }
      this.updateBatchResolution(width, height);
      this.batch.update(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
      stepCount += 1;
    }
  }

  clear(): void {
    for (const cast of [...this.casts]) cast.dispose();
    this.passiveIds.clear();
    this.accumulator = 0;
    this.batch.update(0);
  }

  getActiveCastCount(): number {
    return this.casts.size;
  }

  getParticleCount(): number {
    let count = 0;
    for (const cast of this.casts) count += cast.getParticleCount();
    return count;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.scene.remove(this.root, this.batch);
    for (const batch of this.batch.batches) {
      this.batch.remove(batch);
      batch.dispose();
      if (Array.isArray(batch.material)) {
        for (const material of batch.material) material.dispose();
      } else {
        batch.material.dispose();
      }
    }
    this.batch.batches.length = 0;
    this.batch.systemToBatchIndex.clear();
    this.resources.coreGeometry.dispose();
    this.resources.ringGeometry.dispose();
    this.resources.beamGeometry.dispose();
    this.resources.arrowGeometry.dispose();
    this.resources.artwork.dispose();
    disposeFireBurstParticleMaterials(this.resources.particleMaterials);
    disposeFireBurstTextures(this.resources.textures);
    this.root.clear();
  }

  private normalizeRequest(request: SkillVfxRequest): SkillVfxRequest {
    const origin = request.origin.clone();
    const center = request.center.clone();
    if (request.profile.family === "buff") {
      origin.y = Math.max(origin.y, 0.08);
      center.y = Math.max(center.y, 0.08);
    } else {
      origin.y = Math.max(origin.y, 1.05);
      center.y = Math.max(center.y, 0.18);
    }
    const target = request.target?.clone() ?? null;
    if (target) target.y = Math.max(target.y, 0.82);
    return { ...request, origin, center, target };
  }

  private updateBatchResolution(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    this.batchResolution.set(width, height);
    for (const batch of this.batch.batches) {
      const material = batch.material;
      if (!(material instanceof ShaderMaterial)) continue;
      const resolution = material.uniforms.resolution?.value;
      if (resolution instanceof Vector2) resolution.copy(this.batchResolution);
    }
  }
}

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Group, InstancedMesh, Matrix4, MeshStandardMaterial, Object3D, Scene, Vector3 } from "three";
import { BatchedRenderer } from "three.quarks";
import { SKILL_VFX_CATALOG, getSkillVfxProfile } from "./SkillVfxCatalog";
import { SkillVfxDirector } from "./SkillVfxRuntime";
import type { SkillVfxProfile, SkillVfxRequest } from "./SkillVfxTypes";
import { getSkillArtwork } from "./art/SkillArtworkCatalog";
import { SkillArtwork, SkillArtworkResources } from "./art/SkillArtwork";

const classProfiles = SKILL_VFX_CATALOG.filter(profile => profile.classId !== "TK");
const artworkProfiles = classProfiles.filter(profile => getSkillArtwork(profile.id));
const dedicatedIds = [
  "fm_mag_esfera_ignea", "fm_mag_lanca_glacial", "fm_mag_choque_vital", "fm_mag_picada",
  "fm_mag_tempestade_brasa", "fm_mag_sombra_corrosiva", "fm_mag_nevasca", "fm_mag_colapso",
];
const directions = [
  new Vector3(4, 0, 0), new Vector3(-4, 0, 0),
  new Vector3(0, 0, 4), new Vector3(0, 0, -4),
  new Vector3(3, 0, 3), new Vector3(-3, 0, 3),
  new Vector3(3, 0, -3), new Vector3(-3, 0, -3),
  new Vector3(), new Vector3(0, 4, 0), new Vector3(0, -4, 0),
];
const directors: SkillVfxDirector[] = [];

function createCanvas() {
  const canvas = { width: 1, height: 1 };
  const gradient = () => ({ addColorStop() {} });
  const imageData = (width: number, height: number) => ({
    width, height, data: new Uint8ClampedArray(width * height * 4),
  });
  const context: Record<string, unknown> = {
    canvas,
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    createImageData: imageData,
    getImageData: (_x: number, _y: number, width: number, height: number) => imageData(width, height),
  };
  for (const name of [
    "beginPath", "closePath", "moveTo", "lineTo", "arc", "ellipse", "rect",
    "quadraticCurveTo", "bezierCurveTo", "fill", "stroke", "fillRect", "strokeRect",
    "clearRect", "save", "restore", "translate", "rotate", "scale", "setTransform",
    "drawImage", "putImageData", "setLineDash",
  ]) context[name] = () => {};
  return { ...canvas, getContext: () => context };
}

function setup() {
  const scene = new Scene();
  const director = new SkillVfxDirector(scene);
  directors.push(director);
  const batch = scene.getObjectByName("skill-vfx-batched-renderer") as BatchedRenderer;
  const root = scene.getObjectByName("skill-vfx-root")!;
  return { scene, director, batch, root };
}

function requestFor(profile: SkillVfxProfile, target = new Vector3(4, 0, 0)): SkillVfxRequest {
  const origin = new Vector3();
  return {
    profile, origin, target: target.clone(),
    center: profile.shape === "aoe" || profile.shape === "self" ? origin.clone() : target.clone(),
    colorHex: profile.colorHex, facing: Math.atan2(target.x, target.z),
    range: profile.range, radius: profile.radius,
    hits: profile.kind === "damage"
      ? [{ id: "target", x: target.x, z: target.z, damage: 100, hitIndex: 0 }] : [],
    hasHeal: profile.kind === "heal", hasBuff: profile.kind === "buff",
    hasTransform: profile.kind === "transform", hasSummon: profile.kind === "summon",
  };
}

function advance(director: SkillVfxDirector, seconds: number): number {
  let peakParticles = 0;
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) {
    director.update(1 / 60, 1280, 720);
    peakParticles = Math.max(peakParticles, director.getParticleCount());
  }
  return peakParticles;
}

function emitterCount(scene: Scene): number {
  let count = 0;
  scene.traverse(object => { if (object.type === "ParticleEmitter") count++; });
  return count;
}

function expectFiniteTransforms(scene: Scene) {
  scene.updateMatrixWorld(true);
  const matrix = new Matrix4();
  scene.traverse(object => {
    expect(object.position.toArray().every(Number.isFinite), object.name).toBe(true);
    expect(object.scale.toArray().every(Number.isFinite), object.name).toBe(true);
    expect(object.quaternion.toArray().every(Number.isFinite), object.name).toBe(true);
    expect(object.matrixWorld.elements.every(Number.isFinite), object.name).toBe(true);
    if (object instanceof InstancedMesh) {
      for (let index = 0; index < object.count; index++) {
        object.getMatrixAt(index, matrix);
        expect(matrix.elements.every(Number.isFinite), object.name).toBe(true);
      }
    }
  });
}

function artworkMeshes(root: Object3D): InstancedMesh[] {
  const meshes: InstancedMesh[] = [];
  root.traverse(object => {
    if (object instanceof InstancedMesh && object.name.startsWith("skill-art-")) meshes.push(object);
  });
  return meshes;
}

describe("Ciclo de vida do VFX genérico das classes", () => {
  beforeAll(() => vi.stubGlobal("document", {
    createElement: (name: string) => {
      if (name !== "canvas") throw new Error("Somente canvas é usado pelas texturas do VFX");
      return createCanvas();
    },
  }));
  afterEach(() => {
    for (const director of directors) director.dispose();
    directors.length = 0;
  });
  afterAll(() => vi.unstubAllGlobals());

  it("cobre 64 configurações autorais e preserva as oito FM dedicadas", () => {
    expect(classProfiles).toHaveLength(72);
    expect(artworkProfiles).toHaveLength(64);
    expect(classProfiles.filter(profile => !getSkillArtwork(profile.id)).map(profile => profile.id))
      .toEqual(dedicatedIds);
    for (const profile of artworkProfiles) {
      const art = getSkillArtwork(profile.id)!;
      expect(Number.isInteger(art.count)).toBe(true);
      expect(art.count).toBeGreaterThan(0);
      expect(art.count).toBeLessThanOrEqual(12);
      expect(art.particleRate).toBeGreaterThan(0);
      expect(art.particleRate).toBeLessThanOrEqual(60);
      expect([art.color, art.accent, art.scale, art.spread, art.spin, art.lift, art.particleRate]
        .every(Number.isFinite)).toBe(true);
    }
    for (const id of dedicatedIds) expect(getSkillVfxProfile(id)?.dedicatedVfx).toBeTruthy();
  });

  it.each(artworkProfiles)("$id mantém matrizes finitas nas onze direções e limpa sem clear", profile => {
    const { scene, director, batch, root } = setup();
    for (const target of directions) {
      expect(director.play(requestFor(profile, target))).toBe(true);
      let layers = 1;
      let secondary = getSkillArtwork(profile.id)!.secondary;
      while (secondary) {
        layers++;
        secondary = secondary.secondary;
      }
      expect(artworkMeshes(root)).toHaveLength(layers);
      expect(artworkMeshes(root)[0].count).toBe(getSkillArtwork(profile.id)!.count);
      let particles = 0;
      for (const duration of [0.05, 0.15, 0.3, 0.4, 0.6, 1.5]) {
        particles = Math.max(particles, advance(director, duration));
        expectFiniteTransforms(scene);
      }
      expect(particles).toBeGreaterThan(0);
      expect(director.getActiveCastCount()).toBe(0);
      expect(director.getParticleCount()).toBe(0);
      expect(emitterCount(scene)).toBe(0);
      expect(batch.systemToBatchIndex.size).toBe(0);
      expect(root.children).toHaveLength(0);
    }
  }, 20000);

  it("limita oito casts e remove emissores da salva descartada", () => {
    const { scene, director, batch, root } = setup();
    const profile = getSkillVfxProfile("ht_fis_rapid_hit")!;
    for (let cast = 0; cast < 20; cast++) {
      expect(director.play(requestFor(profile))).toBe(true);
      expect(director.getActiveCastCount()).toBeLessThanOrEqual(8);
      expect(root.children.length).toBeLessThanOrEqual(8);
      expect(emitterCount(scene)).toBeLessThanOrEqual(16);
      expect(batch.systemToBatchIndex.size).toBeLessThanOrEqual(16);
    }
    expect(director.getActiveCastCount()).toBe(8);
    expect(advance(director, 0.2)).toBeGreaterThan(0);
    advance(director, 3);
    expect(director.getActiveCastCount()).toBe(0);
    expect(emitterCount(scene)).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
  });

  it.each(artworkProfiles.filter(profile => profile.shape === "self"))(
    "$id mantém aura no personagem em vez do ponto de mira",
    profile => {
      const { scene, director } = setup();
      director.play(requestFor(profile, new Vector3(8, 0, 0)));
      advance(director, 0.1);
      const emitter = scene.children.find(object => object.type === "ParticleEmitter")!;
      expect(emitter.position.x).toBe(0);
      expect(emitter.position.z).toBe(0);
    },
  );

  it.each(directions.filter(direction => direction.lengthSq() > 0))(
    "alinha flecha e rastros à tangente (%s) sem inverter a cauda",
    direction => {
      const group = new Group();
      const resources = new SkillArtworkResources();
      const artwork = new SkillArtwork(group, resources, getSkillArtwork("ht_fis_rapid_hit")!, 8, false);
      try {
        const tangent = direction.clone().normalize();
        const center = new Vector3(0, 3, 0);
        artwork.update(0.25, 0.5, center, tangent);
        const mesh = artworkMeshes(group)[1];
        const matrix = new Matrix4();
        const positions: Vector3[] = [];
        for (let index = 0; index < mesh.count; index++) {
          mesh.getMatrixAt(index, matrix);
          positions.push(new Vector3().setFromMatrixPosition(matrix));
          const forward = new Vector3().setFromMatrixColumn(matrix, 1).normalize();
          expect(forward.dot(tangent)).toBeCloseTo(1, 5);
        }
        const tail = positions[positions.length - 1].clone().sub(positions[0]);
        expect(tail.dot(tangent)).toBeCloseTo(-(mesh.count - 1) * 0.16, 5);
      } finally {
        artwork.dispose();
        resources.dispose();
      }
    },
  );

  it("doze ciclos reutilizam batches e liberam sistemas e emissores", () => {
    const { scene, director, batch, root } = setup();
    const profiles = ["ht_fis_rapid_hit", "bm_ctrl_condor", "fm_ctrl_cura"]
      .map(id => getSkillVfxProfile(id))
      .filter((profile): profile is SkillVfxProfile => profile != null);
    expect(profiles).toHaveLength(3);
    let stableBatches = 0;
    let stableSceneNodes = 0;
    for (let cycle = 0; cycle < 12; cycle++) {
      for (const profile of profiles) director.play(requestFor(profile));
      expect(advance(director, 0.3)).toBeGreaterThan(0);
      advance(director, 3);
      expect(director.getActiveCastCount()).toBe(0);
      expect(director.getParticleCount()).toBe(0);
      expect(emitterCount(scene)).toBe(0);
      expect(batch.systemToBatchIndex.size).toBe(0);
      expect(root.children).toHaveLength(0);
      let nodes = 0;
      scene.traverse(() => nodes++);
      if (cycle === 0) {
        stableBatches = batch.batches.length;
        stableSceneNodes = nodes;
      }
      expect(batch.batches.length).toBe(stableBatches);
      expect(nodes).toBe(stableSceneNodes);
    }
  });

  it("compartilha geometria, isola opacidade e descarta cada recurso no seu owner", () => {
    const { director, root, scene } = setup();
    const profile = getSkillVfxProfile("ht_fis_rapid_hit")!;
    director.play(requestFor(profile));
    advance(director, 0.3);
    director.play(requestFor(profile, new Vector3(0, 0, 4)));
    advance(director, 0.05);
    const [first, second] = artworkMeshes(root).filter(mesh => mesh.name === "skill-art-arrow");
    expect(first.geometry).toBe(second.geometry);
    expect(first.material).not.toBe(second.material);
    expect(first.material).toBeInstanceOf(MeshStandardMaterial);
    const geometryDisposed = vi.fn();
    const materialDisposed = vi.fn();
    first.geometry.addEventListener("dispose", geometryDisposed);
    (first.material as MeshStandardMaterial).addEventListener("dispose", materialDisposed);
    advance(director, 1);
    expect(director.getActiveCastCount()).toBe(1);
    expect(geometryDisposed).not.toHaveBeenCalled();
    expect(materialDisposed).toHaveBeenCalledOnce();
    expectFiniteTransforms(scene);
    advance(director, 2);
    expect(director.getActiveCastCount()).toBe(0);
    expect(geometryDisposed).not.toHaveBeenCalled();
    expect(materialDisposed).toHaveBeenCalledOnce();
    director.dispose();
    expect(geometryDisposed).toHaveBeenCalledOnce();
    expect(materialDisposed).toHaveBeenCalledOnce();
    expect(scene.children).toHaveLength(0);
    director.dispose();
    expect(geometryDisposed).toHaveBeenCalledOnce();
    expect(director.play(requestFor(profile))).toBe(false);
  });

  it.each([NaN, Infinity, -Infinity])("rejeita coordenada %s sem criar cast ou emissor", invalid => {
    const { scene, director, batch, root } = setup();
    const profile = getSkillVfxProfile("ht_fis_tiro_certeiro")!;
    for (const field of ["origin", "target", "center"] as const) {
      const request = requestFor(profile);
      request[field]!.x = invalid;
      expect(director.play(request)).toBe(false);
      expect(director.getActiveCastCount()).toBe(0);
      expect(root.children).toHaveLength(0);
      expect(emitterCount(scene)).toBe(0);
      expect(batch.systemToBatchIndex.size).toBe(0);
    }
  });
});

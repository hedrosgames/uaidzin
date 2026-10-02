import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Mesh, MeshBasicMaterial, Scene, Vector3 } from "three";
import { HT_FISICA, HT_CONTROLE, HT_MAGIA } from "../../../data/classes/skills/ht";
import {
  HT_ATLAS_DEFS,
  HT_DEDICATED_VFX_BY_SKILL_ID,
  isHtDedicatedVfx,
} from "./HtAtlasDefs";
import { HtAtlasVfxController } from "./HtAtlasVfx";
import { EffectManager } from "../EffectManager";
import { getSkillVfxProfile } from "../skill/SkillVfxCatalog";
import type { SkillVfxRequest } from "../skill/SkillVfxTypes";
import { htSkillVfxDuration, skillVfxImpactDelay } from "../skill/SkillVfxTiming";

function canvas() {
  const result = { width: 1, height: 1, getContext: () => context };
  const gradient = () => ({ addColorStop() {} });
  const imageData = (width: number, height: number) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) });
  const context = new Proxy<Record<string, unknown>>({
    canvas: result,
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    createImageData: imageData,
    getImageData: (_x: number, _y: number, width: number, height: number) => imageData(width, height),
  }, { get: (target, property: string) => target[property] ?? (() => {}) });
  return result;
}

const ALL_HT_SKILLS = [...HT_FISICA, ...HT_CONTROLE, ...HT_MAGIA];
const ALL_HT_DEDICATED_IDS = Object.values(HT_DEDICATED_VFX_BY_SKILL_ID);

describe("Huntress (HT) Dedicated Atlas VFX", () => {
  const controllers: HtAtlasVfxController[] = [];
  const effectManagers: EffectManager[] = [];

  beforeEach(() => {
    vi.stubGlobal("document", {
      createElement: (name: string) => (name === "canvas" ? canvas() : {
        style: {},
        appendChild() {},
        remove() {},
        setAttribute() {},
        classList: { add() {}, remove() {}, toggle() {} },
        src: "",
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      createElementNS: (_ns: string, name: string) => (name === "canvas" ? canvas() : {
        style: {},
        appendChild() {},
        remove() {},
        setAttribute() {},
        classList: { add() {}, remove() {}, toggle() {} },
        src: "",
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
  });

  afterEach(() => {
    for (const ctrl of controllers) ctrl.dispose();
    controllers.length = 0;
    for (const em of effectManagers) em.dispose();
    effectManagers.length = 0;
    vi.unstubAllGlobals();
  });

  it("mapeia todas as 24 skills da Huntress para VFX dedicados com configuração válida", () => {
    expect(ALL_HT_SKILLS).toHaveLength(24);
    expect(ALL_HT_DEDICATED_IDS).toHaveLength(24);

    for (const skill of ALL_HT_SKILLS) {
      const dedicatedId = HT_DEDICATED_VFX_BY_SKILL_ID[skill.id];
      expect(dedicatedId).toBeDefined();
      expect(isHtDedicatedVfx(dedicatedId)).toBe(true);

      const def = HT_ATLAS_DEFS[dedicatedId];
      expect(def).toBeDefined();
      expect(def.skillId).toBe(skill.id);
      expect(def.atlasUrl).toBeTruthy();
      expect(def.duration).toBeGreaterThan(0);
      expect(def.frameCount).toBe(16);
      expect(def.width).toBeGreaterThan(0);
      expect(def.height).toBeGreaterThan(0);
      expect(Number.isFinite(def.tint)).toBe(true);

      const profile = getSkillVfxProfile(skill.id);
      expect(profile).toBeDefined();
      expect(profile?.dedicatedVfx).toBe(dedicatedId);
    }
  });

  it("executa e limpa o ciclo de vida de cada um dos 24 casts sem deixar resíduos", () => {
    const scene = new Scene();
    const controller = new HtAtlasVfxController(scene);
    controllers.push(controller);

    for (const dedicatedId of ALL_HT_DEDICATED_IDS) {
      const def = HT_ATLAS_DEFS[dedicatedId];
      const origin = new Vector3(0, 0, 0);
      const target = new Vector3(5, 0, 3);

      controller.cast(dedicatedId, origin, target, 2);
      expect(controller.getActiveCastCount()).toBeGreaterThanOrEqual(1);
      expect(controller.getParticleCount()).toBeGreaterThanOrEqual(2);

      const steps = Math.ceil((def.duration + 0.4) * 60);
      for (let i = 0; i < steps; i++) {
        controller.update(1 / 60);
      }

      expect(controller.getActiveCastCount()).toBe(0);
      expect(controller.getParticleCount()).toBe(0);
    }
  });

  it("mantém matrizes e vetores finitos em diversas direções de disparo", () => {
    const scene = new Scene();
    const controller = new HtAtlasVfxController(scene);
    controllers.push(controller);

    const testDirections = [
      new Vector3(6, 0, 0),
      new Vector3(-6, 0, 0),
      new Vector3(0, 0, 6),
      new Vector3(0, 0, -6),
      new Vector3(4, 0, 4),
      new Vector3(-4, 0, 4),
      new Vector3(0, 0, 0),
    ];

    for (const dir of testDirections) {
      controller.cast("ht-tiro-certeiro", new Vector3(0, 0, 0), dir, 1);
      controller.cast("ht-flecha-ignea", new Vector3(0, 0, 0), dir, 1);
      controller.cast("ht-chuva-mistica", new Vector3(0, 0, 0), dir, 3.8);

      for (let frame = 0; frame < 15; frame++) {
        controller.update(1 / 60);
        scene.updateMatrixWorld(true);
        scene.traverse((obj) => {
          expect(Number.isFinite(obj.position.x)).toBe(true);
          expect(Number.isFinite(obj.position.y)).toBe(true);
          expect(Number.isFinite(obj.position.z)).toBe(true);
          expect(Number.isFinite(obj.scale.x)).toBe(true);
          expect(Number.isFinite(obj.scale.y)).toBe(true);
          expect(Number.isFinite(obj.scale.z)).toBe(true);
          expect(Number.isFinite(obj.quaternion.x)).toBe(true);
          expect(Number.isFinite(obj.quaternion.y)).toBe(true);
          expect(Number.isFinite(obj.quaternion.z)).toBe(true);
          expect(Number.isFinite(obj.quaternion.w)).toBe(true);
        });
      }

      controller.clear();
      expect(controller.getActiveCastCount()).toBe(0);
    }
  });

  it("respeita o limite de concorrência e remove os casts mais antigos", () => {
    const scene = new Scene();
    const controller = new HtAtlasVfxController(scene);
    controllers.push(controller);

    const def = HT_ATLAS_DEFS["ht-tiro-certeiro"];
    for (let i = 0; i < 20; i++) {
      controller.cast("ht-tiro-certeiro", new Vector3(0, 0, 0), new Vector3(4, 0, 0), 1);
      expect(controller.getActiveCastCount()).toBeLessThanOrEqual(def.maxConcurrentCasts + 1);
    }

    controller.clear();
    expect(controller.getActiveCastCount()).toBe(0);
  });

  it("despacha e integra através do EffectManager sem vazamento de recursos", () => {
    const parent = document.createElement("div");
    const scene = new Scene();
    const em = new EffectManager(parent, scene);
    effectManagers.push(em);

    for (const skill of ALL_HT_SKILLS) {
      const profile = getSkillVfxProfile(skill.id);
      expect(profile).toBeDefined();
      if (!profile) continue;

      const request: SkillVfxRequest = {
        profile,
        origin: new Vector3(0, 0, 0),
        target: new Vector3(4, 0, 2),
        center: new Vector3(4, 0, 2),
        colorHex: profile.colorHex,
        facing: 0,
        range: profile.range,
        radius: profile.radius,
        hits: [],
        hasHeal: false,
        hasBuff: profile.family === "buff",
        hasTransform: false,
        hasSummon: false,
      };

      em.dispatchSkillVfx(request);
      const state = em.getSkillVfxState();
      expect(state.active).toBeGreaterThan(0);
      expect(state.particles).toBeGreaterThan(0);

      em.update(0.1, { position: new Vector3(0, 5, 10), project: () => new Vector3() } as any, 1920, 1080);
    }

    em.dispose();
  });

  it("limpa os casts ativos da Huntress ao chamar clearSkillVfx", () => {
    const parent = document.createElement("div");
    const scene = new Scene();
    const em = new EffectManager(parent, scene);
    effectManagers.push(em);

    const profile = getSkillVfxProfile("ht_fis_tiro_certeiro");
    expect(profile).toBeDefined();
    if (!profile) return;

    em.dispatchSkillVfx({
      profile,
      origin: new Vector3(0, 0, 0),
      target: new Vector3(5, 0, 0),
      center: new Vector3(5, 0, 0),
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

    expect(em.getSkillVfxState().active).toBeGreaterThan(0);
    expect(em.getHtAtlas().getActiveCastCount()).toBeGreaterThan(0);

    em.clearSkillVfx();

    expect(em.getSkillVfxState().active).toBe(0);
    expect(em.getHtAtlas().getActiveCastCount()).toBe(0);
  });

  it("posiciona golpes corporais na posição do alvo em vez da origem", () => {
    const scene = new Scene();
    const controller = new HtAtlasVfxController(scene);
    controllers.push(controller);

    const origin = new Vector3(0, 0, 0);
    const target = new Vector3(3, 0, 2);

    controller.cast("ht-garra", origin, target, 1);
    expect(controller.getActiveCastCount()).toBe(1);

    const castObj = scene.getObjectByName("ht-cast-ht-garra");
    expect(castObj).toBeDefined();
    expect(castObj!.position.x).toBeCloseTo(3, 2);
    expect(castObj!.position.z).toBeCloseTo(2, 2);
    expect(castObj!.position.y).toBeCloseTo(HT_ATLAS_DEFS["ht-garra"].heightOffset, 2);
  });

  it("mantém a flecha no alvo durante a fase de impacto após o voo", () => {
    const scene = new Scene();
    const controller = new HtAtlasVfxController(scene);
    controllers.push(controller);

    const origin = new Vector3(0, 0, 0);
    const target = new Vector3(8, 0, 0);

    controller.cast("ht-tiro-certeiro", origin, target, 1);
    const castObj = scene.getObjectByName("ht-cast-ht-tiro-certeiro");
    expect(castObj).toBeDefined();

    const def = HT_ATLAS_DEFS["ht-tiro-certeiro"];
    controller.update(def.duration * 0.6);
    expect(castObj!.position.x).toBeCloseTo(8, 1);

    controller.update(def.duration * 0.2);
    expect(castObj!.position.x).toBeCloseTo(8, 1);
  });

  it("isola os materiais entre o plano principal e o cross-plane", () => {
    const scene = new Scene();
    const controller = new HtAtlasVfxController(scene);
    controllers.push(controller);

    controller.cast("ht-tiro-certeiro", new Vector3(0, 0, 0), new Vector3(5, 0, 0), 1);
    const mainMesh = scene.getObjectByName("ht-atlas-ht-tiro-certeiro") as Mesh;
    expect(mainMesh).toBeDefined();

    const parent = mainMesh.parent;
    expect(parent).toBeDefined();

    const crossMesh = parent!.children.find((child) => child !== mainMesh && child instanceof Mesh && child.rotation.x === Math.PI / 2) as Mesh;
    expect(crossMesh).toBeDefined();
    expect(mainMesh.material).not.toBe(crossMesh.material);

    controller.update(0.025);

    const mainMat = mainMesh.material as MeshBasicMaterial;
    const crossMat = crossMesh.material as MeshBasicMaterial;
    expect(mainMat.opacity).toBeCloseTo(0.5, 2);
    expect(crossMat.opacity).toBeCloseTo(0.5 * 0.85, 2);
    expect(mainMat.opacity).not.toBe(crossMat.opacity);
  });

  it("calcula timing e impacto de todas as skills de HT em SkillVfxTiming e Catalog", () => {
    for (const skill of ALL_HT_SKILLS) {
      const dedicatedId = HT_DEDICATED_VFX_BY_SKILL_ID[skill.id];
      const duration = htSkillVfxDuration(dedicatedId);
      expect(duration).toBeGreaterThan(0);

      const profile = getSkillVfxProfile(skill.id);
      expect(profile).toBeDefined();
      if (!profile) continue;

      const request: SkillVfxRequest = {
        profile,
        origin: new Vector3(0, 0, 0),
        target: new Vector3(5, 0, 0),
        center: new Vector3(5, 0, 0),
        colorHex: profile.colorHex,
        facing: 0,
        range: profile.range,
        radius: profile.radius,
        hits: [],
        hasHeal: false,
        hasBuff: profile.family === "buff",
        hasTransform: false,
        hasSummon: false,
      };

      const delay = skillVfxImpactDelay(request);
      const def = HT_ATLAS_DEFS[dedicatedId];
      if (def.mode === "aoe") {
        expect(delay).toBe(0.18);
      } else if (def.mode === "self") {
        expect(delay).toBe(0);
      } else if (!def.travel) {
        expect(delay).toBe(0.3);
      } else {
        expect(delay).toBe(0.5);
      }
    }

    const rapidProfile = getSkillVfxProfile("ht_fis_rapid_hit");
    expect(rapidProfile?.family).toBe("arrow");
  });
});

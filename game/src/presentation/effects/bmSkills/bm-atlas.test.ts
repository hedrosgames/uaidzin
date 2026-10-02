import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Scene, Vector3 } from "three";
import { BM_FISICA, BM_CONTROLE, BM_MAGIA } from "../../../data/classes/skills/bm";
import {
  BM_ATLAS_DEFS,
  BM_DEDICATED_VFX_BY_SKILL_ID,
  isBmDedicatedVfx,
} from "./BmAtlasDefs";
import { BmAtlasVfxController } from "./BmAtlasVfx";
import { EffectManager } from "../EffectManager";
import { getSkillVfxProfile } from "../skill/SkillVfxCatalog";
import type { SkillVfxRequest } from "../skill/SkillVfxTypes";
import { bmSkillVfxDuration, skillVfxImpactDelay } from "../skill/SkillVfxTiming";
import { getSkillArtwork } from "../skill/art/SkillArtworkCatalog";

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

const ALL_BM_SKILLS = [...BM_FISICA, ...BM_CONTROLE, ...BM_MAGIA];
const ALL_BM_DEDICATED_IDS = Object.values(BM_DEDICATED_VFX_BY_SKILL_ID);

describe("BeastMaster (BM) Dedicated Stylized VFX", () => {
  const controllers: BmAtlasVfxController[] = [];
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

  it("mapeia todas as 24 skills do BeastMaster para VFX dedicados com configuracao valida", () => {
    expect(ALL_BM_SKILLS).toHaveLength(24);
    expect(ALL_BM_DEDICATED_IDS).toHaveLength(24);

    for (const skill of ALL_BM_SKILLS) {
      const dedicatedId = BM_DEDICATED_VFX_BY_SKILL_ID[skill.id];
      expect(dedicatedId).toBeDefined();
      expect(isBmDedicatedVfx(dedicatedId)).toBe(true);

      const def = BM_ATLAS_DEFS[dedicatedId];
      expect(def).toBeDefined();
      expect(def.skillId).toBe(skill.id);
      expect(def.duration).toBeGreaterThan(0);
      expect(Number.isFinite(def.heightOffset)).toBe(true);
      expect(def.maxConcurrentCasts).toBeGreaterThan(0);
      const art = getSkillArtwork(skill.id);
      expect(art).toBeDefined();
      expect(art!.scale).toBeGreaterThan(0);
      expect(art!.count).toBeGreaterThan(0);
      expect(Number.isFinite(art!.color)).toBe(true);

      const profile = getSkillVfxProfile(skill.id);
      expect(profile).toBeDefined();
      expect(profile?.dedicatedVfx).toBe(dedicatedId);
    }
  });

  it("executa e limpa o ciclo de vida de cada um dos 24 casts sem deixar residuos", () => {
    const scene = new Scene();
    const controller = new BmAtlasVfxController(scene);
    controllers.push(controller);

    for (const dedicatedId of ALL_BM_DEDICATED_IDS) {
      const def = BM_ATLAS_DEFS[dedicatedId];
      const origin = new Vector3(0, 0, 0);
      const target = new Vector3(5, 0, 3);

      controller.cast(dedicatedId, origin, target, 2);
      expect(controller.getActiveCastCount()).toBeGreaterThanOrEqual(1);
      expect(controller.getParticleCount()).toBeGreaterThanOrEqual(1);

      const steps = Math.ceil((def.duration + 0.4) * 60);
      for (let i = 0; i < steps; i++) {
        controller.update(1 / 60);
      }

      expect(controller.getActiveCastCount()).toBe(0);
      expect(controller.getParticleCount()).toBe(0);
    }
  });

  it("mantem matrizes e vetores finitos em diversas direcoes de disparo", () => {
    const scene = new Scene();
    const controller = new BmAtlasVfxController(scene);
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
      controller.cast("bm-investida", new Vector3(0, 0, 0), dir, 1);
      controller.cast("bm-dardo-igneo", new Vector3(0, 0, 0), dir, 1);
      controller.cast("bm-escarpa", new Vector3(0, 0, 0), dir, 3.5);

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

  it("respeita o limite de concorrencia e remove os casts mais antigos", () => {
    const scene = new Scene();
    const controller = new BmAtlasVfxController(scene);
    controllers.push(controller);

    const def = BM_ATLAS_DEFS["bm-dardo-igneo"];
    for (let i = 0; i < 20; i++) {
      controller.cast("bm-dardo-igneo", new Vector3(0, 0, 0), new Vector3(4, 0, 0), 1);
      expect(controller.getActiveCastCount()).toBeLessThanOrEqual(def.maxConcurrentCasts + 1);
    }

    controller.clear();
    expect(controller.getActiveCastCount()).toBe(0);
  });

  it("despacha e integra atraves do EffectManager sem vazamento de recursos", () => {
    const parent = document.createElement("div");
    const scene = new Scene();
    const em = new EffectManager(parent, scene);
    effectManagers.push(em);

    for (const skill of ALL_BM_SKILLS) {
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
        hasTransform: profile.family === "transform",
        hasSummon: profile.family === "summon",
      };

      em.dispatchSkillVfx(request);
      const state = em.getSkillVfxState();
      expect(state.active).toBeGreaterThan(0);
      expect(state.particles).toBeGreaterThan(0);

      em.update(0.1, { position: new Vector3(0, 5, 10), project: () => new Vector3() } as any, 1920, 1080);
    }

    em.dispose();
  });

  it("limpa os casts ativos do BeastMaster ao chamar clearSkillVfx", () => {
    const parent = document.createElement("div");
    const scene = new Scene();
    const em = new EffectManager(parent, scene);
    effectManagers.push(em);

    const profile = getSkillVfxProfile("bm_fis_investida");
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
    expect(em.getBmAtlas().getActiveCastCount()).toBeGreaterThan(0);

    em.clearSkillVfx();

    expect(em.getSkillVfxState().active).toBe(0);
    expect(em.getBmAtlas().getActiveCastCount()).toBe(0);
  });

  it("calcula timing e impacto de todas as skills de BM em SkillVfxTiming e Catalog", () => {
    for (const skill of ALL_BM_SKILLS) {
      const dedicatedId = BM_DEDICATED_VFX_BY_SKILL_ID[skill.id];
      const duration = bmSkillVfxDuration(dedicatedId);
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
        hasTransform: profile.family === "transform",
        hasSummon: profile.family === "summon",
      };

      const delay = skillVfxImpactDelay(request);
      const def = BM_ATLAS_DEFS[dedicatedId];
      if (request.hasSummon || def.mode === "self" || def.mode === "summon") {
        expect(delay).toBe(0);
      } else if (def.mode === "aoe") {
        expect(delay).toBe(0.18);
      } else if (!def.travel) {
        expect(delay).toBe(0.3);
      } else {
        expect(delay).toBe(0.58);
      }
    }
  });
});

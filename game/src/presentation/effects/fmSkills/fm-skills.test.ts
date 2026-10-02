import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera, Scene, Vector3 } from "three";
import { FM_FISICA, FM_CONTROLE, FM_MAGIA } from "../../../data/classes/skills/fm";
import { EffectManager } from "../EffectManager";
import {
  FM_DEDICATED_VFX_BY_SKILL_ID,
  getSkillVfxProfile,
} from "../skill/SkillVfxCatalog";
import { skillVfxDuration, skillVfxImpactDelay } from "../skill/SkillVfxTiming";
import type { SkillVfxRequest } from "../skill/SkillVfxTypes";
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

const ALL_FM_SKILLS = [...FM_FISICA, ...FM_CONTROLE, ...FM_MAGIA];
const EXPECTED_DEDICATED_IDS = [
  "esfera-ignea",
  "lanca-glacial",
  "choque-vital",
  "picada-peconhenta",
  "tempestade-brasa",
  "sombra-corrosiva",
  "nevasca",
  "colapso-elemental",
];

describe("Foema (FM) Skills VFX Suite", () => {
  const effectManagers: EffectManager[] = [];

  beforeEach(() => {
    vi.stubGlobal("Path2D", class {
      moveTo() {}
      lineTo() {}
      closePath() {}
      bezierCurveTo() {}
      quadraticCurveTo() {}
      arc() {}
      ellipse() {}
      rect() {}
    });
    vi.stubGlobal("document", {
      createElement: (name: string) => (name === "canvas" ? canvas() : {
        style: {},
        appendChild() {},
        remove() {},
        setAttribute() {},
        classList: { add() {}, remove() {}, toggle() {} },
      }),
    });
  });

  afterEach(() => {
    for (const em of effectManagers) em.dispose();
    effectManagers.length = 0;
    vi.unstubAllGlobals();
  });

  it("mapeia todas as 24 skills de Foema com perfis válidos no catálogo", () => {
    expect(ALL_FM_SKILLS).toHaveLength(24);
    expect(Object.keys(FM_DEDICATED_VFX_BY_SKILL_ID)).toHaveLength(8);

    for (const skill of ALL_FM_SKILLS) {
      const profile = getSkillVfxProfile(skill.id);
      expect(profile).toBeDefined();
      expect(profile?.classId).toBe("FM");
      expect(profile?.name).toBe(skill.name);
      expect(profile?.kind).toBe(skill.kind);
      expect(profile?.shape).toBe(skill.shape);
      expect(Number.isFinite(profile?.colorHex)).toBe(true);
      expect(profile?.range).toBe(skill.range);
      expect(profile?.radius).toBeGreaterThan(0);

      if (skill.id in FM_DEDICATED_VFX_BY_SKILL_ID) {
        expect(profile?.dedicatedVfx).toBe(FM_DEDICATED_VFX_BY_SKILL_ID[skill.id]);
        expect(EXPECTED_DEDICATED_IDS).toContain(profile?.dedicatedVfx);
      } else {
        expect(profile?.dedicatedVfx).toBeUndefined();
        const art = getSkillArtwork(skill.id);
        expect(art).toBeDefined();
        expect(art?.motif).toBeTruthy();
        expect(Number.isFinite(art?.color)).toBe(true);
        expect(Number.isFinite(art?.accent)).toBe(true);
        expect(art!.count).toBeGreaterThan(0);
        expect(art!.particleRate).toBeGreaterThan(0);
      }
    }
  });

  it("calcula delays de impacto consistentes para as 24 skills de Foema", () => {
    const origin = new Vector3(0, 1.05, 0);
    const target = new Vector3(5, 0.9, 0);

    for (const skill of ALL_FM_SKILLS) {
      const profile = getSkillVfxProfile(skill.id)!;
      const request: SkillVfxRequest = {
        profile,
        origin,
        target,
        center: profile.shape === "aoe" ? target : origin,
        colorHex: profile.colorHex,
        facing: 0,
        range: profile.range,
        radius: profile.radius,
        hits: [],
        hasHeal: profile.kind === "heal",
        hasBuff: profile.kind === "buff",
        hasTransform: profile.kind === "transform",
        hasSummon: profile.kind === "summon",
      };

      const delay = skillVfxImpactDelay(request);
      expect(Number.isFinite(delay)).toBe(true);
      expect(delay).toBeGreaterThanOrEqual(0);

      if (profile.kind === "buff" || profile.kind === "heal" || profile.kind === "passive") {
        expect(delay).toBe(0);
      } else if (profile.dedicatedVfx === "tempestade-brasa") {
        expect(delay).toBeCloseTo(0.18, 5);
      } else if (profile.dedicatedVfx === "nevasca") {
        expect(delay).toBeCloseTo(0.14, 5);
      } else if (profile.dedicatedVfx === "colapso-elemental") {
        expect(delay).toBeCloseTo(0.16, 5);
      } else if (profile.dedicatedVfx) {
        expect(delay).toBeGreaterThan(0.1);
        expect(delay).toBeLessThan(1.0);
      } else if (profile.family === "aoe") {
        expect(delay).toBeCloseTo(0.18, 5);
      } else if (profile.family === "projectile") {
        expect(delay).toBeCloseTo(skillVfxDuration("projectile"), 5);
      }
    }
  });

  it("despacha todas as 24 skills pelo EffectManager, registra estado e limpa com clearSkillVfx", () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera();
    const effects = new EffectManager({ appendChild() {} } as unknown as HTMLElement, scene);
    effectManagers.push(effects);

    for (const skill of ALL_FM_SKILLS) {
      if (skill.kind === "passive") continue;
      const profile = getSkillVfxProfile(skill.id)!;
      const origin = new Vector3(-2, 1.05, 0);
      const target = new Vector3(2, 0.9, 0);

      effects.dispatchSkillVfx({
        profile,
        origin,
        target,
        center: profile.shape === "aoe" ? target : origin,
        colorHex: profile.colorHex,
        facing: 0,
        range: profile.range,
        radius: profile.radius,
        hits: [],
        hasHeal: profile.kind === "heal",
        hasBuff: profile.kind === "buff",
        hasTransform: profile.kind === "transform",
        hasSummon: profile.kind === "summon",
      });

      expect(effects.getSkillVfxState().active).toBeGreaterThan(0);
      for (let frame = 0; frame < 6; frame++) effects.update(1 / 60, camera, 1280, 720);
      expect(effects.getSkillVfxState().particles).toBeGreaterThan(0);

      effects.clearSkillVfx();
      expect(effects.getSkillVfxState().active).toBe(0);
      expect(effects.getSkillVfxState().particles).toBe(0);
    }
  });

  it("sincroniza a passiva Mestre do Arco e limpa ao desequipar", () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera();
    const effects = new EffectManager({ appendChild() {} } as unknown as HTMLElement, scene);
    effectManagers.push(effects);

    const mestreArco = ALL_FM_SKILLS.find(s => s.id === "fm_fis_mestre_arco")!;
    expect(mestreArco).toBeDefined();

    const origin = new Vector3(1, 0, 1);
    effects.syncPassiveVfx([mestreArco], origin);
    expect(effects.getSkillVfxState().active).toBe(1);

    for (let frame = 0; frame < 6; frame++) effects.update(1 / 60, camera, 1280, 720);
    expect(effects.getSkillVfxState().particles).toBeGreaterThan(0);

    effects.syncPassiveVfx([], origin);
    expect(effects.getSkillVfxState().active).toBe(0);
    expect(effects.getSkillVfxState().particles).toBe(0);
  });

  it("aquece todas as skills de Foema por árvore e limpa sem vazamento de emissores", () => {
    const scene = new Scene();
    const effects = new EffectManager({ appendChild() {} } as unknown as HTMLElement, scene);
    effectManagers.push(effects);

    effects.warmSkills(FM_FISICA, 0, 0);
    expect(effects.getSkillVfxState().active).toBe(7);
    effects.clearSkillVfx();
    expect(effects.getSkillVfxState().active).toBe(0);

    effects.warmSkills(FM_CONTROLE, 0, 0);
    expect(effects.getSkillVfxState().active).toBe(8);
    effects.clearSkillVfx();
    expect(effects.getSkillVfxState().active).toBe(0);

    effects.warmSkills(FM_MAGIA, 0, 0);
    expect(effects.getSkillVfxState().active).toBe(8);
    effects.clearSkillVfx();
    expect(effects.getSkillVfxState().active).toBe(0);

    let emitterCount = 0;
    scene.traverse((object) => {
      if (object.type === "ParticleEmitter") emitterCount++;
    });
    expect(emitterCount).toBe(0);
  });

  it("suporta origem e alvo coincidentes em todas as skills ativas sem gerar NaN", () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera();
    const effects = new EffectManager({ appendChild() {} } as unknown as HTMLElement, scene);
    effectManagers.push(effects);

    const samePoint = new Vector3(2, 0, 3);
    for (const skill of ALL_FM_SKILLS) {
      if (skill.kind === "passive") continue;
      const profile = getSkillVfxProfile(skill.id)!;
      effects.dispatchSkillVfx({
        profile,
        origin: samePoint.clone(),
        target: samePoint.clone(),
        center: samePoint.clone(),
        colorHex: profile.colorHex,
        facing: 0,
        range: profile.range,
        radius: profile.radius,
        hits: [],
        hasHeal: profile.kind === "heal",
        hasBuff: profile.kind === "buff",
        hasTransform: profile.kind === "transform",
        hasSummon: profile.kind === "summon",
      });
      effects.update(1 / 60, camera, 1280, 720);
      effects.clearSkillVfx();
    }
    expect(effects.getSkillVfxState().active).toBe(0);
  });

  it("descarta o EffectManager sem deixar nenhum nó filho na cena", () => {
    const scene = new Scene();
    const effects = new EffectManager({ appendChild() {} } as unknown as HTMLElement, scene);

    effects.warmSkills(ALL_FM_SKILLS, 0, 0);
    effects.dispose();

    expect(scene.children).toHaveLength(0);
  });
});

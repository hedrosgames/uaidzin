import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera, Scene, Vector3 } from "three";
import { BatchedRenderer } from "three.quarks";
import { EffectManager } from "../../EffectManager";
import { getSkillVfxProfile } from "../../skill/SkillVfxCatalog";
import {
  ColapsoElementalVfxController,
  DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG,
} from "./ColapsoElementalVfx";

function canvas() {
  const result = { width: 1, height: 1, getContext: () => context };
  const gradient = () => ({ addColorStop() {} });
  const imageData = (width: number, height: number) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) });
  const context = new Proxy<Record<string, unknown>>({
    canvas: result, createLinearGradient: gradient, createRadialGradient: gradient,
    createImageData: imageData,
    getImageData: (_x: number, _y: number, width: number, height: number) => imageData(width, height),
  }, { get: (target, property: string) => target[property] ?? (() => {}) });
  return result;
}

function advance(controller: ColapsoElementalVfxController, seconds: number) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) controller.update(1 / 60);
}

const TELEGRAPH = DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG.telegraphDuration;
const COLLAPSE = DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG.collapseDuration;
const RUPTURE = DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG.ruptureDuration;
const RESIDUAL = DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG.residualDuration;
const FADE = DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG.fadeDuration;

describe("Colapso Elemental VFX", () => {
  const controllers: ColapsoElementalVfxController[] = [];
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
      createElement: (name: string) => name === "canvas" ? canvas() : {
        style: {}, appendChild() {}, remove() {}, setAttribute() {}, classList: { add() {}, remove() {}, toggle() {} },
      },
    });
  });
  afterEach(() => {
    for (const controller of controllers) controller.dispose();
    controllers.length = 0;
    vi.unstubAllGlobals();
  });

  function setup() {
    const scene = new Scene();
    const controller = new ColapsoElementalVfxController(scene);
    controllers.push(controller);
    const batch = scene.getObjectByName("colapso-elemental-batched-renderer") as BatchedRenderer;
    return { scene, controller, batch };
  }

  it("orbita quatro núcleos, colapsa o miolo e lança o disco de fragmentos", () => {
    const { scene, controller } = setup();
    const center = new Vector3(1.6, 0, -2.3);
    controller.castColapsoElemental(center);
    expect(controller.getPhase()).toBe("telegraph");
    const orbit = scene.getObjectByName("colapso-elemental-orbit-0")!;
    expect(orbit.position.y).toBeGreaterThan(0);
    expect(scene.getObjectByName("colapso-elemental-heart")!.visible).toBe(true);
    expect(scene.getObjectByName("colapso-elemental-disc")!.visible).toBe(false);
    expect(scene.getObjectByName("ColapsoElemental_Wave")!.visible).toBe(false);
    advance(controller, TELEGRAPH * 0.5);
    const half = controller.getCastStates()[0];
    expect(half.orbitScale).toBeGreaterThan(0);
    expect(half.orbitDistance).toBeGreaterThan(0);
    expect(half.heartScale).toBeGreaterThan(0);
    expect(half.discOpacity).toBe(0);
    advance(controller, TELEGRAPH * 0.6);
    expect(controller.getPhase()).toBe("collapse");
    const orbitStart = controller.getCastStates()[0].orbitDistance;
    expect(Math.hypot(orbit.position.x - center.x, orbit.position.z - center.z)).toBeCloseTo(orbitStart, 3);
    advance(controller, COLLAPSE * 0.9);
    const collapsing = controller.getCastStates()[0];
    expect(collapsing.orbitDistance).toBeLessThan(orbitStart);
    expect(collapsing.orbitDistance).toBeGreaterThan(0);
    advance(controller, COLLAPSE * 0.3);
    expect(controller.getPhase()).toBe("rupture");
    const disc = scene.getObjectByName("colapso-elemental-disc")!;
    expect(disc.visible).toBe(true);
    expect(disc.position.x).toBeCloseTo(center.x, 5);
    expect(disc.position.z).toBeCloseTo(center.z, 5);
    expect(disc.position.y).toBeGreaterThan(0);
    expect(scene.getObjectByName("ColapsoElemental_Wave")!.visible).toBe(true);
    expect(scene.getObjectByName("colapso-elemental-shards-0")!.visible).toBe(true);
    advance(controller, RUPTURE * 0.5);
    const rupture = controller.getCastStates()[0];
    expect(rupture.coreStarted).toBeGreaterThan(0);
    expect(rupture.discScale).toBeGreaterThan(0.2);
    expect(rupture.discOpacity).toBeGreaterThan(0);
    expect(rupture.lightIntensity).toBeGreaterThan(0);
    expect(rupture.lightIntensity).toBeLessThanOrEqual(DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG.lightPeak);
    expect(rupture.shardHeight).toBeGreaterThan(0);
    advance(controller, RUPTURE * 0.6);
    expect(controller.getPhase()).toBe("residual");
    const residual = controller.getCastStates()[0];
    expect(residual.coreStarted).toBe(DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG.coreCount);
    expect(scene.getObjectByName("ColapsoElemental_Dust")!.visible).toBe(true);
    expect(residual.lightIntensity).toBeGreaterThan(0);
    expect(residual.discOpacity).toBeGreaterThan(0);
    const shards = scene.getObjectByName("colapso-elemental-shards-0") as unknown as { material: { opacity: number } };
    const shardOpacity = shards.material.opacity;
    expect(shardOpacity).toBeGreaterThan(0);
    advance(controller, RESIDUAL + FADE * 0.4);
    expect(shards.material.opacity).toBeLessThan(shardOpacity);
    expect(controller.getCastStates()[0].lightIntensity).toBeLessThan(residual.lightIntensity);
  });

  it("mantém núcleos e estilhaços acima do chão e o disco dentro do raio", () => {
    const { scene, controller } = setup();
    controller.castColapsoElemental(new Vector3(0, 0, 0));
    for (let frame = 0; frame < 66; frame++) {
      controller.update(1 / 60);
      for (const state of controller.getCastStates()) {
        expect(state.shardHeight).toBeGreaterThanOrEqual(0);
        expect(state.center.every(Number.isFinite)).toBe(true);
      }
      for (const name of ["colapso-elemental-heart", "colapso-elemental-disc", "colapso-elemental-disc-inner"]) {
        const mesh = scene.getObjectByName(name);
        if (mesh?.visible) expect(mesh.position.y).toBeGreaterThanOrEqual(0);
      }
      for (let index = 0; index < 4; index += 1) {
        const orbit = scene.getObjectByName(`colapso-elemental-orbit-${index}`);
        if (orbit) expect(orbit.position.y).toBeGreaterThan(0);
      }
    }
    expect(controller.getActiveCastCount()).toBe(1);
    const cores = controller.getSystems().filter(system => system.emitter.name.startsWith("ColapsoElemental_Core"));
    expect(cores).toHaveLength(DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG.coreCount);
    for (const core of cores) {
      expect(Math.hypot(core.emitter.position.x, core.emitter.position.z)).toBeLessThanOrEqual(
        DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG.radius,
      );
      expect(core.emitter.position.y).toBeGreaterThan(0);
    }
  });

  it("remove sistemas, instâncias, malhas e luz ao terminar o resíduo", () => {
    const { scene, controller, batch } = setup();
    controller.castColapsoElemental(new Vector3(0, 0, 0));
    expect(controller.getSystems()).toHaveLength(4 + DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG.coreCount);
    expect(batch.systemToBatchIndex.size).toBe(4 + DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG.coreCount);
    advance(controller, TELEGRAPH + COLLAPSE + RUPTURE + RESIDUAL + FADE + 0.3);
    expect(controller.getActiveCastCount()).toBe(0);
    expect(controller.getParticleCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    expect(scene.getObjectByName("colapso-elemental-heart")).toBeUndefined();
    expect(scene.getObjectByName("colapso-elemental-disc")).toBeUndefined();
    expect(scene.getObjectByName("colapso-elemental-orbit-0")).toBeUndefined();
    expect(scene.getObjectByName("colapso-elemental-shards-3")).toBeUndefined();
    expect(scene.getObjectByName("ColapsoElemental_Orbit")).toBeUndefined();
    controller.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("recusa coordenadas inválidas e limita casts simultâneos", () => {
    const { scene, controller, batch } = setup();
    controller.castColapsoElemental(new Vector3(NaN, 0, 0));
    controller.castColapsoElemental(new Vector3(0, Infinity, 0));
    controller.castColapsoElemental(new Vector3(0, 0, NaN));
    expect(controller.getActiveCastCount()).toBe(0);
    for (let index = 0; index < 5; index++) {
      controller.castColapsoElemental(new Vector3(index * 2.5, 0, 0));
    }
    expect(controller.getActiveCastCount()).toBe(DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG.maxConcurrentCasts);
    advance(controller, 0.5);
    for (const state of controller.getCastStates()) {
      expect(state.center.every(Number.isFinite)).toBe(true);
      expect(state.lightIntensity).toBeGreaterThanOrEqual(0);
      expect(state.orbitScale).toBeGreaterThan(0);
      expect(state.discOpacity).toBeGreaterThanOrEqual(0);
      expect(state.shardHeight).toBeGreaterThanOrEqual(0);
    }
    expect(Number.isFinite(controller.getParticleCount())).toBe(true);
    controller.clear();
    expect(controller.getActiveCastCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    expect(scene.getObjectByName("ColapsoElemental_Orbit")).toBeUndefined();
  });

  it("despacha a área no centro do cast e não na origem do conjurador", () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera();
    const effects = new EffectManager({ appendChild() {} } as unknown as HTMLElement, scene);
    try {
      const profile = getSkillVfxProfile("fm_mag_colapso")!;
      expect(profile.dedicatedVfx).toBe("colapso-elemental");
      expect(profile.skill.radius).toBe(4.4);
      expect(effects.getSkillVfxState().active).toBe(0);
      effects.dispatchSkillVfx({
        profile, origin: new Vector3(-5.2, 1.05, 0), center: new Vector3(2.1, 0, -1.7),
        target: null, colorHex: profile.colorHex, facing: 0,
        radius: profile.radius, range: profile.range, hits: [], hasHeal: false, hasBuff: false,
        hasTransform: false, hasSummon: false,
      });
      expect(effects.getSkillVfxState().active).toBe(1);
      const heart = scene.getObjectByName("colapso-elemental-heart")!;
      expect(heart.position.x).toBeCloseTo(2.1, 5);
      expect(heart.position.z).toBeCloseTo(-1.7, 5);
      for (let frame = 0; frame < 20; frame++) effects.update(1 / 60, camera, 1600, 900);
      expect(effects.getSkillVfxState().particles).toBeGreaterThan(0);
      effects.clearSkillVfx();
      expect(effects.getSkillVfxState().active).toBe(0);
      expect(effects.getSkillVfxState().particles).toBe(0);
      expect(scene.getObjectByName("colapso-elemental-heart")).toBeUndefined();
    } finally {
      effects.dispose();
    }
  });
});

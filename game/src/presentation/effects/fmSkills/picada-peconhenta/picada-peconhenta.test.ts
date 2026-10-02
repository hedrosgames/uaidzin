import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera, Scene, Vector3 } from "three";
import { BatchedRenderer } from "three.quarks";
import { EffectManager } from "../../EffectManager";
import { getSkillVfxProfile } from "../../skill/SkillVfxCatalog";
import { DEFAULT_PICADA_PECONHENTA_VFX_CONFIG, PicadaPeconhentaVfxController } from "./PicadaPeconhentaVfx";

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

function advance(controller: PicadaPeconhentaVfxController, seconds: number) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) controller.update(1 / 60);
}

const CHARGE = DEFAULT_PICADA_PECONHENTA_VFX_CONFIG.chargeDuration;
const IMPACT = DEFAULT_PICADA_PECONHENTA_VFX_CONFIG.impactDuration;
const FADE = DEFAULT_PICADA_PECONHENTA_VFX_CONFIG.fadeDuration;

describe("Picada Peçonhenta VFX", () => {
  const controllers: PicadaPeconhentaVfxController[] = [];
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
    const controller = new PicadaPeconhentaVfxController(scene);
    controllers.push(controller);
    const batch = scene.getObjectByName("picada-peconhenta-batched-renderer") as BatchedRenderer;
    return { scene, controller, batch };
  }

  it("converge a carga no ponto de lançamento e voa até o alvo antes do impacto", () => {
    const { scene, controller } = setup();
    const origin = new Vector3(-3.45, 1.05, 0);
    const target = new Vector3(3.7, 0.9, 0);
    controller.castPicada(origin, target);
    expect(controller.getPhase()).toBe("charge");
    const charge = scene.getObjectByName("PicadaPeconhenta_Charge")!;
    const chargeSystem = controller.getSystems().find(system => system.emitter.name === "PicadaPeconhenta_Charge");
    expect(charge.position.toArray()).toEqual(origin.toArray());
    expect(charge.visible).toBe(true);
    expect(scene.getObjectByName("PicadaPeconhenta_Trail")!.visible).toBe(false);
    advance(controller, CHARGE + 0.02);
    expect(controller.getPhase()).toBe("flight");
    expect(chargeSystem).toBeDefined();
    expect(chargeSystem!.emissionState.waitEmiting).toBe(0);
    expect(scene.getObjectByName("PicadaPeconhenta_Trail")!.visible).toBe(true);
    expect(scene.getObjectByName("PicadaPeconhenta_Satellites")!.visible).toBe(true);
    const stinger = scene.getObjectByName("picada-peconhenta-stinger")!;
    expect(stinger.visible).toBe(true);
    const state = controller.getCastStates()[0];
    expect(state.flightDuration).toBeGreaterThan(DEFAULT_PICADA_PECONHENTA_VFX_CONFIG.minFlightDuration);
    expect(state.head[0]).toBeGreaterThan(origin.x);
    expect(state.head[0]).toBeLessThan(target.x);
    advance(controller, state.flightDuration);
    expect(controller.getPhase()).toBe("impact");
    expect(charge.visible).toBe(false);
    const impact = controller.getCastStates()[0];
    expect(impact.head[0]).toBeCloseTo(target.x, 5);
    expect(impact.head[2]).toBeCloseTo(target.z, 5);
    expect(impact.lightIntensity).toBeGreaterThan(DEFAULT_PICADA_PECONHENTA_VFX_CONFIG.lightPeak * 0.8);
    expect(impact.lightIntensity).toBeLessThanOrEqual(DEFAULT_PICADA_PECONHENTA_VFX_CONFIG.lightPeak);
    expect(impact.decalOpacity).toBeGreaterThan(0);
    advance(controller, IMPACT + 0.02);
    expect(controller.getPhase()).toBe("residual");
    expect(scene.getObjectByName("PicadaPeconhenta_Bubbles")!.visible).toBe(true);
  });

  it("limita a duração do voo e mantém a poça pelo tempo do veneno", () => {
    const { controller } = setup();
    controller.castPicada(new Vector3(0, 1, 0), new Vector3(60, 0.9, 0), 0.6);
    expect(controller.getCastStates()[0].flightDuration).toBeCloseTo(
      DEFAULT_PICADA_PECONHENTA_VFX_CONFIG.maxFlightDuration, 5,
    );
    controller.clear();
    controller.castPicada(new Vector3(0, 1, 0), new Vector3(0.1, 0.9, 0), 0.6);
    expect(controller.getCastStates()[0].flightDuration).toBeCloseTo(
      DEFAULT_PICADA_PECONHENTA_VFX_CONFIG.minFlightDuration, 5,
    );
    controller.clear();
    controller.castPicada(new Vector3(0, 1, 0), new Vector3(4, 0.9, 0), 0.6);
    advance(controller, 2.4);
    expect(controller.getActiveCastCount()).toBe(0);
    controller.castPicada(new Vector3(0, 1, 0), new Vector3(4, 0.9, 0), 5);
    advance(controller, 2.4);
    expect(controller.getActiveCastCount()).toBe(1);
    expect(controller.getPhase()).toBe("residual");
  });

  it("remove sistemas, luz e malhas ao terminar a poça", () => {
    const { scene, controller, batch } = setup();
    controller.castPicada(new Vector3(0, 1, 0), new Vector3(4, 0.9, 0), 0.6);
    expect(controller.getSystems()).toHaveLength(6);
    expect(batch.systemToBatchIndex.size).toBe(6);
    advance(controller, CHARGE + 0.4 + IMPACT + 0.62 + FADE + 0.2);
    expect(controller.getActiveCastCount()).toBe(0);
    expect(controller.getParticleCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    expect(scene.getObjectByName("picada-peconhenta-stinger")).toBeUndefined();
    expect(scene.getObjectByName("picada-peconhenta-decal")).toBeUndefined();
    expect(scene.getObjectByName("PicadaPeconhenta_Trail")).toBeUndefined();
    controller.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("recusa entradas inválidas e limita casts simultâneos", () => {
    const { scene, controller, batch } = setup();
    controller.castPicada(new Vector3(NaN, 0, 0), new Vector3(4, 0, 0));
    controller.castPicada(new Vector3(0, 0, 0), new Vector3(Infinity, 0, 0));
    expect(controller.getActiveCastCount()).toBe(0);
    for (let index = 0; index < 6; index++) {
      controller.castPicada(new Vector3(index, 1, 0), new Vector3(index + 4, 0.9, 0));
    }
    expect(controller.getActiveCastCount()).toBe(DEFAULT_PICADA_PECONHENTA_VFX_CONFIG.maxConcurrentCasts);
    expect(batch.systemToBatchIndex.size).toBe(DEFAULT_PICADA_PECONHENTA_VFX_CONFIG.maxConcurrentCasts * 6);
    advance(controller, 0.5);
    for (const state of controller.getCastStates()) {
      expect([...state.head, ...state.origin, ...state.target].every(Number.isFinite)).toBe(true);
      expect(state.lightIntensity).toBeGreaterThanOrEqual(0);
      expect(state.stingerScale).toBeGreaterThan(0);
    }
    expect(Number.isFinite(controller.getParticleCount())).toBe(true);
    controller.clear();
    expect(controller.getActiveCastCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    expect(scene.getObjectByName("PicadaPeconhenta_Charge")).toBeUndefined();
  });

  it("despacha o controller dedicado com a duração do veneno do skill", () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera();
    const effects = new EffectManager({ appendChild() {} } as unknown as HTMLElement, scene);
    try {
      const profile = getSkillVfxProfile("fm_mag_picada")!;
      expect(profile.dedicatedVfx).toBe("picada-peconhenta");
      expect(profile.skill.enemy?.dotSec).toBe(5);
      expect(effects.getSkillVfxState().active).toBe(0);
      effects.dispatchSkillVfx({
        profile, origin: new Vector3(-3, 1, 0), center: new Vector3(3, 0.9, 0),
        target: new Vector3(3, 0.9, 0), colorHex: profile.colorHex, facing: 0,
        radius: profile.radius, range: profile.range, hits: [], hasHeal: false, hasBuff: false,
        hasTransform: false, hasSummon: false,
      });
      expect(effects.getSkillVfxState().active).toBe(1);
      for (let frame = 0; frame < 12; frame++) effects.update(1 / 60, camera, 1600, 900);
      expect(effects.getSkillVfxState().particles).toBeGreaterThan(0);
      for (let frame = 0; frame < 120; frame++) effects.update(1 / 60, camera, 1600, 900);
      expect(effects.getSkillVfxState().active).toBe(1);
      effects.clearSkillVfx();
      expect(effects.getSkillVfxState().active).toBe(0);
      expect(effects.getSkillVfxState().particles).toBe(0);
    } finally {
      effects.dispose();
    }
  });
});

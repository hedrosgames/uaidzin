import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera, Scene, Vector3 } from "three";
import { BatchedRenderer } from "three.quarks";
import { EffectManager } from "../../EffectManager";
import { getSkillVfxProfile } from "../../skill/SkillVfxCatalog";
import { DEFAULT_ESFERA_IGNEA_VFX_CONFIG, EsferaIgneaVfxController } from "./EsferaIgneaVfx";

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

function advance(controller: EsferaIgneaVfxController, seconds: number) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) controller.update(1 / 60);
}

const CHARGE = DEFAULT_ESFERA_IGNEA_VFX_CONFIG.chargeDuration;
const IMPACT = DEFAULT_ESFERA_IGNEA_VFX_CONFIG.impactDuration;

describe("Esfera Ígnea VFX", () => {
  const controllers: EsferaIgneaVfxController[] = [];
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
    const controller = new EsferaIgneaVfxController(scene);
    controllers.push(controller);
    const batch = scene.getObjectByName("esfera-ignea-batched-renderer") as BatchedRenderer;
    return { scene, controller, batch };
  }

  it("carrega, voa ao longo do arco e detona no impacto", () => {
    const { scene, controller } = setup();
    const origin = new Vector3(-3, 1.05, 0);
    const target = new Vector3(3, 0.9, 0);
    controller.castEsferaIgnea(origin, target);
    expect(controller.getPhase()).toBe("charge");
    const core = scene.getObjectByName("esfera-ignea-core")!;
    expect(core.position.toArray()).toEqual(origin.toArray());
    expect(scene.getObjectByName("esfera-ignea-heart")!).toBeDefined();
    expect(scene.getObjectByName("esfera-ignea-flash")!.visible).toBe(false);
    advance(controller, CHARGE + 0.02);
    expect(controller.getPhase()).toBe("flight");
    const state = controller.getCastStates()[0];
    expect(state.flightDuration).toBeGreaterThan(DEFAULT_ESFERA_IGNEA_VFX_CONFIG.minFlightDuration);
    expect(state.head[0]).toBeGreaterThan(origin.x);
    expect(state.head[0]).toBeLessThan(target.x);
    advance(controller, state.flightDuration);
    expect(controller.getPhase()).toBe("impact");
    expect(scene.getObjectByName("esfera-ignea-flash")!.visible).toBe(true);
    expect(scene.getObjectByName("esfera-ignea-scorch")!.visible).toBe(true);
    const impact = controller.getCastStates()[0];
    expect(impact.head[0]).toBeCloseTo(target.x, 3);
    expect(impact.lightIntensity).toBeGreaterThan(0);
    advance(controller, IMPACT + 0.05);
    expect(controller.getActiveCastCount()).toBe(0);
  });

  it("limita a duração do voo pela distância", () => {
    const { controller } = setup();
    controller.castEsferaIgnea(new Vector3(0, 1, 0), new Vector3(80, 0.9, 0));
    expect(controller.getCastStates()[0].flightDuration).toBeCloseTo(
      DEFAULT_ESFERA_IGNEA_VFX_CONFIG.maxFlightDuration, 5,
    );
    controller.clear();
    controller.castEsferaIgnea(new Vector3(0, 1, 0), new Vector3(0.05, 0.9, 0));
    expect(controller.getCastStates()[0].flightDuration).toBeCloseTo(
      DEFAULT_ESFERA_IGNEA_VFX_CONFIG.minFlightDuration, 5,
    );
  });

  it("remove sistemas, luz e malhas sem deixar lixo no fim do impacto", () => {
    const { scene, controller, batch } = setup();
    controller.castEsferaIgnea(new Vector3(0, 1, 0), new Vector3(4, 0.9, 0));
    expect(controller.getSystems()).toHaveLength(7);
    expect(batch.systemToBatchIndex.size).toBe(7);
    advance(controller, CHARGE + 0.3 + IMPACT + 0.1);
    expect(controller.getActiveCastCount()).toBe(0);
    expect(controller.getParticleCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    expect(scene.getObjectByName("esfera-ignea-core")).toBeUndefined();
    expect(scene.getObjectByName("esfera-ignea-flash")).toBeUndefined();
    expect(scene.getObjectByName("esfera-ignea-debris")).toBeUndefined();
    controller.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("recusa coordenadas inválidas e limita casts simultâneos", () => {
    const { scene, controller, batch } = setup();
    controller.castEsferaIgnea(new Vector3(NaN, 0, 0), new Vector3(4, 0, 0));
    controller.castEsferaIgnea(new Vector3(0, Infinity, 0), new Vector3(4, 0, 0));
    expect(controller.getActiveCastCount()).toBe(0);
    for (let index = 0; index < 6; index++) {
      controller.castEsferaIgnea(new Vector3(index, 1, 0), new Vector3(index + 3, 0.9, 0));
    }
    expect(controller.getActiveCastCount()).toBe(DEFAULT_ESFERA_IGNEA_VFX_CONFIG.maxConcurrentCasts);
    expect(batch.systemToBatchIndex.size).toBe(DEFAULT_ESFERA_IGNEA_VFX_CONFIG.maxConcurrentCasts * 7);
    advance(controller, 0.2);
    for (const state of controller.getCastStates()) {
      expect([...state.head, ...state.origin, ...state.target].every(Number.isFinite)).toBe(true);
      expect(state.lightIntensity).toBeGreaterThanOrEqual(0);
    }
    expect(Number.isFinite(controller.getParticleCount())).toBe(true);
    controller.clear();
    expect(controller.getActiveCastCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    controller.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("despacha pelo EffectManager e limpa com clearSkillVfx", () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera();
    const effects = new EffectManager({ appendChild() {} } as unknown as HTMLElement, scene);
    try {
      const profile = getSkillVfxProfile("fm_mag_esfera_ignea")!;
      expect(profile.dedicatedVfx).toBe("esfera-ignea");
      expect(effects.getSkillVfxState().active).toBe(0);
      effects.dispatchSkillVfx({
        profile, origin: new Vector3(-2, 1, 0), center: new Vector3(2, 0.9, 0),
        target: new Vector3(2, 0.9, 0), colorHex: profile.colorHex, facing: 0,
        radius: profile.radius, range: profile.range, hits: [], hasHeal: false, hasBuff: false,
        hasTransform: false, hasSummon: false,
      });
      expect(effects.getSkillVfxState().active).toBe(1);
      for (let frame = 0; frame < 15; frame++) effects.update(1 / 60, camera, 1600, 900);
      expect(effects.getSkillVfxState().particles).toBeGreaterThan(0);
      effects.clearSkillVfx();
      expect(effects.getSkillVfxState().active).toBe(0);
      expect(effects.getSkillVfxState().particles).toBe(0);
    } finally {
      effects.dispose();
    }
  });
});

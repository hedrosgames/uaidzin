import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera, Scene, Vector3 } from "three";
import { BatchedRenderer } from "three.quarks";
import { EffectManager } from "../../EffectManager";
import { getSkillVfxProfile } from "../../skill/SkillVfxCatalog";
import { DEFAULT_LANCA_GLACIAL_VFX_CONFIG, LancaGlacialVfxController } from "./LancaGlacialVfx";

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

function advance(controller: LancaGlacialVfxController, seconds: number) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) controller.update(1 / 60);
}

const CHARGE = DEFAULT_LANCA_GLACIAL_VFX_CONFIG.chargeDuration;
const IMPACT = DEFAULT_LANCA_GLACIAL_VFX_CONFIG.impactDuration;

describe("Lança Glacial VFX", () => {
  const controllers: LancaGlacialVfxController[] = [];
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
    const controller = new LancaGlacialVfxController(scene);
    controllers.push(controller);
    const batch = scene.getObjectByName("lanca-glacial-batched-renderer") as BatchedRenderer;
    return { scene, controller, batch };
  }

  it("carrega, voa e fratura cristais de gelo no impacto", () => {
    const { scene, controller } = setup();
    const origin = new Vector3(-3.2, 1.1, 0);
    const target = new Vector3(3.5, 0.9, 0);
    controller.castLancaGlacial(origin, target);
    expect(controller.getPhase()).toBe("charge");
    expect(scene.getObjectByName("lanca-glacial-heart")!).toBeDefined();
    expect(scene.getObjectByName("lanca-glacial-flash")!.visible).toBe(false);
    advance(controller, CHARGE + 0.02);
    expect(controller.getPhase()).toBe("flight");
    const state = controller.getCastStates()[0];
    expect(state.flightDuration).toBeGreaterThan(DEFAULT_LANCA_GLACIAL_VFX_CONFIG.minFlightDuration);
    expect(state.head[0]).toBeGreaterThan(origin.x);
    expect(state.head[0]).toBeLessThan(target.x);
    advance(controller, state.flightDuration);
    expect(controller.getPhase()).toBe("impact");
    expect(scene.getObjectByName("lanca-glacial-flash")!.visible).toBe(true);
    expect(scene.getObjectByName("lanca-glacial-frost")!.visible).toBe(true);
    const impact = controller.getCastStates()[0];
    expect(impact.head[0]).toBeCloseTo(target.x, 3);
    expect(impact.lightIntensity).toBeGreaterThan(0);
    advance(controller, IMPACT + 0.05);
    expect(controller.getActiveCastCount()).toBe(0);
  });

  it("limita a duração do voo pelo trajeto", () => {
    const { controller } = setup();
    controller.castLancaGlacial(new Vector3(0, 1, 0), new Vector3(90, 0.9, 0));
    expect(controller.getCastStates()[0].flightDuration).toBeCloseTo(
      DEFAULT_LANCA_GLACIAL_VFX_CONFIG.maxFlightDuration, 5,
    );
    controller.clear();
    controller.castLancaGlacial(new Vector3(0, 1, 0), new Vector3(0.04, 0.9, 0));
    expect(controller.getCastStates()[0].flightDuration).toBeCloseTo(
      DEFAULT_LANCA_GLACIAL_VFX_CONFIG.minFlightDuration, 5,
    );
  });

  it("remove sistemas, luz e malhas sem deixar resíduos", () => {
    const { scene, controller, batch } = setup();
    controller.castLancaGlacial(new Vector3(0, 1, 0), new Vector3(4, 0.9, 0));
    expect(controller.getSystems()).toHaveLength(7);
    expect(batch.systemToBatchIndex.size).toBe(7);
    advance(controller, CHARGE + 0.3 + IMPACT + 0.1);
    expect(controller.getActiveCastCount()).toBe(0);
    expect(controller.getParticleCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    expect(scene.getObjectByName("lanca-glacial-blade")).toBeUndefined();
    expect(scene.getObjectByName("lanca-glacial-flash")).toBeUndefined();
    expect(scene.getObjectByName("lanca-glacial-debris")).toBeUndefined();
    controller.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("recusa entradas inválidas e limita casts simultâneos", () => {
    const { scene, controller, batch } = setup();
    controller.castLancaGlacial(new Vector3(NaN, 0, 0), new Vector3(4, 0, 0));
    controller.castLancaGlacial(new Vector3(0, Infinity, 0), new Vector3(4, 0, 0));
    expect(controller.getActiveCastCount()).toBe(0);
    for (let index = 0; index < 6; index++) {
      controller.castLancaGlacial(new Vector3(index, 1, 0), new Vector3(index + 3.5, 0.9, 0));
    }
    expect(controller.getActiveCastCount()).toBe(DEFAULT_LANCA_GLACIAL_VFX_CONFIG.maxConcurrentCasts);
    expect(batch.systemToBatchIndex.size).toBe(DEFAULT_LANCA_GLACIAL_VFX_CONFIG.maxConcurrentCasts * 7);
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
      const profile = getSkillVfxProfile("fm_mag_lanca_glacial")!;
      expect(profile.dedicatedVfx).toBe("lanca-glacial");
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

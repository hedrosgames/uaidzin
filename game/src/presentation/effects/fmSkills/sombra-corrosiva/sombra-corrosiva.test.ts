import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera, Scene, Vector3 } from "three";
import { BatchedRenderer } from "three.quarks";
import { EffectManager } from "../../EffectManager";
import { getSkillVfxProfile } from "../../skill/SkillVfxCatalog";
import { DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG, SombraCorrosivaVfxController } from "./SombraCorrosivaVfx";

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

function advance(controller: SombraCorrosivaVfxController, seconds: number) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) controller.update(1 / 60);
}

const CHARGE = DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG.chargeDuration;
const IMPACT = DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG.impactDuration;
const RESIDUAL = DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG.residualDuration;
const FADE = DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG.fadeDuration;

describe("Sombra Corrosiva VFX", () => {
  const controllers: SombraCorrosivaVfxController[] = [];
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
    const controller = new SombraCorrosivaVfxController(scene);
    controllers.push(controller);
    const batch = scene.getObjectByName("sombra-corrosiva-batched-renderer") as BatchedRenderer;
    return { scene, controller, batch };
  }

  it("condensa a lágrima na origem, voa em arco e abre o olho no contato", () => {
    const { scene, controller } = setup();
    const origin = new Vector3(-3.45, 1.05, 0);
    const target = new Vector3(3.7, 0.9, 0);
    controller.castSombraCorrosiva(origin, target);
    expect(controller.getPhase()).toBe("charge");
    const tear = scene.getObjectByName("sombra-corrosiva-tear")!;
    expect(tear.position.toArray()).toEqual(origin.toArray());
    expect(tear.visible).toBe(true);
    expect(scene.getObjectByName("SombraCorrosiva_Wisp")!.visible).toBe(true);
    expect(scene.getObjectByName("SombraCorrosiva_Trail")!.visible).toBe(false);
    expect(scene.getObjectByName("SombraCorrosiva_Iris")!.visible).toBe(false);
    advance(controller, CHARGE * 0.5);
    expect(controller.getPhase()).toBe("charge");
    expect(controller.getCastStates()[0].tearScale).toBeGreaterThan(0);
    advance(controller, CHARGE * 0.6);
    expect(controller.getPhase()).toBe("flight");
    expect(scene.getObjectByName("SombraCorrosiva_Trail")!.visible).toBe(true);
    const flight = controller.getCastStates()[0].flightDuration;
    expect(flight).toBeGreaterThan(DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG.minFlightDuration);
    advance(controller, flight * 0.4);
    const middle = controller.getCastStates()[0];
    expect(middle.head[0]).toBeGreaterThan(origin.x);
    expect(middle.head[0]).toBeLessThan(target.x);
    expect(tear.visible).toBe(true);
    advance(controller, flight * 0.7);
    expect(controller.getPhase()).toBe("impact");
    expect(tear.visible).toBe(false);
    const eyeLid = scene.getObjectByName("sombra-corrosiva-eye-lid")!;
    const eyeVoid = scene.getObjectByName("sombra-corrosiva-eye-void")!;
    expect(eyeLid.visible).toBe(true);
    expect(eyeVoid.visible).toBe(true);
    expect(eyeLid.position.x).toBeCloseTo(target.x, 5);
    expect(eyeLid.position.z).toBeCloseTo(target.z, 5);
    expect(scene.getObjectByName("SombraCorrosiva_Iris")!.visible).toBe(true);
    advance(controller, IMPACT * 0.3);
    const open = controller.getCastStates()[0];
    expect(open.eyeOpen).toBeGreaterThan(0.5);
    expect(open.threadReach).toBeGreaterThan(0);
    expect(open.threadReach).toBeLessThanOrEqual(1);
    expect(open.poolOpacity).toBeGreaterThan(0);
    expect(open.lightIntensity).toBeGreaterThan(0);
    expect(open.lightIntensity).toBeLessThanOrEqual(DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG.lightPeak);
    advance(controller, IMPACT);
    expect(controller.getPhase()).toBe("residual");
    expect(scene.getObjectByName("SombraCorrosiva_Haze")!.visible).toBe(true);
  });

  it("limita a duração do voo e mantém o resíduo corrosivo pelo contrato", () => {
    const { controller } = setup();
    controller.castSombraCorrosiva(new Vector3(0, 1, 0), new Vector3(60, 0.9, 0));
    expect(controller.getCastStates()[0].flightDuration).toBeCloseTo(
      DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG.maxFlightDuration, 5,
    );
    controller.clear();
    controller.castSombraCorrosiva(new Vector3(0, 1, 0), new Vector3(0.1, 0.9, 0));
    expect(controller.getCastStates()[0].flightDuration).toBeCloseTo(
      DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG.minFlightDuration, 5,
    );
    controller.clear();
    controller.castSombraCorrosiva(new Vector3(0, 1, 0), new Vector3(4, 0.9, 0));
    advance(controller, CHARGE + 0.3 + IMPACT * 0.4);
    expect(controller.getPhase()).toBe("residual");
    const decaying = controller.getCastStates()[0].poolOpacity;
    advance(controller, RESIDUAL);
    expect(controller.getCastStates()[0].poolOpacity).toBeLessThan(decaying);
    advance(controller, FADE + 0.2);
    expect(controller.getActiveCastCount()).toBe(0);
  });

  it("remove sistemas, luz e malhas ao terminar o resíduo", () => {
    const { scene, controller, batch } = setup();
    controller.castSombraCorrosiva(new Vector3(0, 1, 0), new Vector3(4, 0.9, 0));
    expect(controller.getSystems()).toHaveLength(5);
    expect(batch.systemToBatchIndex.size).toBe(5);
    advance(controller, CHARGE + 0.3 + IMPACT + RESIDUAL + FADE + 0.3);
    expect(controller.getActiveCastCount()).toBe(0);
    expect(controller.getParticleCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    expect(scene.getObjectByName("sombra-corrosiva-tear")).toBeUndefined();
    expect(scene.getObjectByName("sombra-corrosiva-eye-lid")).toBeUndefined();
    expect(scene.getObjectByName("sombra-corrosiva-pool")).toBeUndefined();
    expect(scene.getObjectByName("sombra-corrosiva-thread-0")).toBeUndefined();
    expect(scene.getObjectByName("SombraCorrosiva_Trail")).toBeUndefined();
    controller.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("recusa entradas inválidas e limita casts simultâneos", () => {
    const { scene, controller, batch } = setup();
    controller.castSombraCorrosiva(new Vector3(NaN, 0, 0), new Vector3(4, 0, 0));
    controller.castSombraCorrosiva(new Vector3(0, 0, 0), new Vector3(Infinity, 0, 0));
    controller.castSombraCorrosiva(new Vector3(0, 0, 0), new Vector3(0, 0, NaN));
    expect(controller.getActiveCastCount()).toBe(0);
    for (let index = 0; index < 6; index++) {
      controller.castSombraCorrosiva(new Vector3(index, 1, 0), new Vector3(index + 4, 0.9, 0));
    }
    expect(controller.getActiveCastCount()).toBe(DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG.maxConcurrentCasts);
    expect(batch.systemToBatchIndex.size).toBe(DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG.maxConcurrentCasts * 5);
    advance(controller, 0.5);
    for (const state of controller.getCastStates()) {
      expect([...state.head, ...state.origin, ...state.target].every(Number.isFinite)).toBe(true);
      expect(state.lightIntensity).toBeGreaterThanOrEqual(0);
      expect(state.tearScale).toBeGreaterThan(0);
      expect(state.threadReach).toBeGreaterThanOrEqual(0);
      expect(state.poolOpacity).toBeGreaterThanOrEqual(0);
    }
    expect(Number.isFinite(controller.getParticleCount())).toBe(true);
    controller.clear();
    expect(controller.getActiveCastCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    expect(scene.getObjectByName("SombraCorrosiva_Wisp")).toBeUndefined();
  });

  it("despacha o alvo único no alvo do cast, não no centro", () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera();
    const effects = new EffectManager({ appendChild() {} } as unknown as HTMLElement, scene);
    try {
      const profile = getSkillVfxProfile("fm_mag_sombra_corrosiva")!;
      expect(profile.dedicatedVfx).toBe("sombra-corrosiva");
      expect(profile.skill.range).toBe(8);
      expect(effects.getSkillVfxState().active).toBe(0);
      effects.dispatchSkillVfx({
        profile, origin: new Vector3(-4.35, 1.05, 0), center: new Vector3(0, 0, 0),
        target: new Vector3(2.6, 0.9, -1.4), colorHex: profile.colorHex, facing: 0,
        radius: profile.radius, range: profile.range, hits: [], hasHeal: false, hasBuff: false,
        hasTransform: false, hasSummon: false,
      });
      expect(effects.getSkillVfxState().active).toBe(1);
      const tear = scene.getObjectByName("sombra-corrosiva-tear")!;
      expect(tear.position.x).toBeCloseTo(-4.35, 5);
      expect(tear.position.z).toBeCloseTo(0, 5);
      for (let frame = 0; frame < 30; frame++) effects.update(1 / 60, camera, 1600, 900);
      expect(effects.getSkillVfxState().particles).toBeGreaterThan(0);
      const eye = scene.getObjectByName("sombra-corrosiva-eye-lid")!;
      expect(eye.position.x).toBeCloseTo(2.6, 5);
      expect(eye.position.z).toBeCloseTo(-1.4, 5);
      effects.clearSkillVfx();
      expect(effects.getSkillVfxState().active).toBe(0);
      expect(effects.getSkillVfxState().particles).toBe(0);
      expect(scene.getObjectByName("sombra-corrosiva-eye-lid")).toBeUndefined();
    } finally {
      effects.dispose();
    }
  });
});

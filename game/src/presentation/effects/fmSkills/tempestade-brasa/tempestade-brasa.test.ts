import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera, Scene, Vector3 } from "three";
import { BatchedRenderer } from "three.quarks";
import { EffectManager } from "../../EffectManager";
import { getSkillVfxProfile } from "../../skill/SkillVfxCatalog";
import { DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG, TempestadeBrasaVfxController } from "./TempestadeBrasaVfx";

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

function advance(controller: TempestadeBrasaVfxController, seconds: number) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) controller.update(1 / 60);
}

const TELEGRAPH = DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG.telegraphDuration;
const STORM = DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG.stormDuration;
const PEAK = DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG.peakDuration;
const RESIDUAL = DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG.residualDuration;
const FADE = DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG.fadeDuration;

describe("Tempestade de Brasa VFX", () => {
  const controllers: TempestadeBrasaVfxController[] = [];
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
    const controller = new TempestadeBrasaVfxController(scene);
    controllers.push(controller);
    const batch = scene.getObjectByName("tempestade-brasa-batched-renderer") as BatchedRenderer;
    return { scene, controller, batch };
  }

  it("marca a área no telegraph e conduz a tempestade até o pico no centro mecânico", () => {
    const { scene, controller } = setup();
    const center = new Vector3(1.5, 0, -2.2);
    controller.castTempestadeBrasa(center);
    expect(controller.getPhase()).toBe("telegraph");
    const rim = scene.getObjectByName("tempestade-brasa-rim-0")!;
    expect(rim.position.x).toBeCloseTo(center.x, 5);
    expect(rim.position.z).toBeCloseTo(center.z, 5);
    expect(rim.position.y).toBeGreaterThanOrEqual(0);
    const scorch = scene.getObjectByName("tempestade-brasa-scorch")!;
    expect(scorch.position.y).toBeGreaterThan(0);
    advance(controller, TELEGRAPH * 0.5);
    const half = controller.getCastStates()[0];
    expect(half.rimOpacity).toBeGreaterThan(0);
    expect(half.crackOpacity).toBeGreaterThan(0);
    expect(half.scorchOpacity).toBe(0);
    expect(scene.getObjectByName("TempestadeBrasa_Rain")!.visible).toBe(false);
    advance(controller, TELEGRAPH * 0.6);
    expect(controller.getPhase()).toBe("storm");
    expect(scene.getObjectByName("TempestadeBrasa_Rain")!.visible).toBe(true);
    expect(scene.getObjectByName("TempestadeBrasa_Embers")!.visible).toBe(true);
    expect(controller.getCastStates()[0].debrisVisible).toBe(true);
    advance(controller, STORM + 0.05);
    expect(controller.getPhase()).toBe("peak");
    const peak = controller.getCastStates()[0];
    expect(peak.coresStarted).toBe(DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG.coreCount);
    expect(peak.flashFired).toBe(true);
    expect(peak.flashOpacity).toBeGreaterThan(0);
    expect(peak.debrisHeight).toBeGreaterThan(0);
    advance(controller, PEAK + 0.05);
    expect(controller.getPhase()).toBe("residual");
    expect(scene.getObjectByName("TempestadeBrasa_Dust")!.visible).toBe(true);
    expect(scene.getObjectByName("TempestadeBrasa_Ash")!.visible).toBe(true);
    expect(controller.getCastStates()[0].scorchOpacity).toBeGreaterThan(0);
    for (const state of controller.getCastStates()) {
      expect([...state.center, state.debrisHeight].every(Number.isFinite)).toBe(true);
    }
  });

  it("nunca deixa matéria abaixo do chão e mantém o pico dentro do raio da área", () => {
    const { scene, controller } = setup();
    controller.castTempestadeBrasa(new Vector3(0, 0, 0));
    let debrisCount = -1;
    for (let frame = 0; frame < 88; frame++) {
      controller.update(1 / 60);
      for (const state of controller.getCastStates()) {
        expect(state.debrisHeight).toBeGreaterThanOrEqual(0);
      }
      for (const name of ["tempestade-brasa-rim-0", "tempestade-brasa-crack-0", "tempestade-brasa-scorch"]) {
        const mesh = scene.getObjectByName(name);
        expect(mesh?.position.y ?? 0).toBeGreaterThanOrEqual(0);
      }
      const debris = scene.getObjectByName("tempestade-brasa-debris") as unknown as { count: number } | undefined;
      if (debris) debrisCount = debris.count;
    }
    expect(controller.getActiveCastCount()).toBe(1);
    expect(debrisCount).toBe(DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG.debrisCount);
    const arcs = controller.getSystems().filter(system => system.emitter.name.startsWith("TempestadeBrasa_Core"));
    expect(arcs).toHaveLength(DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG.coreCount);
    for (const core of arcs) {
      expect(Math.hypot(core.emitter.position.x, core.emitter.position.z)).toBeLessThanOrEqual(
        DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG.radius,
      );
    }
  });

  it("remove sistemas, malhas e luz ao terminar o resíduo", () => {
    const { scene, controller, batch } = setup();
    controller.castTempestadeBrasa(new Vector3(0, 0, 0));
    expect(controller.getSystems()).toHaveLength(5 + DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG.coreCount);
    expect(batch.systemToBatchIndex.size).toBe(5 + DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG.coreCount);
    advance(controller, TELEGRAPH + STORM + PEAK + RESIDUAL + FADE + 0.3);
    expect(controller.getActiveCastCount()).toBe(0);
    expect(controller.getParticleCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    expect(scene.getObjectByName("tempestade-brasa-scorch")).toBeUndefined();
    expect(scene.getObjectByName("tempestade-brasa-debris")).toBeUndefined();
    expect(scene.getObjectByName("TempestadeBrasa_Rain")).toBeUndefined();
    controller.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("recusa coordenadas inválidas e limita casts simultâneos", () => {
    const { scene, controller, batch } = setup();
    controller.castTempestadeBrasa(new Vector3(NaN, 0, 0));
    controller.castTempestadeBrasa(new Vector3(0, Infinity, 0));
    controller.castTempestadeBrasa(new Vector3(0, 0, NaN));
    expect(controller.getActiveCastCount()).toBe(0);
    for (let index = 0; index < 5; index++) {
      controller.castTempestadeBrasa(new Vector3(index * 2, 0, 0));
    }
    expect(controller.getActiveCastCount()).toBe(DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG.maxConcurrentCasts);
    advance(controller, 0.4);
    for (const state of controller.getCastStates()) {
      expect(state.center.every(Number.isFinite)).toBe(true);
      expect(state.lightIntensity).toBeGreaterThanOrEqual(0);
      expect(state.rimOpacity).toBeGreaterThanOrEqual(0);
    }
    expect(Number.isFinite(controller.getParticleCount())).toBe(true);
    controller.clear();
    expect(controller.getActiveCastCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    expect(scene.getObjectByName("TempestadeBrasa_Embers")).toBeUndefined();
  });

  it("despacha a área no centro do cast, não na origem do conjurador", () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera();
    const effects = new EffectManager({ appendChild() {} } as unknown as HTMLElement, scene);
    try {
      const profile = getSkillVfxProfile("fm_mag_tempestade_brasa")!;
      expect(profile.dedicatedVfx).toBe("tempestade-brasa");
      expect(profile.skill.radius).toBe(3.6);
      effects.dispatchSkillVfx({
        profile, origin: new Vector3(-4.35, 1.05, 0), center: new Vector3(1.2, 0, -2.4),
        target: null, colorHex: profile.colorHex, facing: 0,
        radius: profile.radius, range: profile.range, hits: [], hasHeal: false, hasBuff: false,
        hasTransform: false, hasSummon: false,
      });
      expect(effects.getSkillVfxState().active).toBe(1);
      const rim = scene.getObjectByName("tempestade-brasa-rim-0")!;
      expect(rim.position.x).toBeCloseTo(1.2, 5);
      expect(rim.position.z).toBeCloseTo(-2.4, 5);
      for (let frame = 0; frame < 20; frame++) effects.update(1 / 60, camera, 1600, 900);
      expect(effects.getSkillVfxState().particles).toBeGreaterThan(0);
      effects.clearSkillVfx();
      expect(effects.getSkillVfxState().active).toBe(0);
      expect(effects.getSkillVfxState().particles).toBe(0);
      expect(scene.getObjectByName("tempestade-brasa-rim-0")).toBeUndefined();
    } finally {
      effects.dispose();
    }
  });
});

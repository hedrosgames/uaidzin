import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera, Scene, Vector3 } from "three";
import { BatchedRenderer } from "three.quarks";
import { EffectManager } from "../../EffectManager";
import { getSkillVfxProfile } from "../../skill/SkillVfxCatalog";
import { DEFAULT_NEVASCA_VFX_CONFIG, NevascaVfxController } from "./NevascaVfx";

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

function advance(controller: NevascaVfxController, seconds: number) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) controller.update(1 / 60);
}

const TELEGRAPH = DEFAULT_NEVASCA_VFX_CONFIG.telegraphDuration;
const STORM = DEFAULT_NEVASCA_VFX_CONFIG.stormDuration;
const PEAK = DEFAULT_NEVASCA_VFX_CONFIG.peakDuration;
const RESIDUAL = DEFAULT_NEVASCA_VFX_CONFIG.residualDuration;
const FADE = DEFAULT_NEVASCA_VFX_CONFIG.fadeDuration;

describe("Nevasca VFX", () => {
  const controllers: NevascaVfxController[] = [];
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
    const controller = new NevascaVfxController(scene);
    controllers.push(controller);
    const batch = scene.getObjectByName("nevasca-batched-renderer") as BatchedRenderer;
    return { scene, controller, batch };
  }

  it("ergue o sigilo no centro mecânico, fecha o cone e rompe em estilhaços", () => {
    const { scene, controller } = setup();
    const center = new Vector3(1.4, 0, -2.1);
    controller.castNevasca(center);
    expect(controller.getPhase()).toBe("telegraph");
    const rim = scene.getObjectByName("nevasca-rim-0")!;
    expect(rim.position.x).toBeCloseTo(center.x, 5);
    expect(rim.position.z).toBeCloseTo(center.z, 5);
    expect(rim.position.y).toBeGreaterThanOrEqual(0);
    expect(scene.getObjectByName("nevasca-frost")!.position.y).toBeGreaterThan(0);
    expect(scene.getObjectByName("Nevasca_Crystals")!.visible).toBe(false);
    advance(controller, TELEGRAPH * 0.5);
    const half = controller.getCastStates()[0];
    expect(half.rimOpacity).toBeGreaterThan(0);
    expect(half.frostOpacity).toBeGreaterThan(0);
    expect(half.coneOpacity).toBeGreaterThan(0);
    expect(half.crystalsVisible).toBe(false);
    advance(controller, TELEGRAPH * 0.6);
    expect(controller.getPhase()).toBe("storm");
    expect(scene.getObjectByName("Nevasca_Crystals")!.visible).toBe(true);
    const crystals = scene.getObjectByName("nevasca-crystals")!;
    expect(crystals.visible).toBe(true);
    advance(controller, STORM * 0.9);
    const storm = controller.getCastStates()[0];
    expect(storm.coneScale).toBeGreaterThan(DEFAULT_NEVASCA_VFX_CONFIG.coneScale * 0.6);
    expect(storm.crystalHeight).toBeGreaterThan(0.4);
    advance(controller, STORM * 0.3);
    expect(controller.getPhase()).toBe("peak");
    expect(scene.getObjectByName("Nevasca_Shards")!.visible).toBe(true);
    advance(controller, PEAK * 0.5);
    const mid = controller.getCastStates()[0];
    expect(mid.coresStarted).toBeGreaterThan(0);
    expect(mid.lightIntensity).toBeGreaterThan(0);
    expect(mid.lightIntensity).toBeLessThanOrEqual(DEFAULT_NEVASCA_VFX_CONFIG.lightPeak);
    advance(controller, PEAK * 0.6);
    expect(controller.getPhase()).toBe("residual");
    const residual = controller.getCastStates()[0];
    expect(residual.coresStarted).toBe(DEFAULT_NEVASCA_VFX_CONFIG.coreCount);
    expect(residual.shardsStarted).toBe(true);
    expect(scene.getObjectByName("Nevasca_Snow")!.visible).toBe(true);
    expect(scene.getObjectByName("Nevasca_Mist")!.visible).toBe(true);
    expect(residual.crystalsVisible).toBe(false);
  });

  it("mantém toda a matéria acima do chão e o pico dentro do raio da área", () => {
    const { scene, controller } = setup();
    controller.castNevasca(new Vector3(0, 0, 0));
    for (let frame = 0; frame < 70; frame++) {
      controller.update(1 / 60);
      for (const state of controller.getCastStates()) {
        expect(state.crystalHeight).toBeGreaterThanOrEqual(0);
        expect(state.center.every(Number.isFinite)).toBe(true);
      }
      for (const name of ["nevasca-rim-0", "nevasca-rim-1", "nevasca-frost", "nevasca-cone"]) {
        const mesh = scene.getObjectByName(name);
        expect(mesh?.position.y ?? 0).toBeGreaterThanOrEqual(0);
      }
    }
    expect(controller.getActiveCastCount()).toBe(1);
    const cores = controller.getSystems().filter(system => system.emitter.name.startsWith("Nevasca_Core"));
    expect(cores).toHaveLength(DEFAULT_NEVASCA_VFX_CONFIG.coreCount);
    for (const core of cores) {
      expect(Math.hypot(core.emitter.position.x, core.emitter.position.z)).toBeLessThanOrEqual(
        DEFAULT_NEVASCA_VFX_CONFIG.radius,
      );
      expect(core.emitter.position.y).toBeGreaterThan(0);
    }
  });

  it("remove sistemas, instâncias, malhas e luz ao terminar o resíduo", () => {
    const { scene, controller, batch } = setup();
    controller.castNevasca(new Vector3(0, 0, 0));
    expect(controller.getSystems()).toHaveLength(5 + DEFAULT_NEVASCA_VFX_CONFIG.coreCount);
    expect(batch.systemToBatchIndex.size).toBe(5 + DEFAULT_NEVASCA_VFX_CONFIG.coreCount);
    advance(controller, TELEGRAPH + STORM + PEAK + RESIDUAL + FADE + 0.3);
    expect(controller.getActiveCastCount()).toBe(0);
    expect(controller.getParticleCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    expect(scene.getObjectByName("nevasca-crystals")).toBeUndefined();
    expect(scene.getObjectByName("nevasca-cone")).toBeUndefined();
    expect(scene.getObjectByName("nevasca-frost")).toBeUndefined();
    expect(scene.getObjectByName("Nevasca_Snow")).toBeUndefined();
    controller.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("recusa coordenadas inválidas e limita casts simultâneos", () => {
    const { scene, controller, batch } = setup();
    controller.castNevasca(new Vector3(NaN, 0, 0));
    controller.castNevasca(new Vector3(0, Infinity, 0));
    controller.castNevasca(new Vector3(0, 0, NaN));
    expect(controller.getActiveCastCount()).toBe(0);
    for (let index = 0; index < 5; index++) {
      controller.castNevasca(new Vector3(index * 2, 0, 0));
    }
    expect(controller.getActiveCastCount()).toBe(DEFAULT_NEVASCA_VFX_CONFIG.maxConcurrentCasts);
    advance(controller, 0.4);
    for (const state of controller.getCastStates()) {
      expect(state.center.every(Number.isFinite)).toBe(true);
      expect(state.lightIntensity).toBeGreaterThanOrEqual(0);
      expect(state.rimOpacity).toBeGreaterThanOrEqual(0);
      expect(state.frostOpacity).toBeGreaterThanOrEqual(0);
      expect(state.crystalHeight).toBeGreaterThanOrEqual(0);
    }
    expect(Number.isFinite(controller.getParticleCount())).toBe(true);
    controller.clear();
    expect(controller.getActiveCastCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    expect(scene.getObjectByName("Nevasca_Vortex")).toBeUndefined();
  });

  it("despacha a área no centro do cast e não na origem do conjurador", () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera();
    const effects = new EffectManager({ appendChild() {} } as unknown as HTMLElement, scene);
    try {
      const profile = getSkillVfxProfile("fm_mag_nevasca")!;
      expect(profile.dedicatedVfx).toBe("nevasca");
      expect(profile.skill.radius).toBe(3.8);
      expect(profile.skill.enemy?.slow).toBe(0.45);
      expect(effects.getSkillVfxState().active).toBe(0);
      effects.dispatchSkillVfx({
        profile, origin: new Vector3(-4.35, 1.05, 0), center: new Vector3(1.6, 0, -2.2),
        target: null, colorHex: profile.colorHex, facing: 0,
        radius: profile.radius, range: profile.range, hits: [], hasHeal: false, hasBuff: false,
        hasTransform: false, hasSummon: false,
      });
      expect(effects.getSkillVfxState().active).toBe(1);
      const rim = scene.getObjectByName("nevasca-rim-0")!;
      expect(rim.position.x).toBeCloseTo(1.6, 5);
      expect(rim.position.z).toBeCloseTo(-2.2, 5);
      for (let frame = 0; frame < 20; frame++) effects.update(1 / 60, camera, 1600, 900);
      expect(effects.getSkillVfxState().particles).toBeGreaterThan(0);
      effects.clearSkillVfx();
      expect(effects.getSkillVfxState().active).toBe(0);
      expect(effects.getSkillVfxState().particles).toBe(0);
      expect(scene.getObjectByName("nevasca-rim-0")).toBeUndefined();
    } finally {
      effects.dispose();
    }
  });
});

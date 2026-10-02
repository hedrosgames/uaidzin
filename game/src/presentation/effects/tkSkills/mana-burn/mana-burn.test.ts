import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Mesh, Object3D, Scene, Vector3 } from "three";
import { BatchedRenderer } from "three.quarks";
import { ManaBurnVfxController } from "./ManaBurnVfx";
import { EffectManager } from "../../EffectManager";
import { getSkillVfxProfile } from "../../skill/SkillVfxCatalog";

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

function advance(controller: ManaBurnVfxController, seconds: number) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) controller.update(1 / 60);
}

describe("Mana Burn VFX", () => {
  const controllers: ManaBurnVfxController[] = [];
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
    const controller = new ManaBurnVfxController(scene);
    controllers.push(controller);
    const batch = scene.getObjectByName("tk-mana-burn-quarks") as BatchedRenderer;
    return { scene, controller, batch };
  }

  it("acompanha o personagem mantendo o anel de brasa no chão", () => {
    const { scene, controller } = setup();
    const anchor = new Object3D();
    anchor.name = "PlayerRoot";
    anchor.position.set(3, 0, -1.5);
    scene.add(anchor);
    controller.castManaBurn(new Vector3(3, 0, -1.5), undefined, anchor);
    advance(controller, 0.2);
    expect(controller.getCastStates()[0].followsCaster).toBe(true);
    const ring = scene.getObjectByName("tk-mana-burn-ember-ring") as Mesh;
    const world = new Vector3();
    expect(ring.position.y).toBeGreaterThan(0);
    ring.getWorldPosition(world);
    expect(world.y).toBeGreaterThan(0);
    anchor.position.set(6, 0.5, 2);
    advance(controller, 0.05);
    const state = controller.getCastStates()[0];
    expect(state.position[0]).toBeCloseTo(6, 5);
    expect(state.position[1]).toBeCloseTo(0.5, 5);
    expect(state.position[2]).toBeCloseTo(2, 5);
    ring.getWorldPosition(world);
    expect(world.y).toBeGreaterThan(0.5);
    expect(Number.isFinite(controller.getParticleCount())).toBe(true);
  });

  it("separa as fases e remove sistemas, luz e malhas ao terminar", () => {
    const { scene, controller, batch } = setup();
    controller.castManaBurn(new Vector3());
    expect(controller.getSystems().filter(system => !system.paused)).toHaveLength(1);
    advance(controller, 0.2);
    expect(controller.getCastStates()[0].flameStarted).toBe(true);
    expect(controller.getCastStates()[0].flashStarted).toBe(false);
    expect(controller.getPhase()).toBe("activation");
    advance(controller, 0.15);
    expect(controller.getPhase()).toBe("peak");
    expect(controller.getCastStates()[0].flashStarted).toBe(true);
    expect(controller.getCastStates()[0].motesStarted).toBe(false);
    advance(controller, 0.5);
    expect(controller.getPhase()).toBe("state");
    expect(controller.getCastStates()[0].motesStarted).toBe(true);
    advance(controller, 1.6);
    expect(controller.getPhase()).toBe("fade");
    expect(controller.getCastStates()[0].residualStarted).toBe(true);
    advance(controller, 0.5);
    expect(controller.getActiveCastCount()).toBe(0);
    expect(controller.getParticleCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    expect(scene.getObjectByName("tk-mana-burn-cast")).toBeUndefined();
    controller.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("recusa entradas inválidas e limita casts simultâneos", () => {
    const { controller, batch } = setup();
    controller.castManaBurn(new Vector3(NaN, 0, 0));
    controller.castManaBurn(new Vector3(0, Infinity, 0));
    expect(controller.getActiveCastCount()).toBe(0);
    for (let index = 0; index < 5; index++) controller.castManaBurn(new Vector3(index, 0, 0));
    expect(controller.getActiveCastCount()).toBe(2);
    expect(batch.systemToBatchIndex.size).toBe(10);
    advance(controller, 0.4);
    for (const state of controller.getCastStates()) {
      expect(state.position.every(Number.isFinite)).toBe(true);
      expect(state.ring.opacity).toBeGreaterThan(0);
      expect(state.lightIntensity).toBeGreaterThan(0);
    }
    controller.clear();
    expect(batch.systemToBatchIndex.size).toBe(0);
  });

  it("despacha o controller dedicado no centro mecânico do cast", () => {
    const scene = new Scene();
    const effects = new EffectManager({ appendChild() {} } as unknown as HTMLElement, scene);
    try {
      const profile = getSkillVfxProfile("tk_mag_mana_burn")!;
      expect(profile.dedicatedVfx).toBe("mana-burn");
      effects.warmSkills([profile.skill], 2, 5);
      const controller = effects.getTkRegistry().get("mana-burn");
      expect(controller.getActiveCastCount()).toBe(1);
      expect(effects.getTkRegistry().has("selo")).toBe(false);
      effects.clearSkillVfx();
      effects.dispatchSkillVfx({
        profile, origin: new Vector3(2, 0, 5), center: new Vector3(2, 0, 5),
        target: new Vector3(2, 0, 5), colorHex: profile.colorHex, facing: 0,
        radius: profile.radius, range: profile.range, hits: [], hasHeal: false, hasBuff: true,
        hasTransform: false, hasSummon: false,
      });
      expect(controller.getActiveCastCount()).toBe(1);
      expect(controller.getCastStates()[0].position).toEqual([2, 0, 5]);
      advance(controller, 3);
      expect(controller.getActiveCastCount()).toBe(0);
    } finally {
      effects.dispose();
    }
  });
});

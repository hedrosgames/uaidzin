import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InstancedMesh, Matrix4, Scene, Vector3 } from "three";
import { BatchedRenderer } from "three.quarks";
import { CampoGeloVfxController } from "./CampoGeloVfx";
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

function advance(controller: CampoGeloVfxController, seconds: number) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) controller.update(1 / 60);
}

describe("Campo de Gelo VFX", () => {
  const controllers: CampoGeloVfxController[] = [];
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
    const controller = new CampoGeloVfxController(scene);
    controllers.push(controller);
    const batch = scene.getObjectByName("tk-campo-gelo-quarks") as BatchedRenderer;
    return { scene, controller, batch };
  }

  it("mantém cristais acima do chão e dentro do raio, sem seguir a origem", () => {
    const { scene, controller } = setup();
    const center = new Vector3(4, 0.7, -2);
    controller.castCampoGelo(center, 3.4);
    center.set(8, 0, 9);
    advance(controller, 0.2);
    expect(controller.getCastStates()[0].center).toEqual([4, 0.715, -2]);
    expect(controller.getCastStates()[0].radius).toBe(3.4);
    const crystals = scene.getObjectByName("tk-campo-gelo-crystals") as InstancedMesh;
    expect(crystals.count).toBe(28);
    const matrix = new Matrix4();
    const point = new Vector3();
    const vertices = crystals.geometry.getAttribute("position");
    for (let i = 0; i < crystals.count; i++) {
      crystals.getMatrixAt(i, matrix);
      expect(matrix.elements.every(Number.isFinite)).toBe(true);
      for (let vertex = 0; vertex < vertices.count; vertex++) {
        point.fromBufferAttribute(vertices, vertex).applyMatrix4(matrix);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(Math.hypot(point.x, point.z)).toBeLessThanOrEqual(3.4);
      }
    }
  });

  it("separa as fases e remove sistemas e luzes ao terminar", () => {
    const { scene, controller, batch } = setup();
    controller.castCampoGelo(new Vector3(), 3.4);
    expect(controller.getSystems().filter(system => !system.paused)).toHaveLength(2);
    advance(controller, 0.15);
    expect(controller.getCastStates()[0].vaporStarted).toBe(true);
    expect(controller.getCastStates()[0].residualStarted).toBe(false);
    expect(controller.getParticleCount()).toBeGreaterThan(0);
    advance(controller, 0.2);
    expect(controller.getPhase()).toBe("fade");
    advance(controller, 0.4);
    expect(controller.getActiveCastCount()).toBe(0);
    expect(controller.getParticleCount()).toBe(0);
    expect(batch.systemToBatchIndex.size).toBe(0);
    expect(scene.getObjectByName("tk-campo-gelo-cast")).toBeUndefined();
    controller.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("recusa entradas inválidas e limita casts simultâneos", () => {
    const { controller, batch } = setup();
    controller.castCampoGelo(new Vector3(NaN, 0, 0));
    controller.castCampoGelo(new Vector3(), 0);
    controller.castCampoGelo(new Vector3(), Infinity);
    expect(controller.getActiveCastCount()).toBe(0);
    for (let i = 0; i < 5; i++) controller.castCampoGelo(new Vector3(i, 0, 0));
    expect(controller.getActiveCastCount()).toBe(3);
    expect(batch.systemToBatchIndex.size).toBe(12);
    controller.clear();
    expect(batch.systemToBatchIndex.size).toBe(0);
  });

  it("aquece e despacha o controller dedicado no centro mecânico", () => {
    const scene = new Scene();
    const effects = new EffectManager({ appendChild() {} } as unknown as HTMLElement, scene);
    try {
      const profile = getSkillVfxProfile("tk_mag_campo_gelo")!;
      effects.warmSkills([profile.skill], 2, 5);
      const controller = effects.getTkRegistry().get("campo-gelo");
      expect(controller.getActiveCastCount()).toBe(1);
      expect(controller.getCastStates()[0].radius).toBe(profile.skill.radius);
      expect(effects.getTkRegistry().has("aura")).toBe(false);
      effects.clearSkillVfx();
      effects.dispatchSkillVfx({
        profile, origin: new Vector3(2, 0, 5), center: new Vector3(2, 0, 5),
        target: new Vector3(8, 0, 5), colorHex: profile.colorHex, facing: 0,
        radius: 3.4, range: 3.4, hits: [], hasHeal: false, hasBuff: false,
        hasTransform: false, hasSummon: false,
      });
      expect(controller.getCastStates()[0].center).toEqual([2, 0.015, 5]);
      advance(controller, 0.8);
      expect(controller.getActiveCastCount()).toBe(0);
    } finally {
      effects.dispose();
    }
  });
});

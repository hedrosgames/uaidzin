import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  type Texture,
} from "three";
import {
  Bezier,
  ColorOverLife,
  ConeEmitter,
  ConstantColor,
  ConstantValue,
  FrameOverLife,
  Gradient,
  IntervalValue,
  ParticleSystem,
  PiecewiseBezier,
  PointEmitter,
  RenderMode,
  SizeOverLife,
  Vector3 as QuarksVector3,
  Vector3Function,
  Vector4,
} from "three.quarks";
import { ForceWaveTextures } from "./ForceWaveTextures";
import type { ForceWaveVfxConfig } from "./ForceWaveVfx";

export class ForceWaveResources {
  readonly textures = new ForceWaveTextures();
  readonly geometry = createWaveGeometry();
  readonly streakGeometry = createStreakGeometry();
  readonly materials = {
    main: createMaterial(this.textures.main),
    streak: createMaterial(this.textures.streak),
    edge: createMaterial(this.textures.edge),
    impact: createMaterial(this.textures.impact),
    debris: createMaterial(this.textures.debris),
  };

  dispose(): void {
    this.geometry.dispose();
    this.streakGeometry.dispose();
    for (const material of Object.values(this.materials)) material.dispose();
    this.textures.dispose();
  }
}

function createStreakGeometry(): PlaneGeometry {
  const geometry = new PlaneGeometry(1, 1);
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    uv.setXY(i, uv.getY(i), 1 - u);
  }
  return geometry;
}

function createMaterial(map: Texture): MeshBasicMaterial {
  return new MeshBasicMaterial({
    map,
    color: 0xffffff,
    transparent: true,
    blending: NormalBlending,
    side: DoubleSide,
    depthWrite: false,
    depthTest: true,
    alphaTest: 0.005,
    toneMapped: false,
  });
}

function createWaveGeometry(): BufferGeometry {
  const positions: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  const segments = 12;
  for (let ribbon = 0; ribbon < 3; ribbon++) {
    const offset = positions.length / 3;
    const angle = ribbon * Math.PI / 3;
    for (let step = 0; step <= segments; step++) {
      const t = step / segments;
      const twist = angle + Math.sin(t * Math.PI) * 0.13;
      for (const side of [-1, 1]) {
        const radius = side * 0.5;
        const bend = Math.sin(t * Math.PI) * 0.035;
        positions.push(
          Math.cos(twist) * radius + Math.sin(angle) * bend,
          Math.sin(twist) * radius - Math.cos(angle) * bend,
          (t - 0.03) / 0.91,
        );
        uv.push(t, (side + 1) / 2);
      }
      if (step === segments) continue;
      const a = offset + step * 2;
      indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function expansion(): PiecewiseBezier {
  return new PiecewiseBezier([
    [new Bezier(0.15, 0.35, 0.65, 0.8), 0],
    [new Bezier(0.8, 0.92, 1, 1), 0.2],
    [new Bezier(1, 1, 1, 1), 0.4],
    [new Bezier(1, 1.05, 1.1, 1.15), 0.7],
  ]);
}

function fade(peak: number): ColorOverLife {
  return new ColorOverLife(new Gradient(
    [
      [new QuarksVector3(1, 1, 1), 0],
      [new QuarksVector3(0.92, 0.93, 0.94), 1],
    ],
    [[0, 0], [peak, 0.08], [peak * 0.85, 0.45], [peak * 0.32, 0.72], [0, 1]],
  ));
}

export function createForceWaveSystems(
  shared: ForceWaveResources,
  config: ForceWaveVfxConfig,
  distance: number,
): Record<"main" | "streaks" | "edge" | "impact" | "debris", ParticleSystem> {
  const total = config.startupDuration + config.travelDuration + config.fadeDuration;
  const speed = distance / config.travelDuration;
  const reachScale = Math.min(1, Math.max(0.25, distance / 2));
  const burst = (count: number) => [{
    time: 0,
    count: new ConstantValue(count),
    cycle: 1,
    interval: 0,
    probability: 1,
  }];
  const common = {
    autoDestroy: false,
    looping: false,
    duration: 1 / 60,
    startColor: new ConstantColor(new Vector4(1, 1, 1, 1)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    worldSpace: true,
    renderOrder: 12,
  };
  const main = new ParticleSystem({
    ...common,
    startLife: new ConstantValue(total),
    startSpeed: new ConstantValue(0),
    startSize: new ConstantValue(1),
    shape: new PointEmitter(),
    emissionBursts: burst(1),
    material: shared.materials.main,
    renderMode: RenderMode.Mesh,
    instancingGeometry: shared.geometry,
    worldSpace: false,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    behaviors: [
      new FrameOverLife(new PiecewiseBezier([[new Bezier(0, 5, 10, 15), 0]])),
      new SizeOverLife(new Vector3Function(expansion(), expansion(), new ConstantValue(1))),
      fade(0.86),
    ],
  });
  const streaks = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(config.travelDuration * 0.72, config.travelDuration * 1.12),
    startSpeed: new IntervalValue(speed * 0.82, speed * 1.02),
    startSize: new IntervalValue(0.04, 0.085),
    emissionBursts: burst(6),
    shape: new ConeEmitter({ radius: 0.075, thickness: 1, angle: 0.085 }),
    material: shared.materials.streak,
    instancingGeometry: shared.streakGeometry,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.014, lengthFactor: 3.2 },
    behaviors: [fade(0.82), new SizeOverLife(new PiecewiseBezier([[new Bezier(0.65, 1, 0.8, 0), 0]]))],
  });
  const edge = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.08, 0.14),
    startSpeed: new IntervalValue(speed * 0.35, speed * 0.52),
    startSize: new IntervalValue(0.22, 0.38),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionBursts: burst(4),
    shape: new ConeEmitter({ radius: 0.28, thickness: 0.15, angle: 0.32 }),
    material: shared.materials.edge,
    renderMode: RenderMode.BillBoard,
    behaviors: [fade(0.62), new SizeOverLife(expansion())],
  });
  const impact = new ParticleSystem({
    ...common,
    startLife: new ConstantValue(config.fadeDuration),
    startSpeed: new ConstantValue(0),
    startSize: new ConstantValue(Math.min(config.endWidth, config.endHeight) * 0.95 * reachScale),
    startRotation: new IntervalValue(-0.35, 0.35),
    emissionBursts: burst(1),
    shape: new PointEmitter(),
    material: shared.materials.impact,
    renderMode: RenderMode.BillBoard,
    renderOrder: 14,
    behaviors: [
      fade(0.95),
      new SizeOverLife(new PiecewiseBezier([
        [new Bezier(0.4, 0.8, 1, 1), 0],
        [new Bezier(1, 1.04, 1.08, 1.1), 0.18],
      ])),
    ],
  });
  const debris = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.06, 0.12),
    startSpeed: new IntervalValue(speed * 0.18, speed * 0.32),
    startSize: new IntervalValue(0.045, 0.1),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionBursts: burst(9),
    shape: new ConeEmitter({ radius: 0.15, thickness: 1, angle: 0.65 }),
    material: shared.materials.debris,
    renderMode: RenderMode.BillBoard,
    behaviors: [fade(0.7), new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.85, 0.2, 0), 0]]))],
  });
  const systems = { main, streaks, edge, impact, debris };
  for (const [key, system] of Object.entries(systems)) {
    system.emitter.name = `PhysicalForce_${key === "main" ? "Main" : key[0]!.toUpperCase() + key.slice(1)}`;
    system.pause();
    system.emitter.visible = false;
  }
  return systems;
}

import { type BufferGeometry, type MeshBasicMaterial } from "three";
import {
  AxisAngleGenerator, Bezier, ColorOverLife, ConeEmitter, ConstantColor,
  ConstantValue, FrameOverLife, Gradient, IntervalValue, ParticleSystem,
  PiecewiseBezier, RenderMode, RotationOverLife, SizeOverLife,
  Vector3 as QuarksVector3, Vector3Function, Vector4,
} from "three.quarks";
import type { DeathStabResources } from "./DeathStabResources";

const value = (number: number) => new ConstantValue(number);
const curve = (start: number, end: number) => new PiecewiseBezier([
  [new Bezier(start, start + (end - start) / 3, start + (end - start) * 2 / 3, end), 0],
]);

interface BurstOptions {
  name: string;
  count: number;
  life: number;
  speed: number;
  size: number;
  alpha: number;
  angle: number;
  radius: number;
  material: MeshBasicMaterial;
  geometry?: BufferGeometry;
}

function burst(options: BurstOptions): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false, looping: false, duration: 0.01,
    startLife: new IntervalValue(options.life * 0.75, options.life),
    startSpeed: new IntervalValue(options.speed * 0.8, options.speed),
    startSize: new IntervalValue(options.size * 0.7, options.size * 1.15),
    startRotation: options.geometry
      ? new AxisAngleGenerator(new QuarksVector3(0, 0, 1), new IntervalValue(-Math.PI, Math.PI))
      : new IntervalValue(-0.8, 0.8),
    startColor: new ConstantColor(new Vector4(1, 1, 1, options.alpha)),
    emissionOverTime: value(0), emissionOverDistance: value(0),
    emissionBursts: [{ time: 0, count: value(options.count), cycle: 1, interval: 0, probability: 1 }],
    shape: new ConeEmitter({ radius: options.radius, thickness: 1, angle: options.angle }),
    material: options.material, instancingGeometry: options.geometry,
    renderMode: options.geometry ? RenderMode.Mesh : RenderMode.BillBoard,
    worldSpace: true,
    behaviors: [new ColorOverLife(new Gradient(
      [[new QuarksVector3(1, 1, 1), 0], [new QuarksVector3(0.85, 0.86, 0.87), 1]],
      [[0, 0], [1, 0.07], [0.72, 0.5], [0.4, 0.75], [0, 1]],
    )), new SizeOverLife(curve(1, 0.25))],
  });
  system.emitter.name = options.name;
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function createMainWave(resources: DeathStabResources, distance: number, duration: number, index: number): ParticleSystem {
  const system = burst({ name: "DeathStab_MainWaves", count: 1, life: duration,
    speed: distance / duration, size: 0.82 + index * 0.08, alpha: 0.94 - index * 0.05,
    angle: 0, radius: 0, material: resources.windMaterial, geometry: resources.wave });
  system.startLife = value(duration);
  system.startSpeed = value(distance / duration);
  system.startRotation = new AxisAngleGenerator(new QuarksVector3(0, 0, 1), value(index * 0.57 + 0.2));
  system.uTileCount = 4;
  system.vTileCount = 4;
  system.blendTiles = true;
  const growth = new PiecewiseBezier([
    [new Bezier(0.35, 0.48, 0.62, 0.75), 0],
    [new Bezier(0.75, 0.84, 0.94, 1), 0.15],
    [new Bezier(1, 1.02, 1.03, 1.05), 0.4],
    [new Bezier(1.05, 1.08, 1.12, 1.15), 0.7],
  ]);
  system.behaviors.pop();
  system.behaviors.push(new SizeOverLife(new Vector3Function(growth, growth, curve(0.8, 1.1))),
    new FrameOverLife(curve(0, 15)));
  return system;
}

export function createDeathStabBursts(resources: DeathStabResources, distance: number, travel: number) {
  const common = { angle: 0.06, radius: 0.12, material: resources.strokeMaterial, geometry: resources.needle };
  const release = burst({ ...common, name: "DeathStab_WeaponFlash", count: 3, life: 0.055,
    speed: 5, size: 0.8, alpha: 0.95, angle: 0.5, material: resources.flashMaterial });
  const trail = burst({ ...common, name: "DeathStab_CenterTrail", count: 6, life: travel * 0.8,
    speed: distance / travel * 0.8, size: 0.85, alpha: 0.2, radius: 0.035 });
  const streaks = burst({ ...common, name: "DeathStab_SpeedStreaks", count: 10, life: travel,
    speed: distance / travel, size: 1.4, alpha: 0.68 });
  const curls = burst({ name: "DeathStab_WindCurls", count: 5, life: 0.19,
    speed: 3.5, size: 0.34, alpha: 0.36, angle: 0.9, radius: 0.2, material: resources.curlMaterial });
  curls.behaviors.push(new RotationOverLife(curve(-2, 2)));
  const impact = burst({ ...common, name: "DeathStab_Impact", count: 5, life: 0.105,
    speed: 5, size: 1.1, alpha: 0.9, angle: 0.68, material: resources.flashMaterial });
  const fragments = burst({ ...common, name: "DeathStab_ImpactFragments", count: 4, life: 0.12,
    speed: 3.8, size: 0.4, alpha: 0.7, angle: 0.8,
    geometry: resources.shard, material: resources.shardMaterial });
  const pressure = burst({ name: "DeathStab_ImpactPressure", count: 2, life: 0.11,
    speed: 1, size: 0.52, alpha: 0.42, angle: 0.5, radius: 0.03, material: resources.curlMaterial });
  const overshoot = burst({ ...common, name: "DeathStab_Overshoot", count: 3, life: 0.085,
    speed: 9, size: 1.1, alpha: 0.62, radius: 0.04 });
  return { release, trail, streaks, curls, impact, fragments, pressure, overshoot };
}

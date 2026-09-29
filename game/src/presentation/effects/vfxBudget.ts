import { BatchedRenderer, ConstantValue, TurbulenceField, type ParticleSystem } from "three.quarks";
import { getActiveProfile } from "../rendering/GraphicsQuality";

const tuned = new WeakSet<ParticleSystem>();

function scaledValue(base: number, round: boolean): ConstantValue {
  const value = new ConstantValue(base);
  value.genValue = () => {
    const scaled = base * getActiveProfile().vfxScale;
    return round ? Math.max(1, Math.round(scaled)) : scaled;
  };
  return value;
}

function tuneParticleSystem(system: ParticleSystem): void {
  if (tuned.has(system)) return;
  tuned.add(system);
  if (system.emissionOverTime instanceof ConstantValue && system.emissionOverTime.value > 0) {
    system.emissionOverTime = scaledValue(system.emissionOverTime.value, false);
  }
  if (system.emissionOverDistance instanceof ConstantValue && system.emissionOverDistance.value > 0) {
    system.emissionOverDistance = scaledValue(system.emissionOverDistance.value, false);
  }
  for (const burst of system.emissionBursts ?? []) {
    if (burst.count instanceof ConstantValue && burst.count.value > 0) {
      burst.count = scaledValue(burst.count.value, true);
    }
  }
  for (const behavior of system.behaviors) {
    if (!(behavior instanceof TurbulenceField)) continue;
    const original = behavior.update.bind(behavior);
    behavior.update = (particle, delta) => {
      if (!getActiveProfile().vfxTurbulence) return;
      original(particle, delta);
    };
  }
}

let installed = false;

export function installVfxBudget(): void {
  if (installed) return;
  installed = true;
  const original = BatchedRenderer.prototype.addSystem;
  BatchedRenderer.prototype.addSystem = function (system: ParticleSystem) {
    tuneParticleSystem(system);
    return original.call(this, system);
  };
}

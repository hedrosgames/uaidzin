import { Group, PointLight, type Scene } from "three";
import { TK_LIGHT_POOL_SIZE } from "../../data/balance/vfx";

export class TkLightPool {
  private readonly available: PointLight[] = [];
  private readonly inUse = new Set<PointLight>();
  private readonly root = new Group();

  constructor(scene?: Scene, size = TK_LIGHT_POOL_SIZE) {
    this.root.name = "tk-light-pool";
    for (let i = 0; i < size; i++) {
      const light = new PointLight(0xffffff, 0, 8, 2);
      light.name = `tk-pool-light-${i}`;
      this.available.push(light);
      this.root.add(light);
    }
    scene?.add(this.root);
  }

  acquire(color?: number, distance?: number): PointLight | null {
    const light = this.available.pop();
    if (!light) return null;
    this.inUse.add(light);
    if (color !== undefined) light.color.set(color);
    if (distance !== undefined) light.distance = distance;
    light.intensity = 0;
    return light;
  }

  release(light: PointLight | null | undefined): void {
    if (!light || !this.inUse.has(light)) return;
    this.inUse.delete(light);
    light.intensity = 0;
    this.root.add(light);
    this.available.push(light);
  }

  clear(): void {
    for (const light of this.inUse) {
      light.intensity = 0;
      this.root.add(light);
      this.available.push(light);
    }
    this.inUse.clear();
  }

  dispose(): void {
    this.clear();
    this.root.removeFromParent();
    for (const light of this.available) {
      light.dispose();
    }
    this.available.length = 0;
  }

  getAvailableCount(): number {
    return this.available.length;
  }

  getInUseCount(): number {
    return this.inUse.size;
  }
}

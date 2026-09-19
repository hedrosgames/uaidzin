import type { Group } from "three";
import { buildCityWorld, buildTestDungeonWorld, type BuiltWorld } from "./CityWorld";

export type WorldId = "city" | "dungeon-test";

export class WorldManager {
  private cache = new Map<WorldId, BuiltWorld>();
  private current: BuiltWorld | null = null;

  constructor(private readonly sceneRoot: Group) {}

  getCurrent(): BuiltWorld | null {
    return this.current;
  }

  getCurrentId(): WorldId | null {
    return this.current?.id as WorldId | null;
  }

  private ensure(id: WorldId): BuiltWorld {
    const hit = this.cache.get(id);
    if (hit) return hit;
    const built = id === "city" ? buildCityWorld() : buildTestDungeonWorld();
    this.cache.set(id, built);
    return built;
  }

  switchTo(id: WorldId): BuiltWorld {
    if (this.current) {
      this.sceneRoot.remove(this.current.group);
    }
    const world = this.ensure(id);
    this.sceneRoot.add(world.group);
    this.current = world;
    return world;
  }

  dispose(): void {
    for (const world of this.cache.values()) {
      for (const tick of world.tickables) tick.dispose();
      world.group.traverse((obj) => {
        const mesh = obj as {
          geometry?: { dispose(): void };
          material?: { dispose(): void; map?: { dispose(): void } } | Array<{ dispose(): void; map?: { dispose(): void } }>;
        };
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const m of mats) {
          m.map?.dispose();
          m.dispose();
        }
      });
    }
    this.cache.clear();
    this.current = null;
  }
}

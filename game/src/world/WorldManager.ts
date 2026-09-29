import type { Group } from "three";
import { buildDungeon1World } from "./Dungeon1World";
import { buildCityWorld, buildDungeon2World, buildTestDungeonWorld, type BuiltWorld } from "./CityWorld";
import { beginWorldVisuals, endWorldVisuals } from "./WorldVisuals";

export type WorldId = "city" | "dungeon-test" | "dungeon-1" | "dungeon-2";

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
    beginWorldVisuals();
    let built: BuiltWorld;
    try {
      if (id === "city") {
        built = buildCityWorld();
      } else if (id === "dungeon-1") {
        built = buildDungeon1World();
      } else if (id === "dungeon-2") {
        built = buildDungeon2World();
      } else {
        built = buildTestDungeonWorld();
      }
    } catch (error) {
      void endWorldVisuals();
      throw error;
    }
    built.visualsReady = endWorldVisuals();
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

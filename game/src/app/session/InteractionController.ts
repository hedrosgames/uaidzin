import { Raycaster, Vector2, Vector3, type Object3D } from "three";
import type { PlayerRuntime } from "../../gameplay/PlayerRuntime";
import type { CharacterModel } from "../../domain/character/CharacterModel";
import type { WorldManager } from "../../world/WorldManager";
import type { GameCamera } from "../../presentation/camera/GameCamera";
import type { SceneRenderer } from "../../presentation/rendering/SceneRenderer";
import type { EventBus } from "../../core/events/EventBus";
import type { InputService } from "../../gameplay/InputService";
import type { PlayerController } from "../../gameplay/PlayerController";
import type { InteractionPanel } from "../../ui/InteractionPanel";
import type { InteractableDef } from "../../world/definitions";
import { projectWalkTarget } from "../../world/collision";
import type { DungeonFlow } from "./DungeonFlow";
import type { DungeonRun } from "../../domain/dungeons/DungeonRun";
import { dungeonEnterMessage } from "./types";

export const INTERACT_RANGE = 1.6;

export interface InteractionControllerDeps {
  player: PlayerRuntime;
  character: CharacterModel;
  worlds: WorldManager;
  camera: GameCamera;
  renderer: SceneRenderer;
  bus: EventBus;
  input: InputService;
  controller: PlayerController;
  panel: InteractionPanel;
  dungeonFlow: DungeonFlow;
  dungeonRun: DungeonRun;
  showToast: (text: string, kind?: "skill" | "attr" | "level" | "dungeon") => void;
}

export class InteractionController {
  private readonly interactRaycaster = new Raycaster();
  private readonly interactNdc = new Vector2();
  nearby: InteractableDef | null = null;
  pendingInteract: InteractableDef | null = null;

  constructor(private readonly deps: InteractionControllerDeps) {}

  updateNearby(list: InteractableDef[]): void {
    let best: InteractableDef | null = null;
    let bestDist = INTERACT_RANGE;
    for (const item of list) {
      const d = this.deps.player.distanceTo(item.x, item.z);
      if (d < bestDist) {
        best = item;
        bestDist = d;
      }
    }
    if (best?.id !== this.nearby?.id) {
      this.nearby = best;
      this.deps.bus.emit("player:near-interactable", {
        id: best?.id ?? null,
        label: best?.label ?? null,
        kind: best?.kind ?? null,
      });
    }
  }

  handleInteractKey(): void {
    if (this.deps.input.isUiOpen() || this.deps.character.isDead) return;
    if (!this.deps.controller.isInteractPressed()) return;
    if (!this.nearby || this.nearby.kind === "npc") return;
    this.tryInteract(this.nearby);
  }

  pickInteractableByRay(
    ndcX: number,
    ndcY: number,
    list: InteractableDef[],
  ): InteractableDef | null {
    this.interactNdc.set(ndcX, ndcY);
    this.interactRaycaster.setFromCamera(this.interactNdc, this.deps.camera.camera);
    const hits = this.interactRaycaster.intersectObjects(this.deps.renderer.worldRoot.children, true);
    for (const hit of hits) {
      let obj: Object3D | null = hit.object;
      while (obj) {
        const id = obj.userData.interactableId as string | undefined;
        if (id) {
          const def = list.find((item) => item.id === id);
          if (def) return def;
          break;
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  pickInteractableAt(
    x: number,
    z: number,
    list: InteractableDef[],
  ): InteractableDef | null {
    let best: InteractableDef | null = null;
    let bestDist = 1.1;
    for (const item of list) {
      const d = Math.hypot(item.x - x, item.z - z);
      if (d < bestDist) {
        best = item;
        bestDist = d;
      }
    }
    return best;
  }

  groundPointFromNdc(ndcX: number, ndcY: number): { x: number; z: number } | null {
    const cam = this.deps.camera.camera;
    const origin = cam.position.clone();
    const vec = new Vector3(ndcX, ndcY, 0.5);
    vec.unproject(cam).sub(origin).normalize();
    if (Math.abs(vec.y) < 1e-5) return null;
    const t = -origin.y / vec.y;
    if (t < 0) return null;
    return { x: origin.x + vec.x * t, z: origin.z + vec.z * t };
  }

  clearPendingInteract(): void {
    this.pendingInteract = null;
  }

  approachPoint(tx: number, tz: number, stopDist: number): { x: number; z: number } {
    const dx = tx - this.deps.player.x;
    const dz = tz - this.deps.player.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= stopDist || dist < 1e-6) return { x: this.deps.player.x, z: this.deps.player.z };
    const t = (dist - stopDist) / dist;
    return { x: this.deps.player.x + dx * t, z: this.deps.player.z + dz * t };
  }

  queueOrInteract(def: InteractableDef): void {
    if (this.deps.character.isDead) return;
    if (this.deps.player.distanceTo(def.x, def.z) <= INTERACT_RANGE) {
      this.clearPendingInteract();
      this.tryInteract(def);
      return;
    }
    this.pendingInteract = def;
    const stopAt = Math.max(0.85, INTERACT_RANGE * 0.72);
    const point = this.approachPoint(def.x, def.z, stopAt);
    const world = this.deps.worlds.getCurrent();
    if (world) {
      const safe = projectWalkTarget(
        point.x,
        point.z,
        this.deps.player.radius,
        world.collision,
        this.deps.player.x,
        this.deps.player.z,
      );
      this.deps.player.setMoveTarget(safe.x, safe.z);
    } else {
      this.deps.player.setMoveTarget(point.x, point.z);
    }
  }

  resolvePendingInteract(): void {
    const def = this.pendingInteract;
    if (!def || this.deps.character.isDead) return;
    if (this.deps.player.distanceTo(def.x, def.z) > INTERACT_RANGE) return;
    this.clearPendingInteract();
    this.deps.player.clearMoveTarget();
    this.tryInteract(def);
  }

  beginInteract(def: InteractableDef): void {
    this.queueOrInteract(def);
  }

  tryInteract(def: InteractableDef): void {
    if (this.deps.player.distanceTo(def.x, def.z) > INTERACT_RANGE) return;
    if (this.openNpcService(def.id)) return;
    if (def.kind === "portal-exit") {
      this.confirmInteraction(def.id);
      return;
    }
    this.openInteraction(def);
  }

  openNpcService(id: string): boolean {
    if (id === "vault-chest") {
      this.openVaultBank();
      return true;
    }
    if (id === "npc-composer") {
      this.openComposer();
      return true;
    }
    if (id === "npc-merchant") {
      this.openShop("Mercador", "merchant");
      return true;
    }
    if (id === "npc-blacksmith") {
      this.openShop("Ferreiro", "blacksmith");
      return true;
    }
    if (id === "npc-portal-guard") {
      this.openNpcPanel("portal");
      return true;
    }
    if (id === "npc-skill-master") {
      this.openSkillMaster();
      return true;
    }
    if (id === "npc-sage") {
      this.openSage();
      return true;
    }
    if (id === "npc-quest") {
      this.openNpcPanel("quest");
      return true;
    }
    return false;
  }

  closeInteractionOverlay(): void {
    this.deps.panel.close();
  }

  openVaultBank(): void {
    const world = this.deps.worlds.getCurrent();
    const chest = world?.interactables.find((i) => i.id === "vault-chest");
    if (!chest) return;
    if (this.deps.player.distanceTo(chest.x, chest.z) > INTERACT_RANGE) return;
    this.closeInteractionOverlay();
    this.deps.bus.emit("ui:open-panel", { panel: "inv" });
    this.deps.bus.emit("ui:open-panel", { panel: "vault" });
  }

  openShop(title: "Mercador" | "Ferreiro", shopId: "merchant" | "blacksmith"): void {
    this.closeInteractionOverlay();
    this.deps.bus.emit("ui:open-panel", { panel: "inv" });
    this.deps.bus.emit("ui:open-panel", { panel: "shop", title, shopId });
  }

  openSage(): void {
    this.closeInteractionOverlay();
    this.deps.bus.emit("ui:open-panel", { panel: "sage" });
  }

  openComposer(): void {
    this.closeInteractionOverlay();
    this.deps.bus.emit("ui:open-panel", { panel: "composer" });
  }

  openSkillMaster(): void {
    this.closeInteractionOverlay();
    this.deps.bus.emit("ui:open-panel", { panel: "person" });
    this.deps.bus.emit("ui:open-panel", { panel: "skills" });
    this.deps.bus.emit("ui:open-panel", { panel: "skillmaster" });
  }

  openNpcPanel(panel: "portal" | "quest"): void {
    this.closeInteractionOverlay();
    this.deps.bus.emit("ui:open-panel", { panel });
  }

  openInteraction(def: InteractableDef): void {
    if (this.openNpcService(def.id)) return;
    this.deps.input.setUiOpen(true);
    let body = def.body;
    if (def.kind === "portal") {
      const pick = this.deps.dungeonFlow.pickDungeonForLevel();
      const gate = this.deps.dungeonFlow.dungeonEntryGate(pick.id);
      const mm = String(Math.floor(pick.durationSeconds / 60)).padStart(2, "0");
      const ss = String(pick.durationSeconds % 60).padStart(2, "0");
      const arenaCount = pick.arenas.length;
      body = `${pick.name}\nNível ${pick.minLevel}–${pick.maxLevel} (${gate.ok ? "ok" : "fora"})\nDuração: ${mm}:${ss} · ${arenaCount} ${arenaCount === 1 ? "arena" : "arenas"}\nDisponíveis p/ seu nível: ${this.deps.dungeonFlow.eligibleDungeons().map((d) => d.name).join(", ") || "—"}`;
    }
    this.deps.panel.open({ id: def.id, label: def.label, body, kind: def.kind });
    this.deps.bus.emit("interaction:opened", { id: def.id, label: def.label, body });
  }

  confirmInteraction(id: string): void {
    const world = this.deps.worlds.getCurrent();
    const def = world?.interactables.find((i) => i.id === id);
    if (!def) return;
    if (this.openNpcService(id)) return;
    if (def.kind === "portal") {
      this.closeInteractionOverlay();
      const result = this.deps.dungeonFlow.tryEnterDungeon(this.deps.dungeonFlow.pickDungeonForLevel().id);
      if (!result.ok) this.deps.showToast(dungeonEnterMessage(result.reason), "dungeon");
      return;
    }
    if (def.kind === "portal-exit") {
      this.closeInteractionOverlay();
      if (this.deps.dungeonRun.getPhase() === "active") this.deps.dungeonFlow.finishDungeon("exit");
      else {
        this.deps.dungeonFlow.returnToCityWithFade();
      }
      return;
    }
    this.closeInteractionOverlay();
  }

  closePanel(): void {
    this.deps.bus.emit("interaction:closed", { id: null });
  }
}

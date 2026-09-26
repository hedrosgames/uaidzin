import { registerThreeDevTools } from "../../integrations/threejs-devtools/registerThreeDevTools";
import { isWeaponSetId, type WeaponSetId } from "../../presentation/player/WeaponRig";
import { buildCatalog, findClip, IDLE_CLIP_ID, loadAvailableModels, type LabCatalog } from "./catalog";
import { CharacterCard, type CharacterCardState } from "./CharacterCard";
import { requireElement } from "./dom";
import type { LabCard } from "./LabCard";
import { ModelViewer } from "./ModelViewer";
import { MonsterCard, type MonsterCardState } from "./MonsterCard";
import { MOUNT_FILE_LABEL, MountStore } from "./MountStore";

export interface LabApiState {
  ready: boolean;
  characters: CharacterCardState[];
  monsters: MonsterCardState[];
}

export interface LabApi {
  state: () => LabApiState;
}

type AnyCard = LabCard<ModelViewer | null>;

export class ModelLab {
  private readonly store = new MountStore();
  private readonly characters: CharacterCard[] = [];
  private readonly monsters: MonsterCard[] = [];
  private readonly weaponAll: HTMLSelectElement;
  private readonly animAll: HTMLSelectElement;
  private readonly charsNote: HTMLElement;
  private readonly monstersNote: HTMLElement;
  private readonly statusEl: HTMLElement;
  private catalog: LabCatalog | null = null;
  private activeClipId = IDLE_CLIP_ID;
  private weaponToken = 0;
  private clipToken = 0;
  private lastTime = 0;

  constructor() {
    this.weaponAll = requireElement(document, "#weapon-all", HTMLSelectElement);
    this.animAll = requireElement(document, "#anim-all", HTMLSelectElement);
    this.charsNote = requireElement(document, "#chars-note", HTMLElement);
    this.monstersNote = requireElement(document, "#monsters-note", HTMLElement);
    this.statusEl = requireElement(document, "#lab-status", HTMLElement);
  }

  async start(): Promise<void> {
    const models = await loadAvailableModels();
    const catalog = buildCatalog(models);
    this.catalog = catalog;
    await this.store.load();
    this.buildCharacters(catalog);
    this.buildMonsters(catalog);
    this.buildToolbar(catalog);
    this.bindTabs();
    this.observeVisibility();
    this.writeStatus(catalog);
    this.registerDevTools();
    this.lastTime = performance.now();
    requestAnimationFrame(this.tick);
    this.exposeApi();
  }

  private buildCharacters(catalog: LabCatalog): void {
    const grid = requireElement(document, "#char-grid", HTMLElement);
    for (const def of catalog.classes) {
      const card = new CharacterCard(def, {
        store: this.store,
        resolveClip: (id) => findClip(catalog.humanClips, id),
        onWeaponSetChange: (classId, set) => this.propagateWeaponSet(classId, set),
      });
      this.characters.push(card);
      grid.append(card.element);
      void card
        .mount()
        .then(() => this.applyActiveClip(card))
        .catch(() => card.setStatus(`Falha ao carregar ${def.modelUrl}`));
    }
  }

  private buildMonsters(catalog: LabCatalog): void {
    const grid = requireElement(document, "#monster-grid", HTMLElement);
    for (const entry of catalog.monsters) {
      const card = new MonsterCard(entry, catalog.monsterClips);
      this.monsters.push(card);
      grid.append(card.element);
      void card.mount().catch(() => card.setStatus(`Falha ao carregar ${entry.modelUrl}`));
    }
  }

  private buildToolbar(catalog: LabCatalog): void {
    for (const set of catalog.weaponSets) {
      this.weaponAll.append(new Option(set.label, set.id));
    }
    this.weaponAll.value = this.characters[0]?.state().weaponSet ?? "";

    this.weaponAll.addEventListener("change", () => void this.selectWeaponSet(this.weaponAll.value));
    requireElement(document, "#weapon-prev", HTMLButtonElement).addEventListener("click", () =>
      this.stepWeaponSet(-1),
    );
    requireElement(document, "#weapon-next", HTMLButtonElement).addEventListener("click", () =>
      this.stepWeaponSet(1),
    );

    for (const clip of catalog.humanClips) {
      this.animAll.append(new Option(clip.label, clip.id));
    }
    this.animAll.value = IDLE_CLIP_ID;
    this.animAll.addEventListener("change", () => void this.selectClip(this.animAll.value));

    this.charsNote.textContent = `${catalog.classes.length} personagens · ${catalog.weaponSets.length} conjuntos de arma · ${catalog.humanClips.length} animações`;
    const withModel = catalog.monsters.filter((entry) => entry.modelUrl !== "").length;
    const clips = catalog.monsterClips?.clips.length ?? 0;
    this.monstersNote.textContent = `${catalog.monsters.length} monstros · ${withModel} com GLB de malha · ${clips} clipes no disco`;
  }

  private bindTabs(): void {
    for (const tab of document.querySelectorAll(".tab")) {
      if (!(tab instanceof HTMLButtonElement)) continue;
      tab.addEventListener("click", () => this.selectTab(tab.dataset.tab ?? ""));
    }
  }

  private selectTab(name: string): void {
    for (const tab of document.querySelectorAll(".tab")) {
      if (!(tab instanceof HTMLButtonElement)) continue;
      const active = tab.dataset.tab === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    }
    for (const view of document.querySelectorAll(".view")) {
      if (!(view instanceof HTMLElement)) continue;
      view.classList.toggle("active", view.id === `view-${name}`);
    }
  }

  private observeVisibility(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const card = this.allCards().find((item) => item.element === entry.target);
          card?.setVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.02 },
    );
    for (const card of this.allCards()) observer.observe(card.element);
  }

  private async selectWeaponSet(set: string): Promise<void> {
    if (!isWeaponSetId(set)) return;
    const token = ++this.weaponToken;
    await Promise.all(this.characters.map((card) => card.equipWeaponSet(set, false)));
    if (token !== this.weaponToken) return;
    this.weaponAll.value = set;
  }

  private stepWeaponSet(delta: number): void {
    const catalog = this.catalog;
    if (!catalog) return;
    const ids = catalog.weaponSets.map((set) => set.id);
    const index = ids.indexOf(this.weaponAll.value as WeaponSetId);
    const next = ids[(index + delta + ids.length) % ids.length];
    if (!next) return;
    void this.selectWeaponSet(next);
  }

  private applyActiveClip(card: CharacterCard): void {
    if (this.activeClipId === card.state().clip) return;
    void card.setClip(this.activeClipId);
  }

  private async selectClip(id: string): Promise<void> {
    const token = ++this.clipToken;
    this.activeClipId = id;
    await Promise.all(this.characters.map((card) => card.setClip(id)));
    if (token !== this.clipToken) return;
    this.animAll.value = id;
  }

  private propagateWeaponSet(classId: string, set: WeaponSetId): void {
    this.weaponAll.value = set;
    const source = this.characters.find((card) => card.def.id === classId);
    for (const card of this.characters) {
      if (card === source) continue;
      void card.equipWeaponSet(set, false);
    }
    this.statusEl.textContent = `${classId} · ${this.weaponAll.selectedOptions[0]?.textContent ?? set}`;
  }

  private registerDevTools(): void {
    const viewer = this.characters[0]?.viewer;
    if (!viewer) return;
    registerThreeDevTools({
      scene: viewer.getScene(),
      renderer: viewer.getRenderer(),
      getCamera: () => viewer.getCamera(),
      getMixers: () => this.allCards().flatMap((card) => card.viewer?.getMixer() ?? []),
    });
  }

  private allCards(): AnyCard[] {
    return [...this.characters, ...this.monsters];
  }

  private writeStatus(catalog: LabCatalog): void {
    const cards = catalog.classes.length + catalog.monsters.length;
    this.statusEl.textContent = `${cards} cards · ajustes gravam em ${MOUNT_FILE_LABEL}`;
  }

  private readonly tick = (now: number): void => {
    const dt = Math.max(0, Math.min(0.05, (now - this.lastTime) / 1000));
    this.lastTime = now;
    if (!document.hidden) {
      for (const card of this.characters) card.update(dt);
      for (const card of this.monsters) card.update(dt);
    }
    requestAnimationFrame(this.tick);
  };

  private exposeApi(): void {
    const host = window as Window & { __MODEL_LAB__?: LabApi };
    host.__MODEL_LAB__ = {
      state: () => ({
        ready: this.characters.length > 0 && this.characters.every((card) => card.state().ready),
        characters: this.characters.map((card) => card.state()),
        monsters: this.monsters.map((card) => card.state()),
      }),
    };
  }
}

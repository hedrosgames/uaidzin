import { IDLE_CLIP_ID, type ClipSetDef, type MonsterEntry } from "./catalog";
import { cloneTemplate, requireElement, textElement } from "./dom";
import { LabCard } from "./LabCard";
import { loadClip } from "./modelUtils";
import { ModelViewer, type CameraPreset } from "./ModelViewer";

export interface MonsterCardState {
  id: string;
  modelUrl: string;
  clip: string | null;
  clips: string[];
}

type CameraButton = { preset: CameraPreset; element: HTMLButtonElement };

export class MonsterCard extends LabCard<ModelViewer | null> {
  readonly entry: MonsterEntry;
  private readonly clipSet: ClipSetDef | null;
  private readonly clipHolder: HTMLElement;
  private readonly clipsTitle: HTMLElement;
  private readonly cameraButtons: CameraButton[] = [];
  private readonly clipButtons = new Map<string, HTMLButtonElement>();
  private activeClipId: string | null = null;

  constructor(entry: MonsterEntry, clipSet: ClipSetDef | null) {
    const element = cloneTemplate("tpl-monster");
    super(element, entry.modelUrl ? new ModelViewer(requireElement(element, ".card-stage", HTMLElement)) : null);
    this.entry = entry;
    this.clipSet = clipSet;
    this.clipHolder = requireElement(element, ".clips", HTMLElement);
    this.clipsTitle = requireElement(element, ".clips-title", HTMLElement);
    this.renderHeader();
    this.bindCamera();
    this.renderClips();
    if (this.viewer) this.setStatus("GLB encontrado · carregando…");
    else this.renderMissingModel();
  }

  async mount(): Promise<void> {
    if (!this.viewer) return;
    await this.viewer.mount(this.entry.modelUrl, null);
    this.viewer.setCameraPreset("corpo");
    if (this.clipSet) {
      const idle = this.clipSet.clips.find((clip) => clip.id === IDLE_CLIP_ID) ?? this.clipSet.clips[0];
      if (idle) await this.playClip(idle.id);
    }
    this.syncCameraButtons();
  }

  state(): MonsterCardState {
    return {
      id: this.entry.id,
      modelUrl: this.entry.modelUrl,
      clip: this.activeClipId,
      clips: this.clipSet ? this.clipSet.clips.map((clip) => clip.id) : [],
    };
  }

  private renderHeader(): void {
    this.element.dataset.monster = this.entry.id;
    requireElement(this.element, ".card-tag", HTMLElement).textContent = this.entry.archetypeLabel;
    requireElement(this.element, ".card-name", HTMLElement).textContent = this.entry.name;
    requireElement(this.element, ".card-sub", HTMLElement).textContent = this.entry.id;
    requireElement(this.element, ".card-flag", HTMLElement).hidden = !this.entry.isBoss;
  }

  private bindCamera(): void {
    if (!this.viewer) return;
    for (const preset of ["corpo", "frente"] as CameraPreset[]) {
      const element = requireElement(this.element, `.cam-${preset}`, HTMLButtonElement);
      this.cameraButtons.push({ preset, element });
      element.addEventListener("click", () => {
        this.viewer?.setCameraPreset(preset);
        this.syncCameraButtons();
      });
    }
  }

  private renderClips(): void {
    this.clipHolder.replaceChildren();
    this.clipButtons.clear();
    this.clipsTitle.hidden = !this.clipSet;
    if (!this.clipSet) return;
    this.clipsTitle.textContent = this.viewer
      ? `Animações · ${this.clipSet.label}`
      : `Animações prontas · ${this.clipSet.label}`;
    for (const clip of this.clipSet.clips) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = this.viewer ? "clip-chip" : "clip-chip ready";
      button.textContent = clip.label;
      button.dataset.clip = clip.id;
      if (this.viewer) {
        button.addEventListener("click", () => {
          void this.playClip(clip.id);
        });
      } else {
        button.disabled = true;
      }
      this.clipButtons.set(clip.id, button);
      this.clipHolder.append(button);
    }
  }

  private renderMissingModel(): void {
    const stage = requireElement(this.element, ".card-stage", HTMLElement);
    stage.classList.add("empty");
    stage.append(
      textElement("span", "stage-empty-title", "Sem malha no disco"),
      textElement("span", "stage-empty-hint", `Esperado em ${this.entry.expectedUrl}`),
    );
    this.setStatus(
      this.clipSet
        ? `Sem GLB · ${this.clipSet.clips.length} clipes de ${this.clipSet.label} prontos`
        : "Sem GLB · nenhum clipe de monstro no disco",
    );
  }

  private async playClip(clipId: string): Promise<void> {
    if (!this.viewer || !this.clipSet) return;
    const clip = this.clipSet.clips.find((item) => item.id === clipId);
    if (!clip) return;
    const loaded = await loadClip(clip.url);
    if (!loaded) return;
    this.viewer.bindClip(clip.id, loaded);
    if (!this.viewer.playClip(clip.id)) return;
    this.activeClipId = clip.id;
    for (const [id, button] of this.clipButtons) {
      button.setAttribute("aria-pressed", String(id === this.activeClipId));
    }
    this.setStatus(`${this.clipSet.label} · ${clip.label}`);
  }

  private syncCameraButtons(): void {
    const active = this.viewer?.getCameraPreset();
    for (const { preset, element } of this.cameraButtons) {
      element.setAttribute("aria-pressed", String(preset === active));
    }
  }
}

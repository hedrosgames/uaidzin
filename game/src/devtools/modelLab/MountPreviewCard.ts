import { MOUNT_LAB_CLIP_COMPANIONS, MOUNT_MODEL_URL, type ClipDef } from "./catalog";
import { cloneTemplate, requireElement } from "./dom";
import { LabCard } from "./LabCard";
import { ModelViewer, type CameraPreset } from "./ModelViewer";

const MOUNT_TARGET_HEIGHT = 1.72 * 1.1;

export interface MountPreviewCardState {
  id: string;
  ready: boolean;
  clip: string | null;
  clips: string[];
}

type CameraButton = { preset: CameraPreset; element: HTMLButtonElement };

export class MountPreviewCard extends LabCard<ModelViewer> {
  private readonly clipDefs: ClipDef[];
  private readonly clipHolder: HTMLElement;
  private readonly cameraButtons: CameraButton[] = [];
  private readonly clipButtons = new Map<string, HTMLButtonElement>();
  private activeClipId: string | null = null;
  private ready = false;

  constructor(clipDefs: ClipDef[]) {
    const element = cloneTemplate("tpl-mount");
    super(element, new ModelViewer(requireElement(element, ".card-stage", HTMLElement)));
    this.clipDefs = clipDefs;
    this.clipHolder = requireElement(element, ".clips", HTMLElement);
    this.renderHeader();
    this.bindCamera();
    this.renderClips();
    this.setStatus("Carregando montaria…");
  }

  async mount(): Promise<void> {
    await this.viewer.mountEmbeddedClips(MOUNT_MODEL_URL, MOUNT_TARGET_HEIGHT);
    this.viewer.setCameraPreset("corpo");
    const idle = this.clipDefs.find((clip) => clip.id === "mount_idle") ?? this.clipDefs[0];
    if (idle) this.playClip(idle.id);
    this.syncCameraButtons();
    this.ready = true;
  }

  state(): MountPreviewCardState {
    return {
      id: "tk-mount-cylinder",
      ready: this.ready,
      clip: this.activeClipId,
      clips: this.clipDefs.map((clip) => clip.id),
    };
  }

  protected override onUpdate(dt: number): void {
    this.viewer.update(dt);
  }

  private renderHeader(): void {
    this.element.dataset.mount = "tk-mount-cylinder";
    requireElement(this.element, ".card-tag", HTMLElement).textContent = "TK";
    requireElement(this.element, ".card-name", HTMLElement).textContent = "Montaria cilindro";
    requireElement(this.element, ".card-sub", HTMLElement).textContent = "HorseProxy + Seat";
  }

  private bindCamera(): void {
    for (const preset of ["corpo", "frente"] as CameraPreset[]) {
      const element = requireElement(this.element, `.cam-${preset}`, HTMLButtonElement);
      this.cameraButtons.push({ preset, element });
      element.addEventListener("click", () => {
        this.viewer.setCameraPreset(preset);
        this.syncCameraButtons();
      });
    }
  }

  private renderClips(): void {
    this.clipHolder.replaceChildren();
    this.clipButtons.clear();
    for (const clip of this.clipDefs) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "clip-chip";
      button.textContent = clip.label;
      button.dataset.clip = clip.id;
      button.addEventListener("click", () => {
        this.playClip(clip.id);
      });
      this.clipButtons.set(clip.id, button);
      this.clipHolder.append(button);
    }
  }

  private playClip(clipId: string): void {
    const companions = MOUNT_LAB_CLIP_COMPANIONS[clipId] ?? [];
    if (!this.viewer.playClip(clipId, companions)) return;
    this.activeClipId = clipId;
    for (const [id, button] of this.clipButtons) {
      button.setAttribute("aria-pressed", String(id === this.activeClipId));
    }
    const clip = this.clipDefs.find((item) => item.id === clipId);
    this.setStatus(clip ? `Montaria · ${clip.label}` : clipId);
  }

  private syncCameraButtons(): void {
    const active = this.viewer.getCameraPreset();
    for (const { preset, element } of this.cameraButtons) {
      element.setAttribute("aria-pressed", String(preset === active));
    }
  }
}

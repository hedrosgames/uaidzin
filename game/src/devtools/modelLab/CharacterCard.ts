import { Quaternion, Vector3 } from "three";
import { WeaponRig, WEAPON_SET_IDS, WEAPON_SET_LABEL, type WeaponSetId } from "../../presentation/player/WeaponRig";
import { CLASS_WEAPON_SET, IDLE_CLIP_ID, type ClassDef, type ClipDef, type PlayerClassId } from "./catalog";
import { cloneTemplate, requireElement } from "./dom";
import { LabCard } from "./LabCard";
import { loadClip } from "./modelUtils";
import { CAMERA_PRESETS, ModelViewer, type CameraPreset } from "./ModelViewer";
import type { MountStore } from "./MountStore";
import {
  applyPieceAdjust,
  cloneAdjust,
  collectPieces,
  NEUTRAL_ADJUST,
  pieceLabel,
  type MountAdjust,
  type WeaponPiece,
  type WeaponSide,
} from "./WeaponMount";

const CLASS_TARGET_HEIGHT = 1.72 * 1.1;
const ADJUST_LIMIT = 0.8;
const ADJUST_STEP = 0.005;
const ADJUST_FIELDS = ["pos-x", "pos-y", "pos-z", "rot-x", "rot-y", "rot-z", "scale"] as const;

type AdjustField = (typeof ADJUST_FIELDS)[number];

export interface CharacterCardHooks {
  store: MountStore;
  resolveClip: (id: string) => ClipDef | null;
  onWeaponSetChange: (classId: PlayerClassId, set: WeaponSetId) => void;
}

export interface CharacterCardState {
  id: PlayerClassId;
  ready: boolean;
  weaponSet: WeaponSetId;
  clip: string;
  pieces: string[];
}

function bindAdjustFields(
  element: HTMLElement,
  onChange: () => void,
): { inputs: Record<AdjustField, HTMLInputElement>; outputs: Record<AdjustField, HTMLOutputElement> } {
  const inputs = {} as Record<AdjustField, HTMLInputElement>;
  const outputs = {} as Record<AdjustField, HTMLOutputElement>;
  for (const field of ADJUST_FIELDS) {
    const input = requireElement(element, `.${field}`, HTMLInputElement);
    const holder = input.closest(".slider");
    if (!holder) throw new Error(`Slider sem moldura: ${field}`);
    inputs[field] = input;
    outputs[field] = requireElement(holder, "output", HTMLOutputElement);
    input.addEventListener("input", onChange);
  }
  return { inputs, outputs };
}

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

function quantize(value: number): number {
  return Math.round(value / ADJUST_STEP) * ADJUST_STEP;
}

export class CharacterCard extends LabCard<ModelViewer> {
  readonly def: ClassDef;
  private readonly hooks: CharacterCardHooks;
  private readonly rig = new WeaponRig();
  private readonly weaponLabelEl: HTMLElement;
  private readonly flagEl: HTMLElement;
  private readonly adjustEl: HTMLElement;
  private readonly noteEl: HTMLElement;
  private readonly pieceSelect: HTMLSelectElement;
  private readonly pauseToggle: HTMLInputElement;
  private readonly adjustButton: HTMLButtonElement;
  private readonly inputs: Record<AdjustField, HTMLInputElement>;
  private readonly outputs: Record<AdjustField, HTMLOutputElement>;
  private readonly cameraButtons: Record<CameraPreset, HTMLButtonElement>;
  private readonly pending = new Map<WeaponSide, MountAdjust>();
  private pieces: WeaponPiece[] = [];
  private activePieceIndex = 0;
  private weaponSet: WeaponSetId;
  private clipId = IDLE_CLIP_ID;
  private adjust: MountAdjust = cloneAdjust(NEUTRAL_ADJUST);
  private equipToken = 0;
  private clipToken = 0;
  private dragPointer = -1;
  private dragX = 0;
  private dragY = 0;
  private ready = false;

  constructor(def: ClassDef, hooks: CharacterCardHooks) {
    const element = cloneTemplate("tpl-character");
    super(element, new ModelViewer(requireElement(element, ".card-stage", HTMLElement)));
    this.def = def;
    this.hooks = hooks;
    this.weaponSet = CLASS_WEAPON_SET[def.id];
    this.weaponLabelEl = requireElement(element, ".weapon-label", HTMLElement);
    this.flagEl = requireElement(element, ".card-flag", HTMLElement);
    this.adjustEl = requireElement(element, ".adjust", HTMLElement);
    this.noteEl = requireElement(element, ".adjust-note", HTMLElement);
    this.pieceSelect = requireElement(element, ".piece-select", HTMLSelectElement);
    this.pauseToggle = requireElement(element, ".pause-toggle", HTMLInputElement);
    this.adjustButton = requireElement(element, ".toggle-adjust", HTMLButtonElement);
    const fields = bindAdjustFields(element, () => this.onAdjustInput());
    this.inputs = fields.inputs;
    this.outputs = fields.outputs;
    const cameraButtons = {} as Record<CameraPreset, HTMLButtonElement>;
    for (const preset of CAMERA_PRESETS) {
      cameraButtons[preset] = requireElement(element, `.cam-${preset}`, HTMLButtonElement);
    }
    this.cameraButtons = cameraButtons;
    this.element.dataset.adjust = "closed";
    this.renderHeader();
    this.bindInteractions();
    this.setStatus("Carregando modelo…");
  }

  async mount(): Promise<void> {
    const model = await this.viewer.mount(this.def.modelUrl, CLASS_TARGET_HEIGHT);
    this.rig.bindModel(model);
    await this.equipWeaponSet(this.weaponSet, false);
    this.viewer.setFocusTargets(this.rig.getVisualRoots());
    this.viewer.setCameraPreset("corpo");
    this.syncCameraButtons();
    this.ready = true;
    this.refreshStatus();
  }

  async equipWeaponSet(set: WeaponSetId, notify = true): Promise<void> {
    this.weaponSet = set;
    const token = ++this.equipToken;
    await this.rig.equip(this.viewer.stage, set);
    if (token !== this.equipToken) return;
    this.pending.clear();
    this.pieces = collectPieces(this.rig);
    this.applyStoredMounts();
    this.viewer.setFocusTargets(this.rig.getVisualRoots());
    this.weaponLabelEl.textContent = WEAPON_SET_LABEL[set];
    this.renderPieces();
    this.refreshFlag();
    this.refreshStatus();
    if (notify) this.hooks.onWeaponSetChange(this.def.id, set);
  }

  cycleWeaponSet(delta: number): void {
    const index = WEAPON_SET_IDS.indexOf(this.weaponSet);
    const size = WEAPON_SET_IDS.length;
    const next = WEAPON_SET_IDS[(index + delta + size) % size];
    if (!next) return;
    void this.equipWeaponSet(next);
  }

  async setClip(id: string): Promise<void> {
    const clip = this.hooks.resolveClip(id);
    if (!clip) return;
    const token = ++this.clipToken;
    if (!clip.url) {
      if (!this.viewer.playClip(IDLE_CLIP_ID)) return;
      this.clipId = IDLE_CLIP_ID;
    } else {
      const loaded = await loadClip(clip.url);
      if (!loaded || token !== this.clipToken) return;
      this.viewer.bindClip(id, loaded);
      if (!this.viewer.playClip(id)) return;
      this.clipId = id;
    }
    if (this.element.dataset.adjust !== "open") {
      this.viewer.setPaused(false);
      this.pauseToggle.checked = false;
    }
    this.refreshStatus();
  }

  state(): CharacterCardState {
    return {
      id: this.def.id,
      ready: this.ready,
      weaponSet: this.weaponSet,
      clip: this.clipId,
      pieces: this.pieces.map((piece) => pieceLabel(piece)),
    };
  }

  protected override onUpdate(dt: number): void {
    this.viewer.update(dt);
    this.rig.sync(this.viewer.stage);
  }

  private renderHeader(): void {
    this.element.dataset.class = this.def.id;
    requireElement(this.element, ".card-tag", HTMLElement).textContent = this.def.id;
    requireElement(this.element, ".card-name", HTMLElement).textContent = this.def.label;
    requireElement(this.element, ".card-sub", HTMLElement).textContent = "Personagem";
    this.weaponLabelEl.textContent = WEAPON_SET_LABEL[this.weaponSet];
  }

  private bindInteractions(): void {
    requireElement(this.element, ".prev-weapon", HTMLButtonElement).addEventListener("click", () =>
      this.cycleWeaponSet(-1),
    );
    requireElement(this.element, ".next-weapon", HTMLButtonElement).addEventListener("click", () =>
      this.cycleWeaponSet(1),
    );
    this.adjustButton.addEventListener("click", () => this.setAdjustOpen(this.adjustEl.hidden));
    requireElement(this.element, ".close-adjust", HTMLButtonElement).addEventListener("click", () =>
      this.setAdjustOpen(false),
    );
    requireElement(this.element, ".save-mount", HTMLButtonElement).addEventListener("click", () => {
      void this.saveMount();
    });
    requireElement(this.element, ".zero-mount", HTMLButtonElement).addEventListener("click", () => {
      void this.zeroMount();
    });
    this.pieceSelect.addEventListener("change", () => this.selectPiece(Number(this.pieceSelect.value)));
    this.pauseToggle.addEventListener("change", () => this.viewer.setPaused(this.pauseToggle.checked));
    for (const preset of CAMERA_PRESETS) {
      this.cameraButtons[preset].addEventListener("click", () => {
        this.viewer.setCameraPreset(preset);
        this.syncCameraButtons();
      });
    }
    this.bindDrag();
  }

  private bindDrag(): void {
    const canvas = this.viewer.canvas;
    canvas.addEventListener("pointerdown", (event) => {
      if (this.element.dataset.adjust !== "open" || event.button !== 0) return;
      this.dragPointer = event.pointerId;
      this.dragX = event.clientX;
      this.dragY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
      this.viewer.setFramingLocked(true);
      this.viewer.setCameraPreset("arma");
      this.syncCameraButtons();
      event.preventDefault();
    });
    canvas.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.dragPointer) return;
      const dx = event.clientX - this.dragX;
      const dy = event.clientY - this.dragY;
      this.dragX = event.clientX;
      this.dragY = event.clientY;
      this.nudgePiece(dx, dy);
    });
    const release = (event: PointerEvent): void => {
      if (event.pointerId !== this.dragPointer) return;
      this.dragPointer = -1;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      this.viewer.setFramingLocked(false);
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
  }

  private activePiece(): WeaponPiece | null {
    return this.pieces[this.activePieceIndex] ?? null;
  }

  private savedPieceCount(): number {
    return this.pieces.filter((piece) => this.hooks.store.get(this.def.id, this.weaponSet, piece.side) !== null)
      .length;
  }

  private applyStoredMounts(): void {
    for (const piece of this.pieces) {
      const stored = this.hooks.store.get(this.def.id, this.weaponSet, piece.side);
      applyPieceAdjust(piece, stored ?? NEUTRAL_ADJUST);
    }
  }

  private renderPieces(): void {
    this.pieceSelect.replaceChildren();
    this.pieces.forEach((piece, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = pieceLabel(piece);
      this.pieceSelect.append(option);
    });
    this.pieceSelect.disabled = this.pieces.length < 2;
    this.selectPiece(Math.min(this.activePieceIndex, Math.max(this.pieces.length - 1, 0)));
  }

  private selectPiece(index: number): void {
    if (!this.pieces.length) return;
    const clamped = Math.max(0, Math.min(index, this.pieces.length - 1));
    const piece = this.pieces[clamped];
    this.activePieceIndex = clamped;
    this.pieceSelect.value = String(clamped);
    this.adjust = cloneAdjust(
      this.pending.get(piece.side) ?? this.hooks.store.get(this.def.id, this.weaponSet, piece.side) ?? NEUTRAL_ADJUST,
    );
    this.pushAdjustToInputs();
    this.applyAdjust();
  }

  private setAdjustOpen(open: boolean): void {
    this.element.dataset.adjust = open ? "open" : "closed";
    this.adjustEl.hidden = !open;
    this.adjustButton.setAttribute("aria-pressed", String(open));
    this.viewer.setOrbitEnabled(!open);
    this.viewer.setCameraPreset(open ? "arma" : "corpo");
    this.pauseToggle.checked = open;
    this.viewer.setPaused(open);
    this.syncCameraButtons();
    if (open) {
      this.selectPiece(this.activePieceIndex);
      this.element.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    this.setNote(open ? "Arraste no modelo para mover a peça" : "");
  }

  private onAdjustInput(): void {
    this.adjust = {
      position: [
        Number(this.inputs["pos-x"].value),
        Number(this.inputs["pos-y"].value),
        Number(this.inputs["pos-z"].value),
      ],
      rotation: [
        Number(this.inputs["rot-x"].value),
        Number(this.inputs["rot-y"].value),
        Number(this.inputs["rot-z"].value),
      ],
      scale: Number(this.inputs.scale.value),
    };
    this.markPending();
    this.pushAdjustToInputs();
    this.applyAdjust();
  }

  private pushAdjustToInputs(): void {
    const values: Record<AdjustField, number> = {
      "pos-x": this.adjust.position[0],
      "pos-y": this.adjust.position[1],
      "pos-z": this.adjust.position[2],
      "rot-x": this.adjust.rotation[0],
      "rot-y": this.adjust.rotation[1],
      "rot-z": this.adjust.rotation[2],
      scale: this.adjust.scale,
    };
    for (const field of ADJUST_FIELDS) {
      const value = values[field];
      this.inputs[field].value = String(value);
      this.outputs[field].value = field === "scale" ? value.toFixed(2) : this.formatField(field, value);
    }
  }

  private markPending(): void {
    const piece = this.activePiece();
    if (piece) this.pending.set(piece.side, cloneAdjust(this.adjust));
    this.setNote("Alteração não salva", "warn");
  }

  private formatField(field: AdjustField, value: number): string {
    return field.startsWith("rot") ? `${Math.round(value)}°` : value.toFixed(3);
  }

  private applyAdjust(): void {
    const piece = this.activePiece();
    if (!piece) return;
    applyPieceAdjust(piece, this.adjust);
  }

  private nudgePiece(dx: number, dy: number): void {
    const piece = this.activePiece();
    if (!piece || (dx === 0 && dy === 0)) return;
    const camera = this.viewer.getCamera();
    camera.updateMatrixWorld();
    const pixel = this.viewer.getPixelScale();
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(dx * pixel);
    const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(-dy * pixel);
    const world = right.add(up).applyQuaternion(piece.visual.getWorldQuaternion(new Quaternion()).invert());
    this.adjust.position = [
      quantize(clamp(this.adjust.position[0] + world.x, ADJUST_LIMIT)),
      quantize(clamp(this.adjust.position[1] + world.y, ADJUST_LIMIT)),
      quantize(clamp(this.adjust.position[2] + world.z, ADJUST_LIMIT)),
    ];
    this.markPending();
    this.pushAdjustToInputs();
    this.applyAdjust();
  }

  private async saveMount(): Promise<void> {
    const piece = this.activePiece();
    if (!piece) return;
    const report = await this.hooks.store.save(this.def.id, this.weaponSet, piece.side, this.adjust);
    if (report.ok) this.pending.delete(piece.side);
    this.setNote(report.message, report.ok ? "ok" : "warn");
    this.refreshFlag();
    this.refreshStatus();
  }

  private async zeroMount(): Promise<void> {
    const piece = this.activePiece();
    if (!piece) return;
    this.adjust = cloneAdjust(NEUTRAL_ADJUST);
    this.pushAdjustToInputs();
    this.applyAdjust();
    this.pending.delete(piece.side);
    const report = await this.hooks.store.remove(this.def.id, this.weaponSet, piece.side);
    this.setNote(report.message, report.ok ? "ok" : "warn");
    this.refreshFlag();
    this.refreshStatus();
  }

  private refreshFlag(): void {
    const adjusted = this.hooks.store.isAdjusted(this.def.id, this.weaponSet);
    this.flagEl.hidden = !adjusted;
    this.flagEl.textContent = "Ajustado";
  }

  private refreshStatus(): void {
    if (!this.ready) return;
    const parts = [
      WEAPON_SET_LABEL[this.weaponSet],
      this.hooks.resolveClip(this.clipId)?.label ?? this.clipId,
    ];
    const saved = this.savedPieceCount();
    if (saved > 0) parts.push(`${saved} ajuste${saved > 1 ? "s" : ""} salvo${saved > 1 ? "s" : ""}`);
    this.setStatus(parts.join(" · "));
  }

  private syncCameraButtons(): void {
    const active = this.viewer.getCameraPreset();
    for (const preset of CAMERA_PRESETS) {
      this.cameraButtons[preset].setAttribute("aria-pressed", String(preset === active));
    }
  }

  private setNote(text: string, kind: "" | "ok" | "warn" = ""): void {
    this.noteEl.textContent = text;
    this.noteEl.className = kind ? `adjust-note ${kind}` : "adjust-note";
  }
}

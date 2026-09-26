import {
  ACESFilmicToneMapping,
  AnimationMixer,
  Box3,
  CircleGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
  type AnimationAction,
  type AnimationClip,
  type Bone,
  type Object3D,
} from "three";
import { IDLE_CLIP_ID } from "./catalog";
import { instantiateModel, loadTemplate } from "./modelUtils";

const FOV = 30;
const FADE = 0.18;
const CAMERA_NEAR = 0.05;
const CAMERA_FAR = 80;

export type CameraPreset = "corpo" | "frente" | "arma";

export const CAMERA_PRESETS: CameraPreset[] = ["corpo", "frente", "arma"];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildLighting(): Group {
  const group = new Group();
  group.name = "LabLighting";
  group.add(new HemisphereLight(0x8090c0, 0x3a2a1c, 0.9));
  const key = new DirectionalLight(0xffdcb0, 2.1);
  key.position.set(2.6, 4.4, 3.4);
  group.add(key);
  const fill = new DirectionalLight(0x6f86d6, 0.5);
  fill.position.set(-3.4, 2.4, 1.6);
  group.add(fill);
  const rim = new DirectionalLight(0xffc878, 1.05);
  rim.position.set(0.6, 2.8, -3.4);
  group.add(rim);
  return group;
}

function buildFloor(): Group {
  const group = new Group();
  group.name = "LabFloor";
  const disc = new Mesh(
    new CircleGeometry(1.55, 56),
    new MeshStandardMaterial({ color: 0x241c14, roughness: 0.95, metalness: 0 }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -0.003;
  group.add(disc);
  const ring = new Mesh(
    new RingGeometry(1.48, 1.55, 64),
    new MeshStandardMaterial({
      color: 0xd4a017,
      roughness: 0.5,
      metalness: 0.2,
      transparent: true,
      opacity: 0.32,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);
  return group;
}

export class ModelViewer {
  readonly canvas: HTMLCanvasElement;
  readonly stage = new Group();
  private readonly host: HTMLElement;
  private readonly pivot = new Group();
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, 1, CAMERA_NEAR, CAMERA_FAR);
  private readonly renderer: WebGLRenderer;
  private readonly actions = new Map<string, AnimationAction>();
  private readonly bodyBox = new Box3();
  private readonly focusBox = new Box3();
  private readonly target = new Vector3();
  private readonly desiredTarget = new Vector3();
  private readonly desiredSize = new Vector3();
  private readonly direction = new Vector3();
  private readonly probe = new Vector3();
  private mixer: AnimationMixer | null = null;
  private model: Object3D | null = null;
  private currentAction: AnimationAction | null = null;
  private focusTargets: Object3D[] = [];
  private preset: CameraPreset = "corpo";
  private azimuth = 0.62;
  private elevation = 0.26;
  private zoom = 1;
  private distance = 2.6;
  private paused = false;
  private orbitEnabled = true;
  private framingLocked = false;
  private dragPointer = -1;
  private lastX = 0;
  private lastY = 0;
  private width = 1;
  private height = 1;

  constructor(host: HTMLElement) {
    this.host = host;
    this.canvas = document.createElement("canvas");
    host.appendChild(this.canvas);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.stage.name = "LabStage";
    this.pivot.name = "LabPivot";
    this.stage.add(this.pivot);
    this.scene.background = new Color(0x1b1510);
    this.scene.add(this.stage);
    this.scene.add(buildLighting());
    this.scene.add(buildFloor());

    this.bindPointer();
  }

  async mount(url: string, targetHeight: number | null): Promise<Object3D> {
    const template = await loadTemplate(url);
    const model = instantiateModel(template);
    this.pivot.clear();
    this.actions.clear();
    this.currentAction = null;
    this.pivot.add(model);
    this.model = model;
    this.mixer = new AnimationMixer(model);

    const embedded = template.animations[0] ?? null;
    if (embedded) {
      const clip = embedded.clone();
      clip.name = IDLE_CLIP_ID;
      this.actions.set(IDLE_CLIP_ID, this.mixer.clipAction(clip));
      this.playClip(IDLE_CLIP_ID);
    }
    this.normalizeModel(model, targetHeight, embedded !== null);
    this.setCameraPreset(this.preset);
    return model;
  }

  bindClip(id: string, clip: AnimationClip): void {
    if (!this.mixer) return;
    const existing = this.actions.get(id);
    if (existing) {
      if (this.currentAction === existing) this.currentAction = null;
      existing.stop();
      this.mixer.uncacheClip(existing.getClip());
      this.actions.delete(id);
    }
    const owned = clip.clone();
    owned.name = id;
    this.actions.set(id, this.mixer.clipAction(owned));
  }

  playClip(id: string): boolean {
    const next = this.actions.get(id);
    if (!next || !this.mixer) return false;
    const prev = this.currentAction;
    next.reset();
    next.setLoop(LoopRepeat, Infinity);
    next.clampWhenFinished = false;
    next.enabled = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    if (prev && prev !== next) next.crossFadeFrom(prev, FADE, false);
    else next.fadeIn(0.06);
    next.play();
    this.currentAction = next;
    return true;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  setOrbitEnabled(enabled: boolean): void {
    this.orbitEnabled = enabled;
  }

  setFramingLocked(locked: boolean): void {
    this.framingLocked = locked;
  }

  setFocusTargets(objects: Object3D[]): void {
    this.focusTargets = objects;
  }

  setCameraPreset(preset: CameraPreset): void {
    this.resize();
    this.preset = preset;
    if (preset === "corpo") {
      this.azimuth = 0.62;
      this.elevation = 0.26;
    } else if (preset === "frente") {
      this.azimuth = 0;
      this.elevation = 0.1;
    } else {
      this.azimuth = 0.55;
      this.elevation = 0.14;
    }
    this.zoom = 1;
    const framing = this.resolveFraming();
    this.target.copy(framing.center);
    this.distance = framing.distance;
    this.applyCamera();
  }

  update(dt: number): void {
    this.resize();
    if (!this.paused) this.mixer?.update(dt);
    this.followFraming(dt);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  getScene(): Scene {
    return this.scene;
  }

  getCamera(): PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): WebGLRenderer {
    return this.renderer;
  }

  getMixer(): AnimationMixer | null {
    return this.mixer;
  }

  getCameraPreset(): CameraPreset {
    return this.preset;
  }

  getCameraDistance(): number {
    return this.camera.position.distanceTo(this.target);
  }

  getPixelScale(): number {
    return (2 * Math.tan(((FOV / 2) * Math.PI) / 180) * this.getCameraDistance()) / this.height;
  }

  private bindPointer(): void {
    this.canvas.addEventListener("pointerdown", (event) => {
      if (!this.orbitEnabled || event.button !== 0) return;
      this.dragPointer = event.pointerId;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.dragPointer) return;
      const dx = event.clientX - this.lastX;
      const dy = event.clientY - this.lastY;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      this.azimuth -= dx * 0.0075;
      this.elevation = clamp(this.elevation + dy * 0.006, -0.35, 1.25);
      this.applyCamera();
    });
    const release = (event: PointerEvent): void => {
      if (event.pointerId !== this.dragPointer) return;
      this.dragPointer = -1;
      if (this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
    };
    this.canvas.addEventListener("pointerup", release);
    this.canvas.addEventListener("pointercancel", release);
    this.canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        this.zoom = clamp(this.zoom * (1 + event.deltaY * 0.0012), 0.35, 3.5);
        this.distance = this.resolveFraming().distance;
        this.applyCamera();
      },
      { passive: false },
    );
  }

  private normalizeModel(model: Object3D, targetHeight: number | null, posed: boolean): void {
    model.scale.setScalar(1);
    model.position.set(0, 0, 0);
    this.pivot.rotation.y = 0;
    this.pivot.updateMatrixWorld(true);
    if (this.mixer && posed) {
      for (let i = 0; i < 24; i++) this.mixer.update(1 / 30);
    }
    const box = this.measureBodyBox();
    const height = Math.max(box.max.y - box.min.y, 0.001);
    const scale = targetHeight ? targetHeight / height : 1;
    model.scale.setScalar(scale);
    model.position.y = -box.min.y * scale;
    this.alignFacing(model);
    this.bodyBox.copy(this.measureBodyBox());
  }

  private alignFacing(model: Object3D): void {
    let left: Object3D | null = null;
    let right: Object3D | null = null;
    model.traverse((obj) => {
      if (!(obj as Bone).isBone) return;
      if (/LeftShoulder/i.test(obj.name)) left = obj;
      if (/RightShoulder/i.test(obj.name)) right = obj;
    });
    if (!left || !right) return;
    model.updateMatrixWorld(true);
    const leftPoint = (left as Object3D).getWorldPosition(new Vector3());
    const across = (right as Object3D).getWorldPosition(new Vector3()).sub(leftPoint);
    across.y = 0;
    if (across.lengthSq() < 1e-6) return;
    across.normalize();
    const forward = new Vector3().crossVectors(new Vector3(0, 1, 0), across).normalize();
    this.pivot.rotation.y = -Math.atan2(forward.x, forward.z);
    this.pivot.updateMatrixWorld(true);
  }

  private measureBodyBox(): Box3 {
    this.pivot.updateWorldMatrix(true, true);
    const box = new Box3();
    let found = false;
    this.pivot.traverse((obj) => {
      if (!(obj as Bone).isBone) return;
      obj.getWorldPosition(this.probe);
      if (!found) {
        box.set(this.probe.clone(), this.probe.clone());
        found = true;
      } else {
        box.expandByPoint(this.probe);
      }
    });
    if (!found) box.setFromObject(this.pivot);
    return box;
  }

  private measureFocusBox(): boolean {
    if (!this.focusTargets.length) return false;
    this.focusBox.makeEmpty();
    for (const target of this.focusTargets) {
      target.updateWorldMatrix(true, true);
      this.focusBox.expandByObject(target);
    }
    return !this.focusBox.isEmpty();
  }

  private resolveFraming(): { center: Vector3; distance: number } {
    const onWeapon = this.preset === "arma" && this.measureFocusBox();
    const box = onWeapon ? this.focusBox : this.bodyBox;
    box.getCenter(this.desiredTarget);
    box.getSize(this.desiredSize);
    const padding = onWeapon ? 1.7 : 1.16;
    const tan = Math.tan((FOV * Math.PI) / 360);
    const aspect = Math.max(this.camera.aspect, 0.25);
    const fromHeight = (this.desiredSize.y * padding) / 2 / tan;
    const fromWidth = (this.desiredSize.x * padding) / 2 / (tan * aspect);
    const floor = onWeapon ? 0.4 : 1.25;
    const distance = Math.max(fromHeight, fromWidth, floor) + this.desiredSize.z / 2;
    return { center: this.desiredTarget, distance: distance * this.zoom };
  }

  private followFraming(dt: number): void {
    if (!this.model || this.framingLocked) return;
    const framing = this.resolveFraming();
    const rate = this.preset === "arma" ? 8 : 2.6;
    const k = Math.min(1, dt * rate);
    this.target.lerp(framing.center, k);
    this.distance += (framing.distance - this.distance) * k;
    this.applyCamera();
  }

  private applyCamera(): void {
    const cos = Math.cos(this.elevation);
    this.direction.set(Math.sin(this.azimuth) * cos, Math.sin(this.elevation), Math.cos(this.azimuth) * cos);
    this.camera.position.copy(this.target).addScaledVector(this.direction, this.distance);
    this.camera.lookAt(this.target);
  }
}

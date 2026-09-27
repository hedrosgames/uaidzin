import {
  ACESFilmicToneMapping,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HalfFloatType,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Raycaster,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { PlayerView } from "../player/PlayerView";

export interface SceneRendererOptions {
  canvas: HTMLCanvasElement;
}

const SKY_ZENITH = 0x0b1020;
const SKY_HORIZON = 0x2a1f22;
const FOG_COLOR = 0x1a1518;
const FOG_DENSITY = 0.016;
const KEY_LIGHT_OFFSET = new Vector3(14, 22, 10);
const SHADOW_HALF_EXTENT = 24;
const BLOOM = { strength: 0.42, radius: 0.45, threshold: 0.82 };

export class SceneRenderer {
  readonly scene = new Scene();
  readonly worldRoot = new Group();
  readonly playerView = new PlayerView();
  readonly playerMesh: Object3D;
  readonly playerOutlineMesh: Mesh;
  readonly playerGhostMesh: Mesh;
  readonly renderer: WebGLRenderer;

  private disposed = false;
  private readonly raycaster = new Raycaster();
  private readonly playerCenter = new Vector3();
  private readonly toPlayer = new Vector3();
  private readonly playerBlobShadow: Mesh;
  private readonly keyLight: DirectionalLight;
  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;
  private readonly skyDome: Mesh;
  private occluders: Object3D[] = [];

  constructor(options: SceneRendererOptions) {
    this.scene.name = "UAIDZIN_Scene";
    this.worldRoot.name = "WorldRoot";
    this.scene.background = new Color(FOG_COLOR);
    this.scene.fog = new FogExp2(FOG_COLOR, FOG_DENSITY);
    this.scene.add(this.worldRoot);

    const { clientWidth, clientHeight } = options.canvas;
    const width = Math.max(clientWidth, 1);
    const height = Math.max(clientHeight, 1);

    this.renderer = new WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    this.keyLight = this.setupLights();
    this.skyDome = this.createSkyDome();
    this.scene.add(this.skyDome);

    this.playerMesh = this.playerView.root;
    const geometry = new CapsuleGeometry(0.35, 0.9, 6, 12);
    this.playerOutlineMesh = this.createPlayerOutline(geometry);
    this.playerGhostMesh = this.createPlayerGhost(geometry);
    this.playerOutlineMesh.visible = false;
    this.playerView.root.add(this.playerOutlineMesh);
    this.playerView.root.add(this.playerGhostMesh);
    this.playerBlobShadow = this.createPlayerBlobShadow();
    this.playerView.root.add(this.playerBlobShadow);
    this.scene.add(this.playerView.root);

    const target = new WebGLRenderTarget(width, height, { samples: 4, type: HalfFloatType });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(width, height);
    this.bloomPass = new UnrealBloomPass(
      new Vector2(width, height),
      BLOOM.strength,
      BLOOM.radius,
      BLOOM.threshold,
    );
    this.composer.addPass(new RenderPass(this.scene, new PerspectiveCamera()));
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
  }

  async loadPlayerModel(classId = "TK"): Promise<void> {
    await this.playerView.load(classId);
  }

  getEffectComposer(): EffectComposer {
    return this.composer;
  }

  private setupLights(): DirectionalLight {
    this.scene.add(new HemisphereLight(0x8090c0, 0x3a2a1c, 0.55));

    const key = new DirectionalLight(0xffdcb0, 2.1);
    key.position.copy(KEY_LIGHT_OFFSET);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 80;
    key.shadow.camera.left = -SHADOW_HALF_EXTENT;
    key.shadow.camera.right = SHADOW_HALF_EXTENT;
    key.shadow.camera.top = SHADOW_HALF_EXTENT;
    key.shadow.camera.bottom = -SHADOW_HALF_EXTENT;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    key.shadow.radius = 3;
    this.scene.add(key);
    this.scene.add(key.target);

    const fill = new DirectionalLight(0x6f86d6, 0.35);
    fill.position.set(-10, 6, -8);
    this.scene.add(fill);
    return key;
  }

  private createSkyDome(): Mesh {
    const material = new ShaderMaterial({
      uniforms: {
        zenith: { value: new Color(SKY_ZENITH) },
        horizon: { value: new Color(SKY_HORIZON) },
      },
      vertexShader: [
        "varying vec3 vWorld;",
        "void main() {",
        "  vec4 wp = modelMatrix * vec4(position, 1.0);",
        "  vWorld = wp.xyz;",
        "  gl_Position = projectionMatrix * viewMatrix * wp;",
        "}",
      ].join("\n"),
      fragmentShader: [
        "uniform vec3 zenith;",
        "uniform vec3 horizon;",
        "varying vec3 vWorld;",
        "void main() {",
        "  float h = clamp(normalize(vWorld).y, 0.0, 1.0);",
        "  float t = pow(h, 0.55);",
        "  vec3 col = mix(horizon, zenith, t);",
        "  gl_FragColor = vec4(col, 1.0);",
        "}",
      ].join("\n"),
      side: BackSide,
      depthWrite: false,
      fog: false,
    });
    const dome = new Mesh(new SphereGeometry(150, 24, 12), material);
    dome.name = "sky-dome";
    dome.frustumCulled = false;
    return dome;
  }

  private createPlayerOutline(geometry: BufferGeometry): Mesh {
    const material = new ShaderMaterial({
      uniforms: {
        outlineWidth: { value: 0.035 },
        outlineColor: { value: new Color(0x7ec8ff) },
      },
      vertexShader: [
        "uniform float outlineWidth;",
        "void main() {",
        "  vec3 n = normalize(normalMatrix * normal);",
        "  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);",
        "  mvPosition.xyz += n * outlineWidth;",
        "  gl_Position = projectionMatrix * mvPosition;",
        "}",
      ].join("\n"),
      fragmentShader: [
        "uniform vec3 outlineColor;",
        "void main() {",
        "  gl_FragColor = vec4(outlineColor, 1.0);",
        "}",
      ].join("\n"),
      side: BackSide,
      depthTest: true,
      depthWrite: false,
    });
    const outline = new Mesh(geometry, material);
    outline.name = "player-outline";
    outline.position.y = 0.8;
    outline.renderOrder = 0;
    return outline;
  }

  private createPlayerGhost(geometry: BufferGeometry): Mesh {
    const material = new MeshBasicMaterial({
      color: 0x7ec8ff,
      transparent: true,
      opacity: 0.42,
      depthTest: false,
      depthWrite: false,
    });
    const ghost = new Mesh(geometry, material);
    ghost.name = "player-ghost";
    ghost.position.y = 0.8;
    ghost.renderOrder = 20;
    ghost.visible = false;
    return ghost;
  }

  private createPlayerBlobShadow(): Mesh {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, "rgba(0,0,0,0.45)");
      gradient.addColorStop(0.45, "rgba(0,0,0,0.2)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = "srgb";
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 1,
    });
    const blob = new Mesh(new CircleGeometry(0.62, 28), material);
    blob.name = "player-blob-shadow";
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.025;
    blob.renderOrder = 1;
    return blob;
  }

  setShadowsEnabled(enabled: boolean): void {
    if (this.renderer.shadowMap.enabled === enabled) return;
    this.renderer.shadowMap.enabled = enabled;
    this.keyLight.castShadow = enabled;
    this.playerBlobShadow.visible = enabled;
    this.scene.traverse((obj) => {
      const mat = (obj as Mesh).material;
      if (!mat) return;
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) m.needsUpdate = true;
    });
  }

  setWorldLook(kind: "city" | "dungeon"): void {
    const fog = this.scene.fog as FogExp2 | null;
    if (kind === "dungeon") {
      this.scene.background = new Color(0x1a2218);
      if (fog) {
        fog.color.set(0x1a2218);
        fog.density = 0.007;
      }
      this.renderer.toneMappingExposure = 1.32;
      this.skyDome.visible = false;
      return;
    }
    this.scene.background = new Color(FOG_COLOR);
    if (fog) {
      fog.color.set(FOG_COLOR);
      fog.density = FOG_DENSITY;
    }
    this.renderer.toneMappingExposure = 1.15;
    this.skyDome.visible = true;
  }

  setPlayerTransform(
    x: number,
    z: number,
    facing: number,
    moving: boolean,
    moveSpeed?: number,
    y = 0,
  ): void {
    if (moveSpeed !== undefined) this.playerView.setMoveSpeed(moveSpeed);
    this.playerView.setPose(x, z, facing, moving, y);
  }

  updatePlayer(dt: number): void {
    this.playerView.update(dt);
  }

  resize(width: number, height: number): void {
    const w = Math.max(width, 1);
    const h = Math.max(height, 1);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloomPass.setSize(w, h);
  }

  setOccluders(occluders: Object3D[]): void {
    this.occluders = occluders;
  }

  private isFixedOccluder(obj: Object3D): boolean {
    let cur: Object3D | null = obj;
    while (cur) {
      if (cur.userData.occlusionIgnore === true) return false;
      if (cur.name === "enemies-view") return false;
      cur = cur.parent;
    }
    if ((obj as { isLineSegments?: boolean }).isLineSegments) return false;
    if (obj.name === "ground") return false;
    return true;
  }

  private updatePlayerGhost(camera: PerspectiveCamera): void {
    this.playerMesh.getWorldPosition(this.playerCenter);
    this.playerCenter.y += 0.9;
    this.toPlayer.subVectors(this.playerCenter, camera.position);
    const dist = this.toPlayer.length();
    this.playerGhostMesh.visible = false;
    if (dist < 0.2 || !this.playerView.ready || this.occluders.length === 0) {
      this.playerView.setOcclusionGhostVisible(false);
      return;
    }
    this.raycaster.set(camera.position, this.toPlayer.normalize());
    this.raycaster.far = dist - 0.2;
    const hits = this.raycaster.intersectObjects(this.occluders, true);
    const occluded = hits.some((hit) => this.isFixedOccluder(hit.object));
    this.playerView.setOcclusionGhostVisible(occluded);
  }

  private followKeyLight(): void {
    const p = this.playerMesh.position;
    this.keyLight.target.position.set(p.x, 0, p.z);
    this.keyLight.position.set(p.x + KEY_LIGHT_OFFSET.x, KEY_LIGHT_OFFSET.y, p.z + KEY_LIGHT_OFFSET.z);
    this.skyDome.position.set(p.x, 0, p.z);
  }

  render(camera: PerspectiveCamera): void {
    if (this.disposed) return;
    this.updatePlayerGhost(camera);
    this.followKeyLight();
    const renderPass = this.composer.passes[0] as RenderPass;
    renderPass.camera = camera;
    this.composer.render();
  }

  dispose(): void {
    this.disposed = true;
    (this.playerOutlineMesh.material as ShaderMaterial).dispose();
    this.playerOutlineMesh.geometry.dispose();
    (this.playerGhostMesh.material as MeshBasicMaterial).dispose();
    this.playerGhostMesh.geometry.dispose();
    const blobMat = this.playerBlobShadow.material as MeshBasicMaterial;
    blobMat.map?.dispose();
    blobMat.dispose();
    this.playerBlobShadow.geometry.dispose();
    (this.skyDome.material as ShaderMaterial).dispose();
    this.skyDome.geometry.dispose();
    this.bloomPass.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}

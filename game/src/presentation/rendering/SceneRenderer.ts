import {
  ACESFilmicToneMapping,
  BackSide,
  Box3,
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
  PointLight,
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
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { PlayerView } from "../player/PlayerView";
import {
  DEFAULT_GRAPHICS_QUALITY,
  GRAPHICS_PRESETS,
  grassCount,
  stampAnisotropy,
  type GraphicsQualityLevel,
  setActiveQuality,
} from "./GraphicsQuality";

export interface SceneRendererOptions {
  canvas: HTMLCanvasElement;
  quality?: GraphicsQualityLevel;
}

const SKY_ZENITH = 0x758fc1;
const SKY_HORIZON = 0xd7b2a6;
const FOG_COLOR = 0xa6acbd;
const FOG_DENSITY = 0.006;
const KEY_LIGHT_OFFSET = new Vector3(-14, 19, 12);
const BLOOM = { strength: 0.42, radius: 0.45, threshold: 0.82 };
const WORLD_LOOKS = {
  city: { sky: 0xaaa2e8, ground: 0x887084, ambient: 0.8, key: 3.4, shadow: 0.86, fog: FOG_COLOR, density: FOG_DENSITY, exposure: 1.18 },
  field: { sky: 0xa9b8e0, ground: 0x858568, ambient: 0.85, key: 3.1, shadow: 0.78, fog: 0xa0afbb, density: 0.009, exposure: 1.12 },
  cemetery: { sky: 0xa1abdb, ground: 0x716779, ambient: 0.75, key: 2.5, shadow: 0.82, fog: 0x8891ad, density: 0.013, exposure: 1.12 },
  dungeon: { sky: 0x9daee0, ground: 0x747055, ambient: 0.8, key: 2.1, shadow: 0.65, fog: 0x7e8e9e, density: 0.016, exposure: 1.12 },
};

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
  private readonly hemisphereLight = new HemisphereLight(0xb2bceb, 0xb49a72, 1.25);
  private readonly fillLight = new DirectionalLight(0x8d9ee8, 0.65);
  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;
  private readonly edgePass = new ShaderPass(FXAAShader);
  private readonly skyDome: Mesh;
  private occluders: Object3D[] = [];
  private quality: GraphicsQualityLevel;
  private lastWidth = 1;
  private lastHeight = 1;
  private lastOcclusionAt = 0;
  private occlusionVisible = false;
  private readonly occlusionHit = new Vector3();
  private readonly samplePoint = new Vector3();
  private readonly sampleRight = new Vector3();
  private visiblePointLights = 0;
  private worldLook: keyof typeof WORLD_LOOKS = "city";
  private lastShadowUpdateAt = 0;

  constructor(options: SceneRendererOptions) {
    this.scene.name = "UAIDZIN_Scene";
    this.worldRoot.name = "WorldRoot";
    this.scene.background = new Color(FOG_COLOR);
    this.scene.fog = new FogExp2(FOG_COLOR, FOG_DENSITY);
    this.scene.add(this.worldRoot);

    const { clientWidth, clientHeight } = options.canvas;
    const width = Math.max(clientWidth, 1);
    const height = Math.max(clientHeight, 1);
    this.lastWidth = width;
    this.lastHeight = height;

    this.quality = options.quality ?? DEFAULT_GRAPHICS_QUALITY;
    setActiveQuality(this.quality);
    const profile = GRAPHICS_PRESETS[this.quality];

    this.renderer = new WebGLRenderer({
      canvas: options.canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.maxDpr));
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = profile.shadows;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = profile.shadows;

    this.keyLight = this.setupLights(profile.shadows, profile.shadowMapSize, profile.shadowHalfExtent);
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
    this.playerBlobShadow.visible = !profile.shadows;
    this.playerView.root.add(this.playerBlobShadow);
    this.scene.add(this.playerView.root);

    const target = new WebGLRenderTarget(width, height, {
      samples: profile.samples,
      type: HalfFloatType,
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(width, height);
    this.bloomPass = new UnrealBloomPass(
      new Vector2(
        Math.round(width * (profile.bloomHalfRes ? 0.5 : 1)),
        Math.round(height * (profile.bloomHalfRes ? 0.5 : 1)),
      ),
      BLOOM.strength,
      BLOOM.radius,
      BLOOM.threshold,
    );
    this.bloomPass.enabled = profile.bloom;
    this.composer.addPass(new RenderPass(this.scene, new PerspectiveCamera()));
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(this.edgePass);
    this.updateEdgeResolution();
  }

  async loadPlayerModel(classId = "TK"): Promise<void> {
    await this.playerView.load(classId);
  }

  getEffectComposer(): EffectComposer {
    return this.composer;
  }

  private setupLights(shadows: boolean, shadowMapSize: number, shadowHalfExtent: number): DirectionalLight {
    this.scene.add(this.hemisphereLight);

    const key = new DirectionalLight(0xffdfb8, 2.5);
    key.position.copy(KEY_LIGHT_OFFSET);
    key.castShadow = shadows;
    key.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 80;
    key.shadow.camera.left = -shadowHalfExtent;
    key.shadow.camera.right = shadowHalfExtent;
    key.shadow.camera.top = shadowHalfExtent;
    key.shadow.camera.bottom = -shadowHalfExtent;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    key.shadow.radius = 2;
    key.shadow.intensity = 0.38;
    this.scene.add(key);
    this.scene.add(key.target);

    const fill = this.fillLight;
    fill.position.set(10, 8, 12);
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
    const dome = new Mesh(new SphereGeometry(70, 24, 12), material);
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
      gradient.addColorStop(0, "rgba(0,0,0,0.22)");
      gradient.addColorStop(0.5, "rgba(0,0,0,0.08)");
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

  setQuality(quality: GraphicsQualityLevel): void {
    if (this.quality === quality) return;
    const previousProfile = GRAPHICS_PRESETS[this.quality];
    this.quality = quality;
    setActiveQuality(quality);
    const profile = GRAPHICS_PRESETS[quality];

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.maxDpr));
    this.renderer.setSize(this.lastWidth, this.lastHeight, false);

    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(this.lastWidth, this.lastHeight);
    this.updateEdgeResolution();
    this.composer.renderTarget1.samples = profile.samples;
    this.composer.renderTarget2.samples = profile.samples;
    this.composer.renderTarget1.dispose();
    this.composer.renderTarget2.dispose();

    this.bloomPass.enabled = profile.bloom;
    this.bloomPass.setSize(
      Math.round(this.lastWidth * (profile.bloomHalfRes ? 0.5 : 1)),
      Math.round(this.lastHeight * (profile.bloomHalfRes ? 0.5 : 1)),
    );

    this.applyShadowsPreset(profile.shadows, profile.shadowMapSize, profile.shadowHalfExtent);
    this.applyRuntimeBudget();

    if (profile.cheapShaders !== previousProfile.cheapShaders) {
      this.worldRoot.traverse((obj) => {
        const mesh = obj as Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          if (typeof mat.customProgramCacheKey === "function") {
            mat.needsUpdate = true;
          }
        }
      });
    }
  }

  getQuality(): GraphicsQualityLevel {
    return this.quality;
  }

  applyRuntimeBudget(): void {
    this.scene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (mesh.userData.budgetKind === "grass") {
        const full = mesh.userData.fullCount;
        const instanced = mesh as Mesh & { count?: number };
        if (typeof full === "number" && typeof instanced.count === "number") instanced.count = grassCount(full);
        mesh.receiveShadow = false;
      }
      if (!mesh.isMesh || !mesh.material) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        const mapped = mat as { map?: { anisotropy: number } | null; normalMap?: { anisotropy: number } | null; roughnessMap?: { anisotropy: number } | null };
        stampAnisotropy(mapped.map);
        stampAnisotropy(mapped.normalMap);
        stampAnisotropy(mapped.roughnessMap);
      }
    });
    this.syncPointLights();
  }

  private applyShadowFrustum(extent: number, mapSize: number): void {
    const camera = this.keyLight.shadow.camera;
    camera.left = -extent;
    camera.right = extent;
    camera.top = extent;
    camera.bottom = -extent;
    camera.updateProjectionMatrix();
    this.keyLight.shadow.mapSize.set(mapSize, mapSize);
    if (this.keyLight.shadow.map) {
      this.keyLight.shadow.map.dispose();
      this.keyLight.shadow.map = null as never;
    }
  }

  private applyShadowsPreset(enabled: boolean, mapSize: number, extent: number): void {
    this.renderer.shadowMap.enabled = enabled;
    this.keyLight.castShadow = enabled;
    this.playerBlobShadow.visible = !enabled;
    this.applyShadowFrustum(this.worldLook === "city" ? 24 : extent, mapSize);
    if (enabled) this.renderer.shadowMap.needsUpdate = true;
  }

  private syncPointLights(): void {
    const profile = GRAPHICS_PRESETS[this.quality];
    const world: PointLight[] = [];
    const skill: PointLight[] = [];
    this.scene.traverse((obj) => {
      const light = obj as PointLight;
      if (!light.isPointLight) return;
      if (light.userData.worldLight === true) world.push(light);
      else skill.push(light);
    });
    const player = this.playerMesh.position;
    world.sort((a, b) => {
      const distanceA = Math.hypot(a.position.x - player.x, a.position.z - player.z);
      const distanceB = Math.hypot(b.position.x - player.x, b.position.z - player.z);
      const scoreA = ((a.userData.lightRank as number) || 0) / (1 + distanceA);
      const scoreB = ((b.userData.lightRank as number) || 0) / (1 + distanceB);
      return scoreB - scoreA;
    });
    let visible = 0;
    world.forEach((light, index) => {
      const keep = index < profile.maxPointLights;
      light.visible = keep;
      if (keep) visible += 1;
    });
    for (const light of skill) {
      const keep = profile.vfxLights && light.intensity > 0.001;
      light.visible = keep;
      if (keep) visible += 1;
    }
    this.visiblePointLights = visible;
  }

  setWorldLook(kind: keyof typeof WORLD_LOOKS): void {
    this.worldLook = kind;
    const city = kind === "city";
    const dungeon = kind === "dungeon";
    const look = WORLD_LOOKS[kind];
    this.hemisphereLight.color.set(look.sky);
    this.hemisphereLight.groundColor.set(look.ground);
    this.hemisphereLight.intensity = look.ambient;
    this.fillLight.color.set(0xaab6f7);
    this.fillLight.intensity = city ? 0.85 : 0.7;
    this.keyLight.color.set(kind === "cemetery" ? 0xf5dabf : 0xffdfb8);
    this.keyLight.intensity = look.key;
    this.keyLight.shadow.intensity = look.shadow;
    const profile = GRAPHICS_PRESETS[this.quality];
    this.applyShadowFrustum(city ? 24 : profile.shadowHalfExtent, profile.shadowMapSize);
    const fogColor = look.fog;
    this.scene.background = new Color(fogColor);
    const fog = this.scene.fog as FogExp2 | null;
    if (fog) {
      fog.color.set(fogColor);
      fog.density = look.density;
    }
    this.renderer.toneMappingExposure = look.exposure;
    this.skyDome.visible = !dungeon;
    const sky = this.skyDome.material as ShaderMaterial;
    (sky.uniforms.zenith!.value as Color).set(kind === "cemetery" ? 0x7886ac : SKY_ZENITH);
    (sky.uniforms.horizon!.value as Color).set(kind === "cemetery" ? 0x9ca0b5 : SKY_HORIZON);
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
    this.lastWidth = w;
    this.lastHeight = h;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.updateEdgeResolution();
    const profile = GRAPHICS_PRESETS[this.quality];
    this.bloomPass.setSize(
      Math.round(w * (profile.bloomHalfRes ? 0.5 : 1)),
      Math.round(h * (profile.bloomHalfRes ? 0.5 : 1)),
    );
  }

  private updateEdgeResolution(): void {
    const dpr = this.renderer.getPixelRatio();
    this.edgePass.uniforms.resolution!.value.set(1 / (this.lastWidth * dpr), 1 / (this.lastHeight * dpr));
  }

  setOccluders(occluders: Object3D[]): void {
    this.occluders = occluders;
  }

  private occlusionBox(obj: Object3D): Box3 | null {
    const stamp = obj.children.length;
    const cached = obj.userData.occlusionBox as Box3 | undefined;
    if (cached && obj.userData.occlusionStamp === stamp && !cached.isEmpty()) return cached;
    obj.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(obj);
    if (box.isEmpty()) return null;
    obj.userData.occlusionBox = box;
    obj.userData.occlusionStamp = stamp;
    return box;
  }

  private sampleOccluded(origin: Vector3): boolean {
    this.toPlayer.subVectors(this.samplePoint, origin);
    const dist = this.toPlayer.length();
    if (dist < 0.2) return false;
    this.raycaster.set(origin, this.toPlayer.multiplyScalar(1 / dist));
    const limit = dist - 0.15;
    for (const obj of this.occluders) {
      if (obj.userData.occlusionIgnore === true) continue;
      const box = this.occlusionBox(obj);
      if (!box || box.containsPoint(this.samplePoint)) continue;
      if (!this.raycaster.ray.intersectBox(box, this.occlusionHit)) continue;
      if (this.occlusionHit.distanceTo(origin) < limit) return true;
    }
    return false;
  }

  private updatePlayerGhost(camera: PerspectiveCamera): void {
    this.playerGhostMesh.visible = false;
    if (!this.playerView.ready || this.occluders.length === 0) {
      this.occlusionVisible = false;
      this.playerView.setOcclusionGhostVisible(false);
      return;
    }
    const now = performance.now();
    if (now - this.lastOcclusionAt < 80) {
      this.playerView.setOcclusionGhostVisible(this.occlusionVisible);
      return;
    }
    this.lastOcclusionAt = now;
    this.playerMesh.getWorldPosition(this.playerCenter);
    this.sampleRight.setFromMatrixColumn(camera.matrixWorld, 0);
    this.sampleRight.y = 0;
    if (this.sampleRight.lengthSq() < 1e-6) this.sampleRight.set(1, 0, 0);
    else this.sampleRight.normalize();
    const xs = [-0.32, 0, 0.32];
    const ys = [0.35, 0.95, 1.5];
    let occluded = 0;
    for (const y of ys) {
      for (const x of xs) {
        this.samplePoint.copy(this.playerCenter);
        this.samplePoint.addScaledVector(this.sampleRight, x);
        this.samplePoint.y += y;
        if (this.sampleOccluded(camera.position)) occluded += 1;
      }
    }
    this.occlusionVisible = occluded > 4;
    this.playerView.setOcclusionGhostVisible(this.occlusionVisible);
  }

  private followKeyLight(): void {
    const p = this.playerMesh.position;
    const city = this.worldLook === "city";
    const x = city ? 0 : p.x;
    const z = city ? 0 : p.z;
    this.skyDome.position.set(p.x, 0, p.z);
    this.keyLight.target.position.set(x, 0, z);
    this.keyLight.position.set(x + KEY_LIGHT_OFFSET.x, KEY_LIGHT_OFFSET.y, z + KEY_LIGHT_OFFSET.z);
    const now = performance.now();
    const interval = city ? GRAPHICS_PRESETS[this.quality].shadowUpdateInterval * 1000 : 16;
    if (this.renderer.shadowMap.enabled && now - this.lastShadowUpdateAt >= interval) {
      this.renderer.shadowMap.needsUpdate = true;
      this.lastShadowUpdateAt = now;
    }
  }
  present(camera: PerspectiveCamera): void {
    if (this.disposed) return;
    this.renderer.compile(this.scene, camera);
    this.render(camera);
  }

  getFrameStats(): { draws: number; triangles: number; programs: number; lights: number } {
    const info = this.renderer.info;
    return {
      draws: info.render.calls,
      triangles: info.render.triangles,
      programs: info.programs?.length ?? 0,
      lights: this.visiblePointLights,
    };
  }

  render(camera: PerspectiveCamera): void {
    if (this.disposed) return;
    this.updatePlayerGhost(camera);
    this.followKeyLight();
    this.syncPointLights();
    if (!GRAPHICS_PRESETS[this.quality].useComposer) {
      this.renderer.render(this.scene, camera);
      return;
    }
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
    this.edgePass.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}

import {
  AmbientLight,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from "three";
import { PlayerView } from "../player/PlayerView";

export interface SceneRendererOptions {
  canvas: HTMLCanvasElement;
}

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

  constructor(options: SceneRendererOptions) {
    this.scene.background = new Color(0x0f1218);
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

    this.setupLights();
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
  }

  async loadPlayerModel(classId = "TK"): Promise<void> {
    await this.playerView.load(classId);
  }

  private setupLights(): void {
    this.scene.add(new AmbientLight(0xb0c4de, 0.55));
    const dir = new DirectionalLight(0xffffff, 1.05);
    dir.position.set(6, 12, 8);
    this.scene.add(dir);
    const fill = new DirectionalLight(0x88aaff, 0.25);
    fill.position.set(-6, 4, -4);
    this.scene.add(fill);
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
      gradient.addColorStop(0, "rgba(0,0,0,0.58)");
      gradient.addColorStop(0.45, "rgba(0,0,0,0.28)");
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

  setBlobShadowEnabled(enabled: boolean): void {
    this.playerBlobShadow.visible = enabled;
  }

  setPlayerTransform(x: number, z: number, facing: number, moving: boolean): void {
    this.playerView.setPose(x, z, facing, moving);
  }

  updatePlayer(dt: number): void {
    this.playerView.update(dt);
  }

  resize(width: number, height: number): void {
    const w = Math.max(width, 1);
    const h = Math.max(height, 1);
    this.renderer.setSize(w, h, false);
  }

  private updatePlayerGhost(camera: PerspectiveCamera): void {
    this.playerMesh.getWorldPosition(this.playerCenter);
    this.playerCenter.y += 0.9;
    this.toPlayer.subVectors(this.playerCenter, camera.position);
    const dist = this.toPlayer.length();
    this.playerGhostMesh.visible = false;
    if (dist < 0.2 || !this.playerView.ready) {
      this.playerView.setOcclusionGhostVisible(false);
      return;
    }
    this.raycaster.set(camera.position, this.toPlayer.normalize());
    this.raycaster.far = dist - 0.2;
    const occluded = this.raycaster.intersectObject(this.worldRoot, true).length > 0;
    this.playerView.setOcclusionGhostVisible(occluded);
  }

  render(camera: PerspectiveCamera): void {
    if (this.disposed) return;
    this.updatePlayerGhost(camera);
    this.renderer.render(this.scene, camera);
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
    this.renderer.dispose();
  }
}

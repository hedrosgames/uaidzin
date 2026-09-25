import {
  ACESFilmicToneMapping,
  AmbientLight,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  GridHelper,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BastiaoVfxController } from "./BastiaoVfx";

const stage = requireElement<HTMLElement>("stage");
const canvas = requireElement<HTMLCanvasElement>("gl");
const castButton = requireElement<HTMLButtonElement>("cast");
const speedInput = requireElement<HTMLInputElement>("speed");
const speedLabel = requireElement<HTMLSpanElement>("speed-value");
const phaseLabel = requireElement<HTMLElement>("phase");
const particlesLabel = requireElement<HTMLElement>("particles");
const castsLabel = requireElement<HTMLElement>("casts");
const targetSelect = requireElement<HTMLSelectElement>("target-direction");
const pauseButton = requireElement<HTMLButtonElement>("pause");
const resetCameraButton = requireElement<HTMLButtonElement>("reset-camera");
const listeners = new AbortController();

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemento obrigatório ausente: ${id}`);
  return element as T;
}

const renderer = new WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setClearColor(0x100c08, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new Scene();
scene.background = new Color(0x100c08);
scene.fog = new Fog(0x100c08, 13, 30);

const camera = new PerspectiveCamera(42, 16 / 9, 0.1, 80);
camera.position.set(0, 4.2, 12.2);
camera.lookAt(0, 1.2, 0);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;
controls.minDistance = 4;
controls.maxDistance = 26;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.update();
controls.saveState();

const ambient = new AmbientLight(0x9da9bb, 0.42);
scene.add(ambient);
const hemisphere = new HemisphereLight(0x9eb7d4, 0x3b2416, 0.58);
scene.add(hemisphere);
const key = new DirectionalLight(0xffe4b0, 2.1);
key.position.set(-4, 8, 5);
scene.add(key);

const ground = new Mesh(
  new PlaneGeometry(24, 15),
  new MeshStandardMaterial({ color: 0x302519, roughness: 0.96, metalness: 0.04 }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const grid = new GridHelper(24, 24, 0x6d5637, 0x463824);
grid.position.y = 0.012;
scene.add(grid);

const casterMaterial = new MeshStandardMaterial({
  color: 0x3d3228,
  roughness: 0.6,
  metalness: 0.24,
  emissive: new Color(0xd4a017).multiplyScalar(0.06),
});
const casterBody = new Mesh(new CapsuleGeometry(0.3, 0.76, 6, 12), casterMaterial);
casterBody.position.y = 0.9;
const casterHead = new Mesh(new SphereGeometry(0.25, 16, 12), casterMaterial);
casterHead.position.y = 1.62;
const casterBase = new Mesh(
  new CylinderGeometry(0.42, 0.5, 0.12, 24),
  new MeshStandardMaterial({ color: 0x2e241a, roughness: 0.82, metalness: 0.22 }),
);
casterBase.position.y = 0.06;
const casterGroup = new Group();
casterGroup.add(casterBase, casterBody, casterHead);
scene.add(casterGroup);

const casterPosition = new Vector3(0, 0.05, 0);
const vfx = new BastiaoVfxController(scene);
const directions = [
  new Vector3(0, 0.05, 0),
  new Vector3(-4.5, 0.05, 0),
  new Vector3(3.4, 0.05, 2.6),
  new Vector3(3.4, 0.05, -2.6),
  new Vector3(-3, 0.05, 3.4),
  new Vector3(-3, 0.05, -3.4),
  new Vector3(0, 4.4, 0),
  new Vector3(0, 0.05, 0),
  new Vector3(5.2, 0.05, 0),
  new Vector3(-5.2, 0.05, -2),
  new Vector3(0, 0.05, 4.6),
];

const composer = new EffectComposer(renderer);
const bloomPass = new UnrealBloomPass(new Vector2(1600, 900), 0.42, 0.32, 0.93);
const outputPass = new OutputPass();
composer.addPass(new RenderPass(scene, camera));
composer.addPass(bloomPass);
composer.addPass(outputPass);

let looping = new URLSearchParams(window.location.search).get("qa") !== "1";
let speed = 1;
let nextLoopCast = 0.45;
let previousTime = performance.now();
let simulationPaused = !looping;
let disposed = false;

function castBastiao(): void {
  if (disposed || vfx.getActiveCastCount() > 0) return;
  vfx.castBastiao(casterPosition);
  nextLoopCast = performance.now() / 1000 + 2.7;
}

function setTarget(x: number, y: number, z: number): void {
  if (disposed || ![x, y, z].every(Number.isFinite)) return;
  vfx.clear();
  casterPosition.set(x, y, z);
  casterGroup.position.set(x, y - 0.05, z);
}

function setPaused(value: boolean): void {
  simulationPaused = value;
  previousTime = performance.now();
  pauseButton.textContent = value ? "Continuar" : "Pausar";
  pauseButton.setAttribute("aria-pressed", String(value));
}

function resize(): void {
  if (disposed) return;
  const width = Math.max(stage.clientWidth, 1);
  const height = Math.max(stage.clientHeight, 1);
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function fitStage(): void {
  if (disposed) return;
  const scale = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
  stage.style.transform = `scale(${scale})`;
  const marginX = (1600 * scale - 1600) / 2;
  const marginY = (900 * scale - 900) / 2;
  stage.style.margin = `${marginY}px ${marginX}px`;
  resize();
}

function updateHud(): void {
  const phase = vfx.getPhase();
  phaseLabel.textContent =
    phase === "idle"
      ? "pronta"
      : phase === "rise"
        ? "estacas"
        : phase === "chains"
          ? "correntes"
          : phase === "hold"
            ? "cofre"
            : "descida";
  particlesLabel.textContent = String(vfx.getParticleCount());
  castsLabel.textContent = String(vfx.getActiveCastCount());
}

function tick(now: number): void {
  if (disposed) return;
  const rawDelta = Math.min((now - previousTime) / 1000, 0.1);
  previousTime = now;
  const delta = rawDelta * speed;
  if (!simulationPaused) {
    vfx.update(delta, stage.clientWidth, stage.clientHeight);
    const seconds = now / 1000;
    if (looping && vfx.getActiveCastCount() === 0 && seconds >= nextLoopCast) {
      castBastiao();
    }
  }
  controls.update();
  updateHud();
  composer.render();
  requestAnimationFrame(tick);
}

function dispose(): void {
  if (disposed) return;
  disposed = true;
  listeners.abort();
  controls.dispose();
  vfx.dispose();
  const disposedGeometries = new WeakSet<object>();
  const disposedMaterials = new WeakSet<object>();
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (!disposedGeometries.has(object.geometry)) {
      object.geometry.dispose();
      disposedGeometries.add(object.geometry);
    }
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (disposedMaterials.has(material)) continue;
      material.dispose();
      disposedMaterials.add(material);
    }
  });
  grid.geometry.dispose();
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
  for (const material of gridMaterials) material.dispose();
  bloomPass.dispose();
  outputPass.dispose();
  composer.dispose();
  renderer.dispose();
}

const eventOptions = { signal: listeners.signal };
castButton.addEventListener("click", () => {
  vfx.clear();
  setPaused(false);
  castBastiao();
}, eventOptions);
speedInput.addEventListener("input", () => {
  if (disposed) return;
  speed = Number(speedInput.value);
  speedLabel.textContent = `${speed.toFixed(2).replace(".", ",")}×`;
}, eventOptions);
pauseButton.addEventListener("click", () => setPaused(!simulationPaused), eventOptions);
targetSelect.addEventListener("change", () => {
  const direction = directions[Number(targetSelect.value)];
  if (!direction) return;
  setTarget(direction.x, direction.y, direction.z);
  setPaused(false);
  castBastiao();
}, eventOptions);
resetCameraButton.addEventListener("click", () => controls.reset(), eventOptions);
window.addEventListener("resize", fitStage, eventOptions);
window.addEventListener("pagehide", dispose, { ...eventOptions, once: true });

const api = {
  cast: castBastiao,
  setPaused: (value: boolean) => {
    if (disposed) return;
    setPaused(value);
  },
  advance: (seconds: number) => {
    if (disposed) return;
    let remaining = Math.max(0, seconds);
    while (remaining > 0) {
      const step = Math.min(remaining, 0.05);
      vfx.update(step, stage.clientWidth, stage.clientHeight);
      remaining -= step;
    }
    updateHud();
    composer.render();
  },
  clear: () => {
    if (!disposed) vfx.clear();
  },
  getState: () => ({
    phase: vfx.getPhase(),
    particles: vfx.getParticleCount(),
    casts: vfx.getActiveCastCount(),
    bastioes: vfx.getCastStates(),
    paused: simulationPaused,
    speed,
    target: casterPosition.toArray(),
    memory: { ...renderer.info.memory },
    systems: vfx.getSystems().length,
    particleSystems: vfx.getSystems().map((system, index) => ({
      index,
      particles: system.particleNum,
      paused: system.paused,
      time: system.time,
      visible: system.emitter.visible,
      waitEmitting: system.emissionState.waitEmiting,
    })),
  }),
  getPhase: () => vfx.getPhase(),
  setTarget,
  scene,
  camera,
  renderer,
  render: () => composer.render(),
  dispose,
};
Object.assign(window, { __UAIDZIN_TK_BASTIAO__: api });

fitStage();
setPaused(simulationPaused);
updateHud();
requestAnimationFrame(tick);
document.body.dataset.ready = "true";

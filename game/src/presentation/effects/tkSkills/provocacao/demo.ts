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
import { ProvocacaoVfxController } from "./ProvocacaoVfx";

const stage = requireElement<HTMLElement>("stage");
const canvas = requireElement<HTMLCanvasElement>("gl");
const castButton = requireElement<HTMLButtonElement>("cast");
const loopButton = requireElement<HTMLButtonElement>("loop");
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
camera.position.set(0, 4.6, 9.6);
camera.lookAt(0, 0.9, 0);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.9, 0);
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

function createFigure(color: number, x: number, z = 0): Group {
  const group = new Group();
  const material = new MeshStandardMaterial({
    color,
    roughness: 0.68,
    metalness: 0.08,
    emissive: new Color(color).multiplyScalar(0.08),
  });
  const body = new Mesh(new CapsuleGeometry(0.3, 0.76, 6, 12), material);
  body.position.y = 0.9;
  const head = new Mesh(new SphereGeometry(0.25, 16, 12), material);
  head.position.y = 1.62;
  const base = new Mesh(
    new CylinderGeometry(0.42, 0.5, 0.12, 24),
    new MeshStandardMaterial({ color: 0x2e241a, roughness: 0.82, metalness: 0.22 }),
  );
  base.position.y = 0.06;
  group.add(base, body, head);
  group.position.set(x, 0, z);
  scene.add(group);
  return group;
}

const caster = createFigure(0x365b82, 0);
createFigure(0x4a4038, 2.6, 1.4);
createFigure(0x4a4038, -2.2, 1.8);
createFigure(0x4a4038, 0.4, -2.8);
const auraCenter = new Vector3(0, 0, 0);
const vfx = new ProvocacaoVfxController(scene);
const directions = [
  new Vector3(0, 0, 0),
  new Vector3(-5.4, 0, 0),
  new Vector3(0, 0, 4.5),
  new Vector3(0, 0, -4.5),
  new Vector3(3.4, 0, -3.4),
  new Vector3(-3.4, 0, 3.4),
];

const composer = new EffectComposer(renderer);
const bloomPass = new UnrealBloomPass(new Vector2(1600, 900), 0.38, 0.3, 0.94);
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

function castProvocacao(): void {
  if (disposed) return;
  vfx.castProvocacao(auraCenter);
  nextLoopCast = performance.now() / 1000 + 1.4;
}

function setTarget(x: number, y: number, z: number): void {
  if (disposed || ![x, y, z].every(Number.isFinite)) return;
  vfx.clear();
  auraCenter.set(x, y, z);
  caster.position.x = x;
  caster.position.z = z;
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
      : phase === "shock"
        ? "impacto"
        : phase === "surge"
          ? "marcando"
          : "desvanecendo";
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
      castProvocacao();
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
  castProvocacao();
}, eventOptions);
loopButton.addEventListener("click", () => {
  if (disposed) return;
  looping = !looping;
  loopButton.textContent = looping ? "Repetição: ligada" : "Repetição: desligada";
  loopButton.setAttribute("aria-pressed", String(looping));
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
  castProvocacao();
}, eventOptions);
resetCameraButton.addEventListener("click", () => controls.reset(), eventOptions);
window.addEventListener("resize", fitStage, eventOptions);
window.addEventListener("pagehide", dispose, { ...eventOptions, once: true });

const api = {
  cast: castProvocacao,
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
  getPhase: () => vfx.getPhase(),
  getState: () => ({
    phase: vfx.getPhase(),
    particles: vfx.getParticleCount(),
    casts: vfx.getActiveCastCount(),
    auras: vfx.getCastStates(),
    paused: simulationPaused,
    speed,
    target: auraCenter.toArray(),
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
  setTarget,
  scene,
  camera,
  renderer,
  render: () => composer.render(),
  dispose,
};
Object.assign(window, { __UAIDZIN_TK_PROVOCACAO__: api });

fitStage();
setPaused(simulationPaused);
loopButton.textContent = looping ? "Repetição: ligada" : "Repetição: desligada";
loopButton.setAttribute("aria-pressed", String(looping));
updateHud();
requestAnimationFrame(tick);
document.body.dataset.ready = "true";

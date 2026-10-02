import {
  ACESFilmicToneMapping,
  AmbientLight,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  GridHelper,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
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
import { NevascaVfxController } from "./NevascaVfx";

const stage = requireElement<HTMLElement>("stage");
const canvas = requireElement<HTMLCanvasElement>("gl");
const castButton = requireElement<HTMLButtonElement>("cast");
const loopButton = requireElement<HTMLButtonElement>("loop");
const speedInput = requireElement<HTMLInputElement>("speed");
const speedLabel = requireElement<HTMLSpanElement>("speed-value");
const phaseLabel = requireElement<HTMLElement>("phase");
const particlesLabel = requireElement<HTMLElement>("particles");
const castsLabel = requireElement<HTMLElement>("casts");
const centerSelect = requireElement<HTMLSelectElement>("target-center");
const slowToggle = requireElement<HTMLInputElement>("slow");
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
scene.fog = new Fog(0x100c08, 14, 32);

const camera = new PerspectiveCamera(42, 16 / 9, 0.1, 80);
camera.position.set(0, 6.4, 14.8);
camera.lookAt(0, 1, 0);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
controls.minDistance = 5;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.update();
controls.saveState();

const ambient = new AmbientLight(0x9da9bb, 0.32);
scene.add(ambient);
const hemisphere = new HemisphereLight(0xa8c6e0, 0x2a3644, 0.5);
scene.add(hemisphere);
const key = new DirectionalLight(0xffe4b0, 1.5);
key.position.set(-4, 8, 5);
scene.add(key);

const ground = new Mesh(
  new PlaneGeometry(28, 18),
  new MeshStandardMaterial({ color: 0x27313d, roughness: 0.96, metalness: 0.04 }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const grid = new GridHelper(28, 28, 0x4c6480, 0x333f4d);
grid.position.y = 0.012;
scene.add(grid);

interface Figure {
  group: Group;
  material: MeshStandardMaterial;
}

function createFigure(color: number, x: number, z: number): Figure {
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
  return { group, material };
}

const caster = createFigure(0x365b82, -4.8, 0).group;
const victims = [
  createFigure(0x7d2f2f, 0, 0),
  createFigure(0x7d2f2f, 1.9, 0.9),
  createFigure(0x7d2f2f, -1.4, -1.7),
  createFigure(0x7d2f2f, 0.6, 2.6),
];
const origin = new Vector3(-4.8, 1.05, 0);
const center = new Vector3(0, 0, 0);
const vfx = new NevascaVfxController(scene);
const centers = [
  new Vector3(0, 0, 0),
  new Vector3(2.4, 0, -1.2),
  new Vector3(-2.6, 0, 1.4),
  new Vector3(0.8, 0, 3.2),
  new Vector3(-1.2, 0, -2.8),
];
const victimBase = victims.map(victim => victim.material.color.clone());
const FROST_TINT = new Color(0x9fd8ff);

const areaMarker = new Mesh(
  new CircleGeometry(3.8, 64),
  new MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.1, depthWrite: false }),
);
areaMarker.rotation.x = -Math.PI / 2;
areaMarker.position.y = 0.02;
scene.add(areaMarker);

const composer = new EffectComposer(renderer);
const bloomPass = new UnrealBloomPass(new Vector2(1600, 900), 0.8, 0.5, 0.62);
const outputPass = new OutputPass();
composer.addPass(new RenderPass(scene, camera));
composer.addPass(bloomPass);
composer.addPass(outputPass);

let looping = new URLSearchParams(window.location.search).get("qa") !== "1";
let speed = 1;
let slowPreview = true;
let slowTimer = 0;
let nextLoopCast = 0.5;
let previousTime = performance.now();
let simulationPaused = !looping;
let disposed = false;

function castNevasca(): void {
  if (disposed || vfx.getActiveCastCount() >= 2) return;
  vfx.castNevasca(center);
  slowTimer = 3.5;
  nextLoopCast = performance.now() / 1000 + 2.1;
}

function setTarget(x: number, y: number, z: number): void {
  if (disposed || ![x, y, z].every(Number.isFinite)) return;
  vfx.clear();
  center.set(x, Math.max(y, 0), z);
  areaMarker.position.set(x, 0.02, z);
  victims[0]!.group.position.set(x, 0, z);
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

function updateSlow(delta: number): void {
  slowTimer = Math.max(0, slowTimer - delta);
  const active = slowPreview && slowTimer > 0;
  victims.forEach((victim, index) => {
    const stagger = MathUtils.clamp(slowTimer / 3.5, 0, 1);
    const factor = active ? 1 - 0.16 * stagger : 1;
    victim.group.scale.set(1, factor, 1);
    victim.group.position.y = active ? -0.04 * stagger : 0;
    const frost = active ? 0.34 * stagger : 0;
    victim.material.color.copy(victimBase[index]!).lerp(FROST_TINT, frost);
    victim.material.emissive.setRGB(frost * 0.1, frost * 0.16, frost * 0.22);
  });
}

function updateHud(): void {
  const phase = vfx.getPhase();
  phaseLabel.textContent =
    phase === "idle" ? "pronta"
      : phase === "telegraph" ? "sigilo"
        : phase === "storm" ? "vórtice"
          : phase === "peak" ? "ruptura" : "resíduo";
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
    updateSlow(delta);
    const seconds = now / 1000;
    caster.position.y = Math.sin(seconds * 2.1) * 0.012;
    if (looping && vfx.getActiveCastCount() === 0 && seconds >= nextLoopCast) {
      castNevasca();
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
  castNevasca();
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
slowToggle.addEventListener("change", () => {
  if (disposed) return;
  slowPreview = slowToggle.checked;
}, eventOptions);
pauseButton.addEventListener("click", () => setPaused(!simulationPaused), eventOptions);
centerSelect.addEventListener("change", () => {
  const selected = centers[Number(centerSelect.value)];
  if (!selected) return;
  setTarget(selected.x, selected.y, selected.z);
  setPaused(false);
  castNevasca();
}, eventOptions);
resetCameraButton.addEventListener("click", () => controls.reset(), eventOptions);
window.addEventListener("resize", fitStage, eventOptions);
window.addEventListener("pagehide", dispose, { ...eventOptions, once: true });

const api = {
  cast: castNevasca,
  setPaused: (value: boolean) => {
    if (disposed) return;
    setPaused(value);
  },
  getPhase: () => vfx.getPhase(),
  advance: (seconds: number) => {
    if (disposed) return;
    let remaining = Math.max(0, seconds);
    while (remaining > 0) {
      const step = Math.min(remaining, 0.05);
      vfx.update(step, stage.clientWidth, stage.clientHeight);
      updateSlow(step);
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
    castStates: vfx.getCastStates(),
    paused: simulationPaused,
    speed,
    radius: 3.8,
    center: center.toArray(),
    origin: origin.toArray(),
    slowTimer,
    memory: { ...renderer.info.memory },
    systems: vfx.getSystems().length,
    particleSystems: vfx.getSystems().map((system, index) => ({
      index,
      name: system.emitter.name,
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
Object.assign(window, { __UAIDZIN_FM_NEVASCA__: api });

fitStage();
setPaused(simulationPaused);
loopButton.textContent = looping ? "Repetição: ligada" : "Repetição: desligada";
loopButton.setAttribute("aria-pressed", String(looping));
updateHud();
requestAnimationFrame(tick);
document.body.dataset.ready = "true";

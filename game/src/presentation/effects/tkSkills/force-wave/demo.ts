import {
  AmbientLight, CapsuleGeometry, Color, DirectionalLight, GridHelper, Mesh,
  MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Scene, SphereGeometry, Vector3, WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ForceWaveVfxController } from "./ForceWaveVfx";

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Elemento ausente: ${id}`);
  return value as T;
}

const renderer = new WebGLRenderer({ canvas: element<HTMLCanvasElement>("gl"), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new Scene();
scene.background = new Color(0x100c08);
const camera = new PerspectiveCamera(42, 1, 0.05, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.8, 0);
controls.enableDamping = false;
const listeners = new AbortController();
const light = new DirectionalLight(0xfff4e0, 2);
light.position.set(-3, 8, 4);
scene.add(light, new AmbientLight(0xffffff, 1.2));
const floor = new Mesh(new PlaneGeometry(25, 25), new MeshStandardMaterial({ color: 0x302a21, roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
const grid = new GridHelper(24, 24, 0x73604a, 0x463d31);
grid.position.y = 0.005;
scene.add(floor, grid);
const figureGeometry = new CapsuleGeometry(0.27, 1, 6, 12);
const caster = new Mesh(figureGeometry, new MeshStandardMaterial({ color: 0x686b70, metalness: 0.4, roughness: 0.5 }));
caster.position.set(-1.5, 0.8, 0);
const enemy = new Mesh(figureGeometry, new MeshStandardMaterial({ color: 0xa33b3b, roughness: 0.65 }));
const origin = new Vector3(-1.25, 1.05, 0);
const target = new Vector3(1.5, 1.05, 0);
const socket = new Mesh(new SphereGeometry(0.045, 12, 8), new MeshStandardMaterial({ color: 0xd4a017 }));
socket.position.copy(origin);
enemy.position.set(target.x, target.y - 0.25, target.z);
scene.add(caster, enemy, socket);
const controller = new ForceWaveVfxController(scene);
const qa = new URLSearchParams(location.search).get("qa") === "1";
let paused = qa;
let looping = !qa;
let speed = 1;
let time = 0;
let sinceCast = 1;
let previous = performance.now();
let disposed = false;
let frameId = 0;
const directions = [
  [1.5, 1.05, 0], [-1.25, 1.05, 3], [-1.25, 1.05, -3],
  [-4.25, 1.05, 0], [1.5, 3, 0], [1.5, 0.3, 0], [-0.7, 1.05, 0],
] as const;
const views: Record<string, [number, number, number]> = {
  iso: [4, 5, 7], top: [0, 9, 0.01], side: [0, 1.5, 8], third: [-6, 2.7, 1.4],
};

function setView(view: string): void {
  camera.position.fromArray(views[view] ?? views.iso!);
  controls.update();
  render();
}

function render(): void {
  if (disposed) return;
  renderer.render(scene, camera);
  const phases = { idle: "Pronta", startup: "Concentração", travel: "Avanço", impact: "Impacto" };
  element("state").textContent = `${phases[controller.getPhase()]} · ${controller.getParticleCount()} partículas · ${Math.round(time * 1000)} ms`;
}

function cast(): void {
  if (disposed) return;
  controller.castForceWave(origin, target);
  sinceCast = 0;
  time = 0;
}

function advance(seconds: number): void {
  if (disposed || !Number.isFinite(seconds) || seconds <= 0) return;
  let remaining = Math.min(10, seconds);
  while (remaining > 1e-9) {
    const step = Math.min(1 / 60, remaining);
    controller.update(step, renderer.domElement.width, renderer.domElement.height);
    time += step;
    sinceCast += step;
    remaining -= step;
  }
  render();
}

function clear(): void {
  controller.clear();
  time = 0;
  render();
}

function setTarget(x: number, y: number, z: number): void {
  if (![x, y, z].every(Number.isFinite)) return;
  clear();
  target.set(x, y, z);
  enemy.position.set(x, y - 0.25, z);
  render();
}

function setOrigin(x: number, y: number, z: number): void {
  if (![x, y, z].every(Number.isFinite)) return;
  clear();
  origin.set(x, y, z);
  socket.position.copy(origin);
}

function setPaused(value: boolean): void {
  paused = value;
  element("pause").textContent = paused ? "Continuar" : "Pausar";
  element("pause").setAttribute("aria-pressed", String(paused));
}

function getState() {
  return {
    phase: controller.getPhase(), casts: controller.getActiveCastCount(),
    particles: controller.getParticleCount(), systems: controller.getSystems().length,
    waves: controller.getCastStates(), origin: origin.toArray(), target: target.toArray(),
    paused, speed, time, memory: { ...renderer.info.memory },
    particleSystems: controller.getSystems().map(system => ({
      name: system.emitter.name, particles: system.particleNum, paused: system.paused,
    })),
  };
}

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  render();
}

function dispose(): void {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(frameId);
  listeners.abort();
  controls.dispose();
  controller.dispose();
  const geometries = new Set<typeof floor.geometry>();
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
  });
  for (const geometry of geometries) geometry.dispose();
  grid.geometry.dispose();
  for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) material.dispose();
  scene.clear();
  renderer.dispose();
}

function tick(now: number): void {
  if (disposed) return;
  const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000)) * speed;
  previous = now;
  if (!paused) {
    if (looping && sinceCast > 0.9) cast();
    advance(dt);
  }
  render();
  frameId = requestAnimationFrame(tick);
}

element("cast").addEventListener("click", () => { clear(); cast(); }, { signal: listeners.signal });
element("loop").addEventListener("click", () => {
  looping = !looping;
  element("loop").setAttribute("aria-pressed", String(looping));
}, { signal: listeners.signal });
element("pause").addEventListener("click", () => setPaused(!paused), { signal: listeners.signal });
element<HTMLInputElement>("speed").addEventListener("input", event => {
  speed = Number((event.target as HTMLInputElement).value);
  element("speed-value").textContent = `${speed.toFixed(1)}×`;
}, { signal: listeners.signal });
element<HTMLSelectElement>("target-direction").addEventListener("change", event => {
  const position = directions[Number((event.target as HTMLSelectElement).value)]!;
  setTarget(position[0], position[1], position[2]);
  cast();
}, { signal: listeners.signal });
element<HTMLSelectElement>("view").addEventListener("change", event => {
  setView((event.target as HTMLSelectElement).value);
}, { signal: listeners.signal });
element<HTMLInputElement>("time").addEventListener("input", event => {
  setPaused(true);
  clear();
  cast();
  const ms = Number((event.target as HTMLInputElement).value);
  advance(ms / 1000);
  element("time-value").textContent = `${Math.round(ms)} ms`;
}, { signal: listeners.signal });
window.addEventListener("resize", resize, { signal: listeners.signal });
window.addEventListener("pagehide", dispose, { signal: listeners.signal });
Object.assign(window, {
  __UAIDZIN_FORCE_WAVE__: { scene, camera, renderer, controller, cast, clear, advance, setTarget, setOrigin, setPaused, setView, getState, render, dispose },
});
setView("iso");
setPaused(paused);
element("loop").setAttribute("aria-pressed", String(looping));
resize();
frameId = requestAnimationFrame(tick);

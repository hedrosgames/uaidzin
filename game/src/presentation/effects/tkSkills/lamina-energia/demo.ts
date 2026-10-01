import {
  AmbientLight, CapsuleGeometry, Color, DirectionalLight, GridHelper, Mesh,
  MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Scene, SphereGeometry, Vector3, WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LaminaEnergiaVfxController } from "./LaminaEnergiaVfx";
import { LAMINA_ENERGIA_TIMING } from "./LaminaEnergiaTiming";

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Elemento ausente: ${id}`);
  return found as T;
}

const renderer = new WebGLRenderer({ canvas: element<HTMLCanvasElement>("gl"), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new Scene();
scene.background = new Color(0x100c08);
const camera = new PerspectiveCamera(42, 1, 0.05, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
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
const enemy = new Mesh(figureGeometry, new MeshStandardMaterial({ color: 0xa33b3b, roughness: 0.65 }));
const origin = new Vector3(-2, 1.05, 0);
const target = new Vector3(2, 1.05, 0);
caster.position.set(origin.x - 0.3, 0.8, 0);
enemy.position.set(target.x, 0.8, target.z);
const socket = new Mesh(new SphereGeometry(0.045, 12, 8), new MeshStandardMaterial({ color: 0xd4a017 }));
socket.position.copy(origin);
scene.add(caster, enemy, socket);
const controller = new LaminaEnergiaVfxController(scene);
const qa = new URLSearchParams(location.search).get("qa") === "1";
let paused = qa;
let looping = !qa;
let speed = 1;
let time = 0;
let sinceCast = 2;
let previous = performance.now();
let disposed = false;
let frameId = 0;
const directions = [
  [2, 1.05, 0], [-2, 1.05, 4], [-6, 1.05, 0], [1, 3.2, 0],
  [1, 0.35, 0], [-1.5, 1.05, 0], [6, 1.05, 0],
] as const;
const views: Record<string, [number, number, number]> = {
  iso: [5, 5.5, 8], top: [0, 10, 0.1], side: [0, 1.8, 9], third: [-7, 2.6, 2],
};

function render(): void {
  if (disposed) return;
  renderer.render(scene, camera);
  const phases = { idle: "Pronta", release: "Liberação", flight: "Voo", impact: "Impacto" };
  element("state").textContent = `${phases[controller.getPhase()]} · ${controller.getParticleCount()} partículas · ${Math.round(time * 1000)} ms`;
}

function setView(view: string): void {
  camera.position.fromArray(views[view] ?? views.iso!);
  controls.update();
  render();
}

function cast(): void {
  if (disposed) return;
  controller.castLaminaEnergia(origin, target);
  time = 0;
  sinceCast = 0;
  render();
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
  element<HTMLInputElement>("scrub").value = String(Math.min(650, Math.round(time * 1000)));
  render();
}

function clear(): void {
  controller.clear();
  time = 0;
  element<HTMLInputElement>("scrub").value = "0";
  render();
}

function setTarget(x: number, y: number, z: number): void {
  if (![x, y, z].every(Number.isFinite)) return;
  clear();
  target.set(x, y, z);
  enemy.position.set(x, Math.max(0.8, y - 0.25), z);
  render();
}

function setOrigin(x: number, y: number, z: number): void {
  if (![x, y, z].every(Number.isFinite)) return;
  clear();
  origin.set(x, y, z);
  socket.position.copy(origin);
  caster.position.set(x - 0.3, Math.max(0.8, y - 0.25), z);
  render();
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
    blades: controller.getCastStates(), origin: origin.toArray(), target: target.toArray(),
    paused, speed, time, timing: LAMINA_ENERGIA_TIMING, memory: { ...renderer.info.memory },
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
    if (looping && sinceCast > 1.1) cast();
    advance(dt);
  }
  render();
  frameId = requestAnimationFrame(tick);
}

const options = { signal: listeners.signal };
element("cast").addEventListener("click", () => { clear(); cast(); }, options);
element("clear").addEventListener("click", () => { looping = false; element<HTMLInputElement>("loop").checked = false; clear(); }, options);
element("pause").addEventListener("click", () => setPaused(!paused), options);
element("view").addEventListener("change", () => setView(element<HTMLSelectElement>("view").value), options);
element("direction").addEventListener("change", () => {
  const point = directions[Number(element<HTMLSelectElement>("direction").value)]!;
  setTarget(point[0], point[1], point[2]);
  cast();
}, options);
element("speed").addEventListener("change", () => { speed = Number(element<HTMLSelectElement>("speed").value); }, options);
element("loop").addEventListener("change", () => { looping = element<HTMLInputElement>("loop").checked; }, options);
element("scrub").addEventListener("input", () => {
  const seconds = Number(element<HTMLInputElement>("scrub").value) / 1000;
  setPaused(true);
  clear();
  cast();
  advance(seconds);
}, options);
window.addEventListener("resize", resize, options);
window.addEventListener("pagehide", dispose, options);
Object.assign(window, {
  __UAIDZIN_LAMINA_ENERGIA__: {
    cast, advance, clear, render, dispose, getState, setOrigin, setTarget, setView, setPaused,
    setLooping: (value: boolean) => { looping = value; element<HTMLInputElement>("loop").checked = value; },
  },
});
element<HTMLInputElement>("loop").checked = looping;
setPaused(paused);
setView("iso");
resize();
frameId = requestAnimationFrame(tick);
import.meta.hot?.dispose(dispose);

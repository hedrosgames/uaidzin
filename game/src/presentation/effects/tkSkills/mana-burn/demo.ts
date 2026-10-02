import {
  AmbientLight, CapsuleGeometry, Color, DirectionalLight, DoubleSide, GridHelper, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, RingGeometry, Scene, Vector3, WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TK_MAGIA } from "../../../../data/classes/skills/tk";
import { DEFAULT_MANA_BURN_VFX_CONFIG, ManaBurnVfxController } from "./ManaBurnVfx";

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
controls.target.set(0, 0.85, 0);
const listeners = new AbortController();
const light = new DirectionalLight(0xfff4e0, 2);
light.position.set(-3, 8, 4);
scene.add(light, new AmbientLight(0xffffff, 1.2));
const floor = new Mesh(new PlaneGeometry(25, 25), new MeshStandardMaterial({ color: 0x302a21, roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
const grid = new GridHelper(24, 24, 0x73604a, 0x463d31);
grid.position.y = 0.005;
scene.add(floor, grid);
const figureGeometry = new CapsuleGeometry(0.25, 1, 6, 12);
const caster = new Mesh(figureGeometry, new MeshStandardMaterial({ color: 0x686b70, metalness: 0.4, roughness: 0.5 }));
caster.name = "caster";
caster.position.y = 0.8;
scene.add(caster);
const enemyMaterial = new MeshStandardMaterial({ color: 0xa33b3b, roughness: 0.65 });
for (const [x, z] of [[2.1, 0.9], [-2.5, -1.5], [0, 4.2]]) {
  const enemy = new Mesh(figureGeometry, enemyMaterial);
  enemy.position.set(x, 0.8, z);
  scene.add(enemy);
}
const skill = TK_MAGIA.find(entry => entry.id === "tk_mag_mana_burn")!;
const center = new Vector3();
const boundary = new Mesh(new RingGeometry(DEFAULT_MANA_BURN_VFX_CONFIG.ringRadius - 0.012, DEFAULT_MANA_BURN_VFX_CONFIG.ringRadius, 96),
  new MeshBasicMaterial({ color: 0xd4a017, side: DoubleSide, transparent: true, opacity: 0.7, depthWrite: false }));
boundary.rotation.x = -Math.PI / 2;
boundary.position.y = 0.01;
boundary.visible = false;
scene.add(boundary);
const controller = new ManaBurnVfxController(scene);
const qa = new URLSearchParams(location.search).get("qa") === "1";
let paused = qa;
let looping = !qa;
let speed = 1;
let walking = false;
let time = 0;
let sinceCast = 2;
let walkAngle = 0;
let previous = performance.now();
let disposed = false;
let frameId = 0;
const views: Record<string, [number, number, number]> = {
  iso: [4.2, 4.2, 5.4], top: [0, 9, 0.1], side: [0, 2.2, 7], third: [0, 2.4, -6],
};

function render(): void {
  if (disposed) return;
  renderer.render(scene, camera);
  const phases = { idle: "Pronta", activation: "Dreno", peak: "Chama", state: "Estado", fade: "Dissipação" };
  element("state").textContent = `${phases[controller.getPhase()]} · ${controller.getParticleCount()} partículas · ${Math.round(time * 1000)} ms`;
}
function setView(view: string): void {
  camera.position.fromArray(views[view] ?? views.iso!);
  controls.update();
  render();
}
function cast(): void {
  if (disposed) return;
  center.set(caster.position.x, 0, caster.position.z);
  controller.castManaBurn(center, undefined, caster);
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
  element<HTMLInputElement>("scrub").value = String(Math.min(2800, Math.round(time * 1000)));
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
  center.set(x, y, z);
  caster.position.set(x, y + 0.8, z);
  boundary.position.set(x, y + 0.01, z);
  render();
}
function setPaused(value: boolean): void {
  paused = value;
  element("pause").textContent = paused ? "Continuar" : "Pausar";
  element("pause").setAttribute("aria-pressed", String(paused));
}
function setWalking(value: boolean): void {
  walking = value;
  element<HTMLInputElement>("walk").checked = value;
}
function getState() {
  return {
    phase: controller.getPhase(), casts: controller.getActiveCastCount(),
    particles: controller.getParticleCount(), systems: controller.getSystems().length,
    fields: controller.getCastStates(), center: center.toArray(), paused, walking, time, speed,
    memory: { ...renderer.info.memory },
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
  const materials = new Set<MeshStandardMaterial | MeshBasicMaterial>();
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
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
    if (walking) {
      walkAngle += dt * 0.85;
      caster.position.set(Math.cos(walkAngle) * 2.4, 0.8, Math.sin(walkAngle) * 2.4);
      caster.rotation.y = -walkAngle;
      boundary.position.set(caster.position.x, 0.01, caster.position.z);
    }
    if (looping && sinceCast > 3.1) cast();
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
element("speed").addEventListener("change", () => { speed = Number(element<HTMLSelectElement>("speed").value); }, options);
element("loop").addEventListener("change", () => { looping = element<HTMLInputElement>("loop").checked; }, options);
element("walk").addEventListener("change", () => setWalking(element<HTMLInputElement>("walk").checked), options);
element("boundary").addEventListener("change", () => { boundary.visible = element<HTMLInputElement>("boundary").checked; render(); }, options);
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
  __UAIDZIN_MANA_BURN__: {
    cast, advance, clear, render, dispose, getState, setTarget, setView, setPaused, setWalking,
    setLooping: (value: boolean) => { looping = value; element<HTMLInputElement>("loop").checked = value; },
  },
});
element<HTMLInputElement>("loop").checked = looping;
element("scrub").setAttribute("max", "2800");
element("foot").textContent = `${skill.id} · ancorado no personagem · aprovação visual pendente`;
setPaused(paused);
setView("iso");
resize();
frameId = requestAnimationFrame(tick);
import.meta.hot?.dispose(dispose);

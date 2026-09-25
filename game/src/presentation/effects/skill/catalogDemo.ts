import {
  ACESFilmicToneMapping,
  AmbientLight,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
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
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { FireBurstVfxController } from "../fireBurst/FireBurstVfx";
import { getSkillVfxProfile, SKILL_VFX_CATALOG } from "./SkillVfxCatalog";
import { SkillVfxDirector } from "./SkillVfxRuntime";
import type { SkillVfxProfile, SkillVfxRequest } from "./SkillVfxTypes";

const stage = requireElement<HTMLElement>("stage");
const canvas = requireElement<HTMLCanvasElement>("gl");
const listElement = requireElement<HTMLDivElement>("skill-list");
const filterInput = requireElement<HTMLInputElement>("filter");
const titleElement = requireElement<HTMLElement>("skill-title");
const metaElement = requireElement<HTMLElement>("skill-meta");
const stateElement = requireElement<HTMLElement>("state");
const particleElement = requireElement<HTMLElement>("particles");
const castElement = requireElement<HTMLElement>("casts");
const playButton = requireElement<HTMLButtonElement>("play");
const clearButton = requireElement<HTMLButtonElement>("clear");

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
camera.position.set(0, 5.5, 13.2);
camera.lookAt(0, 1.1, 0);
scene.add(new AmbientLight(0x9da9bb, 0.4));
scene.add(new HemisphereLight(0x9eb7d4, 0x3b2416, 0.58));
const key = new DirectionalLight(0xffe4b0, 2.1);
key.position.set(-4, 8, 5);
scene.add(key);

const ground = new Mesh(
  new PlaneGeometry(24, 15),
  new MeshStandardMaterial({ color: 0x1a1410, roughness: 0.96, metalness: 0.04 }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

function createFigure(color: number, x: number): Group {
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
  group.position.set(x, 0, 0);
  scene.add(group);
  return group;
}

const caster = createFigure(0x365b82, -3.7);
const target = createFigure(0x7d2f2f, 3.7);
const origin = new Vector3(-3.45, 1.05, 0);
const targetPosition = new Vector3(3.7, 0.95, 0);
const fireBurst = new FireBurstVfxController(scene);
const director = new SkillVfxDirector(scene);
const composer = new EffectComposer(renderer);
const bloomPass = new UnrealBloomPass(new Vector2(1600, 900), 0.52, 0.38, 0.84);
const outputPass = new OutputPass();
composer.addPass(new RenderPass(scene, camera));
composer.addPass(bloomPass);
composer.addPass(outputPass);

let selectedId = "tk_fis_fire_burst";
let paused = false;
let disposed = false;
let previousTime = performance.now();

function createCard(profile: SkillVfxProfile): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "skill-card";
  button.dataset.id = profile.id;
  const name = document.createElement("span");
  name.className = "skill-card-name";
  name.textContent = profile.name;
  const meta = document.createElement("span");
  meta.className = "skill-card-meta";
  meta.textContent = `${profile.classId} · ${profile.tree} · ${profile.index + 1}`;
  button.append(name, meta);
  button.addEventListener("click", () => selectProfile(profile.id));
  return button;
}

function renderList(): void {
  const query = filterInput.value.trim().toLowerCase();
  listElement.replaceChildren();
  for (const profile of SKILL_VFX_CATALOG) {
    const searchable = `${profile.name} ${profile.id} ${profile.classId} ${profile.tree} ${profile.family}`.toLowerCase();
    if (query && !searchable.includes(query)) continue;
    const card = createCard(profile);
    if (profile.id === selectedId) card.classList.add("selected");
    listElement.append(card);
  }
}

function selectProfile(id: string): void {
  const profile = getSkillVfxProfile(id);
  if (!profile) return;
  selectedId = id;
  titleElement.textContent = profile.name;
  metaElement.textContent = `${profile.id} · ${profile.family} · ${profile.kind}`;
  renderList();
  playSelected();
}

function playSelected(): void {
  const profile = getSkillVfxProfile(selectedId);
  if (!profile || disposed) return;
  const directional = profile.family !== "buff" && profile.family !== "heal" && profile.family !== "transform" && profile.family !== "summon" && profile.family !== "passive";
  const target = directional ? targetPosition : null;
  const center = profile.shape === "aoe" || !target ? origin : target;
  if (profile.family === "chain") {
    fireBurst.castFireBurst(origin, targetPosition);
  } else {
    const hitCount = Math.min(profile.skill.hits ?? 1, 7);
    const hits = Array.from({ length: hitCount }, (_, hitIndex) => ({
      id: "lab-target",
      x: targetPosition.x,
      z: targetPosition.z,
      damage: 1,
      hitIndex,
    }));
    const request: SkillVfxRequest = {
      profile,
      origin,
      target,
      center,
      colorHex: profile.colorHex,
      facing: 0,
      range: profile.range,
      radius: profile.radius,
      hits,
      hasHeal: profile.kind === "heal",
      hasBuff: profile.kind === "buff",
      hasTransform: profile.kind === "transform",
      hasSummon: profile.kind === "summon",
    };
    director.play(request);
  }
}

function updateHud(): void {
  const active = director.getActiveCastCount() + fireBurst.getActiveCastCount();
  const particles = director.getParticleCount() + fireBurst.getParticleCount();
  const phase = fireBurst.getPhase() !== "idle" ? fireBurst.getPhase() : director.getActiveCastCount() > 0 ? "skill" : "idle";
  stateElement.textContent = phase;
  particleElement.textContent = String(particles);
  castElement.textContent = String(active);
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

function tick(now: number): void {
  if (disposed) return;
  const delta = Math.min((now - previousTime) / 1000, 0.1);
  previousTime = now;
  if (!paused) {
    fireBurst.update(delta, stage.clientWidth, stage.clientHeight);
    director.update(delta, stage.clientWidth, stage.clientHeight);
    caster.position.y = Math.sin(now / 620) * 0.025;
    target.position.y = Math.sin(now / 740 + 1.4) * 0.018;
  }
  updateHud();
  composer.render();
  requestAnimationFrame(tick);
}

function dispose(): void {
  if (disposed) return;
  disposed = true;
  fireBurst.dispose();
  director.dispose();
  const geometries = new WeakSet<object>();
  const materials = new WeakSet<object>();
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (!geometries.has(object.geometry)) {
      object.geometry.dispose();
      geometries.add(object.geometry);
    }
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
      if (materials.has(material)) continue;
      material.dispose();
      materials.add(material);
    }
  });
  bloomPass.dispose();
  outputPass.dispose();
  composer.dispose();
  renderer.dispose();
}

filterInput.addEventListener("input", renderList);
playButton.addEventListener("click", playSelected);
clearButton.addEventListener("click", () => {
  fireBurst.clear();
  director.clear();
});
window.addEventListener("resize", fitStage);
window.addEventListener("pagehide", dispose, { once: true });

const api = {
  count: SKILL_VFX_CATALOG.length,
  profiles: SKILL_VFX_CATALOG.map((profile) => ({
    id: profile.id,
    name: profile.name,
    classId: profile.classId,
    tree: profile.tree,
    family: profile.family,
  })),
  select: selectProfile,
  play: playSelected,
  clear: () => {
    fireBurst.clear();
    director.clear();
  },
  setPaused: (value: boolean) => {
    paused = value;
    previousTime = performance.now();
  },
  advance: (seconds: number) => {
    let remaining = Math.max(0, seconds);
    while (remaining > 0) {
      const step = Math.min(remaining, 0.05);
      fireBurst.update(step, stage.clientWidth, stage.clientHeight);
      director.update(step, stage.clientWidth, stage.clientHeight);
      remaining -= step;
    }
    updateHud();
  },
  getState: () => ({
    phase: stateElement.textContent,
    active: director.getActiveCastCount() + fireBurst.getActiveCastCount(),
    particles: director.getParticleCount() + fireBurst.getParticleCount(),
  }),
  dispose,
};
Object.assign(window, { __UAIDZIN_SKILL_VFX__: api });

fitStage();
selectProfile(selectedId);
requestAnimationFrame(tick);
document.body.dataset.ready = "true";

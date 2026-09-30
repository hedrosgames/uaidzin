import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { polishCharacterMaterial } from "./character-materials.mjs";
import { armorAtlasUrl, normalizeArmorAppearance } from "./armor-appearance.mjs";
import { repairCharacterGeometry } from "./character-geometry.mjs";

const MODEL = {
  TK: "/models/player/TK/TK.glb",
  FM: "/models/player/FM/FM.glb",
  BM: "/models/player/BM/BM.glb",
  HT: "/models/player/HT/HT.glb",
};

const SHARED_IDLE_URL = "/models/player/shared/anims/idle.glb";
let sharedIdlePromise = null;
function loadSharedIdle() {
  if (!sharedIdlePromise) {
    const loader = new GLTFLoader();
    sharedIdlePromise = loader.loadAsync(SHARED_IDLE_URL).catch(() => null);
  }
  return sharedIdlePromise;
}

const TARGET_HEIGHT = 1.72 * 1.1;
const gltfCache = new Map();
const _L = new THREE.Vector3();
const _R = new THREE.Vector3();
const _right = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function harden(model, atlas) {
  model.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = mats.map((src) => {
      if (!src) return src;
      const std = new THREE.MeshStandardMaterial({
        map: src.map ? atlas : null,
        color: src.color ? src.color.clone() : 0xffffff,
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1,
        depthWrite: true,
        metalness: 0,
        roughness: 0.72,
      });
      if (std.map) {
        std.map.colorSpace = THREE.SRGBColorSpace;
        std.map.needsUpdate = true;
      }
      polishCharacterMaterial(std, src.name, src.map);
      src.dispose();
      return std;
    });
    obj.material = next.length === 1 ? next[0] : next;
    if (obj.isSkinnedMesh) obj.frustumCulled = false;
  });
}

function findShoulders(model) {
  let left = null;
  let right = null;
  model.traverse((obj) => {
    if (!obj.isBone) return;
    if (/LeftShoulder/i.test(obj.name)) left = obj;
    if (/RightShoulder/i.test(obj.name)) right = obj;
  });
  return { left, right };
}

function alignPivotToCamera(pivot, model, shoulders) {
  pivot.rotation.y = 0;
  pivot.updateMatrixWorld(true);
  if (!shoulders.left || !shoulders.right) return;
  shoulders.left.getWorldPosition(_L);
  shoulders.right.getWorldPosition(_R);
  _right.subVectors(_R, _L);
  _right.y = 0;
  if (_right.lengthSq() < 1e-6) return;
  _right.normalize();
  _fwd.crossVectors(_up, _right).normalize();
  pivot.rotation.y = -Math.atan2(_fwd.x, _fwd.z);
}

function fitAndFrame(pivot, model, mixer, camera, shoulders) {
  model.scale.setScalar(1);
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  pivot.rotation.set(0, 0, 0);
  pivot.position.set(0, 0, 0);
  pivot.updateMatrixWorld(true);
  if (mixer) for (let i = 0; i < 24; i++) mixer.update(1 / 30);
  alignPivotToCamera(pivot, model, shoulders);
  pivot.updateMatrixWorld(true);

  const box = new THREE.Box3();
  const tip = new THREE.Vector3();
  let found = false;
  model.traverse((obj) => {
    if (!obj.isBone) return;
    obj.getWorldPosition(tip);
    if (!found) {
      box.set(tip.clone(), tip.clone());
      found = true;
    } else box.expandByPoint(tip);
  });
  if (!found) box.setFromObject(pivot);

  const height = Math.max(box.max.y - box.min.y, 0.001);
  const scale = TARGET_HEIGHT / height;
  model.scale.setScalar(scale);
  model.position.y = -box.min.y * scale;
  pivot.updateMatrixWorld(true);
  alignPivotToCamera(pivot, model, shoulders);
  pivot.updateMatrixWorld(true);

  const framed = new THREE.Box3().setFromObject(pivot);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  framed.getSize(size);
  framed.getCenter(center);
  const dist = Math.max(size.y * 2.15, size.x * 2.4, 2.8);
  camera.position.set(center.x, center.y + size.y * 0.05, center.z + dist);
  camera.lookAt(center.x, center.y, center.z);
}

async function loadGltf(classId, appearance = "gold") {
  const key = MODEL[classId] ? classId : "TK";
  const variant = normalizeArmorAppearance(appearance);
  const cacheKey = `${key}:${variant}`;
  if (gltfCache.has(cacheKey)) return gltfCache.get(cacheKey);
  const loader = new GLTFLoader();
  const [gltf, atlas] = await Promise.all([
    loader.loadAsync(MODEL[key]),
    new THREE.TextureLoader().loadAsync(armorAtlasUrl(key, variant)),
  ]);
  atlas.flipY = false;
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.userData.paintedAtlas = true;
  atlas.userData.armorAppearance = variant;
  repairCharacterGeometry(gltf.scene, key);
  harden(gltf.scene, atlas);
  gltfCache.set(cacheKey, gltf);
  return gltf;
}

async function resolveIdleClip(classId, classGltf) {
  if (classId === "TK") {
    const donor = await loadSharedIdle();
    if (donor?.animations?.[0]) return donor.animations[0];
  }
  return classGltf.animations[0] || null;
}

let sharedRenderer = null;
let sharedCanvas = null;
const mountedCards = new Set();
let rafId = 0;
const clock = new THREE.Clock();

function getSharedRenderer() {
  if (!sharedRenderer) {
    sharedCanvas = document.createElement("canvas");
    sharedRenderer = new THREE.WebGLRenderer({
      canvas: sharedCanvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    sharedRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    sharedRenderer.setClearColor(0x000000, 0);
    sharedRenderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  return sharedRenderer;
}

function isCardVisible(card) {
  if (!card.alive || !card.container || !card.container.isConnected) return false;
  return card.container.offsetParent !== null && card.container.clientWidth > 0 && card.container.clientHeight > 0;
}

function tick() {
  if (document.hidden || mountedCards.size === 0) {
    rafId = 0;
    return;
  }
  const dt = clock.getDelta();
  const renderer = getSharedRenderer();

  for (const card of mountedCards) {
    if (!isCardVisible(card)) continue;
    if (card.mixer) card.mixer.update(dt);
    if (card.pivot && card.model) alignPivotToCamera(card.pivot, card.model, card.shoulders);

    const w = Math.max(card.container.clientWidth || 180, 120);
    const h = Math.max(card.container.clientHeight || 280, 180);
    if (card.canvas.width !== w || card.canvas.height !== h) {
      card.canvas.width = w;
      card.canvas.height = h;
      card.camera.aspect = w / h;
      card.camera.updateProjectionMatrix();
    }

    if (sharedCanvas.width !== w || sharedCanvas.height !== h) {
      renderer.setSize(w, h, false);
      renderer.setViewport(0, 0, w, h);
    }
    renderer.render(card.scene, card.camera);

    const ctx = card.ctx;
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(sharedCanvas, 0, 0);
    }
  }

  rafId = requestAnimationFrame(tick);
}

function startLoop() {
  if (rafId === 0 && !document.hidden && mountedCards.size > 0) {
    clock.getDelta();
    rafId = requestAnimationFrame(tick);
  }
}

function stopLoop() {
  if (rafId !== 0) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopLoop();
    } else {
      startLoop();
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    teardownCharPreviews();
  });
}

export function teardownCharPreviews() {
  stopLoop();
  for (const card of mountedCards) {
    card.alive = false;
    if (card.mixer) {
      card.mixer.stopAllAction();
      card.mixer.uncacheRoot(card.model);
    }
    if (card.container) card.container.innerHTML = "";
  }
  mountedCards.clear();
  if (sharedRenderer) {
    sharedRenderer.dispose();
    sharedRenderer.forceContextLoss();
    sharedRenderer = null;
    sharedCanvas = null;
  }
}

export function mountCharPreview(container, classId, appearance = "gold") {
  const canvas = document.createElement("canvas");
  canvas.className = "char-3d";
  container.innerHTML = "";
  container.appendChild(canvas);

  const w = Math.max(container.clientWidth || 180, 120);
  const h = Math.max(container.clientHeight || 280, 180);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, w / h, 0.05, 50);

  scene.add(new THREE.AmbientLight(0xfff0e5, 0.85));
  const key = new THREE.DirectionalLight(0xffe3bd, 3.2);
  key.position.set(-3.2, 4.8, 4.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xabb6ff, 0.8);
  fill.position.set(2.8, 2.2, 1.5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffc878, 0.85);
  rim.position.set(0.5, 2.0, -3.0);
  scene.add(rim);

  const card = {
    alive: true,
    container,
    canvas,
    ctx,
    scene,
    camera,
    mixer: null,
    pivot: null,
    model: null,
    shoulders: { left: null, right: null },
  };

  mountedCards.add(card);
  startLoop();

  loadGltf(classId, appearance)
    .then(async (gltf) => {
      if (!card.alive) return;
      const clip = await resolveIdleClip(classId, gltf);
      if (!card.alive) return;
      card.pivot = new THREE.Group();
      card.model = cloneSkinned(gltf.scene);
      card.shoulders = findShoulders(card.model);
      card.pivot.add(card.model);
      scene.add(card.pivot);
      card.mixer = new THREE.AnimationMixer(card.model);
      if (clip) card.mixer.clipAction(clip).play();
      fitAndFrame(card.pivot, card.model, card.mixer, camera, card.shoulders);
      if (clip) {
        card.mixer.stopAllAction();
        card.mixer.clipAction(clip).reset().play();
      }
    })
    .catch(() => {});

  return () => {
    card.alive = false;
    mountedCards.delete(card);
    if (card.mixer) {
      card.mixer.stopAllAction();
      card.mixer.uncacheRoot(card.model);
    }
    container.innerHTML = "";
    if (mountedCards.size === 0) {
      stopLoop();
      if (sharedRenderer) {
        sharedRenderer.dispose();
        sharedRenderer.forceContextLoss();
        sharedRenderer = null;
        sharedCanvas = null;
      }
    }
  };
}

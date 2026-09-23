import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

const MODEL = {
  TK: "/models/player/TK/TK.glb",
  FM: "/models/player/FM/FM.glb",
  BM: "/models/player/BM/BM.glb",
  HT: "/models/player/HT/HT.glb",
};

const TARGET_HEIGHT = 1.72 * 1.1;
const gltfCache = new Map();
const _L = new THREE.Vector3();
const _R = new THREE.Vector3();
const _right = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function harden(model) {
  model.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = mats.map((src) => {
      if (!src) return src;
      const std = new THREE.MeshStandardMaterial({
        map: src.map || null,
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

async function loadGltf(classId) {
  const key = MODEL[classId] ? classId : "TK";
  if (gltfCache.has(key)) return gltfCache.get(key);
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(MODEL[key]);
  harden(gltf.scene);
  gltfCache.set(key, gltf);
  return gltf;
}

export function mountCharPreview(container, classId) {
  const canvas = document.createElement("canvas");
  canvas.className = "char-3d";
  container.innerHTML = "";
  container.appendChild(canvas);

  const w = Math.max(container.clientWidth || 180, 120);
  const h = Math.max(container.clientHeight || 280, 180);
  canvas.width = w;
  canvas.height = h;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, w / h, 0.05, 50);

  scene.add(new THREE.AmbientLight(0xfff0d8, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(1.4, 3.8, 4.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb8d8ff, 1.0);
  fill.position.set(-2.8, 2.2, 1.5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffc878, 0.85);
  rim.position.set(0.5, 2.0, -3.0);
  scene.add(rim);

  let mixer = null;
  let alive = true;
  let raf = 0;
  let pivot = null;
  let model = null;
  let shoulders = { left: null, right: null };
  const clock = new THREE.Clock();

  loadGltf(classId)
    .then((gltf) => {
      if (!alive) return;
      pivot = new THREE.Group();
      model = cloneSkinned(gltf.scene);
      shoulders = findShoulders(model);
      pivot.add(model);
      scene.add(pivot);
      mixer = new THREE.AnimationMixer(model);
      const clip = gltf.animations[0];
      if (clip) mixer.clipAction(clip).play();
      fitAndFrame(pivot, model, mixer, camera, shoulders);
      if (clip) {
        mixer.stopAllAction();
        mixer.clipAction(clip).reset().play();
      }
    })
    .catch(() => {});

  function tick() {
    if (!alive) return;
    const dt = clock.getDelta();
    if (mixer) mixer.update(dt);
    if (pivot && model) alignPivotToCamera(pivot, model, shoulders);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    renderer.dispose();
    container.innerHTML = "";
  };
}

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MODEL = {
  TK: "/models/player/TK/TK.glb",
  FM: "/models/player/FM/FM.glb",
  BM: "/models/player/BM/BM.glb",
  HT: "/models/player/HT/HT.glb",
};

const TARGET_HEIGHT = 1.72 * 1.1;
const gltfCache = new Map();

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
        roughness: 0.75,
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

function fitHeight(model, mixer) {
  model.scale.setScalar(1);
  model.position.set(0, 0, 0);
  model.updateMatrixWorld(true);
  if (mixer) for (let i = 0; i < 20; i++) mixer.update(1 / 30);
  model.updateMatrixWorld(true);
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
  if (!found) box.setFromObject(model);
  const height = Math.max(box.max.y - box.min.y, 0.001);
  const scale = TARGET_HEIGHT / height;
  model.scale.setScalar(scale);
  model.position.y = -box.min.y * scale;
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

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, w / h, 0.1, 40);
  camera.position.set(0, 1.05, 4.2);
  camera.lookAt(0, 0.95, 0);

  scene.add(new THREE.AmbientLight(0xffe6c0, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(2.2, 4.5, 3.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
  fill.position.set(-3, 2, -2);
  scene.add(fill);

  let mixer = null;
  let alive = true;
  let raf = 0;
  const clock = new THREE.Clock();

  loadGltf(classId)
    .then((gltf) => {
      if (!alive) return;
      const model = gltf.scene.clone(true);
      model.rotation.y = Math.PI;
      scene.add(model);
      mixer = new THREE.AnimationMixer(model);
      const clip = gltf.animations[0];
      if (clip) {
        const action = mixer.clipAction(clip);
        action.play();
        for (let i = 0; i < 20; i++) mixer.update(1 / 30);
      }
      fitHeight(model, mixer);
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

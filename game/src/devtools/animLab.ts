import {
  AmbientLight,
  AnimationAction,
  AnimationMixer,
  BoxGeometry,
  Color,
  DirectionalLight,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { registerThreeDevTools } from "../integrations/threejs-devtools/registerThreeDevTools";

const canvasEl = document.getElementById("lab-canvas");
if (!(canvasEl instanceof HTMLCanvasElement)) throw new Error("lab-canvas");
const canvas = canvasEl;

const scene = new Scene();
scene.name = "AnimLab_Scene";
scene.background = new Color(0x1a1518);

const camera = new PerspectiveCamera(45, 1, 0.1, 100);
camera.name = "AnimLab_Camera";
camera.position.set(2.2, 1.6, 3.4);
camera.lookAt(0, 0.9, 0);

const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const hemi = new AmbientLight(0xc8b090, 0.45);
hemi.name = "AnimLab_Ambient";
scene.add(hemi);

const key = new DirectionalLight(0xffdcb0, 1.4);
key.name = "AnimLab_KeyLight";
key.position.set(3, 6, 2);
scene.add(key);

const prop = new Mesh(
  new BoxGeometry(0.5, 0.5, 0.5),
  new MeshStandardMaterial({ color: 0xa33b3b, roughness: 0.8 }),
);
prop.name = "AnimLab_Prop";
prop.position.set(-1.2, 0.25, 0.6);
scene.add(prop);

let mixer: AnimationMixer | null = null;
let runAction: AnimationAction | null = null;
let idleAction: AnimationAction | null = null;

registerThreeDevTools({
  scene,
  renderer,
  getCamera: () => camera,
  getMixers: () => (mixer ? [mixer] : []),
});

function resize(): void {
  const w = Math.max(canvas.clientWidth, 1);
  const h = Math.max(canvas.clientHeight, 1);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

async function boot(): Promise<void> {
  const loader = new GLTFLoader();
  const [body, runGltf] = await Promise.all([
    loader.loadAsync("/models/player/TK/TK.glb"),
    loader.loadAsync("/models/anims/human/run.glb"),
  ]);

  const avatar = body.scene;
  avatar.name = "AnimLab_Player";
  scene.add(avatar);

  mixer = new AnimationMixer(avatar);
  const idleClip = body.animations[0];
  if (idleClip) {
    idleClip.name = "idle";
    idleAction = mixer.clipAction(idleClip);
    idleAction.setLoop(LoopRepeat, Infinity);
    idleAction.play();
  }

  const runClip = runGltf.animations[0];
  if (runClip && mixer) {
    runClip.name = "run";
    runAction = mixer.clipAction(runClip);
    runAction.setLoop(LoopRepeat, Infinity);
    avatar.animations = idleClip ? [idleClip, runClip] : [runClip];
  }

  const w = window as Window & { __ANIM_LAB__?: Record<string, unknown> };
  w.__ANIM_LAB__ = {
    playRun: () => {
      if (!runAction || !idleAction) return false;
      runAction.reset().setEffectiveWeight(1).fadeIn(0.35).play();
      idleAction.fadeOut(0.35);
      return true;
    },
    playIdle: () => {
      if (!runAction || !idleAction) return false;
      idleAction.reset().setEffectiveWeight(1).fadeIn(0.35).play();
      runAction.fadeOut(0.35);
      return true;
    },
    setRunSpeed: (scale: number) => {
      if (!runAction) return false;
      runAction.setEffectiveTimeScale(scale);
      return true;
    },
  };

  resize();
  window.addEventListener("resize", resize);

  let last = performance.now();
  const tick = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    mixer?.update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

void boot();

import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import type { AnimationMixer, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import type { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";

export type ThreeDevToolsHost = {
  scene: Scene;
  renderer: WebGLRenderer;
  getCamera: () => PerspectiveCamera;
  getMixers: () => AnimationMixer[];
  composer?: EffectComposer;
};

type DevWindow = Window &
  typeof globalThis & {
    THREE?: typeof THREE;
    GLTFExporter?: typeof GLTFExporter;
    __THREE_SCENE__?: Scene;
    __THREE_RENDERER__?: WebGLRenderer;
    __THREE_CAMERA__?: PerspectiveCamera;
    __THREE_ANIMATION_MIXERS__?: AnimationMixer[];
    __UAIDZIN_THREE_DEVTOOLS_STOP__?: () => void;
  };

export function registerThreeDevTools(host: ThreeDevToolsHost): () => void {
  if (!import.meta.env.DEV) return () => {};

  const w = window as DevWindow;
  w.__UAIDZIN_THREE_DEVTOOLS_STOP__?.();

  w.THREE = THREE;
  w.GLTFExporter = GLTFExporter;
  w.__THREE_SCENE__ = host.scene;
  w.__THREE_RENDERER__ = host.renderer;

  const rendererData = host.renderer as WebGLRenderer & {
    userData?: Record<string, unknown>;
  };
  if (host.composer) {
    rendererData.userData ??= {};
    rendererData.userData.effectComposer = host.composer;
  }

  let alive = true;
  const sync = (): void => {
    if (!alive) return;
    w.__THREE_CAMERA__ = host.getCamera();
    w.__THREE_ANIMATION_MIXERS__ = host.getMixers().filter(Boolean);
  };

  const frame = (): void => {
    if (!alive) return;
    sync();
    requestAnimationFrame(frame);
  };
  sync();
  requestAnimationFrame(frame);

  const stop = (): void => {
    if (!alive) return;
    alive = false;
    delete w.__THREE_SCENE__;
    delete w.__THREE_RENDERER__;
    delete w.__THREE_CAMERA__;
    delete w.__THREE_ANIMATION_MIXERS__;
    delete w.THREE;
    delete w.GLTFExporter;
    if (host.composer && rendererData.userData) delete rendererData.userData.effectComposer;
    if (w.__UAIDZIN_THREE_DEVTOOLS_STOP__ === stop) delete w.__UAIDZIN_THREE_DEVTOOLS_STOP__;
  };

  w.__UAIDZIN_THREE_DEVTOOLS_STOP__ = stop;
  return stop;
}

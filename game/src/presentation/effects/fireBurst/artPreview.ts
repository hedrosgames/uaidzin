import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import spritesheetUrl from '../../../../../visual/fire-burst-art/fire-burst-spritesheet.png?url';
import animationJson from '../../../../../visual/fire-burst-art/fire-burst-animation.json?raw';

interface AnimationSheet {
  width: number;
  height: number;
  columns: number;
  rows: number;
  count: number;
  fps: number;
  duration: number;
  sheetSize: [number, number];
}

interface PreviewState {
  ready: boolean;
  time: number;
  frame: number;
  playing: boolean;
  speed: number;
  phase: string;
  duration: number;
  mode: 'approved-art';
  disposed: boolean;
  error: string | null;
  rendererMemory: {
    geometries: number;
    textures: number;
    programs: number;
  };
  renderCalls: number;
}

interface FireBurst3DPreview {
  seek: (time: number) => void;
  play: () => void;
  pause: () => void;
  cast: () => void;
  resetCamera: () => void;
  getState: () => PreviewState;
  dispose: () => void;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

declare global {
  interface Window {
    __FIRE_BURST_3D__?: FireBurst3DPreview;
  }
}

const sheet = JSON.parse(animationJson) as AnimationSheet;
const stageWidth = 1600;
const stageHeight = 900;
const planeWidth = 12;
const planeHeight = 6.75;
const samplePadding = 0.5;
const numberFormat = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Elemento ausente: ${id}`);
  return node as T;
}

function phaseAt(time: number): string {
  if (time < 0.19) return 'Preparação';
  if (time < 0.7) return 'Projeção';
  if (time < 1.053) return 'Impacto';
  if (time < 1.58) return 'Combustão';
  if (time < 2.24) return 'Dissipação';
  return 'Repouso';
}

function frameAt(time: number): number {
  return Math.min(sheet.count - 1, Math.max(0, Math.floor(time * sheet.fps)));
}

function setTextureFrame(texture: THREE.Texture, frame: number): void {
  const column = frame % sheet.columns;
  const row = Math.floor(frame / sheet.columns);
  texture.offset.set(
    (column * sheet.width + samplePadding) / sheet.sheetSize[0],
    1 - ((row + 1) * sheet.height - samplePadding) / sheet.sheetSize[1],
  );
}

function createStudyScene(scene: THREE.Scene): void {
  scene.background = new THREE.Color('#100c08');
  scene.fog = new THREE.FogExp2('#100c08', 0.025);
  scene.add(new THREE.HemisphereLight(0xffecd4, 0x332519, 1.65));

  const key = new THREE.DirectionalLight(0xffe0b3, 2.5);
  key.position.set(-8, 14, 9);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xe8e2d7, 0.7);
  fill.position.set(8, 8, -5);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(60, 128),
    new THREE.MeshStandardMaterial({
      color: 0x30291f,
      roughness: 0.94,
      metalness: 0.12,
    }),
  );
  floor.name = 'Chão';
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new THREE.GridHelper(56, 56, 0x776044, 0x66533c);
  grid.name = 'Grade';
  grid.position.y = 0.012;
  grid.material.transparent = true;
  grid.material.opacity = 0.18;
  grid.material.depthWrite = false;
  scene.add(grid);

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xa28552,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });

  for (const radius of [7.5, 7.62]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius, radius + 0.018, 128),
      ringMaterial,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.016;
    scene.add(ring);
  }

  const origin = createMarker('Origem', 0xb3934a, 0.36);
  origin.position.x = -4.32;
  scene.add(origin);

  const target = createMarker('Alvo', 0x9b5140, 0.48);
  target.position.x = 4.2;
  scene.add(target);
}

function createMarker(name: string, color: number, radius: number): THREE.Group {
  const group = new THREE.Group();
  group.name = name;

  const metal = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.65,
  });
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius + 0.1, 0.12, 40),
    metal,
  );
  base.position.y = 0.06;
  group.add(base);

  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.085, 0.42, 12),
    metal,
  );
  pin.position.y = 0.3;
  group.add(pin);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius + 0.22, radius + 0.245, 64),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  group.add(ring);
  return group;
}

function disposeScene(scene: THREE.Scene): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
    geometries.add(object.geometry);
    const entries = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of entries) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  scene.clear();
}

function createPreview(): FireBurst3DPreview {
  const viewport = element('viewport');
  const stage = element('stage');
  const container = element('scene');
  const status = element('status');
  const playButton = element<HTMLButtonElement>('play');
  const castButton = element<HTMLButtonElement>('cast');
  const resetButton = element<HTMLButtonElement>('reset-camera');
  const speedSelect = element<HTMLSelectElement>('speed');
  const timeline = element<HTMLInputElement>('timeline');
  const timeOutput = element<HTMLOutputElement>('time');
  const frameOutput = element('frame');
  const phaseOutput = element('phase');
  const listeners = new AbortController();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, stageWidth / stageHeight, 0.1, 160);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-label', 'Fire Burst sobre o chão de estudo');
  renderer.domElement.setAttribute('role', 'img');
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 15;
  controls.maxDistance = 34;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = Math.PI / 2 - 0.09;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.8;

  let ready = false;
  let disposed = false;
  let error: string | null = null;
  let time = 0;
  let speed = 1;
  let playing = new URLSearchParams(window.location.search).get('qa') !== '1';
  let previousTimestamp = performance.now();
  let animationRequest = 0;
  let displayedFrame = -1;

  createStudyScene(scene);

  const effectMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    blending: THREE.NormalBlending,
    premultipliedAlpha: false,
    toneMapped: false,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
  const effect = new THREE.Mesh(
    new THREE.PlaneGeometry(planeWidth, planeHeight),
    effectMaterial,
  );
  effect.name = 'Fire Burst · Arte aprovada';
  effect.position.set(0, 3.65, 0);
  effect.visible = false;
  scene.add(effect);

  function writeText(node: HTMLElement, text: string): void {
    if (node.textContent !== text) node.textContent = text;
  }

  function updateInterface(): void {
    const active = ready && playing && !disposed;
    const disabled = !ready || disposed;
    playButton.disabled = disabled;
    castButton.disabled = disabled;
    speedSelect.disabled = disabled;
    timeline.disabled = disabled;
    resetButton.disabled = disposed;
    writeText(playButton, active ? 'Pausar' : 'Reproduzir');
    playButton.setAttribute('aria-pressed', String(active));
    writeText(phaseOutput, phaseAt(time));
    writeText(frameOutput, `Quadro ${String(frameAt(time) + 1).padStart(2, '0')} / ${sheet.count}`);
    writeText(timeOutput, `${numberFormat.format(time)} / ${numberFormat.format(sheet.duration)} s`);
    timeline.value = String(time);
    timeline.setAttribute('aria-valuetext', `${numberFormat.format(time)} segundos, ${phaseAt(time)}`);
    status.dataset.state = error ? 'error' : 'normal';
    writeText(
      status,
      disposed ? 'Prévia encerrada' : error ?? (
        ready ? (active ? 'Reproduzindo' : 'Pausado') : 'Carregando arte…'
      ),
    );
  }

  function render(): void {
    if (disposed) return;
    const frame = frameAt(time);
    if (ready && frame !== displayedFrame) {
      setTextureFrame(texture, frame);
      displayedFrame = frame;
    }
    effect.quaternion.copy(camera.quaternion);
    renderer.render(scene, camera);
    updateInterface();
  }

  function fail(message: string): void {
    if (disposed) return;
    ready = false;
    playing = false;
    error = message;
    effect.visible = false;
    updateInterface();
  }

  const texture = new THREE.TextureLoader().load(
    spritesheetUrl,
    (loaded) => {
      if (disposed) {
        loaded.image = null;
        return;
      }
      const image = loaded.image as HTMLImageElement;
      if (image.width !== sheet.sheetSize[0] || image.height !== sheet.sheetSize[1]) {
        fail('Dimensões da arte inválidas.');
        return;
      }
      if (renderer.capabilities.maxTextureSize < Math.max(...sheet.sheetSize)) {
        fail('Arte não suportada neste dispositivo.');
        return;
      }
      ready = true;
      effect.visible = true;
      previousTimestamp = performance.now();
      render();
    },
    undefined,
    () => fail('Não foi possível carregar a arte.'),
  );
  texture.name = 'Fire Burst · 65 quadros';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.premultiplyAlpha = false;
  texture.flipY = true;
  texture.repeat.set(
    (sheet.width - 2 * samplePadding) / sheet.sheetSize[0],
    (sheet.height - 2 * samplePadding) / sheet.sheetSize[1],
  );
  setTextureFrame(texture, 0);
  effectMaterial.map = texture;

  function resize(): void {
    if (disposed) return;
    const scale = Math.min(viewport.clientWidth / stageWidth, viewport.clientHeight / stageHeight);
    stage.style.setProperty('--stage-scale', String(scale));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(
      Math.max(1, Math.round(stageWidth * scale)),
      Math.max(1, Math.round(stageHeight * scale)),
      false,
    );
    render();
  }

  function resetCamera(): void {
    if (disposed) return;
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    camera.position.set(7.8, 10.2, 23);
    controls.target.set(0, 2.75, 0);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
    controls.enableDamping = damping;
    render();
  }

  function seek(seconds: number): void {
    if (disposed) return;
    if (!Number.isFinite(seconds)) throw new TypeError('O tempo deve ser um número finito.');
    playing = false;
    time = THREE.MathUtils.clamp(seconds, 0, sheet.duration);
    previousTimestamp = performance.now();
    render();
  }

  function play(): void {
    if (disposed || error) return;
    if (time >= sheet.duration) time = 0;
    playing = true;
    previousTimestamp = performance.now();
    render();
  }

  function pause(): void {
    if (disposed) return;
    playing = false;
    previousTimestamp = performance.now();
    render();
  }

  function cast(): void {
    if (disposed || error) return;
    time = 0;
    play();
  }

  function tick(timestamp: number): void {
    if (disposed) return;
    const delta = Math.max(0, (timestamp - previousTimestamp) / 1000);
    previousTimestamp = timestamp;
    if (ready && playing && !document.hidden) {
      time = (time + delta * speed) % sheet.duration;
    }
    controls.update();
    render();
    animationRequest = requestAnimationFrame(tick);
  }

  function getState(): PreviewState {
    return {
      ready,
      time,
      frame: frameAt(time),
      playing: ready && playing && !disposed,
      speed,
      phase: phaseAt(time),
      duration: sheet.duration,
      mode: 'approved-art',
      disposed,
      error,
      rendererMemory: {
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
      },
      renderCalls: renderer.info.render.calls,
    };
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    ready = false;
    playing = false;
    cancelAnimationFrame(animationRequest);
    listeners.abort();
    controls.dispose();
    disposeScene(scene);
    texture.dispose();
    texture.image = null;
    effectMaterial.map = null;
    renderer.renderLists.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    updateInterface();
  }

  const eventOptions = { signal: listeners.signal };
  playButton.addEventListener('click', () => playing ? pause() : play(), eventOptions);
  castButton.addEventListener('click', cast, eventOptions);
  resetButton.addEventListener('click', resetCamera, eventOptions);
  timeline.addEventListener('input', () => seek(Number(timeline.value)), eventOptions);
  speedSelect.addEventListener('change', () => {
    const value = Number(speedSelect.value);
    if ([0.25, 0.5, 1, 1.5, 2].includes(value)) {
      speed = value;
      previousTimestamp = performance.now();
      render();
    }
  }, eventOptions);
  window.addEventListener('resize', resize, eventOptions);
  window.addEventListener('pagehide', dispose, eventOptions);
  document.addEventListener('visibilitychange', () => {
    previousTimestamp = performance.now();
  }, eventOptions);
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    fail('A conexão com a prévia 3D foi perdida.');
  }, eventOptions);
  timeline.max = String(sheet.duration);
  resetCamera();
  resize();
  animationRequest = requestAnimationFrame(tick);

  return { seek, play, pause, cast, resetCamera, getState, dispose, scene, camera, renderer };
}

try {
  window.__FIRE_BURST_3D__ = createPreview();
} catch {
  const status = element('status');
  status.dataset.state = 'error';
  status.textContent = 'Não foi possível iniciar a prévia 3D.';
}

import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  DoubleSide,
  Color,
  DodecahedronGeometry,
  Group,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Quaternion,
  RingGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createMuralhaCrumbleDust,
  createMuralhaGoldSparks,
  createMuralhaJointDust,
  createMuralhaParticleMaterials,
  createMuralhaRingDust,
  disposeMuralhaParticleMaterials,
  type MuralhaParticleMaterials,
} from "./MuralhaParticleSystems";
import {
  createMuralhaTextures,
  disposeMuralhaTextures,
  type MuralhaTextureSet,
} from "./MuralhaTextures";
import type { TkLightPool } from "../../TkLightPool";

export interface MuralhaVfxConfig {
  materializeDuration: number;
  persistDuration: number;
  crumbleDuration: number;
  maxConcurrentCasts: number;
  wallWidth: number;
  wallHeight: number;
  wallDepth: number;
  cols: number;
  rows: number;
  pebbleCount: number;
  jointDustRate: number;
  ringDustRate: number;
  crumbleDustBurst: number;
  crumbleDustRate: number;
  originHeight: number;
}

export const DEFAULT_MURALHA_VFX_CONFIG: MuralhaVfxConfig = {
  materializeDuration: 0.7,
  persistDuration: 1.0,
  crumbleDuration: 0.85,
  maxConcurrentCasts: 3,
  wallWidth: 3.2,
  wallHeight: 2.2,
  wallDepth: 0.42,
  cols: 7,
  rows: 4,
  pebbleCount: 18,
  jointDustRate: 42,
  ringDustRate: 56,
  crumbleDustBurst: 44,
  crumbleDustRate: 34,
  originHeight: 0,
};

type MuralhaPhase = "materialize" | "persist" | "crumble";

interface BlockLayout {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  delay: number;
  rotY: number;
  tint: number;
}

interface PebbleState {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotZ: number;
  spinX: number;
  spinZ: number;
  scale: number;
}

interface MuralhaSharedResources {
  textures: MuralhaTextureSet;
  particleMaterials: MuralhaParticleMaterials;
  blockGeometry: BufferGeometry;
  pebbleGeometry: DodecahedronGeometry;
  blockMaterial: MeshStandardMaterial;
  pebbleMaterial: MeshStandardMaterial;
  rimMaterial: MeshBasicMaterial;
  shockGeometry: RingGeometry;
  shockMaterial: MeshBasicMaterial;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function createBlockGeometry(): BufferGeometry {
  const geometry = new BoxGeometry(1, 1, 1).toNonIndexed();
  const positions = geometry.getAttribute("position") as BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  const random = mulberry32(5153);
  for (let face = 0; face < positions.count / 3; face += 1) {
    const brightness = 0.62 + random() * 0.52;
    const warm = random() * 0.08;
    for (let corner = 0; corner < 3; corner += 1) {
      const index = face * 3 + corner;
      colors[index * 3] = brightness + warm;
      colors[index * 3 + 1] = brightness * 0.97;
      colors[index * 3 + 2] = brightness * 0.86;
    }
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return geometry;
}

function createBlockLayout(config: MuralhaVfxConfig): BlockLayout[] {
  const random = mulberry32(9001);
  const layout: BlockLayout[] = [];
  const cellWidth = config.wallWidth / config.cols;
  const cellHeight = config.wallHeight / config.rows;
  for (let row = 0; row < config.rows; row += 1) {
    const rowOffset = (row % 2) * cellWidth * 0.5;
    for (let col = 0; col < config.cols; col += 1) {
      layout.push({
        x: -config.wallWidth / 2 + cellWidth * (col + 0.5) + rowOffset + (random() - 0.5) * 0.05,
        y: cellHeight * (row + 0.5),
        z: (random() - 0.5) * config.wallDepth * 0.35,
        sx: cellWidth * (0.88 + random() * 0.2),
        sy: cellHeight * (0.86 + random() * 0.22),
        sz: config.wallDepth * (0.85 + random() * 0.3),
        delay: row * 0.09 + random() * 0.06,
        rotY: (random() - 0.5) * 0.14,
        tint: 0.78 + random() * 0.34,
      });
    }
  }
  return layout;
}

function createSharedResources(): MuralhaSharedResources {
  const textures = createMuralhaTextures();
  const particleMaterials = createMuralhaParticleMaterials(textures);
  const blockMaterial = new MeshStandardMaterial({
    map: textures.stone,
    vertexColors: true,
    flatShading: true,
    roughness: 0.9,
    metalness: 0.2,
    transparent: true,
    opacity: 0,
    depthWrite: true,
  });
  const pebbleMaterial = new MeshStandardMaterial({
    map: textures.stone,
    color: 0x8a7a5e,
    flatShading: true,
    roughness: 0.94,
    metalness: 0.12,
  });
  const rimMaterial = new MeshBasicMaterial({
    color: 0xd4a017,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const shockGeometry = new RingGeometry(0.86, 1.06, 48);
  shockGeometry.rotateX(-Math.PI / 2);
  const shockMaterial = new MeshBasicMaterial({
    color: 0xd4a017,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  return {
    textures,
    particleMaterials,
    blockGeometry: createBlockGeometry(),
    pebbleGeometry: new DodecahedronGeometry(0.055, 0),
    blockMaterial,
    pebbleMaterial,
    rimMaterial,
    shockGeometry,
    shockMaterial,
  };
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x)
    && Number.isFinite(vector.y)
    && Number.isFinite(vector.z);
}

const EASE_OUT_CUBIC = (t: number) => 1 - Math.pow(1 - t, 3);
const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Y = new Vector3(0, 1, 0);
const AXIS_Z = new Vector3(0, 0, 1);

class MuralhaCast {
  private readonly castGroup: Group;
  private readonly wallGroup: Group;
  private readonly wallMesh: InstancedMesh<BufferGeometry, MeshStandardMaterial>;
  private readonly pebbleMesh: InstancedMesh<DodecahedronGeometry, MeshStandardMaterial>;
  private readonly rimTop: Mesh<BoxGeometry, MeshBasicMaterial>;
  private readonly rimLeft: Mesh<BoxGeometry, MeshBasicMaterial>;
  private readonly rimRight: Mesh<BoxGeometry, MeshBasicMaterial>;
  private readonly shockRing: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private readonly jointDust: ParticleSystem;
  private readonly ringDust: ParticleSystem;
  private readonly crumbleDust: ParticleSystem;
  private readonly goldSparks: ParticleSystem;
  private readonly systems: ParticleSystem[];
  private readonly layout: BlockLayout[];
  private readonly pebbles: PebbleState[] = [];
  private readonly matrix = new Matrix4();
  private readonly quaternion = new Quaternion();
  private readonly euler = new Quaternion();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly tempQuat = new Quaternion();
  private readonly direction: Vector3;
  private readonly blockCount: number;
  private phase: MuralhaPhase = "materialize";
  private materializeElapsed = 0;
  private persistElapsed = 0;
  private crumbleElapsed = 0;
  private pebblesSpawned = false;
  private crumbleSpawned = false;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: MuralhaSharedResources,
    private readonly config: MuralhaVfxConfig,
    position: Vector3,
    direction: Vector3,
    private readonly onDispose: (cast: MuralhaCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.direction = direction.clone();
    this.layout = createBlockLayout(config);
    this.blockCount = this.layout.length;

    this.castGroup = new Group();
    this.castGroup.name = "tk-muralha-cast";
    this.castGroup.position.copy(position);
    this.castGroup.rotation.y = Math.atan2(direction.x, direction.z);

    this.wallGroup = new Group();
    this.wallGroup.name = "tk-muralha-wall-group";

    this.wallMesh = new InstancedMesh(
      shared.blockGeometry,
      shared.blockMaterial.clone(),
      this.blockCount,
    );
    this.wallMesh.name = "tk-muralha-wall";
    this.wallMesh.renderOrder = 3;
    const tint = new Color();
    for (let index = 0; index < this.blockCount; index += 1) {
      const block = this.layout[index];
      tint.setRGB(block.tint, block.tint * 0.96, block.tint * 0.84);
      this.wallMesh.setColorAt(index, tint);
    }
    if (this.wallMesh.instanceColor) this.wallMesh.instanceColor.needsUpdate = true;

    this.pebbleMesh = new InstancedMesh(
      shared.pebbleGeometry,
      shared.pebbleMaterial.clone(),
      config.pebbleCount,
    );
    this.pebbleMesh.name = "tk-muralha-pebbles";
    this.pebbleMesh.renderOrder = 4;
    for (let index = 0; index < config.pebbleCount; index += 1) {
      this.pebbles.push({
        active: false,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rotX: 0,
        rotZ: 0,
        spinX: 0,
        spinZ: 0,
        scale: 0.7 + (index % 5) * 0.14,
      });
      this.matrix.makeScale(0, 0, 0);
      this.pebbleMesh.setMatrixAt(index, this.matrix);
    }

    const rimMaterial = shared.rimMaterial.clone();
    this.rimTop = new Mesh(
      new BoxGeometry(config.wallWidth + 0.1, 0.045, 0.075),
      rimMaterial,
    );
    this.rimTop.name = "tk-muralha-rim-top";
    this.rimTop.renderOrder = 6;
    this.rimLeft = new Mesh(
      new BoxGeometry(0.045, config.wallHeight, 0.075),
      rimMaterial.clone(),
    );
    this.rimLeft.name = "tk-muralha-rim-side";
    this.rimLeft.renderOrder = 6;
    this.rimRight = new Mesh(
      new BoxGeometry(0.045, config.wallHeight, 0.075),
      rimMaterial.clone(),
    );
    this.rimRight.name = "tk-muralha-rim-side";
    this.rimRight.renderOrder = 6;
    this.rimLeft.position.set(-config.wallWidth / 2 - 0.03, config.wallHeight / 2, 0);
    this.rimRight.position.set(config.wallWidth / 2 + 0.03, config.wallHeight / 2, 0);

    this.shockRing = new Mesh(shared.shockGeometry, shared.shockMaterial.clone());
    this.shockRing.name = "tk-muralha-shockring";
    this.shockRing.renderOrder = 5;
    this.shockRing.position.y = 0.02;

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xd4a017, 9);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xd4a017, 0, 9, 2);
      this.isPooledLight = false;
    }
    if (this.light) {
      this.light.position.set(0, config.wallHeight * 0.6, config.wallDepth);
      this.castGroup.add(this.light);
    }

    this.wallGroup.add(this.wallMesh, this.pebbleMesh, this.rimTop, this.rimLeft, this.rimRight);
    this.castGroup.add(this.wallGroup, this.shockRing);
    this.castRoot.add(this.castGroup);

    this.jointDust = createMuralhaJointDust(shared.particleMaterials, config);
    this.jointDust.emitter.position.copy(position);
    this.jointDust.emitter.position.y = position.y + config.wallHeight * 0.55;
    this.jointDust.emitter.scale.set(config.wallWidth * 0.55, config.wallHeight * 0.3, config.wallDepth);
    this.ringDust = createMuralhaRingDust(shared.particleMaterials, config);
    this.ringDust.emitter.position.copy(position);
    this.ringDust.emitter.position.y = position.y + 0.06;
    this.crumbleDust = createMuralhaCrumbleDust(shared.particleMaterials, config);
    this.crumbleDust.emitter.position.copy(position);
    this.crumbleDust.emitter.position.y = position.y + config.wallHeight * 0.3;
    this.goldSparks = createMuralhaGoldSparks(shared.particleMaterials);
    this.goldSparks.emitter.position.copy(position);
    this.goldSparks.emitter.position.y = position.y + config.wallHeight * 0.9;
    this.systems = [this.jointDust, this.ringDust, this.crumbleDust, this.goldSparks];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    this.jointDust.emitter.visible = true;
    this.jointDust.play();
    this.ringDust.emitter.visible = true;
    this.ringDust.play();
    this.goldSparks.emitter.visible = true;
    this.goldSparks.play();

    this.updateMaterialize(0);
  }

  getPhase(): MuralhaPhase {
    return this.phase;
  }

  getState() {
    const elapsedByPhase = this.phase === "materialize"
      ? this.materializeElapsed
      : this.phase === "persist"
        ? this.config.materializeDuration + this.persistElapsed
        : this.config.materializeDuration + this.config.persistDuration + this.crumbleElapsed;
    return {
      phase: this.phase,
      elapsed: elapsedByPhase,
      progress: Math.min(1, this.materializeElapsed / this.config.materializeDuration),
      rimOpacity: this.rimTop.material.opacity,
      lightIntensity: this.light?.intensity ?? 0,
      wallOpacity: this.wallMesh.material.opacity,
      pebblesActive: this.pebbles.filter((pebble) => pebble.active).length,
      pebblesSpawned: this.pebblesSpawned,
      blockCount: this.blockCount,
      wallPosition: this.castGroup.position.toArray(),
      direction: this.direction.toArray(),
    };
  }

  getParticleCount(): number {
    return this.systems.reduce((total, system) => total + system.particleNum, 0);
  }

  getSystems(): ParticleSystem[] {
    return [...this.systems];
  }

  prepareFrame(): void {
    for (const system of this.systems) {
      system.emitter.updateWorldMatrix(true, false);
    }
  }

  update(deltaTime: number): void {
    if (this.disposed) return;
    if (this.phase === "materialize") {
      this.updateMaterialize(deltaTime);
      return;
    }
    if (this.phase === "persist") {
      this.updatePersist(deltaTime);
      return;
    }
    this.updateCrumble(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    this.castRoot.remove(this.castGroup);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castGroup.remove(this.light);
      this.light.dispose();
    }
    this.wallMesh.material.dispose();
    this.pebbleMesh.material.dispose();
    this.rimTop.material.dispose();
    this.rimLeft.material.dispose();
    this.rimRight.material.dispose();
    this.rimTop.geometry.dispose();
    this.rimLeft.geometry.dispose();
    this.rimRight.geometry.dispose();
    this.shockRing.material.dispose();
    this.wallMesh.dispose();
    this.pebbleMesh.dispose();
    this.onDispose(this);
  }

  private spawnPebbles(count: number): void {
    const random = mulberry32(3707 + Math.floor(this.materializeElapsed * 1000) + this.pebbles.filter((p) => p.active).length);
    let spawned = 0;
    for (const pebble of this.pebbles) {
      if (pebble.active || spawned >= count) continue;
      const side = random() - 0.5;
      pebble.active = true;
      pebble.x = side * this.config.wallWidth * 0.9;
      pebble.y = this.config.wallHeight * (0.86 + random() * 0.12);
      pebble.z = this.config.wallDepth * (0.4 + random() * 0.5);
      pebble.vx = side * 0.5 + (random() - 0.5) * 0.4;
      pebble.vy = 0.4 + random() * 0.9;
      pebble.vz = 0.5 + random() * 0.9;
      pebble.rotX = random() * Math.PI;
      pebble.rotZ = random() * Math.PI;
      pebble.spinX = (random() - 0.5) * 9;
      pebble.spinZ = (random() - 0.5) * 9;
      spawned += 1;
    }
  }

  private integratePebbles(deltaTime: number): void {
    const gravity = 9.8;
    for (let index = 0; index < this.pebbles.length; index += 1) {
      const pebble = this.pebbles[index];
      if (!pebble.active) continue;
      pebble.vy -= gravity * deltaTime;
      pebble.x += pebble.vx * deltaTime;
      pebble.y += pebble.vy * deltaTime;
      pebble.z += pebble.vz * deltaTime;
      pebble.rotX += pebble.spinX * deltaTime;
      pebble.rotZ += pebble.spinZ * deltaTime;
      const radius = 0.05 * pebble.scale;
      if (pebble.y - radius < 0 && pebble.vy < 0) {
        pebble.y = radius;
        pebble.vy = -pebble.vy * 0.35;
        pebble.vx *= 0.72;
        pebble.vz *= 0.72;
        pebble.spinX *= 0.72;
        pebble.spinZ *= 0.72;
        if (Math.abs(pebble.vy) < 0.35) {
          pebble.active = false;
        }
      }
      this.quaternion.setFromAxisAngle(AXIS_Z, pebble.rotZ);
      this.quaternion.multiply(this.euler.setFromAxisAngle(AXIS_X, pebble.rotX));
      this.matrix.compose(
        this.position.set(pebble.x, pebble.y, pebble.z),
        this.quaternion,
        this.scale.setScalar(pebble.active ? pebble.scale : 0),
      );
      this.pebbleMesh.setMatrixAt(index, this.matrix);
    }
    this.pebbleMesh.instanceMatrix.needsUpdate = true;
  }

  private updateBlockMatrices(progress: number, crumble: boolean, crumbleT: number): void {
    for (let index = 0; index < this.blockCount; index += 1) {
      const block = this.layout[index];
      const local = MathUtils.clamp(
        (progress * this.config.materializeDuration - block.delay) / (this.config.materializeDuration * 0.5),
        0,
        1,
      );
      const eased = EASE_OUT_CUBIC(local);
      let y = block.y * eased;
      let scaleY = Math.max(0.02, block.sy * eased);
      let rotX = 0;
      let rotZ = 0;
      let x = block.x;
      let z = block.z;
      let uniform = 1;
      if (crumble) {
        const fall = crumbleT * 2.2 + block.delay * 3;
        y = block.y - fall * fall * 0.5;
        rotX = fall * 0.7 * (index % 2 === 0 ? 1 : -1);
        rotZ = fall * 0.45 * (index % 3 === 0 ? 1 : -1);
        z += fall * 0.35;
        uniform = Math.max(0, 1 - crumbleT / (this.config.crumbleDuration * 0.8));
        scaleY = block.sy * uniform;
      }
      if (y + scaleY / 2 < -0.05) uniform = 0;
      const visible = crumble ? uniform > 0 : eased > 0;
      this.quaternion.setFromAxisAngle(AXIS_Y, block.rotY);
      this.quaternion.multiply(this.tempQuat.setFromAxisAngle(AXIS_X, rotX));
      this.quaternion.multiply(this.tempQuat.setFromAxisAngle(AXIS_Z, rotZ));
      this.matrix.compose(
        this.position.set(x, y, z),
        this.quaternion,
        this.scale.set(
          visible ? block.sx : 0,
          visible ? Math.max(0.001, scaleY) : 0,
          visible ? block.sz : 0,
        ),
      );
      this.wallMesh.setMatrixAt(index, this.matrix);
    }
    this.wallMesh.instanceMatrix.needsUpdate = true;
  }

  private updateMaterialize(deltaTime: number): void {
    this.materializeElapsed = Math.min(
      this.materializeElapsed + deltaTime,
      this.config.materializeDuration,
    );
    const progress = this.materializeElapsed / this.config.materializeDuration;
    const eased = EASE_OUT_CUBIC(progress);
    this.updateBlockMatrices(progress, false, 0);
    this.integratePebbles(deltaTime);
    this.wallMesh.material.opacity = Math.min(1, progress * 2.2);
    const pulse = 1 + Math.sin(progress * Math.PI * 4) * 0.08 * (1 - progress);
    this.rimTop.material.opacity = 0.95 * eased * pulse;
    this.rimTop.position.y = this.config.wallHeight * eased + 0.02;
    this.rimLeft.material.opacity = 0.8 * eased * pulse;
    this.rimRight.material.opacity = 0.8 * eased * pulse;
    this.rimLeft.scale.y = Math.max(0.02, eased);
    this.rimRight.scale.y = Math.max(0.02, eased);
    this.shockRing.scale.setScalar(0.5 + progress * 2.2);
    this.shockRing.material.opacity = (1 - progress) * 0.65;
    if (this.light) this.light.intensity = 1.2 + Math.sin(progress * Math.PI) * 3.4;
    this.wallGroup.position.x = Math.sin(this.materializeElapsed * 58) * 0.012 * (1 - eased);
    if (!this.pebblesSpawned && progress >= 0.82) {
      this.pebblesSpawned = true;
      this.spawnPebbles(Math.floor(this.config.pebbleCount * 0.6));
    }
    if (progress >= 1) {
      this.phase = "persist";
      this.wallGroup.position.x = 0;
    }
  }

  private updatePersist(deltaTime: number): void {
    this.persistElapsed += deltaTime;
    this.integratePebbles(deltaTime);
    const shake = Math.sin(this.persistElapsed * 34) * 0.006
      * (1 - Math.min(1, this.persistElapsed / this.config.persistDuration));
    this.wallGroup.position.x = shake;
    this.rimTop.material.opacity = 0.95 - Math.min(0.25, this.persistElapsed * 0.25);
    if (this.light) this.light.intensity = 2.4 - this.persistElapsed * 1.4;
    if (this.persistElapsed >= this.config.persistDuration) {
      this.phase = "crumble";
      this.crumbleDust.emitter.visible = true;
      this.crumbleDust.restart();
      this.crumbleDust.play();
      if (!this.crumbleSpawned) {
        this.crumbleSpawned = true;
        this.spawnPebbles(this.config.pebbleCount);
      }
    }
  }

  private updateCrumble(deltaTime: number): void {
    this.crumbleElapsed += deltaTime;
    const progress = MathUtils.clamp(
      this.crumbleElapsed / this.config.crumbleDuration,
      0,
      1,
    );
    this.updateBlockMatrices(1, true, this.crumbleElapsed);
    this.integratePebbles(deltaTime);
    const fade = 1 - progress;
    this.wallMesh.material.opacity = 1 - progress * progress;
    this.rimTop.material.opacity = 0.7 * fade;
    this.rimLeft.material.opacity = 0.55 * fade;
    this.rimRight.material.opacity = 0.55 * fade;
    this.rimTop.position.y = Math.max(0, this.config.wallHeight - this.crumbleElapsed * 2.4);
    if (this.light) this.light.intensity = Math.max(0, 1.0 * fade);
    if (progress >= 1) this.dispose();
  }
}

export class MuralhaVfxController {
  private readonly shared: MuralhaSharedResources;
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<MuralhaCast>();
  private readonly config: MuralhaVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<MuralhaVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_MURALHA_VFX_CONFIG, ...config };
    const finiteOr = (value: number, fallback: number, minimum: number) =>
      Number.isFinite(value) ? Math.max(minimum, value) : fallback;
    this.config = {
      materializeDuration: finiteOr(merged.materializeDuration, DEFAULT_MURALHA_VFX_CONFIG.materializeDuration, 0.05),
      persistDuration: finiteOr(merged.persistDuration, DEFAULT_MURALHA_VFX_CONFIG.persistDuration, 0.05),
      crumbleDuration: finiteOr(merged.crumbleDuration, DEFAULT_MURALHA_VFX_CONFIG.crumbleDuration, 0.05),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_MURALHA_VFX_CONFIG.maxConcurrentCasts, 1)),
      wallWidth: finiteOr(merged.wallWidth, DEFAULT_MURALHA_VFX_CONFIG.wallWidth, 0.5),
      wallHeight: finiteOr(merged.wallHeight, DEFAULT_MURALHA_VFX_CONFIG.wallHeight, 0.5),
      wallDepth: finiteOr(merged.wallDepth, DEFAULT_MURALHA_VFX_CONFIG.wallDepth, 0.1),
      cols: Math.floor(finiteOr(merged.cols, DEFAULT_MURALHA_VFX_CONFIG.cols, 1)),
      rows: Math.floor(finiteOr(merged.rows, DEFAULT_MURALHA_VFX_CONFIG.rows, 1)),
      pebbleCount: Math.floor(finiteOr(merged.pebbleCount, DEFAULT_MURALHA_VFX_CONFIG.pebbleCount, 0)),
      jointDustRate: finiteOr(merged.jointDustRate, DEFAULT_MURALHA_VFX_CONFIG.jointDustRate, 0),
      ringDustRate: finiteOr(merged.ringDustRate, DEFAULT_MURALHA_VFX_CONFIG.ringDustRate, 0),
      crumbleDustBurst: Math.floor(finiteOr(merged.crumbleDustBurst, DEFAULT_MURALHA_VFX_CONFIG.crumbleDustBurst, 0)),
      crumbleDustRate: finiteOr(merged.crumbleDustRate, DEFAULT_MURALHA_VFX_CONFIG.crumbleDustRate, 0),
      originHeight: finiteOr(merged.originHeight, DEFAULT_MURALHA_VFX_CONFIG.originHeight, 0),
    };
    this.shared = createSharedResources();
    this.castRoot.name = "tk-muralha-vfx-root";
    this.batchedRenderer.name = "tk-muralha-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castMuralha(origin: Vector3, direction: Vector3): void {
    if (this.disposed) throw new Error("MuralhaVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(direction)) return;
    const horizontal = new Vector3(direction.x, 0, direction.z);
    if (horizontal.lengthSq() < 1e-8) return;
    horizontal.normalize();
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as MuralhaCast | undefined;
      oldestCast?.dispose();
    }
    const position = origin.clone();
    position.y = Math.max(0, origin.y + this.config.originHeight);
    const cast = new MuralhaCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      position,
      horizontal,
      (finishedCast) => this.casts.delete(finishedCast),
      this.lightPool,
    );
    this.casts.add(cast);
  }

  update(deltaTime: number, width = 1, height = 1): void {
    if (this.disposed || this.casts.size === 0) return;
    const frameDelta = Number.isFinite(deltaTime)
      ? MathUtils.clamp(deltaTime, 0, 0.1)
      : 0;
    this.accumulator = Math.min(this.accumulator + frameDelta, 0.2);
    let stepCount = 0;
    while (this.accumulator + 1e-9 >= 1 / 60 && stepCount < 6) {
      this.updateFrame(1 / 60, width, height);
      this.accumulator = Math.max(0, this.accumulator - 1 / 60);
      stepCount += 1;
    }
  }

  clear(): void {
    for (const cast of [...this.casts]) cast.dispose();
    this.accumulator = 0;
    this.batchedRenderer.update(0);
  }

  getActiveCastCount(): number {
    return this.casts.size;
  }

  getParticleCount(): number {
    let particleCount = 0;
    for (const cast of this.casts) particleCount += cast.getParticleCount();
    return particleCount;
  }

  getPhase(): MuralhaPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    let hasCrumble = false;
    let hasPersist = false;
    for (const cast of this.casts) {
      const phase = cast.getPhase();
      if (phase === "crumble") hasCrumble = true;
      if (phase === "persist") hasPersist = true;
    }
    if (hasCrumble) return "crumble";
    if (hasPersist) return "persist";
    return "materialize";
  }

  getSystems(): ParticleSystem[] {
    return [...this.casts].flatMap((cast) => cast.getSystems());
  }

  getCastStates() {
    return [...this.casts].map((cast) => cast.getState());
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.scene.remove(this.castRoot, this.batchedRenderer);
    for (const batch of this.batchedRenderer.batches) {
      this.batchedRenderer.remove(batch);
      batch.dispose();
      if (Array.isArray(batch.material)) {
        for (const material of batch.material) material.dispose();
      } else {
        batch.material.dispose();
      }
    }
    this.batchedRenderer.batches.length = 0;
    this.batchedRenderer.systemToBatchIndex.clear();
    this.shared.blockGeometry.dispose();
    this.shared.pebbleGeometry.dispose();
    this.shared.blockMaterial.dispose();
    this.shared.pebbleMaterial.dispose();
    this.shared.rimMaterial.dispose();
    this.shared.shockGeometry.dispose();
    this.shared.shockMaterial.dispose();
    disposeMuralhaParticleMaterials(this.shared.particleMaterials);
    disposeMuralhaTextures(this.shared.textures);
    this.castRoot.clear();
  }

  private updateFrame(deltaTime: number, width: number, height: number): void {
    for (const cast of [...this.casts]) {
      cast.update(deltaTime);
      cast.prepareFrame();
    }
    this.updateBatchResolution(width, height);
    this.batchedRenderer.update(deltaTime);
  }

  private updateBatchResolution(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    this.batchResolution.set(width, height);
    for (const batch of this.batchedRenderer.batches) {
      const material = batch.material;
      if (!(material instanceof ShaderMaterial)) continue;
      const value = material.uniforms.resolution?.value;
      if (value instanceof Vector2) value.copy(this.batchResolution);
    }
  }
}

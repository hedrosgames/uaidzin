import {
  BufferGeometry,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  RingGeometry,
  Vector3,
} from "three";
import { VFX_BALANCE } from "../../data/balance/vfx";

type DmgKind = "enemy" | "player" | "skill" | "kill" | "miss";

interface FloatingText {
  el: HTMLDivElement;
  life: number;
  maxLife: number;
  world: Vector3;
  rise: number;
}

interface FlashEntry {
  mesh: Mesh;
  t: number;
  restore: Color;
  token: number;
}



export class EffectManager {
  private readonly overlay: HTMLDivElement;
  private readonly floating: FloatingText[] = [];
  private readonly flashes = new Map<Mesh, FlashEntry>();
  private readonly pulses: Array<{ mesh: Object3D; t: number }> = [];
  private readonly slashes: Array<{ line: Line; t: number; max: number }> = [];
  private readonly deaths = new Map<
    Mesh,
    { t: number; max: number; baseScale: Vector3 }
  >();
  private rangeRing: Mesh | null = null;
  private count = 0;
  private readonly hpBars = new Map<string, HTMLDivElement>();
  private readonly nameplates = new Map<string, HTMLDivElement>();
  private readonly skillFx: Array<{ mesh: Mesh; t: number; max: number; kind: string }> = [];
  private shake = 0;
  private shakeAmp = 0;
  private frame = 0;
  private tokenSeq = 1;

  constructor(
    parent: HTMLElement,
    private readonly sceneRoot: {
      add(o: object): void;
      remove(o: object): void;
    },
  ) {
    this.overlay = document.createElement("div");
    this.overlay.id = "combat-overlay";
    this.overlay.className = "combat-overlay";
    this.overlay.setAttribute("data-ui-block-click", "true");
    parent.appendChild(this.overlay);
  }

  getCount(): number {
    return this.count;
  }

  getFrameCount(): number {
    return this.frame;
  }

  isFlashing(mesh: Object3D | null | undefined): boolean {
    if (!mesh) return false;
    if (this.flashes.has(mesh as Mesh)) return true;
    let hit = false;
    mesh.traverse((o) => {
      if (this.flashes.has(o as Mesh)) hit = true;
    });
    return hit;
  }

  isDying(mesh: Object3D | null | undefined): boolean {
    if (!mesh) return false;
    if (this.deaths.has(mesh as Mesh)) return true;
    let hit = false;
    mesh.traverse((o) => {
      if (this.deaths.has(o as Mesh)) hit = true;
    });
    return hit;
  }

  spawnDamageNumber(x: number, y: number, z: number, amount: number, kind: DmgKind): void {
    this.count += 1;
    this.frame += 1;
    const el = document.createElement("div");
    el.className = `dmg-number dmg-${kind}`;
    el.textContent = kind === "kill" ? "KO" : kind === "miss" ? "MISS" : String(Math.round(amount));
    this.overlay.appendChild(el);
    this.floating.push({
      el,
      life: VFX_BALANCE.damageNumberLife,
      maxLife: VFX_BALANCE.damageNumberLife,
      world: new Vector3(x, y, z),
      rise: VFX_BALANCE.damageNumberRise,
    });
  }

  playHitFlash(mesh: Object3D | null | undefined): void {
    if (!mesh) return;
    const apply = (obj: Object3D): void => {
      const m = (obj as Mesh).material as unknown as { emissive?: Color; emissiveIntensity?: number } | undefined;
      if (!m?.emissive) return;
      const existing = this.flashes.get(obj as Mesh);
      const restore = existing ? existing.restore : m.emissive.clone();
      const token = this.tokenSeq++;
      this.flashes.set(obj as Mesh, { mesh: obj as Mesh, t: VFX_BALANCE.hitFlashSeconds, restore, token });
      m.emissive.setHex(0xff2200);
      m.emissiveIntensity = 0.9;
    };
    if (mesh instanceof Group || mesh.type === "Group") mesh.traverse(apply);
    else apply(mesh);
  }

  playAttackPulse(mesh: Object3D | null | undefined): void {
    if (!mesh) return;
    mesh.scale.set(1.18, 0.88, 1.18);
    this.pulses.push({ mesh: mesh as Mesh, t: VFX_BALANCE.attackPulseSeconds });
  }

  playSlash(from: Vector3, to: Vector3): void {
    const geo = new BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const mat = new LineBasicMaterial({ color: 0xd4a017, transparent: true, opacity: 0.95 });
    const line = new Line(geo, mat);
    this.sceneRoot.add(line);
    this.slashes.push({ line, t: VFX_BALANCE.slashSeconds, max: VFX_BALANCE.slashSeconds });
  }

  playDeath(mesh: Mesh | null | undefined): void {
    if (!mesh) return;
    this.deaths.set(mesh, {
      t: VFX_BALANCE.deathSeconds,
      max: VFX_BALANCE.deathSeconds,
      baseScale: mesh.scale.clone(),
    });
  }

  setRangeIndicator(x: number, z: number, radius: number, visible: boolean): void {
    if (!this.rangeRing) {
      const geo = new RingGeometry(radius * 0.9, radius, 48);
      const mat = new MeshBasicMaterial({
        color: 0xd4a017,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      });
      this.rangeRing = new Mesh(geo, mat);
      this.rangeRing.rotation.x = -Math.PI / 2;
      this.rangeRing.position.y = 0.05;
      this.sceneRoot.add(this.rangeRing);
    }
    this.rangeRing.position.x = x;
    this.rangeRing.position.z = z;
    this.rangeRing.visible = visible;
  }


  playSkillVfx(
    kind: "burst" | "bolt" | "zone",
    from: Vector3,
    to: Vector3,
    colorHex: number,
  ): void {
    if (kind === "bolt") {
      const geo = new BufferGeometry().setFromPoints([
        from.clone().setY(1.1),
        to.clone().setY(0.9),
      ]);
      const mat = new LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.95 });
      const line = new Line(geo, mat);
      this.sceneRoot.add(line);
      this.skillFx.push({ mesh: line as unknown as Mesh, t: 0.18, max: 0.18, kind: "bolt" });
      return;
    }
    const radius = kind === "burst" ? 1.4 : 1.0;
    const geo = new RingGeometry(radius * 0.55, radius, 32);
    const mat = new MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const ring = new Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(to.x, 0.06, to.z);
    this.sceneRoot.add(ring);
    this.skillFx.push({ mesh: ring, t: 0.28, max: 0.28, kind });
  }

  levelUpPulse(mesh: Object3D | null | undefined): void {
    if (!mesh) return;
    mesh.scale.set(1.25, 1.15, 1.25);
    this.pulses.push({ mesh, t: 0.35 });
  }

  cameraPunch(amp = 0.12): void {
    this.shake = 0.2;
    this.shakeAmp = amp;
  }

  
  consumeShake(dt: number): { x: number; y: number } {
    if (this.shake <= 0) return { x: 0, y: 0 };
    this.shake -= dt;
    const a = this.shakeAmp * (this.shake / 0.2);
    return { x: (Math.random() - 0.5) * a, y: (Math.random() - 0.5) * a };
  }

  spawnHpBar(id: string, x: number, y: number, z: number, ratio: number): void {
    let el = this.hpBars.get(id);
    if (!el) {
      el = document.createElement("div");
      el.className = id === "player" ? "hp-bar-enemy hp-bar-player" : "hp-bar-enemy";
      el.innerHTML = '<i></i>';
      this.overlay.appendChild(el);
      this.hpBars.set(id, el);
    }
    el.hidden = false;
    const inner = el.querySelector("i") as HTMLElement;
    const r = Math.max(0, Math.min(1, ratio));
    inner.style.width = `${r * 100}%`;
    if (id === "player") {
      el.classList.toggle("low", r < 0.4);
      inner.style.background =
        r < 0.4
          ? "linear-gradient(90deg, #a33b3b, #d45555)"
          : "linear-gradient(90deg, #3d9a6a, #5ecf8f)";
    }
    const p = new Vector3(x, y, z);

    (el as HTMLElement & { _w?: Vector3 })._w = p;
  }

  hideAllHpBars(): void {
    for (const el of this.hpBars.values()) el.hidden = true;
  }

  hideHpBar(id: string): void {
    const el = this.hpBars.get(id);
    if (el) el.hidden = true;
  }

  setNpcNameplates(
    npcs: Array<{ id: string; label: string; x: number; z: number; y?: number }>,
  ): void {
    const keep = new Set(npcs.map((n) => n.id));
    for (const [id, el] of this.nameplates) {
      if (keep.has(id)) continue;
      el.remove();
      this.nameplates.delete(id);
    }
    for (const npc of npcs) {
      let el = this.nameplates.get(npc.id);
      if (!el) {
        el = document.createElement("div");
        el.className = "npc-nameplate";
        this.overlay.appendChild(el);
        this.nameplates.set(npc.id, el);
      }
      el.textContent = npc.label;
      el.hidden = false;
      (el as HTMLElement & { _w?: Vector3 })._w = new Vector3(
        npc.x,
        npc.y ?? 2.2,
        npc.z,
      );
    }
  }

  clearNpcNameplates(): void {
    for (const el of this.nameplates.values()) el.remove();
    this.nameplates.clear();
  }

  private updateHpBars(camera: PerspectiveCamera, width: number, height: number): void {
    for (const el of this.hpBars.values()) {
      const w = (el as HTMLElement & { _w?: Vector3 })._w;
      if (!w || el.hidden) continue;
      const p = w.clone().project(camera);
      if (p.z > 1) {
        el.style.visibility = "hidden";
        continue;
      }
      el.style.visibility = "visible";
      const x = (p.x * 0.5 + 0.5) * width;
      const y = (-p.y * 0.5 + 0.5) * height;
      el.style.transform = `translate(-50%,-100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
    for (const el of this.nameplates.values()) {
      const w = (el as HTMLElement & { _w?: Vector3 })._w;
      if (!w || el.hidden) continue;
      const p = w.clone().project(camera);
      if (p.z > 1) {
        el.style.visibility = "hidden";
        continue;
      }
      el.style.visibility = "visible";
      const x = (p.x * 0.5 + 0.5) * width;
      const y = (-p.y * 0.5 + 0.5) * height;
      el.style.transform = `translate(-50%,-100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }

  update(dt: number, camera: PerspectiveCamera, width: number, height: number): void {
    for (let i = this.floating.length - 1; i >= 0; i--) {
      const f = this.floating[i];
      f.life -= dt;
      f.world.y += f.rise * dt;
      if (f.life <= 0) {
        f.el.remove();
        this.floating.splice(i, 1);
        continue;
      }
      const p = f.world.clone().project(camera);
      const x = (p.x * 0.5 + 0.5) * width;
      const y = (-p.y * 0.5 + 0.5) * height;
      f.el.style.transform = `translate(-50%,-100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      f.el.style.opacity = String(Math.max(0, f.life / f.maxLife));
    }

    for (const [mesh, flash] of this.flashes) {
      flash.t -= dt;
      if (flash.t <= 0) {
        const m = mesh.material as unknown as { emissive?: Color; emissiveIntensity?: number };
        if (m?.emissive) {
          m.emissive.copy(flash.restore);
          m.emissiveIntensity = 0;
        }
        this.flashes.delete(mesh);
      }
    }

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.t -= dt;
      if (p.t <= 0) {
        p.mesh.scale.set(1, 1, 1);
        this.pulses.splice(i, 1);
      }
    }

    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.t -= dt;
      const mat = s.line.material as LineBasicMaterial;
      mat.opacity = Math.max(0, s.t / s.max);
      if (s.t <= 0) {
        this.sceneRoot.remove(s.line);
        s.line.geometry.dispose();
        mat.dispose();
        this.slashes.splice(i, 1);
      }
    }

    for (let i = this.skillFx.length - 1; i >= 0; i--) {
      const s = this.skillFx[i];
      s.t -= dt;
      const mat = (s.mesh as unknown as { material?: { opacity?: number; dispose?: () => void } }).material;
      if (mat && typeof mat.opacity === "number") mat.opacity = Math.max(0, s.t / s.max) * 0.7;
      s.mesh.scale.setScalar(1 + (1 - s.t / s.max) * 0.8);
      if (s.t <= 0) {
        this.sceneRoot.remove(s.mesh);
        s.mesh.geometry.dispose();
        if (mat && mat.dispose) mat.dispose();
        this.skillFx.splice(i, 1);
      }
    }

    this.updateHpBars(camera, width, height);

    for (const [mesh, death] of this.deaths) {
      death.t -= dt;
      const k = Math.max(0, death.t / death.max);
      mesh.scale.set(death.baseScale.x * k, death.baseScale.y * k, death.baseScale.z * k);
      if (death.t <= 0) {
        mesh.scale.copy(death.baseScale);
        this.deaths.delete(mesh);
      }
    }
  }

  private drainMeshFx(): void {
    for (const [, flash] of this.flashes) {
      const m = flash.mesh.material as unknown as { emissive?: Color; emissiveIntensity?: number };
      if (m?.emissive) {
        m.emissive.copy(flash.restore);
        m.emissiveIntensity = 0;
      }
    }
    this.flashes.clear();
    for (const p of this.pulses) p.mesh.scale.set(1, 1, 1);
    this.pulses.length = 0;
    for (const s of this.slashes) {
      this.sceneRoot.remove(s.line);
      s.line.geometry.dispose();
      (s.line.material as LineBasicMaterial).dispose();
    }
    this.slashes.length = 0;
    for (const s of this.skillFx) {
      this.sceneRoot.remove(s.mesh);
      s.mesh.geometry.dispose();
      const mat = (s.mesh as unknown as { material?: { dispose?: () => void } }).material;
      if (mat?.dispose) mat.dispose();
    }
    this.skillFx.length = 0;
    for (const [mesh, death] of this.deaths) {
      mesh.scale.copy(death.baseScale);
    }
    this.deaths.clear();
  }

  dispose(): void {
    this.drainMeshFx();
    for (const el of this.hpBars.values()) el.remove();
    this.hpBars.clear();
    for (const el of this.nameplates.values()) el.remove();
    this.nameplates.clear();
    for (const s of this.skillFx) {
      this.sceneRoot.remove(s.mesh);
      s.mesh.geometry.dispose();
    }
    this.skillFx.length = 0;
    for (const f of this.floating) f.el.remove();
    this.floating.length = 0;
    if (this.rangeRing) {
      this.sceneRoot.remove(this.rangeRing);
      this.rangeRing.geometry.dispose();
      (this.rangeRing.material as MeshBasicMaterial).dispose();
      this.rangeRing = null;
    }
    this.overlay.remove();
  }
}

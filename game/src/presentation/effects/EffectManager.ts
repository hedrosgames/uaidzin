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
  Scene,
  Vector3,
} from "three";
import { VFX_BALANCE } from "../../data/balance/vfx";
import { EsferaIgneaVfxController } from "./fmSkills/esfera-ignea/EsferaIgneaVfx";
import { LancaGlacialVfxController } from "./fmSkills/lanca-glacial/LancaGlacialVfx";
import { ChoqueVitalVfxController } from "./fmSkills/choque-vital/ChoqueVitalVfx";
import { DEFAULT_GOLPE_VFX_CONFIG } from "./tkSkills/golpe/GolpeVfx";
import { FireBurstVfxController } from "./fireBurst/FireBurstVfx";
import { getSkillVfxProfile } from "./skill/SkillVfxCatalog";
import { SkillVfxDirector } from "./skill/SkillVfxRuntime";
import { installVfxBudget } from "./vfxBudget";
import { TkLightPool } from "./TkLightPool";
import { TkVfxRegistry } from "./TkVfxRegistry";
import type { SkillDef } from "../../data/classes/skill-types";
import type { SkillVfxRequest } from "./skill/SkillVfxTypes";

type DmgKind = "enemy" | "enemyCrit" | "player" | "playerCrit" | "skill" | "kill" | "miss";

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
  root: Object3D;
}



export class EffectManager {
  private readonly overlay: HTMLDivElement;
  private readonly floating: FloatingText[] = [];
  private readonly flashes = new Map<Mesh, FlashEntry>();
  private readonly flashingRoots = new Map<Object3D, number>();
  private readonly pulses: Array<{ mesh: Object3D; t: number }> = [];
  private readonly slashes: Array<{ line: Line; t: number; max: number }> = [];
  private readonly deaths = new Map<
    Mesh,
    { t: number; max: number; baseScale: Vector3 }
  >();
  private readonly dyingRoots = new Set<Object3D>();
  private rangeRing: Mesh | null = null;
  private count = 0;
  private readonly hpBars = new Map<string, HTMLDivElement>();
  private readonly hpBarEntries = new Map<
    string,
    {
      el: HTMLDivElement;
      inner: HTMLElement;
      world: Vector3;
      ratio: number;
      lastX: number;
      lastY: number;
      lastVisible: boolean;
    }
  >();
  private readonly scratchVec = new Vector3();
  private readonly nameplates = new Map<string, HTMLDivElement>();
  private readonly skillFx: Array<{ mesh: Mesh; t: number; max: number; kind: string }> = [];
  private shake = 0;
  private shakeAmp = 0;
  private frame = 0;
  private tokenSeq = 1;
  private readonly warmedSkillIds = new Set<string>();
  private readonly lightPool: TkLightPool;
  private fireBurst: FireBurstVfxController | null = null;
  private readonly skillVfx: SkillVfxDirector;
  private readonly tkRegistry: TkVfxRegistry;
  private fmEsferaIgnea: EsferaIgneaVfxController | null = null;
  private readonly enemyFireballs: EsferaIgneaVfxController;
  private fmLancaGlacial: LancaGlacialVfxController | null = null;
  private fmChoqueVital: ChoqueVitalVfxController | null = null;

  constructor(
    parent: HTMLElement,
    private readonly sceneRoot: Scene,
  ) {
    installVfxBudget();
    this.lightPool = new TkLightPool(sceneRoot);
    this.skillVfx = new SkillVfxDirector(sceneRoot, this.lightPool);
    this.tkRegistry = new TkVfxRegistry(sceneRoot, this.lightPool);
    this.enemyFireballs = new EsferaIgneaVfxController(sceneRoot, { maxConcurrentCasts: 8, speed: 14, maxFlightDuration: 0.6 });
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

  getTkRegistry(): TkVfxRegistry {
    return this.tkRegistry;
  }

  warmSkills(skills: readonly SkillDef[], x: number, z: number): void {
    const origin = new Vector3(x, 0, z);
    const target = new Vector3(x + 1, 0, z);
    for (const skill of skills) {
      if (skill.kind === "passive" || this.warmedSkillIds.has(skill.id)) continue;
      const profile = getSkillVfxProfile(skill.id);
      if (!profile) continue;
      this.dispatchSkillVfx({
        profile,
        origin: origin.clone(),
        target: target.clone(),
        center: origin.clone(),
        colorHex: profile.colorHex,
        facing: 0,
        range: profile.range,
        radius: profile.radius,
        hits: [],
        hasHeal: skill.kind === "heal",
        hasBuff: skill.kind === "buff",
        hasTransform: skill.kind === "transform",
        hasSummon: skill.kind === "summon",
      });
      this.warmedSkillIds.add(skill.id);
    }
  }

  private fireBurstCtrl(): FireBurstVfxController {
    return this.fireBurst ??= new FireBurstVfxController(this.sceneRoot, {}, this.lightPool);
  }

  private fmEsfera(): EsferaIgneaVfxController {
    return this.fmEsferaIgnea ??= new EsferaIgneaVfxController(this.sceneRoot);
  }

  private fmLanca(): LancaGlacialVfxController {
    return this.fmLancaGlacial ??= new LancaGlacialVfxController(this.sceneRoot);
  }

  private fmChoque(): ChoqueVitalVfxController {
    return this.fmChoqueVital ??= new ChoqueVitalVfxController(this.sceneRoot);
  }

  isFlashing(mesh: Object3D | null | undefined): boolean {
    if (!mesh) return false;
    return this.flashingRoots.has(mesh) || this.flashes.has(mesh as Mesh);
  }

  isDying(mesh: Object3D | null | undefined): boolean {
    if (!mesh) return false;
    return this.dyingRoots.has(mesh) || this.deaths.has(mesh as Mesh);
  }

  spawnDamageNumber(x: number, y: number, z: number, amount: number, kind: DmgKind): void {
    if (kind === "kill") return;
    this.count += 1;
    this.frame += 1;
    const el = document.createElement("div");
    el.className = `dmg-number dmg-${kind}`;
    el.textContent = kind === "miss" ? "MISS" : String(Math.round(amount));
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
    const root = mesh;
    let flashCount = 0;
    const apply = (obj: Object3D): void => {
      const m = (obj as Mesh).material as unknown as { emissive?: Color; emissiveIntensity?: number } | undefined;
      if (!m?.emissive) return;
      const existing = this.flashes.get(obj as Mesh);
      const restore = existing ? existing.restore : m.emissive.clone();
      const token = this.tokenSeq++;
      this.flashes.set(obj as Mesh, { mesh: obj as Mesh, t: VFX_BALANCE.hitFlashSeconds, restore, token, root });
      m.emissive.setHex(0xff2200);
      m.emissiveIntensity = 0.9;
      flashCount++;
    };
    if (mesh instanceof Group || mesh.type === "Group") mesh.traverse(apply);
    else apply(mesh);
    if (flashCount > 0) {
      this.flashingRoots.set(root, (this.flashingRoots.get(root) ?? 0) + flashCount);
    }
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

  playDeath(
    mesh: Mesh | null | undefined,
    duration: number = VFX_BALANCE.deathSeconds,
  ): void {
    if (!mesh) return;
    this.dyingRoots.add(mesh);
    const previousDeath = this.deaths.get(mesh);
    this.deaths.set(mesh, {
      t: duration,
      max: duration,
      baseScale: previousDeath?.baseScale.clone() ?? mesh.scale.clone(),
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


  clearSkillVfx(): void {
    this.fireBurst?.clear();
    this.skillVfx.clear();
    this.tkRegistry.clear();
    this.fmEsferaIgnea?.clear();
    this.enemyFireballs.clear();
    this.fmLancaGlacial?.clear();
    this.fmChoqueVital?.clear();
  }

  clearFireBurst(): void {
    this.fireBurst?.clear();
  }

  syncPassiveVfx(skills: SkillDef[], origin: Vector3): void {
    const profiles = skills
      .map((skill) => getSkillVfxProfile(skill.id))
      .filter((profile) => profile !== undefined);
    this.skillVfx.syncPassives(profiles, origin);
  }

  dispatchSkillVfx(input: SkillVfxRequest): void {
    if (input.profile.family === "chain") {
      this.fireBurstCtrl().castFireBurst(input.origin, input.target ?? input.center);
      return;
    }
    const target = input.target ?? input.center;
    switch (input.profile.dedicatedVfx) {
      case "force-wave":
        this.tkRegistry.get("force-wave").castForceWave(input.origin, target);
        return;
      case "death-stab":
        this.tkRegistry.get("death-stab").castDeathStab(input.origin, target);
        return;
      case "earthquake":
        this.tkRegistry.get("earthquake").castEarthquake(input.origin, input.radius || input.range);
        return;
      case "golpe":
        this.tkRegistry.get("golpe").castGolpe(input.origin, target.clone().sub(input.origin));
        if (input.origin.distanceTo(target) > DEFAULT_GOLPE_VFX_CONFIG.arcRadius) {
          this.tkRegistry.get("quebra").castQuebra(target);
        }
        return;
      case "investida": {
        let endTarget = target;
        if (input.hits.length > 0) {
          let maxDistSq = -1;
          let farthestHit: { x: number; z: number } | null = null;
          for (const hit of input.hits) {
            const dx = hit.x - input.origin.x;
            const dz = hit.z - input.origin.z;
            const distSq = dx * dx + dz * dz;
            if (distSq > maxDistSq) {
              maxDistSq = distSq;
              farthestHit = hit;
            }
          }
          if (farthestHit) {
            endTarget = new Vector3(farthestHit.x, target.y, farthestHit.z);
          }
        }
        this.tkRegistry.get("investida").castInvestida(input.origin, endTarget);
        return;
      }
      case "corte":
        this.tkRegistry.get("corte").castCorte(input.origin, target);
        return;
      case "machado":
        this.tkRegistry.get("machado").castMachado(target);
        return;
      case "quebra":
        this.tkRegistry.get("quebra").castQuebra(target);
        return;
      case "furia":
        this.tkRegistry.get("furia").castFuria(input.center);
        return;
      case "descuidado":
        this.tkRegistry.get("descuidado").castFuria(input.center);
        return;
      case "avalanche":
        this.tkRegistry.get("avalanche").castAvalanche(input.origin, target);
        return;
      case "bencao":
        this.tkRegistry.get("bencao").castBencao(input.center);
        return;
      case "selo":
        this.tkRegistry.get("selo").castSelo(input.center);
        return;
      case "aura":
        this.tkRegistry.get("aura").castAura(input.center);
        return;
      case "escudo-sagrado":
        this.tkRegistry.get("escudo-sagrado").castEscudo(input.origin, target.clone().sub(input.origin));
        return;
      case "julgamento":
        this.tkRegistry.get("julgamento").castJulgamento(target);
        return;
      case "luz":
        this.tkRegistry.get("luz").castLuz(input.origin, target);
        return;
      case "purificar":
        this.tkRegistry.get("purificar").castPurificar(target);
        return;
      case "tribunal":
        this.tkRegistry.get("tribunal").castTribunal(target);
        return;
      case "provocacao":
        this.tkRegistry.get("provocacao").castProvocacao(input.center);
        return;
      case "postura":
        this.tkRegistry.get("postura").castPostura(input.center);
        return;
      case "rugido":
        this.tkRegistry.get("rugido").castRugido(input.origin);
        return;
      case "muralha":
        this.tkRegistry.get("muralha").castMuralha(input.origin, target.clone().sub(input.origin));
        return;
      case "ancora":
        this.tkRegistry.get("ancora").castAncora(input.origin, target);
        return;
      case "desafio":
        this.tkRegistry.get("desafio").castDesafio(input.origin, target);
        return;
      case "guarda":
        this.tkRegistry.get("guarda").castGuarda(input.origin, target.clone().sub(input.origin));
        return;
      case "bastiao":
        this.tkRegistry.get("bastiao").castBastiao(input.origin);
        return;
      case "esfera-ignea":
        this.fmEsfera().castEsferaIgnea(input.origin, target);
        return;
      case "lanca-glacial":
        this.fmLanca().castLancaGlacial(input.origin, target);
        return;
      case "choque-vital":
        this.fmChoque().castChoqueVital(input.origin, target);
        return;
      default:
        break;
    }
    this.skillVfx.play(input);
  }

  getSkillVfxState(): { active: number; particles: number } {
    const active =
      this.skillVfx.getActiveCastCount() +
      (this.fireBurst?.getActiveCastCount() ?? 0) +
      this.tkRegistry.getActiveCastCount() +
      (this.fmEsferaIgnea?.getActiveCastCount() ?? 0) +
      (this.fmLancaGlacial?.getActiveCastCount() ?? 0) +
      (this.fmChoqueVital?.getActiveCastCount() ?? 0);
    const particles =
      this.skillVfx.getParticleCount() +
      (this.fireBurst?.getParticleCount() ?? 0) +
      this.tkRegistry.getParticleCount() +
      (this.fmEsferaIgnea?.getParticleCount() ?? 0) +
      (this.fmLancaGlacial?.getParticleCount() ?? 0) +
      (this.fmChoqueVital?.getParticleCount() ?? 0);
    return { active, particles };
  }

  playSkillVfx(
    kind: "burst" | "bolt" | "zone",
    from: Vector3,
    to: Vector3,
    colorHex: number,
    skillId?: string,
  ): void {
    const profile = skillId ? getSkillVfxProfile(skillId) : undefined;
    if (profile) {
      this.dispatchSkillVfx({
        profile,
        origin: from,
        target: to,
        center: to,
        colorHex,
        facing: 0,
        range: profile.range,
        radius: profile.radius,
        hits: [],
        hasHeal: false,
        hasBuff: profile.family === "buff",
        hasTransform: profile.family === "transform",
        hasSummon: profile.family === "summon",
      });
      return;
    }
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

  levelUpPulse(mesh: Object3D | null | undefined, at?: { x: number; z: number }): void {
    if (mesh) {
      mesh.scale.set(1.35, 1.22, 1.35);
      this.pulses.push({ mesh, t: VFX_BALANCE.levelUpPulseSeconds });
    }
    const x = at?.x ?? mesh?.position.x ?? 0;
    const z = at?.z ?? mesh?.position.z ?? 0;
    const geo = new RingGeometry(0.35, 1.15, 40);
    const mat = new MeshBasicMaterial({
      color: VFX_BALANCE.colors.levelUp,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const ring = new Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.08, z);
    this.sceneRoot.add(ring);
    this.skillFx.push({
      mesh: ring,
      t: VFX_BALANCE.levelUpRingSeconds,
      max: VFX_BALANCE.levelUpRingSeconds,
      kind: "zone",
    });
    this.cameraPunch(0.14);
  }

  enemyFireball(fromX: number, fromZ: number, toX: number, toZ: number): void {
    this.enemyFireballs.castEsferaIgnea(new Vector3(fromX, 0, fromZ), new Vector3(toX, 0, toZ));
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
    let entry = this.hpBarEntries.get(id);
    if (!entry) {
      const el = document.createElement("div");
      el.className = id === "player" ? "hp-bar-enemy hp-bar-player" : "hp-bar-enemy";
      const inner = document.createElement("i");
      el.appendChild(inner);
      this.overlay.appendChild(el);
      entry = {
        el,
        inner,
        world: new Vector3(x, y, z),
        ratio: -1,
        lastX: -9999,
        lastY: -9999,
        lastVisible: false,
      };
      this.hpBarEntries.set(id, entry);
      this.hpBars.set(id, el);
    }
    if (entry.el.hidden) entry.el.hidden = false;
    entry.world.set(x, y, z);
    const r = Math.max(0, Math.min(1, ratio));
    if (Math.abs(entry.ratio - r) > 0.005) {
      entry.ratio = r;
      entry.inner.style.width = `${r * 100}%`;
      if (id === "player") {
        const low = r < 0.4;
        entry.el.classList.toggle("low", low);
        entry.inner.style.background = low
          ? "linear-gradient(90deg, #a33b3b, #d45555)"
          : "linear-gradient(90deg, #3d9a6a, #5ecf8f)";
      }
    }
  }

  hideAllHpBars(): void {
    for (const entry of this.hpBarEntries.values()) entry.el.hidden = true;
  }

  hideHpBar(id: string): void {
    const entry = this.hpBarEntries.get(id);
    if (entry) entry.el.hidden = true;
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
    for (const entry of this.hpBarEntries.values()) {
      if (entry.el.hidden) continue;
      this.scratchVec.copy(entry.world).project(camera);
      if (this.scratchVec.z > 1) {
        if (entry.lastVisible) {
          entry.lastVisible = false;
          entry.el.style.visibility = "hidden";
        }
        continue;
      }
      if (!entry.lastVisible) {
        entry.lastVisible = true;
        entry.el.style.visibility = "visible";
      }
      const x = Math.round(((this.scratchVec.x * 0.5 + 0.5) * width) * 10) / 10;
      const y = Math.round(((-this.scratchVec.y * 0.5 + 0.5) * height) * 10) / 10;
      if (x !== entry.lastX || y !== entry.lastY) {
        entry.lastX = x;
        entry.lastY = y;
        entry.el.style.transform = `translate(-50%,-100%) translate(${x}px, ${y}px)`;
      }
    }
    for (const el of this.nameplates.values()) {
      const w = (el as HTMLElement & { _w?: Vector3 })._w;
      if (!w || el.hidden) continue;
      this.scratchVec.copy(w).project(camera);
      if (this.scratchVec.z > 1) {
        el.style.visibility = "hidden";
        continue;
      }
      el.style.visibility = "visible";
      const x = (this.scratchVec.x * 0.5 + 0.5) * width;
      const y = (-this.scratchVec.y * 0.5 + 0.5) * height;
      el.style.transform = `translate(-50%,-100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }

  update(dt: number, camera: PerspectiveCamera, width: number, height: number): void {
    this.fireBurst?.update(dt, width, height);
    this.skillVfx.update(dt, width, height);
    this.tkRegistry.update(dt, width, height);
    this.fmEsferaIgnea?.update(dt, width, height);
    this.enemyFireballs.update(dt, width, height);
    this.fmLancaGlacial?.update(dt, width, height);
    this.fmChoqueVital?.update(dt, width, height);
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
        const cur = (this.flashingRoots.get(flash.root) ?? 1) - 1;
        if (cur <= 0) this.flashingRoots.delete(flash.root);
        else this.flashingRoots.set(flash.root, cur);
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
        mesh.scale.set(0, 0, 0);
        this.deaths.delete(mesh);
        this.dyingRoots.delete(mesh);
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
    this.flashingRoots.clear();
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
    this.dyingRoots.clear();
  }

  dispose(): void {
    this.fireBurst?.dispose();
    this.skillVfx.dispose();
    this.tkRegistry.dispose();
    this.fmEsferaIgnea?.dispose();
    this.enemyFireballs.dispose();
    this.fmLancaGlacial?.dispose();
    this.fmChoqueVital?.dispose();
    this.lightPool.dispose();
    this.drainMeshFx();
    for (const el of this.hpBars.values()) el.remove();
    this.hpBars.clear();
    this.hpBarEntries.clear();
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

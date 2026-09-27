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
import { AncoraVfxController } from "./tkSkills/ancora/AncoraVfx";
import { AvalancheVfxController } from "./tkSkills/avalanche/AvalancheVfx";
import { AuraVfxController } from "./tkSkills/aura/AuraVfx";
import { BastiaoVfxController } from "./tkSkills/bastiao/BastiaoVfx";
import { BencaoVfxController } from "./tkSkills/bencao/BencaoVfx";
import { CorteVfxController } from "./tkSkills/corte/CorteVfx";
import { DesafioVfxController } from "./tkSkills/desafio/DesafioVfx";
import { EscudoSagradoVfxController } from "./tkSkills/escudo-sagrado/EscudoSagradoVfx";
import { FuriaVfxController } from "./tkSkills/furia/FuriaVfx";
import { DESCUIDADO_PALETTE } from "./tkSkills/furia/FuriaPalette";
import { GolpeVfxController, DEFAULT_GOLPE_VFX_CONFIG } from "./tkSkills/golpe/GolpeVfx";
import { GuardaVfxController } from "./tkSkills/guarda/GuardaVfx";
import { InvestidaVfxController } from "./tkSkills/investida/InvestidaVfx";
import { JulgamentoVfxController } from "./tkSkills/julgamento/JulgamentoVfx";
import { LuzVfxController } from "./tkSkills/luz/LuzVfx";
import { MachadoVfxController } from "./tkSkills/machado/MachadoVfx";
import { MuralhaVfxController } from "./tkSkills/muralha/MuralhaVfx";
import { PosturaVfxController } from "./tkSkills/postura/PosturaVfx";
import { ProvocacaoVfxController } from "./tkSkills/provocacao/ProvocacaoVfx";
import { PurificarVfxController } from "./tkSkills/purificar/PurificarVfx";
import { QuebraVfxController } from "./tkSkills/quebra/QuebraVfx";
import { RugidoVfxController } from "./tkSkills/rugido/RugidoVfx";
import { SeloVfxController } from "./tkSkills/selo/SeloVfx";
import { TribunalVfxController } from "./tkSkills/tribunal/TribunalVfx";
import { FireBurstVfxController } from "./fireBurst/FireBurstVfx";
import { getSkillVfxProfile } from "./skill/SkillVfxCatalog";
import { SkillVfxDirector } from "./skill/SkillVfxRuntime";
import type { SkillDef } from "../../data/classes/skill-types";
import type { SkillVfxRequest } from "./skill/SkillVfxTypes";

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
  private readonly fireBurst: FireBurstVfxController;
  private readonly skillVfx: SkillVfxDirector;
  private readonly tkGolpe: GolpeVfxController;
  private readonly tkInvestida: InvestidaVfxController;
  private readonly tkCorte: CorteVfxController;
  private readonly tkMachado: MachadoVfxController;
  private readonly tkQuebra: QuebraVfxController;
  private readonly tkFuria: FuriaVfxController;
  private readonly tkDescuidado: FuriaVfxController;
  private readonly tkAvalanche: AvalancheVfxController;
  private readonly tkBencao: BencaoVfxController;
  private readonly tkSelo: SeloVfxController;
  private readonly tkAura: AuraVfxController;
  private readonly tkEscudoSagrado: EscudoSagradoVfxController;
  private readonly tkJulgamento: JulgamentoVfxController;
  private readonly tkLuz: LuzVfxController;
  private readonly tkPurificar: PurificarVfxController;
  private readonly tkTribunal: TribunalVfxController;
  private readonly tkProvocacao: ProvocacaoVfxController;
  private readonly tkPostura: PosturaVfxController;
  private readonly tkRugido: RugidoVfxController;
  private readonly tkMuralha: MuralhaVfxController;
  private readonly tkAncora: AncoraVfxController;
  private readonly tkDesafio: DesafioVfxController;
  private readonly tkGuarda: GuardaVfxController;
  private readonly tkBastiao: BastiaoVfxController;
  private readonly tkControllers: Array<{
    update(dt: number, width?: number, height?: number): void;
    clear(): void;
    dispose(): void;
    getActiveCastCount(): number;
    getParticleCount(): number;
  }>;

  constructor(
    parent: HTMLElement,
    private readonly sceneRoot: Scene,
  ) {
    this.fireBurst = new FireBurstVfxController(sceneRoot);
    this.skillVfx = new SkillVfxDirector(sceneRoot);
    this.tkGolpe = new GolpeVfxController(sceneRoot);
    this.tkInvestida = new InvestidaVfxController(sceneRoot);
    this.tkCorte = new CorteVfxController(sceneRoot);
    this.tkMachado = new MachadoVfxController(sceneRoot);
    this.tkQuebra = new QuebraVfxController(sceneRoot);
    this.tkFuria = new FuriaVfxController(sceneRoot);
    this.tkDescuidado = new FuriaVfxController(sceneRoot, { palette: DESCUIDADO_PALETTE });
    this.tkAvalanche = new AvalancheVfxController(sceneRoot);
    this.tkBencao = new BencaoVfxController(sceneRoot);
    this.tkSelo = new SeloVfxController(sceneRoot);
    this.tkAura = new AuraVfxController(sceneRoot);
    this.tkEscudoSagrado = new EscudoSagradoVfxController(sceneRoot);
    this.tkJulgamento = new JulgamentoVfxController(sceneRoot);
    this.tkLuz = new LuzVfxController(sceneRoot);
    this.tkPurificar = new PurificarVfxController(sceneRoot);
    this.tkTribunal = new TribunalVfxController(sceneRoot);
    this.tkProvocacao = new ProvocacaoVfxController(sceneRoot);
    this.tkPostura = new PosturaVfxController(sceneRoot);
    this.tkRugido = new RugidoVfxController(sceneRoot);
    this.tkMuralha = new MuralhaVfxController(sceneRoot);
    this.tkAncora = new AncoraVfxController(sceneRoot);
    this.tkDesafio = new DesafioVfxController(sceneRoot);
    this.tkGuarda = new GuardaVfxController(sceneRoot);
    this.tkBastiao = new BastiaoVfxController(sceneRoot);
    this.tkControllers = [
      this.tkGolpe,
      this.tkInvestida,
      this.tkCorte,
      this.tkMachado,
      this.tkQuebra,
      this.tkFuria,
      this.tkDescuidado,
      this.tkAvalanche,
      this.tkBencao,
      this.tkSelo,
      this.tkAura,
      this.tkEscudoSagrado,
      this.tkJulgamento,
      this.tkLuz,
      this.tkPurificar,
      this.tkTribunal,
      this.tkProvocacao,
      this.tkPostura,
      this.tkRugido,
      this.tkMuralha,
      this.tkAncora,
      this.tkDesafio,
      this.tkGuarda,
      this.tkBastiao,
    ];
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

  playDeath(
    mesh: Mesh | null | undefined,
    duration: number = VFX_BALANCE.deathSeconds,
  ): void {
    if (!mesh) return;
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
    this.fireBurst.clear();
    this.skillVfx.clear();
    for (const c of this.tkControllers) c.clear();
  }

  clearFireBurst(): void {
    this.fireBurst.clear();
  }

  syncPassiveVfx(skills: SkillDef[], origin: Vector3): void {
    const profiles = skills
      .map((skill) => getSkillVfxProfile(skill.id))
      .filter((profile) => profile !== undefined);
    this.skillVfx.syncPassives(profiles, origin);
  }

  dispatchSkillVfx(input: SkillVfxRequest): void {
    if (input.profile.family === "chain") {
      this.fireBurst.castFireBurst(input.origin, input.target ?? input.center);
      return;
    }
    const target = input.target ?? input.center;
    switch (input.profile.dedicatedVfx) {
      case "golpe":
        this.tkGolpe.castGolpe(input.origin, target.clone().sub(input.origin));
        if (input.origin.distanceTo(target) > DEFAULT_GOLPE_VFX_CONFIG.arcRadius) {
          this.tkQuebra.castQuebra(target);
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
        this.tkInvestida.castInvestida(input.origin, endTarget);
        return;
      }
      case "corte":
        this.tkCorte.castCorte(input.origin, target);
        return;
      case "machado":
        this.tkMachado.castMachado(target);
        return;
      case "quebra":
        this.tkQuebra.castQuebra(target);
        return;
      case "furia":
        this.tkFuria.castFuria(input.center);
        return;
      case "descuidado":
        this.tkDescuidado.castFuria(input.center);
        return;
      case "avalanche":
        this.tkAvalanche.castAvalanche(input.origin, target);
        return;
      case "bencao":
        this.tkBencao.castBencao(input.center);
        return;
      case "selo":
        this.tkSelo.castSelo(input.center);
        return;
      case "aura":
        this.tkAura.castAura(input.center);
        return;
      case "escudo-sagrado":
        this.tkEscudoSagrado.castEscudo(input.origin, target.clone().sub(input.origin));
        return;
      case "julgamento":
        this.tkJulgamento.castJulgamento(target);
        return;
      case "luz":
        this.tkLuz.castLuz(input.origin, target);
        return;
      case "purificar":
        this.tkPurificar.castPurificar(target);
        return;
      case "tribunal":
        this.tkTribunal.castTribunal(target);
        return;
      case "provocacao":
        this.tkProvocacao.castProvocacao(input.center);
        return;
      case "postura":
        this.tkPostura.castPostura(input.center);
        return;
      case "rugido":
        this.tkRugido.castRugido(input.origin);
        return;
      case "muralha":
        this.tkMuralha.castMuralha(input.origin, target.clone().sub(input.origin));
        return;
      case "ancora":
        this.tkAncora.castAncora(input.origin, target);
        return;
      case "desafio":
        this.tkDesafio.castDesafio(input.origin, target);
        return;
      case "guarda":
        this.tkGuarda.castGuarda(input.origin, target.clone().sub(input.origin));
        return;
      case "bastiao":
        this.tkBastiao.castBastiao(input.origin);
        return;
      default:
        break;
    }
    this.skillVfx.play(input);
  }

  getSkillVfxState(): { active: number; particles: number } {
    let active = this.skillVfx.getActiveCastCount() + this.fireBurst.getActiveCastCount();
    let particles = this.skillVfx.getParticleCount() + this.fireBurst.getParticleCount();
    for (const c of this.tkControllers) {
      active += c.getActiveCastCount();
      particles += c.getParticleCount();
    }
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
    this.fireBurst.update(dt, width, height);
    this.skillVfx.update(dt, width, height);
    for (const c of this.tkControllers) {
      c.update(dt, width, height);
    }
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
        mesh.scale.set(0, 0, 0);
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
    this.fireBurst.dispose();
    this.skillVfx.dispose();
    for (const c of this.tkControllers) {
      c.dispose();
    }
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

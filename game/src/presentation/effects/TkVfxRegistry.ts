import type { Scene } from "three";
import type { TkLightPool } from "./TkLightPool";
import { AncoraVfxController } from "./tkSkills/ancora/AncoraVfx";
import { AvalancheVfxController } from "./tkSkills/avalanche/AvalancheVfx";
import { AuraVfxController } from "./tkSkills/aura/AuraVfx";
import { BastiaoVfxController } from "./tkSkills/bastiao/BastiaoVfx";
import { BencaoVfxController } from "./tkSkills/bencao/BencaoVfx";
import { CampoGeloVfxController } from "./tkSkills/campo-gelo/CampoGeloVfx";
import { CorteVfxController } from "./tkSkills/corte/CorteVfx";
import { DesafioVfxController } from "./tkSkills/desafio/DesafioVfx";
import { DeathStabVfxController } from "./tkSkills/death-stab/DeathStabVfx";
import { EarthquakeVfxController } from "./tkSkills/earthquake/EarthquakeVfx";
import { EscudoSagradoVfxController } from "./tkSkills/escudo-sagrado/EscudoSagradoVfx";
import { ForceWaveVfxController } from "./tkSkills/force-wave/ForceWaveVfx";
import { FuriaVfxController } from "./tkSkills/furia/FuriaVfx";
import { FuryVfxController } from "./tkSkills/fury/FuryVfx";
import { DESCUIDADO_PALETTE } from "./tkSkills/furia/FuriaPalette";
import { GolpeVfxController } from "./tkSkills/golpe/GolpeVfx";
import { GuardaVfxController } from "./tkSkills/guarda/GuardaVfx";
import { InvestidaVfxController } from "./tkSkills/investida/InvestidaVfx";
import { JulgamentoVfxController } from "./tkSkills/julgamento/JulgamentoVfx";
import { LaminaEnergiaVfxController } from "./tkSkills/lamina-energia/LaminaEnergiaVfx";
import { LuzVfxController } from "./tkSkills/luz/LuzVfx";
import { MachadoVfxController } from "./tkSkills/machado/MachadoVfx";
import { ManaBurnVfxController } from "./tkSkills/mana-burn/ManaBurnVfx";
import { MuralhaVfxController } from "./tkSkills/muralha/MuralhaVfx";
import { PosturaVfxController } from "./tkSkills/postura/PosturaVfx";
import { ProvocacaoVfxController } from "./tkSkills/provocacao/ProvocacaoVfx";
import { PurificarVfxController } from "./tkSkills/purificar/PurificarVfx";
import { QuebraVfxController } from "./tkSkills/quebra/QuebraVfx";
import { RugidoVfxController } from "./tkSkills/rugido/RugidoVfx";
import { SeloVfxController } from "./tkSkills/selo/SeloVfx";
import { TribunalVfxController } from "./tkSkills/tribunal/TribunalVfx";

export interface TkVfxControllerLike {
  update(dt: number, width?: number, height?: number): void;
  clear(): void;
  dispose(): void;
  getActiveCastCount(): number;
  getParticleCount(): number;
}

export interface TkVfxMap {
  "force-wave": ForceWaveVfxController;
  "death-stab": DeathStabVfxController;
  earthquake: EarthquakeVfxController;
  golpe: GolpeVfxController;
  investida: InvestidaVfxController;
  corte: CorteVfxController;
  "lamina-energia": LaminaEnergiaVfxController;
  "campo-gelo": CampoGeloVfxController;
  "mana-burn": ManaBurnVfxController;
  machado: MachadoVfxController;
  quebra: QuebraVfxController;
  furia: FuryVfxController;
  descuidado: FuriaVfxController;
  avalanche: AvalancheVfxController;
  bencao: BencaoVfxController;
  selo: SeloVfxController;
  aura: AuraVfxController;
  "escudo-sagrado": EscudoSagradoVfxController;
  julgamento: JulgamentoVfxController;
  luz: LuzVfxController;
  purificar: PurificarVfxController;
  tribunal: TribunalVfxController;
  provocacao: ProvocacaoVfxController;
  postura: PosturaVfxController;
  rugido: RugidoVfxController;
  muralha: MuralhaVfxController;
  ancora: AncoraVfxController;
  desafio: DesafioVfxController;
  guarda: GuardaVfxController;
  bastiao: BastiaoVfxController;
}

export type TkSkillVfxId = keyof TkVfxMap;

export class TkVfxRegistry {
  private readonly instances = new Map<TkSkillVfxId, TkVfxMap[TkSkillVfxId]>();
  private readonly factories: {
    [K in TkSkillVfxId]: (scene: Scene, lightPool?: TkLightPool) => TkVfxMap[K];
  };

  constructor(
    private readonly scene: Scene,
    private readonly lightPool?: TkLightPool,
  ) {
    this.factories = {
      "force-wave": (s, lp) => new ForceWaveVfxController(s, {}, lp),
      "death-stab": (s, lp) => new DeathStabVfxController(s, {}, lp),
      earthquake: (s, lp) => new EarthquakeVfxController(s, {}, lp),
      golpe: (s, lp) => new GolpeVfxController(s, {}, lp),
      investida: (s, lp) => new InvestidaVfxController(s, {}, lp),
      corte: (s, lp) => new CorteVfxController(s, {}, lp),
      "lamina-energia": (s, lp) => new LaminaEnergiaVfxController(s, {}, lp),
      "campo-gelo": (s, lp) => new CampoGeloVfxController(s, {}, lp),
      "mana-burn": (s, lp) => new ManaBurnVfxController(s, {}, lp),
      machado: (s, lp) => new MachadoVfxController(s, {}, lp),
      quebra: (s, lp) => new QuebraVfxController(s, {}, lp),
      furia: (s, lp) => new FuryVfxController(s, {}, lp),
      descuidado: (s, lp) => new FuriaVfxController(s, { palette: DESCUIDADO_PALETTE }, lp),
      avalanche: (s, lp) => new AvalancheVfxController(s, {}, lp),
      bencao: (s, lp) => new BencaoVfxController(s, {}, lp),
      selo: (s, lp) => new SeloVfxController(s, {}, lp),
      aura: (s, lp) => new AuraVfxController(s, {}, lp),
      "escudo-sagrado": (s, lp) => new EscudoSagradoVfxController(s, {}, lp),
      julgamento: (s, lp) => new JulgamentoVfxController(s, {}, lp),
      luz: (s, lp) => new LuzVfxController(s, {}, lp),
      purificar: (s, lp) => new PurificarVfxController(s, {}, lp),
      tribunal: (s, lp) => new TribunalVfxController(s, {}, lp),
      provocacao: (s, lp) => new ProvocacaoVfxController(s, {}, lp),
      postura: (s, lp) => new PosturaVfxController(s, {}, lp),
      rugido: (s, lp) => new RugidoVfxController(s, {}, lp),
      muralha: (s, lp) => new MuralhaVfxController(s, {}, lp),
      ancora: (s, lp) => new AncoraVfxController(s, {}, lp),
      desafio: (s, lp) => new DesafioVfxController(s, {}, lp),
      guarda: (s, lp) => new GuardaVfxController(s, {}, lp),
      bastiao: (s, lp) => new BastiaoVfxController(s, {}, lp),
    };
  }

  get<K extends TkSkillVfxId>(id: K): TkVfxMap[K] {
    let instance = this.instances.get(id);
    if (!instance) {
      const factory = this.factories[id];
      if (!factory) throw new Error(`Factory não encontrada para ${id}`);
      instance = factory(this.scene, this.lightPool);
      this.instances.set(id, instance);
    }
    return instance as TkVfxMap[K];
  }

  supports(id: string): id is TkSkillVfxId {
    return id in this.factories;
  }

  has(id: TkSkillVfxId): boolean {
    return this.instances.has(id);
  }

  update(dt: number, width?: number, height?: number): void {
    for (const controller of this.instances.values()) {
      controller.update(dt, width, height);
    }
  }

  clear(): void {
    for (const controller of this.instances.values()) {
      controller.clear();
    }
  }

  dispose(): void {
    for (const controller of this.instances.values()) {
      controller.dispose();
    }
    this.instances.clear();
  }

  getActiveCastCount(): number {
    let count = 0;
    for (const controller of this.instances.values()) {
      count += controller.getActiveCastCount();
    }
    return count;
  }

  getParticleCount(): number {
    let count = 0;
    for (const controller of this.instances.values()) {
      count += controller.getParticleCount();
    }
    return count;
  }
}

import { PROGRESSION_BALANCE, type EvolutionId } from "../../data/balance/progression";
import { COMBAT_BALANCE } from "../../data/balance/combat";
import { CLASSES, type ClassId } from "../../data/classes/class-definitions";
import { DUNGEONS_MORTAL } from "../../data/dungeons/dungeons-mortal";
import type { CharacterModel } from "../character/CharacterModel";
import { resetBoundSkillCycle } from "../skills/SkillTreeService";

const DUNGEONS_BY_EVOLUTION: Partial<Record<EvolutionId, readonly unknown[]>> = {
  Mortal: DUNGEONS_MORTAL,
};

export interface ProgressionState {
  evolution: EvolutionId;
  level: number;
  xp: number;
  xpToNext: number;
  unspentAttributePoints: number;
  resetsInEvolution: number;
  bonusAttributePoints: number;
  classId: ClassId;
}



export class ProgressionService {
  readonly state: ProgressionState = {
    evolution: "Mortal",
    level: 1,
    xp: 0,
    xpToNext: PROGRESSION_BALANCE.xpToLevel(1),
    unspentAttributePoints: 0,
    resetsInEvolution: 0,
    bonusAttributePoints: 0,
    classId: "TK",
  };

  constructor(private readonly character: CharacterModel) {
    this.recomputeCombatStats();
  }

  setClassId(id: ClassId): void {
    this.state.classId = id;
    this.recomputeCombatStats();
  }

  addXp(amount: number): { levelsGained: number } {
    if (amount <= 0) return { levelsGained: 0 };
    const max = PROGRESSION_BALANCE.evolutions[this.state.evolution].maxLevel;
    this.state.xp += amount;
    let levels = 0;
    while (this.state.level < max && this.state.xp >= this.state.xpToNext) {
      this.state.xp -= this.state.xpToNext;
      this.state.level += 1;
      levels += 1;
      this.state.unspentAttributePoints += PROGRESSION_BALANCE.attributesPerLevel;
      this.state.xpToNext = PROGRESSION_BALANCE.xpToLevel(this.state.level);
    }
    this.character.level = this.state.level;
    if (levels > 0) this.recomputeCombatStats();
    return { levelsGained: levels };
  }

  
  spendAttribute(attr: "FOR" | "DES" | "CONS" | "INT", points = 1): boolean {
    if (points <= 0) return false;
    const pool = this.state.unspentAttributePoints;
    const from = Math.min(points, pool);
    if (from <= 0) return false;
    this.character.attributes[attr] += from;
    this.state.unspentAttributePoints -= from;
    this.recomputeCombatStats();
    return true;
  }

  destinationEvolution(): EvolutionId | null {
    if (this.state.evolution === "Mortal") return "Arch";
    if (this.state.evolution === "Arch") return "Cele";
    return null;
  }

  hasContentForEvolution(evolution: EvolutionId): boolean {
    return (DUNGEONS_BY_EVOLUTION[evolution]?.length ?? 0) > 0;
  }

  evolveUnavailableReason(): string | null {
    const dest = this.destinationEvolution();
    if (!dest) return null;
    const max = PROGRESSION_BALANCE.evolutions[this.state.evolution].maxLevel;
    if (this.state.level < max) return null;
    if (!this.hasContentForEvolution(dest)) return `Conteúdo de ${dest} ainda não disponível`;
    return null;
  }

  canEvolve(): boolean {
    const dest = this.destinationEvolution();
    if (!dest) return false;
    const max = PROGRESSION_BALANCE.evolutions[this.state.evolution].maxLevel;
    if (this.state.level < max) return false;
    return this.hasContentForEvolution(dest);
  }

  evolve(): boolean {
    if (!this.canEvolve()) return false;
    if (this.state.evolution === "Mortal") this.state.evolution = "Arch";
    else if (this.state.evolution === "Arch") this.state.evolution = "Cele";
    this.state.level = 1;
    this.state.xp = 0;
    this.state.xpToNext = PROGRESSION_BALANCE.xpToLevel(1);
    this.state.resetsInEvolution = 0;
    this.state.bonusAttributePoints = 0;

    this.refundAllAttributes();
    this.recomputeCombatStats();
    return true;
  }

  canReset(): boolean {
    const max = PROGRESSION_BALANCE.evolutions[this.state.evolution].maxLevel;
    return this.state.level >= max;
  }



  reset(): boolean {
    if (!this.canReset()) return false;
    this.refundAllAttributes();
    this.state.level = 1;
    this.state.xp = 0;
    this.state.xpToNext = PROGRESSION_BALANCE.xpToLevel(1);
    this.state.resetsInEvolution += 1;
    this.state.bonusAttributePoints += PROGRESSION_BALANCE.resetAttributePoints;
    this.state.unspentAttributePoints += PROGRESSION_BALANCE.resetAttributePoints;
    this.character.level = 1;
    resetBoundSkillCycle();
    this.recomputeCombatStats();
    return true;
  }

  private refundAllAttributes(): void {
    const a = this.character.attributes;
    const base = PROGRESSION_BALANCE.baseAttributes;
    const spent = a.FOR + a.DES + a.CONS + a.INT - (base.FOR + base.DES + base.CONS + base.INT);
    if (spent > 0) this.state.unspentAttributePoints += spent;
    a.FOR = base.FOR;
    a.DES = base.DES;
    a.CONS = base.CONS;
    a.INT = base.INT;
  }

  recomputeCombatStats(): void {
    const a = this.character.attributes;
    const primary = CLASSES[this.state.classId].primary;
    const bonus = COMBAT_BALANCE.primary[primary];
    const primaryValue = a[primary];
    const extraAttack = Math.floor(primaryValue * (bonus.attackPerPoint ?? 0));
    const extraHp = Math.floor(primaryValue * (bonus.hpPerPoint ?? 0));
    this.character.baseAttack = PROGRESSION_BALANCE.attackFromFor(a.FOR) + extraAttack;
    this.character.baseDefense = PROGRESSION_BALANCE.defenseFromCons(a.CONS);
    const maxHp = PROGRESSION_BALANCE.maxHpFromCons(a.CONS) + extraHp;
    const ratio = this.character.maxHp > 0 ? this.character.hp / this.character.maxHp : 1;
    this.character.maxHp = maxHp;
    this.character.hp = this.character.isDead ? 0 : Math.max(1, Math.round(maxHp * Math.min(1, ratio)));
    this.character.level = this.state.level;
    this.character.syncMaxMp();
  }
}

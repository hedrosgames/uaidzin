import { PROGRESSION_BALANCE } from "../../data/balance/progression";

export interface CharacterAttributes {
  FOR: number;
  DES: number;
  CONS: number;
  INT: number;
}

export class CharacterModel {
  level = 1;
  name = "Aventureiro";
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attributes: CharacterAttributes = { ...PROGRESSION_BALANCE.baseAttributes };
  isDead = false;

  
  baseAttack: number;
  baseDefense: number;
  equipAttack = 0;
  equipDefense = 0;

  get attack(): number {
    return this.baseAttack + this.equipAttack;
  }

  get defense(): number {
    return this.baseDefense + this.equipDefense;
  }

  constructor(init: { maxHp: number; attack: number; defense: number }) {
    this.maxHp = init.maxHp;
    this.hp = init.maxHp;
    this.baseAttack = init.attack;
    this.baseDefense = init.defense;
    this.maxMp = this.computeMaxMp(1, this.attributes.INT);
    this.mp = this.maxMp;
  }

  computeMaxMp(level: number, int: number): number {
    return PROGRESSION_BALANCE.maxMpFromLevelInt(level, int);
  }

  syncMaxMp(): void {
    const next = this.computeMaxMp(this.level, this.attributes.INT);
    const ratio = this.maxMp > 0 ? this.mp / this.maxMp : 1;
    this.maxMp = next;
    this.mp = this.isDead ? 0 : Math.max(0, Math.round(next * Math.min(1, ratio)));
  }

  regenMp(amount: number): void {
    if (this.isDead || amount <= 0) return;
    this.mp = Math.min(this.maxMp, this.mp + amount);
  }

  spendMp(amount: number): boolean {
    if (this.mp < amount) return false;
    this.mp -= amount;
    return true;
  }

  heal(amount: number, cap = this.maxHp): void {
    if (this.isDead || amount <= 0) return;
    this.hp = Math.min(cap, this.hp + amount);
  }

  healFull(): void {
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.isDead = false;
  }

  applyDamage(amount: number): void {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.isDead = true;
  }
}

import type { TransformSpec } from "../../data/classes/skill-types";

export class FormState {
  id: string | null = null;
  attack = 1;
  defense = 1;
  hp = 1;
  scale = 1;
  attackSpeed = 0;
  private until = 0;
  private clock = 0;

  get active(): boolean {
    return this.id != null && this.clock < this.until;
  }

  advance(dt: number): void {
    this.clock += dt;
    if (this.id && this.clock >= this.until) this.clear();
  }

  apply(spec: TransformSpec): void {
    this.id = spec.id;
    this.until = this.clock + spec.sec;
    this.attack = spec.attack;
    this.defense = spec.defense;
    this.hp = spec.hp;
    this.scale = spec.scale;
    this.attackSpeed = spec.attackSpeed ?? 0;
  }

  clear(): void {
    this.id = null;
    this.until = 0;
    this.attack = 1;
    this.defense = 1;
    this.hp = 1;
    this.scale = 1;
    this.attackSpeed = 0;
  }
}

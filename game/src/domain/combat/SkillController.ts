import type { AttackTarget } from "./AttackController";
import type { LoadoutSlot, SkillLoadout } from "./SkillLoadout";
import { SKILL_MP_COST, type CharacterModel } from "../character/CharacterModel";

export interface SkillCast {
  slot: LoadoutSlot;
  target: AttackTarget;
  damage: number;
}

export class SkillController {
  constructor(
    private readonly loadout: SkillLoadout,
    private readonly character: CharacterModel | null = null,
  ) {}

  tick(
    dt: number,
    moving: boolean,
    manualSlotIndex: number,
    targets: AttackTarget[],
    px: number,
    pz: number,
    baseAttack: number,
    defenseOf: (id: string) => number,
  ): SkillCast | null {
    this.loadout.tick(dt);
    if (moving) return null;

    let slot: LoadoutSlot | null = null;
    if (manualSlotIndex >= 0) {
      const s = this.loadout.slots[manualSlotIndex];
      if (s && s.cd <= 0) slot = s;
    }
    if (!slot) {
      slot = this.loadout.bestReadyAuto();
    }
    if (!slot) return null;
    if (this.character && !this.character.spendMp(SKILL_MP_COST)) return null;

    const range = slot.skill.range || 2.5;
    let best: AttackTarget | null = null;
    let bestDist = range;
    for (const t of targets) {
      if (!t.alive) continue;
      const d = Math.hypot(t.x - px, t.z - pz);
      if (d <= bestDist) {
        best = t;
        bestDist = d;
      }
    }
    if (!best) {
      if (this.character) this.character.regenMp(SKILL_MP_COST);
      return null;
    }

    const mult = slot.skill.damageMultiplier * (1 + (slot.level - 1) * 0.05);
    const dmg = Math.max(1, Math.round((baseAttack - defenseOf(best.id)) * mult));
    this.loadout.use(slot);
    return { slot, target: best, damage: dmg };
  }

  slotStates(): Array<{ key: number; name: string; cdRatio: number; ready: boolean; auto: boolean }> {
    return this.loadout.slots.map((s, i) => ({
      key: i + 1,
      name: s.skill.name,
      cdRatio: s.cooldown > 0 ? s.cd / s.cooldown : 0,
      ready: s.cd <= 0,
      auto: s.auto,
    }));
  }

  getCooldownRatio(index: number): number {
    const s = this.loadout.slots[index];
    if (!s || s.cooldown <= 0) return 0;
    return s.cd / s.cooldown;
  }

  slotLabels(): string[] {
    return this.loadout.slots.map((s, i) => `${i + 1}·${s.skill.name}${s.auto ? "A" : ""}`);
  }

  reset(): void {
    this.loadout.resetCooldowns();
  }
}

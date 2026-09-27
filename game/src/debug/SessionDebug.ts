import { COMBAT_BALANCE } from "../data/balance/combat";
import type { CityGameSession } from "../app/CityGameSession";

const DEATH_HOLD_PAD_SEC = 0.2;

export class SessionDebug {
  constructor(private readonly session: CityGameSession) {}

  setTimer(seconds: number): void {
    this.session.dungeonRun.setRemaining(seconds);
  }

  forceDeath(): boolean {
    const world = this.session.worlds.getCurrent();
    if (!world || world.id === "city") return false;
    if (this.session.character.isDead || this.session.worldFadeBusy) return false;
    if (this.session.dungeonRun.getPhase() !== "active") return false;
    this.session.character.applyDamage(this.session.character.maxHp + 999);
    if (!this.session.character.isDead) this.session.character.isDead = true;
    this.session.renderer.playerView.playDeath();
    this.session.bus.emit("game:mode-changed", { mode: "DEAD" });
    this.session.deathReturnTimer =
      this.session.renderer.playerView.getAnimDurationSec("death") + DEATH_HOLD_PAD_SEC;
    this.session.bus.emit("character:death", { at: Date.now() });
    this.session.deathEmitCount += 1;
    return true;
  }

  addLevels(n: number): void {
    let gained = 0;
    for (let i = 0; i < n; i++) {
      const before = this.session.progression.state.level;
      this.session.progression.addXp(this.session.progression.state.xpToNext);
      if (this.session.progression.state.level > before) {
        const delta = this.session.progression.state.level - before;
        this.session.skillTree.grantSkillPoints(delta);
        gained += delta;
      }
    }
    if (gained > 0) {
      this.session.skillLoadout.refresh();
      this.session.character.healFull();
      this.session.effects.levelUpPulse(this.session.renderer.playerMesh, {
        x: this.session.player.x,
        z: this.session.player.z,
      });
      this.session.bus.emit("character:level-up", {
        level: this.session.progression.state.level,
        levelsGained: gained,
      });
      this.session.saves.markDirty(["character", "skills"], "critical");
    }
  }

  spendAll(attr: "FOR" | "DES" | "CONS" | "INT"): void {
    const pts = this.session.progression.state.unspentAttributePoints;
    if (pts > 0) this.session.progression.spendAttribute(attr, pts);
  }

  learnRandomSkill(): { learned: boolean; tree?: string; index?: number; skillId?: string; slots: number } {
    const trees = ["controle", "magia", "fisica"] as const;
    const options: Array<{ tree: (typeof trees)[number]; index: number }> = [];
    for (const tree of trees) {
      const skills = this.session.skillTree.getTree(tree);
      for (let i = 0; i < skills.length; i++) {
        if (this.session.skillTree.canLearn(tree, i)) options.push({ tree, index: i });
      }
    }
    if (!options.length) return { learned: false, slots: this.session.skillLoadout.slots.length };
    const pick = options[Math.floor(Math.random() * options.length)];
    const skill = this.session.skillTree.getTree(pick.tree)[pick.index];
    const ok = this.session.skillTree.learn(pick.tree, pick.index);
    if (ok && skill.kind !== "passive") this.session.skillLoadout.assign(skill.id);
    return {
      learned: ok,
      tree: pick.tree,
      index: pick.index,
      skillId: skill.id,
      slots: this.session.skillLoadout.slots.length,
    };
  }

  spendRandomAttributes(): { spent: number; breakdown: string; unspent: number } {
    const attrs = ["FOR", "DES", "CONS", "INT"] as const;
    const counts: Record<string, number> = { FOR: 0, DES: 0, CONS: 0, INT: 0 };
    let spent = 0;
    while (this.session.progression.state.unspentAttributePoints > 0) {
      const attr = attrs[Math.floor(Math.random() * attrs.length)];
      if (this.session.progression.spendAttribute(attr, 1)) {
        counts[attr] += 1;
        spent += 1;
      } else break;
    }
    const breakdown = attrs.map((a) => `${a}+${counts[a]}`).filter((s) => !s.endsWith("+0")).join(" ");
    return { spent, breakdown: breakdown || "—", unspent: this.session.progression.state.unspentAttributePoints };
  }

  tryReset(): boolean {
    return this.session.tryReset();
  }

  tryEvolve(): { ok: boolean; reason?: string } {
    return this.session.tryEvolve();
  }

  setDodgeChance(value: number): void {
    COMBAT_BALANCE.dodgeChance = value;
  }
}

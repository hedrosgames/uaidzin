import { CLASSES, type ClassId, type TreeId } from "../data/classes/class-definitions";
import { SKILL_TRAINING } from "../data/balance/economy";
import type { CityGameSession } from "../app/CityGameSession";
import { buyFromShop } from "../domain/economy/ShopService";

export type WireSkillRow = {
  id: string;
  tree: string;
  idx: number;
  skillId: string;
  name: string;
  desc: string;
  passive: boolean;
  level: number;
  mp: number;
  cd: number;
  pointsCost: number;
  goldCost: number;
  upCost: number;
  icon: string;
};

export type WireSkillCatalog = {
  classId: ClassId;
  trees: TreeId[];
  treeLabels: Record<string, string>;
  skills: Record<string, WireSkillRow>;
  skillPoints: number;
  gold: number;
  specPoints: number;
  spec: { controle: number; magia: number; fisica: number };
  attrPts: number;
  attrs: { FOR: number; DES: number; CONS: number; INT: number };
};

function skillIconPath(_classId: ClassId, tree: TreeId, index: number): string {
  const n = Math.min(12, index + 1);
  if (tree === "fisica") return `assets/skills/caca-${n}.svg`;
  if (tree === "controle") return `assets/skills/armadilha-${n}.svg`;
  if (tree === "magia") return `assets/skills/marca-${n}.svg`;
  return `assets/skills/special-${n}.svg`;
}

export function buildWireSkillCatalog(session: CityGameSession): WireSkillCatalog {
  const st = session.skillTree.state;
  const klass = CLASSES[st.classId];
  const skills: Record<string, WireSkillRow> = {};
  for (const tree of klass.treeOrder) {
    const defs = klass.trees[tree];
    defs.forEach((sk, i) => {
      const wireId = `${tree}-${i + 1}`;
      skills[wireId] = {
        id: wireId,
        tree,
        idx: i + 1,
        skillId: sk.id,
        name: sk.name,
        desc: sk.desc ?? (sk.kind === "passive" ? "Passiva" : sk.name),
        passive: sk.kind === "passive",
        level: session.skillTree.getSkillLevel(sk.id),
        mp: sk.mp ?? 0,
        cd: sk.cooldown ?? 0,
        pointsCost: SKILL_TRAINING.pointsCost,
        goldCost: SKILL_TRAINING.goldCost(i),
        upCost: SKILL_TRAINING.upCost(i),
        icon: skillIconPath(st.classId, tree, i),
      };
    });
  }
  const attr = session.character.attributes;
  return {
    classId: st.classId,
    trees: [...klass.treeOrder],
    treeLabels: { ...klass.treeLabels },
    skills,
    skillPoints: st.skillPoints,
    gold: session.inventory.gold,
    specPoints: st.specPoints,
    spec: { ...st.specialization },
    attrPts: session.progression.state.unspentAttributePoints,
    attrs: { FOR: attr.FOR, DES: attr.DES, CONS: attr.CONS, INT: attr.INT },
  };
}

export function createWireGameApi(session: CityGameSession, onChanged: () => void) {
  return {
    pullSkillCatalog: () => buildWireSkillCatalog(session),
    buyShop: (shopId: string, itemId: string) => {
      const result = buyFromShop(session.inventory, shopId, itemId);
      if (result.ok) {
        session.refreshWeaponSetFromGear();
        void session.persistSave(true);
        onChanged();
      }
      return result;
    },
    learnSkill: (tree: string, index: number) => session.tryLearnSkill(tree as TreeId, index),
    spendAttribute: (key: string) => {
      const k = key.toUpperCase();
      if (k !== "FOR" && k !== "DES" && k !== "CONS" && k !== "INT") return false;
      const ok = session.progression.spendAttribute(k, 1);
      if (ok) {
        void session.persistSave(true);
        onChanged();
      }
      return ok;
    },
    spendSpec: (tree: string) => {
      if (tree !== "controle" && tree !== "magia" && tree !== "fisica") return false;
      const ok = session.skillTree.spendSpec(tree, 1);
      if (ok) {
        session.progression.recomputeCombatStats();
        void session.persistSave(true);
        onChanged();
      }
      return ok;
    },
    equipUid: (uid: string) => {
      const ok = session.equipment.equip(uid);
      if (ok) {
        session.refreshWeaponSetFromGear();
        session.progression.recomputeCombatStats();
        void session.persistSave(true);
        onChanged();
      }
      return ok;
    },
    unequipSlot: (slot: string) => {
      const slots = ["weapon", "head", "armor", "ring1", "ring2", "neck", "ear"] as const;
      if (!(slots as readonly string[]).includes(slot)) return false;
      const ok = session.equipment.unequip(slot as (typeof slots)[number]);
      if (ok) {
        session.refreshWeaponSetFromGear();
        session.progression.recomputeCombatStats();
        void session.persistSave(true);
        onChanged();
      }
      return ok;
    },
    equippedSnapshot: () => session.equipment.snapshotEquipped(),
    useConsumable: (uid: string) => {
      const ok = session.tryUseConsumable(uid);
      if (ok) onChanged();
      return ok;
    },
    learnFisicaLine: () => {
      let learned = 0;
      for (let i = 0; i < 8; i++) {
        if (session.tryLearnSkill("fisica", i)) learned += 1;
        else break;
      }
      if (learned > 0) onChanged();
      return learned;
    },
    spendAllAttributes: (primary: "FOR" | "CONS" = "FOR") => {
      let spent = 0;
      const other = primary === "FOR" ? "CONS" : "FOR";
      while (session.progression.state.unspentAttributePoints > 0) {
        const attr = spent % 2 === 0 ? primary : other;
        if (!session.progression.spendAttribute(attr, 1)) break;
        spent += 1;
      }
      if (spent > 0) {
        void session.persistSave(true);
        onChanged();
      }
      return spent;
    },
  };
}

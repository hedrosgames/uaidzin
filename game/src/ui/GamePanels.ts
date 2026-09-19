import { CLASSES, type ClassId } from "../data/classes/class-definitions";
import type { CityGameSession } from "../app/CityGameSession";

export type PanelName = "person" | "skills" | "inv";

export class GamePanels {
  private active: PanelName | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly session: CityGameSession,
  ) {
    root.hidden = true;
    root.setAttribute("data-ui-block-click", "true");
    root.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const a = btn.getAttribute("data-arg") || "";
      const b = btn.getAttribute("data-arg2") || "";
      this.handle(action || "", a, b);
    });
  }

  open(name: PanelName): void {
    this.active = name;
    this.root.hidden = false;
    this.render();
  }

  close(): void {
    this.active = null;
    this.root.hidden = true;
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }

  toggle(name: PanelName): void {
    if (this.active === name) this.close();
    else this.open(name);
  }

  refresh(): void {
    if (this.active) this.render();
  }

  private handle(action: string, a: string, b: string): void {
    const s = this.session;
    if (action === "close") {
      this.close();
      return;
    }
    if (action === "spend") {
      const ok = s.progression.spendAttribute(a as "FOR" | "DES" | "CONS" | "INT", 1);
      if (ok) s.setUiToast(`+1 ${a}`, "attr");
    }
    if (action === "learn") {
      const ok = s.skillTree.learn(b as never, Number(a));
      if (ok) {
        s.skillLoadout.refresh();
        s.setUiToast(`Skill aprendida`, "skill");
      }
    }
    if (action === "spec") s.skillTree.spendSpec(a as never, 1);
    if (action === "setClass") {
      s.skillTree.setClass(a as ClassId);
      s.skillTree.resetSkills();
      s.skillLoadout.refresh();
      void s.persistSave();
    }
    if (action === "sell") s.inventory.sell(a);
    if (action === "equip") s.equipment.equip(a);
    if (action === "unequip") s.equipment.unequip(a as never);
    if (action === "refine") {
      const item = s.inventory.items.find((i) => i.uid === a);
      if (item) {
        const r = s.refinement.refine(item);
        if (r.ok) s.equipment.onItemRefined(item);
      }
    }
    if (action === "reset") s.debugTryReset();
    if (action === "evolve") s.debugTryEvolve();
    void s.persistSave();
    this.render();
  }

  private render(): void {
    if (!this.active) return;
    const s = this.session;
    const p = s.progression.state;
    const attr = s.character.attributes;
    const inv = s.inventory;
    const st = s.skillTree.state;

    let html = `<div class="panel-card"><div class="panel-head"><h2>${this.title()}</h2><button type="button" class="btn" data-action="close">Esc</button></div>`;

    if (this.active === "person") {
      html += `
        <div class="wyd-body">
          <div class="wyd-row">
            <div class="wyd-block">
              <div class="wyd-line"><span>Nome</span><strong>${s.character.name}</strong></div>
              <div class="wyd-line"><span>Classe</span><strong>${CLASSES[st.classId].name}</strong></div>
              <div class="wyd-line"><span>Evolução</span><strong>${p.evolution}</strong></div>
              <div class="wyd-line"><span>Nível</span><strong>${p.level}</strong></div>
              <div class="wyd-line"><span>EXP</span><strong>${p.xp} / ${p.xpToNext}</strong></div>
            </div>
            <div class="wyd-block">
              <div class="wyd-line"><span>HP</span><strong>${Math.ceil(s.character.hp)} / ${s.character.maxHp}</strong></div>
              <div class="wyd-line"><span>MP</span><strong>${Math.ceil(s.character.mp)} / ${s.character.maxMp}</strong></div>
              <div class="wyd-line"><span>Ataque</span><strong>${s.character.attack}</strong></div>
              <div class="wyd-line"><span>Defesa</span><strong>${s.character.defense}</strong></div>
              <div class="wyd-line"><span>Ouro</span><strong>${inv.gold.toLocaleString("pt-BR")}</strong></div>
            </div>
          </div>
          <div class="wyd-attrs">
            ${(["FOR", "DES", "CONS", "INT"] as const)
              .map(
                (k) =>
                  `<div class="wyd-attr"><span>${k}</span><strong>${attr[k]}</strong><button type="button" class="btn plus" data-action="spend" data-arg="${k}">+</button></div>`,
              )
              .join("")}
          </div>
          <div class="wyd-line dim"><span>Pontos</span><strong>${p.unspentAttributePoints}</strong></div>
          <div class="wyd-line dim"><span>Resets</span><strong>${p.resetsInEvolution}</strong></div>
          <div class="wyd-line dim"><span>Bônus</span><strong>${p.bonusAttributePoints}</strong></div>
          <div class="wyd-line dim"><span>Inv</span><strong>${inv.usedSlots()} / ${inv.capacity}</strong></div>
          <div class="wyd-foot">
            <button type="button" class="btn danger" data-action="reset">Reset</button>
            <button type="button" class="btn primary" data-action="evolve">Evoluir</button>
            <button type="button" class="btn" data-action="close">Fechar</button>
          </div>
        </div>`;
    }

    if (this.active === "skills") {
      html += `<div class="wyd-body">
        <div class="wyd-line"><span>Classe</span><strong>${CLASSES[st.classId].name}</strong></div>
        <div class="wyd-line dim"><span>8ª árvore</span><strong>${st.eighthTree ?? "—"}</strong></div>
        <div class="wyd-line dim"><span>Pontos</span><strong>${st.skillPoints}</strong></div>
        <div class="class-row">${(Object.keys(CLASSES) as ClassId[])
          .map(
            (id) =>
              `<button type="button" class="btn ${id === st.classId ? "primary" : ""}" data-action="setClass" data-arg="${id}">${CLASSES[id].id}</button>`,
          )
          .join("")}</div>`;
      const treeLabel: Record<string, string> = {
        controle: "Controle",
        magia: "Magia",
        fisica: "Física",
      };
      for (const tree of ["controle", "magia", "fisica"] as const) {
        html += `<div class="wyd-sec">${treeLabel[tree]} <button type="button" class="btn tiny" data-action="spec" data-arg="${tree}">+spec ${st.specialization[tree]}</button></div><div class="wyd-skill-grid">`;
        s.skillTree.getTree(tree).forEach((sk, i) => {
          const lvl = s.skillTree.getSkillLevel(sk.id);
          const locked = i === 7 && st.eighthTree && st.eighthTree !== tree;
          const owned = lvl > 0;
          html += `<div class="wyd-skill ${owned ? "owned" : ""} ${locked ? "locked" : ""}" title="${sk.name}">
            <div class="wyd-skill-icon">${owned ? lvl : ""}</div>
            <div class="wyd-skill-name">${sk.name}</div>
            ${
              locked
                ? `<em>bloq.</em>`
                : `<button type="button" class="btn tiny" data-action="learn" data-arg="${i}" data-arg2="${tree}">+</button>`
            }
          </div>`;
        });
        html += `</div>`;
      }
      html += `<div class="wyd-foot"><button type="button" class="btn" data-action="close">Fechar</button></div></div>`;
    }

    if (this.active === "inv") {
      const eq = s.equipment.equipped;
      const slotLabel: Record<string, string> = {
        weapon: "Arma",
        head: "Cabeça",
        armor: "Armadura",
        ring1: "Anel 1",
        ring2: "Anel 2",
        neck: "Colar",
        ear: "Brinco",
      };
      html += `<div class="wyd-body">
        <div class="wyd-line"><span>Ouro</span><strong>${inv.gold.toLocaleString("pt-BR")}</strong></div>
        <div class="wyd-line dim"><span>Mochila</span><strong>${inv.usedSlots()} / ${inv.capacity}</strong></div>
        <div class="wyd-sec">Equipado</div>
        <div class="wyd-paperdoll">`;
      for (const slot of ["head", "neck", "ear", "weapon", "armor", "ring1", "ring2"] as const) {
        const it = eq[slot];
        html += `<button type="button" class="wyd-equip r-${it?.rarity || "Comum"}" data-slot="${slot}" title="${slotLabel[slot]}">
          <span class="wyd-equip-slot">${slotLabel[slot]}</span>
          <span class="wyd-equip-name">${it ? `${it.name}${it.refine > 0 ? ` +${it.refine}` : ""}` : "—"}</span>
          ${it ? `<span class="wyd-equip-x" data-action="unequip" data-arg="${slot}">×</span>` : ""}
        </button>`;
      }
      html += `</div><div class="wyd-sec">Mochila</div><div class="wyd-bag">`;
      const bag = inv.items;
      const cells = 20;
      for (let i = 0; i < cells; i++) {
        const item = bag[i];
        if (!item) {
          html += `<div class="wyd-cell empty"></div>`;
          continue;
        }
        const canEq = item.slot !== "material" && item.slot !== "misc";
        html += `<div class="wyd-cell r-${item.rarity}" title="${item.name}${item.refine > 0 ? ` +${item.refine}` : ""}">
          <span class="wyd-cell-name">${item.name}${item.stack > 1 ? ` ×${item.stack}` : ""}</span>
          <span class="wyd-cell-acts">
            ${canEq ? `<button type="button" class="btn tiny" data-action="equip" data-arg="${item.uid}">E</button>` : ""}
            <button type="button" class="btn tiny" data-action="sell" data-arg="${item.uid}">$</button>
            ${canEq ? `<button type="button" class="btn tiny" data-action="refine" data-arg="${item.uid}">+</button>` : ""}
          </span>
        </div>`;
      }
      html += `</div><div class="wyd-foot"><button type="button" class="btn" data-action="close">Fechar</button></div></div>`;
    }

    html += `</div>`;
    this.root.innerHTML = html;
  }

  private title(): string {
    const map: Record<PanelName, string> = {
      person: "Personagem",
      skills: "Técnicas",
      inv: "Equipamento",
    };
    return this.active ? map[this.active] : "Painel";
  }
}

import type { WireContext } from "./types";

export interface SkillBarHud {
  renderHtml(): string;
  bindEvents(): void;
  sync(): void;
}

export function createSkillBarHud(container: HTMLElement, ctx: WireContext): SkillBarHud {
  function renderHtml(): string {
    return `<div class="hud" id="skillHud" aria-label="Barra de skills"></div>`;
  }

  function bindEvents(): void {
    const hud = container.querySelector<HTMLElement>("#skillHud");
    if (!hud) return;

    hud.addEventListener("dragover", (e) => {
      const pot = (e.target as HTMLElement).closest<HTMLElement>(".pot-slot");
      const ring = (e.target as HTMLElement).closest<HTMLElement>(".slot-ring");
      const skillsWrap = (e.target as HTMLElement).closest<HTMLElement>(".hud-skills");
      if (!pot && !ring && !skillsWrap) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      pot?.classList.add("is-drop");
      ring?.classList.add("is-drop");
    });

    hud.addEventListener("dragleave", (e) => {
      const pot = (e.target as HTMLElement).closest<HTMLElement>(".pot-slot");
      const ring = (e.target as HTMLElement).closest<HTMLElement>(".slot-ring");
      pot?.classList.remove("is-drop");
      ring?.classList.remove("is-drop");
    });

    hud.addEventListener("drop", (e) => {
      e.preventDefault();
      const pot = (e.target as HTMLElement).closest<HTMLElement>(".pot-slot");
      let ring = (e.target as HTMLElement).closest<HTMLElement>(".slot-ring");
      pot?.classList.remove("is-drop");
      ring?.classList.remove("is-drop");

      try {
        const raw = e.dataTransfer?.getData("text/plain");
        if (!raw) return;
        const data = JSON.parse(raw);
        if (pot && data.kind === "potion" && data.defId) {
          const slotIdx = Number(pot.dataset.pot);
          if (!Number.isFinite(slotIdx)) return;
          ctx.api.setPotionSlot(slotIdx, data.defId);
          ctx.syncFromGame();
          return;
        }
        if (data.kind === "skill" && data.skillId) {
          if (!ring) {
            const wrap = (e.target as HTMLElement).closest<HTMLElement>(".hud-skills");
            ring = wrap?.querySelector<HTMLElement>(".slot-ring:not(.has-skill)") || null;
          }
          if (!ring) return;
          const slotIdx = Number(ring.dataset.bar);
          if (!Number.isFinite(slotIdx)) return;
          ctx.api.equipSkill(slotIdx, data.skillId);
          ctx.syncFromGame();
        }
      } catch {
        return;
      }
    });

    hud.addEventListener("contextmenu", (e) => {
      const pot = (e.target as HTMLElement).closest<HTMLElement>(".pot-slot");
      if (pot) {
        e.preventDefault();
        const slotIdx = Number(pot.dataset.pot);
        if (!Number.isFinite(slotIdx)) return;
        ctx.api.setPotionSlot(slotIdx, null);
        ctx.syncFromGame();
        return;
      }
      const ring = (e.target as HTMLElement).closest<HTMLElement>(".slot-ring");
      if (!ring) return;
      e.preventDefault();
      const slotIdx = Number(ring.dataset.bar);
      if (!Number.isFinite(slotIdx)) return;
      ctx.api.clearSkillSlot(slotIdx);
      ctx.syncFromGame();
    });

    hud.addEventListener("click", (e) => {
      const autoFlag = (e.target as HTMLElement).closest<HTMLElement>("[data-auto]");
      if (autoFlag) {
        e.stopPropagation();
        const kind = autoFlag.dataset.auto;
        if (kind === "attack" || kind === "move" || kind === "potion") {
          ctx.api.toggleCombatAuto(kind);
          ctx.syncFromGame();
        }
        return;
      }
      const pot = (e.target as HTMLElement).closest<HTMLElement>(".pot-slot");
      if (pot) {
        e.stopPropagation();
        const slotIdx = Number(pot.dataset.pot);
        if (Number.isFinite(slotIdx)) {
          ctx.api.usePotionSlot(slotIdx);
          ctx.syncFromGame();
        }
        return;
      }
      const autoEl = (e.target as HTMLElement).closest<HTMLElement>(".slot-auto");
      if (autoEl) {
        e.stopPropagation();
        const slotIdx = Number(autoEl.dataset.slot);
        if (Number.isFinite(slotIdx)) {
          ctx.api.toggleSkillAuto(slotIdx);
          ctx.syncFromGame();
        }
      }
    });
  }

  function sync(): void {
    const hud = container.querySelector<HTMLElement>("#skillHud");
    if (!hud) return;

    const slots = ctx.api.getSkillBar();
    const pots = ctx.api.getPotionBar();
    const autos = ctx.api.getCombatAutos();
    let potsHtml = "";
    for (let i = 0; i < 3; i++) {
      const p = pots[i];
      const filled = !!p?.defId;
      potsHtml += `
        <div class="pot-slot${filled ? " has-item" : ""}" data-pot="${i}" title="${filled ? p!.name : "Poção (arraste do inventário)"}">
          <div class="inner">
            ${filled && p?.icon ? `<img src="${p.icon}" alt="${p.name}">` : ""}
            ${filled && p && p.stack > 0 ? `<span class="pot-stack">${p.stack}</span>` : ""}
          </div>
        </div>
      `;
    }

    let skillsHtml = "";
    for (let i = 0; i < 10; i++) {
      const s = slots[i];
      const hasSkill = !!s?.skillId;
      const cls = hasSkill ? "slot-ring has-skill" : "slot-ring";
      const keyLabel = i === 9 ? "0" : String(i + 1);
      skillsHtml += `
        <div class="${cls}" data-bar="${i}" title="${hasSkill ? s.name : "Vazio (arraste habilidade)"}">
          <div class="inner">
            ${hasSkill && s?.icon ? `<img src="${s.icon}" alt="${s.name}">` : ""}
            <div class="slot-cd" aria-hidden="true"></div>
            <span class="slot-cd-sec" aria-hidden="true"></span>
            <span class="slot-key">${keyLabel}</span>
            ${hasSkill ? `<label class="slot-auto" data-slot="${i}"><input type="checkbox" ${s.auto ? "checked" : ""}><span>A</span></label>` : ""}
          </div>
        </div>
      `;
    }

    hud.innerHTML = `
      <div class="hud-pots" aria-label="Poções rápidas">${potsHtml}</div>
      <div class="hud-skills">${skillsHtml}</div>
      <div class="hud-autos" aria-label="Automação">
        <button type="button" class="hud-auto-btn${autos.attack ? " is-on" : ""}" data-auto="attack" title="Ataque automático">ATK</button>
        <button type="button" class="hud-auto-btn${autos.move ? " is-on" : ""}" data-auto="move" title="Movimento automático">MOV</button>
        <button type="button" class="hud-auto-btn${autos.potion ? " is-on" : ""}" data-auto="potion" title="Poção automática">POT</button>
      </div>
    `;
  }

  return {
    renderHtml,
    bindEvents,
    sync,
  };
}

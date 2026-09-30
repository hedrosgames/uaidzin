import { combatAttackModeLabel, combatAttackModeTitle } from "../../domain/combat/combat-attack-mode";
import { combatMoveModeLabel, combatMoveModeTitle } from "../../domain/combat/combat-move-mode";
import type { WireContext } from "./types";

export interface SkillBarHud {
  renderHtml(): string;
  bindEvents(): void;
  sync(): void;
}

type BarDrag = {
  from: number;
  action: "cancel" | "swap" | "clear";
  to: number;
  source: HTMLElement;
  escaped: boolean;
  dropped: boolean;
};

const UI_CANCEL = ".win, .confirm-layer, .overlay, .hint, .hud-tools, .player-frame, .dialog-host, [data-ui-block-click]";

export function createSkillBarHud(container: HTMLElement, ctx: WireContext): SkillBarHud {
  let barDrag: BarDrag | null = null;
  let blockDrag = false;

  function eventElement(target: EventTarget | null): Element | null {
    return target instanceof Element ? target : null;
  }

  function classify(el: Element | null): "slot" | "world" | "cancel" {
    if (!el) return "cancel";
    if (el.closest("#skillHud .slot-ring")) return "slot";
    if (el.closest(UI_CANCEL) || el.closest("#skillHud")) return "cancel";
    return "world";
  }

  function hitAt(x: number, y: number, source: HTMLElement): Element | null {
    const stack = document.elementsFromPoint(x, y);
    for (const node of stack) {
      if (!(node instanceof Element)) continue;
      if (node === source || source.contains(node)) continue;
      return node;
    }
    return null;
  }

  function paintDrop(ring: Element | null): void {
    const hud = container.querySelector("#skillHud");
    hud?.querySelectorAll(".is-drop").forEach((node) => {
      if (node !== ring) node.classList.remove("is-drop");
    });
    ring?.classList.add("is-drop");
  }

  function applyBarDrag(drag: BarDrag): void {
    if (drag.escaped || drag.action === "cancel") return;
    if (drag.action === "swap") {
      if (drag.from === drag.to) return;
      ctx.api.swapSkillSlots(drag.from, drag.to);
    } else {
      ctx.api.clearSkillSlot(drag.from);
    }
    ctx.syncFromGame();
  }

  function renderHtml(): string {
    return `<div class="hud" id="skillHud" aria-label="Barra de skills"></div>`;
  }

  function bindEvents(): void {
    const hud = container.querySelector<HTMLElement>("#skillHud");
    if (!hud) return;

    hud.addEventListener("mousedown", (e) => {
      blockDrag = !!eventElement(e.target)?.closest(".slot-auto");
    });

    hud.addEventListener("dragstart", (e) => {
      if (blockDrag) {
        e.preventDefault();
        return;
      }
      const ring = eventElement(e.target)?.closest<HTMLElement>("#skillHud .slot-ring.has-skill");
      if (!ring) return;
      const from = Number(ring.dataset.bar);
      if (!Number.isFinite(from)) return;
      const slots = ctx.api.getSkillBar();
      const skillId = slots[from]?.skillId;
      if (!skillId) return;
      e.dataTransfer?.setData(
        "text/plain",
        JSON.stringify({ kind: "bar-skill", fromIndex: from, skillId }),
      );
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
      ring.classList.add("is-dragging");
      barDrag = { from, action: "cancel", to: from, source: ring, escaped: false, dropped: false };
    });

    hud.addEventListener("dragover", (e) => {
      const pot = (e.target as HTMLElement).closest<HTMLElement>(".pot-slot");
      const ring = (e.target as HTMLElement).closest<HTMLElement>(".slot-ring");
      const skillsWrap = (e.target as HTMLElement).closest<HTMLElement>(".hud-skills");
      if (!pot && !ring && !skillsWrap) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = barDrag ? "move" : "copy";
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
        if (data.kind === "bar-skill" && barDrag) {
          const slotIdx = ring ? Number(ring.dataset.bar) : NaN;
          barDrag.dropped = true;
          if (ring && Number.isFinite(slotIdx) && slotIdx !== barDrag.from) {
            barDrag.action = "swap";
            barDrag.to = slotIdx;
          } else {
            barDrag.action = "cancel";
          }
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

    document.addEventListener("dragover", (e) => {
      if (!barDrag) return;
      const el = eventElement(e.target);
      const kind = classify(el);
      if (kind === "cancel") {
        paintDrop(null);
        return;
      }
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      paintDrop(kind === "slot" ? el?.closest(".slot-ring") ?? null : null);
    });

    document.addEventListener("drop", (e) => {
      if (!barDrag || barDrag.dropped) return;
      const el = eventElement(e.target);
      const kind = classify(el);
      barDrag.dropped = true;
      if (kind === "world") {
        e.preventDefault();
        barDrag.action = "clear";
        return;
      }
      if (kind === "slot") {
        e.preventDefault();
        const slotIdx = Number(el?.closest<HTMLElement>(".slot-ring")?.dataset.bar);
        if (Number.isFinite(slotIdx) && slotIdx !== barDrag.from) {
          barDrag.action = "swap";
          barDrag.to = slotIdx;
        } else {
          barDrag.action = "cancel";
        }
        return;
      }
      barDrag.action = "cancel";
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && barDrag) barDrag.escaped = true;
    });

    document.addEventListener("dragend", (e) => {
      const drag = barDrag;
      barDrag = null;
      blockDrag = false;
      paintDrop(null);
      drag?.source.classList.remove("is-dragging");
      if (!drag || drag.escaped) return;
      if (!drag.dropped && e.clientX !== 0 && e.clientY !== 0) {
        const kind = classify(hitAt(e.clientX, e.clientY, drag.source));
        if (kind === "world") drag.action = "clear";
        else if (kind === "slot") {
          const slotIdx = Number(
            hitAt(e.clientX, e.clientY, drag.source)?.closest<HTMLElement>(".slot-ring")?.dataset.bar,
          );
          if (Number.isFinite(slotIdx) && slotIdx !== drag.from) {
            drag.action = "swap";
            drag.to = slotIdx;
          }
        }
      }
      applyBarDrag(drag);
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
      const dragAttr = hasSkill ? " draggable=\"true\"" : "";
      skillsHtml += `
        <div class="${cls}" data-bar="${i}"${dragAttr} title="${hasSkill ? s.name : "Vazio (arraste habilidade)"}">
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
        <button type="button" class="hud-auto-btn hud-auto-atk mode-${autos.attackMode}${autos.attackMode !== "off" ? " is-on" : ""}" data-auto="attack" title="${combatAttackModeTitle(autos.attackMode)}">${combatAttackModeLabel(autos.attackMode)}</button>
        <button type="button" class="hud-auto-btn hud-auto-mov mode-${autos.moveMode}${autos.moveMode !== "off" ? " is-on" : ""}" data-auto="move" title="${combatMoveModeTitle(autos.moveMode)}">${combatMoveModeLabel(autos.moveMode)}</button>
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

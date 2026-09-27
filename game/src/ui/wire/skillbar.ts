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
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    });

    hud.addEventListener("drop", (e) => {
      e.preventDefault();
      const ring = (e.target as HTMLElement).closest<HTMLElement>(".slot-ring");
      if (!ring) return;
      const slotIdx = Number(ring.dataset.bar);
      if (!Number.isFinite(slotIdx)) return;

      try {
        const raw = e.dataTransfer?.getData("text/plain");
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.kind === "skill" && data.skillId) {
          ctx.api.equipSkill(slotIdx, data.skillId);
          ctx.syncFromGame();
        }
      } catch {
        return;
      }
    });

    hud.addEventListener("contextmenu", (e) => {
      const ring = (e.target as HTMLElement).closest<HTMLElement>(".slot-ring");
      if (!ring) return;
      e.preventDefault();
      const slotIdx = Number(ring.dataset.bar);
      if (!Number.isFinite(slotIdx)) return;
      ctx.api.clearSkillSlot(slotIdx);
      ctx.syncFromGame();
    });

    hud.addEventListener("click", (e) => {
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
    let html = "";

    for (let i = 0; i < 4; i++) {
      const s = slots[i];
      const hasSkill = !!s;
      const cls = hasSkill ? "slot-ring has-skill" : "slot-ring";
      const keyLabel = String(i + 1);

      html += `
        <div class="${cls}" data-bar="${i}" title="${s ? s.name : "Vazio (arraste habilidade)"}">
          <div class="inner">
            ${s?.icon ? `<img src="${s.icon}" alt="${s.name}">` : ""}
            <span class="slot-key">${keyLabel}</span>
            ${hasSkill ? `<label class="slot-auto" data-slot="${i}"><input type="checkbox" ${s.auto ? "checked" : ""}> auto</label>` : ""}
          </div>
        </div>
      `;
    }

    hud.innerHTML = html;
  }

  return {
    renderHtml,
    bindEvents,
    sync,
  };
}
